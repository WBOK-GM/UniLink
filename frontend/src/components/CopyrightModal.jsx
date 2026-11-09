import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function CopyrightModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl glass-panel border border-slate-700/80 p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Declaración de Responsabilidad y Autoría</h3>
            <p className="text-xs text-slate-400">Requisito obligatorio de publicación (RN-30)</p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800 mb-6 leading-relaxed">
          <p>
            Al publicar en <strong>UniLink</strong>, declaras y garantizas que:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li>Eres el autor original de los apuntes, resúmenes o materiales compartidos, o cuentas con autorización expresa para su difusión académica.</li>
            <li>No estás compartiendo exámenes confidenciales, libros protegidos por derechos de autor sin licencia, ni información privada de terceros.</li>
            <li>El contenido cumple con las normas de convivencia de la comunidad académica y no contiene contenido ofensivo o spam.</li>
          </ul>
          <p className="text-[11px] text-slate-500 italic mt-2">
            La plataforma mantiene un sistema de reportes y moderación administrativa (RF-31 / RF-32).
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition hover:scale-[1.02]"
          >
            Acepto y deseo publicar
          </button>
        </div>
      </div>
    </div>
  );
}
