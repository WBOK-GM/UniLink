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
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithToken } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('estudiante@unilink.edu.co');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('Universidad Pedagógica y Tecnológica de Colombia (UPTC)');
  const [academicProgram, setAcademicProgram] = useState('Ingeniería de Sistemas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTokenAccess, setShowTokenAccess] = useState(false);
  const [directTokenInput, setDirectTokenInput] = useState('');

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

    try {
      if (isRegister) {
        await register({
          email,
          password,
          full_name: fullName,
          university,
          academic_program: academicProgram,
          semester: 5
        });
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al procesar solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass = '123456') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    setError('');
    try {
      await login(demoEmail, demoPass);
      navigate('/');
    } catch (e) {
      setError(e.message);
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

        {/* Demo Fast Login Shortcuts */}
        {!isRegister && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-brand-50/60 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/90 border border-brand-200/80 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Acceso Rápido Demo</span>
              </span>
              <span className="text-[10px] text-brand-600 dark:text-brand-400">1 clic</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('estudiante@unilink.edu.co')}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-750 text-brand-700 dark:text-brand-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition truncate text-center"
              >
                Estudiante Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@unilink.edu.co')}
                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-750 text-purple-700 dark:text-purple-300 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition truncate text-center"
              >
                Admin Demo
              </button>
            </div>

            {/* Acceso Directo por Token de Acceso */}
            <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setShowTokenAccess(!showTokenAccess)}
                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition flex items-center justify-between w-full"
              >
                <span>¿Tienes un Token de Acceso institucional?</span>
                <span>{showTokenAccess ? '▲ Ocultar' : '▼ Pegar Token'}</span>
              </button>

              {showTokenAccess && (
                <form onSubmit={handleDirectTokenSubmit} className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={directTokenInput}
                    onChange={(e) => setDirectTokenInput(e.target.value)}
                    placeholder="Pega aquí tu token JWT o clave..."
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!directTokenInput.trim()}
                    className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs"
                  >
                    Ingresar con Token
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 font-semibold leading-relaxed">
            {error}
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
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Correo Institucional *
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="estudiante@unilink.edu.co"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition shadow-2xs"
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
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isRegister ? 'Completar Registro' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Switch tab */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-bold transition"
          >
            {isRegister
              ? '¿Ya tienes una cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta todavía? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  );
}
