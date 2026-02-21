import { Router } from 'express';
import db from '../database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { type, status, search, region } = req.query;
  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (region) { sql += ' AND region = ?'; params.push(region); }
  if (search) { sql += ' AND (name LIKE ? OR license_plate LIKE ? OR model LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status != ?').get('retired').count;
  const available = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = ?').get('available').count;
  const onTrip = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = ?').get('on_trip').count;
  const inShop = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE status = ?').get('in_shop').count;
  res.json({ total, available, onTrip, inShop });
});

router.get('/:id', (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(vehicle);
});

// PS: Fleet Manager oversees vehicle health, asset lifecycle. Only managers can CRUD vehicles.
router.post('/', authorize('manager'), (req, res) => {
  const { name, model, license_plate, type, max_capacity, odometer, region, acquisition_cost, year } = req.body;
  if (!name || !license_plate || !type || !max_capacity) {
    return res.status(400).json({ error: 'Name, license plate, type, and max capacity are required' });
  }

  const existing = db.prepare('SELECT id FROM vehicles WHERE license_plate = ?').get(license_plate);
  if (existing) return res.status(409).json({ error: 'License plate already registered' });

  const result = db.prepare(
    'INSERT INTO vehicles (name, model, license_plate, type, max_capacity, odometer, region, acquisition_cost, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, model || null, license_plate, type, max_capacity, odometer || 0, region || null, acquisition_cost || 0, year || null);

  res.status(201).json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authorize('manager'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const { name, model, license_plate, type, max_capacity, odometer, status, region, acquisition_cost, year } = req.body;

  db.prepare(`UPDATE vehicles SET name=?, model=?, license_plate=?, type=?, max_capacity=?, odometer=?, status=?, region=?, acquisition_cost=?, year=? WHERE id=?`)
    .run(
      name ?? vehicle.name, model ?? vehicle.model, license_plate ?? vehicle.license_plate,
      type ?? vehicle.type, max_capacity ?? vehicle.max_capacity, odometer ?? vehicle.odometer,
      status ?? vehicle.status, region ?? vehicle.region, acquisition_cost ?? vehicle.acquisition_cost,
      year ?? vehicle.year, req.params.id
    );

  res.json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authorize('manager'), (req, res) => {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  if (vehicle.status === 'on_trip') {
    return res.status(400).json({ error: 'Cannot delete a vehicle that is on a trip' });
  }

  db.prepare('UPDATE vehicles SET status = ? WHERE id = ?').run('retired', req.params.id);
  res.json({ message: 'Vehicle retired successfully' });
});

export default router;
