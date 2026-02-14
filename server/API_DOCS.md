# TH Garments ERP - API Documentation

## Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/api/auth/login` | Login user, returns JWT cookie & user info. |
| POST | `/api/auth/register` | Register new user (Admin). |
| POST | `/api/auth/logout` | Clear auth cookie. |
| GET | `/api/auth/me` | Get current user profile. |

## Dashboard
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/dashboard/stats` | Get aggregate counts (Orders, Employees, Stock). |
| GET | `/api/dashboard/recent-orders` | Get last 5 active orders. |

## Fabric Inventory
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/fabric` | List aggregated fabric stock. |
| POST | `/api/fabric` | Create new fabric type definition. |
| GET | `/api/fabric/:id/rolls` | Get rolls for specific fabric. |
| POST | `/api/fabric/:id/rolls` | Add new inventory rolls. |

## Items & Clients
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/items` | List base item types. |
| POST | `/api/items` | Create new item. |
| GET | `/api/clients` | List organizations/clients. |
| POST | `/api/clients` | Create new client. |
| POST | `/api/clients/product` | Map product to client with price list. |

## Orders
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/orders` | List all orders (filter by status). |
| POST | `/api/orders` | Create new order (includes order details). |
| PUT | `/api/orders/:id/status` | Update order status. |

## Cutting Department
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/cutting/pending-orders` | Orders ready for cutting. |
| POST | `/api/cutting` | Start cutting job (assign to cutter). |
| PUT | `/api/cutting/:id/fabric-usage` | Record fabric consumption (updates inventory). |
| PUT | `/api/cutting/:id/complete` | Finish job -> creates Cut Stock. |

## Production Processing (Kanban)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/processing/board` | Kanban board view (Stage 0-8). |
| POST | `/api/processing/assign` | Assign worker to a stage. |
| PUT | `/api/processing/:id/complete-stage` | Finish stage, pay worker, move to next. |

## Sales & Finished Goods
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/sales/stock` | Available Finished Goods (by size). |
| POST | `/api/sales` | Create Invoice/Sale (Deducts stock, Debits Client). |

## Employees & Attendance
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/employees` | List employees with LIVE balance. |
| POST | `/api/attendance` | Mark daily attendance (Calculates wages). |
| POST | `/api/employees/:id/payment` | Record payment to employee. |

## Financial Reports
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/api/reports/sales-summary` | Sales grouped by date (Start-End). |
| GET | `/api/reports/profit-loss` | Revenue vs Labor Cost (Month/Year). |
| GET | `/api/reports/inventory-value` | Value of Fabric + Finished Goods. |
| GET | `/api/reports/outstanding` | Receivables & Payables. |
