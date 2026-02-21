import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_TAB = ['draft', 'dispatched', 'completed'];
const STATUS_LABEL = { draft: 'Draft', dispatched: 'Dispatched', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_STYLE = {
  draft: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
  dispatched: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
  completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  cancelled: 'text-red-400 bg-red-50 dark:bg-red-500/10',
};

export default function TripDispatcher() {
  const { user } = useAuth();
  const canWrite = ['manager', 'dispatcher'].includes(user?.role);
  const [trips, setTrips] = useState([]);
  const [tab, setTab] = useState('dispatched');
  const [showForm, setShowForm] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [showCompleteForm, setShowCompleteForm] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({ vehicle_id: '', driver_id: '', origin: '', destination: '', cargo_weight: '', eta: '' });
  const [editForm, setEditForm] = useState({ origin: '', destination: '', cargo_weight: '' });
  const [completeForm, setCompleteForm] = useState({ final_odometer: '', distance_km: '' });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const loadTrips = useCallback(() => api.trips.list({ status: tab }).then(setTrips), [tab]);
  useEffect(() => { loadTrips(); }, [loadTrips]);

  const openForm = async () => {
    const [v, d] = await Promise.all([api.vehicles.list({ status: 'available' }), api.drivers.available()]);
    setVehicles(v); setDrivers(d); setShowForm(true); setError(''); setValidationError('');
    setForm({ vehicle_id: '', driver_id: '', origin: '', destination: '', cargo_weight: '', eta: '' });
    setSelectedVehicle(null);
  };

  const openEdit = (trip) => {
    setEditTrip(trip);
    setEditForm({ origin: trip.origin, destination: trip.destination, cargo_weight: String(trip.cargo_weight) });
    setError('');
  };

  const handleVehicleChange = (vid) => {
    setForm(f => ({ ...f, vehicle_id: vid }));
    const v = vehicles.find(x => x.id === Number(vid));
    setSelectedVehicle(v || null);
    if (v && form.cargo_weight && Number(form.cargo_weight) > v.max_capacity) {
      setValidationError(`Cargo (${form.cargo_weight}kg) exceeds capacity (${v.max_capacity}kg)`);
    } else { setValidationError(''); }
  };

  const handleWeightChange = (w) => {
    setForm(f => ({ ...f, cargo_weight: w }));
    if (selectedVehicle && w && Number(w) > selectedVehicle.max_capacity) {
      setValidationError(`Cargo (${w}kg) exceeds capacity (${selectedVehicle.max_capacity}kg)`);
    } else { setValidationError(''); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.trips.create({ ...form, vehicle_id: Number(form.vehicle_id), driver_id: Number(form.driver_id), cargo_weight: Number(form.cargo_weight) });
      setShowForm(false); setTab('draft'); loadTrips();
    } catch (err) { setError(err.message); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.trips.update(editTrip.id, { origin: editForm.origin, destination: editForm.destination, cargo_weight: Number(editForm.cargo_weight) });
      setEditTrip(null); loadTrips();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this draft trip permanently?')) return;
    try { await api.trips.delete(id); loadTrips(); } catch (err) { alert(err.message); }
  };

  const handleDispatch = async (id) => { try { await api.trips.dispatch(id); loadTrips(); } catch (err) { alert(err.message); } };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await api.trips.complete(showCompleteForm.id, { final_odometer: completeForm.final_odometer ? Number(completeForm.final_odometer) : null, distance_km: completeForm.distance_km ? Number(completeForm.distance_km) : null });
      setShowCompleteForm(null); setCompleteForm({ final_odometer: '', distance_km: '' }); loadTrips();
    } catch (err) { alert(err.message); }
  };

  const handleCancel = async (id) => { if (!confirm('Cancel this trip?')) return; try { await api.trips.cancel(id); loadTrips(); } catch (err) { alert(err.message); } };

  const inputCls = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500";

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Trip Dispatcher</h2>
          {canWrite && (
            <button onClick={openForm} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>New Trip
            </button>
          )}
        </div>
        <div className="flex h-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800/60 p-1">
          {STATUS_TAB.map(s => (
            <button key={s} onClick={() => setTab(s)}
              className={`flex h-full grow items-center justify-center rounded-lg px-2 text-sm font-bold transition-all duration-200 ${tab === s ? 'bg-white dark:bg-gray-700 text-primary-500 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white dark:bg-gray-800/30 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/60 shadow-card hover:shadow-card-hover transition-all duration-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${STATUS_STYLE[trip.status]}`}>
                  <span className="material-symbols-outlined text-xs">{trip.status === 'dispatched' ? 'local_shipping' : trip.status === 'completed' ? 'check_circle' : 'draft'}</span>
                  {STATUS_LABEL[trip.status]}
                </span>
                <h3 className="text-base font-extrabold mt-1">Trip #{trip.id}</h3>
              </div>
              <div className="flex items-center gap-1">
                {canWrite && trip.status === 'draft' && (
                  <>
                    <button onClick={() => openEdit(trip)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50" title="Edit"><span className="material-symbols-outlined text-gray-400 text-lg">edit</span></button>
                    <button onClick={() => handleDelete(trip.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-lg">delete</span></button>
                  </>
                )}
                {trip.eta && (
                  <div className="text-right ml-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">ETA</p>
                    <p className="text-sm font-extrabold">{new Date(trip.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2 py-1 rounded-lg"><span className="material-symbols-outlined text-xs text-primary-500">person</span>{trip.driver_name}</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2 py-1 rounded-lg"><span className="material-symbols-outlined text-xs text-primary-500">tag</span>{trip.license_plate}</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2 py-1 rounded-lg"><span className="material-symbols-outlined text-xs text-primary-500">weight</span>{trip.cargo_weight}kg</span>
            </div>

            <div className="flex items-center gap-2 mb-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <span className="material-symbols-outlined text-primary-500 text-sm">location_on</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{trip.origin}</span>
              <span className="material-symbols-outlined text-gray-300 text-sm">east</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{trip.destination}</span>
            </div>

            <div className="flex gap-2">
              {canWrite && trip.status === 'draft' && (
                <>
                  <button onClick={() => handleDispatch(trip.id)} className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2 rounded-xl font-bold text-sm shadow-sm">Dispatch</button>
                  <button onClick={() => handleCancel(trip.id)} className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">Cancel</button>
                </>
              )}
              {canWrite && trip.status === 'dispatched' && (
                <>
                  <button onClick={() => { setShowCompleteForm(trip); setCompleteForm({ final_odometer: '', distance_km: '' }); }} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2 rounded-xl font-bold text-sm shadow-sm">Complete</button>
                  <button onClick={() => handleCancel(trip.id)} className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">Cancel</button>
                </>
              )}
              {trip.status === 'completed' && (
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <span className="material-symbols-outlined text-sm fill-1">check_circle</span>
                  <span className="text-xs font-bold">Completed {trip.completed_at ? new Date(trip.completed_at).toLocaleDateString() : ''}</span>
                  {trip.distance_km > 0 && <span className="text-xs text-gray-400 ml-2">{trip.distance_km} km</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        {trips.length === 0 && <p className="text-center text-gray-500 py-12 text-sm">No {tab} trips found</p>}
      </div>

      {canWrite && (
        <button onClick={openForm} className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 z-30 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-xl">add</span><span className="font-bold text-sm">New Trip</span>
        </button>
      )}

      {editTrip && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-1">Edit Trip #{editTrip.id}</h2>
            <p className="text-xs text-gray-500 mb-4">{editTrip.vehicle_name} &bull; {editTrip.driver_name}</p>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 p-3 rounded-xl font-medium">{error}</p>}
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Origin</label><input required value={editForm.origin} onChange={e => setEditForm({ ...editForm, origin: e.target.value })} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Destination</label><input required value={editForm.destination} onChange={e => setEditForm({ ...editForm, destination: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Cargo Weight (kg)</label><input required type="number" value={editForm.cargo_weight} onChange={e => setEditForm({ ...editForm, cargo_weight: e.target.value })} className={inputCls} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTrip(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompleteForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-1">Complete Trip #{showCompleteForm.id}</h2>
            <p className="text-xs text-gray-500 mb-4">{showCompleteForm.origin} → {showCompleteForm.destination}</p>
            <form onSubmit={handleComplete} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Final Odometer (km)</label><input type="number" value={completeForm.final_odometer} onChange={e => setCompleteForm({ ...completeForm, final_odometer: e.target.value })} className={inputCls} placeholder="e.g. 150000" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Distance (km)</label><input type="number" value={completeForm.distance_km} onChange={e => setCompleteForm({ ...completeForm, distance_km: e.target.value })} className={inputCls} placeholder="e.g. 380" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCompleteForm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-5">Create New Trip</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 p-3 rounded-xl font-medium">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Select Vehicle *</label>
                <select required value={form.vehicle_id} onChange={e => handleVehicleChange(e.target.value)} className={inputCls}><option value="">Choose a vehicle...</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate}) - {v.max_capacity}kg</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Assign Driver *</label>
                <select required value={form.driver_id} onChange={e => setForm({ ...form, driver_id: e.target.value })} className={inputCls}><option value="">Choose a driver...</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.license_category})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Origin *</label><input required value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} className={inputCls} placeholder="City, State" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Destination *</label><input required value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className={inputCls} placeholder="City, State" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Cargo Weight (kg) *</label><input required type="number" value={form.cargo_weight} onChange={e => handleWeightChange(e.target.value)} className={inputCls} /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Max Capacity</label><input disabled value={selectedVehicle?.max_capacity || ''} className="w-full bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm opacity-60" /></div>
              </div>
              {validationError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-400 text-lg mt-0.5">warning</span>
                  <div><p className="text-red-400 text-xs font-bold uppercase mb-0.5">Weight Limit Exceeded</p><p className="text-red-400/80 text-xs">{validationError}</p></div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" disabled={!!validationError} className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 disabled:opacity-40 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">Create Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
