const db = require('../config/database');
const { checkFabricAvailability } = require('../helpers/cuttingHelpers');

// --- GETTERS ---

exports.doGetAllCuttingJobs = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                cp.*,
                e.name as cutter_name,
                od.org_dress_name,
                o.id as order_id,
                org.org_name
            FROM cutting_process cp
            JOIN emp_details e ON cp.emp_id = e.id
            JOIN org_dress od ON cp.org_dress_id = od.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            ORDER BY cp.created_on DESC
        `);

        // Fetch details for each job? 
        // Prompt says: "For each job also fetch: SELECT * FROM cutting_details..."
        // Optimization: For a large list, this N+1 query is bad, but adhering to prompt requirements.
        
        const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
            const [details] = await db.query(`
                SELECT 
                    cd.*,
                    cq.roll_length as original_roll_length,
                    ct.type as cloth_type,
                    c.color_name,
                    d.design_name,
                    q.quality_name
                FROM cutting_details cd
                JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
                JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
                JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
                JOIN colors c ON cdt.color_id = c.id
                JOIN design d ON cdt.design_id = d.id
                JOIN quality q ON cdt.quality_id = q.id
                WHERE cd.cutting_process_id = ?
            `, [job.id]);
            return { ...job, fabric_usage_logs: details };
        }));

        res.status(200).json({
            success: true,
            jobs: jobsWithDetails
        });

    } catch (error) {
        next(error);
    }
};

exports.getCuttingById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Process Info
        const [jobs] = await db.query(`
            SELECT 
                cp.*,
                e.name as cutter_name,
                od.org_dress_name,
                org.org_name
            FROM cutting_process cp
            JOIN emp_details e ON cp.emp_id = e.id
            JOIN org_dress od ON cp.org_dress_id = od.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            WHERE cp.id = ?
        `, [id]);

        if (jobs.length === 0) {
            return res.status(404).json({ success: false, message: 'Cutting job not found' });
        }

        // 2. Details with complete fabric information
        const [details] = await db.query(`
            SELECT 
                cd.*,
                cq.roll_length as original_roll_length,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name
            FROM cutting_details cd
            JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
            JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
            JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
            JOIN colors c ON cdt.color_id = c.id
            JOIN design d ON cdt.design_id = d.id
            JOIN quality q ON cdt.quality_id = q.id
            WHERE cd.cutting_process_id = ?
        `, [id]);

        res.status(200).json({
            success: true,
            job: { ...jobs[0], fabric_usage_logs: details }
        });

    } catch (error) {
        next(error);
    }
};

exports.getPendingOrders = async (req, res, next) => {
    try {
        // Fetch all Pending or Partial orders
        // Use a more complex query to compare Ordered vs Assigned
        
        // 1. Get Candidate Orders (Pending or Processing, but not Completed/Stock)
        // We need to fetch orders and their details, effectively joining everything
        const [orders] = await db.query(`
            SELECT o.*, org.org_name
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            WHERE o.status != 'Completed' AND o.status != 'Stock' AND o.status != 'Delivered' AND o.status != 'Packed'
            ORDER BY o.created_on ASC
        `);

        // 2. For each order, check coverage
        const pendingOrders = [];

        for (const order of orders) {
            // Get Ordered Items
            const [orderItems] = await db.query(`
                SELECT 
                 od.*,
                 orgd.org_dress_name,
                 orgd.material_req
                FROM order_details od
                JOIN org_dress orgd ON od.org_dress_id = orgd.id
                WHERE od.order_id = ?
            `, [order.id]);

            // Get Assigned Items (Cutting Process)
            const [cuttingItems] = await db.query(`
                SELECT * FROM cutting_process WHERE order_id = ?
            `, [order.id]);

            const incompleteItems = [];
            let isPartiallyCut = false;

            for (const item of orderItems) {
                const orderedSq = typeof item.sq === 'string' ? JSON.parse(item.sq) : item.sq;
                
                // Aggregate assigned SQ for this item (org_dress_id)
                const assignedSq = {};
                const relatedCuts = cuttingItems.filter(c => c.org_dress_id === item.org_dress_id);
                
                let assignedFabricId = null;
                if (relatedCuts.length > 0) {
                    isPartiallyCut = true;
                    // Find the fabric used (assuming only 1 fabric type allowed per item as per new strict rule)
                    // We need to fetch the cloth_detail_id from the first related cut's details
                    // Since we don't have details joined here, we might need a separate query or join earlier.
                    // Optimization: We can do a quick lookup here since this loop isn't huge.
                    const [fabricRows] = await db.query(`
                        SELECT cq.cloth_detail_id 
                        FROM cutting_details cd
                        JOIN cutting_process cp ON cd.cutting_process_id = cp.id
                        JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
                        WHERE cp.order_id = ? AND cp.org_dress_id = ?
                        LIMIT 1
                    `, [order.id, item.org_dress_id]);
                    
                    if (fabricRows.length > 0) {
                        assignedFabricId = fabricRows[0].cloth_detail_id;
                    }
                }

                relatedCuts.forEach(cut => {
                     const cSq = typeof cut.sq === 'string' ? JSON.parse(cut.sq) : cut.sq;
                     Object.entries(cSq).forEach(([size, qty]) => {
                         assignedSq[size] = (assignedSq[size] || 0) + Number(qty);
                     });
                });

                // Calculate Remaining
                const remainingSq = {};
                let hasRemaining = false;
                Object.entries(orderedSq).forEach(([size, qty]) => {
                    const assigned = assignedSq[size] || 0;
                    const rem = Number(qty) - assigned;
                    if (rem > 0) {
                        remainingSq[size] = rem;
                        hasRemaining = true;
                    }
                });

                if (hasRemaining) {
                    incompleteItems.push({
                        ...item,
                        sq: remainingSq, // Only show what is LEFT to cut
                        original_sq: orderedSq,
                        assigned_fabric_id: assignedFabricId // Send locked fabric ID
                    });
                }
            }

            if (incompleteItems.length > 0) {
                pendingOrders.push({
                    ...order,
                    status: isPartiallyCut ? 'Partial Cutting' : 'Pending', // Computed status for UI
                    items: incompleteItems
                });
            }
        }

        res.status(200).json({
            success: true,
            pending_orders: pendingOrders
        });

    } catch (error) {
        next(error);
    }
}

// --- ACTIONS ---

exports.startCuttingJob = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let { 
            order_id, 
            org_dress_id, 
            emp_id, 
            sq, 
            pattern_series,
            assignments // Array of { emp_id, sq, cloth_quantity_id, fabric_used, cut_type, cut_rate }
        } = req.body;

        // normalization
        let jobsToCreate = [];
        if (assignments && Array.isArray(assignments) && assignments.length > 0) {
            jobsToCreate = assignments;
        } else {
            jobsToCreate = [{ emp_id, sq }]; // Legacy fallback (should ideally be blocked by frontend)
        }

        // ===== HARD VALIDATION: Prevent Over-Assignment =====
        // Only validate customer orders, skip for stock production
        if (order_id) {
            // Check if this is a stock order
            const [orderInfo] = await connection.query(`
                SELECT o.id, org.org_name 
                FROM orders o 
                JOIN organization org ON o.org_id = org.id 
                WHERE o.id = ?
            `, [order_id]);

            const isStockOrder = orderInfo.length > 0 && orderInfo[0].org_name === 'INTERNAL STOCK PRODUCTION';

            // Only validate if NOT a stock order
            if (!isStockOrder) {
                // Get order target quantities
                const [orderDetails] = await connection.query(`
                    SELECT sq FROM order_details 
                    WHERE order_id = ? AND org_dress_id = ?
                `, [order_id, org_dress_id]);

                if (orderDetails.length === 0) {
                    throw new Error('Order item not found');
                }

                const targetSq = JSON.parse(orderDetails[0].sq);

                // Calculate total assigned across all cutting assignments
                const totalAssigned = {};
                jobsToCreate.forEach(job => {
                    const jobSq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                    Object.entries(jobSq).forEach(([size, qty]) => {
                        totalAssigned[size] = (totalAssigned[size] || 0) + parseInt(qty);
                    });
                });

                // Validate: assigned must NOT exceed target for any size
                const overAssigned = [];
                Object.entries(targetSq).forEach(([size, target]) => {
                    const assigned = totalAssigned[size] || 0;
                    if (assigned > parseInt(target)) {
                        overAssigned.push({
                            size,
                            target: parseInt(target),
                            assigned
                        });
                    }
                });

                if (overAssigned.length > 0) {
                    const errors = overAssigned.map(o => 
                        `Size ${o.size}: Target ${o.target}, Assigned ${o.assigned} (Over by ${o.assigned - o.target})`
                    ).join('; ');
                    
                    return res.status(422).json({
                        success: false,
                        message: `Over-assignment detected: ${errors}`,
                        overAssigned
                    });
                }
            }
        }
        // ===== END VALIDATION =====



        // Handle Stock Order Creation if needed... (Keeping existing logic for safety)
        if (!order_id) {
            let [orgs] = await connection.query("SELECT id FROM organization WHERE name = 'INTERNAL_STOCK'");
            let orgId;
            if (orgs.length === 0) {
                const [res] = await connection.query("INSERT INTO organization (name, org_name, org_type) VALUES ('INTERNAL_STOCK', 'INTERNAL STOCK PRODUCTION', 'Internal')");
                orgId = res.insertId;
            } else {
                orgId = orgs[0].id;
            }
            let [orders] = await connection.query("SELECT id FROM orders WHERE org_id = ? AND status = 'Stock'", [orgId]);
            if (orders.length === 0) {
                const [res] = await connection.query("INSERT INTO orders (org_id, date, status, remarks) VALUES (?, CURDATE(), 'Stock', 'Sentinal order for stock production')", [orgId]);
                order_id = res.insertId;
            } else {
                order_id = orders[0].id;
            }
        }

        const createdJobIds = [];

        for (const job of jobsToCreate) {
             // 0. Validate Inputs
             // if (!job.cloth_quantity_id || !job.fabric_used) {
             //     throw new Error("Missing Fabric Roll or Usage Amount. Fabric assignment is mandatory.");
             // }

             let bal_cloth = 0;
             let quantityIdToUse = job.cloth_quantity_id || null;

             // 1. Lock & Deduct Stock (ONLY IF FABRIC PROVIDED)
             if (job.cloth_quantity_id && job.fabric_used) {
                 const [rows] = await connection.query(
                    'SELECT id, roll_length, cloth_detail_id FROM cloth_quantity WHERE id = ? FOR UPDATE',
                    [job.cloth_quantity_id]
                 );

                 if (rows.length === 0) throw new Error(`Roll #${job.cloth_quantity_id} not found`);
                 
                 const roll = rows[0];
                 const currentLen = Number(roll.roll_length);
                 const usedLen = Number(job.fabric_used);

                 if (currentLen < usedLen) {
                     throw new Error(`Insufficient fabric in Roll #${job.cloth_quantity_id}. Avail: ${currentLen}, Req: ${usedLen}`);
                 }

                 bal_cloth = currentLen - usedLen;

                 // Update Roll
                 await connection.query('UPDATE cloth_quantity SET roll_length = ? WHERE id = ?', [bal_cloth, job.cloth_quantity_id]);
                 
                 // Update Totals
                 const [sumRow] = await connection.query('SELECT SUM(roll_length) as total FROM cloth_quantity WHERE cloth_detail_id = ?', [roll.cloth_detail_id]);
                 await connection.query('UPDATE cloth_detail SET total_quantity = ? WHERE id = ?', [sumRow[0].total || 0, roll.cloth_detail_id]);
             }

                // Update SQ with usage metadata
                const sqObj = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                if (job.cloth_quantity_id && job.fabric_used) {
                    if (!sqObj._meta) sqObj._meta = { fabric: {} };
                    sqObj._meta.fabric[job.cloth_quantity_id] = Number(job.fabric_used);
                }
                const sqString = JSON.stringify(sqObj);

                // 2. Insert Cutting Process
                const [procRes] = await connection.query(`
                    INSERT INTO cutting_process
                    (emp_id, org_dress_id, order_id, sq, pattern_series, remarks, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'Pending')
                `, [job.emp_id, org_dress_id, order_id, sqString, pattern_series, req.body.remarks]);
                
                const processId = procRes.insertId;
                createdJobIds.push(processId);
    
                // 3. Insert Cutting Details (Usage Log) - ONLY IF FABRIC PROVIDED
                if (job.cloth_quantity_id && job.fabric_used) {
                    await connection.query(`
                        INSERT INTO cutting_details
                        (cutting_process_id, cloth_quantity_id, bal_cloth, cut_type, cut_rate)
                        VALUES (?, ?, ?, ?, ?)
                    `, [processId, job.cloth_quantity_id, bal_cloth, job.cut_type || 'Standard', job.cut_rate || 0]); 
                }
        }
        
        // 4. Update Order Status
        if (order_id) {
             const [ord] = await connection.query("SELECT status FROM orders WHERE id = ?", [order_id]);
             if (ord[0].status === 'Pending') {
                 await connection.query("UPDATE orders SET status = 'Partial Cutting' WHERE id = ?", [order_id]);
             }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Cutting job(s) started',
            jobIds: createdJobIds,
            orderId: order_id
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.transferStock = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { source_stock_id, target_order_id, transfer_sq } = req.body;

        // 1. Lock source stock
        const [sourceRows] = await connection.query('SELECT * FROM cut_stock WHERE id = ? FOR UPDATE', [source_stock_id]);
        if (sourceRows.length === 0) {
            throw new Error('Source stock not found');
        }
        const sourceStock = sourceRows[0];
        
        // 2. Get Source Process Details (to know what item it is)
        const [procRows] = await connection.query('SELECT org_dress_id, pattern_series FROM cutting_process WHERE id = ?', [sourceStock.cutting_process_id]);
        const org_dress_id = procRows[0].org_dress_id;
        const pattern_series = procRows[0].pattern_series;

        // 3. Parse SQs
        let sourceSq = typeof sourceStock.sq === 'string' ? JSON.parse(sourceStock.sq) : sourceStock.sq;
        let transferSqMap = typeof transfer_sq === 'string' ? JSON.parse(transfer_sq) : transfer_sq;

        // 4. Verification & Deduction
        for (const [size, qty] of Object.entries(transferSqMap)) {
            const transferQty = Number(qty);
            const availableQty = Number(sourceSq[size] || 0);

            if (transferQty > availableQty) {
                throw new Error(`Insufficient stock for size ${size}. Available: ${availableQty}, Requested: ${transferQty}`);
            }

            sourceSq[size] = availableQty - transferQty;
            if (sourceSq[size] <= 0) {
                delete sourceSq[size];
            }
        }

        // 5. Update Source
        const sourceKeys = Object.keys(sourceSq);
        if (sourceKeys.length === 0) {
            // Empty? Delete it.
            await connection.query('DELETE FROM cut_stock WHERE id = ?', [source_stock_id]);
        } else {
             await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(sourceSq), source_stock_id]);
        }

        // 6. Create Phantom Cutting Process (Already Completed)
        // We use a dummy emp_id or 0? 
        // Let's use the original emp_id if possible, or 0.
        // Or find a system user? Let's just use the first active employee for now or 0 if allowed.
        // Checking schema: emp_id is NOT NULL and references emp_details.
        // We need a valid emp_id. Let's find one or use the one from original process.
        const [originalProc] = await connection.query('SELECT emp_id FROM cutting_process WHERE id = ?', [sourceStock.cutting_process_id]);
        const empIdToUse = originalProc[0].emp_id;

        const [procRes] = await connection.query(`
            INSERT INTO cutting_process
            (emp_id, org_dress_id, order_id, sq, pattern_series, status, remarks)
            VALUES (?, ?, ?, ?, ?, 'Completed', 'Transferred from Internal Stock')
        `, [empIdToUse, org_dress_id, target_order_id, JSON.stringify(transferSqMap), pattern_series]);
        
        const newProcessId = procRes.insertId;

        // 7. Create New Cut Stock
        await connection.query(`
            INSERT INTO cut_stock (cutting_process_id, sq)
            VALUES (?, ?)
        `, [newProcessId, JSON.stringify(transferSqMap)]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Stock transferred successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.getInternalStock = async (req, res, next) => {
    try {
        const { org_dress_id } = req.query;

        if (!org_dress_id) {
            return res.status(400).json({ success: false, message: 'Product ID (org_dress_id) is required' });
        }

        const [stock] = await db.query(`
            SELECT 
                cs.id,
                cs.sq,
                cp.org_dress_id,
                cq.cloth_detail_id,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            -- Join to get fabric details involves finding the fabric used in that process
            -- Optimization: We grab the first fabric record for this process
            JOIN cutting_details cd ON cd.cutting_process_id = cp.id
            JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
            JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
            JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
            JOIN colors c ON cdt.color_id = c.id
            JOIN design d ON cdt.design_id = d.id
            JOIN quality q ON cdt.quality_id = q.id
            WHERE org.org_name = 'INTERNAL STOCK PRODUCTION' 
            AND cp.org_dress_id = ?
            AND cs.id NOT IN (
                SELECT cut_stock_id 
                FROM processing 
                WHERE status != 'processed' OR stage_id = 8 OR (status = 'processed' AND stage_id IS NOT NULL)
            )
            GROUP BY 
                cs.id, cp.org_dress_id, cq.cloth_detail_id, ct.type, c.color_name, d.design_name, q.quality_name
        `, [org_dress_id]);

        res.status(200).json({
            success: true,
            stock
        });

    } catch (error) {
        next(error);
    }
};

exports.recordFabricUsage = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params; // cutting_process_id
        const { fabric_entries, stock_entries } = req.body; 
        
        // Validation: At least one type of entry must exist
        if ((!fabric_entries || fabric_entries.length === 0) && (!stock_entries || stock_entries.length === 0)) {
            throw new Error('No fabric or stock entries provided');
        }

        // Fetch current SQ to update metadata
        const [procRows] = await connection.query('SELECT sq, remarks FROM cutting_process WHERE id = ? FOR UPDATE', [id]);
        if (procRows.length === 0) throw new Error('Cutting process not found');
        
        let currentSq = procRows[0].sq;
        let remarks = procRows[0].remarks || "";
        // Ensure it's an object
        if (typeof currentSq === 'string') currentSq = JSON.parse(currentSq);
        if (!currentSq._meta) currentSq._meta = { fabric: {}, stock: {} };


        // --- PROCESS FABRIC ENTRIES (ROLLS) ---
        const involvedClothDetailIds = new Set();

        if (fabric_entries && fabric_entries.length > 0) {
            for (const entry of fabric_entries) {
                const { cloth_quantity_id, fabric_used, cut_type, cut_rate } = entry;

                // Update Metadata in SQ object
                currentSq._meta.fabric[cloth_quantity_id] = Number(fabric_used);

                // 1. Lock & Get Roll Info
                const [rows] = await connection.query(
                    'SELECT id, roll_length, cloth_detail_id FROM cloth_quantity WHERE id = ? FOR UPDATE',
                    [cloth_quantity_id]
                );

                if (rows.length === 0) {
                    throw new Error(`Roll ID ${cloth_quantity_id} not found`);
                }

                const roll = rows[0];
                const currentLen = Number(roll.roll_length);
                const usedLen = Number(fabric_used);

                if (currentLen < usedLen) {
                    throw new Error(`Insufficient fabric in Roll #${cloth_quantity_id}. Available: ${currentLen}, Requested: ${usedLen}`);
                }

                // 2. Calculate Balance
                const bal_cloth = currentLen - usedLen;

                // 3. Insert Log (Standard Schema)
                await connection.query(`
                    INSERT INTO cutting_details
                    (cutting_process_id, cloth_quantity_id, bal_cloth, cut_type, cut_rate)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, cloth_quantity_id, bal_cloth, cut_type, cut_rate]);

                // 4. Update Roll Length
                await connection.query(
                    'UPDATE cloth_quantity SET roll_length = ? WHERE id = ?',
                    [bal_cloth, cloth_quantity_id]
                );

                // Add to set for recalculation
                involvedClothDetailIds.add(roll.cloth_detail_id);
            }
        }

        // --- PROCESS STOCK ENTRIES (INTERNAL STOCK) ---
        if (stock_entries && stock_entries.length > 0) {
             for (const entry of stock_entries) {
                const { cut_stock_id, used_sq, used_qty } = entry;
                
                // Lock Stock
                const [stockRows] = await connection.query('SELECT * FROM cut_stock WHERE id = ? FOR UPDATE', [cut_stock_id]);
                if (stockRows.length === 0) throw new Error(`Stock ID ${cut_stock_id} not found`);
                
                const stock = stockRows[0];
                let stockSq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                
                // Deduct Logic
                let totalDeducted_this_entry = 0;
                let usageSummary = [];

                if (used_sq) {
                    // EXPLICIT SIZE DEDUCTION (New Flow)
                    for (const [size, qty] of Object.entries(used_sq)) {
                        const requested = Number(qty);
                        if (requested > 0) {
                            const available = Number(stockSq[size] || 0);
                            
                            if (available < requested) {
                                throw new Error(`Insufficient stock for size ${size} in Stock #${cut_stock_id}. Avail: ${available}, Req: ${requested}`);
                            }
                            
                            stockSq[size] = available - requested;
                            if (stockSq[size] <= 0) delete stockSq[size];
                            
                            totalDeducted_this_entry += requested;
                            usageSummary.push(`${size}:${requested}`);
                        }
                    }
                } else if (used_qty) {
                    // LEGACY / AUTO-DEDUCT FALLBACK
                    let remainingToDeduct = Number(used_qty);
                    totalDeducted_this_entry = remainingToDeduct;
                    
                    for (const size in stockSq) {
                        if (remainingToDeduct <= 0) break;
                        
                        const available = Number(stockSq[size]);
                        if (available > 0) {
                            const deduct = Math.min(available, remainingToDeduct);
                            stockSq[size] = available - deduct;
                            remainingToDeduct -= deduct;
                            
                            usageSummary.push(`${size}:${deduct}`);
                            
                            if (stockSq[size] === 0) delete stockSq[size];
                        }
                    }
                    
                    if (remainingToDeduct > 0) {
                        throw new Error(`Insufficient stock in ID ${cut_stock_id} to satisfy request.`);
                    }
                } else {
                     throw new Error(`Invalid stock entry for ID ${cut_stock_id}: No quantity provided`);
                }
                
                // Update Stock Record
                const keys = Object.keys(stockSq);
                if (keys.length === 0) {
                    await connection.query('DELETE FROM cut_stock WHERE id = ?', [cut_stock_id]);
                } else {
                    await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(stockSq), cut_stock_id]);
                }
                
                // Log Usage in Metadata & Remarks
                // We store the total used from this stock ID
                currentSq._meta.stock[cut_stock_id] = (currentSq._meta.stock[cut_stock_id] || 0) + totalDeducted_this_entry;
                remarks += ` | Stock #${cut_stock_id} (${usageSummary.join(', ')})`;
             }
        }

        // UPDATE SQ in Cutting Process
        await connection.query('UPDATE cutting_process SET sq = ?, remarks = ? WHERE id = ?', 
            [JSON.stringify(currentSq), remarks, id]);

        // 5. Recalculate Totals for affected Cloth Details
        for (const detailId of involvedClothDetailIds) {
            const [sumRow] = await connection.query(
                'SELECT SUM(roll_length) as total FROM cloth_quantity WHERE cloth_detail_id = ?',
                [detailId]
            );
            const newTotal = sumRow[0].total || 0;

            await connection.query(
                'UPDATE cloth_detail SET total_quantity = ? WHERE id = ?',
                [newTotal, detailId]
            );
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Fabric/Stock usage recorded successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.completeCutting = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // 1. Update Status
        const [updateRes] = await connection.query(
            "UPDATE cutting_process SET status='Completed' WHERE id = ?",
            [id]
        );

        if (updateRes.affectedRows === 0) {
            throw new Error('Cutting job not found');
        }

        // 2. Get SQ
        const [rows] = await connection.query('SELECT sq FROM cutting_process WHERE id = ?', [id]);
        const sq = rows[0].sq; // Raw JSON string or object depending on driver config

        // 3. Check for existing Cut Stock to MERGE
        // We need to match: Order ID, Product (org_dress_id), and Pattern Series
        // AND ensuring the stock is NOT already in processing (locked)
        const [procInfo] = await connection.query('SELECT order_id, org_dress_id, pattern_series FROM cutting_process WHERE id = ?', [id]);
        const { order_id, org_dress_id, pattern_series } = procInfo[0];

        const [existingStock] = await connection.query(`
            SELECT cs.id, cs.sq 
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            WHERE cp.order_id = ? 
            AND cp.org_dress_id = ? 
            AND cp.pattern_series = ?
            AND cs.id NOT IN (SELECT cut_stock_id FROM processing)
            LIMIT 1
        `, [order_id, org_dress_id, pattern_series]);

        let cutStockId;

        // sq is likely a string from DB, ensure we pass it correctly
        const newSqMap = (typeof sq === 'string') ? JSON.parse(sq) : sq;

        if (existingStock.length > 0) {
            // MERGE
            const target = existingStock[0];
            const targetSq = typeof target.sq === 'string' ? JSON.parse(target.sq) : target.sq;

            for (const [size, qty] of Object.entries(newSqMap)) {
                targetSq[size] = (targetSq[size] || 0) + Number(qty);
            }

            await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(targetSq), target.id]);
            cutStockId = target.id;
        } else {
            // INSERT NEW
            const sqValue = JSON.stringify(newSqMap);
            const [stockRes] = await connection.query(
                'INSERT INTO cut_stock (cutting_process_id, sq) VALUES (?, ?)',
                [id, sqValue]
            );
            cutStockId = stockRes.insertId;
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: existingStock.length > 0 ? 'Cutting job completed (Merged to existing stock)' : 'Cutting job completed',
            cutStockId: cutStockId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
