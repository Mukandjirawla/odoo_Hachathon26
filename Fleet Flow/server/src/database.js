import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'fleetflow.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('manager', 'dispatcher', 'safety_officer', 'analyst')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT,
    license_plate TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('truck', 'van', 'bike')),
    max_capacity REAL NOT NULL,
    odometer REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'on_trip', 'in_shop', 'retired')),
    region TEXT,
    acquisition_cost REAL DEFAULT 0,
    year INTEGER,
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    license_number TEXT UNIQUE NOT NULL,
    license_expiry TEXT NOT NULL,
    license_category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'off_duty' CHECK(status IN ('on_duty', 'off_duty', 'on_trip', 'suspended')),
    safety_score REAL DEFAULT 100,
    trip_completion_rate REAL DEFAULT 100,
    fuel_score REAL DEFAULT 8.0,
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_weight REAL NOT NULL,
    distance_km REAL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'dispatched', 'completed', 'cancelled')),
    eta TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    dispatched_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    final_odometer REAL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (driver_id) REFERENCES drivers(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    cost REAL DEFAULT 0,
    technician TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_shop', 'completed')),
    scheduled_date TEXT,
    completed_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    trip_id INTEGER,
    type TEXT NOT NULL DEFAULT 'fuel' CHECK(type IN ('fuel', 'maintenance', 'toll', 'other')),
    liters REAL,
    cost REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (trip_id) REFERENCES trips(id)
  );
`);

export default db;
