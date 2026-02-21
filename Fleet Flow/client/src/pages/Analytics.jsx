import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/client';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.name !== 'km/L' ? `$${p.value.toFixed(2)}` : p.value}</p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [tab, setTab] = useState('weekly');
  const [fuelData, setFuelData] = useState([]);
  const [roiData, setRoiData] = useState([]);
  const [costPerKm, setCostPerKm] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    api.analytics.fuelEfficiency().then(setFuelData);
    api.analytics.vehicleRoi().then(setRoiData);
    api.analytics.costPerKm().then(setCostPerKm);
    api.analytics.dashboard().then(setDashboard);
  }, []);

  const totalCost = roiData.reduce((s, v) => s + v.total_cost, 0);
  const avgEff = fuelData.length > 0 ? (fuelData.reduce((s, v) => s + v.km_per_liter, 0) / fuelData.length).toFixed(1) : 0;
  const avgCostKm = costPerKm.length > 0 ? (costPerKm.reduce((s, v) => s + v.cost_per_km, 0) / costPerKm.length).toFixed(2) : 0;

  const handleExport = (type) => {
    const token = localStorage.getItem('token');
    const url = type === 'csv' ? api.analytics.exportCsv() : api.analytics.exportPdf();
    window.open(`${url}?token=${token}`, '_blank');
  };

  return (
    <div className="animate-fade-in">
      <div className="px-4 mt-2">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {['daily', 'weekly', 'monthly'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${tab === t ? 'border-primary-500 text-primary-500' : 'border-transparent text-gray-400'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-3 gap-2.5 p-4">
        {[
          { label: 'Total Cost', value: `$${totalCost.toFixed(0)}`, sub: 'All vehicles', icon: 'payments', gradient: 'from-primary-500 to-primary-600' },
          { label: 'Efficiency', value: `${avgEff}`, unit: 'km/L', sub: `${fuelData.length} vehicles`, icon: 'speed', gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Cost/km', value: `$${avgCostKm}`, sub: `${costPerKm.length} tracked`, icon: 'trending_up', gradient: 'from-violet-500 to-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800/30 rounded-2xl p-3 border border-gray-100 dark:border-gray-800/60">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-2`}><span className="material-symbols-outlined text-white text-sm">{s.icon}</span></div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-extrabold leading-tight">{s.value}{s.unit && <span className="text-xs font-medium text-gray-400 ml-0.5">{s.unit}</span>}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </section>

      <div className="space-y-4 px-4">
        <section className="bg-white dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/60">
          <div className="mb-3">
            <h3 className="text-sm font-extrabold">Fuel Efficiency</h3>
            <p className="text-[11px] text-gray-400">km per liter by vehicle</p>
          </div>
          <div className="h-44 w-full">
            {fuelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="license_plate" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="km_per_liter" fill="url(#violetGrad)" radius={[6, 6, 0, 0]} name="km/L" />
                  <defs><linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-gray-500 text-sm">No fuel data</div>}
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/60">
          <div className="mb-3">
            <h3 className="text-sm font-extrabold">Cost Breakdown</h3>
            <p className="text-[11px] text-gray-400">Fuel + maintenance per vehicle</p>
          </div>
          <div className="h-44 w-full">
            {roiData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="license_plate" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="fuel_cost" fill="#7c3aed" stackId="cost" name="Fuel" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="maintenance_cost" fill="#f59e0b" stackId="cost" name="Maintenance" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-gray-500 text-sm">No cost data</div>}
          </div>
        </section>

        {costPerKm.length > 0 && (
          <section className="bg-white dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/60">
            <div className="mb-3">
              <h3 className="text-sm font-extrabold">Cost per Kilometer</h3>
              <p className="text-[11px] text-gray-400">Operational cost efficiency</p>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costPerKm}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="license_plate" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cost_per_km" fill="url(#purpleGrad)" radius={[6, 6, 0, 0]} name="$/km" />
                  <defs><linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {dashboard && (
          <section className="bg-white dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/60">
            <h3 className="text-sm font-extrabold mb-3">Fleet Utilization</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { v: dashboard.activeFleet, l: 'Active', gradient: 'from-emerald-500 to-teal-600' },
                { v: dashboard.maintenanceAlerts, l: 'In Shop', gradient: 'from-amber-500 to-orange-600' },
                { v: `${dashboard.utilizationRate}%`, l: 'Utilization', gradient: 'from-violet-500 to-purple-600' },
                { v: dashboard.pendingCargo, l: 'Pending', gradient: 'from-violet-500 to-purple-600' },
              ].map(d => (
                <div key={d.l} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                  <div className={`inline-flex w-8 h-8 rounded-lg bg-gradient-to-br ${d.gradient} items-center justify-center mb-1`}><span className="text-white text-xs font-extrabold">{typeof d.v === 'number' ? d.v : ''}</span></div>
                  <p className="text-xl font-extrabold">{d.v}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{d.l}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-gradient-to-r from-primary-500/10 to-violet-500/10 rounded-2xl p-5 border border-primary-500/10 mb-6">
          <div className="mb-4">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-500 text-lg">description</span>
              Generate Reports
            </h3>
            <p className="text-xs text-gray-500 mt-1">Export fleet data for payroll, tax audits, and financial summaries.</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button onClick={() => handleExport('csv')}
              className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800/50 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-sm active:scale-95 transition-all font-bold text-sm">
              <span className="material-symbols-outlined text-primary-500 text-lg">table_view</span>
              CSV
            </button>
            <button onClick={() => handleExport('pdf')}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-xl shadow-md active:scale-95 transition-all font-bold text-sm">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              PDF
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
