import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, MessageSquare, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
// TODO: Enable Google OAuth later.
// import GoogleAuthButton from '../components/auth/GoogleAuthButton';

export default function RegisterPage() {
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors([]);
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) setFieldErrors(data.errors);
      else if (data?.error) setError(data.error);
      else setError('Could not reach the server. Make sure the backend is running on port 5000 and refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Enable Google OAuth later.
  // const handleGoogleCredential = async (credential) => {
  //   setError('');
  //   setFieldErrors([]);
  //   await loginWithGoogle(credential);
  //   navigate('/');
  // };

  const getFieldError = (field) => fieldErrors.find((e) => e.path === field)?.msg;
  const fieldClass = (field) =>
    `w-full rounded-xl border bg-white px-4 py-2.5 pl-10 text-sm font-medium text-slate-950 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 ${
      getFieldError(field) ? 'border-red-400 dark:border-red-400/70' : 'border-slate-300 dark:border-white/10'
    }`;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eaf7f2] p-4 text-slate-950 dark:bg-[#071216] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(20,184,166,0.35),transparent_30%),radial-gradient(circle_at_86%_20%,rgba(244,114,182,0.24),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.2),transparent_36%)]" />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-5 top-5 z-10 grid h-11 w-11 place-items-center rounded-2xl border border-white/40 bg-white/45 text-slate-800 shadow-lg backdrop-blur-xl hover:bg-white/65 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="relative w-full max-w-md animate-fade-in rounded-[28px] border border-white/45 bg-white/70 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/60">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-fuchsia-500 shadow-lg shadow-cyan-500/20">
            <MessageSquare className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white">Create account</h1>
          <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">Join the conversation today</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="johndoe"
                className={fieldClass('username')}
              />
            </div>
            {getFieldError('username') && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{getFieldError('username')}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className={fieldClass('email')}
              />
            </div>
            {getFieldError('email') && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{getFieldError('email')}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Min. 6 characters"
                className={`${fieldClass('password')} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {getFieldError('password') && <p className="mt-1 text-xs text-red-600 dark:text-red-300">{getFieldError('password')}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* TODO: Enable Google OAuth later.
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <GoogleAuthButton label="Sign up with Google" onCredential={handleGoogleCredential} onError={setError} />
        */}

        <p className="mt-6 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="font-black text-cyan-700 hover:underline dark:text-cyan-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
