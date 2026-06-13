import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
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
      else setError(data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field) => fieldErrors.find((e) => e.path === field)?.msg;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the conversation today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                placeholder="johndoe"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${getFieldError('username') ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>
            {getFieldError('username') && (
              <p className="mt-1 text-xs text-red-600">{getFieldError('username')}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${getFieldError('email') ? 'border-red-400' : 'border-gray-300'}`}
              />
            </div>
            {getFieldError('email') && (
              <p className="mt-1 text-xs text-red-600">{getFieldError('email')}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="Min. 6 characters"
                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${getFieldError('password') ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {getFieldError('password') && (
              <p className="mt-1 text-xs text-red-600">{getFieldError('password')}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
