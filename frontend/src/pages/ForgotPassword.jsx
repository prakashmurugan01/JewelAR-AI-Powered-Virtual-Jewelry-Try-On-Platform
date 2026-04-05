import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMail, HiLockClosed, HiArrowRight, HiArrowLeft,
  HiEye, HiEyeOff, HiShieldCheck, HiCheckCircle,
} from 'react-icons/hi';
import api from '../services/api';

/* ═══ Step Indicator ═══ */
function StepProgress({ step }) {
  const steps = [
    { icon: <HiMail className="w-4 h-4" />, label: 'Email' },
    { icon: <HiShieldCheck className="w-4 h-4" />, label: 'Verify' },
    { icon: <HiLockClosed className="w-4 h-4" />, label: 'Reset' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <motion.div
            animate={{
              scale: step === i ? 1.1 : 1,
              backgroundColor: step > i
                ? '#a855f7'
                : step === i
                ? 'rgba(168,85,247,0.2)'
                : 'rgba(255,255,255,0.05)',
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
              step > i
                ? 'text-white shadow-neon'
                : step === i
                ? 'text-primary-400 border-2 border-primary-500'
                : 'text-white/20 light:text-gray-400'
            }`}
          >
            {step > i ? <HiCheckCircle className="w-5 h-5" /> : s.icon}
          </motion.div>
          {i < steps.length - 1 && (
            <div className="w-12 h-0.5 rounded-full overflow-hidden bg-white/10 light:bg-gray-200">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: step > i ? '100%' : '0%' }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="h-full bg-primary-500"
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══ OTP Input — 6 individual digit boxes ═══ */
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);

  const handleChange = (idx, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val && e.nativeEvent.inputType === 'deleteContentBackward') {
      // Backspace → move to previous
      const newOtp = value.split('');
      newOtp[idx] = '';
      onChange(newOtp.join(''));
      if (idx > 0) inputs.current[idx - 1]?.focus();
      return;
    }
    const digit = val.slice(-1);
    const newOtp = value.split('');
    newOtp[idx] = digit;
    onChange(newOtp.join(''));
    if (digit && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, ' ').slice(0, 6).replace(/ /g, ''));
    const lastIdx = Math.min(pasted.length, 5);
    inputs.current[lastIdx]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <motion.input
          key={idx}
          ref={(el) => (inputs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(idx, e)}
          onPaste={idx === 0 ? handlePaste : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[idx] && idx > 0) {
              inputs.current[idx - 1]?.focus();
            }
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-300 bg-white/[0.04] light:bg-white focus:outline-none ${
            value[idx]
              ? 'border-primary-500 text-white light:text-gray-900 shadow-neon'
              : 'border-white/10 light:border-gray-200 text-white/30 light:text-gray-400'
          } focus:border-primary-400 focus:scale-110`}
        />
      ))}
    </div>
  );
}

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
        {[1, 2, 3, 4, 5].map((l) => (
          <div key={l} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ backgroundColor: strength >= l ? colors[strength] : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <p className="text-[10px] font-medium" style={{ color: colors[strength] }}>{labels[strength]}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  FORGOT PASSWORD PAGE — 3-Step Animated Wizard                */
/* ═══════════════════════════════════════════════════════════════ */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Form state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ═══ Step 1: Request OTP ═══
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/password-reset/request/', { email });
      if (res.data.success) {
        setStep(1);
        setCountdown(60);
        // In debug mode, auto-fill OTP for testing
        if (res.data.debug_otp) {
          console.log('Debug OTP:', res.data.debug_otp);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code.');
    }
    setLoading(false);
  };

  // ═══ Step 2: Verify OTP ═══
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/password-reset/verify/', { email, otp });
      if (res.data.success) {
        setResetToken(res.data.reset_token);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    }
    setLoading(false);
  };

  // ═══ Step 3: Set New Password ═══
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/password-reset/confirm/', {
        email,
        otp,
        reset_token: resetToken,
        new_password: newPassword,
      });
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    }
    setLoading(false);
  };

  // Resend OTP
  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      await api.post('/api/password-reset/request/', { email });
      setCountdown(60);
      setOtp('');
      setError('');
    } catch {
      setError('Failed to resend code.');
    }
    setLoading(false);
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
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <HiCheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h2 className="text-2xl font-display font-black mb-3 dark:text-white light:text-gray-900">
            Password Reset!
          </h2>
          <p className="text-white/50 dark:text-white/50 light:text-gray-500 mb-8 text-sm leading-relaxed">
            Your password has been successfully updated.<br />
            You can now sign in with your new password.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #f97316 100%)' }}
          >
            Go to Sign In <HiArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-950 dark:bg-surface-950 light:bg-gray-50 relative">
      {/* Mesh bg */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 30%, rgba(217,70,239,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(249,115,22,0.06) 0%, transparent 50%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/home" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl shadow-neon group-hover:scale-110 transition-transform">J</div>
            <span className="text-2xl font-display font-bold text-gradient">JewelAR</span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          {/* Step Progress */}
          <StepProgress step={step} />

          {/* Header */}
          <div className="text-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h1 className="text-2xl font-display font-black dark:text-white light:text-gray-900 mb-2">
                  {step === 0 && 'Forgot Password?'}
                  {step === 1 && 'Verify Your Email'}
                  {step === 2 && 'Create New Password'}
                </h1>
                <p className="text-white/40 dark:text-white/40 light:text-gray-500 text-sm">
                  {step === 0 && "Enter your email and we'll send you a reset code"}
                  {step === 1 && `We sent a 6-digit code to ${email}`}
                  {step === 2 && 'Set up a strong new password'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2"
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {/* STEP 0: Email Input */}
            {step === 0 && (
              <motion.form
                key="step-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRequestOTP}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 dark:text-white/40 light:text-gray-500 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-[1px] rounded-xl transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
                      style={{ background: 'linear-gradient(135deg, #d946ef, #f97316)', filter: 'blur(4px)' }} />
                    <div className="relative">
                      <HiMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25 light:text-gray-400" />
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="relative w-full py-3.5 pl-12 pr-4 bg-white/[0.04] light:bg-white/80 border border-white/[0.08] light:border-gray-200 rounded-xl text-white light:text-gray-900 placeholder-white/20 light:placeholder-gray-400 focus:outline-none focus:border-primary-500/50 transition-all text-sm"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full relative group overflow-hidden rounded-xl py-4 font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #f97316 100%)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <>Send Reset Code <HiArrowRight className="w-4 h-4" /></>
                    )}
                  </span>
                </motion.button>
              </motion.form>
            )}

            {/* STEP 1: OTP Verification */}
            {step === 1 && (
              <motion.form
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-6"
              >
                <OTPInput value={otp} onChange={setOtp} />

                {/* Countdown / Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-white/30 light:text-gray-400 text-sm">
                      Resend code in <span className="text-primary-400 font-semibold">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-primary-400 hover:text-primary-300 font-medium text-sm transition-colors"
                    >
                      Didn't get the code? Resend
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(0); setOtp(''); setError(''); }}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 light:border-gray-200 text-white/50 light:text-gray-600 font-medium text-sm hover:bg-white/5 light:hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                  >
                    <HiArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 relative group overflow-hidden rounded-xl py-3.5 font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #f97316 100%)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
                      ) : (
                        <>Verify <HiArrowRight className="w-4 h-4" /></>
                      )}
                    </span>
                  </motion.button>
                </div>
              </motion.form>
            )}

            {/* STEP 2: New Password */}
            {step === 2 && (
              <motion.form
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 light:text-gray-500 mb-2">New Password</label>
                  <div className="relative group">
                    <div className="absolute -inset-[1px] rounded-xl transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
                      style={{ background: 'linear-gradient(135deg, #d946ef, #f97316)', filter: 'blur(4px)' }} />
                    <div className="relative">
                      <HiLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25 light:text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="relative w-full py-3.5 pl-12 pr-12 bg-white/[0.04] light:bg-white/80 border border-white/[0.08] light:border-gray-200 rounded-xl text-white light:text-gray-900 placeholder-white/20 light:placeholder-gray-400 focus:outline-none focus:border-primary-500/50 transition-all text-sm"
                        placeholder="Create a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <PasswordStrength password={newPassword} />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 light:text-gray-500 mb-2">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute -inset-[1px] rounded-xl transition-opacity duration-300 opacity-0 group-focus-within:opacity-100"
                      style={{ background: 'linear-gradient(135deg, #d946ef, #f97316)', filter: 'blur(4px)' }} />
                    <div className="relative">
                      <HiLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/25 light:text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`relative w-full py-3.5 pl-12 pr-4 bg-white/[0.04] light:bg-white/80 border rounded-xl text-white light:text-gray-900 placeholder-white/20 light:placeholder-gray-400 focus:outline-none transition-all text-sm ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-red-500/50'
                            : confirmPassword && confirmPassword === newPassword
                            ? 'border-emerald-500/50'
                            : 'border-white/[0.08] light:border-gray-200'
                        }`}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-red-400 text-[10px] mt-1.5">Passwords do not match</motion.p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-emerald-400 text-[10px] mt-1.5 flex items-center gap-1">
                      <HiCheckCircle className="w-3 h-3" /> Passwords match
                    </motion.p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || !newPassword || newPassword !== confirmPassword}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full relative group overflow-hidden rounded-xl py-4 font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #d946ef 0%, #a855f7 50%, #f97316 100%)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
                    ) : (
                      <>Reset Password <HiCheckCircle className="w-4 h-4" /></>
                    )}
                  </span>
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Back to login */}
        <p className="text-center text-sm mt-8 text-white/40 dark:text-white/40 light:text-gray-500">
          Remember your password?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Back to Sign In →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
