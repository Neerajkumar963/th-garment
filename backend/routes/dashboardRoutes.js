import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/dashboard/summary - Get dashboard summary statistics
router.get('/summary', async (req, res) => {
  try {
    // Get total stocks
    const [clothStockResult] = await db.query(
      'SELECT SUM(quantity) as total FROM cloth_stock WHERE deleted_at IS NULL'
    );
    
    const [cutStockResult] = await db.query(
      'SELECT SUM(quantity) as total FROM cut_stock WHERE deleted_at IS NULL'
    );
    
    const [sellingStockResult] = await db.query(
      'SELECT SUM(quantity) as total FROM selling_stock WHERE status = "available" AND deleted_at IS NULL'
    );
    
    // Get finished goods stock (from all sources)
    const [finishedGoodsResult] = await db.query(
      'SELECT SUM(quantity) as total FROM finished_goods_stock WHERE status = "available" AND deleted_at IS NULL'
    );
    
    // Get ready item stock
    const [readyItemsResult] = await db.query(
      'SELECT SUM(quantity) as total FROM ready_item_stock WHERE status = "available" AND deleted_at IS NULL'
    );
    
    // Get dead stock
    const [deadStockResult] = await db.query(
      'SELECT COUNT(*) as total FROM dead_stock WHERE deleted_at IS NULL'
    );
    
    // Get processing items count
    const [processingResult] = await db.query(
      'SELECT COUNT(*) as total FROM processing WHERE is_completed = FALSE AND deleted_at IS NULL'
    );
    
    // Get delivered items count
    const [deliveredResult] = await db.query(
      'SELECT COUNT(*) as total FROM processing WHERE is_completed = TRUE AND deleted_at IS NULL'
    );
    
    // Get job work statistics
    const [activeJobWorks] = await db.query(
      'SELECT COUNT(*) as total FROM job_works WHERE status IN ("issued", "partially_received") AND deleted_at IS NULL'
    );
    
    const [pendingJobWorkQty] = await db.query(
      'SELECT SUM(total_pending_qty) as total FROM job_works WHERE deleted_at IS NULL'
    );
    
    const [completedJobWorks] = await db.query(
      'SELECT COUNT(*) as total FROM job_works WHERE status = "completed" AND deleted_at IS NULL'
    );
    
    // Get job work pending quantity (items with fabricators)
    const [fabricatorWorkQty] = await db.query(
      'SELECT SUM(total_pending_qty) as total FROM job_works WHERE status IN ("issued", "partially_received") AND deleted_at IS NULL'
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
      WHERE p.is_completed = FALSE AND p.deleted_at IS NULL
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
    
    // Get recent job works
    const [recentJobWorks] = await db.query(`
      SELECT 
        jw.id,
        jw.job_number,
        jw.org_dress_name,
        jw.status,
        jw.total_pending_qty,
        f.name as fabricator_name
      FROM job_works jw
      JOIN fabricators f ON jw.fabricator_id = f.id
      WHERE jw.deleted_at IS NULL
      ORDER BY jw.issue_date DESC
      LIMIT 5
    `);
    
    res.json({
      stocks: {
        rawCloth: clothStockResult[0].total || 0,
        clothStock: clothStockResult[0].total || 0,
        cutStock: cutStockResult[0].total || 0,
        sellingStock: sellingStockResult[0].total || 0,
        finishedGoods: (Number(finishedGoodsResult[0].total) || 0) + (Number(sellingStockResult[0].total) || 0),
        readyItems: readyItemsResult[0].total || 0,
        deadStock: deadStockResult[0].total || 0
      },
      processing: {
        selfProcessing: processingResult[0].total || 0,
        fabricatorWork: fabricatorWorkQty[0].total || 0,
        active: processingResult[0].total || 0,
        delivered: deliveredResult[0].total || 0
      },
      jobWorks: {
        active: activeJobWorks[0].total || 0,
        pending_qty: pendingJobWorkQty[0].total || 0,
        completed: completedJobWorks[0].total || 0
      },
      orders: {
        pending: pendingOrders[0].total || 0,
        inProcess: inProcessOrders[0].total || 0,
        delivered: deliveredOrders[0].total || 0,
        total: (pendingOrders[0].total || 0) + (inProcessOrders[0].total || 0) + (deliveredOrders[0].total || 0)
      },
      recentActivity: {
        processing: recentProcessing,
        orders: recentOrders,
        jobWorks: recentJobWorks
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', message: error.message });
  }
});

export default router;
