const BASE = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (res.headers.get('content-type')?.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  if (!res.ok) throw new Error('Request failed');
  return res;
}

const api = {
  auth: {
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
  },
  vehicles: {
    list: (params) => request(`/vehicles?${new URLSearchParams(params || {})}`),
    stats: () => request('/vehicles/stats'),
    get: (id) => request(`/vehicles/${id}`),
    create: (data) => request('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),
  },
  drivers: {
    list: (params) => request(`/drivers?${new URLSearchParams(params || {})}`),
    stats: () => request('/drivers/stats'),
    available: (category) => request(`/drivers/available?${new URLSearchParams(category ? { category } : {})}`),
    get: (id) => request(`/drivers/${id}`),
    create: (data) => request('/drivers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/drivers/${id}`, { method: 'DELETE' }),
  },
  trips: {
    list: (params) => request(`/trips?${new URLSearchParams(params || {})}`),
    pendingCargo: () => request('/trips/pending-cargo'),
    get: (id) => request(`/trips/${id}`),
    create: (data) => request('/trips', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/trips/${id}`, { method: 'DELETE' }),
    dispatch: (id) => request(`/trips/${id}/dispatch`, { method: 'PUT' }),
    complete: (id, data) => request(`/trips/${id}/complete`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id) => request(`/trips/${id}/cancel`, { method: 'PUT' }),
  },
  maintenance: {
    list: (params) => request(`/maintenance?${new URLSearchParams(params || {})}`),
    get: (id) => request(`/maintenance/${id}`),
    create: (data) => request('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/maintenance/${id}`, { method: 'DELETE' }),
    complete: (id, data) => request(`/maintenance/${id}/complete`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  expenses: {
    list: (params) => request(`/expenses?${new URLSearchParams(params || {})}`),
    summary: (vehicleId) => request(`/expenses/summary/${vehicleId}`),
    create: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    dashboard: () => request('/analytics/dashboard'),
    fuelEfficiency: () => request('/analytics/fuel-efficiency'),
    vehicleRoi: () => request('/analytics/vehicle-roi'),
    costPerKm: () => request('/analytics/cost-per-km'),
    exportCsv: () => `${BASE}/analytics/export/csv`,
    exportPdf: () => `${BASE}/analytics/export/pdf`,
  },
};

export default api;
