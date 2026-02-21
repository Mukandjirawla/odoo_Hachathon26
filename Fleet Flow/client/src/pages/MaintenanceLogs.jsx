import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  scheduled: { style: 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 border-gray-200 dark:border-gray-600' },
  in_shop: { style: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  completed: { style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

const SERVICE_ICONS = { 'Brake': 'build', 'Oil': 'oil_barrel', 'Tire': 'tire_repair', 'Engine': 'settings', 'Transmission': 'settings', 'Inspection': 'fact_check' };
function getIcon(st) { return Object.entries(SERVICE_ICONS).find(([k]) => st?.includes(k))?.[1] || 'build'; }

export default function MaintenanceLogs() {
  const { user } = useAuth();
  const canWrite = ['manager'].includes(user?.role);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ vehicle_id: '', service_type: '', description: '', cost: '', technician: '', scheduled_date: '' });
  const [error, setError] = useState('');

  const load = () => { const p = {}; if (filter) p.status = filter; if (search) p.search = search; api.maintenance.list(p).then(setLogs); };
  useEffect(load, [filter, search]);

  const openForm = async () => { const v = await api.vehicles.list(); setVehicles(v.filter(x => x.status !== 'on_trip' && x.status !== 'retired')); setShowForm(true); setEditLog(null); setError(''); setForm({ vehicle_id: '', service_type: '', description: '', cost: '', technician: '', scheduled_date: '' }); };

  const openEdit = (log) => {
    setEditLog(log);
    setForm({ vehicle_id: String(log.vehicle_id), service_type: log.service_type, description: log.description || '', cost: String(log.cost || ''), technician: log.technician || '', scheduled_date: log.scheduled_date || '' });
    setShowForm(true); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const data = { ...form, vehicle_id: Number(form.vehicle_id), cost: Number(form.cost) || 0 };
    try {
      if (editLog) { await api.maintenance.update(editLog.id, data); }
      else { await api.maintenance.create(data); }
      setShowForm(false); setEditLog(null); load();
    } catch (err) { setError(err.message); }
  };

  const handleComplete = async (id) => { try { await api.maintenance.complete(id, {}); load(); } catch (err) { alert(err.message); } };

  const handleDelete = async (id) => {
    if (!confirm('Delete this maintenance log?')) return;
    try { await api.maintenance.delete(id); load(); } catch (err) { alert(err.message); }
  };

  const filters = [{ key: '', label: 'All Logs' }, { key: 'scheduled', label: 'Scheduled' }, { key: 'in_shop', label: 'In Shop' }, { key: 'completed', label: 'Completed' }];
  const inputCls = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500";

  return (
    <div className="relative animate-fade-in">
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Maintenance Logs</h2>
          {canWrite && (
            <button onClick={openForm} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>Log Service
            </button>
          )}
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800/60 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500/30 transition-all placeholder:text-gray-400" placeholder="Search vehicle or service type..." />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${filter === f.key ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="bg-gradient-to-r from-primary-500/10 to-violet-500/10 border border-primary-500/15 rounded-2xl p-4 flex gap-3 items-start">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 rounded-xl"><span className="material-symbols-outlined text-white text-lg">info</span></div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400">Service Status Impact</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-1">Logging service auto-sets the vehicle to <span className="font-bold text-amber-500">In Shop</span>.</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Records</h2>
          <span className="text-xs text-gray-400 font-medium">{logs.length} found</span>
        </div>

        {logs.map(log => {
          const badge = STATUS_BADGE[log.status] || STATUS_BADGE.scheduled;
          return (
            <div key={log.id} className="bg-white dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800/60 p-4 shadow-card hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`size-11 rounded-xl flex items-center justify-center ${log.status === 'in_shop' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : log.status === 'completed' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <span className={`material-symbols-outlined text-xl ${log.status === 'in_shop' || log.status === 'completed' ? 'text-white' : 'text-gray-500'}`}>{getIcon(log.service_type)}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight">{log.vehicle_name}</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{log.license_plate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canWrite && log.status !== 'completed' && (
                    <button onClick={() => openEdit(log)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50" title="Edit"><span className="material-symbols-outlined text-gray-400 text-lg">edit</span></button>
                  )}
                  {canWrite && <button onClick={() => handleDelete(log.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-lg">delete</span></button>}
                  <span className={`ml-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${badge.style}`}>{log.status.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-gray-100 dark:border-gray-800/60">
                <div><p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">Service</p><p className="text-xs font-bold">{log.service_type}</p></div>
                <div><p className="text-[9px] uppercase text-gray-400 font-bold mb-0.5">{log.status === 'completed' ? 'Completed' : 'Scheduled'}</p><p className="text-xs font-bold">{log.completed_date || log.scheduled_date || '-'}</p></div>
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-3 text-gray-500">
                  {log.cost > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold bg-gray-50 dark:bg-gray-700/30 px-2 py-0.5 rounded-lg"><span className="material-symbols-outlined text-xs">payments</span>${log.cost.toFixed(2)}</span>}
                  {log.technician && <span className="inline-flex items-center gap-1 text-xs bg-gray-50 dark:bg-gray-700/30 px-2 py-0.5 rounded-lg"><span className="material-symbols-outlined text-xs">person</span>{log.technician}</span>}
                </div>
                {canWrite && log.status === 'in_shop' && (
                  <button onClick={() => handleComplete(log.id)} className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1">Complete <span className="material-symbols-outlined text-sm">check</span></button>
                )}
              </div>
            </div>
          );
        })}
        {logs.length === 0 && <p className="text-center text-gray-500 py-12 text-sm">No maintenance logs found</p>}
      </main>

      {canWrite && (
        <button onClick={openForm} className="fixed bottom-24 right-4 z-30 bg-gradient-to-r from-primary-500 to-primary-600 text-white flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg shadow-primary-500/30 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-lg">post_add</span><span className="font-bold text-sm">Log Service</span>
        </button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-5">{editLog ? 'Edit Maintenance Log' : 'New Maintenance Log'}</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 p-3 rounded-xl font-medium">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editLog && (
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Vehicle *</label>
                  <select required value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className={inputCls}><option value="">Select vehicle...</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}</select></div>
              )}
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Service Type *</label><input required value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} className={inputCls} placeholder="e.g. Oil Change" /></div>
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Est. Cost ($)</label><input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Technician</label><input value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditLog(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">{editLog ? 'Save Changes' : 'Log Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
