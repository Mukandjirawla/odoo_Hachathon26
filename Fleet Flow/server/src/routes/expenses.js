import { Router } from 'express';
import db from '../database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { vehicle_id, trip_id, type } = req.query;
  let sql = `
    SELECT e.*, v.name as vehicle_name, v.license_plate
    FROM expenses e
    JOIN vehicles v ON e.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (vehicle_id) { sql += ' AND e.vehicle_id = ?'; params.push(vehicle_id); }
  if (trip_id) { sql += ' AND e.trip_id = ?'; params.push(trip_id); }
  if (type) { sql += ' AND e.type = ?'; params.push(type); }
  sql += ' ORDER BY e.date DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/summary/:vehicleId', (req, res) => {
  const vehicleId = req.params.vehicleId;
  const fuel = db.prepare("SELECT COALESCE(SUM(cost), 0) as total, COALESCE(SUM(liters), 0) as liters FROM expenses WHERE vehicle_id = ? AND type = 'fuel'").get(vehicleId);
  const maintenance = db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM expenses WHERE vehicle_id = ? AND type = 'maintenance'").get(vehicleId);
  const other = db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM expenses WHERE vehicle_id = ? AND type NOT IN ('fuel', 'maintenance')").get(vehicleId);

  res.json({
    fuel: fuel.total,
    fuelLiters: fuel.liters,
    maintenance: maintenance.total,
    other: other.total,
    totalOperational: fuel.total + maintenance.total + other.total
  });
});

// PS: Manager and Dispatcher can log expenses (fuel, tolls after trips)
router.post('/', authorize('manager', 'dispatcher'), (req, res) => {
  const { vehicle_id, trip_id, type, liters, cost, date, description } = req.body;
  if (!vehicle_id || !cost || !date) {
    return res.status(400).json({ error: 'Vehicle ID, cost, and date are required' });
  }

  const result = db.prepare(
    'INSERT INTO expenses (vehicle_id, trip_id, type, liters, cost, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(vehicle_id, trip_id || null, type || 'fuel', liters || null, cost, date, description || null);

  const expense = db.prepare(`
    SELECT e.*, v.name as vehicle_name, v.license_plate
    FROM expenses e JOIN vehicles v ON e.vehicle_id = v.id WHERE e.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(expense);
});

router.put('/:id', authorize('manager', 'dispatcher'), (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  const { type, liters, cost, date, description } = req.body;

  db.prepare('UPDATE expenses SET type=?, liters=?, cost=?, date=?, description=? WHERE id=?')
    .run(type ?? expense.type, liters ?? expense.liters, cost ?? expense.cost,
         date ?? expense.date, description ?? expense.description, req.params.id);

  const updated = db.prepare(`
    SELECT e.*, v.name as vehicle_name, v.license_plate
    FROM expenses e JOIN vehicles v ON e.vehicle_id = v.id WHERE e.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.delete('/:id', authorize('manager'), (req, res) => {
  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });

  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Expense deleted successfully' });
});

export default router;
