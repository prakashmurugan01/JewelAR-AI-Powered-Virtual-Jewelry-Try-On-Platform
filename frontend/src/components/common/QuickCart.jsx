import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiX, HiTrash, HiShoppingCart, HiArrowRight, HiMinus, HiPlus } from 'react-icons/hi';

export default function QuickCart({
  isOpen,
  onClose,
  cartItems = [],
  onRemove,
  onUpdateQuantity,
  onCheckout,
  onTryOn
}) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await onCheckout?.();
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 80 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-surface-950 border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <HiShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold">Your Cart</h2>
                  <p className="text-xs text-white/40">{cartItems.length} items</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <HiShoppingCart className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">Your cart is empty</p>
                </div>
              ) : (
                <AnimatePresence>
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all"
                    >
                      <div className="flex gap-3">
                        {/* Image */}
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white/5">
                          <img
                            src={item.image_url || item.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100&h=100&fit=crop'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col">
                          <h4 className="text-sm font-semibold line-clamp-1">{item.name}</h4>
                          <p className="text-xs text-white/40 mb-2">{item.category_name || 'Jewelry'}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-accent-400">₹{(item.price || 0).toLocaleString()}</p>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                              <button
                                onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) - 1)}
                                className="p-0.5 hover:bg-white/20 rounded transition-colors"
                              >
                                <HiMinus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-semibold">{item.quantity || 1}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                                className="p-0.5 hover:bg-white/20 rounded transition-colors"
                              >
                                <HiPlus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => onRemove(item.id)}
                          className="p-1.5 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Try On Button */}
                      {onTryOn && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          onClick={() => onTryOn?.(item)}
                          className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary-500/20 to-pink-500/20 text-primary-300 border border-primary-500/30 hover:border-primary-500/50 transition-all"
                        >
                          Try This On
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Divider */}
            {cartItems.length > 0 && <div className="h-px bg-white/10" />}

            {/* Summary */}
            {cartItems.length > 0 && (
              <div className="p-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Tax (18%)</span>
                    <span>₹{tax.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-accent-400">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-primary-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <HiShoppingCart className="w-5 h-5" />
                  {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
