import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative h-[36px] w-[60px] overflow-hidden rounded-[1.05rem] border border-white/[0.08] p-[4px] transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/50"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #14132a 0%, #2f2265 100%)'
          : 'linear-gradient(135deg, #bfe8ff 0%, #7c9fff 100%)',
        boxShadow: isDark
          ? '0 10px 22px rgba(87, 63, 188, 0.28)'
          : '0 10px 22px rgba(124, 159, 255, 0.22)',
      }}
    >
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-500"
        style={{
          boxShadow: isDark
            ? 'inset 0 0 18px rgba(168,85,247,0.12)'
            : 'inset 0 0 18px rgba(255,255,255,0.22)',
        }}
      />

      {/* Stars (dark mode) */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <span className="absolute left-[10px] top-[9px] h-[2px] w-[2px] rounded-full bg-white/70" />
        <span className="absolute left-[16px] top-[18px] h-[1.5px] w-[1.5px] rounded-full bg-white/45" />
        <span className="absolute left-[23px] top-[12px] h-[1px] w-[1px] rounded-full bg-white/40" />
      </div>

      {/* Clouds (light mode) */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${!isDark ? 'opacity-100' : 'opacity-0'}`}>
        <span className="absolute left-[9px] top-[18px] h-[5px] w-[10px] rounded-full bg-white/35" />
        <span className="absolute left-[19px] top-[11px] h-[4px] w-[7px] rounded-full bg-white/28" />
      </div>

      {/* Knob */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="relative z-10 flex h-[28px] w-[28px] items-center justify-center rounded-full shadow-lg"
        style={{
          marginLeft: isDark ? '24px' : '0px',
          background: isDark
            ? 'linear-gradient(135deg, #d8ccff 0%, #9d7cff 100%)'
            : 'linear-gradient(135deg, #ffd166 0%, #f59e0b 100%)',
          boxShadow: isDark
            ? '0 4px 14px rgba(157,124,255,0.45)'
            : '0 4px 14px rgba(245,158,11,0.4)',
        }}
      >
        {/* Moon icon */}
        <motion.svg
          initial={false}
          animate={{ opacity: isDark ? 1 : 0, rotate: isDark ? 0 : 90, scale: isDark ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
          className="absolute h-[13px] w-[13px] text-white"
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </motion.svg>

        {/* Sun icon */}
        <motion.svg
          initial={false}
          animate={{ opacity: !isDark ? 1 : 0, rotate: !isDark ? 0 : -90, scale: !isDark ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
          className="absolute h-[13px] w-[13px] text-white"
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </motion.svg>
      </motion.div>
    </button>
  );
}
