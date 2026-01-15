# Quick Setup Guide

Follow these steps to set up and run the Garment ERP application:

## Step 1: Database Setup

Open MySQL and run:

```bash
mysql -u root -p
```

Then execute:

```sql
SOURCE backend/database/schema.sql
SOURCE backend/database/seed.sql
exit
```

## Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in `backend` folder:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_NAME=garment_erp
PORT=5001
```

Start the server:

```bash
npm run dev
```

✅ Backend should now be running on http://localhost:5000

## Step 3: Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend should now be running on http://localhost:5173

## Step 4: Access the Application

Open your browser and go to: **http://localhost:5173**

---

## Default Data

The seed data includes:
- 5 cloth types (Cotton, Silk, Polyester, Linen, Denim)
- Sample cloth stock
- Sample cutting queue and history
- Sample processing items
- Sample orders

## Troubleshooting

**MySQL Connection Error:**
- Make sure MySQL is running
- Check your `.env` credentials
- Verify the database was created: `SHOW DATABASES;`

**Port Already in Use:**
- Backend (5000): Change `PORT` in `.env`
- Frontend (5173): Change port in `vite.config.js`

**Module Not Found:**
- Delete `node_modules` folder
- Run `npm install` again
