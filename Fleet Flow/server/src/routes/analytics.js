import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fleetflow-secret-key-change-in-production';

function authenticateExport(req, res, next) {
  if (req.query.token) {
    try {
      req.user = jwt.verify(req.query.token, JWT_SECRET);
      return next();
    } catch { /* fall through */ }
  }
  return authenticate(req, res, next);
}

const router = Router();

router.get('/dashboard', authenticate, (req, res) => {
  const activeFleet = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'on_trip'").get().count;
  const maintenanceAlerts = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'in_shop'").get().count;
  const totalActive = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status != 'retired'").get().count;
  const assigned = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status IN ('on_trip', 'in_shop')").get().count;
  const utilizationRate = totalActive > 0 ? Math.round((assigned / totalActive) * 100) : 0;
  const pendingCargo = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'draft'").get().count;

  const recentTrips = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.license_plate, d.name as driver_name
    FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id
    ORDER BY t.created_at DESC LIMIT 5
  `).all();

  res.json({ activeFleet, maintenanceAlerts, utilizationRate, pendingCargo, recentTrips });
});

router.get('/fuel-efficiency', authenticate, (req, res) => {
  const data = db.prepare(`
    SELECT v.id, v.name, v.license_plate,
      COALESCE(SUM(e.liters), 0) as total_liters,
      COALESCE(SUM(t.distance_km), 0) as total_km,
      CASE WHEN COALESCE(SUM(e.liters), 0) > 0
        THEN ROUND(COALESCE(SUM(t.distance_km), 0) / SUM(e.liters), 2)
        ELSE 0
      END as km_per_liter
    FROM vehicles v
    LEFT JOIN trips t ON t.vehicle_id = v.id AND t.status = 'completed'
    LEFT JOIN expenses e ON e.vehicle_id = v.id AND e.type = 'fuel'
    WHERE v.status != 'retired'
    GROUP BY v.id
    HAVING total_km > 0
    ORDER BY km_per_liter DESC
  `).all();

  res.json(data);
});

router.get('/vehicle-roi', authenticate, (req, res) => {
  const data = db.prepare(`
    SELECT v.id, v.name, v.license_plate, v.acquisition_cost,
      COALESCE(tc.trip_count, 0) as trip_count,
      COALESCE(fc.fuel_cost, 0) as fuel_cost,
      COALESCE(mc.maint_cost, 0) as maintenance_cost,
      COALESCE(fc.fuel_cost, 0) + COALESCE(mc.maint_cost, 0) as total_cost
    FROM vehicles v
    LEFT JOIN (SELECT vehicle_id, COUNT(*) as trip_count FROM trips WHERE status = 'completed' GROUP BY vehicle_id) tc ON tc.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) as fuel_cost FROM expenses WHERE type = 'fuel' GROUP BY vehicle_id) fc ON fc.vehicle_id = v.id
    LEFT JOIN (SELECT vehicle_id, SUM(cost) as maint_cost FROM expenses WHERE type = 'maintenance' GROUP BY vehicle_id) mc ON mc.vehicle_id = v.id
    WHERE v.status != 'retired'
    ORDER BY total_cost ASC
  `).all();

  res.json(data);
});

router.get('/cost-per-km', authenticate, (req, res) => {
  const data = db.prepare(`
    SELECT v.id, v.name, v.license_plate,
      COALESCE(SUM(t.distance_km), 0) as total_km,
      COALESCE(SUM(e.cost), 0) as total_cost,
      CASE WHEN COALESCE(SUM(t.distance_km), 0) > 0
        THEN ROUND(COALESCE(SUM(e.cost), 0) / SUM(t.distance_km), 2)
        ELSE 0
      END as cost_per_km
    FROM vehicles v
    LEFT JOIN trips t ON t.vehicle_id = v.id AND t.status = 'completed'
    LEFT JOIN expenses e ON e.vehicle_id = v.id
    WHERE v.status != 'retired'
    GROUP BY v.id
    HAVING total_km > 0
    ORDER BY cost_per_km ASC
  `).all();

  res.json(data);
});

router.get('/export/csv', authenticateExport, (req, res) => {
  const vehicles = db.prepare('SELECT * FROM vehicles').all();
  const trips = db.prepare(`
    SELECT t.*, v.name as vehicle_name, v.license_plate, d.name as driver_name
    FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id
    ORDER BY t.created_at DESC
  `).all();
  const expenses = db.prepare(`
    SELECT e.*, v.name as vehicle_name, v.license_plate
    FROM expenses e JOIN vehicles v ON e.vehicle_id = v.id
    ORDER BY e.date DESC
  `).all();

  let csv = 'FLEETFLOW OPERATIONAL REPORT\n\n';

  csv += 'VEHICLES\nID,Name,License Plate,Type,Max Capacity,Odometer,Status,Region\n';
  vehicles.forEach(v => {
    csv += `${v.id},"${v.name}",${v.license_plate},${v.type},${v.max_capacity},${v.odometer},${v.status},${v.region || ''}\n`;
  });

  csv += '\nTRIPS\nID,Vehicle,Driver,Origin,Destination,Cargo Weight,Distance,Status,Created\n';
  trips.forEach(t => {
    csv += `${t.id},"${t.vehicle_name}","${t.driver_name}","${t.origin}","${t.destination}",${t.cargo_weight},${t.distance_km},${t.status},${t.created_at}\n`;
  });

  csv += '\nEXPENSES\nID,Vehicle,Type,Liters,Cost,Date,Description\n';
  expenses.forEach(e => {
    csv += `${e.id},"${e.vehicle_name}",${e.type},${e.liters || ''},${e.cost},${e.date},"${e.description || ''}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=fleetflow-report.csv');
  res.send(csv);
});

router.get('/export/pdf', authenticateExport, async (req, res) => {
  const { default: PDFDocument } = await import('pdfkit');

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=fleetflow-report.pdf');
  doc.pipe(res);

  doc.fontSize(20).text('FleetFlow Operational Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);

  const dashboard = db.prepare("SELECT COUNT(*) as total FROM vehicles WHERE status != 'retired'").get();
  const activeFleet = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'on_trip'").get().count;
  const inShop = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'in_shop'").get().count;
  const totalTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'completed'").get().count;
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM expenses').get().total;

  doc.fontSize(14).text('Fleet Summary');
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(`Total Vehicles: ${dashboard.total}`);
  doc.text(`Active (On Trip): ${activeFleet}`);
  doc.text(`In Maintenance: ${inShop}`);
  doc.text(`Completed Trips: ${totalTrips}`);
  doc.text(`Total Expenses: $${totalExpenses.toFixed(2)}`);
  doc.moveDown(2);

  doc.fontSize(14).text('Vehicle Details');
  doc.moveDown(0.5);
  const vehicles = db.prepare("SELECT * FROM vehicles WHERE status != 'retired' ORDER BY name").all();
  vehicles.forEach(v => {
    doc.fontSize(9).text(`${v.name} (${v.license_plate}) - ${v.type.toUpperCase()} | Status: ${v.status} | Capacity: ${v.max_capacity}kg | Odometer: ${v.odometer}`);
  });

  doc.moveDown(2);
  doc.fontSize(14).text('Recent Completed Trips');
  doc.moveDown(0.5);
  const trips = db.prepare(`
    SELECT t.*, v.name as vn, d.name as dn FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id
    WHERE t.status = 'completed' ORDER BY t.completed_at DESC LIMIT 10
  `).all();
  trips.forEach(t => {
    doc.fontSize(9).text(`${t.origin} → ${t.destination} | ${t.vn} | Driver: ${t.dn} | ${t.cargo_weight}kg | ${t.distance_km}km`);
  });

  doc.end();
});

export default router;
