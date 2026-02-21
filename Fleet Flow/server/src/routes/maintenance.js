import { Router } from 'express';
import db from '../database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, vehicle_id, search } = req.query;
  let sql = `
    SELECT m.*, v.name as vehicle_name, v.license_plate, v.model as vehicle_model
    FROM maintenance_logs m
    JOIN vehicles v ON m.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { sql += ' AND m.status = ?'; params.push(status); }
  if (vehicle_id) { sql += ' AND m.vehicle_id = ?'; params.push(vehicle_id); }
  if (search) { sql += ' AND (v.name LIKE ? OR v.license_plate LIKE ? OR m.service_type LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY m.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const log = db.prepare(`
    SELECT m.*, v.name as vehicle_name, v.license_plate
    FROM maintenance_logs m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = ?
  `).get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
  res.json(log);
});

// PS: Manager logs maintenance. Auto-sets vehicle to "In Shop".
router.post('/', authorize('manager'), (req, res) => {
  const { vehicle_id, service_type, description, cost, technician, scheduled_date } = req.body;
  if (!vehicle_id || !service_type) {
    return res.status(400).json({ error: 'Vehicle ID and service type are required' });
  }

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status === 'on_trip') {
    return res.status(400).json({ error: 'Cannot schedule maintenance for a vehicle currently on trip' });
  }

  const result = db.prepare(
    'INSERT INTO maintenance_logs (vehicle_id, service_type, description, cost, technician, status, scheduled_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(vehicle_id, service_type, description || null, cost || 0, technician || null, 'in_shop', scheduled_date || null);

  db.prepare("UPDATE vehicles SET status = 'in_shop' WHERE id = ?").run(vehicle_id);

  const log = db.prepare(`
    SELECT m.*, v.name as vehicle_name, v.license_plate
    FROM maintenance_logs m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(log);
});

router.put('/:id', authorize('manager'), (req, res) => {
  const log = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
  if (log.status === 'completed') {
    return res.status(400).json({ error: 'Cannot edit a completed maintenance log' });
  }

  const { service_type, description, cost, technician, scheduled_date } = req.body;

  db.prepare('UPDATE maintenance_logs SET service_type=?, description=?, cost=?, technician=?, scheduled_date=? WHERE id=?')
    .run(
      service_type ?? log.service_type, description ?? log.description,
      cost ?? log.cost, technician ?? log.technician,
      scheduled_date ?? log.scheduled_date, req.params.id
    );

  const updated = db.prepare(`
    SELECT m.*, v.name as vehicle_name, v.license_plate
    FROM maintenance_logs m JOIN vehicles v ON m.vehicle_id = v.id WHERE m.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.delete('/:id', authorize('manager'), (req, res) => {
  const log = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
  if (log.status === 'in_shop') {
    const otherActive = db.prepare(
      "SELECT COUNT(*) as count FROM maintenance_logs WHERE vehicle_id = ? AND status = 'in_shop' AND id != ?"
    ).get(log.vehicle_id, req.params.id).count;
    if (otherActive === 0) {
      db.prepare("UPDATE vehicles SET status = 'available' WHERE id = ?").run(log.vehicle_id);
    }
  }
  db.prepare('DELETE FROM maintenance_logs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Maintenance log deleted successfully' });
});

router.put('/:id/complete', authorize('manager'), (req, res) => {
  const log = db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(req.params.id);
  if (!log) return res.status(404).json({ error: 'Maintenance log not found' });
  if (log.status === 'completed') {
    return res.status(400).json({ error: 'Already completed' });
  }

  const { cost } = req.body;

  db.transaction(() => {
    db.prepare("UPDATE maintenance_logs SET status = 'completed', completed_date = date('now'), cost = ? WHERE id = ?")
      .run(cost ?? log.cost, req.params.id);

    const otherActive = db.prepare(
      "SELECT COUNT(*) as count FROM maintenance_logs WHERE vehicle_id = ? AND status = 'in_shop' AND id != ?"
    ).get(log.vehicle_id, req.params.id).count;

    if (otherActive === 0) {
      db.prepare("UPDATE vehicles SET status = 'available' WHERE id = ?").run(log.vehicle_id);
    }

    if (cost) {
      db.prepare(
        "INSERT INTO expenses (vehicle_id, type, cost, date, description) VALUES (?, 'maintenance', ?, date('now'), ?)"
      ).run(log.vehicle_id, cost, log.service_type);
    }
  })();

  res.json(db.prepare('SELECT * FROM maintenance_logs WHERE id = ?').get(req.params.id));
});

export default router;
