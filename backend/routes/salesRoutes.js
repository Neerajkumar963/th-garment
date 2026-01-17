import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// GET /api/sales/available - Get available stock aggregated by Name + Size
router.get('/available', async (req, res) => {
  try {
    // 1. Get Ready Items Stock
    const [readyItems] = await db.query(`
      SELECT 
        'ready_item_stock' as stock_type,
        ri.item_name,
        ris.size,
        SUM(ris.quantity) as quantity,
        'Ready Item' as category
      FROM ready_item_stock ris
      JOIN ready_items ri ON ris.ready_item_id = ri.id
      WHERE ris.status = 'available' 
      AND ris.quantity > 0 
      AND ris.deleted_at IS NULL
      GROUP BY ri.item_name, ris.size
    `);

    // 2. Get Selling Stock (Processed items)
    const [sellingStock] = await db.query(`
      SELECT 
        'selling_stock' as stock_type,
        ss.org_dress_name as item_name,
        ss.size,
        SUM(ss.quantity) as quantity,
        'Processed' as category
      FROM selling_stock ss
      WHERE ss.status = 'available' 
      AND ss.quantity > 0 
      AND ss.deleted_at IS NULL
      GROUP BY ss.org_dress_name, ss.size
    `);

    // 3. Get Fabricator Items
    const [fabricatorItems] = await db.query(`
        SELECT 
            'finished_goods_stock' as stock_type,
            org_dress_name as item_name,
            size,
            SUM(quantity) as quantity,
            'Fabricator' as category
        FROM finished_goods_stock
        WHERE source = 'job_work'
        AND status = 'available'
        AND quantity > 0
        AND deleted_at IS NULL
        GROUP BY org_dress_name, size
    `);

    // Combine and add a composite ID for frontend key
    const allStock = [...readyItems, ...sellingStock, ...fabricatorItems].map((item, index) => ({
        ...item,
        stock_id: `${item.stock_type}_${item.item_name}_${item.size}` // Virtual ID
    }));
    
    res.json({
      success: true,
      data: allStock
    });
  } catch (error) {
    console.error('Error fetching available stock:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stock' });
  }
});

// POST /api/sales - Create a new sale (FIFO Logic)
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  const { customer_name, items, notes } = req.body;

  try {
    await connection.beginTransaction();

    // 1. Create Sales Record
    const [saleResult] = await connection.query(
      'INSERT INTO sales (customer_name, total_amount, notes) VALUES (?, ?, ?)',
      [customer_name || 'Walk-in Customer', 0, notes]
    );
    const saleId = saleResult.insertId;
    let totalAmount = 0;

    // 2. Process Items
    for (const item of items) {
      if (item.quantity <= 0) continue;

      let table = '';
      if (item.stock_type === 'ready_item_stock') table = 'ready_item_stock';
      else if (item.stock_type === 'selling_stock') table = 'selling_stock';
      else if (item.stock_type === 'finished_goods_stock') table = 'finished_goods_stock';
      
      if (!table) throw new Error('Invalid stock type');

      // Find ALL matching rows for this item/size (FIFO)
      // For Ready Items, join with ready_items table to match name
      let rows = [];
      if (table === 'ready_item_stock') {
          [rows] = await connection.query(`
            SELECT ris.id, ris.quantity, ris.ready_item_id 
            FROM ready_item_stock ris
            JOIN ready_items ri ON ris.ready_item_id = ri.id
            WHERE ri.item_name = ? AND ris.size = ?
            AND ris.status = 'available' AND ris.quantity > 0 AND ris.deleted_at IS NULL
            ORDER BY ris.created_at ASC FOR UPDATE
          `, [item.item_name, item.size]);
      } else {
          // For selling_stock and finished_goods_stock, name is in the table
          let query = `SELECT id, quantity FROM ${table} WHERE org_dress_name = ? AND size = ? AND status = 'available' AND quantity > 0 AND deleted_at IS NULL`;
          if (table === 'finished_goods_stock') {
              query += ` AND source = 'job_work'`; // Only look at job_work items here to avoid mixing sources if needed, though type passed is explicit
          }
          query += ` ORDER BY created_at ASC FOR UPDATE`;
          
          [rows] = await connection.query(query, [item.item_name, item.size]);
      }

      let remainingToSell = item.quantity;
      
      // Calculate total available from rows
      const totalAvailable = rows.reduce((sum, r) => sum + r.quantity, 0);
      if (totalAvailable < remainingToSell) {
          throw new Error(`Insufficient stock for ${item.item_name} (${item.size}). Requested: ${remainingToSell}, Available: ${totalAvailable}`);
      }

      // FIFO Deduction Loop
      for (const row of rows) {
          if (remainingToSell <= 0) break;

          const deduct = Math.min(row.quantity, remainingToSell);
          
          // Update Row
          if (deduct === row.quantity) {
              await connection.query(`UPDATE ${table} SET quantity = 0, status = 'sold' WHERE id = ?`, [row.id]);
          } else {
              await connection.query(`UPDATE ${table} SET quantity = quantity - ? WHERE id = ?`, [deduct, row.id]);
          }

          // Updates for linked tables (Sync Logic)
          if (table === 'ready_item_stock') {
             // Sync finished_goods_stock
             // Note: row.ready_item_id is available from the SELECT above
             await connection.query(`
                UPDATE finished_goods_stock 
                SET quantity = GREATEST(0, quantity - ?) 
                WHERE source = 'ready_item' AND source_id = ? AND size = ? LIMIT 1
             `, [deduct, row.ready_item_id, item.size]);
          }

          remainingToSell -= deduct;
      }
      
      // Record Sale Item
      const subtotal = (item.price || 0) * item.quantity;
      totalAmount += subtotal;

      // Note: We record stock_id as 0 or NULL because it came from multiple rows
      await connection.query(
        `INSERT INTO sale_items (sale_id, stock_type, stock_id, item_name, size, quantity, price_per_unit, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.stock_type, 0, item.item_name, item.size, item.quantity, item.price || 0, subtotal]
      );
    }

    // Update total amount
    await connection.query('UPDATE sales SET total_amount = ? WHERE id = ?', [totalAmount, saleId]);

    await connection.commit();
    res.json({ success: true, message: 'Sale completed successfully', saleId });

  } catch (error) {
    await connection.rollback();
    console.error('Sale transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/sales/history ... (Same as before)
router.get('/history', async (req, res) => {
    try {
      const [sales] = await db.query('SELECT * FROM sales WHERE deleted_at IS NULL ORDER BY sale_date DESC');
      res.json({ success: true, data: sales });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
  });

export default router;
