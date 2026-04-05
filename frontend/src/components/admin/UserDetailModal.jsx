import React, { useState, useReducer, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiCheck, HiBan, HiCalendar, HiMail, HiUser, HiShieldCheck, HiClock, HiSparkles, HiPencil, HiSave, HiOutlineTrash, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ConfirmDialog from '../common/ConfirmDialog';

// Form reducer for advanced state management
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' },
        touched: { ...state.touched, [action.field]: true },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'RESET':
      return action.payload;
    default:
      return state;
  }
};

export default function UserDetailModal({ isOpen, user, onClose, onUpdateUser }) {
  const { showToast: toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null });
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formState, dispatch] = useReducer(formReducer, {
    data: {
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      phone: '',
      bio: '',
    },
    errors: {},
    touched: {},
  });

  // Update form state when user changes
  useEffect(() => {
    if (user) {
      dispatch({
        type: 'RESET',
        payload: {
          data: {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            username: user.username || '',
            phone: user.phone || '',
            bio: user.bio || '',
          },
          errors: {},
          touched: {},
        },
      });
      setPasswordForm({ new_password: '', confirm_password: '' });
      setPasswordErrors({});
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [user?.id]);

  // Validation logic
  const validateForm = useCallback(() => {
    const errors = {};
    const { first_name, last_name, email, username } = formState.data;

    if (!first_name?.trim()) errors.first_name = 'First name is required';
    if (!last_name?.trim()) errors.last_name = 'Last name is required';
    if (!email?.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';
    if (!username?.trim()) errors.username = 'Username is required';
    else if (username.length < 3) errors.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_-]+$/.test(username)) errors.username = 'Only letters, numbers, underscores, and hyphens allowed';

    return errors;
  }, [formState.data]);

  // Update user
  const handleSaveChanges = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      toast('Please fix all errors before saving', 'error');
      return;
    }

    setActionLoading('save');
    try {
      const updateData = {
        first_name: formState.data.first_name,
        last_name: formState.data.last_name,
        email: formState.data.email,
        username: formState.data.username,
        ...(formState.data.phone && { phone: formState.data.phone }),
        ...(formState.data.bio && { bio: formState.data.bio }),
      };

      await api.patch(`/api/admin/users/${user.id}/`, updateData);
      toast('User profile updated successfully', 'success');
      setIsEditMode(false);
      onUpdateUser?.();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update user profile';
      toast(message, 'error');
      if (error.response?.data?.errors) {
        dispatch({ type: 'SET_ERRORS', errors: error.response.data.errors });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Approve user
  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      await api.post(`/api/admin/users/${user.id}/approve/`);
      toast('User approved successfully', 'success');
      setConfirmDialog({ isOpen: false, action: null });
      onUpdateUser?.();
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to approve user';
      toast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject user
  const handleReject = async () => {
    setActionLoading('reject');
    try {
      await api.post(`/api/admin/users/${user.id}/reject/`);
      toast('User rejected', 'warning');
      setConfirmDialog({ isOpen: false, action: null });
      onUpdateUser?.();
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to reject user';
      toast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete user
  const handleDelete = async () => {
    setActionLoading('delete');
    try {
      await api.delete(`/api/admin/users/${user.id}/`);
      toast('User deleted successfully', 'success');
      setConfirmDialog({ isOpen: false, action: null });
      onUpdateUser?.();
      onClose();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete user';
      toast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const validatePasswordForm = useCallback(() => {
    const errors = {};

    if (!passwordForm.new_password?.trim()) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (!passwordForm.confirm_password?.trim()) {
      errors.confirm_password = 'Confirm password is required';
    } else if (passwordForm.confirm_password !== passwordForm.new_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    return errors;
  }, [passwordForm]);

  // Early return - AFTER all hooks are initialized
  if (!isOpen || !user) return null;

  const handleSetPassword = async () => {
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      toast('Please fix the password form errors', 'error');
      return;
    }

    setActionLoading('password');
    try {
      await api.post(`/api/admin/users/${user.id}/set-password/`, passwordForm);
      toast('Password updated successfully', 'success');
      setPasswordForm({ new_password: '', confirm_password: '' });
      setPasswordErrors({});
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      onUpdateUser?.();
    } catch (error) {
      const detail = error.response?.data;
      if (detail && typeof detail === 'object') {
        setPasswordErrors(detail);
      }
      const message = detail?.error
        || detail?.detail
        || detail?.new_password?.[0]
        || detail?.confirm_password?.[0]
        || 'Failed to update password';
      toast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    dispatch({
      type: 'RESET',
      payload: {
        data: {
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          email: user?.email || '',
          username: user?.username || '',
          phone: user?.phone || '',
          bio: user?.bio || '',
        },
        errors: {},
        touched: {},
      },
    });
  };

  const getStatusColor = () => {
    if (user.is_approved) return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-200', label: '✓ Approved' };
    if (user.is_active) return { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-200', label: '⏳ Pending' };
    return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-200', label: '✗ Rejected' };
  };

  const status = getStatusColor();
  const joinedDate = new Date(user.date_joined).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hasChanges = JSON.stringify(formState.data) !== JSON.stringify({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    username: user?.username || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-t-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {formState.data.first_name?.[0]}{formState.data.last_name?.[0]}
                      </div>

                      {/* User Info */}
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          {formState.data.first_name} {formState.data.last_name}
                        </h2>
                        <p className="text-white/50 text-sm">@{formState.data.username || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                      {!isEditMode && (
                        <button
                          onClick={() => setIsEditMode(true)}
                          className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <HiPencil className="w-5 h-5 text-blue-400" />
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <HiX className="w-6 h-6 text-white/60" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${status.bg} border ${status.border} ${status.text}`}>
                      <span className="text-lg">{status.label.split(' ')[0]}</span>
                      {status.label.split(' ')[1]}
                    </span>
                    {user.role && (
                      <span className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium bg-blue-500/20 border border-blue-500/30 text-blue-200">
                        <HiShieldCheck className="w-3.5 h-3.5" />
                        {user.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </motion.div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="bg-slate-900 border-x border-white/10 p-8 space-y-6"
                >
                  <AnimatePresence mode="wait">
                    {isEditMode ? (
                      // Edit Mode
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-5"
                      >
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <HiPencil className="w-5 h-5 text-blue-400" />
                          Edit User Profile
                        </h3>

                        {/* Form Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* First Name */}
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                              First Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={formState.data.first_name}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'first_name', value: e.target.value })}
                              className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                                formState.errors.first_name ? 'border-red-500/50' : 'border-white/10'
                              } text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all`}
                              placeholder="First name"
                            />
                            {formState.errors.first_name && (
                              <p className="text-red-400 text-xs mt-1">{formState.errors.first_name}</p>
                            )}
                          </div>

                          {/* Last Name */}
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                              Last Name <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={formState.data.last_name}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'last_name', value: e.target.value })}
                              className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                                formState.errors.last_name ? 'border-red-500/50' : 'border-white/10'
                              } text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all`}
                              placeholder="Last name"
                            />
                            {formState.errors.last_name && (
                              <p className="text-red-400 text-xs mt-1">{formState.errors.last_name}</p>
                            )}
                          </div>

                          {/* Email */}
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                              Email <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="email"
                              value={formState.data.email}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
                              className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                                formState.errors.email ? 'border-red-500/50' : 'border-white/10'
                              } text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all`}
                              placeholder="Email"
                            />
                            {formState.errors.email && (
                              <p className="text-red-400 text-xs mt-1">{formState.errors.email}</p>
                            )}
                          </div>

                          {/* Username */}
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                              Username <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={formState.data.username}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'username', value: e.target.value })}
                              className={`w-full px-4 py-2.5 rounded-lg bg-white/5 border ${
                                formState.errors.username ? 'border-red-500/50' : 'border-white/10'
                              } text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all`}
                              placeholder="Username"
                            />
                            {formState.errors.username && (
                              <p className="text-red-400 text-xs mt-1">{formState.errors.username}</p>
                            )}
                          </div>

                          {/* Phone */}
                          <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">
                              Phone <span className="text-amber-400">*</span>
                            </label>
                            <input
                              type="tel"
                              value={formState.data.phone}
                              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'phone', value: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                              placeholder="Phone number"
                            />
                          </div>

                        </div>

                        {/* Bio */}
                        <div>
                          <label className="block text-sm font-medium text-white/70 mb-2">
                            Bio <span className="text-amber-400">*</span>
                          </label>
                          <textarea
                            value={formState.data.bio}
                            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'bio', value: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                            placeholder="User bio"
                            rows="4"
                          />
                        </div>

                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                          <p>Required fields marked with <span className="text-red-400">*</span></p>
                        </div>
                      </motion.div>
                    ) : (
                      // View Mode
                      <motion.div
                        key="view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        {/* Contact Information */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <HiMail className="w-5 h-5 text-blue-400" />
                            <h3 className="text-lg font-semibold text-white">Contact Information</h3>
                          </div>
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <HiMail className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-white/50">Email Address</p>
                                <p className="text-white font-medium break-all">{user.email}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Account Information */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <HiUser className="w-5 h-5 text-purple-400" />
                            <h3 className="text-lg font-semibold text-white">Account Information</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Join Date */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex items-center gap-2 mb-2">
                                <HiCalendar className="w-4 h-4 text-emerald-400" />
                                <p className="text-xs text-white/50">Joined Date</p>
                              </div>
                              <p className="text-white font-semibold">{joinedDate}</p>
                            </div>

                            {/* Try-ons Count */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex items-center gap-2 mb-2">
                                <HiSparkles className="w-4 h-4 text-amber-400" />
                                <p className="text-xs text-white/50">Try-Ons</p>
                              </div>
                              <p className="text-white font-semibold text-2xl">{user.total_tryons || 0}</p>
                            </div>

                            {/* Is Active Status */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex items-center gap-2 mb-2">
                                <HiClock className="w-4 h-4 text-blue-400" />
                                <p className="text-xs text-white/50">Account Status</p>
                              </div>
                              <p className="text-white font-semibold">
                                {user.is_active ? (
                                  <span className="text-emerald-400">Active</span>
                                ) : (
                                  <span className="text-red-400">Inactive</span>
                                )}
                              </p>
                            </div>

                            {/* Is Approved */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <div className="flex items-center gap-2 mb-2">
                                <HiCheck className="w-4 h-4 text-emerald-400" />
                                <p className="text-xs text-white/50">Approval Status</p>
                              </div>
                              <p className="text-white font-semibold">
                                {user.is_approved ? (
                                  <span className="text-emerald-400">Approved</span>
                                ) : (
                                  <span className="text-amber-400">Not Approved</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Security */}
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <HiLockClosed className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-lg font-semibold text-white">Security</h3>
                          </div>
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-medium text-emerald-200">
                                Password visibility is disabled by design
                              </p>
                              <p className="text-sm text-white/60">
                                Existing passwords are never shown. Admins can only set a new secure password for this account.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                  New Password
                                </label>
                                <div className="relative">
                                  <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={passwordForm.new_password}
                                    onChange={(e) => {
                                      setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }));
                                      setPasswordErrors((prev) => ({ ...prev, new_password: '', confirm_password: '' }));
                                    }}
                                    className={`w-full px-4 py-2.5 pr-11 rounded-lg bg-white/5 border ${
                                      passwordErrors.new_password ? 'border-red-500/50' : 'border-white/10'
                                    } text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all`}
                                    placeholder="Set a strong password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                  >
                                    {showNewPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                                  </button>
                                </div>
                                {passwordErrors.new_password && (
                                  <p className="text-red-400 text-xs mt-1">{passwordErrors.new_password}</p>
                                )}
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                  Confirm Password
                                </label>
                                <div className="relative">
                                  <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={passwordForm.confirm_password}
                                    onChange={(e) => {
                                      setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }));
                                      setPasswordErrors((prev) => ({ ...prev, confirm_password: '' }));
                                    }}
                                    className={`w-full px-4 py-2.5 pr-11 rounded-lg bg-white/5 border ${
                                      passwordErrors.confirm_password ? 'border-red-500/50' : 'border-white/10'
                                    } text-white placeholder-white/30 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all`}
                                    placeholder="Repeat the password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                  >
                                    {showConfirmPassword ? <HiEyeOff className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
                                  </button>
                                </div>
                                {passwordErrors.confirm_password && (
                                  <p className="text-red-400 text-xs mt-1">{passwordErrors.confirm_password}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <p className="text-xs text-white/45">
                                Managers can manage user accounts. Only super admins can manage admin account passwords.
                              </p>
                              <button
                                onClick={handleSetPassword}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 font-medium transition-all"
                              >
                                {actionLoading === 'password' ? (
                                  <>
                                    <div className="w-4 h-4 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin"></div>
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <HiLockClosed className="w-4 h-4" />
                                    Set New Password
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* User Metadata */}
                        {(user.phone || user.bio) && (
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Additional Information</h3>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10 space-y-3">
                              {user.phone && (
                                <div>
                                  <p className="text-xs text-white/50">Phone</p>
                                  <p className="text-white">{user.phone}</p>
                                </div>
                              )}
                              {user.bio && (
                                <div>
                                  <p className="text-xs text-white/50">Bio</p>
                                  <p className="text-white">{user.bio}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Footer Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-slate-900 border border-t-0 border-white/10 rounded-b-2xl p-6 space-y-3"
                >
                  {isEditMode ? (
                    // Edit Mode Actions
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleSaveChanges}
                        disabled={actionLoading !== null || !hasChanges}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30 disabled:opacity-50 font-medium transition-all"
                      >
                        {actionLoading === 'save' ? (
                          <>
                            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <HiSave className="w-5 h-5" />
                            Save Changes
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleCancel}
                        disabled={actionLoading !== null}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50 font-medium transition-all"
                      >
                        <HiX className="w-5 h-5" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    // View Mode Actions
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Approve Button */}
                      {!user.is_approved && user.role === 'user' && (
                        <button
                          onClick={() => setConfirmDialog({ isOpen: true, action: 'approve' })}
                          disabled={actionLoading !== null}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 font-medium transition-all"
                        >
                          <HiCheck className="w-5 h-5" />
                          Approve
                        </button>
                      )}

                      {/* Reject Button */}
                      {user.is_active && user.role === 'user' && (
                        <button
                          onClick={() => setConfirmDialog({ isOpen: true, action: 'reject' })}
                          disabled={actionLoading !== null}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30 disabled:opacity-50 font-medium transition-all"
                        >
                          <HiClock className="w-5 h-5" />
                          Reject
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => setConfirmDialog({ isOpen: true, action: 'delete' })}
                        disabled={actionLoading !== null}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30 disabled:opacity-50 font-medium transition-all"
                      >
                        <HiOutlineTrash className="w-5 h-5" />
                        Delete
                      </button>

                      {/* Close Button */}
                      <button
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 font-medium transition-all"
                      >
                        <HiX className="w-5 h-5" />
                        Close
                      </button>
                    </div>
                  )}

                  {/* Processing Indicator */}
                  {actionLoading && actionLoading !== 'save' && (
                    <div className="flex items-center justify-center gap-2 text-blue-400">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
                      <span className="text-sm font-medium">Processing...</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onCancel={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={() => {
          if (confirmDialog.action === 'approve') handleApprove();
          else if (confirmDialog.action === 'reject') handleReject();
          else if (confirmDialog.action === 'delete') handleDelete();
        }}
        isLoading={actionLoading !== null}
        isDangerous={confirmDialog.action === 'reject' || confirmDialog.action === 'delete'}
        title={
          confirmDialog.action === 'approve'
            ? 'Approve User'
            : confirmDialog.action === 'reject'
            ? 'Reject User'
            : 'Delete User'
        }
        message={
          confirmDialog.action === 'approve'
            ? 'This user will be approved and reactivated for platform access.'
            : confirmDialog.action === 'reject'
            ? 'This user will be rejected. This action cannot be undone.'
            : 'This action cannot be undone. The user will be permanently deleted along with all associated data.'
        }
        confirmText={
          confirmDialog.action === 'approve' ? 'Approve' : confirmDialog.action === 'reject' ? 'Reject' : 'Delete'
        }
      />
    </>
  );
}
