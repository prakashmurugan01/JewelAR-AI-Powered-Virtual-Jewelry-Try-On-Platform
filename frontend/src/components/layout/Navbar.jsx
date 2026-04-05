import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { HiMenu, HiX, HiLogout, HiSparkles, HiLightningBolt } from 'react-icons/hi';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { liteMode, toggleLiteMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', auth: true },
    { path: '/try-on', label: 'Try-On Studio', auth: true, highlight: true },
    { path: '/favorites', label: 'Favorites', auth: true },
    { path: '/history', label: 'History', auth: true },
  ];

  if (user?.role?.includes('admin')) {
    navLinks.push({ path: '/admin', label: 'Admin', auth: true });
  }

  const isActive = (path) => location.pathname === path;
  const publicActionClasses =
    'inline-flex items-center justify-center rounded-[1.05rem] px-5 py-2.5 text-sm font-semibold transition-all duration-300';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#070b18]/88 shadow-[0_16px_45px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition-colors duration-500 dark:bg-[#070b18]/88 light:border-gray-200/70 light:bg-white/88">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/home" className="group relative flex items-center gap-3">
            <div className="absolute -inset-2 hidden rounded-[1.4rem] bg-[radial-gradient(circle,_rgba(236,72,153,0.26),_transparent_70%)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 sm:block" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#f59e0b_0%,#ec4899_100%)] text-lg font-bold text-white shadow-[0_12px_28px_rgba(236,72,153,0.28)] transition-transform duration-300 group-hover:scale-105">
              J
            </div>
            <span className="hidden text-[1.9rem] font-display font-bold tracking-tight text-[#ee84d8] drop-shadow-[0_4px_18px_rgba(236,72,153,0.18)] sm:block light:text-[#c02690]">
              JewelAR
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated && navLinks.filter(l => l.auth).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-white/[0.08] text-[#f1b8ec] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                    : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
                } ${link.highlight ? 'flex items-center gap-1.5' : ''}`}
              >
                {link.highlight && <HiSparkles className="w-4 h-4 text-[#f5c35a]" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated && (
              <button
                onClick={toggleLiteMode}
                title={liteMode ? 'Lite Mode On - Click to disable' : 'Click to enable Lite Mode for better performance'}
                className={`rounded-[1rem] border p-2 transition-all ${
                  liteMode
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
                    : 'border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <HiLightningBolt className="w-5 h-5" />
              </button>
            )}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-white/85 transition-all duration-300 hover:bg-white/[0.08]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#ec4899_100%)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(236,72,153,0.22)]">
                    {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block text-sm text-white/80">
                    {user?.first_name || user?.username}
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-56 animate-slide-down overflow-hidden rounded-[1.2rem] border border-white/[0.08] bg-[#0d1324]/96 py-2 shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur-2xl light:border-gray-200 light:bg-white/96">
                    <div className="border-b border-white/[0.08] px-4 py-2 light:border-gray-200">
                      <p className="text-sm font-medium">{user?.email}</p>
                      <p className="text-xs text-white/40 capitalize">{user?.role?.replace('_', ' ')}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-white/[0.05]"
                    >
                      <HiLogout className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  to="/login"
                  className={`${publicActionClasses} border border-white/[0.1] bg-white/[0.045] text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] hover:bg-white/[0.08] light:border-gray-200 light:bg-white light:text-gray-800`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className={`${publicActionClasses} bg-[linear-gradient(135deg,#c026d3_0%,#ec4899_100%)] text-white shadow-[0_14px_28px_rgba(192,38,211,0.34)] hover:brightness-110`}
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-[1rem] border border-white/[0.08] bg-white/[0.04] p-2 text-white/70 transition-colors hover:text-white md:hidden"
            >
              {mobileOpen ? <HiX className="w-6 h-6" /> : <HiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="animate-slide-down border-t border-white/[0.06] bg-[#0b1020]/96 backdrop-blur-2xl light:border-gray-200 light:bg-white/96 md:hidden">
          <div className="space-y-2 px-4 py-4">
            {isAuthenticated && navLinks.filter(l => l.auth).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-[1rem] px-4 py-3 text-sm font-medium transition-all ${
                  isActive(link.path)
                    ? 'bg-white/[0.08] text-[#f1b8ec]'
                    : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {!isAuthenticated && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className={`${publicActionClasses} border border-white/[0.1] bg-white/[0.045] text-white/90`}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className={`${publicActionClasses} bg-[linear-gradient(135deg,#c026d3_0%,#ec4899_100%)] text-white shadow-[0_14px_28px_rgba(192,38,211,0.3)]`}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
