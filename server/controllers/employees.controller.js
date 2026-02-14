const db = require('../config/database');

// --- GETTERS ---

exports.getAllEmployees = async (req, res, next) => {
    try {
        // Fetch employees with their current balance
        // Subquery gets the latest balance from emp_account
        const [employees] = await db.query(`
            SELECT 
                e.*,
                r.role as role_name,
                COALESCE(
                    (SELECT balance FROM emp_account 
                     WHERE emp_id = e.id 
                     ORDER BY datetime DESC LIMIT 1),
                    0
                ) as current_balance
            FROM emp_details e
            JOIN emp_roles r ON e.role_id = r.id
            ORDER BY e.name ASC
        `);

        res.status(200).json({
            success: true,
            employees
        });

    } catch (error) {
        next(error);
    }
};

exports.getEmployeeAccount = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [ledger] = await db.query(`
            SELECT * FROM emp_account
            WHERE emp_id = ?
            ORDER BY datetime DESC
            LIMIT 100
        `, [id]);

        res.status(200).json({
            success: true,
            ledger
        });

    } catch (error) {
        next(error);
    }
};

exports.getRoles = async (req, res, next) => {
    try {
        const [roles] = await db.query('SELECT * FROM emp_roles ORDER BY role');
        res.status(200).json({ success: true, roles });
    } catch (error) {
        next(error);
    }
};

// --- ACTIONS ---

exports.createEmployee = async (req, res, next) => {
    try {
        const { name, adhaar, role_id, phone } = req.body;

        const [result] = await db.query(`
            INSERT INTO emp_details (name, adhaar, role_id, phone)
            VALUES (?, ?, ?, ?)
        `, [name, adhaar, role_id, phone]);

        res.status(201).json({
            success: true,
            message: 'Employee created',
            empId: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

exports.updateEmployee = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, adhaar, role_id, phone } = req.body;

        const [result] = await db.query(`
            UPDATE emp_details
            SET name = ?, adhaar = ?, role_id = ?, phone = ?
            WHERE id = ?
        `, [name, adhaar, role_id, phone, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({ success: true, message: 'Employee updated' });

    } catch (error) {
        next(error);
    }
};

exports.makePayment = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params; // emp_id
        const { amount, mode, remarks } = req.body;

        if (!amount || amount <= 0) {
            throw new Error('Invalid amount');
        }

        // 1. Get current balance
        const [balRow] = await connection.query(
            'SELECT balance FROM emp_account WHERE emp_id = ? ORDER BY datetime DESC LIMIT 1',
            [id]
        );
        const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;

        // 2. Calculate New Balance (Payment -> Liability Decreases)
        const newBalance = currentBal - Number(amount);

        // 3. Insert Transaction
        await connection.query(`
            INSERT INTO emp_account
            (emp_id, transaction, amount, balance, mode, remarks)
            VALUES (?, 'CR', ?, ?, ?, ?)
        `, [id, amount, newBalance, mode, remarks]);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Payment recorded successfully',
            newBalance
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
