import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

const navigation = [
  { name: 'Dashboard', path: '/' },
  { name: 'Jobs', path: '/jobs/queue' },
  { name: 'Applications', path: '/applications' },
  { name: 'Resume', path: '/resume' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Settings', path: '/settings' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="text-xl font-bold mb-8 text-primary-600">JobAgent</div>
        <nav className="space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === item.path
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-auto absolute bottom-4 left-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
