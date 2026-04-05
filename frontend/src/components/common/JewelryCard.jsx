import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiHeart, HiOutlineHeart, HiEye, HiShoppingCart, HiSparkles, HiTrash, HiShare } from 'react-icons/hi';
import { useTheme } from '../../context/ThemeContext';
import { addFavorite, removeFavorite } from '../../services/jewelry';

export default function JewelryCard({
  jewelry,
  onQuickView,
  onAddToCart,
  onTryOn,
  onRemove,
  isFavorite = false,
  onFavoriteChange,
  layout = 'grid'
}) {
  const { liteMode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isFav, setIsFav] = useState(isFavorite);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFavoriteLoading(true);
    try {
      if (isFav) {
        await removeFavorite(jewelry.id);
      } else {
        await addFavorite(jewelry.id);
      }
      setIsFav(!isFav);
      onFavoriteChange?.(!isFav);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleRemove = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeFavorite(jewelry.id);
      onRemove?.(jewelry.id);
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const handleShare = (e, platform) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareTitle = `Check out this beautiful ${jewelry.name}`;
    const shareText = `${shareTitle} - ${jewelry.description} - ₹${jewelry.price}`;
    const shareUrl = `${window.location.origin}/jewelry/${jewelry.id}`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      copy: null
    };
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Link copied to clipboard!');
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const imageUrl = jewelry.image_url || jewelry.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop';
  const price = jewelry.price || 'N/A';
  const category = jewelry.category_name || jewelry.category || 'Jewelry';

  if (layout === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="glass-card overflow-hidden p-5 group hover:shadow-xl hover:shadow-primary-500/20 transition-all border border-white/10 hover:border-primary-500/30"
      >
        <div className="flex gap-5 items-center">
          {/* Image */}
          <div className="w-40 h-40 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 relative">
            <img
              src={imageUrl}
              alt={jewelry.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => (e.target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Quick actions on image hover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="absolute inset-0 flex items-center justify-center gap-2"
            >
              {onTryOn && (
                <button
                  onClick={() => onTryOn?.(jewelry)}
                  className="p-2 rounded-full bg-primary-500 text-white hover:bg-primary-400 transition-all shadow-lg"
                >
                  <HiSparkles className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{jewelry.name}</h3>
                <p className="text-sm text-white/50 font-medium">{category}</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFavoriteClick}
                  disabled={favoriteLoading}
                  className="text-2xl hover:drop-shadow-lg transition-all"
                >
                  <motion.div
                    key={isFav ? 'filled' : 'outline'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                  >
                    {isFav ? (
                      <HiHeart className="text-pink-500 drop-shadow-lg" />
                    ) : (
                      <HiOutlineHeart className="text-white/40 hover:text-pink-400" />
                    )}
                  </motion.div>
                </motion.button>
                {onRemove && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleRemove}
                    className="text-xl text-white/40 hover:text-red-400 transition-colors"
                  >
                    <HiTrash />
                  </motion.button>
                )}
              </div>
            </div>
            <p className="text-sm text-white/60 mb-4 line-clamp-2">{jewelry.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Price</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-accent-400 to-pink-400 bg-clip-text text-transparent">₹{typeof price === 'number' ? price.toLocaleString() : price}</p>
              </div>
              <div className="flex gap-3">
                {onTryOn && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onTryOn?.(jewelry)}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/50 transition-all flex items-center gap-2"
                  >
                    <HiSparkles className="w-4 h-4" />
                    Try On
                  </motion.button>
                )}
                {onAddToCart && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAddToCart?.(jewelry)}
                    className="px-6 py-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                  >
                    <HiShoppingCart className="w-4 h-4" />
                    Cart
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid layout (default) - PREMIUM VERSION
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, x: -50 }}
      whileHover={{ y: -8 }}
      className="glass-card overflow-hidden group h-full flex flex-col hover:shadow-2xl hover:shadow-primary-500/20 transition-all border border-white/10 hover:border-primary-500/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 aspect-square">
        {/* Main Image */}
        <img
          src={imageUrl}
          alt={jewelry.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          onError={(e) => (e.target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop')}
        />
        
        {/* Premium Overlay Gradient */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"
          transition={{ duration: 0.3 }}
        />
        
        {/* Favorite Button - Premium */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleFavoriteClick}
          disabled={favoriteLoading}
          className="absolute top-4 right-4 z-20 w-12 h-12 rounded-full bg-white/15 backdrop-blur-xl flex items-center justify-center text-2xl hover:bg-white/25 transition-all border border-white/30 hover:border-white/50 shadow-lg"
        >
          <AnimatePresence mode="wait">
            {favoriteLoading ? (
              <motion.div
                key="loading"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                exit={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : isFav ? (
              <motion.div
                key="filled"
                initial={{ scale: 0.3, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 1.2, rotate: 180, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <HiHeart className="text-pink-400 drop-shadow-lg w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="outline"
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
              >
                <HiOutlineHeart className="text-white/70 hover:text-pink-300 drop-shadow-lg w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Action Buttons on Hover */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-end gap-2.5 p-4 z-10"
        >
          {onTryOn && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTryOn?.(jewelry)}
              className="flex-1 px-3 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-pink-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary-500/60 transition-all flex items-center justify-center gap-2"
            >
              <HiSparkles className="w-4 h-4" />
              Try On
            </motion.button>
          )}
          {onQuickView && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onQuickView?.(jewelry)}
              className="flex-1 px-3 py-3 rounded-lg bg-white/10 backdrop-blur-xl border border-white/30 text-white hover:bg-white/20 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <HiEye className="w-4 h-4" />
              View
            </motion.button>
          )}
          {onAddToCart && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onAddToCart?.(jewelry)}
              className="w-11 h-11 rounded-lg bg-emerald-500/30 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/50 transition-all flex items-center justify-center shadow-lg"
            >
              <HiShoppingCart className="w-5 h-5" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShareOpen(!shareOpen);
            }}
            className="w-11 h-11 rounded-lg bg-blue-500/30 border border-blue-500/60 text-blue-300 hover:bg-blue-500/50 transition-all flex items-center justify-center shadow-lg"
          >
            <HiShare className="w-5 h-5" />
          </motion.button>
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleRemove}
              className="w-11 h-11 rounded-lg bg-red-500/30 border border-red-500/60 text-red-300 hover:bg-red-500/50 transition-all flex items-center justify-center shadow-lg"
            >
              <HiTrash className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>

        {/* Category Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-accent-500/25 border border-accent-500/50 backdrop-blur-sm"
        >
          <p className="text-xs font-bold text-accent-200">{category}</p>
        </motion.div>

        {/* Share Menu */}
        <AnimatePresence>
          {shareOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-xl border border-white/20 rounded-lg p-2 z-20 shadow-lg"
            >
              <button
                onClick={(e) => handleShare(e, 'whatsapp')}
                className="w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
              >
                <span>💚 WhatsApp</span>
              </button>
              <button
                onClick={(e) => handleShare(e, 'facebook')}
                className="w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
              >
                <span>👍 Facebook</span>
              </button>
              <button
                onClick={(e) => handleShare(e, 'twitter')}
                className="w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
              >
                <span>𝕏 Twitter</span>
              </button>
              <button
                onClick={(e) => handleShare(e, 'copy')}
                className="w-full px-3 py-2 text-sm text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
              >
                <span>📋 Copy Link</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-white/[0.02] to-white/[0.01]">
        <motion.h3 className="font-bold text-base line-clamp-2 mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          {jewelry.name}
        </motion.h3>
        <p className="text-xs text-white/50 mb-4 line-clamp-2 flex-1 leading-relaxed">{jewelry.description}</p>
        
        {/* Price Section */}
        <motion.div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Price</p>
          <p className="text-2xl font-black bg-gradient-to-r from-accent-400 via-pink-400 to-accent-400 bg-clip-text text-transparent">
            ₹{typeof price === 'number' ? price.toLocaleString() : price}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
