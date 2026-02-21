# FleetFlow - Modular Fleet & Logistics Management System

A full-stack fleet management application that replaces manual logbooks with a centralized, rule-based digital hub for optimizing delivery fleet lifecycle, driver safety, and financial performance.

## Architecture

- **Frontend:** React 19 + Vite + Tailwind CSS + React Router + Recharts
- **Backend:** Node.js + Express + SQLite (via better-sqlite3)
- **Auth:** JWT-based with Role-Based Access Control (RBAC)

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Seed the database with sample data
npm run seed

# 3. Start both servers (backend on :3001, frontend on :5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

## Demo Accounts

| Role            | Email                      | Password     |
|-----------------|----------------------------|--------------|
| Manager         | admin@fleetflow.com        | admin123     |
| Dispatcher      | dispatcher@fleetflow.com   | dispatch123  |
| Safety Officer  | safety@fleetflow.com       | safety123    |
| Financial Analyst | analyst@fleetflow.com    | analyst123   |

## System Pages

1. **Login & Authentication** - Secure access with RBAC (Manager vs Dispatcher permissions)
2. **Command Center Dashboard** - KPIs: Active Fleet, Maintenance Alerts, Utilization Rate, Pending Cargo
3. **Vehicle Registry** - CRUD operations for vehicles with status management (Available/On Trip/In Shop/Retired)
4. **Trip Dispatcher** - Create trips with cargo weight validation, lifecycle management (Draft → Dispatched → Completed)
5. **Maintenance Logs** - Service tracking that auto-updates vehicle status to "In Shop"
6. **Trip Expenses & Fuel Logging** - Financial tracking per vehicle with automated Total Operational Cost
7. **Driver Performance** - Compliance management with license expiry tracking and safety scores
8. **Operational Analytics** - Charts, fuel efficiency metrics, Vehicle ROI, and CSV/PDF export

## Business Logic Implemented

- **Cargo Validation:** Prevents trip creation if cargo weight exceeds vehicle max capacity
- **License Compliance:** Blocks driver assignment if license is expired
- **Status Auto-Updates:** Dispatching a trip sets vehicle + driver to "On Trip"; completing reverts to "Available"
- **Maintenance Lock:** Adding a service log auto-sets vehicle to "In Shop", removing it from dispatcher pool
- **RBAC:** Managers have full access; Dispatchers can create trips/vehicles; Safety Officers manage drivers

## API Endpoints

| Resource     | Endpoints |
|-------------|-----------|
| Auth        | POST `/api/auth/login`, POST `/api/auth/register`, GET `/api/auth/me` |
| Vehicles    | GET/POST `/api/vehicles`, GET/PUT/DELETE `/api/vehicles/:id`, GET `/api/vehicles/stats` |
| Drivers     | GET/POST `/api/drivers`, GET/PUT `/api/drivers/:id`, GET `/api/drivers/stats`, GET `/api/drivers/available` |
| Trips       | GET/POST `/api/trips`, GET `/api/trips/:id`, PUT `/api/trips/:id/dispatch\|complete\|cancel` |
| Maintenance | GET/POST `/api/maintenance`, GET `/api/maintenance/:id`, PUT `/api/maintenance/:id/complete` |
| Expenses    | GET/POST `/api/expenses`, GET `/api/expenses/summary/:vehicleId` |
| Analytics   | GET `/api/analytics/dashboard\|fuel-efficiency\|vehicle-roi\|cost-per-km` |
| Reports     | GET `/api/analytics/export/csv`, GET `/api/analytics/export/pdf` |

## Project Structure

```
├── server/                 # Express.js backend
│   └── src/
│       ├── index.js        # Server entry point
│       ├── database.js     # SQLite schema & connection
│       ├── seed.js         # Sample data seeder
│       ├── middleware/
│       │   └── auth.js     # JWT auth & RBAC middleware
│       └── routes/
│           ├── auth.js
│           ├── vehicles.js
│           ├── drivers.js
│           ├── trips.js
│           ├── maintenance.js
│           ├── expenses.js
│           └── analytics.js
├── client/                 # React frontend
│   └── src/
│       ├── App.jsx
│       ├── api/client.js   # API client wrapper
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── components/
│       │   └── Layout.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── VehicleRegistry.jsx
│           ├── TripDispatcher.jsx
│           ├── MaintenanceLogs.jsx
│           ├── TripExpenses.jsx
│           ├── DriverPerformance.jsx
│           └── Analytics.jsx
                
```
