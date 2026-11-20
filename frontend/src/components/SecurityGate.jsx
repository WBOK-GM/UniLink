import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import { Shield, Lock, Sparkles, GraduationCap } from 'lucide-react';

/**
 * Componente de Seguridad Principal (Security Gate)
 * Intercepta el montaje global de la PWA y valida la existencia de un Token de Acceso
 * antes de permitir visualizar cualquier sección interna de la plataforma.
 */
export default function SecurityGate({ children }) {
  const { user, token, loading, isOfflineSession } = useAuth();

  // 1. Pantalla de Verificación de Seguridad durante el arranque
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Luces difusas de fondo */}
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-2xl shadow-brand-500/30">
              <Shield className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="absolute -inset-1 rounded-3xl border border-brand-400/40 animate-ping opacity-30" />
          </div>

          <div>
            <h3 className="text-base font-black text-white tracking-tight">
              UniLink Security Gate
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Verificando token de acceso institucional y almacenamiento local...
            </p>
          </div>

          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 w-2/3 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Si no hay token de acceso ni usuario autenticado:
  // Bloquea totalmente el acceso al MainLayout y expone el portal seguro
  if (!user || !token) {
    return <LoginPage />;
  }

  // 3. Token validado: Permite acceso completo a la aplicación
  return (
    <>
      {isOfflineSession && (
        <div className="bg-amber-600 text-white text-[11px] font-bold px-4 py-1 flex items-center justify-center gap-2 shadow-xs shrink-0 z-50">
          <Lock className="w-3.5 h-3.5" />
          <span>Sesión Offline PWA Activa: Validada mediante credenciales en IndexedDB</span>
        </div>
      )}
      {children}
    </>
  );
}
