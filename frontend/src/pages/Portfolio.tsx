/**
 * Portfolio page showing character's holdings and P/L.
 */
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { BuyModal } from '../components/BuyModal';
import { SellModal } from '../components/SellModal';
import { TrendingUp, TrendingDown, Plus, Briefcase } from 'lucide-react';
import type { Holding } from '../types';

export const Portfolio: React.FC = () => {
  const { portfolio, loading } = useApp();
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const handleBuyMore = (holding: Holding) => {
    setSelectedHolding(holding);
    setBuyModalOpen(true);
  };

  const handleSell = (holding: Holding) => {
    setSelectedHolding(holding);
    setSellModalOpen(true);
  };

  const handleBuyModalClose = () => {
    setBuyModalOpen(false);
    setSelectedHolding(null);
  };

  const handleSellModalClose = () => {
    setSellModalOpen(false);
    setSelectedHolding(null);
  };

  if (loading && !portfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading portfolio...</div>
      </div>
    );
  }

  const hasHoldings = portfolio && portfolio.holdings.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-space-blue rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Briefcase className="w-6 h-6 text-cosmic-purple" />
            <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
          </div>
          <button
            onClick={() => setBuyModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            <span>Buy Stock</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-space-dark border border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">
              ¢{(portfolio?.total_value || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-space-dark border border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total Invested</div>
            <div className="text-2xl font-bold text-white">
              ¢{(portfolio?.total_cost_basis || 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-space-dark border border-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Total P/L</div>
            <div
              className={`text-2xl font-bold ${
                (portfolio?.total_profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {(portfolio?.total_profit_loss || 0) >= 0 ? '+' : ''}¢
              {(portfolio?.total_profit_loss || 0).toFixed(2)}
              <span className="text-sm ml-2">
                ({(portfolio?.total_profit_loss || 0) >= 0 ? '+' : ''}
                {(portfolio?.profit_loss_percentage || 0).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-space-blue rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Holdings</h3>
        </div>

        {!hasHoldings ? (
          <div className="p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No holdings yet</p>
            <button
              onClick={() => setBuyModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Buy Your First Stock
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-space-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    P/L
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {portfolio?.holdings.map((holding) => (
                  <tr key={holding.symbol} className="hover:bg-space-dark transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-white">{holding.symbol}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-white">
                      {holding.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-300">
                      ¢{holding.avg_purchase_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div
                        className={`font-semibold ${
                          holding.current_price >= holding.avg_purchase_price
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        ¢{holding.current_price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-white font-semibold">
                      ¢{holding.current_value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div
                        className={`font-bold ${
                          holding.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {holding.profit_loss >= 0 ? '+' : ''}¢{holding.profit_loss.toFixed(2)}
                        <div className="text-xs">
                          ({holding.profit_loss >= 0 ? '+' : ''}
                          {holding.profit_loss_percentage.toFixed(2)}%)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleBuyMore(holding)}
                          className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Buy more"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSell(holding)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Sell"
                        >
                          <TrendingDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <BuyModal
        isOpen={buyModalOpen}
        onClose={handleBuyModalClose}
        preSelectedSymbol={selectedHolding?.symbol}
      />
      <SellModal isOpen={sellModalOpen} onClose={handleSellModalClose} holding={selectedHolding} />
    </div>
  );
};
