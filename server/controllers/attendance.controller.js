const db = require('../config/database');

exports.markAttendance = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { entries } = req.body; 
        // Array: [{ emp_id, attendance_details, day_rate, date, remarks }]

        if (!entries || entries.length === 0) {
            throw new Error('No attendance entries');
        }

        for (const entry of entries) {
            const { emp_id, attendance_details, day_rate, date, remarks } = entry;
            
            // 1. Deduplicate: Delete existing log for this emp/date
            await connection.query(
                "DELETE FROM attendance_log WHERE emp_id = ? AND created_on = ?",
                [emp_id, date]
            );

            // 2. Insert Log
            await connection.query(`
                INSERT INTO attendance_log
                (emp_id, attendance_details, day_rate, remarks, created_on)
                VALUES (?, ?, ?, ?, ?)
            `, [emp_id, attendance_details, day_rate, remarks, date]);

            // 3. Logic: If day_rate > 0 (Paid Work), update Account
            if (Number(day_rate) > 0) {
                // Check if a wage was ALREADY added for this exact employee and date (remarks check)
                // Since ledger inserts are chronological, we check for 'Attendance wage' on that day.
                // However, for simplicity and to allow corrections, we let it insert but the user should 
                // manually adjust if they made a mistake. 
                // A better way: ONLY insert if no DR for 'Attendance wage' exists for this emp today.
                
                const [existingWage] = await connection.query(`
                    SELECT id FROM emp_account 
                    WHERE emp_id = ? AND transaction = 'DR' 
                    AND remarks LIKE '%Attendance wage%'
                    AND DATE(datetime) = ?
                `, [emp_id, date]);

                if (existingWage.length === 0) {
                    // Get latest balance for THIS employee
                    const [balRow] = await connection.query(
                        'SELECT balance FROM emp_account WHERE emp_id = ? ORDER BY datetime DESC LIMIT 1',
                        [emp_id]
                    );
                    const currentBal = balRow.length > 0 ? Number(balRow[0].balance) : 0;
                    
                    // Working -> Company owes more -> Balance Increases
                    const newBalance = currentBal + Number(day_rate);

                    await connection.query(`
                        INSERT INTO emp_account
                        (emp_id, transaction, amount, balance, mode, remarks)
                        VALUES (?, 'DR', ?, ?, 'Kind', 'Attendance wage')
                    `, [emp_id, day_rate, newBalance]);
                }
            }
        }

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Attendance marked successfully'
        });

    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

exports.getAttendance = async (req, res, next) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const [rows] = await db.query(`
            SELECT 
                a.*,
                e.name,
                r.role as role_name
            FROM attendance_log a
            JOIN emp_details e ON a.emp_id = e.id
            JOIN emp_roles r ON e.role_id = r.id
            WHERE a.created_on = ?
            ORDER BY e.name ASC
        `, [date]);

        res.status(200).json({
            success: true,
            attendance: rows
        });

    } catch (error) {
        next(error);
    }
};

exports.getAttendanceSummary = async (req, res, next) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and Year required' });
        }

        const [summary] = await db.query(`
            SELECT 
                a.emp_id,
                e.name,
                a.attendance_details,
                COUNT(*) as count
            FROM attendance_log a
            JOIN emp_details e ON a.emp_id = e.id
            WHERE MONTH(a.created_on) = ? AND YEAR(a.created_on) = ?
            GROUP BY a.emp_id, a.attendance_details
            ORDER BY e.name ASC
        `, [month, year]);

        res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {
        next(error);
    }
};
