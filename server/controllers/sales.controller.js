const db = require('../config/database');

// --- GETTERS ---

exports.getFinishedStock = async (req, res, next) => {
    try {
        // Group individual stock items by dress and size to show available quantities
        const [stock] = await db.query(`
            SELECT 
                ss.org_dress_id,
                ss.size,
                ss.price,
                ss.brand,
                ss.remarks,
                COUNT(ss.id) as available_qty,
                od.org_dress_name,
                org.org_name
            FROM selling_stock ss
            JOIN org_dress od ON ss.org_dress_id = od.id
            JOIN organization org ON od.org_id = org.id
            GROUP BY ss.org_dress_id, ss.size, ss.price, ss.brand, ss.remarks
            ORDER BY ss.created_on DESC
        `);

        res.status(200).json({
            success: true,
            stock
        });

    } catch (error) {
        next(error);
    }
};

exports.getSalesHistory = async (req, res, next) => {
    try {
        const [history] = await db.query(`
            SELECT 
                sh.*,
                COUNT(sd.id) as item_count
            FROM sales_history sh
            LEFT JOIN sales_detail sd ON sh.id = sd.sales_history_id
            GROUP BY sh.id
            ORDER BY sh.created_on DESC
            LIMIT 50
        `);

        res.status(200).json({
            success: true,
            history
        });

    } catch (error) {
        next(error);
    }
};

exports.getSaleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT id, barcode_id, organization as org_name, branch, supply_type, total, created_on FROM sales_history WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        const sale = rows[0];

        const [details] = await db.query(`
            SELECT 
                sd.id,
                sd.sales_history_id,
                sd.org_dress_id,
                sd.size,
                sd.quantity as qty,
                sd.price,
                od.org_dress_name
            FROM sales_detail sd
            JOIN org_dress od ON sd.org_dress_id = od.id
            WHERE sd.sales_history_id = ?
        `, [id]);

        res.status(200).json({
            success: true,
            sale: { ...sale, items: details }
        });

    } catch (error) {
        next(error);
    }
};

// --- ACTIONS ---

exports.createSale = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { 
            org_id, 
            branch, 
            supply_type, // 'inward', 'outward'
            items // [{ org_dress_id, size, quantity, price }]
        } = req.body;

        if (!items || items.length === 0) {
            throw new Error('No items in sale');
        }

        // 1. Calculate Total
        let total = 0;
        for (const item of items) {
            total += (Number(item.quantity) * Number(item.price));
        }

        // 2. Insert Sales History
        // Schema: barcode_id, organization, branch, supply_type, total
        // Note: 'organization' column in sales_history is VARCHAR(255), not INT FK.
        // We initially query org name to store it? Or store ID as string?
        // Prompt says "organization" in schema, but `org_id` in request.
        // Let's resolve org name.
        
        const [orgRows] = await connection.query('SELECT org_name FROM organization WHERE id = ?', [org_id]);
        if (orgRows.length === 0) throw new Error('Organization not found');
        const orgName = orgRows[0].org_name;

        const [historyRes] = await connection.query(`
            INSERT INTO sales_history
            (organization, branch, supply_type, total)
            VALUES (?, ?, ?, ?)
        `, [orgName, branch, supply_type || 'outward', total]);

        const salesHistoryId = historyRes.insertId;

        // 3. Process Items
        for (const item of items) {
            const { org_dress_id, size, quantity, price } = item;
            
            // Insert Detail
            await connection.query(`
                INSERT INTO sales_detail
                (sales_history_id, org_dress_id, size, quantity, price)
                VALUES (?, ?, ?, ?, ?)
            `, [salesHistoryId, org_dress_id, size, quantity, price]);

            // Reduce Stock (DELETE LIMIT rows)
            // Need to delete `quantity` number of rows matching dress_id and size
            // MySQL DELETE with LIMIT works
            
            const [delRes] = await connection.query(`
                DELETE FROM selling_stock 
                WHERE org_dress_id = ? AND TRIM(UPPER(size)) = TRIM(UPPER(?))
                ORDER BY created_on ASC
                LIMIT ?
            `, [org_dress_id, size, Number(quantity)]);

            if (delRes.affectedRows === 0 && Number(quantity) > 0) {
                 throw new Error(`Execution stopped: No stock found matching SKU#${org_dress_id} Size:${size}. Please refresh inventory.`);
            }

            if (delRes.affectedRows < Number(quantity)) {
                throw new Error(`Insufficient stock for SKU#${org_dress_id} Size ${size}. Requested: ${quantity}, but only ${delRes.affectedRows} were successfully removed.`);
            }
        }

        // 4. Update Org Account
        // Sale ('outward' supply usually) -> Org owes us money (Debit their account)
        // If 'supply_type' is inward (return?), it would be Credit. default outward.
        
        let transactionType = 'DR';
        if (supply_type === 'inward') transactionType = 'CR'; 

        // Get current balance
        const [balRow] = await connection.query(
            'SELECT balance FROM org_account WHERE org_id = ? ORDER BY datetime DESC LIMIT 1',
            [org_id]
        );
        const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;
        
        // Debit (They owe us more) -> Balance Increases
        // Credit (Return) -> Balance Decreases
        let newBalance = currentBal;
        if (transactionType === 'DR') {
            newBalance += total;
        } else {
            newBalance -= total;
        }

        await connection.query(`
            INSERT INTO org_account
            (org_id, transaction, amount, balance, mode, remarks)
            VALUES (?, ?, ?, ?, 'Supply', ?)
        `, [org_id, transactionType, total, newBalance, `Sale #${salesHistoryId}`]);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Sale created successfully',
            saleId: salesHistoryId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.getStockHistory = async (req, res, next) => {
    try {
        const { org_dress_id } = req.params;
        const { size } = req.query;

        // 0. Fetch Product Metadata
        const [metaRows] = await db.query(`
            SELECT 
                od.org_dress_name,
                org.org_name,
                i.name as item_name,
                i.item_type,
                c.color_name
            FROM org_dress od
            JOIN organization org ON od.org_id = org.id
            JOIN items i ON od.item_id = i.id
            JOIN colors c ON od.color_id = c.id
            WHERE od.id = ?
        `, [org_dress_id]);

        if (metaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const productMetadata = metaRows[0];

        // 1. Find Completed Batches (Cut Stock IDs)
        // We filter by size if provided in query params
        let batchQuery = `
            SELECT DISTINCT
                cs.id as cut_stock_id,
                cs.created_on as batch_date,
                cs.sq as cut_sq,
                cs.cutting_process_id,
                p.updated_on as finished_date
            FROM processing p
            JOIN cut_stock cs ON p.cut_stock_id = cs.id
            JOIN cutting_process cp ON cs.cutting_process_id = cp.id
            WHERE cp.org_dress_id = ? 
              AND p.stage_id = 8 
              AND p.status = 'processed'
        `;
        const queryParams = [org_dress_id];

        if (size) {
            // Check if size exists in the cut_stock sq JSON
            batchQuery += ` AND JSON_EXTRACT(cs.sq, ?) > 0`;
            queryParams.push(`$."${size}"`);
        }

        batchQuery += ` ORDER BY p.updated_on DESC LIMIT 20`;

        const [batches] = await db.query(batchQuery, queryParams);

        const history = [];

        for (const batch of batches) {
            // 2. Fetch Fabric Info
            const [fabrics] = await db.query(`
                SELECT 
                    ct.type, 
                    c.color_name, 
                    d.design_name,
                    q.quality_name,
                    (cq.roll_length - cd.bal_cloth) as used_qty
                FROM cutting_details cd
                JOIN cloth_quantity cq ON cd.cloth_quantity_id = cq.id
                JOIN cloth_detail cdt ON cq.cloth_detail_id = cdt.id
                JOIN cloth_type ct ON cdt.cloth_type_id = ct.id
                JOIN colors c ON cdt.color_id = c.id
                JOIN design d ON cdt.design_id = d.id
                JOIN quality q ON cdt.quality_id = q.id
                WHERE cd.cutting_process_id = ?
            `, [batch.cutting_process_id]);

            // 3. Fetch Cutting Details (Cutter Name)
            const [cuttingInfo] = await db.query(`
                SELECT 
                    emp.name as cutter_name,
                    cp.created_on as cutting_date
                FROM cutting_process cp
                JOIN emp_details emp ON cp.emp_id = emp.id
                WHERE cp.id = ?
            `, [batch.cutting_process_id]);

            // 4. Fetch Processing History
            const [stages] = await db.query(`
                SELECT 
                    p.stage_id,
                    ps.stage_name,
                    emp.name as worker_name,
                    er.role as worker_role,
                    p.sq,
                    p.updated_on,
                    p.status,
                    p.remarks
                FROM processing p
                JOIN emp_details emp ON p.emp_id = emp.id
                JOIN emp_roles er ON emp.role_id = er.id
                JOIN process_stage ps ON p.stage_id = ps.id
                WHERE p.cut_stock_id = ?
                ORDER BY p.stage_id ASC, p.updated_on ASC
            `, [batch.cut_stock_id]);

            history.push({
                batch_id: batch.cut_stock_id,
                finished_date: batch.finished_date,
                fabrics,
                cutting: cuttingInfo[0] || null,
                stages
            });
        }

        res.status(200).json({ 
            success: true, 
            metadata: productMetadata,
            history 
        });

    } catch (error) {
        next(error);
    }
};
