import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/orders - Get all orders (excluding deleted)
router.get('/', async (req, res) => {
  const { status } = req.query;
  
  try {
    let query = `
      SELECT 
        id,
        customer_name,
        customer_phone,
        customer_address,
        status,
        total_quantity,
        remarks,
        order_date,
        delivery_date
      FROM orders
      WHERE deleted_at IS NULL
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY order_date DESC';
    
    const [orders] = await db.query(query, params);
    
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders', message: error.message });
  }
});

// GET /api/orders/recycle-bin - Get deleted orders
router.get('/recycle-bin/list', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT 
        id,
        customer_name,
        customer_phone,
        customer_address,
        status,
        total_quantity,
        remarks,
        order_date,
        delivery_date,
        deleted_at
      FROM orders
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `);
    
    res.json(orders);
  } catch (error) {
    console.error('Get recycle bin error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted orders', message: error.message });
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get order
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order details
    const [details] = await db.query(
      'SELECT * FROM order_details WHERE order_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    res.json({
      ...orders[0],
      items: details
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to fetch order details', message: error.message });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  const { customer_name, customer_phone, customer_address, remarks, items } = req.body;
  
  // Validation
  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ error: 'customer_name and items are required' });
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    //Calculate total quantity
    const total_quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Insert order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
       (customer_name, customer_phone, customer_address, total_quantity, remarks, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [customer_name, customer_phone || null, customer_address || null, total_quantity, remarks || null]
    );
    
    const orderId = orderResult.insertId;
    
    // Insert order details
    for (const item of items) {
      if (!item.org_dress_name || !item.design || !item.size || !item.quantity) {
        throw new Error('Each item must have org_dress_name, design, size, and quantity');
      }
      
      await connection.query(
        `INSERT INTO order_details 
         (order_id, org_dress_name, design, size, quantity, selling_stock_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.org_dress_name, item.design, item.size, item.quantity, item.selling_stock_id || null]
      );
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Order created successfully',
      order_id: orderId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'in-process', 'ready', 'delivered'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status', 
      valid_statuses: validStatuses 
    });
  }
  
  try {
    const [result] = await db.query(
      'UPDATE orders SET status = ?, delivery_date = ? WHERE id = ? AND deleted_at IS NULL',
      [status, status === 'delivered' ? new Date() : null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ 
      message: 'Order status updated successfully',
      new_status: status
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status', message: error.message });
  }
});

// PUT /api/orders/restore/:id - Restore deleted order
router.put('/restore/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Restore order
    const [result] = await connection.query(
      'UPDATE orders SET deleted_at = NULL WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found in recycle bin' });
    }
    
    // Restore order details
    await connection.query(
      'UPDATE order_details SET deleted_at = NULL WHERE order_id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ message: 'Order restored successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Restore order error:', error);
    res.status(500).json({ error: 'Failed to restore order', message: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/orders/:id - Soft delete order
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Soft delete order
    const [result] = await connection.query(
      'UPDATE orders SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Soft delete order details
    await connection.query(
      'UPDATE order_details SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    await connection.commit();
    
    res.json({ message: 'Order moved to recycle bin' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order', message: error.message });
  } finally {
    connection.release();
  }
});

// DELETE /api/orders/permanent/:id - Permanently delete order
router.delete('/permanent/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Delete order details first (foreign key)
    await connection.query(
      'DELETE FROM order_details WHERE order_id = ?',
      [id]
    );
    
    // Delete order
    const [result] = await connection.query(
      'DELETE FROM orders WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }
    
    await connection.commit();
    
    res.json({ message: 'Order permanently deleted' });
  } catch (error) {
    await connection.rollback();
    console.error('Permanent delete order error:', error);
    res.status(500).json({ error: 'Failed to permanently delete order', message: error.message });
  } finally {
    connection.release();
  }
});

export default router;
