import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// =====================================================
// FABRICATOR MANAGEMENT ROUTES
// =====================================================

// GET /api/fabricators - List all fabricators
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM fabricators WHERE deleted_at IS NULL';
    const params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [fabricators] = await db.query(query, params);
    
    res.json({
      success: true,
      data: fabricators,
      total: fabricators.length
    });
  } catch (error) {
    console.error('Error fetching fabricators:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch fabricators', 
      message: error.message 
    });
  }
});

// GET /api/fabricators/:id - Get single fabricator
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [fabricators] = await db.query(
      'SELECT * FROM fabricators WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (fabricators.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fabricator not found' 
      });
    }
    
    // Get job work statistics for this fabricator
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as active_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(total_pending_qty) as total_pending_qty
      FROM job_works 
      WHERE fabricator_id = ? AND deleted_at IS NULL
    `, [id]);
    
    res.json({
      success: true,
      data: {
        ...fabricators[0],
        statistics: stats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching fabricator:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch fabricator', 
      message: error.message 
    });
  }
});

// POST /api/fabricators - Create new fabricator
router.post('/', async (req, res) => {
  try {
    const { name, contact_person, phone, address, status } = req.body;
    
    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Fabricator name is required' 
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO fabricators (name, contact_person, phone, address, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), contact_person, phone, address, status || 'active']
    );
    
    // Fetch the created fabricator
    const [newFabricator] = await db.query(
      'SELECT * FROM fabricators WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Fabricator created successfully',
      data: newFabricator[0]
    });
  } catch (error) {
    console.error('Error creating fabricator:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create fabricator', 
      message: error.message 
    });
  }
});

// PUT /api/fabricators/:id - Update fabricator
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, address, status } = req.body;
    
    // Check if fabricator exists
    const [existing] = await db.query(
      'SELECT * FROM fabricators WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fabricator not found' 
      });
    }
    
    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Fabricator name is required' 
      });
    }
    
    await db.query(
      `UPDATE fabricators 
       SET name = ?, contact_person = ?, phone = ?, address = ?, status = ?
       WHERE id = ?`,
      [name.trim(), contact_person, phone, address, status || 'active', id]
    );
    
    // Fetch updated fabricator
    const [updated] = await db.query(
      'SELECT * FROM fabricators WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Fabricator updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating fabricator:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update fabricator', 
      message: error.message 
    });
  }
});

// DELETE /api/fabricators/:id - Soft delete fabricator
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if fabricator exists
    const [existing] = await db.query(
      'SELECT * FROM fabricators WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Fabricator not found' 
      });
    }
    
    // Check if fabricator has active job works
    const [activeJobs] = await db.query(
      `SELECT COUNT(*) as count FROM job_works 
       WHERE fabricator_id = ? 
       AND status IN ('issued', 'partially_received') 
       AND deleted_at IS NULL`,
      [id]
    );
    
    if (activeJobs[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot delete fabricator with ${activeJobs[0].count} active job work(s)` 
      });
    }
    
    // Soft delete
    await db.query(
      'UPDATE fabricators SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Fabricator deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fabricator:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete fabricator', 
      message: error.message 
    });
  }
});

export default router;
