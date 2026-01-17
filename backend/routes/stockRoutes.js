import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Helper to handle recycle bin queries generally
const getRecycleBinItems = async (table) => {
  const query = `SELECT * FROM ${table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`;
  const [items] = await db.query(query);
  return items;
};

const handleSoftDelete = async (table, id) => {
  await db.query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = ?`, [id]);
};

const handleRestore = async (table, id) => {
  await db.query(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, [id]);
};

const handlePermanentDelete = async (table, id) => {
  await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
};

// --- READ ROUTES (Modified to exclude deleted) ---

// GET /api/stock/cloth - View cloth stock
router.get('/cloth', async (req, res) => {
  try {
    const [clothStock] = await db.query(`
      SELECT 
        cs.id,
        ct.id as cloth_type_id,
        ct.name as cloth_type,
        ct.description,
        cs.quantity,
        cs.unit,
        cs.last_updated
      FROM cloth_stock cs
      JOIN cloth_type ct ON cs.cloth_type_id = ct.id
      WHERE cs.deleted_at IS NULL
      ORDER BY ct.name
    `);
    res.json({ data: clothStock });
  } catch (error) {
    console.error('Get cloth stock error:', error);
    res.status(500).json({ error: 'Failed to fetch cloth stock', message: error.message });
  }
});

// GET /api/stock/cut - View cut stock
router.get('/cut', async (req, res) => {
  try {
    const [cutStock] = await db.query(`
      SELECT 
        cs.id,
        cs.org_dress_name,
        cs.design,
        cs.size,
        cs.quantity,
        cs.status,
        cs.created_at
      FROM cut_stock cs
      WHERE cs.deleted_at IS NULL AND cs.status != 'available'
      ORDER BY cs.created_at DESC
    `);
    res.json(cutStock);
  } catch (error) {
    console.error('Get cut stock error:', error);
    res.status(500).json({ error: 'Failed to fetch cut stock', message: error.message });
  }
});

// GET /api/stock/selling - View selling stock
router.get('/selling', async (req, res) => {
  try {
    const [sellingStock] = await db.query(`
      SELECT 
        ss.id,
        ss.org_dress_name,
        ss.design,
        ss.size,
        ss.quantity,
        ss.status,
        ss.created_at
      FROM selling_stock ss
      WHERE ss.deleted_at IS NULL
      ORDER BY ss.created_at DESC
    `);
    res.json(sellingStock);
  } catch (error) {
    console.error('Get selling stock error:', error);
    res.status(500).json({ error: 'Failed to fetch selling stock', message: error.message });
  }
});

// GET /api/stock/dead - View dead stock
router.get('/dead', async (req, res) => {
  try {
    const [deadStock] = await db.query(`
      SELECT 
        id,
        item_name,
        size,
        quantity,
        reason,
        source,
        source_id,
        moved_date
      FROM dead_stock
      WHERE deleted_at IS NULL
      ORDER BY moved_date DESC
    `);
    res.json({ data: deadStock });
  } catch (error) {
    console.error('Get dead stock error:', error);
    res.status(500).json({ error: 'Failed to fetch dead stock', message: error.message });
  }
});

// --- CREATE ROUTES (Unchanged) ---

// POST /api/stock/cloth - Add cloth stock
router.post('/cloth', async (req, res) => {
  const { cloth_type_id, quantity } = req.body;
  if (!cloth_type_id || !quantity) return res.status(400).json({ error: 'cloth_type_id and quantity are required' });
  if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });
  
  try {
    const [existing] = await db.query('SELECT id, deleted_at FROM cloth_stock WHERE cloth_type_id = ?', [cloth_type_id]);
    
    if (existing.length > 0) {
      const item = existing[0];
      if (item.deleted_at) {
        // Item is in recycle bin: Overwrite quantity and restore
        await db.query('UPDATE cloth_stock SET quantity = ?, deleted_at = NULL WHERE id = ?', [quantity, item.id]);
      } else {
        // Item is active: Add to existing quantity
        await db.query('UPDATE cloth_stock SET quantity = quantity + ? WHERE id = ?', [quantity, item.id]);
      }
      res.json({ message: 'Cloth stock updated successfully' });
    } else {
      await db.query('INSERT INTO cloth_stock (cloth_type_id, quantity) VALUES (?, ?)', [cloth_type_id, quantity]);
      res.status(201).json({ message: 'Cloth stock added successfully' });
    }
  } catch (error) {
    console.error('Add cloth stock error:', error);
    res.status(500).json({ error: 'Failed to add cloth stock', message: error.message });
  }
});

// POST /api/stock/dead - Move item to dead stock
router.post('/dead', async (req, res) => {
  const { item_name, size, quantity, reason } = req.body;
  if (!item_name || !quantity) return res.status(400).json({ error: 'item_name and quantity are required' });
  if (quantity <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });
  
  try {
    await db.query('INSERT INTO dead_stock (item_name, size, quantity, reason) VALUES (?, ?, ?, ?)', [item_name, size || null, quantity, reason || null]);
    res.status(201).json({ message: 'Item added to dead stock successfully' });
  } catch (error) {
    console.error('Add dead stock error:', error);
    res.status(500).json({ error: 'Failed to add dead stock', message: error.message });
  }
});

// GET /api/stock/cloth-types - Get all cloth types
router.get('/cloth-types', async (req, res) => {
  try {
    const [clothTypes] = await db.query('SELECT id, name, description FROM cloth_type ORDER BY name');
    res.json({ data: clothTypes });
  } catch (error) {
    console.error('Get cloth types error:', error);
    res.status(500).json({ error: 'Failed to fetch cloth types', message: error.message });
  }
});

// POST /api/stock/cloth-types - Add new cloth type
router.post('/cloth-types', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const [result] = await db.query('INSERT INTO cloth_type (name, description) VALUES (?, ?)', [name, description || null]);
    res.status(201).json({ message: 'Cloth type added successfully', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Cloth type with this name already exists' });
    console.error('Add cloth type error:', error);
    res.status(500).json({ error: 'Failed to add cloth type', message: error.message });
  }
});

// --- RECYCLE BIN ROUTES ---

// GET /api/stock/recycle-bin/:type
router.get('/recycle-bin/:type', async (req, res) => {
  const { type } = req.params; // cloth, cut, selling, dead
  let table = '';
  
  switch(type) {
    case 'cloth': table = 'cloth_stock'; break;
    case 'cut': table = 'cut_stock'; break;
    case 'selling': table = 'selling_stock'; break;
    case 'dead': table = 'dead_stock'; break;
    default: return res.status(400).json({ error: 'Invalid stock type' });
  }
  
  try {
    // Custom query for cloth stock to join with cloth_type
    if (type === 'cloth') {
      const [items] = await db.query(`
        SELECT cs.*, ct.name as cloth_type 
        FROM cloth_stock cs 
        JOIN cloth_type ct ON cs.cloth_type_id = ct.id 
        WHERE cs.deleted_at IS NOT NULL 
        ORDER BY cs.deleted_at DESC
      `);
      return res.json(items);
    }
    
    // Generic query for others
    const items = await getRecycleBinItems(table);
    res.json(items);
  } catch (error) {
    console.error(`Get ${type} recycle bin error:`, error);
    res.status(500).json({ error: `Failed to fetch ${type} recycle bin`, message: error.message });
  }
});

// PUT /api/stock/restore/:type/:id
router.put('/restore/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  
  switch(type) {
    case 'cloth': table = 'cloth_stock'; break;
    case 'cut': table = 'cut_stock'; break;
    case 'selling': table = 'selling_stock'; break;
    case 'dead': table = 'dead_stock'; break;
    default: return res.status(400).json({ error: 'Invalid stock type' });
  }
  
  try {
    await handleRestore(table, id);
    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    console.error(`Restore ${type} error:`, error);
    res.status(500).json({ error: `Failed to restore ${type} item`, message: error.message });
  }
});

// DELETE /api/stock/:type/:id - Soft Delete
router.delete('/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  
  switch(type) {
    case 'cloth': table = 'cloth_stock'; break;
    case 'cut': table = 'cut_stock'; break;
    case 'selling': table = 'selling_stock'; break;
    case 'dead': table = 'dead_stock'; break;
    default: return res.status(400).json({ error: 'Invalid stock type' });
  }
  
  try {
    await handleSoftDelete(table, id);
    res.json({ message: 'Item moved to recycle bin' });
  } catch (error) {
    console.error(`Delete ${type} error:`, error);
    res.status(500).json({ error: `Failed to delete ${type} item`, message: error.message });
  }
});

// DELETE /api/stock/permanent/:type/:id - Permanent Delete
router.delete('/permanent/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  let table = '';
  
  switch(type) {
    case 'cloth': table = 'cloth_stock'; break;
    case 'cut': table = 'cut_stock'; break;
    case 'selling': table = 'selling_stock'; break;
    case 'dead': table = 'dead_stock'; break;
    default: return res.status(400).json({ error: 'Invalid stock type' });
  }
  
  try {
    await handlePermanentDelete(table, id);
    res.json({ message: 'Item permanently deleted' });
  } catch (error) {
    console.error(`Permanent delete ${type} error:`, error);
    res.status(500).json({ error: `Failed to permanently delete ${type} item`, message: error.message });
  }
});

export default router;
