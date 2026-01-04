/**
 * Component for controlling timestep generation with price previews and overrides.
 */
import React, { useState } from 'react';
import { adminAuth } from '../../utils/adminAuth';

interface TimestepControlProps {
  onComplete: () => void;
}

interface PricePreview {
  symbol: string;
  name: string;
  current_price: number;
  calculated_price: number;
  change_pct: number;
}

export const TimestepControl: React.FC<TimestepControlProps> = ({ onComplete }) => {
  const [showModal, setShowModal] = useState(false);
  const [previews, setPreviews] = useState<PricePreview[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/timestep/preview`, {
        headers: { 'X-Admin-Password': adminAuth.getPassword()! }
      });

      if (response.ok) {
        const data = await response.json();
        setPreviews(data.previews);
        setShowModal(true);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to load preview');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Build overrides map
      const overrideMap: Record<string, number> = {};
      Object.entries(overrides).forEach(([symbol, price]) => {
        if (price !== '') {
          overrideMap[symbol] = parseFloat(price);
        }
      });

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/admin/timestep/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminAuth.getPassword()!
        },
        body: JSON.stringify({ overrides: overrideMap })
      });

      if (response.ok) {
        alert('Timestep generated! Players should refresh their page to see new prices.');
        setShowModal(false);
        setOverrides({});
        onComplete();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to generate timestep');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-red-400">Timestep Control</h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <button
        onClick={loadPreview}
        disabled={isLoading}
        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-6 py-3 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading...' : 'Generate New Timestep'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto m-4">
            <h3 className="text-2xl font-bold mb-4 text-red-400">Preview & Override Prices</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2 text-white">Symbol</th>
                    <th className="text-left p-2 text-white">Name</th>
                    <th className="text-left p-2 text-white">Current</th>
                    <th className="text-left p-2 text-white">Calculated</th>
                    <th className="text-left p-2 text-white">Change %</th>
                    <th className="text-left p-2 text-white">Override Price</th>
                  </tr>
                </thead>
                <tbody>
                  {previews.map(p => (
                    <tr key={p.symbol} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="p-2 font-mono font-bold text-red-400">{p.symbol}</td>
                      <td className="p-2 text-white">{p.name}</td>
                      <td className="p-2 text-white">¢{p.current_price.toFixed(2)}</td>
                      <td className="p-2 text-white">¢{p.calculated_price.toFixed(2)}</td>
                      <td className={`p-2 font-bold ${p.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.change_pct >= 0 ? '+' : ''}{p.change_pct.toFixed(2)}%
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Optional"
                          value={overrides[p.symbol] || ''}
                          onChange={e => setOverrides({ ...overrides, [p.symbol]: e.target.value })}
                          className="w-24 bg-gray-700 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Generating...' : 'Confirm Generate'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-2 rounded disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
