import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Navigation,
  Camera,
  Mic,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  Radio,
  MapPin,
  Volume2,
  Info,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { getResilientPosition, UPTC_CAMPUS_PRESETS, checkSensorPermissions } from '../utils/geoUtils';

export default function SensorDiagnosticsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('DIAGNOSTICS'); // 'DIAGNOSTICS' | 'GUIDE'
  const [testingGps, setTestingGps] = useState(false);
  const [gpsResult, setGpsResult] = useState(null);

  const [testingCam, setTestingCam] = useState(false);
  const [camResult, setCamResult] = useState(null);
  const camStreamRef = useRef(null);
  const videoPreviewRef = useRef(null);

  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micResult, setMicResult] = useState(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);

  const [vibrationResult, setVibrationResult] = useState(null);
  const [permissionsState, setPermissionsState] = useState(null);

  // Cargar estado inicial de permisos
  const loadPermissions = async () => {
    try {
      const perms = await checkSensorPermissions();
      setPermissionsState(perms);
    } catch (e) {
      console.warn('Error al consultar permisos de sensores:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    } else {
      // Limpiar streams si se cierra el modal
      cleanupStreams();
    }
    return () => cleanupStreams();
  }, [isOpen]);

  const cleanupStreams = () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setTestingCam(false);
    setTestingMic(false);
    setMicLevel(0);
  };

  // 1. Probar GPS
  const handleTestGps = async () => {
    setTestingGps(true);
    setGpsResult(null);
    try {
      const result = await getResilientPosition();
      setGpsResult(result);
    } catch (err) {
      setGpsResult({
        errorNotice: err.message,
        isRealGps: false,
        source: 'ERROR'
      });
    } finally {
      setTestingGps(false);
      loadPermissions();
    }
  };

  // 2. Probar Cámara
  const handleTestCamera = async () => {
    setTestingCam(true);
    setCamResult(null);

    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API mediaDevices.getUserMedia no soportada en este entorno.');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      camStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings ? videoTrack.getSettings() : {};

      setCamResult({
        success: true,
        devicesCount: videoDevices.length,
        devices: videoDevices.map((d, i) => d.label || `Cámara ${i + 1}`),
        activeTrack: videoTrack.label,
        resolution: settings.width && settings.height ? `${settings.width}x${settings.height}` : 'Resolución estándar'
      });
    } catch (err) {
      setCamResult({
        success: false,
        error: err.name === 'NotAllowedError' ? 'Permiso de cámara denegado por el usuario o navegador.' : err.message
      });
    } finally {
      setTestingCam(false);
      loadPermissions();
    }
  };

  // 3. Probar Micrófono con vúmetro en vivo
  const handleTestMic = async () => {
    setTestingMic(true);
    setMicResult(null);
    setMicLevel(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API de audio no soportada.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const interval = setInterval(() => {
        if (!micStreamRef.current) {
          clearInterval(interval);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(normalized);
      }, 100);

      setMicResult({
        success: true,
        trackLabel: stream.getAudioTracks()[0]?.label || 'Micrófono predeterminado'
      });

      // Detener automáticamente después de 6 segundos
      setTimeout(() => {
        clearInterval(interval);
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
        setTestingMic(false);
        setMicLevel(0);
      }, 6000);
    } catch (err) {
      setMicResult({
        success: false,
        error: err.name === 'NotAllowedError' ? 'Permiso de micrófono denegado.' : err.message
      });
      setTestingMic(false);
    } finally {
      loadPermissions();
    }
  };

  // 4. Probar Vibración Háptica
  const handleTestVibration = () => {
    if ('vibrate' in navigator) {
      try {
        const didVibrate = navigator.vibrate([120, 60, 120]);
        setVibrationResult({
          supported: true,
          message: didVibrate
            ? 'Vibración disparada con éxito en el hardware del dispositivo.'
            : 'API presente (en computadores de escritorio el motor háptico físico no vibra pero la llamada es válida).'
        });
      } catch (e) {
        setVibrationResult({ supported: true, message: 'API disponible pero restringida por el sistema operativo.' });
      }
    } else {
      setVibrationResult({
        supported: false,
        message: 'Tu navegador o dispositivo no cuenta con la Vibration API (típico en Safari iOS o navegadores de escritorio).'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-brand-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Diagnóstico de Sensores & Hardware PWA
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  Pruebas en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verificación interactiva de GPS, Cámara, Micrófono y Retroalimentación Háptica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPermissions}
              className="p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refrescar estado de permisos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('DIAGNOSTICS')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'DIAGNOSTICS'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Panel de Diagnóstico
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GUIDE')}
            className={`px-3.5 py-1.5 rounded-lg transition ${
              activeTab === 'GUIDE'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Guía de Permisos del Navegador
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'DIAGNOSTICS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SENSOR 1: GEOLOCALIZACIÓN / GPS */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Geolocalización & GPS
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Permiso del Navegador:{' '}
                          <b className="uppercase text-slate-700 dark:text-slate-300">
                            {permissionsState?.geolocation?.state || 'Detectando'}
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                    Localiza tu posición en el campus para ordenar publicaciones y calcular distancias a grupos de estudio.
                  </p>

                  {/* Resultados GPS */}
                  {gpsResult && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Fuente:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          gpsResult.source === 'GPS_HARDWARE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        }`}>
                          {gpsResult.source === 'GPS_HARDWARE' ? 'GPS Físico Real' : 'Fallback Campus Universitario'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Coordenadas:</span>
                        <b className="text-slate-800 dark:text-slate-200">
                          {gpsResult.lat?.toFixed(5)}, {gpsResult.lng?.toFixed(5)}
                        </b>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Referencia:</span>
                        <span className="text-slate-700 dark:text-slate-300 text-right font-medium truncate max-w-[180px]">
                          {gpsResult.placeName}
                        </span>
                      </div>
                      {gpsResult.errorNotice && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700 flex items-start gap-1">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{gpsResult.errorNotice}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestGps}
                  disabled={testingGps}
                  className="w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  {testingGps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Consultando GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Probar Ubicación GPS</span>
                    </>
                  )}
                </button>
              </div>

              {/* SENSOR 2: CÁMARA */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Cámara Web / Móvil
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Permiso:{' '}
                          <b className="uppercase text-slate-700 dark:text-slate-300">
                            {permissionsState?.camera?.state || 'Detectando'}
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                    Captura instantánea de fotografías de tableros, cuadernos de apuntes y experimentos en clase.
                  </p>

                  {/* Video preview si está activa la prueba */}
                  {testingCam || (camStreamRef.current && camResult?.success) ? (
                    <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-black relative border border-slate-700">
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        <span>Stream Activo</span>
                      </div>
                    </div>
                  ) : null}

                  {camResult && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1 animate-fadeIn">
                      {camResult.success ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Dispositivo:</span>
                            <b className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                              {camResult.activeTrack}
                            </b>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Resolución:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{camResult.resolution}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                          {camResult.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestCamera}
                  disabled={testingCam}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  {testingCam ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Iniciando sensor de cámara...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Probar Sensor de Cámara</span>
                    </>
                  )}
                </button>
              </div>

              {/* SENSOR 3: MICRÓFONO */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Micrófono & Audio
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Permiso:{' '}
                          <b className="uppercase text-slate-700 dark:text-slate-300">
                            {permissionsState?.microphone?.state || 'Detectando'}
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                    Grabación de notas explicativas de voz y explicaciones de ejercicios para compartir con tus compañeros.
                  </p>

                  {/* Vúmetro de audio en vivo */}
                  {testingMic && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-900 text-white space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Habla para probar...</span>
                        </span>
                        <span className="text-slate-400">{micLevel}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
                          style={{ width: `${Math.max(5, micLevel)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {micResult && !testingMic && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs animate-fadeIn">
                      {micResult.success ? (
                        <p className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Micrófono conectado y capturando sonido correctamente.</span>
                        </p>
                      ) : (
                        <p className="text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                          {micResult.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestMic}
                  disabled={testingMic}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  {testingMic ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                      <span>Midiendo nivel de voz...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Probar Micrófono (Vúmetro)</span>
                    </>
                  )}
                </button>
              </div>

              {/* SENSOR 4: VIBRACIÓN HÁPTICA */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Vibración Háptica (Haptic)
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          Soporte API:{' '}
                          <b className="uppercase text-slate-700 dark:text-slate-300">
                            {'vibrate' in navigator ? 'Disponible' : 'No disponible'}
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                    Retroalimentación física instantánea al tomar fotografías, iniciar grabaciones o sincronizar cambios.
                  </p>

                  {vibrationResult && (
                    <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs animate-fadeIn">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {vibrationResult.message}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestVibration}
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Disparar Pulso de Vibración</span>
                </button>
              </div>
            </div>
          ) : (
            // PESTAÑA: GUÍA DE RESOLUCIÓN DE PERMISOS
            <div className="space-y-4 max-w-2xl mx-auto text-xs">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>¿Por qué Chrome muestra "User denied Geolocation" si el permiso está activo?</span>
                </h4>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  En sistemas Linux y equipos de cómputo de escritorio sin antena satelital GPS, Google Chrome consulta el servicio del sistema operativo (<code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-indigo-600 font-mono">GeoClue</code>). Si la ubicación del sistema está apagada o el equipo no tiene hardware GPS, Chrome reporta internamente un error de rechazo.
                </p>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50">
                  <b className="text-slate-900 dark:text-white font-bold block mb-1">
                    Solución integrada de UniLink:
                  </b>
                  <p className="text-slate-600 dark:text-slate-400">
                    No necesitas configurar nada adicional. UniLink detecta automáticamente la ausencia de hardware y te permite seleccionar cualquiera de los puntos de referencia del campus (Facultad de Ingeniería, Biblioteca Central, Rectoría, etc.) con 1 solo clic.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cómo administrar permisos en tu navegador:
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <div>
                      <b className="text-slate-800 dark:text-slate-200">En Google Chrome / Chromium:</b>
                      <p className="text-slate-600 dark:text-slate-400">
                        Haz clic en el icono de candado o configuración junto a <code className="font-mono">localhost:5173</code> en la barra de direcciones. Habilita <b>Ubicación</b>, <b>Cámara</b> y <b>Micrófono</b>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <div>
                      <b className="text-slate-800 dark:text-slate-200">En Mozilla Firefox:</b>
                      <p className="text-slate-600 dark:text-slate-400">
                        Presiona el icono de permisos a la izquierda de la URL y elimina los bloqueos guardados.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <div>
                      <b className="text-slate-800 dark:text-slate-200">En Dispositivos Móviles (Android / iOS):</b>
                      <p className="text-slate-600 dark:text-slate-400">
                        Asegúrate de conceder permisos tanto al navegador como a la aplicación instalada en los ajustes del sistema.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>PWA Hardware Abstraction Layer • Campus Tunja</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-white transition"
          >
            Cerrar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
}
