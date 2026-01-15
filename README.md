# Garment ERP Web Application

A comprehensive ERP system for managing garment production, inventory, and orders designed for a single business owner.

## 🎯 Features

### 1. Dashboard
- Real-time summary of stocks, processing items, and orders
- Recent activity tracking
- Visual statistics cards

### 2. Cloth Cutting Module
- Cutting queue management
- Automatic cloth stock deduction
- Automatic cut stock creation
- Cutting history tracking

### 3. Processing Module
- 9-stage sequential processing flow:
  1. Design & Cut
  2. Stitching
  3. Kaj Button
  4. Washing
  5. Thread Cutting
  6. Press & Packing
  7. Label Tag
  8. Fabrication
  9. Processed
- Stage-wise item grouping
- Forward-only stage progression
- Automatic selling stock creation upon completion

### 4. Stock Management
- **Cloth Stock**: Raw material inventory
- **Cut Stock**: Items ready for processing
- **Selling Stock**: Finished goods ready for sale
- **Dead Stock**: Defective or unusable items
- Auto-synchronization across all stock types

### 5. Orders Module
- Customer order creation
- Multi-item order support
- Order status tracking (Pending → In-Process → Ready → Delivered)
- Order details view
- Status update and deletion

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- React Router DOM
- Axios
- Plain CSS (ERP-style design)

**Backend:**
- Node.js
- Express.js
- MySQL 2
- CORS
- dotenv

## 📋 Prerequisites

- Node.js 18 or higher
- MySQL 8.0 or higher
- npm or yarn

## 🚀 Installation & Setup

### 1. Clone/Navigate to Project Directory

```bash
cd c:\Users\neera\OneDrive\Desktop\th-garment\g
```

### 2. Database Setup

**Create Database:**
```bash
mysql -u root -p
```

In MySQL console:
```sql
SOURCE backend/database/schema.sql
SOURCE backend/database/seed.sql
```

Or manually:
```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

### 3. Backend Setup

**Navigate to backend:**
```bash
cd backend
```

**Install dependencies:**
```bash
npm install
```

**Configure environment:**
Create a `.env` file in the `backend` directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=garment_erp
PORT=5000
```

**Start backend server:**
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### 4. Frontend Setup

**In a new terminal, navigate to frontend:**
```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Start frontend development server:**
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### 5. Access Application

Open your browser and navigate to:
```
http://localhost:5173
```

## 📁 Project Structure

```
g/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── database/
│   │   ├── schema.sql            # Database schema
│   │   └── seed.sql              # Sample data
│   ├── routes/
│   │   ├── dashboardRoutes.js    # Dashboard API
│   │   ├── cuttingRoutes.js      # Cutting module API
│   │   ├── processingRoutes.js   # Processing module API
│   │   ├── stockRoutes.js        # Stock management API
│   │   └── ordersRoutes.js       # Orders API
│   ├── .env                      # Environment variables
│   ├── .env.example              # Environment template
│   ├── package.json
│   └── server.js                 # Express server
│
└── frontend/
    ├── src/
    │   ├── components/           # Reusable components
    │   │   ├── Button.jsx
    │   │   ├── Card.jsx
    │   │   ├── FormInput.jsx
    │   │   ├── FormSelect.jsx
    │   │   ├── Modal.jsx
    │   │   └── Table.jsx
    │   ├── pages/                # Page components
    │   │   ├── Dashboard.jsx
    │   │   ├── ClothCutting.jsx
    │   │   ├── Processing.jsx
    │   │   ├── Stock.jsx
    │   │   └── Orders.jsx
    │   ├── services/
    │   │   └── api.js            # API service layer
    │   ├── App.jsx               # Main app component
    │   ├── main.jsx              # Entry point
    │   └── index.css             # Global styles
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## 🔄 Business Logic

### Stock Auto-Update Flow

1. **Cutting Completion:**
   - Reduces cloth stock by `cloth_used` amount
   - Creates entry in cut stock with status `available`

2. **Processing Start:**
   - Updates cut stock status from `available` to `in_processing`
   - Creates processing entry at first stage

3. **Processing Completion:**
   - Updates cut stock status to `processed`
   - Creates entry in selling stock with status `available`

### Processing Stage Rules

- Items must go through all 9 stages sequentially
- No backward movement allowed
- Only advance to next stage or complete (at stage 9)
- Each stage advancement updates timestamp

## 📊 Database Tables

1. **cloth_type** - Types of cloth materials
2. **cloth_stock** - Raw material inventory
3. **cloth_cutting** - Cutting queue and history
4. **cut_stock** - Items after cutting
5. **processing_stage** - Processing stage definitions
6. **processing** - Active and completed processing items
7. **selling_stock** - Finished goods inventory
8. **dead_stock** - Defective items
9. **orders** - Customer orders
10. **order_details** - Order line items
11. **barcode_details** - Product barcodes

## 🎨 Design Philosophy

- Clean, minimal ERP-style interface
- Responsive layout
- Color-coded status badges
- Intuitive navigation
- Modal-based forms
- Real-time data updates

## 🔒 Security Note

This is a single-user application with no authentication system. It's designed for local use by one admin/business owner only. Do not expose to public internet without adding proper authentication.

## 📝 API Endpoints

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard statistics

### Cutting
- `GET /api/cutting/queue` - View cutting queue
- `POST /api/cutting/queue` - Add to queue
- `PUT /api/cutting/complete/:id` - Complete cutting
- `GET /api/cutting/history` - View history
- `GET /api/cutting/cloth-types` - Get cloth types

### Processing
- `GET /api/processing/active` - Get active items
- `GET /api/processing/delivered` - Get completed items
- `POST /api/processing/start` - Start processing
- `PUT /api/processing/advance/:id` - Move to next stage
- `PUT /api/processing/complete/:id` - Complete processing

### Stock
- `GET /api/stock/cloth` - View cloth stock
- `POST /api/stock/cloth` - Add cloth stock
- `GET /api/stock/cut` - View cut stock
- `GET /api/stock/selling` - View selling stock
- `GET /api/stock/dead` - View dead stock
- `POST /api/stock/dead` - Add dead stock
- `GET /api/stock/cloth-types` - Get cloth types
- `POST /api/stock/cloth-types` - Add cloth type

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update status
- `DELETE /api/orders/:id` - Delete order

## 🐛 Troubleshooting

**Database connection failed:**
- Verify MySQL is running
- Check credentials in `.env` file
- Ensure database `garment_erp` exists

**Backend won't start:**
- Check if port 5000 is available
- Run `npm install` in backend directory
- Verify Node.js version (18+)

**Frontend won't start:**
- Check if port 5173 is available
- Run `npm install` in frontend directory
- Clear Vite cache: `rm -rf node_modules/.vite`

**API calls failing:**
- Ensure backend server is running
- Check browser console for CORS errors
- Verify API endpoints in `/services/api.js`

## 👨‍💻 Development

**Backend Development Mode:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

**Frontend Development Mode:**
```bash
cd frontend
npm run dev  # Hot module replacement enabled
```

**Build for Production:**
```bash
cd frontend
npm run build  # Creates optimized build in dist/
```

## 📄 License

This project is created for internal business use.

---

**Built with ❤️ for efficient garment production management**
