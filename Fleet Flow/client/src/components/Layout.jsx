import { useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Home' },
  { to: '/vehicles', icon: 'local_shipping', label: 'Fleet' },
  { to: '/trips', icon: 'route', label: 'Trips' },
  { to: '/drivers', icon: 'group', label: 'Drivers' },
  { to: '/analytics', icon: 'bar_chart', label: 'Analytics' },
];

const allPages = [
  { to: '/', icon: 'dashboard', label: 'Command Center' },
  { to: '/vehicles', icon: 'local_shipping', label: 'Vehicle Registry' },
  { to: '/trips', icon: 'route', label: 'Trip Dispatcher' },
  { to: '/maintenance', icon: 'build', label: 'Maintenance Logs' },
  { to: '/expenses', icon: 'receipt_long', label: 'Trip Expenses' },
  { to: '/drivers', icon: 'group', label: 'Driver Performance' },
  { to: '/analytics', icon: 'bar_chart', label: 'Operational Analytics' },
];

const ROLE_COLORS = {
  manager: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  dispatcher: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  safety_officer: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  analyst: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPage = allPages.find(p => p.to === '/' ? location.pathname === '/' : location.pathname.startsWith(p.to));

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-lg mx-auto border-x border-gray-200/50 dark:border-gray-800/50">
      <header className="sticky top-0 z-50 glass-strong border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200">
              <span className="material-symbols-outlined text-gray-500 dark:text-gray-400">{menuOpen ? 'close' : 'menu'}</span>
            </button>
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-1.5 rounded-xl shadow-glow">
              <span className="material-symbols-outlined text-white text-lg fill-1">local_shipping</span>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight leading-none">FleetFlow</h1>
              {currentPage && <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{currentPage.label}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${ROLE_COLORS[user?.role] || 'bg-gray-500/10 text-gray-400'}`}>
              {user?.role?.replace('_', ' ')}
            </span>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all duration-200 text-gray-400" title="Logout">
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-0 left-0 w-72 h-full bg-white dark:bg-gray-950 shadow-2xl animate-slide-in-left" onClick={e => e.stopPropagation()}>
            <div className="p-6 pt-6 pb-4 bg-gradient-to-br from-primary-500 to-primary-700">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-white text-2xl fill-1">local_shipping</span>
              </div>
              <p className="text-white font-bold text-lg">{user?.name}</p>
              <p className="text-white/70 text-xs mt-0.5">{user?.email}</p>
              <span className="inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-white/20 text-white">{user?.role?.replace('_', ' ')}</span>
            </div>
            <nav className="p-3 space-y-0.5">
              {allPages.map(page => {
                const isActive = page.to === '/' ? location.pathname === '/' : location.pathname.startsWith(page.to);
                return (
                  <Link key={page.to} to={page.to} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                    <span className={`material-symbols-outlined text-xl ${isActive ? 'fill-1' : ''}`}>{page.icon}</span>
                    <span className="text-sm">{page.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto glass-strong border-t border-gray-200/60 dark:border-gray-800/60 px-2 pt-2 pb-6 z-50">
        <div className="flex justify-between items-center">
          {navItems.map(item => {
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all duration-200 ${isActive ? 'text-primary-500' : 'text-gray-400 hover:text-primary-400'}`}>
                {isActive && <div className="absolute -top-0 w-8 h-0.5 rounded-full bg-primary-500" />}
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
