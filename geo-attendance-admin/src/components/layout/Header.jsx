import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const { admin, logout } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {admin?.name || 'Admin'}</h1>
          <p className="text-slate-400 text-sm">Manage your attendance system</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Admin Info */}
          <div className="text-right">
            <p className="text-sm font-medium text-white">{admin?.name}</p>
            <p className="text-xs text-slate-400">{admin?.email}</p>
          </div>

          {/* Avatar */}
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {admin?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="btn btn-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
