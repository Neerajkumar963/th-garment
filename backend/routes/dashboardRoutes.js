import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/dashboard/summary - Get dashboard summary statistics
router.get('/summary', async (req, res) => {
  try {
    // Get total stocks
    const [clothStockResult] = await db.query(
      'SELECT SUM(quantity) as total FROM cloth_stock'
    );
    
    const [cutStockResult] = await db.query(
      'SELECT COUNT(*) as total FROM cut_stock'
    );
    
    const [sellingStockResult] = await db.query(
      'SELECT COUNT(*) as total FROM selling_stock WHERE status = "available"'
    );
    
    // Get processing items count
    const [processingResult] = await db.query(
      'SELECT COUNT(*) as total FROM processing WHERE is_completed = FALSE'
    );
    
    // Get delivered items count
    const [deliveredResult] = await db.query(
      'SELECT COUNT(*) as total FROM processing WHERE is_completed = TRUE'
    );
    
    // Get orders by status
    const [pendingOrders] = await db.query(
      'SELECT COUNT(*) as total FROM orders WHERE status = "pending"'
    );
    
    const [inProcessOrders] = await db.query(
      'SELECT COUNT(*) as total FROM orders WHERE status = "in-process"'
    );
    
    const [deliveredOrders] = await db.query(
      'SELECT COUNT(*) as total FROM orders WHERE status = "delivered"'
    );
    
    // Get recent processing activity
    const [recentProcessing] = await db.query(`
      SELECT 
        p.id,
        p.org_dress_name,
        p.size,
        p.quantity,
        p.current_stage_name,
        p.last_stage_update
      FROM processing p
      WHERE p.is_completed = FALSE
      ORDER BY p.last_stage_update DESC
      LIMIT 5
    `);
    
    // Get recent orders
    const [recentOrders] = await db.query(`
      SELECT 
        id,
        customer_name,
        status,
        total_quantity,
        order_date
      FROM orders
      ORDER BY order_date DESC
      LIMIT 5
    `);
    
    res.json({
      stocks: {
        clothStock: clothStockResult[0].total || 0,
        cutStock: cutStockResult[0].total || 0,
        sellingStock: sellingStockResult[0].total || 0
      },
      processing: {
        active: processingResult[0].total || 0,
        delivered: deliveredResult[0].total || 0
      },
      orders: {
        pending: pendingOrders[0].total || 0,
        inProcess: inProcessOrders[0].total || 0,
        delivered: deliveredOrders[0].total || 0,
        total: (pendingOrders[0].total || 0) + (inProcessOrders[0].total || 0) + (deliveredOrders[0].total || 0)
      },
      recentActivity: {
        processing: recentProcessing,
        orders: recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', message: error.message });
  }
});

export default router;
