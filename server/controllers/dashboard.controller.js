const db = require('../config/database');

exports.getStats = async (req, res, next) => {
    try {
        // 1. Pending Orders
        const [pending] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
        
        // 2. In Production
        const [inProcess] = await db.query("SELECT COUNT(DISTINCT cut_stock_id) as count FROM processing WHERE status = 'in_process'");
        
        // 3. Completed Today
        const [completed] = await db.query("SELECT COUNT(*) as count FROM processing WHERE status = 'processed' AND DATE(updated_on) = CURDATE()");
        
        // 4. Low Stock
        const [lowStock] = await db.query("SELECT COUNT(*) as count FROM cloth_detail WHERE total_quantity < 100");

        res.status(200).json({
            success: true,
            stats: {
                pendingOrders: pending[0].count,
                inProduction: inProcess[0].count,
                completedToday: completed[0].count,
                lowStock: lowStock[0].count
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getRecentOrders = async (req, res, next) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.*,
                org.org_name,
                org.phone
            FROM orders o
            JOIN organization org ON o.org_id = org.id
            ORDER BY o.created_on DESC
            LIMIT 10
        `);

        // Fetch details and stage breakdown for each order (Logic copied from orders.controller.js)
        const ordersWithDetails = await Promise.all(orders.map(async (order) => {
            // 1. Get Order Details (Total Qty)
            const [details] = await db.query(`
                SELECT sq FROM order_details WHERE order_id = ?
            `, [order.id]);

            let totalOrderQty = 0;
            details.forEach(row => {
               const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
               const pieces = Object.entries(sq)
                   .filter(([key]) => key !== '_meta')
                   .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);
               totalOrderQty += pieces;
            });

            // 2. Get Delivery History (Packed/Delivered Qty)
            let deliveryHistory = [];
            try {
                const [dh] = await db.query(`SELECT * FROM delivery_history WHERE order_id = ?`, [order.id]);
                deliveryHistory = dh;
            } catch (e) {}

            const packedQty = deliveryHistory.filter(h => !h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const deliveredQty = deliveryHistory.filter(h => h.delivered_at).reduce((sum, h) => sum + h.quantity, 0);
            const totalDispatched = packedQty + deliveredQty;

            // 3. Get Active Processing Qty (Stage 1-8)
            const [processingRows] = await db.query(`
                SELECT p.stage_id, p.status, p.sq, r.role as role_name
                FROM processing p
                JOIN cut_stock cs ON p.cut_stock_id = cs.id
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                LEFT JOIN emp_details e ON p.emp_id = e.id
                LEFT JOIN emp_roles r ON e.role_id = r.id
                WHERE cp.order_id = ?
            `, [order.id]);

            // 3.1 Get Cut Stock Qty
            const [cutStockRows] = await db.query(`
                SELECT cs.sq
                FROM cut_stock cs
                JOIN cutting_process cp ON cs.cutting_process_id = cp.id
                WHERE cp.order_id = ?
            `, [order.id]);
            
            let cutStockQty = 0;
            cutStockRows.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                cutStockQty += Object.entries(sq).filter(([k]) => k!=='_meta').reduce((s, [_, q]) => s + (parseInt(q)||0), 0);
            });

            let stage8Qty = 0;
            let otherStageQty = 0;
            
            processingRows.forEach(row => {
                const sq = (typeof row.sq === 'string' ? JSON.parse(row.sq) : row.sq) || {};
                const pieces = Object.entries(sq)
                    .filter(([key]) => key !== '_meta')
                    .reduce((sum, [_, qty]) => sum + (parseInt(qty) || 0), 0);

                if (row.stage_id === 8 && row.status === 'processed') {
                    stage8Qty += pieces;
                } else if (row.role_name === 'Fabricator') {
                    // Fabricator Logic (Partial Receipts)
                    let received = 0;
                    if (sq._meta && sq._meta.received) {
                        received = Object.values(sq._meta.received).reduce((a, b) => a + Number(b), 0);
                    }
                    const packed = (sq._meta && sq._meta.packed_qty) || 0;
                    stage8Qty += (received - packed);
                    otherStageQty += (pieces - received); 
                } else {
                    otherStageQty += pieces;
                }
            });

            // 4. Calculate STATUS
            const totalCompletedWork = stage8Qty + totalDispatched;
            let calculatedStatus = order.status; 

            if (order.dispatch_status === 'Delivered') {
                calculatedStatus = 'Delivered';
            } else if (totalOrderQty > 0) {
                 if (deliveredQty === totalOrderQty) {
                     calculatedStatus = 'Delivered';
                 } else if (totalDispatched === totalOrderQty) {
                     calculatedStatus = 'Packed';
                 } else if (totalCompletedWork >= totalOrderQty) {
                     calculatedStatus = 'Completed'; 
                 } else if (otherStageQty > 0 || totalCompletedWork > 0) {
                     calculatedStatus = 'Processing';
                 } else if (cutStockQty > 0) {
                     calculatedStatus = 'In Cut Stock';
                 } else {
                     calculatedStatus = 'Pending';
                 }
            } else {
                 calculatedStatus = 'Pending';
            }

            return { 
                ...order, 
                status: calculatedStatus,
            };
        }));

        res.status(200).json({
            success: true,
            orders: ordersWithDetails
        });
    } catch (error) {
        next(error);
    }
};
