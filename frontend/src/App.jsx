import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';

import FeedPage from './pages/FeedPage';
import CreatePostPage from './pages/CreatePostPage';
import MapPage from './pages/MapPage';
import GroupsPage from './pages/GroupsPage';
import MeetingsPage from './pages/MeetingsPage';
import ProfilePage from './pages/ProfilePage';
import OfflinePage from './pages/OfflinePage';
import LoginPage from './pages/LoginPage';

// Wrapper para rutas protegidas
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
            <OfflineBanner />
            <Navbar />

            <main className="flex-1">
              <Routes>
                <Route path="/" element={<FeedPage />} />
                <Route
                  path="/create-post"
                  element={
                    <ProtectedRoute>
                      <CreatePostPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/map" element={<MapPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/meetings" element={<MeetingsPage />} />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/offline-queue" element={<OfflinePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <BottomNav />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
