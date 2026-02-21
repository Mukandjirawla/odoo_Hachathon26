import bcrypt from 'bcryptjs';
import db from './database.js';

console.log('Seeding FleetFlow database...');

db.exec('DELETE FROM expenses');
db.exec('DELETE FROM maintenance_logs');
db.exec('DELETE FROM trips');
db.exec('DELETE FROM drivers');
db.exec('DELETE FROM vehicles');
db.exec('DELETE FROM users');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','vehicles','drivers','trips','maintenance_logs','expenses')");

const hash = (pw) => bcrypt.hashSync(pw, 10);

const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
const users = [
  ['Admin Manager', 'admin@fleetflow.com', hash('admin123'), 'manager'],
  ['Jane Dispatcher', 'dispatcher@fleetflow.com', hash('dispatch123'), 'dispatcher'],
  ['Safety Officer', 'safety@fleetflow.com', hash('safety123'), 'safety_officer'],
  ['Finance Analyst', 'analyst@fleetflow.com', hash('analyst123'), 'analyst'],
];
users.forEach(u => insertUser.run(...u));

const insertVehicle = db.prepare(`INSERT INTO vehicles (name, model, license_plate, type, max_capacity, odometer, status, region, acquisition_cost, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const vehicles = [
  ['Freightliner Cascadia', '2023 Cascadia', 'ABC-1234', 'truck', 9000, 145200, 'available', 'North', 120000, 2023],
  ['Kenworth T680', '2022 T680', 'XYZ-5678', 'truck', 10200, 89400, 'on_trip', 'East', 135000, 2022],
  ['Peterbilt 579', '2021 579', 'DEF-9012', 'truck', 9500, 210800, 'in_shop', 'West', 110000, 2021],
  ['Mercedes Sprinter', '2023 Sprinter', 'KXA-442', 'van', 2500, 32100, 'available', 'North', 45000, 2023],
  ['Volvo FH16', '2022 FH16', 'LOB-993', 'truck', 11000, 67800, 'available', 'South', 155000, 2022],
  ['Ford Transit', '2023 Transit', 'FTR-201', 'van', 1800, 18500, 'available', 'East', 38000, 2023],
  ['Isuzu NPR', '2022 NPR', 'ISZ-330', 'truck', 4500, 55200, 'on_trip', 'West', 62000, 2022],
  ['Cargo Bike Alpha', '2024 eCargo', 'BIK-001', 'bike', 150, 2100, 'available', 'North', 3500, 2024],
  ['Cargo Bike Beta', '2024 eCargo', 'BIK-002', 'bike', 150, 1800, 'available', 'East', 3500, 2024],
  ['Scania R500', '2021 R500', 'SCN-440', 'truck', 12000, 180000, 'available', 'South', 145000, 2021],
  ['MAN TGX', '2022 TGX', 'MAN-558', 'truck', 10500, 95000, 'retired', 'North', 128000, 2022],
  ['DAF XF', '2023 XF', 'DAF-770', 'truck', 10800, 42000, 'available', 'East', 140000, 2023],
];
vehicles.forEach(v => insertVehicle.run(...v));

const insertDriver = db.prepare(`INSERT INTO drivers (name, email, phone, license_number, license_expiry, license_category, status, safety_score, trip_completion_rate, fuel_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const drivers = [
  ['Marcus Jenkins', 'marcus@fleet.com', '+1-555-0101', 'CDL-MJ-9920', '2027-06-15', 'truck', 'on_duty', 98, 94.2, 8.4],
  ['Elena Rodriguez', 'elena@fleet.com', '+1-555-0102', 'CDL-ER-8812', '2026-03-24', 'truck', 'off_duty', 89, 88.5, 7.8],
  ['David Kim', 'david@fleet.com', '+1-555-0103', 'CDL-DK-7701', '2025-01-10', 'truck', 'suspended', 72, 76.0, 6.5],
  ['Sarah Smith', 'sarah@fleet.com', '+1-555-0104', 'CDL-SS-6650', '2027-09-20', 'van', 'on_duty', 95, 97.1, 9.0],
  ['John Doe', 'john@fleet.com', '+1-555-0105', 'CDL-JD-5540', '2027-11-30', 'truck', 'on_trip', 91, 90.8, 7.9],
  ['Mike Ross', 'mike@fleet.com', '+1-555-0106', 'CDL-MR-4430', '2026-08-12', 'van', 'off_duty', 85, 82.3, 7.2],
  ['Lisa Chen', 'lisa@fleet.com', '+1-555-0107', 'CDL-LC-3320', '2027-02-28', 'truck', 'on_duty', 93, 95.0, 8.8],
  ['Alex Kumar', 'alex@fleet.com', '+1-555-0108', 'CDL-AK-2210', '2026-05-15', 'van', 'on_duty', 90, 91.5, 8.1],
];
drivers.forEach(d => insertDriver.run(...d));

const insertTrip = db.prepare(`INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight, distance_km, status, eta, created_at, dispatched_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const trips = [
  [2, 5, 'Chicago, IL', 'Detroit, MI', 8500, 450, 'dispatched', '2026-02-21 14:30', '2026-02-21 06:00', '2026-02-21 07:00', null],
  [7, 1, 'San Francisco, CA', 'Los Angeles, CA', 3200, 382, 'dispatched', '2026-02-21 16:15', '2026-02-21 08:00', '2026-02-21 09:00', null],
  [1, 4, 'New York, NY', 'Boston, MA', 2000, 340, 'completed', null, '2026-02-19 06:00', '2026-02-19 07:00', '2026-02-19 14:45'],
  [4, 7, 'Dallas, TX', 'Houston, TX', 1500, 385, 'completed', null, '2026-02-18 05:30', '2026-02-18 06:00', '2026-02-18 12:30'],
  [5, 8, 'Seattle, WA', 'Portland, OR', 7500, 280, 'completed', null, '2026-02-17 07:00', '2026-02-17 08:00', '2026-02-17 13:00'],
  [6, 6, 'Miami, FL', 'Orlando, FL', 1200, 380, 'completed', null, '2026-02-16 06:00', '2026-02-16 07:00', '2026-02-16 11:30'],
  [10, 1, 'Phoenix, AZ', 'Tucson, AZ', 9000, 180, 'completed', null, '2026-02-15 08:00', '2026-02-15 09:00', '2026-02-15 12:00'],
  [12, 7, 'Denver, CO', 'Salt Lake City, UT', 8000, 820, 'draft', null, '2026-02-21 10:00', null, null],
];
trips.forEach(t => insertTrip.run(...t));

const insertMaintenance = db.prepare(`INSERT INTO maintenance_logs (vehicle_id, service_type, description, cost, technician, status, scheduled_date, completed_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const maintenanceLogs = [
  [3, 'Brake System Flush', 'Full brake fluid replacement and system bleed', 450, 'Dave Miller', 'in_shop', '2026-02-21', null],
  [4, 'Oil & Filter Change', 'Synthetic oil change with cabin air filter', 185, 'Tom Garcia', 'completed', '2026-02-18', '2026-02-18'],
  [5, 'Tire Rotation', 'Four-tire rotation and pressure calibration', 120, 'Jake Wilson', 'scheduled', '2026-02-25', null],
  [1, 'Transmission Service', 'Fluid flush and filter replacement', 680, 'Dave Miller', 'completed', '2026-02-10', '2026-02-11'],
  [7, 'Engine Diagnostic', 'OBD-II scan and check engine analysis', 95, 'Tom Garcia', 'completed', '2026-02-12', '2026-02-12'],
  [11, 'Full Inspection', 'Annual DOT compliance inspection', 350, 'Jake Wilson', 'completed', '2026-01-20', '2026-01-21'],
];
maintenanceLogs.forEach(m => insertMaintenance.run(...m));

const insertExpense = db.prepare(`INSERT INTO expenses (vehicle_id, trip_id, type, liters, cost, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const expenses = [
  [1, 3, 'fuel', 120, 142.50, '2026-02-19', 'Fuel stop at Route 95 station'],
  [1, 3, 'toll', null, 28.00, '2026-02-19', 'I-95 toll charges'],
  [4, 4, 'fuel', 65, 78.50, '2026-02-18', 'Fuel at Dallas hub'],
  [5, 5, 'fuel', 95, 118.75, '2026-02-17', 'Fuel stop near Olympia'],
  [6, 6, 'fuel', 52, 63.20, '2026-02-16', 'Fuel at Turnpike station'],
  [10, 7, 'fuel', 80, 98.40, '2026-02-15', 'Fuel at Phoenix depot'],
  [2, 1, 'fuel', 110, 135.00, '2026-02-21', 'Fuel at Chicago staging area'],
  [7, 2, 'fuel', 75, 92.25, '2026-02-21', 'Fuel at SF depot'],
  [1, null, 'maintenance', null, 680, '2026-02-11', 'Transmission service'],
  [3, null, 'maintenance', null, 450, '2026-02-21', 'Brake system flush'],
  [4, null, 'maintenance', null, 185, '2026-02-18', 'Oil & filter change'],
];
expenses.forEach(e => insertExpense.run(...e));

console.log('Seed complete!');
console.log(`  Users: ${users.length}`);
console.log(`  Vehicles: ${vehicles.length}`);
console.log(`  Drivers: ${drivers.length}`);
console.log(`  Trips: ${trips.length}`);
console.log(`  Maintenance Logs: ${maintenanceLogs.length}`);
console.log(`  Expenses: ${expenses.length}`);
process.exit(0);
