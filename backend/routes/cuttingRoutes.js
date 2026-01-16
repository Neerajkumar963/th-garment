import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/cutting/queue - View cutting queue
router.get('/queue', async (req, res) => {
  try {
    const [queue] = await db.query(`
      SELECT 
        cc.id,
        cc.org_dress_name,
        cc.design,
        cc.size,
        cc.quantity,
        ct.name as cloth_type,
        cc.cloth_used,
        cc.status,
        cc.queued_date
      FROM cloth_cutting cc
      JOIN cloth_type ct ON cc.cloth_type_id = ct.id
      WHERE cc.status = 'queued' AND cc.deleted_at IS NULL
      ORDER BY cc.queued_date ASC
    `);
    
    res.json(queue);
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Failed to fetch cutting queue', message: error.message });
  }
});

// GET /api/cutting/history - View cutting history
router.get('/history', async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT 
        cc.id,
        cc.org_dress_name,
        cc.design,
        cc.size,
        cc.quantity,
        ct.name as cloth_type,
        cc.cloth_used,
        cc.status,
        cc.queued_date,
        cc.completed_date
      FROM cloth_cutting cc
      JOIN cloth_type ct ON cc.cloth_type_id = ct.id
      WHERE cc.deleted_at IS NULL
      ORDER BY COALESCE(cc.completed_date, cc.queued_date) DESC
      LIMIT 50
    `);
    
    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to fetch cutting history', message: error.message });
  }
});

// GET /api/cutting/recycle-bin - View deleted items
router.get('/recycle-bin', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT 
        cc.id,
        cc.org_dress_name,
        cc.design,
        cc.size,
        cc.quantity,
        ct.name as cloth_type,
        cc.cloth_used,
        cc.status,
        cc.queued_date,
        cc.deleted_at
      FROM cloth_cutting cc
      JOIN cloth_type ct ON cc.cloth_type_id = ct.id
      WHERE cc.deleted_at IS NOT NULL
      ORDER BY cc.deleted_at DESC
    `);
    
    res.json(items);
  } catch (error) {
    console.error('Get recycle bin error:', error);
    res.status(500).json({ error: 'Failed to fetch recycle bin', message: error.message });
  }
});

// GET /api/cutting/cloth-types - Get available cloth types
router.get('/cloth-types', async (req, res) => {
  try {
    const [clothTypes] = await db.query(`
      SELECT 
        ct.id,
        ct.name,
        ct.description,
        COALESCE(cs.quantity, 0) as available_quantity,
        cs.unit
      FROM cloth_type ct
      LEFT JOIN cloth_stock cs ON ct.id = cs.cloth_type_id
      ORDER BY ct.name
    `);
    
    res.json(clothTypes);
  } catch (error) {
    console.error('Get cloth types error:', error);
    res.status(500).json({ error: 'Failed to fetch cloth types', message: error.message });
  }
});

// POST /api/cutting/queue - Add item to cutting queue
router.post('/queue', async (req, res) => {
  const { org_dress_name, design, size, quantity, cloth_type_id, cloth_used } = req.body;
  
  // Validation
  if (!org_dress_name || !design || !size || !quantity || !cloth_type_id || !cloth_used) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (quantity <= 0 || cloth_used <= 0) {
    return res.status(400).json({ error: 'Quantity and cloth used must be greater than 0' });
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Check if enough cloth stock is available
    const [stockCheck] = await connection.query(
      'SELECT quantity FROM cloth_stock WHERE cloth_type_id = ?',
      [cloth_type_id]
    );
    
    if (stockCheck.length === 0) {
      throw new Error('Cloth type not found in stock');
    }
    
    if (stockCheck[0].quantity < cloth_used) {
      throw new Error(`Insufficient cloth stock. Available: ${stockCheck[0].quantity} meters`);
    }
    
    // Deduct cloth from stock immediately when adding to queue
    await connection.query(
      'UPDATE cloth_stock SET quantity = quantity - ? WHERE cloth_type_id = ?',
      [cloth_used, cloth_type_id]
    );
    
    // Insert into cutting queue
    const [result] = await connection.query(
      `INSERT INTO cloth_cutting 
       (org_dress_name, design, size, quantity, cloth_type_id, cloth_used, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'queued')`,
      [org_dress_name, design, size, quantity, cloth_type_id, cloth_used]
    );
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Item added to cutting queue successfully',
      id: result.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Add to queue error:', error);
    res.status(500).json({ error: 'Failed to add to cutting queue', message: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/cutting/complete/:id - Complete cutting process
router.put('/complete/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get cutting details
    const [cuttingData] = await connection.query(
      'SELECT * FROM cloth_cutting WHERE id = ? AND status = "queued"',
      [id]
    );
    
    if (cuttingData.length === 0) {
      throw new Error('Cutting item not found or already completed');
    }
    
    const cutting = cuttingData[0];
    
    // 1. Mark cutting as completed
    await connection.query(
      'UPDATE cloth_cutting SET status = "completed", completed_date = NOW() WHERE id = ?',
      [id]
    );
    
    // 2. Create entry in cut_stock
    await connection.query(
      `INSERT INTO cut_stock 
       (cutting_id, org_dress_name, design, size, quantity, status) 
       VALUES (?, ?, ?, ?, ?, 'available')`,
      [id, cutting.org_dress_name, cutting.design, cutting.size, cutting.quantity]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Cutting completed successfully. Cut stock created.',
      cutting_id: id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Complete cutting error:', error);
    res.status(500).json({ error: 'Failed to complete cutting', message: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/cutting/queue/:id - Remove item from queue (Soft Delete)
router.delete('/queue/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get cutting details before deleting
    const [cuttingData] = await connection.query(
      'SELECT * FROM cloth_cutting WHERE id = ? AND status = "queued" AND deleted_at IS NULL',
      [id]
    );
    
    if (cuttingData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Queue item not found or already completed' });
    }
    
    const cutting = cuttingData[0];
    
    // Return cloth to stock since item is being deleted
    await connection.query(
      'UPDATE cloth_stock SET quantity = quantity + ? WHERE cloth_type_id = ?',
      [cutting.cloth_used, cutting.cloth_type_id]
    );
    
    // Soft delete the item
    await connection.query(
      'UPDATE cloth_cutting SET deleted_at = NOW() WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    res.json({ message: 'Item moved to recycle bin' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete queue item error:', error);
    res.status(500).json({ error: 'Failed to delete queue item', message: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/cutting/restore/:id - Restore deleted item
router.put('/restore/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get cutting details
    const [cuttingData] = await connection.query(
      'SELECT * FROM cloth_cutting WHERE id = ? AND deleted_at IS NOT NULL',
      [id]
    );
    
    if (cuttingData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item not found in recycle bin' });
    }
    
    const cutting = cuttingData[0];
    
    // Check if enough cloth stock is available for restoration
    const [stockCheck] = await connection.query(
      'SELECT quantity FROM cloth_stock WHERE cloth_type_id = ?',
      [cutting.cloth_type_id]
    );
    
    if (stockCheck.length === 0 || stockCheck[0].quantity < cutting.cloth_used) {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Insufficient cloth stock to restore. Available: ${stockCheck[0]?.quantity || 0} meters, Required: ${cutting.cloth_used} meters` 
      });
    }
    
    // Deduct cloth from stock again
    await connection.query(
      'UPDATE cloth_stock SET quantity = quantity - ? WHERE cloth_type_id = ?',
      [cutting.cloth_used, cutting.cloth_type_id]
    );
    
    // Restore the item
    await connection.query(
      'UPDATE cloth_cutting SET deleted_at = NULL WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Restore item error:', error);
    res.status(500).json({ error: 'Failed to restore item', message: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/cutting/permanent/:id - Permanently delete item
router.delete('/permanent/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Note: Permanent delete does NOT return cloth to stock
    // Cloth was already returned when item was soft deleted
    const [result] = await db.query(
      'DELETE FROM cloth_cutting WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete item', message: error.message });
  }
});

export default router;
