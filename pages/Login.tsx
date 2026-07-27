import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, AlertTriangle, Mail, Lock, UserPlus } from 'lucide-react';

const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waitingForProfile, setWaitingForProfile] = useState(false);

  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (isLoginView) {
        const { success, error: authError } = await login(email.trim(), password.trim());
        if (success) {
          setWaitingForProfile(true);
          // AuthContext will set user, useEffect above will navigate
        } else {
          setError(authError || 'Invalid credentials.');
        }
      } else {
        const { success, error: authError } = await signup(email.trim(), password.trim());
        if (success) {
          setMessage('Account created! Please log in.');
          setIsLoginView(true);
          setEmail('');
          setPassword('');
        } else {
          setError(authError || 'Failed to create account.');
        }
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-arrow-black relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-arrow-deepGreen/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-arrow-green/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-arrow-green/3 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://i.imgur.com/ofuT9Pm.png"
            alt="Arrow Delivery"
            className="h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(47,191,142,0.4)]"
          />
        </div>

        <div className="bg-arrow-dark/80 backdrop-blur-xl border border-arrow-deepGreen/40 rounded-3xl p-8 md:p-10 shadow-[0_0_80px_rgba(30,111,74,0.15)]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {isLoginView ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-arrow-gray text-sm mt-2">
              {isLoginView ? 'Sign in to manage your deliveries.' : 'Join Arrow Delivery and start shipping today.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-arrow-gray mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arrow-gray/50" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950/80 border border-neutral-700/60 text-white pl-11 pr-4 py-3 rounded-xl focus:border-arrow-green/60 focus:ring-1 focus:ring-arrow-green/20 focus:outline-none transition-all placeholder-neutral-600 text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-arrow-gray mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-arrow-gray/50" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950/80 border border-neutral-700/60 text-white pl-11 pr-4 py-3 rounded-xl focus:border-arrow-green/60 focus:ring-1 focus:ring-arrow-green/20 focus:outline-none transition-all placeholder-neutral-600 text-sm"
                  placeholder="••••••••"
                  required
                  minLength={isLoginView ? 1 : 6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/40 text-red-300 text-sm p-3 rounded-xl flex items-center gap-2.5">
                <AlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="bg-emerald-900/20 border border-emerald-500/40 text-emerald-300 text-sm p-3 rounded-xl flex items-center gap-2.5">
                <UserPlus size={16} className="shrink-0" />
                {message}
              </div>
            )}

            {waitingForProfile && (
              <div className="text-center text-arrow-gray text-sm py-1 animate-pulse">
                Signing you in...
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || waitingForProfile}
              className="w-full bg-gradient-to-r from-arrow-green to-arrow-deepGreen hover:from-emerald-400 hover:to-emerald-600 text-black font-bold py-3.5 rounded-xl transition-all duration-300 transform hover:scale-[1.01] shadow-lg hover:shadow-arrow-green/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              {isSubmitting
                ? (isLoginView ? 'Signing in...' : 'Creating account...')
                : waitingForProfile
                ? 'Loading...'
                : (isLoginView ? <>Sign In <ArrowRight size={18} /></> : <>Create Account <ArrowRight size={18} /></>)
              }
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800/60 text-center">
            <p className="text-arrow-gray text-sm">
              {isLoginView ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={toggleView}
                className="text-arrow-green font-semibold hover:text-white transition-colors"
              >
                {isLoginView ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
