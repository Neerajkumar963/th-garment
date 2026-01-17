import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// =====================================================
// READY ITEMS MANAGEMENT ROUTES
// =====================================================

// GET /api/ready-items - List all ready items
router.get('/', async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT ri.*, 
             COALESCE(SUM(ris.quantity), 0) as total_stock
      FROM ready_items ri
      LEFT JOIN ready_item_stock ris ON ri.id = ris.ready_item_id 
        AND ris.deleted_at IS NULL
      WHERE ri.deleted_at IS NULL
      GROUP BY ri.id
      ORDER BY ri.created_at DESC
    `);
    
    res.json({
      success: true,
      data: items,
      total: items.length
    });
  } catch (error) {
    console.error('Error fetching ready items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch ready items', 
      message: error.message 
    });
  }
});

// GET /api/ready-items/:id - Get ready item with stock details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [items] = await db.query(
      'SELECT * FROM ready_items WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ready item not found' 
      });
    }
    
    const [stock] = await db.query(
      'SELECT * FROM ready_item_stock WHERE ready_item_id = ? AND deleted_at IS NULL ORDER BY size',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...items[0],
        stock
      }
    });
  } catch (error) {
    console.error('Error fetching ready item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch ready item', 
      message: error.message 
    });
  }
});

// POST /api/ready-items - Create new ready item
router.post('/', async (req, res) => {
  try {
    const { item_name, category, description } = req.body;
    
    // Validation
    if (!item_name || item_name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item name is required' 
      });
    }
    
    const [result] = await db.query(
      'INSERT INTO ready_items (item_name, category, description) VALUES (?, ?, ?)',
      [item_name.trim(), category, description]
    );
    
    const [newItem] = await db.query(
      'SELECT * FROM ready_items WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Ready item created successfully',
      data: newItem[0]
    });
  } catch (error) {
    console.error('Error creating ready item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create ready item', 
      message: error.message 
    });
  }
});

// PUT /api/ready-items/:id - Update ready item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, category, description } = req.body;
    
    const [existing] = await db.query(
      'SELECT * FROM ready_items WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ready item not found' 
      });
    }
    
    if (!item_name || item_name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Item name is required' 
      });
    }
    
    await db.query(
      'UPDATE ready_items SET item_name = ?, category = ?, description = ? WHERE id = ?',
      [item_name.trim(), category, description, id]
    );
    
    const [updated] = await db.query(
      'SELECT * FROM ready_items WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Ready item updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating ready item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update ready item', 
      message: error.message 
    });
  }
});

// POST /api/ready-items/:id/stock - Add stock for ready item
router.post('/:id/stock', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { sizes } = req.body;
    
    // Validation
    if (!sizes || sizes.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Size and quantity data required' 
      });
    }
    
    // Verify ready item exists
    const [item] = await connection.query(
      'SELECT * FROM ready_items WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (item.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Ready item not found' 
      });
    }
    
    // Add stock for each size
    for (const sizeData of sizes) {
      const { size, quantity } = sizeData;
      
      if (!size || !quantity || quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid size or quantity' 
        });
      }
      
      // Check if stock for this size already exists
      const [existing] = await connection.query(
        'SELECT * FROM ready_item_stock WHERE ready_item_id = ? AND size = ? AND deleted_at IS NULL',
        [id, size]
      );
      
      if (existing.length > 0) {
        // Update existing stock
        await connection.query(
          'UPDATE ready_item_stock SET quantity = quantity + ? WHERE id = ?',
          [quantity, existing[0].id]
        );
      } else {
        // Insert new stock entry
        await connection.query(
          'INSERT INTO ready_item_stock (ready_item_id, size, quantity) VALUES (?, ?, ?)',
          [id, size, quantity]
        );
      }
      
      // Also add to finished goods stock
      await connection.query(
        `INSERT INTO finished_goods_stock 
         (org_dress_name, design, size, quantity, source, source_id, status) 
         VALUES (?, 'Ready Item', ?, ?, 'ready_item', ?, 'available')`,
        [item[0].item_name, size, quantity, id]
      );
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Stock added successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding stock:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add stock', 
      message: error.message 
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/ready-items/:id - Soft delete ready item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db.query(
      'SELECT * FROM ready_items WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Ready item not found' 
      });
    }
    
    // Check if there's stock
    const [stock] = await db.query(
      'SELECT SUM(quantity) as total FROM ready_item_stock WHERE ready_item_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (stock[0].total > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete ready item with existing stock' 
      });
    }
    
    await db.query(
      'UPDATE ready_items SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Ready item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ready item:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete ready item', 
      message: error.message 
    });
  }
});

// GET /api/ready-items/stock/all - Get all ready item stock
router.get('/stock/all', async (req, res) => {
  try {
    const [stock] = await db.query(`
      SELECT ris.*, ri.item_name, ri.category
      FROM ready_item_stock ris
      JOIN ready_items ri ON ris.ready_item_id = ri.id
      WHERE ris.deleted_at IS NULL AND ri.deleted_at IS NULL
      AND ris.quantity > 0
      ORDER BY ri.item_name, ris.size
    `);
    
    res.json({
      success: true,
      data: stock,
      total: stock.length
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stock', 
      message: error.message 
    });
  }
});

export default router;
