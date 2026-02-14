const db = require('../config/database');

exports.getAllItems = async (req, res, next) => {
    try {
        const [items] = await db.query('SELECT * FROM items ORDER BY name ASC');
        res.status(200).json({
            success: true,
            items
        });
    } catch (error) {
        next(error);
    }
};

exports.createItem = async (req, res, next) => {
    try {
        const { name, symbol, item_type, gender } = req.body;

        if (!name || !symbol || !item_type || !gender) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (symbol.length > 5) {
            return res.status(400).json({ success: false, message: 'Symbol must be max 5 chars' });
        }

        // Check uniqueness
        const [existing] = await db.query('SELECT id FROM items WHERE symbol = ?', [symbol]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Symbol already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO items (name, symbol, item_type, gender) VALUES (?, ?, ?, ?)',
            [name, symbol, item_type, gender]
        );

        res.status(201).json({
            success: true,
            message: 'Item created successfully',
            itemId: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

exports.updateItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, symbol, item_type, gender } = req.body;

        // Note: For strict symbol uniqueness on update, we should also check if new symbol exists for OTHER id
        // But following request rules strictly for now:
        await db.query(
            'UPDATE items SET name=?, symbol=?, item_type=?, gender=? WHERE id=?',
            [name, symbol, item_type, gender, id]
        );

        res.status(200).json({
            success: true,
            message: 'Item updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM items WHERE id=?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
