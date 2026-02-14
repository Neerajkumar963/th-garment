const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const db = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const requestLogger = require('./middleware/requestLogger');
const runStartupCheck = require('./utils/startup-check');

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Logging Middleware
app.use(requestLogger);

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const fabricRoutes = require('./routes/fabric.routes');
const itemsRoutes = require('./routes/items.routes');
const clientsRoutes = require('./routes/clients.routes');
const ordersRoutes = require('./routes/orders.routes');
const cuttingRoutes = require('./routes/cutting.routes');
const processingRoutes = require('./routes/processing.routes');
const salesRoutes = require('./routes/sales.routes');
const employeesRoutes = require('./routes/employees.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const reportsRoutes = require('./routes/reports.routes');
const { protect } = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/error.middleware');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', protect, dashboardRoutes);
app.use('/api/fabric', protect, fabricRoutes);
app.use('/api/items', protect, itemsRoutes);
app.use('/api/clients', protect, clientsRoutes);
app.use('/api/orders', protect, ordersRoutes);
app.use('/api/cutting', protect, cuttingRoutes);
app.use('/api/processing', protect, processingRoutes);
app.use('/api/sales', protect, salesRoutes);
app.use('/api/employees', protect, employeesRoutes);
app.use('/api/attendance', protect, attendanceRoutes);
app.use('/api/reports', protect, reportsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "TH Garments API running"
    });
});

// DB Test
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT COUNT(*) as count FROM cloth_type');
        res.status(200).json({
            status: "success",
            message: "Database connection successful",
            count: rows[0].count
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: "error",
            message: "Database connection failed",
            error: error.message
        });
    }
});

// Error Middleware
app.use(errorHandler);

// Start Server
// Start Server
const startServer = async () => {
    await runStartupCheck();
    
    app.listen(PORT, () => {
        console.log(`
        ============================================
        🚀 TH Garments ERP Server Running
        ============================================
        Port: ${PORT}
        Environment: ${process.env.NODE_ENV || 'development'}
        Database: ${process.env.DB_NAME}
        ============================================
        `);
    });
};

startServer();
