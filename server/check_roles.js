const db = require('./config/database');

async function checkRoles() {
    try {
        const [roles] = await db.query('SELECT * FROM emp_roles');
        console.log('Roles:', roles);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkRoles();
