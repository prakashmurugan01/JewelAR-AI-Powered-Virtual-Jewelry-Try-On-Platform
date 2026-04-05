import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiCog, HiLightningBolt, HiFilm, HiImage } from 'react-icons/hi';
import { useSettings } from '../../context/SettingsContext';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsPanel({ isOpen, onClose }) {
  const { liteMode, setLiteMode, autoPlay, setAutoPlay, imageQuality, setImageQuality } = useSettings();
  const { isDark, toggle: toggleTheme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 max-w-full bg-gradient-to-b from-slate-900 to-slate-950 border-l border-white/10 z-50 overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 bg-slate-900/95 backdrop-blur border-b border-white/10">
              <div className="flex items-center gap-3">
                <HiCog className="w-6 h-6 text-accent-400" />
                <h2 className="text-xl font-bold text-white">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <HiX className="w-6 h-6 text-white/60" />
              </button>
            </div>

            {/* Settings */}
            <div className="p-6 space-y-6">
              {/* Lite Mode */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HiLightningBolt className="w-5 h-5 text-yellow-400" />
                  <label className="text-sm font-semibold text-white">Lite Mode</label>
                </div>
                <p className="text-xs text-white/50 mb-3">
                  Disable animations for better performance on slower devices
                </p>
                <button
                  onClick={() => setLiteMode(!liteMode)}
                  className={`w-full px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    liteMode
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {liteMode ? '✓ Lite Mode On' : 'Lite Mode Off'}
                </button>
                {liteMode && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs"
                  >
                    <strong>Enabled:</strong> Animations disabled for optimal performance
                  </motion.div>
                )}
              </div>

              {/* Auto Play */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <HiFilm className="w-5 h-5 text-blue-400" />
                  <label className="text-sm font-semibold text-white">Auto Play</label>
                </div>
                <p className="text-xs text-white/50 mb-3">
                  Automatically play videos and animations
                </p>
                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`w-full px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    autoPlay
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {autoPlay ? '✓ Auto Play On' : 'Auto Play Off'}
                </button>
              </div>

              {/* Image Quality */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <HiImage className="w-5 h-5 text-purple-400" />
                  <label className="text-sm font-semibold text-white">Image Quality</label>
                </div>
                <p className="text-xs text-white/50 mb-3">
                  Higher quality uses more bandwidth and memory
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map(quality => (
                    <button
                      key={quality}
                      onClick={() => setImageQuality(quality)}
                      className={`px-3 py-2 rounded-lg border font-medium text-sm transition-all ${
                        imageQuality === quality
                          ? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <label className="text-sm font-semibold text-white">Theme</label>
                <p className="text-xs text-white/50 mb-3">
                  {isDark ? 'Dark mode is active' : 'Light mode is active'}
                </p>
                <button
                  onClick={toggleTheme}
                  className="w-full px-4 py-3 rounded-lg border-2 bg-white/5 border-white/10 text-white hover:bg-white/10 font-medium transition-all"
                >
                  Switch to {isDark ? 'Light' : 'Dark'} Mode
                </button>
              </div>

              {/* Info */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 text-center">
                  Your preferences are saved automatically
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
