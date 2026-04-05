import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useToast } from '../hooks/useToast';
import UserManagement from '../components/admin/UserManagement';
import JewelryUploadForm from '../components/admin/JewelryUploadForm';
import DatasetManager from '../components/admin/DatasetManager';
import AnalyticsCharts from '../components/admin/AnalyticsCharts';
import ToastContainer from '../components/common/Toast';
import { HiUsers, HiSparkles, HiDatabase, HiChartBar } from 'react-icons/hi';

const TABS = [
  { id: 'users', label: 'Users', icon: <HiUsers /> },
  { id: 'jewelry', label: 'Jewelry', icon: <HiSparkles /> },
  { id: 'datasets', label: 'Datasets', icon: <HiDatabase /> },
  { id: 'analytics', label: 'Analytics', icon: <HiChartBar /> },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [analytics, setAnalytics] = useState(null);
  const { toasts, showToast } = useToast();

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics();
  }, [activeTab]);

  const loadAnalytics = async () => {
    try {
      const res = await api.get('/api/admin/analytics/');
      setAnalytics(res.data);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load analytics';
      showToast(message, 'error');
    }
  };

  const availableTabs = TABS.filter(tab => {
    if (tab.id === 'datasets' && user?.role !== 'super_admin') return false;
    return true;
  });

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <ToastContainer
        toasts={toasts}
        onClose={(id) => {
          // Toast will auto-remove itself
        }}
      />
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-1 dark:text-white text-gray-900">Admin Dashboard</h1>
          <p className="dark:text-white/40 text-gray-600 mb-6 text-sm capitalize">{user?.role?.replace('_', ' ')}</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'dark:bg-primary-500/20 dark:text-primary-300 dark:border dark:border-primary-500/30 bg-primary-600 text-white'
                  : 'dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'jewelry' && <JewelryUploadForm />}
          {activeTab === 'datasets' && <DatasetManager />}
          {activeTab === 'analytics' && <AnalyticsCharts data={analytics} />}
        </motion.div>
      </div>
    </div>
  );
}
