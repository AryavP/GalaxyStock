/**
 * Main admin panel for managing GalacticStocks.
 * Allows creating/editing companies, generating timesteps, and viewing player stats.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuth } from '../utils/adminAuth';
import { CompanyForm } from '../components/admin/CompanyForm';
import { TimestepControl } from '../components/admin/TimestepControl';

interface Company {
  symbol: string;
  name: string;
  initial_price: number;
  trend: number;
  volatility: number;
  description: string;
}

interface Player {
  character_name: string;
  total_value: number;
  cost_basis: number;
  profit_loss: number;
  profit_loss_pct: number;
  holdings: any[];
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    if (!adminAuth.isAuthenticated()) {
      navigate('/admin/login');
      return;
    }

    // Load initial data
    loadCompanies();
    loadPlayers();
  }, [navigate]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8000/admin/companies', {
        headers: { 'X-Admin-Password': adminAuth.getPassword()! }
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        setError('Failed to load companies');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await fetch('http://localhost:8000/admin/players', {
        headers: { 'X-Admin-Password': adminAuth.getPassword()! }
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
      } else {
        setError('Failed to load player stats');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingSymbol(company.symbol);
    setEditData({
      trend: company.trend,
      volatility: company.volatility,
      description: company.description
    });
  };

  const handleSave = async (symbol: string) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/companies/${symbol}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminAuth.getPassword()!
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setEditingSymbol(null);
        loadCompanies();
      } else {
        const data = await response.json();
        alert(`Error: ${data.detail}`);
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleDelete = async (symbol: string) => {
    if (!confirm(`Delete ${symbol}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/admin/companies/${symbol}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Password': adminAuth.getPassword()! }
      });

      if (response.ok) {
        loadCompanies();
      } else {
        const data = await response.json();
        alert(`Error: ${data.detail}`);
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleLogout = () => {
    adminAuth.logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-space-dark to-space-blue p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-red-400">GalacticStocks Admin Panel</h1>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Back to Game
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Timestep Control */}
        <div className="mb-8">
          <TimestepControl onComplete={() => { loadCompanies(); loadPlayers(); }} />
        </div>

        {/* Company Form */}
        <div className="mb-8">
          <CompanyForm onSuccess={loadCompanies} />
        </div>

        {/* Companies Table */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Companies</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2 text-white">Symbol</th>
                  <th className="text-left p-2 text-white">Name</th>
                  <th className="text-left p-2 text-white">Initial Price</th>
                  <th className="text-left p-2 text-white">Trend</th>
                  <th className="text-left p-2 text-white">Volatility</th>
                  <th className="text-left p-2 text-white">Description</th>
                  <th className="text-left p-2 text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.symbol} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="p-2 font-mono font-bold text-red-400">{c.symbol}</td>
                    <td className="p-2 text-white">{c.name}</td>
                    <td className="p-2 text-white">¢{c.initial_price.toFixed(2)}</td>
                    <td className="p-2 text-white">
                      {editingSymbol === c.symbol ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editData.trend}
                          onChange={e => setEditData({ ...editData, trend: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        c.trend.toFixed(2)
                      )}
                    </td>
                    <td className="p-2 text-white">
                      {editingSymbol === c.symbol ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editData.volatility}
                          onChange={e => setEditData({ ...editData, volatility: parseFloat(e.target.value) })}
                          className="w-20 bg-gray-700 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        c.volatility.toFixed(2)
                      )}
                    </td>
                    <td className="p-2 max-w-xs truncate text-white">
                      {editingSymbol === c.symbol ? (
                        <input
                          type="text"
                          value={editData.description}
                          onChange={e => setEditData({ ...editData, description: e.target.value })}
                          className="w-full bg-gray-700 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        c.description || 'N/A'
                      )}
                    </td>
                    <td className="p-2">
                      {editingSymbol === c.symbol ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(c.symbol)}
                            className="text-green-400 hover:text-green-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSymbol(null)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(c)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.symbol)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Player Leaderboard */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Player Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2 text-white">Rank</th>
                  <th className="text-left p-2 text-white">Character</th>
                  <th className="text-left p-2 text-white">Portfolio Value</th>
                  <th className="text-left p-2 text-white">Cost Basis</th>
                  <th className="text-left p-2 text-white">P&L</th>
                  <th className="text-left p-2 text-white">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, idx) => (
                  <tr key={p.character_name} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="p-2 font-bold text-white">#{idx + 1}</td>
                    <td className="p-2 font-bold text-white">{p.character_name}</td>
                    <td className="p-2 text-white">¢{p.total_value.toFixed(2)}</td>
                    <td className="p-2 text-white">¢{p.cost_basis.toFixed(2)}</td>
                    <td className={`p-2 font-bold ${p.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.profit_loss >= 0 ? '+' : ''}¢{p.profit_loss.toFixed(2)}
                    </td>
                    <td className={`p-2 font-bold ${p.profit_loss_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.profit_loss_pct >= 0 ? '+' : ''}{p.profit_loss_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">
                      No players with holdings yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
