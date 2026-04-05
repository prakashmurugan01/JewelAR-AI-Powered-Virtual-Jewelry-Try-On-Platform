import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { HiUpload, HiDownload, HiPlus, HiX, HiCheckCircle } from 'react-icons/hi';
import Pagination from '../common/Pagination';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ['.zip', '.tar', '.gz', '.tar.gz'];

const DATASET_TYPES = ['face', 'ear', 'nose', 'neck', 'hand'];
const ANNOTATION_FORMATS = ['YOLO', 'COCO', 'Pascal VOC', 'Custom'];

export default function DatasetManager() {
  const { showToast: toast } = useToast();
  const [datasets, setDatasets] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    dataset_type: 'face',
    file: null,
    description: '',
    total_images: '',
    annotation_format: 'YOLO',
  });

  useEffect(() => {
    loadDatasets();
  }, [currentPage, pageSize]);

  const loadDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, page_size: pageSize };
      const res = await api.get('/api/admin/datasets/', { params });
      setDatasets(res.data?.results || res.data || []);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load datasets';
      toast(message, 'error');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, toast]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (form.name.trim().length > 100) newErrors.name = 'Name must be less than 100 characters';

    if (!form.dataset_type) newErrors.dataset_type = 'Dataset type is required';

    if (form.total_images) {
      const images = parseInt(form.total_images);
      if (isNaN(images) || images < 1) {
        newErrors.total_images = 'Total images must be a positive number';
      }
    }

    if (!form.file) {
      newErrors.file = 'Dataset file is required';
    } else if (form.file.size > MAX_FILE_SIZE) {
      newErrors.file = `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB allowed.`;
    } else {
      const ext = form.file.name.substring(form.file.name.lastIndexOf('.')).toLowerCase();
      const isValid = ALLOWED_TYPES.some((t) => form.file.name.toLowerCase().endsWith(t));
      if (!isValid) {
        newErrors.file = `Only ${ALLOWED_TYPES.join(', ')} files allowed`;
      }
    }

    if (form.description && form.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          toast(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024 / 1024}GB allowed.`, 'error');
          return;
        }
        setForm((prev) => ({ ...prev, file }));
        setErrors((prev) => ({ ...prev, file: '' }));
      }
    },
    [toast]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      setSubmitLoading(true);
      try {
        const formData = new FormData();
        Object.entries(form).forEach(([key, val]) => {
          if (val !== null && val !== '' && val !== false) {
            formData.append(key, val);
          }
        });

        await api.post('/api/admin/datasets/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        toast('Dataset uploaded successfully', 'success');
        setShowUpload(false);
        setForm({
          name: '',
          dataset_type: 'face',
          file: null,
          description: '',
          total_images: '',
          annotation_format: 'YOLO',
        });
        setErrors({});
        loadDatasets();
      } catch (error) {
        const message = error.response?.data?.detail || 'Failed to upload dataset';
        toast(message, 'error');
      } finally {
        setSubmitLoading(false);
      }
    },
    [form, validateForm, toast, loadDatasets]
  );

  const statusConfig = {
    pending: { icon: '⏳', color: 'bg-amber-500/20', text: 'text-amber-200' },
    processing: { icon: '⚙️', color: 'bg-blue-500/20', text: 'text-blue-200' },
    ready: { icon: '✓', color: 'bg-emerald-500/20', text: 'text-emerald-200' },
    failed: { icon: '✗', color: 'bg-red-500/20', text: 'text-red-200' },
  };

  const getTotalPages = () => Math.ceil((datasets.length || 10) / pageSize);

  const totalDatasets = useMemo(() => {
    return datasets.length;
  }, [datasets]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">AI Datasets</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            showUpload
              ? 'bg-red-500/20 border border-red-500/30 text-red-200'
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30'
          }`}
        >
          <HiPlus className="w-4 h-4" />
          {showUpload ? 'Cancel' : 'Upload Dataset'}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upload AI Dataset</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none transition-all ${
                  errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
                placeholder="e.g., Face Detection v2"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Type <span className="text-red-400">*</span>
              </label>
              <select
                value={form.dataset_type}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, dataset_type: e.target.value }));
                  setErrors((prev) => ({ ...prev, dataset_type: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none transition-all ${
                  errors.dataset_type ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
              >
                {DATASET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)} Detection
                  </option>
                ))}
              </select>
              {errors.dataset_type && <p className="text-xs text-red-400 mt-1">{errors.dataset_type}</p>}
            </div>

            {/* Total Images */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Total Images</label>
              <input
                type="number"
                value={form.total_images}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, total_images: e.target.value }));
                  setErrors((prev) => ({ ...prev, total_images: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none transition-all ${
                  errors.total_images ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
                placeholder="e.g., 5000"
              />
              {errors.total_images && <p className="text-xs text-red-400 mt-1">{errors.total_images}</p>}
            </div>

            {/* Annotation Format */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Annotation Format</label>
              <select
                value={form.annotation_format}
                onChange={(e) => setForm((prev) => ({ ...prev, annotation_format: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-blue-500/50 focus:outline-none transition-all"
              >
                {ANNOTATION_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-white/70 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, description: e.target.value }));
                  setErrors((prev) => ({ ...prev, description: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none transition-all resize-none ${
                  errors.description ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
                rows={2}
                placeholder="Dataset description..."
              />
              <div className="flex justify-between mt-1">
                {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
                <p className="text-xs text-white/30 ml-auto">{form.description.length}/500</p>
              </div>
            </div>

            {/* File Upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-white/70 mb-2">
                Dataset File (.zip, .tar, .gz) <span className="text-red-400">*</span>
              </label>
              <label
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all ${
                  errors.file
                    ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                    : 'bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30'
                }`}
              >
                <HiUpload className="w-4 h-4" />
                Choose File
                <input type="file" accept=".zip,.tar,.gz,.tar.gz" onChange={handleFileChange} className="hidden" />
              </label>
              {form.file && <p className="text-xs text-white/40 mt-2">{form.file.name}</p>}
              {errors.file && <p className="text-xs text-red-400 mt-2">{errors.file}</p>}
            </div>

            {/* Actions */}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {submitLoading ? 'Uploading...' : 'Upload Dataset'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false);
                  setErrors({});
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Datasets Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-blue-400"></div>
            </div>
            <p className="text-white/50 mt-2">Loading datasets...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="px-6 py-12 text-center text-white/50">
            No datasets uploaded yet
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase">Type</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase">Images</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase">Format</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds) => {
                    const status = statusConfig[ds.status] || statusConfig.pending;
                    return (
                      <tr key={ds.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-white">{ds.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200">
                            {ds.dataset_type.charAt(0).toUpperCase() + ds.dataset_type.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-white/70">
                          {ds.total_images ? ds.total_images.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-white/50">{ds.annotation_format || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color} ${status.text}`}>
                            {status.icon}
                            <span className="capitalize">{ds.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium">
                          {ds.accuracy ? (
                            <span className="text-emerald-400">{ds.accuracy}%</span>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={getTotalPages()}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={totalDatasets}
            />
          </>
        )}
      </div>
    </div>
  );
}
