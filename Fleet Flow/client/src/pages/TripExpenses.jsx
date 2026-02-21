import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const TYPE_ICON = { fuel: 'local_gas_station', maintenance: 'build', toll: 'toll', other: 'receipt' };
const TYPE_COLOR = { fuel: 'from-violet-500 to-purple-600', maintenance: 'from-amber-500 to-orange-600', toll: 'from-cyan-500 to-teal-600', other: 'from-gray-500 to-gray-600' };

export default function TripExpenses() {
  const { user } = useAuth();
  const canWrite = ['manager', 'dispatcher'].includes(user?.role);
  const canDelete = user?.role === 'manager';
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ vehicle_id: '', trip_id: '', type: 'fuel', liters: '', cost: '', date: new Date().toISOString().split('T')[0], description: '' });
  const [error, setError] = useState('');

  const loadExpenses = () => {
    if (selectedVehicle) {
      api.expenses.summary(selectedVehicle).then(setSummary);
      api.expenses.list({ vehicle_id: selectedVehicle }).then(setExpenses);
    } else { setSummary(null); api.expenses.list().then(setExpenses); }
  };

  useEffect(() => { api.vehicles.list().then(setVehicles); api.expenses.list().then(setExpenses); }, []);
  useEffect(loadExpenses, [selectedVehicle]);

  const openForm = async () => { const t = await api.trips.list({ status: 'completed' }); setTrips(t); setShowForm(true); setEditExpense(null); setError(''); setForm({ vehicle_id: '', trip_id: '', type: 'fuel', liters: '', cost: '', date: new Date().toISOString().split('T')[0], description: '' }); };

  const openEdit = (exp) => {
    setEditExpense(exp);
    setForm({ vehicle_id: String(exp.vehicle_id), trip_id: exp.trip_id ? String(exp.trip_id) : '', type: exp.type, liters: exp.liters ? String(exp.liters) : '', cost: String(exp.cost), date: exp.date, description: exp.description || '' });
    setShowForm(true); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const data = { ...form, vehicle_id: Number(form.vehicle_id), trip_id: form.trip_id ? Number(form.trip_id) : null, liters: form.liters ? Number(form.liters) : null, cost: Number(form.cost) };
    try {
      if (editExpense) { await api.expenses.update(editExpense.id, data); }
      else { await api.expenses.create(data); }
      setShowForm(false); setEditExpense(null); loadExpenses();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense record?')) return;
    try { await api.expenses.delete(id); loadExpenses(); } catch (err) { alert(err.message); }
  };

  const totalCost = expenses.reduce((s, e) => s + e.cost, 0);
  const inputCls = "w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500";

  return (
    <div className="animate-fade-in">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Trip Expenses</h2>
          {canWrite && (
            <button onClick={openForm} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-lg">add</span>Add Expense
            </button>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Filter by Vehicle</label>
          <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800/60 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-500/30">
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
          </select>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">{selectedVehicle ? 'Vehicle Total' : 'Total Expenses'}</p>
          </div>
          <p className="text-3xl font-extrabold">${(summary?.totalOperational ?? totalCost).toFixed(2)}</p>
          <p className="text-xs text-white/70 mt-1">{expenses.length} records</p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Fuel', value: summary.fuel, icon: 'local_gas_station', color: 'text-violet-500 bg-violet-500/10' },
              { label: 'Volume', value: `${summary.fuelLiters.toFixed(0)} L`, icon: 'water_drop', color: 'text-cyan-500 bg-cyan-500/10' },
              { label: 'Maintenance', value: summary.maintenance, icon: 'build', color: 'text-amber-500 bg-amber-500/10' },
              { label: 'Other', value: summary.other, icon: 'receipt', color: 'text-gray-500 bg-gray-500/10' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-gray-800/30 rounded-xl p-3 border border-gray-100 dark:border-gray-800/60">
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${s.color} px-2 py-0.5 rounded-lg mb-1.5`}><span className="material-symbols-outlined text-sm">{s.icon}</span>{s.label}</div>
                <p className="text-lg font-extrabold">{typeof s.value === 'number' ? `$${s.value.toFixed(2)}` : s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mb-1"><span className="material-symbols-outlined text-primary-500 text-lg">receipt_long</span><h3 className="text-base font-extrabold">Expense Records</h3></div>

        <div className="space-y-2.5">
          {expenses.map(exp => (
            <div key={exp.id} className="bg-white dark:bg-gray-800/30 rounded-xl p-3.5 border border-gray-100 dark:border-gray-800/60 shadow-card hover:shadow-card-hover transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl bg-gradient-to-br ${TYPE_COLOR[exp.type] || TYPE_COLOR.other} flex items-center justify-center shadow-sm`}>
                  <span className="material-symbols-outlined text-white text-lg">{TYPE_ICON[exp.type] || 'receipt'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{exp.vehicle_name}</p>
                      <p className="text-[11px] text-gray-500">{exp.type.charAt(0).toUpperCase() + exp.type.slice(1)}{exp.liters ? ` \u2022 ${exp.liters}L` : ''}</p>
                    </div>
                    {(canWrite || canDelete) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canWrite && <button onClick={() => openEdit(exp)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50"><span className="material-symbols-outlined text-gray-400 text-base">edit</span></button>}
                        {canDelete && <button onClick={() => handleDelete(exp.id)} className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"><span className="material-symbols-outlined text-gray-400 hover:text-red-500 text-base">delete</span></button>}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm font-extrabold text-primary-500">${exp.cost.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">{exp.date}</p>
                  </div>
                  {exp.description && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{exp.description}</p>}
                </div>
              </div>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-center text-gray-500 py-12 text-sm">No expenses recorded</p>}
        </div>
      </div>

      {canWrite && (
        <button onClick={openForm} className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 z-30 active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-xl">add</span><span className="font-bold text-sm">Add Expense</span>
        </button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-t-[1.75rem] w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto animate-slide-up border-t border-gray-200 dark:border-gray-800">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5" />
            <h2 className="text-lg font-extrabold mb-5">{editExpense ? 'Edit Expense' : 'Log Expense'}</h2>
            {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 p-3 rounded-xl font-medium">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editExpense && (
                <>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Vehicle *</label>
                    <select required value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className={inputCls}><option value="">Select vehicle...</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Trip (optional)</label>
                    <select value={form.trip_id} onChange={e => setForm({ ...form, trip_id: e.target.value })} className={inputCls}><option value="">No trip linked</option>{trips.map(t => <option key={t.id} value={t.id}>Trip #{t.id} - {t.origin} → {t.destination}</option>)}</select></div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}><option value="fuel">Fuel</option><option value="maintenance">Maintenance</option><option value="toll">Toll</option><option value="other">Other</option></select></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Fuel Liters</label><input type="number" step="0.1" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} className={inputCls} placeholder="0.0" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Cost ($) *</label><input required type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className={inputCls} placeholder="0.00" /></div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Date *</label><input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
              </div>
              <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 ml-1 tracking-wider">Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="e.g. Fuel stop at Route 95" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditExpense(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">{editExpense ? 'Save Changes' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
