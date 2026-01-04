/**
 * Market page showing all stocks and price charts.
 */
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { BuyModal } from '../components/BuyModal';
import { StockChart } from '../components/StockChart';
import { TrendingUp, ShoppingCart } from 'lucide-react';

export const Market: React.FC = () => {
  const { marketData, loading } = useApp();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [buySymbol, setBuySymbol] = useState<string | undefined>(undefined);

  const handleBuy = (symbol: string) => {
    setBuySymbol(symbol);
    setBuyModalOpen(true);
  };

  const handleBuyModalClose = () => {
    setBuyModalOpen(false);
    setBuySymbol(undefined);
  };

  if (loading && !marketData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading market data...</div>
      </div>
    );
  }

  const stocks = marketData?.companies
    ? Object.entries(marketData.companies).map(([symbol, company]) => ({
        symbol,
        name: company.name,
        price: marketData.prices[symbol] || 0,
      }))
    : [];

  // Select first stock by default if none selected
  const displaySymbol = selectedSymbol || stocks[0]?.symbol || null;

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      {displaySymbol && (
        <div className="bg-space-blue rounded-lg border border-gray-700 p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">
              {marketData?.companies[displaySymbol]?.name || displaySymbol}
            </h2>
            <div className="flex items-baseline space-x-3">
              <span className="text-3xl font-bold text-stellar-cyan">
                ¢{marketData?.prices[displaySymbol]?.toFixed(2) || '0.00'}
              </span>
              <span className="text-sm text-gray-400">{displaySymbol}</span>
            </div>
          </div>
          <StockChart symbol={displaySymbol} />
        </div>
      )}

      {/* Stock List */}
      <div className="bg-space-blue rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-cosmic-purple" />
            <h3 className="text-xl font-bold text-white">All Stocks</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-space-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stocks.map((stock) => (
                <tr
                  key={stock.symbol}
                  className={`hover:bg-space-dark transition-colors cursor-pointer ${
                    displaySymbol === stock.symbol ? 'bg-space-dark' : ''
                  }`}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-white">{stock.symbol}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="text-gray-300"
                      title={marketData?.companies[stock.symbol]?.description || ''}
                    >
                      {stock.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-lg font-bold text-stellar-cyan">
                      ¢{stock.price.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuy(stock.symbol);
                      }}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Buy</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buy Modal */}
      <BuyModal isOpen={buyModalOpen} onClose={handleBuyModalClose} preSelectedSymbol={buySymbol} />
    </div>
  );
};
