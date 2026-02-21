import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Redirect if already logged in as admin
  React.useEffect(() => {
      if (user?.role === 'admin') {
          navigate('/admin');
      }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
        const { success, error: authError } = await login(email.trim(), password.trim());
        if (success) {
            // Check role after login in the effect or here if possible, 
            // but relying on AuthContext state update is safer.
            // Note: In a real app, we should check role claim immediately.
            // For now, we wait for AuthContext to update.
        } else {
            setError(authError || 'Invalid admin credentials.');
        }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black relative overflow-hidden">
      {/* Darker, more serious theme for Admin */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black opacity-80 pointer-events-none"></div>

      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] relative z-10 p-8 animate-fade-in">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 text-red-500 mb-4 border border-red-900/50">
                <ShieldCheck size={32} />
            </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Admin Portal
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Restricted Access. Authorized Personnel Only.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Admin Email
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-600" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white pl-10 pr-4 py-3 rounded-lg focus:border-red-900 focus:shadow-[0_0_15px_rgba(153,27,27,0.2)] focus:outline-none transition-all placeholder-neutral-700"
                placeholder="admin@arrow.delivery"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 text-white px-4 py-3 rounded-lg focus:border-red-900 focus:shadow-[0_0_15px_rgba(153,27,27,0.2)] focus:outline-none transition-all placeholder-neutral-700"
            placeholder="••••••••"
            required
            />
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-900 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-neutral-100 hover:bg-white text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.01] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Verifying...' : <>Access Dashboard <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-neutral-900">
            <button 
              onClick={() => navigate('/login')}
              className="text-gray-600 text-xs hover:text-white transition-colors"
            >
              Return to Client Login
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;