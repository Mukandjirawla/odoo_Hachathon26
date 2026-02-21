import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_BADGE = {
  available: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  on_trip: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  in_shop: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  retired: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};
const VEHICLE_ICONS = { truck: 'local_shipping', van: 'airport_shuttle', bike: 'pedal_bike' };
const TYPE_COLORS = { truck: 'from-violet-500 to-purple-600', van: 'from-emerald-500 to-teal-600', bike: 'from-amber-500 to-orange-600' };

export default function VehicleRegistry() {
  const { user } = useAuth();
  const canWrite = ['manager'].includes(user?.role);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, onTrip: 0, inShop: 0 });
  const [outOfServiceOnly, setOutOfServiceOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState({ name: '', model: '', license_plate: '', type: 'truck', max_capacity: '', odometer: '', region: '', acquisition_cost: '', year: '' });
  const [error, setError] = useState('');

  const load = () => {
    const params = {};
    if (outOfServiceOnly) params.status = 'retired';
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    Promise.all([api.vehicles.list(params), api.vehicles.stats()]).then(([v, s]) => { setVehicles(v); setStats(s); });
  };

  useEffect(load, [outOfServiceOnly, search, typeFilter]);

  const resetForm = () => setForm({ name: '', model: '', license_plate: '', type: 'truck', max_capacity: '', odometer: '', region: '', acquisition_cost: '', year: '' });
  const openCreate = () => { resetForm(); setEditVehicle(null); setShowForm(true); setError(''); };
  const openEdit = (v) => {
    setForm({ name: v.name, model: v.model || '', license_plate: v.license_plate, type: v.type, max_capacity: String(v.max_capacity), odometer: String(v.odometer), region: v.region || '', acquisition_cost: String(v.acquisition_cost || ''), year: String(v.year || '') });
    setEditVehicle(v); setShowForm(true); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const data = { ...form, max_capacity: Number(form.max_capacity), odometer: Number(form.odometer) || 0, acquisition_cost: Number(form.acquisition_cost) || 0, year: Number(form.year) || null };
    try {
      if (editVehicle) await api.vehicles.update(editVehicle.id, data);
      else await api.vehicles.create(data);
      setShowForm(false); resetForm(); setEditVehicle(null); load();
    } catch (err) { setError(err.message); }
  };

  const handleRetire = async (id) => {
    if (!confirm('Retire this vehicle? It will be marked as out of service.')) return;
    try { await api.vehicles.delete(id); load(); } catch (err) { alert(err.message); }
  };

  const inputCls = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all";

  return (
    <div className="relative animate-fade-in">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Vehicle Registry</h2>
          {canWrite && (
            <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:shadow-lg active:scale-95 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>Add Vehicle
            </button>
          )}
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800/60 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500/30 transition-all placeholder:text-gray-400" placeholder="Search by name, plate, or model..." />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {['', 'truck', 'van', 'bike'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${typeFilter === t ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800/60 text-gray-500'}`}>
              {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All Types'}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/30">
          <div><p className="text-sm font-bold">Out of Service Only</p><p className="text-[11px] text-gray-500">Show retired vehicles</p></div>
          <label className="relative flex h-7 w-12 cursor-pointer items-center rounded-full bg-gray-200 dark:bg-gray-700 p-1 transition-colors has-[:checked]:bg-primary-500">
            <input type="checkbox" className="sr-only peer" checked={outOfServiceOnly} onChange={e => setOutOfServiceOnly(e.target.checked)} />
            <div className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {[
            { label: `Total: ${stats.total}`, color: 'bg-primary-500/10 border-primary-500/20 text-primary-500' },
            { label: `Available: ${stats.available}`, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' },
            { label: `On Trip: ${stats.onTrip}`, color: 'bg-violet-500/10 border-violet-500/20 text-violet-500' },
            { label: `In Shop: ${stats.inShop}`, color: 'bg-rose-500/10 border-rose-500/20 text-rose-500' },
          ].map(s => <div key={s.label} className={`flex-none px-3 py-1.5 rounded-lg border text-xs font-bold ${s.color}`}>{s.label}</div>)}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {vehicles.map(v => (
          <div key={v.id} className="flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/60 hover:shadow-card-hover transition-all duration-300">
            <div className={`h-24 w-full relative overflow-hidden bg-gradient-to-br ${TYPE_COLORS[v.type] || TYPE_COLORS.truck} opacity-90`}>
              <div className="absolute inset-0 flex items-center justify-center"><span className="material-symbols-outlined text-white/30" style={{ fontSize: 80 }}>{VEHICLE_ICONS[v.type]}</span></div>
              <div className="absolute top-2.5 right-2.5"><span className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-white/90 dark:bg-gray-900/80 ${STATUS_BADGE[v.status]}`}>{v.status.replace('_', ' ')}</span></div>
              <div className="absolute top-2.5 left-2.5"><span className="px-2 py-0.5 rounded-lg bg-black/30 text-white text-[10px] font-bold uppercase">{v.type}</span></div>
            </div>
            <div className="p-3.5 flex flex-col gap-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm leading-tight">{v.name}</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{v.license_plate} {v.year ? `\u2022 ${v.year}` : ''}</p>
                </div>
                {canWrite && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(v)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" title="Edit"><span className="material-symbols-outlined text-gray-400 text-lg">edit</span></button>
                    {v.status !== 'on_trip' && v.status !== 'retired' && (
                      <button onClick={() => handleRetire(v.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Retire"><span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-lg">delete</span></button>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary-500 text-base">weight</span><div><p className="text-[9px] uppercase text-gray-400 font-bold">Max Load</p><p className="text-xs font-bold">{v.max_capacity.toLocaleString()} kg</p></div></div>
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary-500 text-base">speed</span><div><p className="text-[9px] uppercase text-gray-400 font-bold">Odometer</p><p className="text-xs font-bold">{v.odometer.toLocaleString()} km</p></div></div>
              </div>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && <p className="text-center text-gray-500 py-12 text-sm">No vehicles found</p>}
      </div>

      {canWrite && (
        <button onClick={openCreate} className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 active:scale-95 transition-transform z-30">
          <span className="material-symbols-outlined text-xl">add</span><span className="font-bold text-sm">Add Vehicle</span>
        </button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-5">{editVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 p-3 rounded-xl font-medium">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Vehicle Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Freightliner Cascadia" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">License Plate *</label><input required value={form.license_plate} onChange={e => setForm({ ...form, license_plate: e.target.value })} className={inputCls} placeholder="ABC-1234" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Type *</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="truck">Truck</option><option value="van">Van</option><option value="bike">Bike</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Max Capacity (kg) *</label><input required type="number" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: e.target.value })} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Odometer (km)</label><input type="number" value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Model</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Year</label><input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => { setShowForm(false); setEditVehicle(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">{editVehicle ? 'Save Changes' : 'Add Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
