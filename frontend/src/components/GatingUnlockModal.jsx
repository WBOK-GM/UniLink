import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, FileUp, ShieldAlert, Sparkles, X, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GatingUnlockModal({ isOpen, onClose, resourceTitle }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleGoToCreate = () => {
    onClose();
    if (!user) {
      navigate('/login');
    } else {
      navigate('/create-post');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 relative overflow-hidden transition-all">
        
        {/* Glow de fondo decorativo */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header con Icono de Candado */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
              Intercambio Condicionado
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
              Comparte para Desbloquear
            </h3>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {resourceTitle ? (
            <>Para descargar o guardar sin conexión el recurso <span className="font-semibold text-slate-900 dark:text-white">"{resourceTitle}"</span>, </>
          ) : (
            <>Para acceder a las descargas y materiales compartidos por la comunidad, </>
          )}
          primero debes colaborar publicando al menos <span className="font-bold text-brand-600 dark:text-brand-400">1 apunte o documento académico</span>.
        </p>

        {/* Tarjeta de Beneficios del Modelo Recíproco */}
        <div className="space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 mb-5 text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-semibold">Comunidad Justa:</strong> Todos aprendemos y nos beneficiamos de los aportes mutuos de cada materia.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white font-semibold">Desbloqueo Vitalicio:</strong> Una vez publiques tu primer recurso, tendrás acceso total a todas las descargas y guardado offline de la PWA.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            Explorar más tarde
          </button>
          <button
            type="button"
            onClick={handleGoToCreate}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition active:scale-95"
          >
            <FileUp className="w-4 h-4" />
            <span>{!user ? 'Iniciar sesión para publicar' : 'Publicar mi primer apunte'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

      </div>
    </div>
  );
}