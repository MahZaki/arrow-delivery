import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, AlertTriangle, Mail, Lock, UserPlus, Key, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-login API token state
  const [showTokenStep, setShowTokenStep] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const navigate = useNavigate();
  const { login, signup, updateApiToken, user } = useAuth();

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
          // Show token step — user will be set by AuthContext, we check after
          setShowTokenStep(true);
        } else {
          setError(authError || 'Invalid credentials.');
        }
      } else {
        const { success, error: authError } = await signup(email.trim(), password.trim());
        if (success) {
          setMessage('Account created! Please log in.');
          setIsLoginView(true);
        } else {
          setError(authError || 'Failed to create account.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToken = async () => {
    if (!apiToken.trim()) {
      setTokenError('Please enter your Ecotrack API token.');
      return;
    }
    setIsSavingToken(true);
    setTokenError('');
    const success = await updateApiToken(apiToken.trim());
    setIsSavingToken(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setTokenError('Failed to save token. Please try again.');
    }
  };

  const handleSkipToken = () => {
    navigate('/dashboard');
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setShowTokenStep(false);
  };

  // ── Step 2: API Token Entry ──
  if (showTokenStep) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-arrow-black relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-arrow-deepGreen/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-arrow-green/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg bg-arrow-dark border border-arrow-deepGreen rounded-2xl shadow-[0_0_60px_rgba(30,111,74,0.4)] relative z-10 p-10 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-arrow-green/10 border border-arrow-green/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="text-arrow-green" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white">Connect Your Account</h2>
            <p className="text-arrow-gray text-sm mt-2">
              Enter your <span className="text-arrow-green font-semibold">Ecotrack API token</span> to sync your orders.
              <br />You can find it in your Ecotrack dashboard settings.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3 top-3.5 text-arrow-deepGreen" size={20} />
              <input
                type="text"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Paste your Ecotrack API token here"
                className="w-full bg-neutral-950 border border-neutral-700 text-white pl-10 pr-4 py-4 rounded-xl focus:border-arrow-green focus:shadow-[0_0_15px_rgba(47,191,142,0.2)] focus:outline-none transition-all placeholder-neutral-600 font-mono text-sm"
              />
            </div>

            {tokenError && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle size={16} />
                {tokenError}
              </div>
            )}

            <button
              onClick={handleSaveToken}
              disabled={isSavingToken}
              className="w-full bg-gradient-to-r from-arrow-green to-arrow-deepGreen hover:from-emerald-400 hover:to-emerald-600 text-black font-extrabold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {isSavingToken ? 'Saving...' : <><CheckCircle size={20} /> Save & Continue</>}
            </button>

            <button
              onClick={handleSkipToken}
              className="w-full py-3 text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Skip for now → Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: Login / Signup ──
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-arrow-black relative overflow-hidden">
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-arrow-deepGreen/10 to-transparent pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-arrow-green/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-arrow-dark border border-arrow-deepGreen rounded-2xl shadow-[0_0_60px_rgba(30,111,74,0.4)] relative z-10 p-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-8">
            <img
              src="https://i.imgur.com/ofuT9Pm.png"
              alt="Arrow Delivery Logo"
              className="h-48 md:h-56 w-auto object-contain drop-shadow-[0_0_25px_rgba(47,191,142,0.5)]"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            {isLoginView ? 'Client Access' : 'Create Account'}
          </h1>
          <p className="text-arrow-gray text-base mt-3">
            {isLoginView ? 'Log in to your account.' : 'Join the Arrow Delivery network.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-arrow-gray mb-2">
              {isLoginView ? 'Email' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-arrow-deepGreen" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white pl-10 pr-4 py-4 rounded-xl focus:border-arrow-green focus:shadow-[0_0_15px_rgba(47,191,142,0.2)] focus:outline-none transition-all placeholder-neutral-700"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-arrow-gray mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-arrow-deepGreen" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white pl-10 pr-4 py-4 rounded-xl focus:border-arrow-green focus:shadow-[0_0_15px_rgba(47,191,142,0.2)] focus:outline-none transition-all placeholder-neutral-700"
                placeholder="••••••••"
                required
                minLength={isLoginView ? 1 : 6}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-300 text-sm p-4 rounded-lg flex items-center gap-2 animate-shake">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-900/20 border border-green-500/50 text-green-300 text-sm p-4 rounded-lg flex items-center gap-2 animate-fade-in">
              <UserPlus size={18} />
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-arrow-green to-arrow-deepGreen hover:from-emerald-400 hover:to-emerald-600 text-black font-extrabold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {isSubmitting
              ? (isLoginView ? 'Logging in...' : 'Creating Account...')
              : (isLoginView ? <>Login <ArrowRight size={22} /></> : <>Sign Up <UserPlus size={22} /></>)
            }
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-arrow-gray">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={toggleView}
              className="text-arrow-green font-bold hover:text-white hover:underline transition-colors"
            >
              {isLoginView ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;