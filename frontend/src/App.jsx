import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';
import AuditModal from './components/AuditModal';

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

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d1f] text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      
      {/* 1. Sidebar Fijo en Escritorio / Desplegable en Móvil */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAudit={() => setShowAuditModal(true)}
        onInstallApp={handleInstallApp}
        isInstallable={isInstallable}
      />

      {/* 2. Área de Contenido Principal (con margen izquierdo en Desktop lg:pl-64) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-64 bg-[#f5f6fa] dark:bg-[#090d1f]">
        
        {/* Banner de Estado Offline */}
        <OfflineBanner />

        {/* Barra Superior con Tag UPTC, Estado de Red y Acciones */}
        <TopHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenAudit={() => setShowAuditModal(true)}
        />

        {/* Contenedor de Páginas */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-2 sm:py-6 max-w-7xl w-full mx-auto bg-[#f4f6fb] dark:bg-[#090d1f]">
          <Routes>
            <Route path="/" element={<FeedPage onOpenAudit={() => setShowAuditModal(true)} />} />
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

        {/* Navegación Inferior en Móvil */}
        <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />
      </div>

      {/* Modal de Auditoría PWA y Seguridad (Sesión 22 & 23) */}
      <AuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <MainLayout />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
