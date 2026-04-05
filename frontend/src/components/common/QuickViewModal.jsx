import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiX, HiHeart, HiOutlineHeart, HiShoppingCart, HiSparkles, HiShare } from 'react-icons/hi';
import Modal from './Modal';
import { addFavorite, removeFavorite } from '../../services/jewelry';

export default function QuickViewModal({
  isOpen,
  onClose,
  jewelry,
  isFavorite = false,
  onFavoriteChange,
  onAddToCart,
  onTryOn
}) {
  const [isFav, setIsFav] = useState(isFavorite);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  if (!jewelry || !isOpen) {
    return null;
  }

  const handleFavoriteClick = async () => {
    setFavoriteLoading(true);
    try {
      if (isFav) {
        await removeFavorite(jewelry.id);
      } else {
        await addFavorite(jewelry.id);
      }
      setIsFav(!isFav);
      onFavoriteChange?.(!isFav);
      setFeedbackMessage(isFav ? 'Removed from favorites' : 'Added to favorites');
      setTimeout(() => setFeedbackMessage(''), 2000);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToCart = () => {
    onAddToCart?.(jewelry);
    setFeedbackMessage('Added to cart');
    setTimeout(() => setFeedbackMessage(''), 2000);
  };

  const handleTryOn = () => {
    onTryOn?.(jewelry);
    onClose();
  };

  const imageUrl = jewelry?.image_url || jewelry?.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop';
  const name = jewelry?.name || 'Jewelry';
  const price = jewelry?.price || 'N/A';
  const category = jewelry?.category_name || jewelry?.category || 'Jewelry';
  const description = jewelry?.description || 'Beautiful jewelry piece';
  const rating = jewelry?.rating || 4.5;
  const reviews = jewelry?.reviews || 128;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeButton={false} size="2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-900 border border-white/10 rounded-2xl overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <HiX className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative group rounded-xl overflow-hidden bg-white/5 aspect-square flex items-center justify-center"
          >
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => (e.target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Category Badge */}
            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-accent-500/20 border border-accent-500/40 backdrop-blur-md">
              <p className="text-xs font-semibold text-accent-300">{category}</p>
            </div>

            {/* Rating */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={i < Math.floor(rating) ? 'text-amber-400' : 'text-white/30'}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-xs text-white/60">({reviews})</span>
            </div>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
                  <p className="text-sm text-white/60">{category}</p>
                </div>
                <button
                  onClick={handleFavoriteClick}
                  disabled={favoriteLoading}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  {isFav ? (
                    <HiHeart className="w-6 h-6 text-pink-500" />
                  ) : (
                    <HiOutlineHeart className="w-6 h-6 text-white/60 hover:text-white" />
                  )}
                </button>
              </div>

              {/* Price */}
              <div className="mb-4">
                <p className="text-3xl font-bold text-accent-400">₹{price}</p>
              </div>

              {/* Description */}
              <p className="text-sm text-white/70 mb-4 line-clamp-3">{description}</p>

              {/* Specs */}
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex justify-between">
                  <span>Rating:</span>
                  <span className="text-white">{rating}/5.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Reviews:</span>
                  <span className="text-white">{reviews}</span>
                </div>
              </div>
            </div>

            {/* Feedback */}
            {feedbackMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-lg bg-accent-500/20 border border-accent-500/40 text-accent-300 text-sm"
              >
                {feedbackMessage}
              </motion.div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTryOn}
                  className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-primary-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <HiSparkles className="w-5 h-5" />
                  Try On
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddToCart}
                  className="flex-1 py-3 px-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <HiShoppingCart className="w-5 h-5" />
                  Add to Cart
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const text = `Check out this beautiful ${name} from JewelAR! Price: ₹${price}`;
                  navigator.share?.({ title: 'JewelAR Jewelry', text, url: window.location.href });
                }}
                className="w-full py-2.5 px-4 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <HiShare className="w-5 h-5" />
                Share
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </Modal>
  );
}
