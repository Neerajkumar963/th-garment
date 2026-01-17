import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// =====================================================
// JOB WORK MANAGEMENT ROUTES
// =====================================================

// POST /api/job-works/issue - Issue cloth to fabricator
router.post('/issue', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { 
      fabricator_id, 
      cloth_type_id, 
      org_dress_name, 
      design, 
      cloth_used_per_piece,
      sizes, 
      notes 
    } = req.body;
    
    // Validation
    if (!fabricator_id || !cloth_type_id || !org_dress_name || !design || !sizes || sizes.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    if (!cloth_used_per_piece || cloth_used_per_piece <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Cloth used per piece must be greater than 0' 
      });
    }
    
    // Verify fabricator exists and is active
    const [fabricator] = await connection.query(
      'SELECT * FROM fabricators WHERE id = ? AND status = "active" AND deleted_at IS NULL',
      [fabricator_id]
    );
    
    if (fabricator.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Fabricator not found or inactive' 
      });
    }
    
    // Verify cloth type exists
    const [clothType] = await connection.query(
      'SELECT * FROM cloth_type WHERE id = ?',
      [cloth_type_id]
    );
    
    if (clothType.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Cloth type not found' 
      });
    }
    
    // Calculate total quantities
    const total_issued_qty = sizes.reduce((sum, s) => sum + parseInt(s.quantity), 0);
    const total_cloth_needed = total_issued_qty * parseFloat(cloth_used_per_piece);
    
    // Check cloth stock availability
    const [clothStock] = await connection.query(
      'SELECT quantity FROM cloth_stock WHERE cloth_type_id = ? AND deleted_at IS NULL',
      [cloth_type_id]
    );
    
    const available_cloth = clothStock.length > 0 ? parseFloat(clothStock[0].quantity) : 0;
    
    if (available_cloth < total_cloth_needed) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient cloth stock. Available: ${available_cloth} meters, Required: ${total_cloth_needed} meters` 
      });
    }
    
    // Generate job number (format: JOB-YYYYMMDD-XXX)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [lastJob] = await connection.query(
      `SELECT job_number FROM job_works 
       WHERE job_number LIKE ? 
       ORDER BY job_number DESC LIMIT 1`,
      [`JOB-${today}-%`]
    );
    
    let sequence = 1;
    if (lastJob.length > 0) {
      const lastSeq = parseInt(lastJob[0].job_number.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    const job_number = `JOB-${today}-${String(sequence).padStart(3, '0')}`;
    
    // Insert job work
    const [jobResult] = await connection.query(
      `INSERT INTO job_works 
       (job_number, fabricator_id, cloth_type_id, org_dress_name, design, 
        cloth_used_per_piece, total_issued_qty, total_pending_qty, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [job_number, fabricator_id, cloth_type_id, org_dress_name, design, 
       cloth_used_per_piece, total_issued_qty, total_issued_qty, notes]
    );
    
    const job_work_id = jobResult.insertId;
    
    // Insert size-wise breakdown
    for (const sizeData of sizes) {
      await connection.query(
        `INSERT INTO job_work_sizes 
         (job_work_id, size, issued_qty, pending_qty) 
         VALUES (?, ?, ?, ?)`,
        [job_work_id, sizeData.size, sizeData.quantity, sizeData.quantity]
      );
    }
    
    // Deduct cloth from stock
    await connection.query(
      `UPDATE cloth_stock 
       SET quantity = quantity - ? 
       WHERE cloth_type_id = ? AND deleted_at IS NULL`,
      [total_cloth_needed, cloth_type_id]
    );
    
    // Create audit trail
    await connection.query(
      `INSERT INTO job_work_history 
       (job_work_id, action, details) 
       VALUES (?, 'issued', ?)`,
      [job_work_id, JSON.stringify({ sizes, total_cloth_needed })]
    );
    
    await connection.commit();
    
    // Fetch complete job work details
    const [newJobWork] = await connection.query(
      `SELECT jw.*, f.name as fabricator_name, ct.name as cloth_name
       FROM job_works jw
       JOIN fabricators f ON jw.fabricator_id = f.id
       JOIN cloth_type ct ON jw.cloth_type_id = ct.id
       WHERE jw.id = ?`,
      [job_work_id]
    );
    
    const [jobSizes] = await connection.query(
      'SELECT * FROM job_work_sizes WHERE job_work_id = ?',
      [job_work_id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Job work issued successfully',
      data: {
        ...newJobWork[0],
        sizes: jobSizes
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error issuing job work:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to issue job work', 
      message: error.message 
    });
  } finally {
    connection.release();
  }
});

// GET /api/job-works - List job works with filters
router.get('/', async (req, res) => {
  try {
    const { status, fabricator_id, search } = req.query;
    
    let query = `
      SELECT jw.*, 
             f.name as fabricator_name, 
             ct.name as cloth_name
      FROM job_works jw
      JOIN fabricators f ON jw.fabricator_id = f.id
      JOIN cloth_type ct ON jw.cloth_type_id = ct.id
      WHERE jw.deleted_at IS NULL
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND jw.status = ?';
      params.push(status);
    }
    
    if (fabricator_id) {
      query += ' AND jw.fabricator_id = ?';
      params.push(fabricator_id);
    }
    
    if (search) {
      query += ' AND (jw.job_number LIKE ? OR jw.org_dress_name LIKE ? OR jw.design LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY jw.issue_date DESC';
    
    const [jobWorks] = await db.query(query, params);
    
    res.json({
      success: true,
      data: jobWorks,
      total: jobWorks.length
    });
  } catch (error) {
    console.error('Error fetching job works:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch job works', 
      message: error.message 
    });
  }
});

// GET /api/job-works/pending - Get all pending job works
router.get('/pending', async (req, res) => {
  try {
    const [jobWorks] = await db.query(`
      SELECT jw.*, 
             f.name as fabricator_name, 
             ct.name as cloth_name
      FROM job_works jw
      JOIN fabricators f ON jw.fabricator_id = f.id
      JOIN cloth_type ct ON jw.cloth_type_id = ct.id
      WHERE jw.status IN ('issued', 'partially_received') 
      AND jw.total_pending_qty > 0
      AND jw.deleted_at IS NULL
      ORDER BY jw.issue_date ASC
    `);
    
    res.json({
      success: true,
      data: jobWorks,
      total: jobWorks.length
    });
  } catch (error) {
    console.error('Error fetching pending job works:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending job works', 
      message: error.message 
    });
  }
});

// GET /api/job-works/:id - Get job work details with sizes
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [jobWork] = await db.query(`
      SELECT jw.*, 
             f.name as fabricator_name,
             f.contact_person,
             f.phone as fabricator_phone,
             ct.name as cloth_name
      FROM job_works jw
      JOIN fabricators f ON jw.fabricator_id = f.id
      JOIN cloth_type ct ON jw.cloth_type_id = ct.id
      WHERE jw.id = ? AND jw.deleted_at IS NULL
    `, [id]);
    
    if (jobWork.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Job work not found' 
      });
    }
    
    const [sizes] = await db.query(
      'SELECT * FROM job_work_sizes WHERE job_work_id = ? ORDER BY size',
      [id]
    );
    
    const [history] = await db.query(
      'SELECT * FROM job_work_history WHERE job_work_id = ? ORDER BY created_at DESC',
      [id]
    );
    
    res.json({
      success: true,
      data: {
        ...jobWork[0],
        sizes,
        history
      }
    });
  } catch (error) {
    console.error('Error fetching job work:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch job work', 
      message: error.message 
    });
  }
});

// POST /api/job-works/:id/receive - Receive items from fabricator
router.post('/:id/receive', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { received_items } = req.body;
    
    // Validation
    if (!received_items || received_items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'No received items provided' 
      });
    }
    
    // Get job work details
    const [jobWork] = await connection.query(
      'SELECT * FROM job_works WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (jobWork.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Job work not found' 
      });
    }
    
    if (jobWork[0].status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Job work already completed' 
      });
    }
    
    let total_received_now = 0;
    
    // Process each size
    for (const item of received_items) {
      const { size, quantity } = item;
      
      if (!size || !quantity || quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid size or quantity' 
        });
      }
      
      // Get current size data
      const [sizeData] = await connection.query(
        'SELECT * FROM job_work_sizes WHERE job_work_id = ? AND size = ?',
        [id, size]
      );
      
      if (sizeData.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false, 
          error: `Size ${size} not found in this job work` 
        });
      }
      
      const current = sizeData[0];
      const new_received_qty = current.received_qty + quantity;
      
      // Validation: Cannot over-receive
      if (new_received_qty > current.issued_qty) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          error: `Cannot receive ${quantity} pieces of size ${size}. Only ${current.pending_qty} pending.` 
        });
      }
      
      const new_pending_qty = current.issued_qty - new_received_qty - current.dead_qty;
      
      // Update job_work_sizes
      await connection.query(
        `UPDATE job_work_sizes 
         SET received_qty = ?, pending_qty = ? 
         WHERE id = ?`,
        [new_received_qty, new_pending_qty, current.id]
      );
      
      // Add to finished goods stock
      await connection.query(
        `INSERT INTO finished_goods_stock 
         (org_dress_name, design, size, quantity, source, source_id, status) 
         VALUES (?, ?, ?, ?, 'job_work', ?, 'available')`,
        [jobWork[0].org_dress_name, jobWork[0].design, size, quantity, current.id]
      );
      
      total_received_now += quantity;
    }
    
    // Update job_works totals
    const [updatedSizes] = await connection.query(
      'SELECT SUM(received_qty) as total_received, SUM(pending_qty) as total_pending FROM job_work_sizes WHERE job_work_id = ?',
      [id]
    );
    
    const new_total_received = updatedSizes[0].total_received || 0;
    const new_total_pending = updatedSizes[0].total_pending || 0;
    
    let new_status = 'partially_received';
    let completion_date = null;
    
    if (new_total_pending <= 0) {
      new_status = 'completed';
      completion_date = new Date();
    }
    
    await connection.query(
      `UPDATE job_works 
       SET total_received_qty = ?, total_pending_qty = ?, status = ?, completion_date = ? 
       WHERE id = ?`,
      [new_total_received, new_total_pending, new_status, completion_date, id]
    );
    
    // Create audit trail
    await connection.query(
      `INSERT INTO job_work_history 
       (job_work_id, action, details) 
       VALUES (?, 'received', ?)`,
      [id, JSON.stringify({ received_items, total_received_now })]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: `Received ${total_received_now} items successfully`,
      data: {
        total_received: new_total_received,
        total_pending: new_total_pending,
        status: new_status
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error receiving job work:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to receive job work', 
      message: error.message 
    });
  } finally {
    connection.release();
  }
});

// PUT /api/job-works/:id/mark-dead - Mark pending items as dead/loss
router.put('/:id/mark-dead', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { dead_items, reason } = req.body;
    
    // Validation
    if (!dead_items || dead_items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'No dead items provided' 
      });
    }
    
    if (!reason || reason.trim() === '') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Reason is required' 
      });
    }
    
    // Get job work details
    const [jobWork] = await connection.query(
      'SELECT * FROM job_works WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (jobWork.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Job work not found' 
      });
    }
    
    let total_dead_now = 0;
    
    // Process each size
    for (const item of dead_items) {
      const { size, quantity } = item;
      
      if (!size || !quantity || quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid size or quantity' 
        });
      }
      
      // Get current size data
      const [sizeData] = await connection.query(
        'SELECT * FROM job_work_sizes WHERE job_work_id = ? AND size = ?',
        [id, size]
      );
      
      if (sizeData.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false, 
          error: `Size ${size} not found in this job work` 
        });
      }
      
      const current = sizeData[0];
      const new_dead_qty = current.dead_qty + quantity;
      
      // Validation: Cannot mark more than pending
      if (quantity > current.pending_qty) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          error: `Cannot mark ${quantity} pieces of size ${size} as dead. Only ${current.pending_qty} pending.` 
        });
      }
      
      const new_pending_qty = current.issued_qty - current.received_qty - new_dead_qty;
      
      // Update job_work_sizes
      await connection.query(
        `UPDATE job_work_sizes 
         SET dead_qty = ?, pending_qty = ? 
         WHERE id = ?`,
        [new_dead_qty, new_pending_qty, current.id]
      );
      
      // Add to dead stock
      await connection.query(
        `INSERT INTO dead_stock 
         (item_name, size, quantity, reason, source, source_id) 
         VALUES (?, ?, ?, ?, 'job_work', ?)`,
        [jobWork[0].org_dress_name, size, quantity, reason, current.id]
      );
      
      total_dead_now += quantity;
    }
    
    // Update job_works totals
    const [updatedSizes] = await connection.query(
      'SELECT SUM(dead_qty) as total_dead, SUM(pending_qty) as total_pending FROM job_work_sizes WHERE job_work_id = ?',
      [id]
    );
    
    const new_total_dead = updatedSizes[0].total_dead || 0;
    const new_total_pending = updatedSizes[0].total_pending || 0;
    
    let new_status = jobWork[0].status;
    let completion_date = null;
    
    if (new_total_pending <= 0) {
      new_status = 'completed';
      completion_date = new Date();
    }
    
    await connection.query(
      `UPDATE job_works 
       SET total_dead_qty = ?, total_pending_qty = ?, status = ?, completion_date = ? 
       WHERE id = ?`,
      [new_total_dead, new_total_pending, new_status, completion_date, id]
    );
    
    // Create audit trail
    await connection.query(
      `INSERT INTO job_work_history 
       (job_work_id, action, details) 
       VALUES (?, 'marked_dead', ?)`,
      [id, JSON.stringify({ dead_items, reason, total_dead_now })]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: `Marked ${total_dead_now} items as dead/loss`,
      data: {
        total_dead: new_total_dead,
        total_pending: new_total_pending,
        status: new_status
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error marking dead items:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark dead items', 
      message: error.message 
    });
  } finally {
    connection.release();
  }
});

// DELETE /api/job-works/:id - Soft delete job work
router.delete('/:id', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if job work exists
    const [existing] = await connection.query(
      'SELECT * FROM job_works WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'Job work not found' 
      });
    }
    
    // Can only delete if status is completed
    if (existing[0].status !== 'completed') {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'Can only delete completed job works' 
      });
    }
    
    // Soft delete
    await connection.query(
      'UPDATE job_works SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Job work deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting job work:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete job work', 
      message: error.message 
    });
  } finally {
    connection.release();
  }
});

export default router;
