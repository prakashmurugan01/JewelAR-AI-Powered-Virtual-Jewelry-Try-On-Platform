import React, { useState, useEffect, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMail, HiLockClosed, HiUser, HiPhone, HiArrowRight,
  HiEye, HiEyeOff, HiCheckCircle,
} from 'react-icons/hi';

const JewelryScene = React.lazy(() => import('../components/three/JewelryScene'));

/* ═══ Password Strength ═══ */
function PasswordStrength({ password }) {
  const getStrength = (pw) => {
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = getStrength(password);
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  if (!password) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4,5].map((l) => (
          <div key={l} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ backgroundColor: strength >= l ? colors[strength] : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <p className="text-[10px] font-medium" style={{ color: colors[strength] }}>{labels[strength]}</p>
    </motion.div>
  );
}

/* ═══ Form Input ═══ */
function FormInput({ id, icon: Icon, label, type = 'text', value, onChange, placeholder, required = true, showToggle = false }) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 dark:text-white/40 light:text-gray-500 mb-1.5">{label}</label>
      <div className="relative group">
        <div className="absolute -inset-[1px] rounded-xl transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
          style={{ background: 'linear-gradient(135deg, #d946ef, #f97316)', filter: 'blur(4px)' }} />
        <div className="relative">
          <Icon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused ? 'text-primary-400' : 'text-white/25 light:text-gray-400'}`} />
          <input
            id={id} type={showToggle ? (showPw ? 'text' : 'password') : type}
            required={required} value={value} onChange={onChange}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            className="relative w-full py-3 pl-10 pr-4 bg-white/[0.04] light:bg-white/80 border border-white/[0.08] light:border-gray-200 rounded-xl text-white light:text-gray-900 placeholder-white/20 light:placeholder-gray-400 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
            placeholder={placeholder}
          />
          {showToggle && (
            <button type="button" onClick={() => setShowPw(!showPw)}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all duration-300 p-1.5 rounded-lg ${
                showPw
                  ? 'text-primary-400 bg-primary-500/20 hover:bg-primary-500/30'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/10'
              }`}>
              {showPw ? <HiEyeOff className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Steps indicator ═══ */
function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
            i < step ? 'bg-primary-500 text-white shadow-neon' :
            i === step ? 'bg-primary-500/20 border-2 border-primary-500 text-primary-400' :
            'bg-white/5 light:bg-gray-100 text-white/20 light:text-gray-400'
          }`}>
            {i < step ? <HiCheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-0.5 rounded-full transition-all duration-500 ${
              i < step ? 'bg-primary-500' : 'bg-white/10 light:bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  REGISTER PAGE                                                 */
/* ═══════════════════════════════════════════════════════════════ */
export default function Register() {
  const { register, error, setError, socialLogin, initiateGoogleLogin, initiateGitHubLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: '', username: '', password: '', password_confirm: '',
    first_name: '', last_name: '', phone: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 0) { setStep(1); return; }
    setLoading(true);
    setError(null);
    const result = await register(form);
    setLoading(false);
    if (result.success) setSuccess(true);
  };

  // ═══ Handle OAuth callback ═══
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      window.history.replaceState({}, '', '/register');
      handleSocialCallback(state, code);
    }
  }, [location.search]);

  const handleSocialCallback = async (provider, code) => {
    setSocialLoading(true);
    const result = await socialLogin(provider, code);
    setSocialLoading(false);
    if (result?.success) navigate('/dashboard');
  };

  /* ═══ Success Screen ═══ */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface-950 dark:bg-surface-950 light:bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card p-10 max-w-md text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            className="text-7xl mb-5 inline-block"
          >
            🎉
          </motion.div>
          <h2 className="text-2xl font-display font-black mb-3 dark:text-white light:text-gray-900">
            Registration Successful!
          </h2>
          <p className="text-white/50 dark:text-white/50 light:text-gray-500 mb-8 text-sm leading-relaxed">
            Your account is pending admin approval.<br />
            You'll receive a notification once approved.
          </p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Go to Sign In <HiArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══ LEFT: 3D Scene ═══ */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-surface-950 to-accent-900/30" />
        <div className="absolute inset-0 z-[1]">
          <Suspense fallback={null}><JewelryScene /></Suspense>
        </div>
        <div className="relative z-[2] flex flex-col justify-between p-12 w-full">
          <Link to="/home" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl shadow-neon group-hover:scale-110 transition-transform">J</div>
            <span className="text-2xl font-display font-bold text-gradient">JewelAR</span>
          </Link>
          <div>
            <motion.h2 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-4xl xl:text-5xl font-display font-black leading-tight mb-4">
              Join the<br /><span className="text-gradient">Experience</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-white/40 text-sm max-w-xs">
              Create your account and start trying on jewelry in real-time with our AI-powered AR platform.
            </motion.p>
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="flex flex-col gap-3">
            {[
              { emoji: '💎', text: 'Access 200+ jewelry pieces' },
              { emoji: '📸', text: 'Unlimited AR try-on sessions' },
              { emoji: '⚡', text: 'Instant AI face analysis' },
            ].map((perk, i) => (
              <div key={i} className="flex items-center gap-3 text-white/30 text-sm">
                <span className="text-lg">{perk.emoji}</span>
                <span>{perk.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ═══ RIGHT: Registration Form ═══ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative bg-surface-950 dark:bg-surface-950 light:bg-gray-50">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 30% 50%, rgba(217,70,239,0.06) 0%, transparent 50%)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <Link to="/home" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg shadow-neon">J</div>
              <span className="text-xl font-display font-bold text-gradient">JewelAR</span>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-display font-black dark:text-white light:text-gray-900 mb-2">Create account</h1>
            <p className="text-white/40 dark:text-white/40 light:text-gray-500 text-sm">
              {step === 0 ? 'Start with your personal details' : 'Set up your login credentials'}
            </p>
          </div>

          <StepIndicator step={step} total={2} />

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div key="step-0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput id="reg-first-name" icon={HiUser} label="First Name" value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="First" required={false} />
                    <FormInput id="reg-last-name" icon={HiUser} label="Last Name" value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Last" required={false} />
                  </div>
                  <FormInput id="reg-email" icon={HiMail} label="Email" type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                  <FormInput id="reg-phone" icon={HiPhone} label="Phone (optional)" type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" required={false} />
                </motion.div>
              ) : (
                <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4">
                  <FormInput id="reg-username" icon={HiUser} label="Username" value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Choose a username" />
                  <div>
                    <FormInput id="reg-password" icon={HiLockClosed} label="Password" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Create a strong password" showToggle />
                    <PasswordStrength password={form.password} />
                  </div>
                  <FormInput id="reg-password-confirm" icon={HiLockClosed} label="Confirm Password" value={form.password_confirm}
                    onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} placeholder="Repeat password" showToggle />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(0)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 light:border-gray-200 text-white/50 light:text-gray-600 font-medium text-sm hover:bg-white/5 light:hover:bg-gray-50 transition-all">
                  ← Back
                </button>
              )}
              <motion.button
                id="reg-submit" type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex-1 relative group overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all disabled:opacity-50 shadow-xl shadow-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/50"
                style={{ background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #f97316 100%)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                  ) : step === 0 ? (
                    <>Continue <HiArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Create Account <HiArrowRight className="w-4 h-4" /></>
                  )}
                </span>
              </motion.button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/20 light:via-gray-300" />
            <span className="text-sm uppercase tracking-widest font-bold text-white/40 dark:text-white/40 light:text-gray-500 px-3">or sign up with</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/20 light:via-gray-300" />
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={initiateGoogleLogin}
              disabled={socialLoading}
              className="flex items-center justify-center gap-3 py-4 rounded-xl border border-white/[0.12] dark:border-white/[0.12] light:border-gray-300 bg-gradient-to-br from-white/[0.08] to-white/[0.03] dark:from-white/[0.08] dark:to-white/[0.03] light:from-white light:to-white hover:from-white/[0.15] hover:to-white/[0.08] light:hover:from-gray-50 light:hover:to-gray-50 hover:border-white/[0.2] light:hover:border-gray-400 transition-all duration-300 text-base font-semibold text-white/70 dark:text-white/70 light:text-gray-700 hover:text-white/90 light:hover:text-gray-900 hover:scale-[1.03] active:scale-95 shadow-lg shadow-transparent hover:shadow-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button
              type="button"
              onClick={initiateGitHubLogin}
              disabled={socialLoading}
              className="flex items-center justify-center gap-3 py-4 rounded-xl border border-white/[0.12] dark:border-white/[0.12] light:border-gray-300 bg-gradient-to-br from-white/[0.08] to-white/[0.03] dark:from-white/[0.08] dark:to-white/[0.03] light:from-white light:to-white hover:from-white/[0.15] hover:to-white/[0.08] light:hover:from-gray-50 light:hover:to-gray-50 hover:border-white/[0.2] light:hover:border-gray-400 transition-all duration-300 text-base font-semibold text-white/70 dark:text-white/70 light:text-gray-700 hover:text-white/90 light:hover:text-gray-900 hover:scale-[1.03] active:scale-95 shadow-lg shadow-transparent hover:shadow-white/[0.1] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
              GitHub
            </button>
          </div>

          <p className="text-center text-base font-medium mt-10 text-white/50 dark:text-white/50 light:text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="bg-gradient-to-r from-primary-500 to-pink-500 bg-clip-text text-transparent hover:from-primary-400 hover:to-pink-400 font-bold transition-all duration-300">Sign in →</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
