import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Fixed processing stages
const PROCESSING_STAGES = [
  'Design & Cut',
  'Stitching',
  'Kaj Button',
  'Washing',
  'Thread Cutting',
  'Press & Packing',
  'Label Tag',
  'Fabrication',
  'Processed'
];

// GET /api/processing/active - Get all active processing items
router.get('/active', async (req, res) => {
  try {
    const [activeItems] = await db.query(`
      SELECT 
        p.id,
        p.org_dress_name,
        p.size,
        p.quantity,
        p.current_stage_id,
        p.current_stage_name,
        ps.stage_order,
        p.date_given,
        p.last_stage_update
      FROM processing p
      JOIN processing_stage ps ON p.current_stage_id = ps.id
      WHERE p.is_completed = FALSE
      ORDER BY ps.stage_order, p.last_stage_update DESC
    `);
    
    res.json(activeItems);
  } catch (error) {
    console.error('Get active processing error:', error);
    res.status(500).json({ error: 'Failed to fetch active processing items', message: error.message });
  }
});

// GET /api/processing/delivered - Get completed processing items
router.get('/delivered', async (req, res) => {
  try {
    const [deliveredItems] = await db.query(`
      SELECT 
        p.id,
        p.org_dress_name,
        p.size,
        p.quantity,
        p.current_stage_name,
        p.date_given,
        p.last_stage_update
      FROM processing p
      WHERE p.is_completed = TRUE
      ORDER BY p.last_stage_update DESC
      LIMIT 50
    `);
    
    res.json(deliveredItems);
  } catch (error) {
    console.error('Get delivered processing error:', error);
    res.status(500).json({ error: 'Failed to fetch delivered items', message: error.message });
  }
});

// GET /api/processing/available-cut-stock - Get available cut stock for processing
router.get('/available-cut-stock', async (req, res) => {
  try {
    const [cutStock] = await db.query(`
      SELECT 
        cs.id,
        cs.org_dress_name,
        cs.design,
        cs.size,
        cs.quantity,
        cs.created_at
      FROM cut_stock cs
      WHERE cs.status = 'available'
      ORDER BY cs.created_at ASC
    `);
    
    res.json(cutStock);
  } catch (error) {
    console.error('Get available cut stock error:', error);
    res.status(500).json({ error: 'Failed to fetch available cut stock', message: error.message });
  }
});

// POST /api/processing/start - Start processing from cut stock
router.post('/start', async (req, res) => {
  const { cut_stock_id } = req.body;
  
  if (!cut_stock_id) {
    return res.status(400).json({ error: 'cut_stock_id is required' });
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get cut stock details
    const [cutStockData] = await connection.query(
      'SELECT * FROM cut_stock WHERE id = ? AND status = "available"',
      [cut_stock_id]
    );
    
    if (cutStockData.length === 0) {
      throw new Error('Cut stock not found or already in processing');
    }
    
    const cutStock = cutStockData[0];
    
    // Get first stage (Design & Cut)
    const [firstStage] = await connection.query(
      'SELECT * FROM processing_stage WHERE stage_order = 1'
    );
    
    if (firstStage.length === 0) {
      throw new Error('Processing stages not configured');
    }
    
    // Create processing entry
    const [result] = await connection.query(
      `INSERT INTO processing 
       (cut_stock_id, org_dress_name, size, quantity, current_stage_id, current_stage_name) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cut_stock_id,
        cutStock.org_dress_name,
        cutStock.size,
        cutStock.quantity,
        firstStage[0].id,
        firstStage[0].stage_name
      ]
    );
    
    // Update cut stock status
    await connection.query(
      'UPDATE cut_stock SET status = "in_processing" WHERE id = ?',
      [cut_stock_id]
    );
    
    await connection.commit();
    
    res.status(201).json({ 
      message: 'Processing started successfully',
      processing_id: result.insertId,
      current_stage: firstStage[0].stage_name
    });
  } catch (error) {
    await connection.rollback();
    console.error('Start processing error:', error);
    res.status(500).json({ error: 'Failed to start processing', message: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/processing/advance/:id - Move to next stage
router.put('/advance/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get current processing details
    const [processingData] = await connection.query(
      `SELECT p.*, ps.stage_order 
       FROM processing p
       JOIN processing_stage ps ON p.current_stage_id = ps.id
       WHERE p.id = ? AND p.is_completed = FALSE`,
      [id]
    );
    
    if (processingData.length === 0) {
      throw new Error('Processing item not found or already completed');
    }
    
    const processing = processingData[0];
    const currentStageOrder = processing.stage_order;
    
    // Check if already at final stage
    if (currentStageOrder >= 9) {
      throw new Error('Already at final stage. Use complete endpoint instead.');
    }
    
    // Get next stage
    const [nextStage] = await connection.query(
      'SELECT * FROM processing_stage WHERE stage_order = ?',
      [currentStageOrder + 1]
    );
    
    if (nextStage.length === 0) {
      throw new Error('Next stage not found');
    }
    
    // Update processing to next stage
    await connection.query(
      `UPDATE processing 
       SET current_stage_id = ?, current_stage_name = ?, last_stage_update = NOW() 
       WHERE id = ?`,
      [nextStage[0].id, nextStage[0].stage_name, id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Advanced to next stage successfully',
      new_stage: nextStage[0].stage_name,
      stage_order: nextStage[0].stage_order
    });
  } catch (error) {
    await connection.rollback();
    console.error('Advance stage error:', error);
    res.status(500).json({ error: 'Failed to advance stage', message: error.message });
  } finally {
    connection.release();
  }
});

// PUT /api/processing/complete/:id - Mark processing as completed (from Processed stage)
router.put('/complete/:id', async (req, res) => {
  const { id } = req.params;
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get processing details
    const [processingData] = await connection.query(
      `SELECT p.*, ps.stage_order, cs.design
       FROM processing p
       JOIN processing_stage ps ON p.current_stage_id = ps.id
       JOIN cut_stock cs ON p.cut_stock_id = cs.id
       WHERE p.id = ? AND p.is_completed = FALSE`,
      [id]
    );
    
    if (processingData.length === 0) {
      throw new Error('Processing item not found or already completed');
    }
    
    const processing = processingData[0];
    
    // Must be at final stage (Processed - stage 9)
    if (processing.stage_order !== 9) {
      throw new Error('Item must be at "Processed" stage before completing');
    }
    
    // Mark processing as completed
    await connection.query(
      'UPDATE processing SET is_completed = TRUE, last_stage_update = NOW() WHERE id = ?',
      [id]
    );
    
    // Update cut stock status
    await connection.query(
      'UPDATE cut_stock SET status = "processed" WHERE id = ?',
      [processing.cut_stock_id]
    );
    
    // Create selling stock entry
    await connection.query(
      `INSERT INTO selling_stock 
       (processing_id, org_dress_name, design, size, quantity, status) 
       VALUES (?, ?, ?, ?, ?, 'available')`,
      [id, processing.org_dress_name, processing.design, processing.size, processing.quantity]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Processing completed successfully. Item moved to selling stock.',
      processing_id: id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Complete processing error:', error);
    res.status(500).json({ error: 'Failed to complete processing', message: error.message });
  } finally {
    connection.release();
  }
});

export default router;
