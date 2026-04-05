import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { HiCheck, HiX, HiSearch, HiDownload, HiOutlineTrash, HiEye } from 'react-icons/hi';
import { useToast } from '../../hooks/useToast';
import ConfirmDialog from '../common/ConfirmDialog';
import Pagination from '../common/Pagination';
import UserDetailModal from './UserDetailModal';

export default function UserManagement() {
  const { showToast: toast } = useToast();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null,
    userId: null,
  });

  // Fetch users with error handling
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        ...(filter !== 'all' && { status: filter }),
        page: currentPage,
        page_size: pageSize,
      };

      const res = await api.get('/api/admin/users/', { params });
      
      // Handle both paginated and non-paginated responses
      if (res.data?.results) {
        setUsers(res.data.results);
      } else if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      const message = error.response?.data?.detail || 'Failed to load users. Please try again.';
      toast(message, 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, pageSize, toast]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filter changes
    loadUsers();
  }, [filter]);

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize]);

  // Approve user with confirmation
  const approveUser = useCallback(
    async (id) => {
      setActionLoading(id);
      try {
        await api.post(`/api/admin/users/${id}/approve/`);
        toast('User approved successfully', 'success');
        loadUsers();
        setConfirmDialog({ isOpen: false, action: null, userId: null });
      } catch (error) {
        console.error('Failed to approve user:', error);
        const message = error.response?.data?.detail || 'Failed to approve user. Please try again.';
        toast(message, 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [toast, loadUsers]
  );

  // Reject user with confirmation
  const rejectUser = useCallback(
    async (id) => {
      setActionLoading(id);
      try {
        await api.post(`/api/admin/users/${id}/reject/`);
        toast('User rejected', 'warning');
        loadUsers();
        setConfirmDialog({ isOpen: false, action: null, userId: null });
      } catch (error) {
        console.error('Failed to reject user:', error);
        const message = error.response?.data?.detail || 'Failed to reject user. Please try again.';
        toast(message, 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [toast, loadUsers]
  );

  // Delete user with confirmation
  const deleteUser = useCallback(
    async (id) => {
      setActionLoading(id);
      try {
        await api.delete(`/api/admin/users/${id}/`);
        toast('User deleted successfully', 'success');
        loadUsers();
        setConfirmDialog({ isOpen: false, action: null, userId: null });
      } catch (error) {
        console.error('Failed to delete user:', error);
        const message = error.response?.data?.detail || 'Failed to delete user. Please try again.';
        toast(message, 'error');
      } finally {
        setActionLoading(null);
      }
    },
    [toast, loadUsers]
  );

  // Filter and search users - exclude users without proper names and email
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const firstName = (u.first_name || '').toString().trim();
        const lastName = (u.last_name || '').toString().trim();
        const email = (u.email || '').toString().trim();
        return firstName.length > 0 && lastName.length > 0 && email.length > 0;
      })
      .filter((u) =>
        `${u.first_name} ${u.last_name} ${u.email} ${u.username || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  }, [users, search]);

  // Export users as CSV
  const exportData = useCallback(() => {
    try {
      const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Joined', 'Try-ons'];
      const rows = filteredUsers.map((u) => [
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role?.replace('_', ' ') || 'User',
        u.is_approved ? 'Approved' : u.is_active ? 'Pending' : 'Rejected',
        new Date(u.date_joined).toLocaleDateString(),
        u.total_tryons || 0,
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('Users exported successfully', 'success');
    } catch (error) {
      toast('Failed to export users', 'error');
    }
  }, [filteredUsers, toast]);

  const handleConfirm = useCallback(
    (action, userId) => {
      if (action === 'approve') {
        approveUser(userId);
      } else if (action === 'reject') {
        rejectUser(userId);
      } else if (action === 'delete') {
        deleteUser(userId);
      }
    },
    [approveUser, rejectUser, deleteUser]
  );

  const getTotalPages = () => Math.ceil((filteredUsers.length || 10) / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg dark:bg-white/5 dark:border dark:border-white/10 dark:text-white dark:placeholder-white/30 dark:focus:border-blue-500/50 bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={exportData}
            disabled={filteredUsers.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg dark:bg-emerald-500/20 dark:border dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/30 bg-green-600 text-white hover:bg-green-700 border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <HiDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f
                  ? 'dark:bg-blue-500/30 dark:border dark:border-blue-500/50 dark:text-blue-200 bg-blue-600 text-white border-0'
                  : 'dark:bg-white/5 dark:hover:bg-white/10 dark:border dark:border-white/10 dark:text-white/70 bg-gray-300 hover:bg-gray-400 text-gray-700 border-0'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden dark:glass-card bg-white border border-gray-200 rounded-lg">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-2 dark:border-white/20 dark:border-t-blue-400 border-gray-300 border-t-blue-600"></div>
              </div>
              <p className="dark:text-white/50 text-gray-600 mt-2">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-12 text-center dark:text-white/50 text-gray-600">
              No users found
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="dark:bg-gray-800/50 dark:border-b dark:border-white/10 border-b border-gray-300 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold dark:text-white/50 text-gray-600 uppercase">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dark:text-white/50 text-gray-600 uppercase">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dark:text-white/50 text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold dark:text-white/50 text-gray-600 uppercase">
                      Joined
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold dark:text-white/50 text-gray-600 uppercase">
                      Try-ons
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold dark:text-white/50 text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers && filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="border-b border-gray-200 transition-colors group cursor-pointer dark:border-b dark:border-white/5 dark:hover:bg-white/8 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-white/8"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium dark:text-white text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs dark:text-white/40 text-gray-600">{user.email}</p>
                          {user.username && (
                            <p className="text-xs dark:text-white/30 text-gray-500">@{user.username}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium dark:bg-blue-500/20 dark:text-blue-200 bg-blue-100 text-blue-800">
                          {user.role?.replace('_', ' ') || 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_approved ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium dark:bg-emerald-500/20 dark:text-emerald-200 bg-emerald-100 text-emerald-800">
                            ✓ Approved
                          </span>
                        ) : user.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium dark:bg-amber-500/20 dark:text-amber-200 bg-amber-100 text-amber-800">
                            ⏳ Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium dark:bg-red-500/20 dark:text-red-200 bg-red-100 text-red-800">
                            ✗ Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs dark:text-white/50 text-gray-600">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium dark:text-white text-gray-900">
                        {user.total_tryons || 0}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-blue-500/20 dark:border dark:border-blue-500/30 dark:text-blue-200 dark:hover:bg-blue-500/30 bg-blue-600 text-white hover:bg-blue-700 border-0 transition-colors hidden group-hover:flex"
                          >
                            <HiEye className="w-3.5 h-3.5" />
                            View
                          </button>
                          {!user.is_approved && user.role === 'user' && (
                            <button
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  action: 'approve',
                                  userId: user.id,
                                })
                              }
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-emerald-500/20 dark:border dark:border-emerald-500/30 dark:text-emerald-200 dark:hover:bg-emerald-500/30 bg-green-600 text-white hover:bg-green-700 border-0 disabled:opacity-50 transition-colors"
                            >
                              <HiCheck className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}
                          {user.is_active && user.role === 'user' && (
                            <button
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  action: 'reject',
                                  userId: user.id,
                                })
                              }
                              disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-red-500/20 dark:border dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/30 bg-red-600 text-white hover:bg-red-700 border-0 disabled:opacity-50 transition-colors"
                            >
                              <HiX className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                action: 'delete',
                                userId: user.id,
                              })
                            }
                            disabled={actionLoading === user.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-white/5 dark:border dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 bg-gray-400 text-white hover:bg-gray-500 border-0 disabled:opacity-50 transition-colors hidden group-hover:flex"
                          >
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
              
              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={getTotalPages()}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={filteredUsers.length}
              />
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onCancel={() => setConfirmDialog({ isOpen: false, action: null, userId: null })}
        onConfirm={() => handleConfirm(confirmDialog.action, confirmDialog.userId)}
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
            ? 'This user will be rejected and cannot access the platform.'
            : 'This action cannot be undone. The user will be permanently deleted.'
        }
        confirmText={
          confirmDialog.action === 'approve'
            ? 'Approve'
            : confirmDialog.action === 'reject'
            ? 'Reject'
            : 'Delete'
        }
      />

      {/* User Detail Modal */}
      <UserDetailModal
        isOpen={!!selectedUser}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUpdateUser={loadUsers}
      />
    </div>
  );
}
