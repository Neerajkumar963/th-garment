const db = require('../config/database');

// --- CLIENTS / ORGANIZATIONS ---

exports.getAllClients = async (req, res, next) => {
    try {
        const [clients] = await db.query(`
            SELECT 
                o.*,
                COALESCE(
                    (SELECT balance FROM org_account 
                     WHERE org_id = o.id 
                     ORDER BY datetime DESC LIMIT 1),
                    0
                ) as current_balance
            FROM organization o
            ORDER BY o.org_name ASC
        `);

        res.status(200).json({
            success: true,
            clients
        });
    } catch (error) {
        next(error);
    }
};

exports.getClientById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [orgs] = await db.query('SELECT * FROM organization WHERE id = ?', [id]);
        
        if (orgs.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        const [balanceRow] = await db.query(`
            SELECT balance FROM org_account 
            WHERE org_id = ? 
            ORDER BY datetime DESC LIMIT 1
        `, [id]);

        const currentBalance = balanceRow.length > 0 ? balanceRow[0].balance : 0;

        res.status(200).json({
            success: true,
            client: { ...orgs[0], current_balance: currentBalance }
        });

    } catch (error) {
        next(error);
    }
};

exports.createClient = async (req, res, next) => {
    try {
        const { name, org_name, phone, email, gstin, adhaar, branch, org_type } = req.body;

        const [result] = await db.query(`
            INSERT INTO organization 
            (name, org_name, phone, email, gstin, adhaar, branch, org_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, org_name, phone, email, gstin, adhaar, branch, org_type]);

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            clientId: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

exports.updateClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, org_name, phone, email, gstin, adhaar, branch, org_type } = req.body;

        const [result] = await db.query(`
            UPDATE organization 
            SET name=?, org_name=?, phone=?, email=?, gstin=?, adhaar=?, branch=?, org_type=?
            WHERE id=?
        `, [name, org_name, phone, email, gstin, adhaar, branch, org_type, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Client updated successfully'
        });

    } catch (error) {
        next(error);
    }
};

exports.deleteClient = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM organization WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Client deleted successfully'
        });

    } catch (error) {
        next(error);
    }
};

exports.getAllProducts = async (req, res, next) => {
    try {
        const [products] = await db.query(`
            SELECT 
                od.*,
                org.org_name,
                i.name as item_name,
                c.color_name
            FROM org_dress od
            JOIN organization org ON od.org_id = org.id
            JOIN items i ON od.item_id = i.id
            JOIN colors c ON od.color_id = c.id
            ORDER BY od.org_dress_name ASC
        `);

        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        next(error);
    }
};

// --- PRODUCTS ---

exports.getClientProducts = async (req, res, next) => {
    try {
        const { id } = req.params; // org_id

        const [products] = await db.query(`
            SELECT 
                od.*,
                i.name as item_name,
                c.color_name
            FROM org_dress od
            JOIN items i ON od.item_id = i.id
            JOIN colors c ON od.color_id = c.id
            WHERE od.org_id = ?
        `, [id]);

        // Attach prices for each product
        // Using Promise.all to fetch prices in parallel for each product
        const productsWithPrices = await Promise.all(products.map(async (prod) => {
            const [prices] = await db.query(`
                SELECT * FROM price_list 
                WHERE org_dress_id = ? 
                ORDER BY size
            `, [prod.id]);
            return { ...prod, prices };
        }));

        res.status(200).json({
            success: true,
            products: productsWithPrices
        });

    } catch (error) {
        next(error);
    }
};

exports.createClientProduct = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // org_id
        const { 
            org_dress_name, 
            item_id, 
            color_id, 
            material_req, 
            processing_rate, 
            prices 
        } = req.body;

        // 1. Insert Org Dress
        const [dressResult] = await connection.query(`
            INSERT INTO org_dress 
            (org_dress_name, org_id, item_id, color_id, material_req, processing_rate)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [org_dress_name, id, item_id, color_id, material_req, processing_rate]);

        const orgDressId = dressResult.insertId;

        // 2. Insert Price List
        if (prices && Array.isArray(prices) && prices.length > 0) {
            const priceValues = prices.map(p => [orgDressId, p.size, p.price]);
            await connection.query(`
                INSERT INTO price_list (org_dress_id, size, price)
                VALUES ?
            `, [priceValues]);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            productId: orgDressId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateClientProduct = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { productId } = req.params;
        const { 
            org_dress_name, 
            material_req, 
            processing_rate, 
            prices 
        } = req.body;

        // 1. Update Org Dress
        await connection.query(`
            UPDATE org_dress 
            SET org_dress_name = ?, material_req = ?, processing_rate = ?
            WHERE id = ?
        `, [org_dress_name, material_req, processing_rate, productId]);

        // 2. Update Price List (Delete and re-insert for simplicity)
        if (prices && Array.isArray(prices) && prices.length > 0) {
            await connection.query('DELETE FROM price_list WHERE org_dress_id = ?', [productId]);
            
            const priceValues = prices.map(p => [productId, p.size, p.price]);
            await connection.query(`
                INSERT INTO price_list (org_dress_id, size, price)
                VALUES ?
            `, [priceValues]);
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

// --- ACCOUNTS ---

exports.getClientAccount = async (req, res, next) => {
    try {
        const { id } = req.params; // org_id

        const [ledger] = await db.query(`
            SELECT * FROM org_account
            WHERE org_id = ?
            ORDER BY datetime DESC
            LIMIT 50
        `, [id]);

        res.status(200).json({
            success: true,
            ledger
        });

    } catch (error) {
        next(error);
    }
};

exports.getClientBalance = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT balance FROM org_account
            WHERE org_id = ?
            ORDER BY datetime DESC
            LIMIT 1
        `, [id]);

        const balance = rows.length > 0 ? rows[0].balance : 0;

        res.status(200).json({
            success: true,
            balance
        });

    } catch (error) {
        next(error);
    }
};
