import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getJewelryItems, getCategories, getFavorites } from '../services/jewelry';
import { getTryOnHistory } from '../services/tryon';
import { HiCamera, HiHeart, HiClock, HiSparkles, HiArrowRight, HiSearch, HiFilter, HiShoppingCart, HiAdjustments, HiX, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import JewelryCard from '../components/common/JewelryCard';
import QuickCart from '../components/common/QuickCart';
import QuickViewModal from '../components/common/QuickViewModal';


export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { liteMode } = useTheme();
  const [allJewelries, setAllJewelries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentTryons, setRecentTryons] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({ jewelry: 0, favorites: 0, tryons: 0 });
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewItem, setQuickViewItem] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 100000]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const itemsPerPage = viewMode === 'grid' ? 12 : 6;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jewelryRes, categoriesRes, favsRes, historyRes] = await Promise.all([
        getJewelryItems({ limit: 100 }).catch(() => ({ data: { results: [] } })),
        getCategories().catch(() => ({ data: [] })),
        getFavorites().catch(() => ({ data: { results: [] } })),
        getTryOnHistory().catch(() => ({ data: { results: [] } })),
      ]);

      const jewelries = jewelryRes.data?.results || jewelryRes.data || [];
      const cats = categoriesRes.data?.results || categoriesRes.data || [];
      const favs = favsRes.data?.results || favsRes.data || [];
      const history = historyRes.data?.results || historyRes.data || [];

      setAllJewelries(jewelries);
      setCategories(cats);
      setFavorites(favs);
      setRecentTryons(history.slice(0, 6));

      setStats({
        jewelry: jewelries.length,
        favorites: favs.length,
        tryons: history.length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Searched Jewelries
  const filteredJewelries = useMemo(() => {
    return allJewelries.filter(item => {
      const matchesSearch =
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category_name === selectedCategory;
      const matchesPrice = (item.price || 0) >= priceRange[0] && (item.price || 0) <= priceRange[1];
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [allJewelries, searchTerm, selectedCategory, priceRange]);

  // Paginated Jewelries
  const paginatedJewelries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJewelries.slice(start, start + itemsPerPage);
  }, [filteredJewelries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredJewelries.length / itemsPerPage);

  const handleAddToCart = (jewelry) => {
    const existing = cartItems.find(item => item.id === jewelry.id);
    if (existing) {
      setCartItems(
        cartItems.map(item =>
          item.id === jewelry.id ? { ...item, quantity: (item.quantity || 1) + 1 } : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...jewelry, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (jewelryId) => {
    setCartItems(cartItems.filter(item => item.id !== jewelryId));
  };

  const handleUpdateQuantity = (jewelryId, quantity) => {
    if (quantity <= 0) {
      handleRemoveFromCart(jewelryId);
    } else {
      setCartItems(
        cartItems.map(item =>
          item.id === jewelryId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleTryOn = (jewelry) => {
    navigate('/try-on', { state: { selectedJewelry: jewelry } });
  };

  const handleCheckout = () => {
    navigate('/checkout', { state: { cartItems } });
  };

  const isFavorite = (jewelryId) => favorites.some(f => f.jewelry_item_detail?.id === jewelryId);

  const statCards = [
    { icon: <HiSparkles />, label: 'Available Jewelry', value: stats.jewelry, color: 'from-primary-500 to-purple-600' },
    { icon: <HiHeart />, label: 'Your Favorites', value: stats.favorites, color: 'from-pink-500 to-rose-600' },
    { icon: <HiClock />, label: 'Try-On Sessions', value: stats.tryons, color: 'from-accent-500 to-amber-600' },
  ];

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-display font-bold mb-2">
            Welcome back, <span className="text-gradient">{user?.first_name || user?.username}</span>
          </h1>
          <p className="text-white/40">Explore our stunning jewelry collection and discover your perfect piece</p>
        </motion.div>

        {/* Quick Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Link to="/try-on" className="block glass-card-hover p-6 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white group-hover:shadow-lg group-hover:shadow-primary-500/30">
                  <HiCamera className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-semibold">Open Try-On Studio</h2>
                  <p className="text-white/40 text-sm">Try jewelry in real time with your camera</p>
                </div>
              </div>
              <HiArrowRight className="w-6 h-6 text-white/30 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-card p-6"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white text-xl mb-3`}
              >
                {card.icon}
              </div>
              <p className="text-2xl font-display font-bold">{loading ? '—' : card.value}</p>
              <p className="text-white/40 text-sm">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Collections Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">Featured Collection</h2>
              <p className="text-white/40">Explore our handpicked selection</p>
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

          {/* Category Quick Filter */}
          {categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 pb-6 border-b border-white/10"
            >
              <p className="text-xs uppercase tracking-wider text-white/40 mb-3 font-semibold">Categories</p>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedCategory('all');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white border-primary-400 shadow-lg shadow-primary-500/30'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  All
                </motion.button>

                {categories.map((cat, idx) => {
                  const categoryIcons = {
                    'Earrings': '💎',
                    'Necklaces': '📿',
                    'Rings': '💍',
                    'Bangles': '✨',
                    'Nethi Chudi': '👑',
                    'Nose Pins': '✨',
                  };
                  const icon = categoryIcons[cat.name] || '✨';
                  return (
                    <motion.button
                      key={cat.id || cat.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedCategory(cat.name || cat.id);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all border flex items-center gap-2 ${
                        selectedCategory === (cat.name || cat.id)
                          ? 'bg-gradient-to-r from-accent-500 to-pink-500 text-white border-accent-400 shadow-lg shadow-accent-500/30'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{icon}</span>
                      {cat.name || cat.id}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Search & Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search jewelry..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg dark:bg-white/5 dark:border dark:border-white/10 dark:text-white dark:placeholder-white/30 bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <HiAdjustments className="w-5 h-5" />
                Filters
              </motion.button>
              <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
                {['grid', 'list'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setViewMode(mode);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded transition-all text-sm font-medium ${
                      viewMode === mode
                        ? 'bg-primary-500/30 border border-primary-500/50 text-primary-300'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {mode === 'grid' ? '⊞' : '☰'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-lg dark:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 border border-gray-300 text-gray-900 focus:outline-none transition-colors"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id || cat.name} value={cat.name || cat.id}>
                          {cat.name || cat.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Price Range</label>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="1000"
                        value={priceRange[1]}
                        onChange={(e) => {
                          setPriceRange([priceRange[0], parseInt(e.target.value)]);
                          setCurrentPage(1);
                        }}
                        className="w-full"
                      />
                      <div className="text-xs text-white/40 text-center">
                        Up to ₹{priceRange[1].toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setPriceRange([0, 100000]);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-all text-sm font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Results Info */}
          <div className="mb-4 text-sm text-white/40">
            Showing {paginatedJewelries.length === 0 ? '0' : ((currentPage - 1) * itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredJewelries.length)} of {filteredJewelries.length} items
          </div>

          {/* Jewelry Grid/List */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`grid gap-4 ${
                viewMode === 'grid'
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-1'
              }`}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-2xl h-64 animate-pulse"
                />
              ))}
            </motion.div>
          ) : paginatedJewelries.length > 0 ? (
            <>
              <motion.div
                initial={!liteMode ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={!liteMode ? { duration: 0.3 } : { duration: 0 }}
                className={`grid gap-5 mb-8 ${
                  viewMode === 'grid'
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    : 'grid-cols-1'
                }`}
              >
                {paginatedJewelries.map((jewelry, i) => (
                  <motion.div
                    key={jewelry.id}
                    initial={!liteMode ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={!liteMode ? { delay: i * 0.05, duration: 0.3 } : { duration: 0 }}
                    whileHover={{ y: -5 }}
                  >
                    <JewelryCard
                      jewelry={jewelry}
                      layout={viewMode}
                      isFavorite={isFavorite(jewelry.id)}
                      onQuickView={setQuickViewItem}
                      onAddToCart={handleAddToCart}
                      onTryOn={handleTryOn}
                      onFavoriteChange={() => loadData()}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
                  >
                    <HiChevronLeft className="w-5 h-5" />
                  </motion.button>

                  <div className="flex items-center gap-2">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg transition-all ${
                            currentPage === pageNum
                              ? 'bg-primary-500/30 border border-primary-500/50 text-primary-300 font-medium'
                              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
                  >
                    <HiChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-16 text-center border border-white/5 hover:border-accent-500/30 transition-all"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6 border border-accent-500/30">
                <span className="text-4xl">✨</span>
              </div>
              <h3 className="text-2xl font-display font-bold mb-2">No jewelry found</h3>
              <p className="text-white/40 mb-6">Try adjusting your search or filters to discover other beautiful pieces</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setPriceRange([0, 100000]);
                  setCurrentPage(1);
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-primary-500/30 transition-all inline-flex items-center gap-2"
              >
                Reset Filters
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {/* Recent Try-Ons */}
        {recentTryons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-display font-bold">Recent Try-Ons</h2>
              <Link
                to="/history"
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
              >
                View All <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentTryons.map((session, i) => (
                <motion.div
                  key={session.id || i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card overflow-hidden group cursor-pointer"
                >
                  {session.snapshot_image ? (
                    <img
                      src={session.snapshot_image}
                      alt="Try-on"
                      className="w-full h-32 object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-32 bg-white/5 flex items-center justify-center text-3xl">
                      {session.jewelry_image ? '💎' : '📷'}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-medium truncate">{session.jewelry_name || 'Try-on'}</p>
                    <p className="text-[10px] text-white/30">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
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
        isFavorite={quickViewItem ? isFavorite(quickViewItem.id) : false}
        onFavoriteChange={() => loadData()}
        onAddToCart={handleAddToCart}
        onTryOn={handleTryOn}
      />
    </div>
  );
}
