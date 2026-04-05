import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { getCategories, getJewelryItems } from '../../services/jewelry';
import { useToast } from '../../hooks/useToast';
import ConfirmDialog from '../common/ConfirmDialog';
import { HiUpload, HiPlus, HiTrash, HiSearch, HiDownload } from 'react-icons/hi';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export default function JewelryUploadForm() {
  const { showToast: toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, itemId: null });
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    material: '',
    weight: '',
    image_2d: null,
    is_featured: false,
  });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, itemRes] = await Promise.all([
        getCategories().catch(() => ({ data: [] })),
        getJewelryItems().catch(() => ({ data: { results: [] } })),
      ]);
      setCategories(catRes.data?.results || catRes.data || []);
      setItems(itemRes.data?.results || itemRes.data || []);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to load data';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (form.name.trim().length > 100) newErrors.name = 'Name must be less than 100 characters';

    if (!form.category) newErrors.category = 'Category is required';

    if (form.price) {
      const price = parseFloat(form.price);
      if (isNaN(price) || price < 0) newErrors.price = 'Price must be a valid positive number';
    }

    if (form.weight) {
      const weight = parseFloat(form.weight);
      if (isNaN(weight) || weight < 0) newErrors.weight = 'Weight must be a valid positive number';
    }

    if (form.description && form.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (!form.image_2d) {
      newErrors.image_2d = 'Image is required';
    } else if (form.image_2d.size > MAX_FILE_SIZE) {
      newErrors.image_2d = `Image must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    } else if (!ALLOWED_TYPES.includes(form.image_2d.type)) {
      newErrors.image_2d = 'Image must be PNG, JPEG, or WebP';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast(`File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.`, 'error');
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast('Only PNG, JPEG, and WebP images are allowed', 'error');
        return;
      }
      setForm((prev) => ({ ...prev, image_2d: file }));
      setPreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image_2d: '' }));
    }
  }, [toast]);

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

        await api.post('/api/admin/jewelry/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        toast('Jewelry item added successfully', 'success');
        setShowForm(false);
        setForm({
          name: '',
          category: '',
          description: '',
          price: '',
          material: '',
          weight: '',
          image_2d: null,
          is_featured: false,
        });
        setPreview(null);
        setErrors({});
        loadData();
      } catch (error) {
        const message = error.response?.data?.detail || 'Failed to add jewelry item';
        toast(message, 'error');
      } finally {
        setSubmitLoading(false);
      }
    },
    [form, validateForm, toast, loadData]
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDelete.itemId) return;
    
    try {
      await api.delete(`/api/admin/jewelry/${confirmDelete.itemId}/`);
      toast('Jewelry item deleted successfully', 'success');
      setConfirmDelete({ isOpen: false, itemId: null });
      loadData();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to delete jewelry item';
      toast(message, 'error');
    }
  }, [confirmDelete, toast, loadData]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const exportData = useCallback(() => {
    try {
      const headers = ['ID', 'Name', 'Category', 'Price', 'Material', 'Try Count', 'Featured'];
      const rows = filteredItems.map((item) => [
        item.id,
        item.name,
        item.category_name || '',
        item.price || '',
        item.material || '',
        item.try_count || 0,
        item.is_featured ? 'Yes' : 'No',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jewelry-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast('Jewelry items exported successfully', 'success');
    } catch (error) {
      toast('Failed to export items', 'error');
    }
  }, [filteredItems, toast]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Jewelry Catalog</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
            <input
              type="text"
              placeholder="Search jewelry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={exportData}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <HiDownload className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              showForm
                ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                : 'bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30'
            }`}
          >
            <HiPlus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Add Item'}
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showForm && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add Jewelry Item</h3>
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
                placeholder="e.g., Diamond Ring"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, category: e.target.value }));
                  setErrors((prev) => ({ ...prev, category: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none transition-all ${
                  errors.category ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Price</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, price: e.target.value }));
                  setErrors((prev) => ({ ...prev, price: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none transition-all ${
                  errors.price ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
                placeholder="0.00"
              />
              {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Material</label>
              <input
                type="text"
                value={form.material}
                onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition-all"
                placeholder="e.g., Gold, Silver"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Weight (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, weight: e.target.value }));
                  setErrors((prev) => ({ ...prev, weight: '' }));
                }}
                className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white placeholder-white/30 focus:outline-none transition-all ${
                  errors.weight ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-blue-500/50'
                }`}
                placeholder="0.0"
              />
              {errors.weight && <p className="text-xs text-red-400 mt-1">{errors.weight}</p>}
            </div>

            {/* Featured */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
                  className="rounded border-white/20"
                />
                <span className="text-white/70">Featured Item</span>
              </label>
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
                placeholder="Product description..."
              />
              <div className="flex justify-between mt-1">
                {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
                <p className="text-xs text-white/30 ml-auto">{form.description.length}/1000</p>
              </div>
            </div>

            {/* Image Upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-white/70 mb-2">
                Image (PNG, JPEG, WebP) <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-4">
                <label
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all ${
                    errors.image_2d
                      ? 'bg-red-500/20 border border-red-500/30 text-red-200'
                      : 'bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30'
                  }`}
                >
                  <HiUpload className="w-4 h-4" />
                  Choose File
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-contain bg-white/5 border border-white/10 p-1"
                  />
                )}
              </div>
              {errors.image_2d && <p className="text-xs text-red-400 mt-1">{errors.image_2d}</p>}
              {form.image_2d && (
                <p className="text-xs text-white/40 mt-1">{form.image_2d.name}</p>
              )}
            </div>

            {/* Actions */}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-200 hover:bg-blue-500/30 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                {submitLoading ? 'Adding...' : 'Add Item'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
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

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-blue-400"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          No jewelry items found
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="glass-card overflow-hidden hover:border-blue-500/50 transition-colors group">
              {item.image_2d ? (
                <img
                  src={item.image_2d}
                  alt={item.name}
                  className="w-full h-32 object-contain bg-white/5 p-2"
                />
              ) : (
                <div className="w-full h-32 bg-white/5 flex items-center justify-center text-3xl">💎</div>
              )}
              <div className="p-3 border-t border-white/5">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <p className="text-xs text-white/40">{item.category_name}</p>
                {item.price && <p className="text-xs text-emerald-400 mt-1">${item.price}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-blue-400">{item.try_count || 0} tries</span>
                  {item.is_featured && (
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-200 rounded">★</span>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDelete({ isOpen: true, itemId: item.id })}
                  className="w-full mt-2 text-xs text-white/40 hover:text-red-400 hover:bg-red-500/10 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                >
                  <HiTrash className="w-4 h-4 inline mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onCancel={() => setConfirmDelete({ isOpen: false, itemId: null })}
        onConfirm={handleDelete}
        isDangerous
        title="Delete Jewelry Item"
        message="This action cannot be undone. The jewelry item will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
