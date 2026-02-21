import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = {
      manager: ['admin@fleetflow.com', 'admin123'],
      dispatcher: ['dispatcher@fleetflow.com', 'dispatch123'],
      safety: ['safety@fleetflow.com', 'safety123'],
      analyst: ['analyst@fleetflow.com', 'analyst123'],
    };
    const [e, p] = creds[role];
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden max-w-lg mx-auto">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <main className="flex-1 flex flex-col px-6 pb-8 pt-12 animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mx-auto w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-lg">
            <span className="material-symbols-outlined text-white fill-1" style={{ fontSize: 40 }}>local_shipping</span>
          </div>
          <h1 className="tracking-tight text-3xl font-extrabold leading-tight mb-1">FleetFlow</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[260px] mx-auto">
            Fleet & logistics management, simplified.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-red-400 text-lg">error</span>
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 ml-1 tracking-wider">Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>mail</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm placeholder:text-gray-400"
                placeholder="driver@fleetflow.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 ml-1 tracking-wider">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }}>lock</span>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all text-sm placeholder:text-gray-400"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPassword ? 'visibility' : 'visibility_off'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <button type="button" className="text-xs text-primary-500 font-semibold hover:text-primary-600 transition-colors" onClick={() => alert('Please contact your fleet administrator to reset your password.')}>
              Forgot Password?
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-500/25 transition-all duration-200 flex items-center justify-center gap-2 mt-4">
            {loading ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <><span>Sign In</span><span className="material-symbols-outlined text-lg">arrow_forward</span></>}
          </button>

          <div className="relative flex items-center py-3">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800" />
            <span className="flex-shrink mx-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Quick Access</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-800" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { role: 'manager', icon: 'admin_panel_settings', label: 'Manager', color: 'text-violet-500' },
              { role: 'dispatcher', icon: 'local_shipping', label: 'Dispatcher', color: 'text-cyan-500' },
              { role: 'safety', icon: 'shield', label: 'Safety', color: 'text-emerald-500' },
              { role: 'analyst', icon: 'analytics', label: 'Analyst', color: 'text-amber-500' },
            ].map(d => (
              <button key={d.role} type="button" onClick={() => fillDemo(d.role)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all text-sm font-semibold">
                <span className={`material-symbols-outlined ${d.color}`} style={{ fontSize: 18 }}>{d.icon}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
        </form>

        <div className="mt-auto pt-8 text-center">
          <p className="text-gray-400 text-xs">
            FleetFlow v2.0 &bull; Modular Fleet Management
          </p>
        </div>
      </main>
    </div>
  );
}
