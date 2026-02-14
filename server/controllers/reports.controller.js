const db = require('../config/database');

exports.getSalesSummary = async (req, res, next) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ success: false, message: 'Start and End dates required' });
        }

        const [summary] = await db.query(`
            SELECT 
                DATE(created_on) as date,
                COUNT(*) as orders,
                SUM(total) as revenue
            FROM sales_history
            WHERE DATE(created_on) BETWEEN ? AND ?
            GROUP BY DATE(created_on)
            ORDER BY date DESC
        `, [start, end]);

        res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {
        next(error);
    }
};

exports.getProductionSummary = async (req, res, next) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and Year required' });
        }

        const [summary] = await db.query(`
            SELECT 
                ps.stage_name,
                COUNT(p.id) as completed
            FROM processing p
            JOIN process_stage ps ON p.stage_id = ps.id
            WHERE p.status = 'processed'
            AND MONTH(p.updated_on) = ?
            AND YEAR(p.updated_on) = ?
            GROUP BY p.stage_id, ps.stage_name
            ORDER BY p.stage_id ASC
        `, [month, year]);

        res.status(200).json({
            success: true,
            summary
        }); // Added explicit return for consistency

    } catch (error) {
        next(error);
    }
};

exports.getInventoryValue = async (req, res, next) => {
    try {
        // Fabric Stock (Meters)
        const [fabricRows] = await db.query('SELECT SUM(total_quantity) as meters FROM cloth_detail');
        const fabric_stock = fabricRows[0].meters || 0;

        // Finished Goods Value
        const [goodsRows] = await db.query('SELECT SUM(price) as value FROM selling_stock');
        const finished_goods_value = goodsRows[0].value || 0;

        res.status(200).json({
            success: true,
            fabric_stock: Number(fabric_stock),
            finished_goods_value: Number(finished_goods_value)
        });

    } catch (error) {
        next(error);
    }
};

exports.getProfitLoss = async (req, res, next) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and Year required' });
        }

        // Revenue
        const [revRows] = await db.query(`
            SELECT SUM(total) as revenue 
            FROM sales_history
            WHERE MONTH(created_on) = ? AND YEAR(created_on) = ?
        `, [month, year]);
        const revenue = Number(revRows[0].revenue || 0);

        // Labor Cost (Transactions where company owes employees -> DR)
        // Usually, 'DR' in emp_account means Liability Increase (Wage Earned).
        // 'CR' is Payment (Cash Outflow). Cost is incurred when 'Wage Earned'.
        const [laborRows] = await db.query(`
            SELECT SUM(amount) as cost 
            FROM emp_account
            WHERE transaction = 'DR'
            AND MONTH(datetime) = ? AND YEAR(datetime) = ?
        `, [month, year]);
        const labor_cost = Number(laborRows[0].cost || 0);

        // Fabric Cost
        const fabric_cost = 0; // Placeholder

        const profit = revenue - (labor_cost + fabric_cost);

        res.status(200).json({
            success: true,
            month,
            year,
            revenue,
            labor_cost,
            fabric_cost,
            net_profit: profit
        });

    } catch (error) {
        next(error);
    }
};

exports.getOutstandingPayments = async (req, res, next) => {
    try {
        // Clients (Receivables) - They owe us (Positive Balance usually)
        // Subquery finding MAX(id) per group is standard for 'latest record' in MySQL < 8.0 
        // or simple logic if not using window functions
        const [clients] = await db.query(`
            SELECT 
                org.org_name,
                oa.balance
            FROM organization org
            JOIN org_account oa ON org.id = oa.org_id
            WHERE oa.id IN (
                SELECT MAX(id) FROM org_account GROUP BY org_id
            )
            AND oa.balance > 0
        `);

        // Employees (Payables) - We owe them (Positive Balance usually)
        const [employees] = await db.query(`
            SELECT 
                e.name,
                ea.balance
            FROM emp_details e
            JOIN emp_account ea ON e.id = ea.emp_id
            WHERE ea.id IN (
                SELECT MAX(id) FROM emp_account GROUP BY emp_id
            )
            AND ea.balance > 0
        `);

        res.status(200).json({
            success: true,
            receivables_from_clients: clients,
            payables_to_employees: employees
        });

    } catch (error) {
        next(error);
    }
};
