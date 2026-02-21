import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_DOT = { on_duty: 'bg-emerald-500', off_duty: 'bg-gray-400', on_trip: 'bg-violet-500', suspended: 'bg-red-500' };
const STATUS_LABEL = { on_duty: 'ON DUTY', off_duty: 'OFF DUTY', on_trip: 'ON TRIP', suspended: 'SUSPENDED' };
const STATUS_BTN = {
  on_duty: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  off_duty: 'text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  on_trip: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  suspended: 'text-red-500 bg-red-500/10 border-red-500/20',
};

export default function DriverPerformance() {
  const { user } = useAuth();
  const canCreate = user?.role === 'manager';
  const canManage = ['manager', 'safety_officer'].includes(user?.role);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({ total: 0, onDuty: 0, offDuty: 0, suspended: 0, avgSafety: 0, expiringLicenses: 0 });
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', license_number: '', license_expiry: '', license_category: 'truck' });
  const [error, setError] = useState('');

  const load = () => { const p = {}; if (filter) p.status = filter; if (search) p.search = search; Promise.all([api.drivers.list(p), api.drivers.stats()]).then(([d, s]) => { setDrivers(d); setStats(s); }); };
  useEffect(load, [filter, search]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try { await api.drivers.create(form); setShowForm(false); setForm({ name: '', email: '', phone: '', license_number: '', license_expiry: '', license_category: 'truck' }); load(); }
    catch (err) { setError(err.message); }
  };

  const toggleStatus = async (driver) => {
    if (driver.status === 'on_trip') return;
    if (driver.status === 'suspended') {
      if (!confirm(`Reinstate ${driver.name}?`)) return;
      try { await api.drivers.update(driver.id, { status: 'on_duty' }); load(); } catch (err) { alert(err.message); }
      return;
    }
    const nextStatus = driver.status === 'on_duty' ? 'off_duty' : 'on_duty';
    try { await api.drivers.update(driver.id, { status: nextStatus }); load(); } catch (err) { alert(err.message); }
  };

  const handleSuspend = async (driver) => {
    if (!confirm(`Suspend ${driver.name}? They will be unable to receive trips.`)) return;
    try { await api.drivers.update(driver.id, { status: 'suspended' }); load(); } catch (err) { alert(err.message); }
  };

  const isExpiring = (exp) => { const d = (new Date(exp) - new Date()) / 864e5; return d <= 30 && d > 0; };
  const isExpired = (exp) => new Date(exp) < new Date();

  const handleDelete = async (driver) => {
    if (!confirm(`Remove ${driver.name} from the system? This cannot be undone.`)) return;
    try { await api.drivers.delete(driver.id); load(); } catch (err) { alert(err.message); }
  };

  const safetyColor = (s) => s >= 90 ? 'text-emerald-500' : s >= 80 ? 'text-violet-500' : s >= 70 ? 'text-amber-500' : 'text-red-500';
  const safetyBar = (s) => s >= 90 ? 'bg-emerald-500' : s >= 80 ? 'bg-violet-500' : s >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="relative animate-fade-in">
      <div className="px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Driver Performance</h2>
          {canCreate && (
            <button onClick={() => { setShowForm(true); setError(''); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-lg">person_add</span>Add Driver
            </button>
          )}
        </div>
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2">
          {[
            { label: 'Safety', value: `${stats.avgSafety}%`, icon: 'shield', color: 'from-emerald-500 to-teal-600' },
            { label: 'Active', value: stats.total, icon: 'group', color: 'from-violet-500 to-purple-600' },
            { label: 'Alerts', value: stats.expiringLicenses, icon: 'warning', color: 'from-amber-500 to-orange-600' },
          ].map(s => (
            <div key={s.label} className="flex-none min-w-[130px] rounded-2xl p-3 bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/60">
              <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1`}>
                <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${s.color} flex items-center justify-center`}><span className="material-symbols-outlined text-white text-xs">{s.icon}</span></div>
                <span className="text-gray-500">{s.label}</span>
              </div>
              <p className="text-xl font-extrabold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-100 dark:bg-gray-800/60 border-none focus:ring-2 focus:ring-primary-500/30 text-sm placeholder:text-gray-400" placeholder="Search drivers..." />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {[
            { key: '', label: 'All' },
            { key: 'on_duty', label: `On Duty (${stats.onDuty})` },
            { key: 'off_duty', label: `Off (${stats.offDuty})` },
            { key: 'suspended', label: `Suspended (${stats.suspended})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${filter === f.key ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm' : `bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 ${f.key === 'suspended' ? 'text-red-500' : ''}`}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pb-24">
        <div className="space-y-3">
          {drivers.map(driver => (
            <div key={driver.id} className={`p-4 rounded-2xl bg-white dark:bg-gray-800/30 border flex flex-col gap-3 transition-all duration-200 ${isExpired(driver.license_expiry) ? 'border-red-200 dark:border-red-900/30' : isExpiring(driver.license_expiry) ? 'border-amber-200 dark:border-amber-900/30' : 'border-gray-100 dark:border-gray-800/60'} ${driver.status === 'suspended' ? 'opacity-75' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className="relative">
                    <div className={`size-11 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center ${driver.status === 'suspended' ? 'grayscale' : ''}`}>
                      <span className="material-symbols-outlined text-gray-500 text-xl">person</span>
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 size-3.5 ${STATUS_DOT[driver.status]} rounded-full border-2 border-white dark:border-gray-900`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{driver.name}</h3>
                    <p className="text-[11px] text-gray-500">{driver.license_number} &bull; {driver.license_category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canManage && driver.status !== 'on_trip' && driver.status !== 'suspended' && (
                    <button onClick={() => handleSuspend(driver)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Suspend">
                      <span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-lg">block</span>
                    </button>
                  )}
                  {canCreate && driver.status !== 'on_trip' && (
                    <button onClick={() => handleDelete(driver)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Remove driver">
                      <span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-lg">delete</span>
                    </button>
                  )}
                  {canManage && (
                    <button onClick={() => toggleStatus(driver)} className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border transition-colors ${STATUS_BTN[driver.status]}`}>
                      {STATUS_LABEL[driver.status]}
                    </button>
                  )}
                  {!canManage && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${STATUS_BTN[driver.status]}`}>
                      {STATUS_LABEL[driver.status]}
                    </span>
                  )}
                </div>
              </div>

              {isExpiring(driver.license_expiry) && (
                <div className="bg-amber-500/10 p-2.5 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg">warning</span>
                  <div><p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">License expiring {new Date(driver.license_expiry).toLocaleDateString()}</p></div>
                </div>
              )}
              {isExpired(driver.license_expiry) && (
                <div className="bg-red-500/10 p-2.5 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-lg">gpp_bad</span>
                  <div><p className="text-[11px] font-bold text-red-600 dark:text-red-400">License expired — cannot be assigned to trips</p></div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-gray-100 dark:border-gray-800/60">
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Safety</p>
                  <p className={`text-base font-extrabold ${safetyColor(driver.safety_score)}`}>{driver.safety_score}%</p>
                  <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-1"><div className={`h-full rounded-full ${safetyBar(driver.safety_score)}`} style={{ width: `${driver.safety_score}%` }} /></div>
                </div>
                <div className="text-center border-x border-gray-100 dark:border-gray-800/60">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Trips</p>
                  <p className="text-base font-extrabold">{driver.trip_completion_rate}%</p>
                  <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-1"><div className="h-full rounded-full bg-primary-500" style={{ width: `${driver.trip_completion_rate}%` }} /></div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-1">Fuel</p>
                  <p className="text-base font-extrabold text-primary-500">{driver.fuel_score}</p>
                </div>
              </div>
            </div>
          ))}
          {drivers.length === 0 && <p className="text-center text-gray-500 py-12 text-sm">No drivers found</p>}
        </div>
      </main>

      {canCreate && (
        <button onClick={() => { setShowForm(true); setError(''); }} className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 z-30 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-xl">person_add</span><span className="font-bold text-sm">Add Driver</span>
        </button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-5">Add New Driver</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 p-3 rounded-xl font-medium">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Full Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">License Number *</label><input required value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" placeholder="CDL-XX-0000" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">License Expiry *</label><input required type="date" value={form.license_expiry} onChange={e => setForm({ ...form, license_expiry: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Category *</label><select required value={form.license_category} onChange={e => setForm({ ...form, license_category: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"><option value="truck">Truck</option><option value="van">Van</option><option value="bike">Bike</option></select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">Add Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
