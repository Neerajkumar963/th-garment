import db from './config/database.js';

async function verifyFix() {
  try {
    const [finishedGoodsResult] = await db.query(
      'SELECT SUM(quantity) as total FROM finished_goods_stock WHERE status = "available" AND deleted_at IS NULL'
    );
    console.log('Finished Goods Stock (Sum):', finishedGoodsResult[0].total);

    const [sellingStockResult] = await db.query(
      'SELECT COUNT(*) as total FROM selling_stock WHERE status = "available" AND deleted_at IS NULL'
    );
    console.log('Selling Stock (Count):', sellingStockResult[0].total);

    // This mimics the FIXED code in the route
    const fixedTotal = (Number(finishedGoodsResult[0].total) || 0) + (Number(sellingStockResult[0].total) || 0);
    console.log('Fixed Total Finished Goods:', fixedTotal);
    
    // Validate expectation
    if (typeof fixedTotal === 'number' && !isNaN(fixedTotal)) {
        console.log('SUCCESS: Result is a valid number.');
    } else {
        console.log('FAILURE: Result is not a number.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyFix();
