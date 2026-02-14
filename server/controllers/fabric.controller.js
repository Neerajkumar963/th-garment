const db = require('../config/database');

exports.getAllFabrics = async (req, res, next) => {
    try {
        const [fabrics] = await db.query(`
            SELECT 
                cd.id,
                CAST(cd.total_quantity AS SIGNED) as total_quantity,
                cd.created_on,
                cd.updated_on,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name,
                (SELECT COUNT(*) FROM cloth_quantity WHERE cloth_detail_id = cd.id) as roll_count
            FROM cloth_detail cd
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN colors c ON cd.color_id = c.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            ORDER BY cd.updated_on DESC
        `);

        // Compute status
        const fabricsWithStatus = fabrics.map(f => {
            let status = 'out';
            if (f.total_quantity >= 100) status = 'in';
            else if (f.total_quantity > 0) status = 'low';
            
            return { ...f, status };
        });

        res.status(200).json({
            success: true,
            fabrics: fabricsWithStatus
        });
    } catch (error) {
        next(error);
    }
};

exports.getFabricById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [fabric] = await db.query(`
            SELECT 
                cd.*,
                ct.type as cloth_type,
                c.color_name,
                d.design_name,
                q.quality_name
            FROM cloth_detail cd
            JOIN cloth_type ct ON cd.cloth_type_id = ct.id
            JOIN colors c ON cd.color_id = c.id
            JOIN design d ON cd.design_id = d.id
            JOIN quality q ON cd.quality_id = q.id
            WHERE cd.id = ?
        `, [id]);

        if (fabric.length === 0) {
            return res.status(404).json({ success: false, message: 'Fabric not found' });
        }

        const [rolls] = await db.query(`
            SELECT * FROM cloth_quantity 
            WHERE cloth_detail_id = ? 
            ORDER BY created_on DESC
        `, [id]);

        res.status(200).json({
            success: true,
            fabric: fabric[0],
            rolls
        });
    } catch (error) {
        next(error);
    }
};

// Helper to find or insert normalized attributes
async function findOrInsert(table, column, value, connection) {
    const [rows] = await connection.query(`SELECT id FROM ${table} WHERE ${column} = ?`, [value]);
    if (rows.length > 0) return rows[0].id;
    
    const [result] = await connection.query(`INSERT INTO ${table} (${column}) VALUES (?)`, [value]);
    return result.insertId;
}

exports.createFabric = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { clothType, colorName, designName, qualityName, rolls } = req.body;

        // Validation
        if (!clothType || !colorName || !designName || !qualityName || !rolls || !Array.isArray(rolls)) {
            throw new Error('Missing required fields or invalid rolls array');
        }

        // Get IDs
        const clothTypeId = await findOrInsert('cloth_type', 'type', clothType, connection);
        const colorId = await findOrInsert('colors', 'color_name', colorName, connection); // Note: Colors table structure has applicability, defaulting null is fine
        const designId = await findOrInsert('design', 'design_name', designName, connection);
        const qualityId = await findOrInsert('quality', 'quality_name', qualityName, connection);

        // Check for existing fabric with same specs
        const [existing] = await connection.query(`
            SELECT id FROM cloth_detail 
            WHERE cloth_type_id = ? AND color_id = ? AND design_id = ? AND quality_id = ?
        `, [clothTypeId, colorId, designId, qualityId]);

        let clothDetailId;
        const integerRolls = rolls.map(r => Math.round(Number(r)));

        if (existing.length > 0) {
            clothDetailId = existing[0].id;
            // Add new rolls to existing fabric
            const rollValues = integerRolls.map(r => [clothDetailId, r]);
            await connection.query(`
                INSERT INTO cloth_quantity (cloth_detail_id, roll_length)
                VALUES ?
            `, [rollValues]);

            // Recalculate total quantity for existing
            const [sumRow] = await connection.query(
                'SELECT SUM(roll_length) as total FROM cloth_quantity WHERE cloth_detail_id = ?',
                [clothDetailId]
            );
            await connection.query(
                'UPDATE cloth_detail SET total_quantity = ? WHERE id = ?',
                [sumRow[0].total || 0, clothDetailId]
            );
        } else {
            // Calculate Total
            const totalQuantity = integerRolls.reduce((a, b) => a + b, 0);

            // Insert Cloth Detail
            const [cdResult] = await connection.query(`
                INSERT INTO cloth_detail 
                (cloth_type_id, color_id, design_id, quality_id, total_quantity)
                VALUES (?, ?, ?, ?, ?)
            `, [clothTypeId, colorId, designId, qualityId, totalQuantity]);

            clothDetailId = cdResult.insertId;

            // Insert Rolls
            if (integerRolls.length > 0) {
                const rollValues = integerRolls.map(r => [clothDetailId, r]);
                await connection.query(`
                    INSERT INTO cloth_quantity (cloth_detail_id, roll_length)
                    VALUES ?
                `, [rollValues]);
            }
        }

        await connection.commit();

        res.status(existing.length > 0 ? 200 : 201).json({
            success: true,
            message: existing.length > 0 ? 'New rolls added to existing fabric entry' : 'Fabric added successfully',
            fabricId: clothDetailId
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.updateFabric = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { clothType, colorName, designName, qualityName, rolls } = req.body;

        const clothTypeId = await findOrInsert('cloth_type', 'type', clothType, connection);
        const colorId = await findOrInsert('colors', 'color_name', colorName, connection);
        const designId = await findOrInsert('design', 'design_name', designName, connection);
        const qualityId = await findOrInsert('quality', 'quality_name', qualityName, connection);

        const fabricId = parseInt(id);

        // 1. Update metadata
        await connection.query(`
            UPDATE cloth_detail 
            SET cloth_type_id = ?, color_id = ?, design_id = ?, quality_id = ?
            WHERE id = ?
        `, [clothTypeId, colorId, designId, qualityId, fabricId]);

        // 2. Update Rolls if provided
        if (rolls && Array.isArray(rolls)) {
            // Delete existing rolls
            try {
                await connection.query('DELETE FROM cloth_quantity WHERE cloth_detail_id = ?', [fabricId]);
            } catch (delError) {
                // If deletion fails (e.g. used in cutting), we skip roll update but keep metadata changes
                console.warn(`Could not update rolls for fabric ${fabricId}: ${delError.message}`);
                throw new Error("Cannot update rolls: Some rolls are already being used in production.");
            }

            // Insert new rolls
            if (rolls.length > 0) {
                const integerRolls = rolls.map(r => Math.round(Number(r)));
                const rollValues = integerRolls.map(r => [fabricId, r]);
                await connection.query(`
                    INSERT INTO cloth_quantity (cloth_detail_id, roll_length)
                    VALUES ?
                `, [rollValues]);

                // Recalculate total quantity
                const totalQuantity = integerRolls.reduce((a, b) => a + b, 0);
                await connection.query(`
                    UPDATE cloth_detail SET total_quantity = ? WHERE id = ?
                `, [totalQuantity, fabricId]);
            } else {
                await connection.query(`
                    UPDATE cloth_detail SET total_quantity = 0 WHERE id = ?
                `, [fabricId]);
            }
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Fabric updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.deleteFabric = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // cloth_quantity deletes cascade via FOREIGN KEY config
        const [result] = await db.query('DELETE FROM cloth_detail WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Fabric not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Fabric deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

exports.addRolls = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { rolls } = req.body; // Array of numbers

        if (!rolls || !Array.isArray(rolls) || rolls.length === 0) {
            throw new Error('Invalid rolls data');
        }

        // 1. Insert Rolls
        const integerRolls = rolls.map(r => Math.round(Number(r)));
        const rollValues = integerRolls.map(r => [id, r]);
        await connection.query(`
            INSERT INTO cloth_quantity (cloth_detail_id, roll_length)
            VALUES ?
        `, [rollValues]);

        // 2. Recalculate Total
        const [sumResult] = await connection.query(`
            SELECT SUM(roll_length) as total 
            FROM cloth_quantity 
            WHERE cloth_detail_id = ?
        `, [id]);
        
        const newTotal = Math.round(Number(sumResult[0].total || 0));

        // 3. Update Cloth Detail
        await connection.query(`
            UPDATE cloth_detail 
            SET total_quantity = ? 
            WHERE id = ?
        `, [newTotal, id]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Rolls added successfully',
            newTotal
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.getClothTypes = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM cloth_type ORDER BY type ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getColors = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM colors ORDER BY color_name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getDesigns = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM design ORDER BY design_name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.getQualities = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM quality ORDER BY quality_name ASC');
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

