import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/orders - Get all orders
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
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE status = ?';
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

// GET /api/orders/:id - Get order details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get order
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order details
    const [details] = await db.query(
      'SELECT * FROM order_details WHERE order_id = ?',
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
    
    // Calculate total quantity
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
      'UPDATE orders SET status = ?, delivery_date = ? WHERE id = ?',
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

// DELETE /api/orders/:id - Delete order
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.query(
      'DELETE FROM orders WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order', message: error.message });
  }
});

export default router;
