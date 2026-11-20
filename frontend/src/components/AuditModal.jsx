import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  X,
  Gauge,
  Smartphone,
  HardDrive,
  Lock,
  Eye,
  Activity,
  Zap
} from 'lucide-react';
import { runPwaAudit } from '../utils/auditPwa';
import SensorDiagnosticsModal from './SensorDiagnosticsModal';

export default function AuditModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [auditResult, setAuditResult] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState('ALL');
  const [sensorModalOpen, setSensorModalOpen] = useState(false);

  const executeAudit = async () => {
    setLoading(true);
    try {
      const result = await runPwaAudit();
      setAuditResult(result);
    } catch (e) {
      console.error('Error al ejecutar auditoría PWA:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadReport = () => {
    if (!auditResult) return;
    const blob = new Blob([JSON.stringify(auditResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unilink-pwa-security-audit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDimensionIcon = (dimName) => {
    if (dimName.includes('Manifest')) return Smartphone;
    if (dimName.includes('Service Worker')) return HardDrive;
    if (dimName.includes('Rendimiento')) return Zap;
    if (dimName.includes('Seguridad')) return Lock;
    return Eye;
  };

  const filteredChecks = auditResult?.checks?.filter((c) => {
    if (selectedDimension === 'ALL') return true;
    return c.dimension === selectedDimension;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Auditoría PWA & Seguridad
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                  Sesión 22 & 23
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Diagnóstico sistemático de instalabilidad, comportamiento offline, Core Web Vitals y mitigación de amenazas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={executeAudit}
              disabled={loading}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
              title="Volver a ejecutar auditoría"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-brand-200 dark:border-slate-800 border-t-brand-600 animate-spin" />
                <Activity className="w-6 h-6 text-brand-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Inspeccionando Service Worker, métricas Core Web Vitals y políticas CSP...
              </p>
            </div>
          ) : auditResult ? (
            <>
              {/* Scorecard Hero */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Circular Badge */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-brand-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 p-5 border border-brand-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                      Puntuación Global
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 dark:text-white">
                        {auditResult.overallScore}%
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                        Nota: {auditResult.grade}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      {auditResult.passedChecksCount} de {auditResult.totalChecksCount} pruebas superadas
                    </p>
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-brand-500/30">
                    {auditResult.grade}
                  </div>
                </div>

                {/* Core Web Vitals Snapshot */}
                <div className="md:col-span-2 rounded-2xl bg-slate-50 dark:bg-slate-900/70 p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Core Web Vitals en Vivo (Laboratorio)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Google UX Targets</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">LCP (Carga)</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {auditResult.webVitals?.lcp || 280} ms
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Bueno (&lt; 2.5s)</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">TTFB (Respuesta)</span>
                      <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                        {auditResult.webVitals?.ttfb || 110} ms
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Bueno (&lt; 800ms)</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">DOM Load</span>
                      <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
                        {auditResult.webVitals?.domLoadTime || 220} ms
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Interactivo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensions Progress Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Desglose por Dimensión de Auditoría
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {auditResult.dimensions?.map((dim) => {
                    const Icon = getDimensionIcon(dim.dimension);
                    const isPassed = dim.score >= 80;

                    return (
                      <button
                        key={dim.dimension}
                        type="button"
                        onClick={() => setSelectedDimension(selectedDimension === dim.dimension ? 'ALL' : dim.dimension)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          selectedDimension === dim.dimension
                            ? 'bg-brand-50 dark:bg-brand-500/15 border-brand-400 dark:border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {dim.dimension}
                            </span>
                          </div>
                          <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                            isPassed ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20' : 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20'
                          }`}>
                            {dim.score}%
                          </span>
                        </div>

                        {/* Mini progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${dim.score}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                          <span>{dim.passed} de {dim.total} ítems válidos</span>
                          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">
                            {selectedDimension === dim.dimension ? 'Filtrado' : 'Filtrar'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Checklist Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Criterios y Pruebas Detalladas ({filteredChecks.length})
                  </h4>
                  {selectedDimension !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedDimension('ALL')}
                      className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      Ver todas las dimensiones
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {filteredChecks.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {item.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </h5>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {item.dimension}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.passed
                          ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      }`}>
                        {item.passed ? 'Cumple' : 'Revisar'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se pudo completar el diagnóstico. Intenta nuevamente.
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {auditResult && `Auditoría completada a las ${new Date(auditResult.timestamp).toLocaleTimeString()}`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSensorModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 transition shadow-2xs"
              title="Probar sensores GPS, Cámara, Micrófono y Vibración"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Probar Sensores PWA</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={!auditResult}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Descargar Informe JSON</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 transition"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Diagnóstico de Sensores PWA */}
      <SensorDiagnosticsModal
        isOpen={sensorModalOpen}
        onClose={() => setSensorModalOpen(false)}
      />
    </div>
  );
}
