/**
 * Buy stock modal component.
 */
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { transactionApi } from '../api/client';
import { X, TrendingUp } from 'lucide-react';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedSymbol?: string;
}

export const BuyModal: React.FC<BuyModalProps> = ({ isOpen, onClose, preSelectedSymbol }) => {
  const { characterName, marketData, refreshPortfolio } = useApp();
  const [symbol, setSymbol] = useState(preSelectedSymbol || '');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (preSelectedSymbol) {
      setSymbol(preSelectedSymbol);
    }
  }, [preSelectedSymbol]);

  if (!isOpen) return null;

  const currentPrice = symbol && marketData?.prices[symbol] ? marketData.prices[symbol] : 0;
  const totalCost = currentPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await transactionApi.buyStock(characterName, symbol, quantity);
      setSuccess(result.message);
      await refreshPortfolio();

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        setSymbol('');
        setQuantity(1);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to buy stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setSymbol('');
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
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h2 className="text-2xl font-bold text-white">Buy Stock</h2>
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
          {/* Company selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              disabled={loading || !!preSelectedSymbol}
              className="w-full px-4 py-3 bg-space-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cosmic-purple transition-colors disabled:opacity-50"
            >
              <option value="">Select a company</option>
              {marketData?.companies &&
                Object.entries(marketData.companies).map(([sym, company]) => (
                  <option key={sym} value={sym}>
                    {sym} - {company.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-space-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cosmic-purple transition-colors disabled:opacity-50"
            />
          </div>

          {/* Price display */}
          {symbol && currentPrice > 0 && (
            <div className="bg-space-dark border border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current Price:</span>
                <span className="text-white font-semibold">¢{currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Quantity:</span>
                <span className="text-white font-semibold">{quantity}</span>
              </div>
              <div className="border-t border-gray-700 pt-2 flex justify-between">
                <span className="text-gray-300 font-medium">Total Cost:</span>
                <span className="text-white font-bold text-lg">¢{totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}

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
              disabled={loading || !symbol || quantity < 1}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Buy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
