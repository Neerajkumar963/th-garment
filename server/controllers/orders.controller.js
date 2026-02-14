const db = require('../config/database');
const { calculateOrderTotals } = require('../helpers/orderCalculations');

exports.getAllOrders = async (req, res, next) => {
    try {
        const { status, org_id } = req.query;

        let query = `
            SELECT 
                o.id, o.org_id, o.branch, o.date, o.order_type, o.advance, o.remarks, o.eta, o.customer_details, o.created_on, o.updated_on, o.dispatch_status,
                org.org_name,
                org.phone,
                o.status
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            WHERE 1=1
        `;
        const params = [];

        if (status) { // Note: filtering by calculated status is hard in SQL. We might filter after JS calc if needed, or rely on stored status.
            query += ' AND o.status = ?';
            params.push(status);
        }
        if (org_id) {
            query += ' AND o.org_id = ?';
            params.push(org_id);
        }

        query += ' ORDER BY o.created_on DESC';

        const [orders] = await db.query(query, params);

        // Fetch details and stage breakdown for each order
        const ordersWithDetails = await Promise.all(orders.map(async (order) => {
            // 1. Get Order Details (Total Qty)
            const [details] = await db.query(`
                SELECT sq FROM order_details WHERE order_id = ?
            `, [order.id]);

            let totalOrderQty = 0;
            details.forEach(row => {
               const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
               const pieces = Object.entries(sq)
                   .filter(([key]) => key !== '_meta')
                   .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);
               totalOrderQty += pieces;
            });

            // 2. Get Delivery History (Packed/Delivered Qty)
            // Ensure table exists (catch error if not) - actually created in updateDispatchStatus, assumes it exists now.
            let deliveryHistory = [];
            try {
                const [dh] = await db.query(`SELECT * FROM delivery_history WHERE order_id = ?`, [order.id]);
                deliveryHistory = dh;
            } catch (e) {
                // Ignore if table doesn't exist yet
            }

            const packedQty = deliveryHistory.filter(h => !h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const deliveredQty = deliveryHistory.filter(h => h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const totalDispatched = packedQty + deliveredQty;

            // 3. Get Active Processing Qty (Stage 1-8)
            const [processingRows] = await db.query(`
                SELECT p.stage_id, p.status, p.sq, r.role as role_name
                FROM processing p
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                LEFT JOIN emp_details e ON p.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE cp.order_id = ?
            `, [order.id]);

            // 3.1 Get Cut Stock Qty
            const [cutStockRows] = await db.query(`
                SELECT cs.sq
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                WHERE cp.order_id = ?
            `, [order.id]);
            
            let cutStockQty = 0;
            cutStockRows.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                cutStockQty += Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            });

            let stage8Qty = 0;
            let otherStageQty = 0;
            
            processingRows.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                const pieces = Object.entries(sq)
                    .filter(([key]) => key !== '_meta')
                    .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);

                if (row.stage_id === 8 && row.status === 'processed') {
                    stage8Qty += pieces;
                } else if (row.role_name === 'Fabricator') {
                    // Fabricator Logic (Partial Receipts)
                    let received = 0;
                    if (sq._meta && sq._meta.received) {
                        received = Object.values(sq._meta.received).reduce((a, b) => a + Number(b), 0);
                    }
                    const packed = (sq._meta && sq._meta.packed_qty) || 0;
                    stage8Qty += (received - packed);
                    otherStageQty += (pieces - received); // This counts as "Active" (With Fabricator)
                } else {
                    otherStageQty += pieces;
                }
            });

            // Reconstruct breakdown array with names
             const [stageBreakdownRows] = await db.query(`
                SELECT p.stage_id, ps.stage_name, p.sq, r.role as role_name
                FROM processing p
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                JOIN process_stage ps ON p.stage_id = ps.id
                LEFT JOIN emp_details e ON p.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE cp.order_id = ? AND p.stage_id < 8
                ORDER BY p.stage_id ASC
            `, [order.id]);

            const finalBreakdownMap = {};
            let fabricatorQty = 0;

            stageBreakdownRows.forEach(row => {
                 const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                 const pieces = Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
                 
                 if (row.role_name === 'Fabricator') {
                     let received = 0;
                     if (sq._meta && sq._meta.received) {
                         received = Object.values(sq._meta.received).reduce((a, b) => a + Number(b), 0);
                     }
                     fabricatorQty += (pieces - received);
                 } else {
                     if (!finalBreakdownMap[row.stage_id]) {
                         finalBreakdownMap[row.stage_id] = { stage_id: row.stage_id, stage_name: row.stage_name, total_pieces: 0 };
                     }
                     finalBreakdownMap[row.stage_id].total_pieces += pieces;
                 }
            });

            const stageBreakdownList = Object.values(finalBreakdownMap);
            if (fabricatorQty > 0) {
                stageBreakdownList.push({ stage_id: 999, stage_name: 'With Fabricator', total_pieces: fabricatorQty });
            }

            // 4. Calculate STATUS
            const totalCompletedWork = stage8Qty + totalDispatched;
            
            let calculatedStatus = order.status; // Default fallback;

            // CRITICAL FIX: Trust explicit dispatch status from DB if it indicates completion/delivery
            if (order.dispatch_status === 'Delivered') {
                calculatedStatus = 'Delivered';
            } else if (totalOrderQty > 0) {
                 if (deliveredQty === totalOrderQty) {
                     calculatedStatus = 'Delivered';
                 } else if (totalDispatched === totalOrderQty) {
                     calculatedStatus = 'Packed';
                 } else if (totalCompletedWork >= totalOrderQty) {
                     calculatedStatus = 'Completed'; // Ready to be Packed
                 } else if (otherStageQty > 0 || totalCompletedWork > 0) {
                     // If ANY pieces are in processing or completed, it is "Processing"
                     calculatedStatus = 'Processing';
                 } else if (cutStockQty > 0) {
                     // Only if NOTHING is processing/completed, but we have cut stock
                     calculatedStatus = 'In Cut Stock';
                 } else {
                     calculatedStatus = 'Pending';
                 }
            } else {
                 calculatedStatus = 'Pending';
            }
            
            // Override 'Completed' from SQL if we have history support?
            // SQL returns 'Completed' if stage 8 exists.
            
            const allCompleted = (otherStageQty === 0 && (stage8Qty > 0 || totalDispatched > 0) && stage8Qty + totalDispatched >= totalOrderQty); // All active are stage 8

            return { 
                ...order, 
                // items: details, // details is just sq rows here. Original code fetched full details.
                // We leave items undefined here? No, frontend needs them?
                // The original code fetched full items in getAllOrders?
                // Step 374: Yes, `ordersWithDetails` mapped over orders and fetched details.
                // I need to preserve 'items' if the frontend uses it.
                // My optimized query block above fetched 'sq' only. 
                // Restore full details fetch if needed.
                items: await db.query(`SELECT od.*, orgd.org_dress_name FROM order_details od JOIN org_dress orgd ON od.org_dress_id = orgd.id WHERE od.order_id = ?`, [order.id]).then(([r])=>r),

                stage_breakdown: stageBreakdownList,
                all_completed: allCompleted, 
                completed_pieces: stage8Qty, // Only active stage 8 (for Popup)
                
                // Add new fields
                status: calculatedStatus,
                total_qty: totalOrderQty,
                history: deliveryHistory,
                stats: {
                    total: totalOrderQty,
                    processing: otherStageQty,
                    completed: stage8Qty,
                    packed: packedQty,
                    delivered: deliveredQty
                }
            };
        }));

        res.status(200).json({
            success: true,
            orders: ordersWithDetails
        });

    } catch (error) {
        console.error("Error in getAllOrders:", error);
        next(error);
    }
};

exports.getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Order Info
        const [orders] = await db.query(`
            SELECT 
                o.id, o.org_id, o.branch, o.date, o.order_type, o.advance, o.remarks, o.eta, o.customer_details, o.created_on, o.updated_on, o.dispatch_status,
                org.org_name, org.phone,
                o.status
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            WHERE o.id = ?
        `, [id]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const order = orders[0];

        // 2. Order Details
        const [details] = await db.query(`
            SELECT 
                od.*,
                orgd.org_dress_name,
                orgd.material_req,
                orgd.processing_rate
            FROM order_details od
            JOIN org_dress orgd ON od.org_dress_id = orgd.id
            WHERE od.order_id = ?
        `, [id]);

        // Calculate Total Qty
        let totalOrderQty = 0;
        details.forEach(row => {
            const sq = typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq;
            const pieces = Object.entries(sq)
                .filter(([key]) => key !== '_meta')
                .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);
            totalOrderQty += pieces;
        });

        // 3. Attach Price List to each detail for reference
        const detailsWithPrices = await Promise.all(details.map(async (item) => {
            const [prices] = await db.query(`
                SELECT size, price FROM price_list WHERE org_dress_id = ? ORDER BY size
            `, [item.org_dress_id]);
            return { ...item, prices };
        }));

        // 4. Delivery History
        let deliveryHistory = [];
        try {
            const [dh] = await db.query(`SELECT * FROM delivery_history WHERE order_id = ?`, [id]);
            deliveryHistory = dh;
        } catch (e) {
            // Ignore
        }
        const packedQty = deliveryHistory.filter(h => !h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
        const deliveredQty = deliveryHistory.filter(h => h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
        const totalDispatched = packedQty + deliveredQty;

        // 5. Stage Breakdown & Active Processing
        const [processingRows] = await db.query(`
            SELECT p.stage_id, p.status, p.sq, ps.stage_name, r.role as role_name
            FROM processing p
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN process_stage ps ON p.stage_id = ps.id
            LEFT JOIN emp_details e ON p.emp_id = e.id
            LEFT JOIN emp_roles r ON e.role_id = r.id
            WHERE cp.order_id = ?
        `, [id]);

        // 5.1 Get Cut Stock Qty
        const [cutStockRows] = await db.query(`
            SELECT cs.sq
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            WHERE cp.order_id = ?
        `, [id]);
        
        let cutStockQty = 0;
        cutStockRows.forEach(row => {
            const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
            cutStockQty += Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
        });

        let stage8Qty = 0;
        let otherStageQty = 0;
        let fabricatorQty = 0;
        const stageBreakdownMap = {};

        processingRows.forEach(row => {
            const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
            const pieces = Object.entries(sq)
                .filter(([key]) => key !== '_meta')
                .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);

            if (row.stage_id === 8 && row.status === 'processed') {
                stage8Qty += pieces;
            } else {
                // Active Stage
                if (row.stage_id < 8) {
                    if (row.role_name === 'Fabricator') {
                        // Handle Partial Receipts for Fabricator
                        let received = 0;
                        if (sq._meta && sq._meta.received) {
                            received = Object.values(sq._meta.received).reduce((a, b) => a + Number(b), 0);
                        }
                        const packed = (sq._meta && sq._meta.packed_qty) || 0;
                        stage8Qty += (received - packed); 
                        fabricatorQty += (pieces - received);
                        // Do NOT add to otherStageQty to avoid double counting
                    } else {
                        otherStageQty += pieces;
                        if (!stageBreakdownMap[row.stage_id]) {
                            stageBreakdownMap[row.stage_id] = { stage_id: row.stage_id, stage_name: row.stage_name, total_pieces: 0 };
                        }
                        stageBreakdownMap[row.stage_id].total_pieces += pieces;
                    }
                }
            }
        });

        const stageBreakdown = Object.values(stageBreakdownMap);
        if (fabricatorQty > 0) {
            stageBreakdown.push({ stage_id: 999, stage_name: 'With Fabricator', total_pieces: fabricatorQty });
        }
        
        // 6. Calculations & Status
        const totals = await calculateOrderTotals(id);
        const totalCompletedWork = stage8Qty + totalDispatched;
        
        let calculatedStatus = order.status;

        if (totalOrderQty > 0) {
             if (deliveredQty === totalOrderQty) {
                 calculatedStatus = 'Delivered';
             } else if (totalDispatched === totalOrderQty) {
                 calculatedStatus = 'Packed';
             } else if (totalCompletedWork === totalOrderQty) {
                 calculatedStatus = 'Completed'; 
             } else if (totalCompletedWork > 0) {
                 calculatedStatus = 'Partially Completed';
             } else if (otherStageQty > 0 || fabricatorQty > 0) {
                 calculatedStatus = 'Processing';
                 if (!['Partially Completed', 'Completed', 'Packed', 'Delivered'].includes(calculatedStatus)) {
                      calculatedStatus = order.dispatch_status || order.status;
                 }
             } else if (cutStockQty > 0) {
                 calculatedStatus = 'In Cut Stock';
             } else {
                 calculatedStatus = order.status;
             }
        }

        const allCompleted = (otherStageQty === 0 && stage8Qty > 0 && stage8Qty + totalDispatched === totalOrderQty);

        res.status(200).json({
            success: true,
            order: {
                ...order,
                items: detailsWithPrices,
                calculations: totals,
                stage_breakdown: stageBreakdown,
                all_completed: allCompleted,
                completed_pieces: stage8Qty,
                status: calculatedStatus,
                total_qty: totalOrderQty,
                history: deliveryHistory,
                stats: {
                    total: totalOrderQty,
                    processing: otherStageQty,
                    completed: stage8Qty,
                    packed: packedQty,
                    delivered: deliveredQty
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.createOrder = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            org_id, 
            branch, 
            date, 
            order_type, 
            advance, 
            eta, 
            customer_details, 
            remarks, 
            items // Array of objects
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Order must contain at least one item');
        }

        // 1. Insert Order
        const [orderRes] = await connection.query(`
            INSERT INTO orders 
            (org_id, branch, date, order_type, advance, eta, customer_details, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [org_id, branch, date, order_type, advance || 0, eta, customer_details, remarks]);

        const orderId = orderRes.insertId;

        // 2. Insert Order Details
        const detailValues = items.map(item => [
            orderId,
            item.org_dress_id,
            JSON.stringify(item.sq), // Ensure stored as JSON string
            item.customization,
            item.remarks
        ]);

        await connection.query(`
            INSERT INTO order_details 
            (order_id, org_dress_id, sq, customization, remarks)
            VALUES ?
        `, [detailValues]);

        // 3. Handle Advance Payment (Credit to Org Account)
        if (Number(advance) > 0) {
             const [balRow] = await connection.query(`
                SELECT balance FROM org_account 
                WHERE org_id = ? 
                ORDER BY datetime DESC LIMIT 1
            `, [org_id]);
            
            const currentBalance = balRow.length > 0 ? Number(balRow[0].balance) : 0;
            // Advance payment reduces balance (credit)
            const newBalance = currentBalance - Number(advance);

            await connection.query(`
                INSERT INTO org_account 
                (org_id, transaction, amount, balance, mode, remarks)
                VALUES (?, 'CR', ?, ?, 'Cash', 'Advance payment for Order #${orderId}')
            `, [org_id, Number(advance), newBalance]);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
             return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const [result] = await db.query(`
            UPDATE orders 
            SET status = ?, updated_on = NOW() 
            WHERE id = ?
        `, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Order status updated'
        });

    } catch (error) {
        next(error);
    }
};

exports.updateDispatchStatus = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params;
        const { dispatch_status } = req.body;

        if (!dispatch_status || !['Packed', 'Delivered'].includes(dispatch_status)) {
            throw new Error('Invalid dispatch status');
        }

        // Ensure history table exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS delivery_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                quantity INT NOT NULL,
                packed_at DATETIME,
                delivered_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        if (dispatch_status === 'Packed') {
            // 1. Identify Stage 8 (Finished) Jobs
            const [stage8Jobs] = await connection.query(`
                SELECT id, sq 
                FROM processing 
                WHERE stage_id = 8 AND status = 'processed' 
                  AND cut_stock_id IN (
                    SELECT cs.id FROM cut_stock cs 
                    JOIN cutting_process cp ON cs.cutting_process_id = cp.id 
                    WHERE cp.order_id = ?
                  )
            `, [id]);

            // 1.1 Identify Fabricator Jobs with Received Qty
            // Need to join emp_roles to confirm it is a Fabricator, or rely on active stages?
            // Relying on generic 'received' meta check is safer if we support multiple external roles.
            // But let's stick to Fabricator for now as per specific logic.
            const [fabricatorJobs] = await connection.query(`
                SELECT p.id, p.sq 
                FROM processing p
                LEFT JOIN emp_details e ON p.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE p.stage_id < 8 
                  AND r.role = 'Fabricator'
                  AND p.sq LIKE '%"received":%'
                  AND p.cut_stock_id IN (
                    SELECT cs.id FROM cut_stock cs 
                    JOIN cutting_process cp ON cs.cutting_process_id = cp.id 
                    WHERE cp.order_id = ?
                  )
            `, [id]);

            let totalPacked = 0;
            const stage8JobIds = [];
            const fabricatorUpdates = [];

            // Process Stage 8 Jobs
            stage8Jobs.forEach(job => {
                const sq = (typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq) || {};
                Object.entries(sq).forEach(([key, val]) => {
                    if (key !== '_meta') totalPacked += Number(val);
                });
                stage8JobIds.push(job.id);
            });

            // Process Fabricator Jobs
            fabricatorJobs.forEach(job => {
                const sq = (typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq) || {};
                let receivedTotal = 0;
                
                if (sq._meta && sq._meta.received) {
                    // Sum up received
                    Object.values(sq._meta.received).forEach(val => receivedTotal += Number(val));
                    
                    // Determine how much is already packed
                    const alreadyPacked = sq._meta.packed_qty || 0;
                    
                    // Calculate quantity available to pack
                    const toPack = receivedTotal - alreadyPacked;

                    if (toPack > 0) {
                        // Add to global pack count
                        totalPacked += toPack;

                        // Update packed_qty in meta (Cumulative)
                        sq._meta.packed_qty = alreadyPacked + toPack;
                        
                        // We do NOT delete 'received' so fabricator stats stay correct
                        fabricatorUpdates.push({ id: job.id, sq: JSON.stringify(sq) });
                    }
                }
            });

            if (totalPacked > 0) {
                // 2. Insert into delivery_history
                await connection.query(`
                    INSERT INTO delivery_history (order_id, quantity, packed_at)
                    VALUES (?, ?, NOW())
                `, [id, totalPacked]);

                // 3. DELETE Stage 8 jobs
                if (stage8JobIds.length > 0) {
                    await connection.query(`DELETE FROM processing WHERE id IN (?)`, [stage8JobIds]);
                }

                // 4. UPDATE Fabricator Jobs (Update packed_qty)
                for (const update of fabricatorUpdates) {
                    await connection.query(`UPDATE processing SET sq = ? WHERE id = ?`, [update.sq, update.id]);
                }
            } else {
                 // Check if we already have packed items?
                 // Or maybe user clicked "Packed" but nothing new to pack.
                 // We should proceed to update status if applicable.
            }

            // Always update order's dispatch_status to 'Packed' if it was Pending?
            await connection.query('UPDATE orders SET dispatch_status = ?, updated_on = NOW() WHERE id = ?', ['Packed', id]);

        } else if (dispatch_status === 'Delivered') {
            // Update history: Mark all 'Packed' items as 'Delivered'
            // (Assumes we deliver everything that is packed)
            await connection.query(`
                UPDATE delivery_history 
                SET delivered_at = NOW() 
                WHERE order_id = ? AND delivered_at IS NULL
            `, [id]);

            // Check if FULLY delivered
            const totals = await calculateOrderTotals(id); 
            // Must use 'connection' query for delivery_history to see checks within transaction? 
            // Actually, we just updated it above.
            const [dRows] = await connection.query('SELECT SUM(quantity) as delivered FROM delivery_history WHERE order_id = ? AND delivered_at IS NOT NULL', [id]);
            const totalDelivered = (dRows[0].delivered ? Number(dRows[0].delivered) : 0);

            if (totalDelivered >= totals.totalPieces) {
                 await connection.query('UPDATE orders SET dispatch_status = ?, delivered_on = NOW(), updated_on = NOW() WHERE id = ?', ['Delivered', id]);
            } else {
                 // Partial Delivery: Do NOT mark as Delivered.
                 // Optionally update updated_on
                 await connection.query('UPDATE orders SET updated_on = NOW() WHERE id = ?', [id]);
            }
        }

        await connection.commit();
        res.status(200).json({
            success: true,
            message: `Order marked as ${dispatch_status}`
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Cascade delete will remove details
        const [result] = await db.query('DELETE FROM orders WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
             return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};
