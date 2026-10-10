import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrganizationsPage from './pages/OrganizationsPage';
import OrgMembersPage from './pages/OrgMembersPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import NotificationsPage from './pages/NotificationsPage';
import DashboardPage from './pages/DashboardPage';
import ActivityPage from './pages/ActivityPage';
import IssueBoardPage from './pages/IssueBoardPage';
import OrganizationSettingsPage from './pages/OrganizationSettingsPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import MyTasksPage from './pages/MyTasksPage';
import { useAuthStore } from './stores/authStore';
import { useOrgStore } from './stores/orgStore';
import { apiClient } from './lib/apiClient';
import { getSocket } from './lib/socketClient';
import { Bell } from 'lucide-react';

function ProtectedDashboard() {
  const { user, logout } = useAuthStore();
  const currentOrg = useOrgStore((s) => s.currentOrg);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      logout();
    }
  };

  const handleLogoutAll = async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } finally {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase">
          Authenticated Workspace Session
        </span>
        <h2 className="text-2xl font-bold">{user?.name}</h2>
        <p className="text-slate-400 text-sm">{user?.email}</p>

        {currentOrg ? (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 text-left">
            <p className="text-slate-400">Active Organization:</p>
            <p className="font-semibold text-white text-sm">{currentOrg.name} (/{currentOrg.slug})</p>
            <p className="text-indigo-400">Role: {currentOrg.role}</p>
          </div>
        ) : (
          <div className="text-xs text-amber-400">No active organization selected</div>
        )}

        <div className="pt-4 flex flex-col space-y-2">
          <Link
            to="/dashboard"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition"
          >
            Open Dashboard
          </Link>
          <Link
            to="/notifications"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4 text-indigo-400" />
            Notifications
          </Link>
          <Link
            to="/organizations"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg text-sm transition"
          >
            Manage Organizations
          </Link>
          <button
            onClick={handleLogout}
            className="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium py-2 rounded-lg text-sm transition border border-slate-800"
          >
            Log Out
          </button>
          <button
            onClick={handleLogoutAll}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium py-2 rounded-lg text-sm transition"
          >
            Revoke All Sessions
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    apiClient.get('/notifications/unread-count').then((res) => {
      setUnreadCount(res.data.data.unreadCount);
    }).catch(() => {});

    const socket = getSocket();
    if (socket) {
      socket.on('notification.created', () => {
        setUnreadCount((c) => c + 1);
      });
    }

    return () => {
      if (socket) socket.off('notification.created');
    };
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-6">
          <Link to="/" className="font-bold text-white tracking-wider text-base">
            DevFlow
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/organizations" className="text-slate-300 hover:text-white transition">
                Organizations
              </Link>
              <Link to="/projects" className="text-slate-300 hover:text-white transition">
                Projects
              </Link>
              <Link to="/dashboard" className="text-slate-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link to="/my-tasks" className="text-slate-300 hover:text-white transition">
                My Tasks
              </Link>
              <Link to="/activity" className="text-slate-300 hover:text-white transition">
                Activity
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="text-slate-300 hover:text-white transition">
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition"
              >
                Register
              </Link>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/notifications"
                className="relative p-1.5 text-slate-300 hover:text-white transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <span className="text-xs text-slate-400">Authenticated</span>
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <ProtectedDashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/organizations"
          element={isAuthenticated ? <OrganizationsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/organizations/:organizationId/members"
          element={isAuthenticated ? <OrgMembersPage /> : <Navigate to="/login" replace />}
        />
        <Route path="/organizations/:organizationId/settings" element={isAuthenticated ? <OrganizationSettingsPage /> : <Navigate to="/login" replace />} />
        <Route path="/invitations/:token" element={isAuthenticated ? <AcceptInvitationPage /> : <Navigate to="/login" replace />} />
        <Route
          path="/projects"
          element={isAuthenticated ? <ProjectsPage /> : <Navigate to="/login" replace />}
        />
        <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/my-tasks" element={isAuthenticated ? <MyTasksPage /> : <Navigate to="/login" replace />} />
        <Route path="/activity" element={isAuthenticated ? <ActivityPage /> : <Navigate to="/login" replace />} />
        <Route
          path="/projects/:projectId"
          element={isAuthenticated ? <ProjectDetailsPage /> : <Navigate to="/login" replace />}
        />
        <Route path="/projects/:projectId/issues" element={isAuthenticated ? <IssueBoardPage /> : <Navigate to="/login" replace />} />
        <Route
          path="/notifications"
          element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
