import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../services/jewelry';
import { HiHeart, HiTrash, HiViewGrid, HiViewList, HiDownload, HiShare, HiFilter, HiSearch, HiX, HiShoppingCart, HiSparkles } from 'react-icons/hi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JewelryCard from '../components/common/JewelryCard';
import QuickCart from '../components/common/QuickCart';
import QuickViewModal from '../components/common/QuickViewModal';

const downloadAsImage = async (gridRef) => {
  if (!gridRef?.current) return;
  try {
    const canvas = await html2canvas(gridRef.current, {
      backgroundColor: '#0a0e27',
      useCORS: true,
      allowTaint: true,
      scale: 2,
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `favorites-${new Date().toISOString().split('T')[0]}.png`;
    link.click();
  } catch (error) {
    console.error('Error downloading image:', error);
  }
};

const downloadAsPDF = async (filteredFavorites) => {
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yPosition = margin;

    pdf.setFontSize(20);
    pdf.text('My Favorite Jewelry Items', margin, yPosition);
    yPosition += 15;

    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 10;

    filteredFavorites.forEach((item, index) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      const jewelry = item.jewelry_item_detail || {};
      pdf.setTextColor(0);
      pdf.setFontSize(12);
      pdf.text(`${index + 1}. ${jewelry.name || 'Jewelry Item'}`, margin, yPosition);
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      if (jewelry.category_name) pdf.text(`Category: ${jewelry.category_name}`, margin + 5, yPosition);
      yPosition += 6;
      if (jewelry.price) pdf.text(`Price: â‚¹${jewelry.price}`, margin + 5, yPosition);
      yPosition += 10;
    });

    pdf.save(`favorites-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [categories, setCategories] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewItem, setQuickViewItem] = useState(null);
  const gridRef = useRef();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await getFavorites();
      const data = res.data?.results || res.data || [];
      setFavorites(data);
      const uniqueCategories = [...new Set(data.map(f => f.jewelry_item_detail?.category_name).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFavorites = useMemo(() => {
    let filtered = [...favorites];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        (f.jewelry_item_detail?.name || '').toLowerCase().includes(term) ||
        (f.jewelry_item_detail?.category_name || '').toLowerCase().includes(term) ||
        (f.jewelry_item_detail?.description || '').toLowerCase().includes(term)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.jewelry_item_detail?.category_name === selectedCategory);
    }

    filtered = filtered.filter(f => {
      const price = parseInt(f.jewelry_item_detail?.price) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    filtered.sort((a, b) => {
      if (sortBy === 'price-high') {
        return (parseInt(b.jewelry_item_detail?.price) || 0) - (parseInt(a.jewelry_item_detail?.price) || 0);
      } else if (sortBy === 'price-low') {
        return (parseInt(a.jewelry_item_detail?.price) || 0) - (parseInt(b.jewelry_item_detail?.price) || 0);
      } else if (sortBy === 'name') {
        return (a.jewelry_item_detail?.name || '').localeCompare(b.jewelry_item_detail?.name || '');
      }
      return 0;
    });

    return filtered;
  }, [favorites, searchTerm, selectedCategory, sortBy, priceRange]);

  const handleRemove = async (id) => {
    try {
      await removeFavorite(id);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleAddToCart = (jewelry) => {
    const item = {
      ...jewelry,
      id: jewelry.id,
      name: jewelry.name,
      price: jewelry.price,
      image_url: jewelry.image_url,
      quantity: 1,
    };
    const existing = cartItems.find(ci => ci.id === item.id);
    if (existing) {
      setCartItems(cartItems.map(ci => ci.id === item.id ? { ...ci, quantity: (ci.quantity || 1) + 1 } : ci));
    } else {
      setCartItems([...cartItems, item]);
    }
  };

  const handleRemoveFromCart = (jewelryId) => {
    setCartItems(cartItems.filter(item => item.id !== jewelryId));
  };

  const handleUpdateQuantity = (jewelryId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(jewelryId);
    } else {
      setCartItems(cartItems.map(item => item.id === jewelryId ? { ...item, quantity } : item));
    }
  };

  const handleTryOn = (jewelry) => {
    navigate('/try-on', { state: { selectedJewelry: jewelry } });
  };

  const handleCheckout = () => {
    navigate('/checkout', { state: { cartItems } });
  };

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-display font-bold mb-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <HiHeart className="w-6 h-6 text-white" />
                </div>
                My Favorites
              </h1>
              <p className="text-white/60">Your saved jewelry items â€¢ <span className="text-accent-400 font-semibold">{filteredFavorites.length}</span> items</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-2"
            >
              <HiShoppingCart className="w-5 h-5" />
              Cart {cartItems.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-xs font-bold text-white">{cartItems.length}</span>}
            </motion.button>
          </div>
        </motion.div>

        {/* Controls */}
        {favorites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 space-y-4"
          >
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-xs relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search favorites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg dark:bg-white/5 dark:border dark:border-white/10 dark:text-white dark:placeholder-white/30 bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <HiFilter className="w-5 h-5" />
                Filters
              </motion.button>

              <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {['grid', 'list'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded transition-all text-sm font-medium ${
                      viewMode === mode
                        ? 'bg-primary-500/30 border border-primary-500/50 text-primary-300'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {mode === 'grid' ? <HiViewGrid className="w-4 h-4" /> : <HiViewList className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => downloadAsImage(gridRef)}
                className="px-4 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-all flex items-center gap-2"
              >
                <HiDownload className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => downloadAsPDF(filteredFavorites)}
                className="px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all flex items-center gap-2"
              >
                <HiDownload className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  const text = `Check out my ${favorites.length} favorite jewelry items from JewelAR! ðŸ’Ž`;
                  const url = window.location.href;
                  navigator.share?.({ title: 'My JewelAR Favorites', text, url }) ||
                    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
                }}
                className="px-4 py-2.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 transition-all flex items-center gap-2"
              >
                <HiShare className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg dark:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none transition-colors"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg dark:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none transition-colors"
                    >
                      <option value="date">Recently Added</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="price-high">Price (High to Low)</option>
                      <option value="price-low">Price (Low to High)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Max Price</label>
                    <select
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                      className="w-full px-3 py-2 rounded-lg dark:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none transition-colors"
                    >
                      <option value="100000">No Limit</option>
                      <option value="10000">Up to â‚¹10,000</option>
                      <option value="50000">Up to â‚¹50,000</option>
                      <option value="100000">Up to â‚¹1,00,000</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setSortBy('date');
                        setPriceRange([0, 100000]);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all text-sm font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card h-72 rounded-xl overflow-hidden"
              >
                <div className="w-full h-1/2 bg-gradient-to-r from-white/10 to-white/5 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/10 rounded-lg animate-pulse" />
                  <div className="h-3 bg-white/10 rounded-lg w-2/3 animate-pulse" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : filteredFavorites.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
            ref={gridRef}
            className={`grid gap-5 ${
              viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'grid-cols-1'
            }`}
          >
            {filteredFavorites.map((fav, i) => {
              const jewelry = fav.jewelry_item_detail || {};
              const jewelryItem = {
                id: jewelry.id || fav.id,
                name: jewelry.name,
                description: jewelry.description,
                image_url: jewelry.image_url || jewelry.image,
                price: jewelry.price,
                category_name: jewelry.category_name,
                ...jewelry,
              };

              return (
                <motion.div
                  key={fav.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <JewelryCard
                    jewelry={jewelryItem}
                    layout={viewMode}
                    isFavorite={true}
                    onQuickView={setQuickViewItem}
                    onAddToCart={handleAddToCart}
                    onTryOn={handleTryOn}
                    onRemove={() => handleRemove(fav.id)}
                    onFavoriteChange={() => {}}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full"
          >
            <div className="glass-card p-16 text-center border border-white/5 hover:border-accent-500/30 transition-all duration-300">
              {/* Icon */}
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6 border border-accent-500/30"
              >
                <HiHeart className="w-12 h-12 text-accent-400" />
              </motion.div>

              {/* Heading */}
              <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-white via-accent-300 to-pink-400 bg-clip-text text-transparent">
                No Favorites Yet
              </h2>

              {/* Description */}
              <p className="text-lg text-white/60 mb-2 max-w-2xl mx-auto">
                Start building your jewelry wishlist by adding items you love
              </p>
              <p className="text-sm text-white/40 mb-8 max-w-2xl mx-auto">
                Heart your favorite pieces and keep them all in one beautiful collection. Your favorites help us personalize your experience.
              </p>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass-card p-4 border border-white/5 hover:border-accent-500/20"
                >
                  <div className="flex justify-center mb-2">
                    <HiSparkles className="w-6 h-6 text-accent-400" />
                  </div>
                  <p className="text-sm font-semibold text-white/80">Curated Collections</p>
                  <p className="text-xs text-white/40 mt-1">Exclusive jewelry pieces</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass-card p-4 border border-white/5 hover:border-accent-500/20"
                >
                  <div className="flex justify-center mb-2">
                    <HiHeart className="w-6 h-6 text-pink-400" />
                  </div>
                  <p className="text-sm font-semibold text-white/80">Save & Share</p>
                  <p className="text-xs text-white/40 mt-1">Your personal wishlist</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="glass-card p-4 border border-white/5 hover:border-accent-500/20"
                >
                  <div className="flex justify-center mb-2">
                    <HiShoppingCart className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-white/80">Quick Checkout</p>
                  <p className="text-xs text-white/40 mt-1">Add to cart anytime</p>
                </motion.div>
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/shop')}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-accent-500 to-pink-500 hover:from-accent-600 hover:to-pink-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:shadow-accent-500/30 transition-all duration-300 inline-flex items-center gap-2"
              >
                <HiShoppingCart className="w-5 h-5" />
                Explore Collection
              </motion.button>

              {/* Secondary Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/home')}
                className="ml-4 px-8 py-4 rounded-xl border-2 border-white/20 hover:border-accent-500/50 text-white font-semibold text-lg bg-white/5 hover:bg-white/10 transition-all duration-300"
              >
                Browse Home
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Cart Drawer */}
      <QuickCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemove={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
        onTryOn={handleTryOn}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={!!quickViewItem}
        onClose={() => setQuickViewItem(null)}
        jewelry={quickViewItem}
        isFavorite={true}
        onFavoriteChange={() => loadFavorites()}
        onAddToCart={handleAddToCart}
        onTryOn={handleTryOn}
      />
    </div>
  );
}
