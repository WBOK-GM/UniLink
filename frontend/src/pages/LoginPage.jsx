import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Validación estricta de formato RFC 5322 para correo electrónico
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithToken } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('Universidad Pedagógica y Tecnológica de Colombia (UPTC)');
  const [academicProgram, setAcademicProgram] = useState('Ingeniería de Sistemas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTokenAccess, setShowTokenAccess] = useState(false);
  const [directTokenInput, setDirectTokenInput] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Validación de seguridad de contraseña (Sesión 22: Validación de formularios)
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: 'Introduce contraseña', color: 'bg-slate-200' };
    if (pass.length < 6) return { score: 1, text: 'Muy débil (mínimo 6 caracteres)', color: 'bg-rose-500' };
    if (pass.length < 8) return { score: 2, text: 'Seguridad Media', color: 'bg-amber-500' };
    return { score: 3, text: 'Seguridad Alta', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Por favor ingresa tu correo institucional.');
      setLoading(false);
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('El formato del correo electrónico es inválido. Debe ser una dirección real (ej: tu.nombre@uptc.edu.co o estudiante@unilink.edu.co).');
      setLoading(false);
      return;
    }

    if (isRegister && (!isOnline || !navigator.onLine)) {
      setError('⚠️ Conexión Requerida: El registro de nuevos estudiantes debe validarse directamente en la base de datos central de UniLink en PostgreSQL. Por favor conéctate a internet para crear tu cuenta.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        await register({
          email: normalizedEmail,
          password,
          full_name: fullName,
          university,
          academic_program: academicProgram,
          semester: 5
        });
      } else {
        await login(normalizedEmail, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al procesar solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectTokenSubmit = async (e) => {
    e.preventDefault();
    if (!directTokenInput.trim()) return;
    setLoading(true);
    setError('');
    try {
      await loginWithToken(directTokenInput.trim());
      navigate('/');
    } catch (err) {
      setError(err.message || 'Token de acceso inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background blur elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900/90 backdrop-blur-xl p-7 sm:p-9 border border-slate-200/90 dark:border-slate-800 shadow-2xl relative z-10 space-y-6">
        
        {/* Logo and title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-brand-500/25">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isRegister ? 'Crear Cuenta en UniLink' : 'Iniciar Sesión en UniLink'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isRegister
              ? 'Únete a la comunidad académica universitaria de la UPTC.'
              : 'Accede a tus recursos compartidos y grupos de estudio.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Banner institucional cuando se intenta registrar sin conexión */}
        {isRegister && !isOnline && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-extrabold text-[12px]">Conexión al Servidor Central Requerida</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                El registro de nuevos estudiantes debe validarse directamente en la base de datos global de UniLink para garantizar credenciales únicas institucionales. Conéctate a internet para registrarte.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Universidad
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Ej: UPTC Tunja"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                  Carrera / Programa
                </label>
                <input
                  type="text"
                  value={academicProgram}
                  onChange={(e) => setAcademicProgram(e.target.value)}
                  placeholder="Ej: Ingeniería de Sistemas"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition shadow-2xs"
                />
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Correo Institucional *
              </label>
              {email.length > 0 && (
                <span
                  className={`text-[11px] flex items-center gap-1 font-semibold ${
                    EMAIL_REGEX.test(email.trim())
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }`}
                >
                  {EMAIL_REGEX.test(email.trim()) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Formato válido</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Correo incompleto</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="tu.correo@uptc.edu.co"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border ${
                  email.length > 0
                    ? EMAIL_REGEX.test(email.trim())
                      ? 'border-emerald-500/60 dark:border-emerald-500/40 focus:border-emerald-500'
                      : 'border-rose-400 dark:border-rose-500/60 focus:border-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-brand-500'
                } text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition shadow-2xs`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Contraseña *
              </label>
              {isRegister && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {passwordStrength.text}
                </span>
              )}
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator Bar */}
            {isRegister && password && (
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden flex gap-1">
                <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (isRegister && !isOnline)}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 transition hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading
              ? 'Procesando...'
              : isRegister
              ? (!isOnline ? 'Registro no disponible sin conexión' : 'Completar Registro')
              : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Switch tab */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-bold transition block w-full"
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta todavía? Regístrate gratis'}
          </button>

          {/* Acceso por Token Institucional para pruebas / desarrollo */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTokenAccess(!showTokenAccess)}
              className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 transition"
            >
              {showTokenAccess ? '▲ Ocultar acceso por Token JWT' : '🔐 ¿Ingresar con Token Institucional?'}
            </button>

            {showTokenAccess && (
              <form onSubmit={handleDirectTokenSubmit} className="mt-2 text-left space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  value={directTokenInput}
                  onChange={(e) => setDirectTokenInput(e.target.value)}
                  placeholder="Pega aquí tu token JWT..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white font-mono"
                />
                <button
                  type="submit"
                  disabled={!directTokenInput.trim()}
                  className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
                >
                  Validar Token
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
