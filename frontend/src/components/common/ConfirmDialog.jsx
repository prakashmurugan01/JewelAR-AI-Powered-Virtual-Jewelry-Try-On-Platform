import React from 'react';
import Modal from './Modal';
import { HiExclamation } from 'react-icons/hi';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure?',
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="flex items-start gap-4">
        {isDangerous && (
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20">
              <HiExclamation className="w-6 h-6 text-red-400" />
            </div>
          </div>
        )}
        <p className="text-white/70 flex-1">{message}</p>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-50 transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            isDangerous
              ? 'bg-red-500/20 border border-red-500/30 text-red-200 hover:bg-red-500/30'
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
}
