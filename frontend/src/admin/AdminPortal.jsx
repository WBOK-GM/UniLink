import React, { Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, RefreshCw } from 'lucide-react';

// Carga Dinámica Bajo Demanda (Zero-Footprint Admin):
// Este chunk de código SOLO se solicita por la red cuando un administrador autenticado está en línea.
// La aplicación de los estudiantes normales nunca descarga ni ejecuta este archivo.
const LazyAdminAuditModal = lazy(() => import('./AdminAuditModal'));

export default function AdminPortal({ isOpen, onClose }) {
  const { user } = useAuth();

  if (!isOpen) return null;

  // 1. Verificación Estricta de Rol
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 max-w-sm w-full text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Acceso Denegado</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Esta consola es exclusiva para administradores del servidor central UniLink.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // 2. Verificación Estricta de Conexión a Internet
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 max-w-sm w-full text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Conexión Requerida</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Por seguridad, la consola de administración y auditoría del servidor solo puede consultarse en vivo con conexión a internet.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white flex items-center gap-3 text-xs font-bold shadow-xl">
            <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
            <span>Cargando Consola de Administración desde el servidor...</span>
          </div>
        </div>
      }
    >
      <LazyAdminAuditModal isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
}
