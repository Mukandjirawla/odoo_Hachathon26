import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = { draft: 'bg-gray-100 dark:bg-gray-800 text-gray-500', dispatched: 'bg-violet-50 dark:bg-violet-500/10 text-violet-500', completed: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500', cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-400' };
const STATUS_ICON = { draft: 'draft', dispatched: 'local_shipping', completed: 'check_circle', cancelled: 'cancel' };

export default function Dashboard() {
  const { user } = useAuth();
  const canDispatch = ['manager', 'dispatcher'].includes(user?.role);
  const canMaintain = user?.role === 'manager';
  const [data, setData] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => { api.analytics.dashboard().then(setData); }, []);

  useEffect(() => {
    const params = {};
    if (typeFilter) params.type = typeFilter;
    if (statusFilter) params.status = statusFilter;
    if (regionFilter) params.region = regionFilter;
    api.vehicles.list(params).then(setVehicles);
  }, [typeFilter, statusFilter, regionFilter]);

  if (!data) return <div className="flex items-center justify-center h-64"><span className="material-symbols-outlined animate-spin text-primary-500 text-3xl">progress_activity</span></div>;

  const typeFilters = [
    { key: '', label: 'All', icon: 'grid_view' },
    { key: 'truck', label: 'Truck', icon: 'local_shipping' },
    { key: 'van', label: 'Van', icon: 'airport_shuttle' },
    { key: 'bike', label: 'Bike', icon: 'pedal_bike' },
  ];

  const statusFilters = [
    { key: '', label: 'Any Status' },
    { key: 'available', label: 'Available' },
    { key: 'on_trip', label: 'On Trip' },
    { key: 'in_shop', label: 'In Shop' },
  ];

  const regions = [...new Set(vehicles.map(v => v.region).filter(Boolean))];

  const kpis = [
    { to: '/trips', value: data.activeFleet, label: 'Active Fleet', tag: 'On Trip', icon: 'route', gradient: 'from-emerald-500 to-teal-600', tagColor: 'text-emerald-400' },
    { to: '/maintenance', value: data.maintenanceAlerts, label: 'In Maintenance', tag: 'In Shop', icon: 'build', gradient: 'from-amber-500 to-orange-600', tagColor: 'text-amber-400' },
    { to: '/analytics', value: `${data.utilizationRate}%`, label: 'Utilization', tag: 'Weekly', icon: 'speed', gradient: 'from-primary-500 to-violet-600', tagColor: 'text-violet-400' },
    { to: '/trips', value: data.pendingCargo, label: 'Pending Cargo', tag: 'Queue', icon: 'package_2', gradient: 'from-violet-500 to-purple-600', tagColor: 'text-violet-400' },
  ];

  const showFiltered = typeFilter || statusFilter || regionFilter;

  return (
    <div className="animate-fade-in">
      <div className="px-4 py-4 space-y-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input type="text" className="w-full bg-gray-100 dark:bg-gray-800/60 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500/30 transition-all placeholder:text-gray-400" placeholder="Search vehicles, drivers, or trips" />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1.5 ml-1">Vehicle Type</p>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {typeFilters.map(f => (
              <button key={f.key} onClick={() => setTypeFilter(f.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${typeFilter === f.key ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400'}`}>
                <span className="material-symbols-outlined text-sm">{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1.5 ml-1">Status</p>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800/60 border-none rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-primary-500/30">
              {statusFilters.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1.5 ml-1">Region</p>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-800/60 border-none rounded-xl py-2.5 px-3 text-xs font-bold focus:ring-2 focus:ring-primary-500/30">
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        {kpis.map((kpi, i) => (
          <Link key={i} to={kpi.to} className="relative overflow-hidden bg-white dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/60 hover:shadow-card-hover transition-all duration-300 group">
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${kpi.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className="flex justify-between items-start mb-2 relative">
              <div className={`bg-gradient-to-br ${kpi.gradient} p-1.5 rounded-lg shadow-sm`}><span className="material-symbols-outlined text-white text-lg">{kpi.icon}</span></div>
              <span className={`text-[10px] font-bold ${kpi.tagColor} uppercase tracking-wider`}>{kpi.tag}</span>
            </div>
            <div className="text-2xl font-extrabold mb-0.5 relative">{typeof kpi.value === 'number' ? String(kpi.value).padStart(2, '0') : kpi.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{kpi.label}</div>
          </Link>
        ))}
      </div>

      {showFiltered && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-extrabold">Filtered Vehicles</h3>
            <span className="text-xs text-gray-400 font-medium">{vehicles.length} found</span>
          </div>
          <div className="space-y-2">
            {vehicles.slice(0, 6).map(v => (
              <Link key={v.id} to="/vehicles" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800/60 hover:shadow-card-hover transition-all">
                <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center"><span className="material-symbols-outlined text-primary-500 text-lg">{v.type === 'truck' ? 'local_shipping' : v.type === 'van' ? 'airport_shuttle' : 'pedal_bike'}</span></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{v.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{v.license_plate} &bull; {v.region || 'No region'}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${v.status === 'available' ? 'bg-emerald-500/10 text-emerald-500' : v.status === 'on_trip' ? 'bg-violet-500/10 text-violet-500' : v.status === 'in_shop' ? 'bg-rose-500/10 text-rose-500' : 'bg-gray-500/10 text-gray-500'}`}>{v.status.replace('_', ' ')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500/10 to-violet-500/10 border border-primary-500/10">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 rounded-xl"><span className="material-symbols-outlined text-white">tips_and_updates</span></div>
            <div className="flex-1"><p className="text-sm font-bold">Quick Actions</p><p className="text-xs text-gray-500 dark:text-gray-400">Jump to common tasks</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {canDispatch && <Link to="/trips" className="text-center py-2 px-1 rounded-xl bg-white/60 dark:bg-gray-800/40 text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-gray-800 transition-colors">New Trip</Link>}
            {canMaintain && <Link to="/maintenance" className="text-center py-2 px-1 rounded-xl bg-white/60 dark:bg-gray-800/40 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-gray-800 transition-colors">Log Service</Link>}
            {canDispatch && <Link to="/expenses" className="text-center py-2 px-1 rounded-xl bg-white/60 dark:bg-gray-800/40 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-gray-800 transition-colors">Add Expense</Link>}
            <Link to="/analytics" className="text-center py-2 px-1 rounded-xl bg-white/60 dark:bg-gray-800/40 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-white dark:hover:bg-gray-800 transition-colors">Analytics</Link>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold">Recent Activity</h3>
          <Link to="/trips" className="text-primary-500 text-xs font-bold flex items-center gap-0.5">View All<span className="material-symbols-outlined text-sm">chevron_right</span></Link>
        </div>
        <div className="space-y-2.5">
          {data.recentTrips.map(trip => (
            <Link key={trip.id} to="/trips" className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800/60 hover:shadow-card-hover transition-all duration-200">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${STATUS_COLORS[trip.status]}`}><span className="material-symbols-outlined text-lg">{STATUS_ICON[trip.status]}</span></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{trip.vehicle_name}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{trip.driver_name} &bull; {trip.origin} → {trip.destination}</p>
              </div>
              <div className="text-right flex-shrink-0"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${STATUS_COLORS[trip.status]}`}>{trip.status}</span></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
