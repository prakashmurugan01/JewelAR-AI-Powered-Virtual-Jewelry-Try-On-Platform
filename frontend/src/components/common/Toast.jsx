import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCheckCircle, HiExclamation, HiInformationCircle, HiXCircle, HiX } from 'react-icons/hi';

const Toast = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <HiCheckCircle className="w-5 h-5" />,
    error: <HiXCircle className="w-5 h-5" />,
    warning: <HiExclamation className="w-5 h-5" />,
    info: <HiInformationCircle className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100',
    error: 'bg-red-500/20 border-red-500/30 text-red-100',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-100',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-100',
  };

  const iconColors = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm ${colors[type]}`}
    >
      <div className={iconColors[type]}>{icons[type]}</div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="text-white/40 hover:text-white/60 transition-colors"
      >
        <HiX className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export default function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => onClose(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
