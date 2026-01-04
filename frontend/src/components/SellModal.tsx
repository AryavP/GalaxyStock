/**
 * Sell stock modal component.
 */
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { transactionApi } from '../api/client';
import { X, TrendingDown } from 'lucide-react';
import type { Holding } from '../types';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: Holding | null;
}

export const SellModal: React.FC<SellModalProps> = ({ isOpen, onClose, holding }) => {
  const { characterName, refreshPortfolio } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (holding) {
      setQuantity(Math.min(1, holding.quantity));
    }
  }, [holding]);

  if (!isOpen || !holding) return null;

  const totalProceeds = holding.current_price * quantity;
  const realizedProfitLoss = (holding.current_price - holding.avg_purchase_price) * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await transactionApi.sellStock(characterName, holding.symbol, quantity);
      setSuccess(result.message);
      await refreshPortfolio();

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setQuantity(1);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sell stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setQuantity(1);
      setError(null);
      setSuccess(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-space-blue rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-white">Sell Stock</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company info */}
          <div className="bg-space-dark border border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Company</div>
            <div className="text-white font-semibold text-lg">{holding.symbol}</div>
          </div>

          {/* Quantity input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity (Max: {holding.quantity})
            </label>
            <input
              type="number"
              min="1"
              max={holding.quantity}
              value={quantity}
              onChange={(e) => {
                const val = Math.min(holding.quantity, Math.max(1, parseInt(e.target.value) || 1));
                setQuantity(val);
              }}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-space-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cosmic-purple transition-colors disabled:opacity-50"
            />
          </div>

          {/* Price display */}
          <div className="bg-space-dark border border-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Price:</span>
              <span className="text-white font-semibold">¢{holding.current_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Avg Purchase Price:</span>
              <span className="text-white font-semibold">¢{holding.avg_purchase_price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Quantity:</span>
              <span className="text-white font-semibold">{quantity}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-300 font-medium">Total Proceeds:</span>
                <span className="text-white font-bold text-lg">¢{totalProceeds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 font-medium">Realized P/L:</span>
                <span
                  className={`font-bold text-lg ${
                    realizedProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {realizedProfitLoss >= 0 ? '+' : ''}¢{realizedProfitLoss.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || quantity < 1 || quantity > holding.quantity}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Sell'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
