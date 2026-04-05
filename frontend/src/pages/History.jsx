import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getTryOnHistory } from '../services/tryon';
import { HiClock, HiDownload } from 'react-icons/hi';

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getTryOnHistory();
      setSessions(res.data?.results || res.data || []);
    } catch { } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
            <HiClock className="text-primary-400" /> Try-On History
          </h1>
          <p className="text-white/40 mb-8">Your past virtual try-on sessions</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card h-56 shimmer" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sessions.map((session, i) => (
              <motion.div
                key={session.id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card overflow-hidden group"
              >
                {session.snapshot_image ? (
                  <div className="relative">
                    <img src={session.snapshot_image} alt="Snapshot" className="w-full h-40 object-cover" />
                    <a
                      href={session.snapshot_image}
                      download
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HiDownload className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <div className="w-full h-40 bg-white/5 flex items-center justify-center text-4xl">📷</div>
                )}
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{session.jewelry_name || 'Try-on session'}</p>
                  <p className="text-xs text-white/30 mt-1">
                    {session.category_name && <span className="badge-primary mr-2">{session.category_name}</span>}
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-16 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-display font-semibold mb-2">No History Yet</h3>
            <p className="text-white/40">Start trying on jewelry to see your history here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
