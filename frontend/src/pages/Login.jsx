import React, { useState, useEffect, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMail, HiLockClosed, HiSparkles, HiArrowRight,
  HiEye, HiEyeOff, HiShieldCheck, HiLightningBolt,
} from 'react-icons/hi';

const JewelryScene = React.lazy(() => import('../components/three/JewelryScene'));

/* ═══ Animated floating gems ═══ */
function FloatingGems() {
  const gems = ['💎', '✨', '💍', '📿', '👑', '🔮'];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {gems.map((gem, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl opacity-20"
          initial={{
            x: `${15 + i * 15}%`,
            y: `${10 + (i * 17) % 80}%`,
          }}
          animate={{
            y: [`${10 + (i * 17) % 80}%`, `${5 + (i * 13) % 70}%`, `${10 + (i * 17) % 80}%`],
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6 + i * 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {gem}
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Password Strength Indicator ═══ */
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
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-2"
    >
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{
              backgroundColor: strength >= level ? colors[strength] : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>
      <p className="text-[10px] font-medium" style={{ color: colors[strength] }}>
        {labels[strength]}
      </p>
    </motion.div>
  );
}

/* ═══ Animated Input Field ═══ */
function FormInput({ id, icon: Icon, label, type = 'text', value, onChange, placeholder, required = true, showToggle = false }) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <label className="block text-sm font-bold uppercase tracking-wider text-white/50 dark:text-white/50 light:text-gray-600 mb-3">
        {label}
      </label>
      <div className="relative group">
        {/* Animated border glow */}
        <div
          className="absolute -inset-[1px] rounded-xl transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
          style={{
            background: 'linear-gradient(135deg, #d946ef, #f97316, #d946ef)',
            filter: 'blur(4px)',
          }}
        />

        <div className="relative">
          <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
            focused ? 'text-primary-400' : 'text-white/25 dark:text-white/25 light:text-gray-400'
          }`} />
          <input
            id={id}
            type={showToggle ? (showPassword ? 'text' : 'password') : type}
            required={required}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="relative w-full px-4 py-4 pl-12 bg-white/[0.04] dark:bg-white/[0.04] light:bg-white/80 border border-white/[0.08] dark:border-white/[0.08] light:border-gray-200 rounded-xl text-white dark:text-white light:text-gray-900 placeholder-white/20 dark:placeholder-white/20 light:placeholder-gray-400 focus:outline-none focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 text-base font-medium"
            placeholder={placeholder}
          />
          {showToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 p-2 rounded-lg text-lg font-bold ${
                showPassword
                  ? 'text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 shadow-lg shadow-cyan-500/50'
                  : 'text-white/30 hover:text-cyan-300 hover:bg-cyan-500/20 hover:shadow-md hover:shadow-cyan-500/20'
              }`}
            >
              {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  LOGIN PAGE                                                    */
/* ═══════════════════════════════════════════════════════════════ */
export default function Login() {
  const { login, error, setError, socialLogin, initiateGoogleLogin, initiateGitHubLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ═══ Handle OAuth callback: ?code=...&state=google|github ═══
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state'); // 'google' or 'github'
    if (code && state) {
      // Clear URL params
      window.history.replaceState({}, '', '/login');
      handleSocialCallback(state, code);
    }
  }, [location.search]);

  const handleSocialCallback = async (provider, code) => {
    setSocialLoading(true);
    const result = await socialLogin(provider, code);
    setSocialLoading(false);
    if (result?.success) navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
  };

  if (socialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 dark:bg-surface-950 light:bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 dark:text-white/50 light:text-gray-500 text-sm">Signing you in...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ═══ LEFT: 3D Scene Panel ═══ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-surface-950 to-primary-900" />

        {/* 3D Scene */}
        <div className="absolute inset-0 z-[1]">
          <Suspense fallback={null}>
            <JewelryScene />
          </Suspense>
        </div>

        {/* Floating gems */}
        <FloatingGems />

        {/* Overlay content */}
        <div className="relative z-[2] flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl group-hover:scale-110 transition-transform shadow-neon">
              J
            </div>
            <span className="text-2xl font-display font-bold text-gradient">JewelAR</span>
          </Link>

          {/* Center tagline */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-4xl xl:text-5xl font-display font-black leading-tight mb-4"
            >
              Try Before<br />
              <span className="text-gradient">You Buy</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-white/40 text-sm max-w-sm leading-relaxed"
            >
              Experience jewelry virtually with AI-powered face tracking,
              real-time overlay, and pixel-perfect placement.
            </motion.p>
          </div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-6"
          >
            {[
              { icon: <HiShieldCheck className="w-5 h-5 text-emerald-400" />, text: 'Secure Login' },
              { icon: <HiLightningBolt className="w-5 h-5 text-amber-400" />, text: '60 FPS AR' },
              { icon: <HiSparkles className="w-5 h-5 text-fuchsia-400" />, text: 'AI Powered' },
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 text-white/30 text-xs">
                {badge.icon}
                <span>{badge.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ═══ RIGHT: Login Form ═══ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative bg-gradient-to-br from-white/95 via-white/90 to-white/95 dark:from-surface-900 dark:via-surface-950 dark:to-surface-900 light:from-gray-50 light:via-gray-50 light:to-gray-100">
        {/* Enhanced gradient mesh background */}
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 20% 30%, rgba(217,70,239,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(249,115,22,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(34,197,94,0.06) 0%, transparent 60%)',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/home" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl shadow-neon">
                J
              </div>
              <span className="text-2xl font-display font-bold text-gradient">JewelAR</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl font-display font-black bg-gradient-to-r from-primary-600 to-pink-600 bg-clip-text text-transparent mb-3">
                Welcome back
              </h1>
              <p className="text-white/50 dark:text-white/50 light:text-gray-600 text-base font-medium">
                Sign in to continue your virtual try-on experience
              </p>
            </motion.div>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-6 p-5 rounded-xl bg-red-500/15 border-2 border-red-500/40 flex items-center gap-4 shadow-lg"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold">⚠️</span>
                </div>
                <p className="text-red-400 text-base font-semibold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-7">
            <FormInput
              id="login-email"
              icon={HiMail}
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
            />

            <div>
              <FormInput
                id="login-password"
                icon={HiLockClosed}
                label="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                showToggle
              />
              <PasswordStrength password={form.password} />
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between pt-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-6 h-6 rounded-md border-2 transition-all duration-300 flex items-center justify-center flex-shrink-0 ${
                    rememberMe
                      ? 'bg-primary-500 border-primary-500 shadow-neon'
                      : 'border-white/30 dark:border-white/30 light:border-gray-400 hover:border-primary-500'
                  }`}
                >
                  {rememberMe && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-3.5 h-3.5 text-white font-bold"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </div>
                <span className="text-sm font-semibold text-white/60 dark:text-white/60 light:text-gray-700 group-hover:text-white/80 transition-colors">
                  Remember me
                </span>
              </label>
              <a href="/forgot-password" className="text-sm font-bold text-primary-500 hover:text-primary-400 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <motion.button
              id="login-submit"
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative group overflow-hidden rounded-xl py-4 font-semibold text-white transition-all duration-300 disabled:opacity-50 shadow-xl shadow-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/50"
              style={{
                background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #f97316 100%)',
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <HiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/20 light:via-gray-300" />
            <span className="text-sm uppercase tracking-widest font-bold text-white/40 dark:text-white/40 light:text-gray-500 px-3">or continue</span>
            <div className="flex-1 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/20 light:via-gray-300" />
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={initiateGoogleLogin}
              className="flex items-center justify-center gap-3 py-4 rounded-xl border border-white/[0.12] dark:border-white/[0.12] light:border-gray-300 bg-gradient-to-br from-white/[0.08] to-white/[0.03] dark:from-white/[0.08] dark:to-white/[0.03] light:from-white light:to-white hover:from-white/[0.15] hover:to-white/[0.08] light:hover:from-gray-50 light:hover:to-gray-50 hover:border-white/[0.2] light:hover:border-gray-400 transition-all duration-300 text-base font-semibold text-white/70 dark:text-white/70 light:text-gray-700 hover:text-white/90 light:hover:text-gray-900 hover:scale-[1.03] active:scale-95 shadow-lg shadow-transparent hover:shadow-white/[0.1]"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button
              type="button"
              onClick={initiateGitHubLogin}
              className="flex items-center justify-center gap-3 py-4 rounded-xl border border-white/[0.12] dark:border-white/[0.12] light:border-gray-300 bg-gradient-to-br from-white/[0.08] to-white/[0.03] dark:from-white/[0.08] dark:to-white/[0.03] light:from-white light:to-white hover:from-white/[0.15] hover:to-white/[0.08] light:hover:from-gray-50 light:hover:to-gray-50 hover:border-white/[0.2] light:hover:border-gray-400 transition-all duration-300 text-base font-semibold text-white/70 dark:text-white/70 light:text-gray-700 hover:text-white/90 light:hover:text-gray-900 hover:scale-[1.03] active:scale-95 shadow-lg shadow-transparent hover:shadow-white/[0.1]"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
              GitHub
            </button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-base font-medium mt-10 text-white/50 dark:text-white/50 light:text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="bg-gradient-to-r from-primary-500 to-pink-500 bg-clip-text text-transparent hover:from-primary-400 hover:to-pink-400 font-bold transition-all duration-300 inline-flex items-center gap-1">
              Create one free <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
