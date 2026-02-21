import { Router } from 'express';
import db from '../database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM drivers WHERE 1=1';
  const params = [];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND (name LIKE ? OR license_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM drivers').get().count;
  const onDuty = db.prepare('SELECT COUNT(*) as count FROM drivers WHERE status = ?').get('on_duty').count;
  const offDuty = db.prepare('SELECT COUNT(*) as count FROM drivers WHERE status = ?').get('off_duty').count;
  const suspended = db.prepare('SELECT COUNT(*) as count FROM drivers WHERE status = ?').get('suspended').count;
  const avgSafety = db.prepare('SELECT AVG(safety_score) as avg FROM drivers WHERE status != ?').get('suspended').avg || 0;
  const expiringLicenses = db.prepare(
    "SELECT COUNT(*) as count FROM drivers WHERE license_expiry <= date('now', '+30 days') AND status != 'suspended'"
  ).get().count;
  res.json({ total, onDuty, offDuty, suspended, avgSafety: Math.round(avgSafety * 10) / 10, expiringLicenses });
});

router.get('/available', (req, res) => {
  const { category } = req.query;
  let sql = `SELECT * FROM drivers WHERE status IN ('on_duty', 'off_duty') AND license_expiry > date('now')`;
  const params = [];
  if (category) { sql += ' AND license_category = ?'; params.push(category); }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  res.json(driver);
});

// PS: Fleet Manager adds drivers. Safety Officer monitors but doesn't create.
router.post('/', authorize('manager'), (req, res) => {
  const { name, email, phone, license_number, license_expiry, license_category } = req.body;
  if (!name || !license_number || !license_expiry || !license_category) {
    return res.status(400).json({ error: 'Name, license number, expiry, and category are required' });
  }

  const existing = db.prepare('SELECT id FROM drivers WHERE license_number = ?').get(license_number);
  if (existing) return res.status(409).json({ error: 'License number already registered' });

  const result = db.prepare(
    'INSERT INTO drivers (name, email, phone, license_number, license_expiry, license_category) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email || null, phone || null, license_number, license_expiry, license_category);

  res.status(201).json(db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid));
});

// PS: Manager manages drivers; Safety Officer monitors compliance & can update safety scores/status;
// Dispatcher can see driver status for trip assignment
router.put('/:id', authorize('manager', 'safety_officer'), (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const { name, email, phone, license_number, license_expiry, license_category, status, safety_score } = req.body;

  db.prepare(`UPDATE drivers SET name=?, email=?, phone=?, license_number=?, license_expiry=?, license_category=?, status=?, safety_score=? WHERE id=?`)
    .run(
      name ?? driver.name, email ?? driver.email, phone ?? driver.phone,
      license_number ?? driver.license_number, license_expiry ?? driver.license_expiry,
      license_category ?? driver.license_category, status ?? driver.status,
      safety_score ?? driver.safety_score, req.params.id
    );

  res.json(db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authorize('manager'), (req, res) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  if (driver.status === 'on_trip') {
    return res.status(400).json({ error: 'Cannot remove a driver currently on a trip' });
  }

  const activeTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE driver_id = ? AND status IN ('draft','dispatched')").get(req.params.id).count;
  if (activeTrips > 0) {
    return res.status(400).json({ error: 'Driver has active trips. Cancel or complete them first.' });
  }

  db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Driver removed successfully' });
});

export default router;
