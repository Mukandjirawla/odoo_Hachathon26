import { Router } from 'express';
import db from '../database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, vehicle_id, driver_id } = req.query;
  let sql = `
    SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity,
           d.name as driver_name, d.license_number
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (vehicle_id) { sql += ' AND t.vehicle_id = ?'; params.push(vehicle_id); }
  if (driver_id) { sql += ' AND t.driver_id = ?'; params.push(driver_id); }
  sql += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/pending-cargo', (req, res) => {
  const count = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'draft'").get().count;
  res.json({ pendingCargo: count });
});

router.get('/:id', (req, res) => {
  const trip = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity,
           d.name as driver_name, d.license_number
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

// PS: Dispatchers create trips, assign drivers, validate cargo. Manager can too.
router.post('/', authorize('manager', 'dispatcher'), (req, res) => {
  const { vehicle_id, driver_id, origin, destination, cargo_weight, eta } = req.body;
  if (!vehicle_id || !driver_id || !origin || !destination || cargo_weight == null) {
    return res.status(400).json({ error: 'Vehicle, driver, origin, destination, and cargo weight are required' });
  }

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status !== 'available') {
    return res.status(400).json({ error: `Vehicle is currently ${vehicle.status} and cannot be assigned` });
  }

  if (cargo_weight > vehicle.max_capacity) {
    return res.status(400).json({
      error: `Cargo weight (${cargo_weight}kg) exceeds vehicle max capacity (${vehicle.max_capacity}kg)`,
      code: 'CARGO_OVERWEIGHT'
    });
  }

  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (driver.status === 'suspended') {
    return res.status(400).json({ error: 'Driver is suspended and cannot be assigned' });
  }
  if (driver.status === 'on_trip') {
    return res.status(400).json({ error: 'Driver is already on a trip' });
  }

  if (new Date(driver.license_expiry) < new Date()) {
    return res.status(400).json({ error: 'Driver license has expired. Cannot assign to trip.', code: 'LICENSE_EXPIRED' });
  }

  const result = db.prepare(
    'INSERT INTO trips (vehicle_id, driver_id, origin, destination, cargo_weight, eta, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(vehicle_id, driver_id, origin, destination, cargo_weight, eta || null, 'draft');

  const trip = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity,
           d.name as driver_name
    FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(trip);
});

router.put('/:id', authorize('manager', 'dispatcher'), (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft trips can be edited' });
  }

  const { origin, destination, cargo_weight, eta } = req.body;

  if (cargo_weight != null) {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(trip.vehicle_id);
    if (cargo_weight > vehicle.max_capacity) {
      return res.status(400).json({
        error: `Cargo weight (${cargo_weight}kg) exceeds vehicle max capacity (${vehicle.max_capacity}kg)`,
        code: 'CARGO_OVERWEIGHT'
      });
    }
  }

  db.prepare('UPDATE trips SET origin=?, destination=?, cargo_weight=?, eta=? WHERE id=?')
    .run(origin ?? trip.origin, destination ?? trip.destination, cargo_weight ?? trip.cargo_weight, eta ?? trip.eta, req.params.id);

  const updated = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity,
           d.name as driver_name, d.license_number
    FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.delete('/:id', authorize('manager', 'dispatcher'), (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft trips can be deleted' });
  }

  db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
  res.json({ message: 'Trip deleted successfully' });
});

// PS: Lifecycle: Draft → Dispatched → Completed → Cancelled
router.put('/:id/dispatch', authorize('manager', 'dispatcher'), (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft trips can be dispatched' });
  }

  const updateTrip = db.prepare("UPDATE trips SET status = 'dispatched', dispatched_at = datetime('now') WHERE id = ?");
  const updateVehicle = db.prepare("UPDATE vehicles SET status = 'on_trip' WHERE id = ?");
  const updateDriver = db.prepare("UPDATE drivers SET status = 'on_trip' WHERE id = ?");

  db.transaction(() => {
    updateTrip.run(req.params.id);
    updateVehicle.run(trip.vehicle_id);
    updateDriver.run(trip.driver_id);
  })();

  res.json(db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id));
});

// PS: Completion: Driver marks trip "Done," enters final Odometer. Status → Available.
router.put('/:id/complete', authorize('manager', 'dispatcher'), (req, res) => {
  const { final_odometer, distance_km } = req.body;
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status !== 'dispatched') {
    return res.status(400).json({ error: 'Only dispatched trips can be completed' });
  }

  const updateTrip = db.prepare("UPDATE trips SET status = 'completed', completed_at = datetime('now'), final_odometer = ?, distance_km = ? WHERE id = ?");
  const updateVehicle = db.prepare("UPDATE vehicles SET status = 'available', odometer = COALESCE(?, odometer) WHERE id = ?");
  const updateDriver = db.prepare("UPDATE drivers SET status = 'on_duty' WHERE id = ?");

  db.transaction(() => {
    updateTrip.run(final_odometer || null, distance_km || trip.distance_km, req.params.id);
    updateVehicle.run(final_odometer, trip.vehicle_id);
    updateDriver.run(trip.driver_id);
  })();

  res.json(db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id));
});

router.put('/:id/cancel', authorize('manager', 'dispatcher'), (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    return res.status(400).json({ error: 'Trip is already finalized' });
  }

  const updateTrip = db.prepare("UPDATE trips SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?");

  db.transaction(() => {
    updateTrip.run(req.params.id);
    if (trip.status === 'dispatched') {
      db.prepare("UPDATE vehicles SET status = 'available' WHERE id = ?").run(trip.vehicle_id);
      db.prepare("UPDATE drivers SET status = 'on_duty' WHERE id = ?").run(trip.driver_id);
    }
  })();

  res.json(db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id));
});

export default router;
