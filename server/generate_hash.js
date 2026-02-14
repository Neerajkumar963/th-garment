const bcrypt = require('bcryptjs');

async function generateHash() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    console.log('Password: admin123');
    console.log('Hash:', hash);
}

generateHash();
