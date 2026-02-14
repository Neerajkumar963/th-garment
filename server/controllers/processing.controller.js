const db = require('../config/database');

// --- GETTERS ---

exports.getKanbanBoard = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                p.*,
                e.name as worker_name,
                cs.sq as cut_sq,
                cp.order_id,
                cp.org_dress_id,
                od.org_dress_name,
                o.branch as order_branch,
                org.org_name,
                ps.stage_name
            FROM processing p
            JOIN emp_details e ON p.emp_id = e.id
            JOIN emp_roles er ON e.role_id = er.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN org_dress od ON cp.org_dress_id = od.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            JOIN process_stage ps ON p.stage_id = ps.id
            WHERE er.role != 'Fabricator'
            ORDER BY p.stage_id, p.created_on
        `);

        if (jobs.length > 0) {
            console.log("DEBUG: getKanbanBoard First Job:", JSON.stringify(jobs[0], null, 2));
        }

        const [stages] = await db.query('SELECT * FROM process_stage ORDER BY id');

        const groupedStages = stages.map(stage => {
            return {
                id: stage.id,
                name: stage.stage_name,
                jobs: jobs.filter(job => {
                    // Filter by stage
                    if (job.stage_id !== stage.id) return false;
                    
                    // Filter out empty jobs (where all sizes are 0)
                    let hasQty = false;
                    try {
                        const sq = typeof job.sq === 'string' ? JSON.parse(job.sq) : job.sq;
                        Object.entries(sq).forEach(([key, val]) => {
                            if (key !== '_meta' && Number(val) > 0) hasQty = true;
                        });
                    } catch (e) { hasQty = true; } // Safety fallback
                    
                    return hasQty;
                })
            };
        });

        res.status(200).json({
            success: true,
            stages: groupedStages
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllStages = async (req, res, next) => {
    try {
        const [stages] = await db.query('SELECT * FROM process_stage ORDER BY id');
        res.status(200).json({ success: true, stages });
    } catch (error) {
        next(error);
    }
};

exports.getFabricatorJobs = async (req, res, next) => {
    try {
        const [jobs] = await db.query(`
            SELECT 
                p.*,
                e.name as worker_name,
                er.role as worker_role,
                cs.sq as cut_sq,
                od.org_dress_name,
                o.branch as order_branch,
                org.org_name
            FROM processing p
            JOIN emp_details e ON p.emp_id = e.id
            JOIN emp_roles er ON e.role_id = er.id
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN org_dress od ON cp.org_dress_id = od.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            WHERE er.role = 'Fabricator' AND p.status != 'processed'
            ORDER BY p.created_on DESC
        `);

        res.status(200).json({ success: true, jobs });
    } catch (error) {
        next(error);
    }
};

exports.getProcessingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [jobs] = await db.query('SELECT * FROM processing WHERE id = ?', [id]);

        if (jobs.length === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.status(200).json({ success: true, job: jobs[0] });

    } catch (error) {
        next(error);
    }
};

exports.getAvailableStock = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                cs.id,
                cs.sq,
                cs.cutting_process_id,
                cp.org_dress_id,
                od.org_dress_name,
                org.org_name
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN org_dress od ON cp.org_dress_id = od.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            ORDER BY cs.created_on ASC
        `);

        // Filter out empty stock
        const availableStock = rows.filter(stock => {
            try {
                const sq = typeof stock.sq === 'string' ? JSON.parse(stock.sq) : stock.sq;
                let hasQty = false;
                Object.entries(sq).forEach(([key, val]) => {
                    if (key !== '_meta' && Number(val) > 0) hasQty = true;
                });
                return hasQty;
            } catch (e) { return true; }
        });

        res.status(200).json({
            success: true,
            availableStock
        });
    } catch (error) {
        next(error);
    }
};

exports.getFabricDetails = async (req, res, next) => {
    try {
        const { id } = req.params; // processing_id

        const [processing] = await db.query(`
            SELECT cut_stock_id FROM processing WHERE id = ?
        `, [id]);

        if (processing.length === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        const [stock] = await db.query(`
            SELECT cutting_process_id FROM cut_stock WHERE id = ?
        `, [processing[0].cut_stock_id]);

        if (stock.length === 0) {
            return res.status(404).json({ success: false, message: 'Source stock not found' });
        }

        const [details] = await db.query(`
            SELECT 
                cd.bal_cloth,
                cd.cut_type,
                (cq.roll_length + cd.bal_cloth) as original_roll_length,
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
        `, [stock[0].cutting_process_id]);

        res.status(200).json({
            success: true,
            details: details.map(d => ({
                ...d,
                used_qty: (Number(d.original_roll_length) - Number(d.bal_cloth)).toFixed(2)
            }))
        });

    } catch (error) {
        next(error);
    }
};

// --- ACTIONS ---

exports.assignWorker = async (req, res, next) => {

        const { 
            cut_stock_id, 
            emp_id, 
            stage_id, 
            sq, 
            processing_rate,
            stockUsed // { "M": 10 }
        } = req.body;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Handle Stock Usage if provided
            if (stockUsed && Object.keys(stockUsed).length > 0) {
                // Get Order details to identify correct stock item
                const [stockDetails] = await connection.query(`
                    SELECT cp.org_dress_id 
                    FROM cut_stock cs
                    JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                    WHERE cs.id = ?
                `, [cut_stock_id]);

                if (stockDetails.length === 0) throw new Error('Invalid Cut Stock ID');
                const orgDressId = stockDetails[0].org_dress_id;

                for (const [size, qty] of Object.entries(stockUsed)) {
                    if (Number(qty) <= 0) continue;
                    
                    // Deduct from Selling Stock (FIFO - Oldest First)
                    const [delRes] = await connection.query(`
                        DELETE FROM selling_stock 
                        WHERE org_dress_id = ? AND TRIM(UPPER(size)) = TRIM(UPPER(?)) 
                        ORDER BY created_on ASC 
                        LIMIT ?
                    `, [orgDressId, size, Number(qty)]);

                    if (delRes.affectedRows < Number(qty)) {
                         throw new Error(`Insufficient stock for ${size}. Required: ${qty}, Found: ${delRes.affectedRows}`);
                    }
                }
            }
            
            // Removed overlap check to allow multiple workers for same stage
            // Quantity validation below prevents over-assignment

            const sqValue = (typeof sq === 'object') ? JSON.stringify(sq) : sq;

        // If SQ is empty (because everything was fulfilled by stock), we might skip assignment?
        // But user said "Remaining quantity continues". If remaining is 0, we should complete order?
        // Check if there is anything to assign
        let hasQuantity = false;
        try {
            const parsedSq = typeof sq === 'string' ? JSON.parse(sq) : sq;
             // Filter out _meta
            const realSizes = Object.entries(parsedSq).filter(([k]) => k !== '_meta');
            if (realSizes.some(([_, q]) => Number(q) > 0)) hasQuantity = true;
        } catch(e) {}

        if (hasQuantity) {
            const [result] = await connection.query(`
                INSERT INTO processing
                (cut_stock_id, sq, emp_id, stage_id, status, processing_rate)
                VALUES (?, ?, ?, ?, 'in_queue', ?)
            `, [cut_stock_id, sqValue, emp_id, stage_id, processing_rate]);
            
            await connection.commit();
            
            res.status(201).json({
                success: true,
                message: 'Worker assigned successfully',
                processId: result.insertId
            });
        } else {
             // If fully fulfilled by stock, check if we need to close the Cut Stock or Order?
             // Since we deleted the stock, the order is effectively fulfilled.
             // We can mark the cut_stock as 'processed' (dummy completion) so it doesn't show up as available?
             // Actually, cut_stock has no status.
             // We can insert a dummy 'processed' record so it doesn't show up in Kanban?
             // Or just do nothing.
             
             // If no processing record is created, the cut_stock remains "Available for Assignment" in the UI. 
             // That is bad. We must consume it.
             
             // Insert a 'processed' record with 0 quantity?
             // "If user selects all 600 from stock... Order page should directly show Completed."
             // "Nothing goes to Fabricator or Tailor."
             
             // So we should Create a processing record with status='processed'?
              const [result] = await connection.query(`
                INSERT INTO processing
                (cut_stock_id, sq, emp_id, stage_id, status, processing_rate, remarks)
                VALUES (?, ?, ?, ?, 'processed', ?, 'Fulfilled from Stock')
            `, [cut_stock_id, sqValue, emp_id, 8, 0]); // Stage 8 = Processed
            
            await connection.commit();
             res.status(200).json({ success: true, message: 'Order fulfilled from stock' });
        }

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.receiveFromFabricator = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const { id } = req.params;
        const { receivedQty } = req.body; // { "M": 5, "L": 2 }

        const [rows] = await connection.query('SELECT * FROM processing WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) throw new Error('Job not found');

        const job = rows[0];
        let sq = job.sq;
        if (typeof sq === 'string') sq = JSON.parse(sq);

        if (!sq._meta) sq._meta = {};
        if (!sq._meta.received) sq._meta.received = {};

        // Update received counts
        let totalSent = 0;
        let totalRecv = 0;

        // Calculate Sent
        Object.entries(sq).forEach(([k, v]) => {
            if (k !== '_meta') totalSent += Number(v);
        });

        // Update Received & Prepare Stock Insert
        const stockInserts = [];
        
        // Need prices for stock insert
        const [dressRows] = await connection.query(`
            SELECT cp.org_dress_id, org.org_name
            FROM cut_stock cs
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            JOIN orders o ON cp.order_id = o.id
            JOIN organization org ON o.org_id = org.id
            WHERE cs.id = ?
        `, [job.cut_stock_id]);

        let priceMap = {};
        let orgDressId = null;
        let isInternalStock = false;

        if (dressRows.length > 0) {
            orgDressId = dressRows[0].org_dress_id;
            const orgName = dressRows[0].org_name;
            isInternalStock = (orgName === 'INTERNAL STOCK PRODUCTION' || orgName === 'INTERNAL STOCK');

            const [prices] = await connection.query(
                'SELECT size, price FROM price_list WHERE org_dress_id = ?',
                [orgDressId]
            );
            prices.forEach(p => priceMap[p.size] = p.price);
        }

        Object.entries(receivedQty).forEach(([size, qty]) => {
            const current = sq._meta.received[size] || 0;
            sq._meta.received[size] = Number(current) + Number(qty);

            // Add to Stock Inserts ONLY if it's internal stock
            if (isInternalStock && orgDressId && Number(qty) > 0) {
                const price = priceMap[size] || 0;
                for (let i = 0; i < Number(qty); i++) {
                    stockInserts.push([orgDressId, null, size, price, 'Produced by Fabricator']);
                }
            }
        });

        // Calculate Total Received
        Object.values(sq._meta.received).forEach(v => totalRecv += Number(v));

        let status = 'in_process'; 
        let stageId = job.stage_id;

        if (totalRecv >= totalSent) {
            status = 'processed'; // "Completed"
            stageId = 8; // Finished Goods -> Prevents re-assignment
        }

        // Update DB
        await connection.query(`
            UPDATE processing 
            SET sq = ?, status = ?, stage_id = ?, updated_on = NOW() 
            WHERE id = ?
        `, [JSON.stringify(sq), status, stageId, id]);

        // --- ACCOUNTING: Credit Fabricator for Work ---
        const totalReceivedNow = Object.values(receivedQty).reduce((acc, q) => acc + Number(q), 0);
        if (totalReceivedNow > 0) {
            const amount = totalReceivedNow * Number(job.processing_rate || 0);
            
            // Get current balance
            const [balRow] = await connection.query(
                'SELECT balance FROM emp_account WHERE emp_id = ? ORDER BY datetime DESC LIMIT 1',
                [job.emp_id]
            );
            const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;
            const newBalance = currentBal + amount;

            await connection.query(`
                INSERT INTO emp_account
                (emp_id, transaction, amount, balance, mode, remarks)
                VALUES (?, 'DR', ?, ?, 'Kind', ?)
            `, [job.emp_id, amount, newBalance, `Received ${totalReceivedNow} pcs from Fabricator (Job #${id})`]);
        }

        // Insert into Stock
        if (stockInserts.length > 0) {
            await connection.query(`
                INSERT INTO selling_stock (org_dress_id, brand, size, price, remarks)
                VALUES ?
            `, [stockInserts]);
        }

        await connection.commit();
        res.status(200).json({ success: true, message: 'Received successfully', status });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// NEW: Multi-Employee Assignment
exports.assignMultipleWorkers = async (req, res, next) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        console.log("DEBUG: assignMultipleWorkers Body:", JSON.stringify(req.body, null, 2)); 
        const { cut_stock_id, stage_id, assignments, stockUsed, parent_job_id } = req.body;
        // stockUsed = { "M": 10 }

        if ((!assignments || assignments.length === 0) && (!stockUsed || Object.keys(stockUsed).length === 0)) {
            throw new Error('At least one assignment or stock usage is required');
        }

        // 1. Get cut stock (Always needed for org_dress_id)
        const [stockRows] = await connection.query(
            `SELECT cs.sq, cp.org_dress_id 
             FROM cut_stock cs
             JOIN cutting_process cp ON cs.cutting_process_id = cp.id
             WHERE cs.id = ?`,
            [cut_stock_id]
        );

        if (stockRows.length === 0) throw new Error('Cut stock not found');

        const orgDressId = stockRows[0].org_dress_id;
        let availableSq = {};

        // 2. Determine Available SQ
        if (stage_id === 1) {
            // For Stage 1, available is what's in cut_stock
            try {
                availableSq = typeof stockRows[0].sq === 'string' 
                    ? JSON.parse(stockRows[0].sq) 
                    : stockRows[0].sq;
            } catch (e) { availableSq = {}; }
        } else {
            // For Stage > 1, available is what's in the PARENT JOB (Source)
            if (parent_job_id) {
                const [jobRows] = await connection.query('SELECT sq FROM processing WHERE id = ?', [parent_job_id]);
                if (jobRows.length === 0) throw new Error(`Source job #${parent_job_id} not found`);
                
                try {
                    availableSq = typeof jobRows[0].sq === 'string' ? JSON.parse(jobRows[0].sq) : jobRows[0].sq;
                } catch (e) { availableSq = {}; }
            } else {
                 throw new Error('Internal Error: Missing source job ID for transfer. Please refresh and try again.');
            }
        }

        // 3. Validate Stock & Deduct
        if (stockUsed && Object.keys(stockUsed).length > 0) {
             for (const [size, qty] of Object.entries(stockUsed)) {
                if (Number(qty) <= 0) continue;
                
                const [delRes] = await connection.query(`
                    DELETE FROM selling_stock 
                    WHERE org_dress_id = ? AND TRIM(UPPER(size)) = TRIM(UPPER(?)) 
                    ORDER BY created_on ASC 
                    LIMIT ?
                `, [orgDressId, size, Number(qty)]);

                if (delRes.affectedRows < Number(qty)) {
                     throw new Error(`Insufficient stock for ${size}. Required: ${qty}, Found: ${delRes.affectedRows}`);
                }
            }
        }

        // 4. Calculate total assigned
        const totalAssigned = {};
        
        // From Employees
        if (assignments) {
            assignments.forEach(assignment => {
                let sq = {};
                try {
                    sq = typeof assignment.sq === 'string' ? JSON.parse(assignment.sq) : assignment.sq;
                } catch(e) {}
                
                Object.entries(sq).forEach(([size, qty]) => {
                    totalAssigned[size] = (totalAssigned[size] || 0) + Number(qty);
                });
            });
        }

        // From Stock
        if (stockUsed) {
            Object.entries(stockUsed).forEach(([size, qty]) => {
                totalAssigned[size] = (totalAssigned[size] || 0) + Number(qty);
            });
        }

        // 5. Validate Over-assignment
        const overAssigned = [];
        Object.keys(availableSq).forEach(size => {
            if (size === '_meta') return;
            const available = Number(availableSq[size] || 0);
            const assigned = totalAssigned[size] || 0;
            if (assigned > available) {
                overAssigned.push({ size, available, assigned });
            }
        });

        if (overAssigned.length > 0) {
            // Rollback happens in catch block
            const errors = overAssigned.map(o =>
                `Size ${o.size}: Available ${o.available}, Assigned ${o.assigned}`
            ).join('; ');
            throw new Error(`Over-assignment detected: ${errors}`); 
        }

        const createdIds = [];

        // 6. Create Employee Records
        if (assignments) {
            for (const assignment of assignments) {
                const sqValue = typeof assignment.sq === 'object' ? JSON.stringify(assignment.sq) : assignment.sq;
                const [result] = await connection.query(`
                    INSERT INTO processing
                    (cut_stock_id, sq, emp_id, stage_id, status, processing_rate)
                    VALUES (?, ?, ?, ?, 'in_queue', ?)
                `, [cut_stock_id, sqValue, assignment.emp_id, stage_id, assignment.processing_rate || 0]);
                createdIds.push(result.insertId);
            }
        }

        // 7. Create Stock Record (if used)
        if (stockUsed && Object.keys(stockUsed).length > 0) {
            let stockEmpId = 0;
            if (assignments && assignments.length > 0) {
                stockEmpId = assignments[0].emp_id;
            } else {
                const [empRows] = await connection.query('SELECT id FROM emp_details LIMIT 1');
                if (empRows.length > 0) stockEmpId = empRows[0].id;
            }

             const [result] = await connection.query(`
                INSERT INTO processing
                (cut_stock_id, sq, emp_id, stage_id, status, processing_rate, remarks)
                VALUES (?, ?, ?, ?, 'processed', 0, 'Fulfilled from Stock')
            `, [cut_stock_id, JSON.stringify(stockUsed), stockEmpId, 8]);
            createdIds.push(result.insertId);
        }

        // 8. DECREMENT LOGIC: Reduce quantity from previous stage jobs
        if (stage_id > 1 && parent_job_id) {
            
            // Fetch ONLY the specific parent job
            const [prevJobRows] = await connection.query(`
                SELECT id, sq, status
                FROM processing
                WHERE id = ?
                FOR UPDATE
            `, [parent_job_id]);

            if (prevJobRows.length > 0) {
                const prevJob = prevJobRows[0];
                let prevSq = {};
                try {
                    prevSq = typeof prevJob.sq === 'string' ? JSON.parse(prevJob.sq) : prevJob.sq;
                } catch(e) { prevSq = {}; }

                let modified = false;
                let remainingTotal = 0;

                Object.keys(prevSq).forEach(size => {
                    if (size === '_meta') return;
                    
                    const available = Number(prevSq[size] || 0);
                    const deducted = totalAssigned[size] || 0;
                    
                    if (available > 0 && deducted > 0) {
                        const actualDeduct = Math.min(available, deducted);
                        prevSq[size] = available - actualDeduct;
                        modified = true;
                    }
                    remainingTotal += Number(prevSq[size]);
                });

                if (modified) {
                    let newStatus = prevJob.status;
                    if (remainingTotal === 0) {
                         newStatus = 'processed';
                    }
                    
                    await connection.query(`
                        UPDATE processing
                        SET sq = ?, status = ?, updated_on = NOW()
                        WHERE id = ?
                    `, [JSON.stringify(prevSq), newStatus, prevJob.id]);
                }
            }
        } else if (stage_id === 1 && (assignments?.length > 0 || (stockUsed && Object.keys(stockUsed).length > 0))) {
             // 9. DECREMENT LOGIC FOR STAGE 1 (Cut Stock -> Limit)
             const [stockRows] = await connection.query('SELECT sq FROM cut_stock WHERE id = ? FOR UPDATE', [cut_stock_id]);
             if (stockRows.length > 0) {
                 let stockSq = {};
                 try {
                     stockSq = typeof stockRows[0].sq === 'string' ? JSON.parse(stockRows[0].sq) : stockRows[0].sq;
                 } catch (e) { stockSq = {}; }
                 
                 let modified = false;
                 
                 Object.keys(stockSq).forEach(size => {
                     if (size === '_meta') return;
                     const available = Number(stockSq[size] || 0);
                     const deducted = totalAssigned[size] || 0;
                     
                     if (available > 0 && deducted > 0) {
                         const actualDeduct = Math.min(available, deducted);
                         stockSq[size] = available - actualDeduct;
                         modified = true;
                     }
                 });
                 
                 if (modified) {
                     await connection.query('UPDATE cut_stock SET sq = ? WHERE id = ?', [JSON.stringify(stockSq), cut_stock_id]);
                 }
             }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: `Assignments created successfully`,
            processIds: createdIds
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};


exports.updateAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { emp_id, processing_rate } = req.body;

        const [result] = await db.query(`
            UPDATE processing
            SET emp_id = COALESCE(?, emp_id),
                processing_rate = COALESCE(?, processing_rate),
                updated_on = NOW()
            WHERE id = ?
        `, [emp_id, processing_rate, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.status(200).json({ success: true, message: 'Assignment updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.updateProgress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { completed_pieces, total_pieces } = req.body;

        let remarks = '';
        if (completed_pieces !== undefined && total_pieces !== undefined) {
             const percent = Math.round((Number(completed_pieces) / Number(total_pieces)) * 100);
             remarks = `Progress: ${percent}%`;
        } else {
             remarks = req.body.remarks || 'In Process';
        }

        const [result] = await db.query(`
            UPDATE processing
            SET status = 'in_process', remarks = ?, updated_on = NOW()
            WHERE id = ?
        `, [remarks, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.status(200).json({ success: true, message: 'Progress updated' });

    } catch (error) {
        next(error);
    }
};

exports.completeStage = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;

        const [jobs] = await connection.query('SELECT * FROM processing WHERE id = ?', [id]);
        if (jobs.length === 0) {
            throw new Error('Job not found');
        }
        const job = jobs[0];

        if (job.status === 'processed' && job.stage_id < 8) {
             if (Number(job.stage_id) !== 7) {
                 throw new Error('Stage already completed');
             }
        } else if (job.status === 'processed') {
             throw new Error('Stage already completed');
        }

        let updateQuery = "UPDATE processing SET status = 'processed', updated_on = NOW() WHERE id = ?";
        let queryParams = [id];

        if (Number(job.stage_id) === 7) {
            updateQuery = "UPDATE processing SET status = 'processed', stage_id = 8, updated_on = NOW() WHERE id = ?";
        }

        await connection.query(updateQuery, queryParams);

        let sqObj = job.sq;
        if (typeof sqObj === 'string') {
            try { sqObj = JSON.parse(sqObj); } catch (e) { sqObj = {}; }
        }

        let totalPieces = 0;
        for (const qty of Object.values(sqObj)) {
            totalPieces += Number(qty);
        }

        const amount = totalPieces * Number(job.processing_rate);

        const [balRow] = await connection.query(
            'SELECT balance FROM emp_account WHERE emp_id = ? ORDER BY datetime DESC LIMIT 1',
            [job.emp_id]
        );
        const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;
        const newBalance = currentBal + amount;

        await connection.query(`
            INSERT INTO emp_account
            (emp_id, transaction, amount, balance, mode, remarks)
            VALUES (?, 'DR', ?, ?, 'Kind', ?)
        `, [job.emp_id, amount, newBalance, `Stage ${job.stage_id} Completed`]);

        if (Number(job.stage_id) === 7) {
            const [dressRows] = await connection.query(`
                SELECT cp.org_dress_id, org.org_name
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                JOIN orders o ON cp.order_id = o.id
                JOIN organization org ON o.org_id = org.id
                WHERE cs.id = ?
            `, [job.cut_stock_id]);
            
            if (dressRows.length > 0) {
                const { org_dress_id: orgDressId, org_name } = dressRows[0];

                // ONLY insert into selling_stock if it's an internal production job
                // Client orders bypass finished stock and stay in the Order Pipeline
                if (org_name === 'INTERNAL STOCK PRODUCTION' || org_name === 'INTERNAL STOCK') {
                    const [prices] = await connection.query(
                        'SELECT size, price FROM price_list WHERE org_dress_id = ?',
                        [orgDressId]
                    );
                    const priceMap = {};
                    prices.forEach(p => priceMap[p.size] = p.price);

                    const stockInserts = [];
                    for (const [size, qty] of Object.entries(sqObj)) {
                        if (size === '_meta') continue;
                        const count = Number(qty);
                        const price = priceMap[size] || 0;
                        for (let i = 0; i < count; i++) {
                            stockInserts.push([orgDressId, null, size, price, 'Produced']);
                        }
                    }

                    if (stockInserts.length > 0) {
                        await connection.query(`
                            INSERT INTO selling_stock (org_dress_id, brand, size, price, remarks)
                            VALUES ?
                        `, [stockInserts]);
                    }

                    // Auto-close Internal Stock Job (Remove from board)
                    await connection.query('DELETE FROM processing WHERE id = ?', [id]);
                }
            }
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Stage completed successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteJob = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM processing WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.status(200).json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.updateAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { emp_id, processing_rate } = req.body;

        if (processing_rate === undefined && emp_id === undefined) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        let query = "UPDATE processing SET ";
        const params = [];
        const updates = [];

        if (processing_rate !== undefined) {
            updates.push("processing_rate = ?");
            params.push(processing_rate);
        }
        if (emp_id !== undefined) {
            updates.push("emp_id = ?");
            params.push(emp_id);
        }

        query += updates.join(", ") + " WHERE id = ?";
        params.push(id);

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.status(200).json({ success: true, message: 'Job assignment updated' });

    } catch (error) {
        next(error);
    }
};
