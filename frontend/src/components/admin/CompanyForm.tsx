/**
 * Form component for creating new companies.
 */
import React, { useState } from 'react';
import { adminAuth } from '../../utils/adminAuth';

interface CompanyFormProps {
  onSuccess: () => void;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSuccess }) => {
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    initial_price: '100',
    trend: '0',
    volatility: '0.2',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:8000/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminAuth.getPassword()!
        },
        body: JSON.stringify({
          symbol: form.symbol.toUpperCase(),
          name: form.name,
          initial_price: parseFloat(form.initial_price),
          trend: parseFloat(form.trend),
          volatility: parseFloat(form.volatility),
          description: form.description
        })
      });

      if (response.ok) {
        alert('Company created successfully!');
        setForm({
          symbol: '',
          name: '',
          initial_price: '100',
          trend: '0',
          volatility: '0.2',
          description: ''
        });
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create company');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-red-400">Create New Company</h2>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-white">Symbol</label>
          <input
            type="text"
            placeholder="e.g., GLXT"
            value={form.symbol}
            onChange={e => setForm({ ...form, symbol: e.target.value })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white">Company Name</label>
          <input
            type="text"
            placeholder="e.g., Galactic Transport Inc"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white">Initial Price</label>
          <input
            type="number"
            step="0.01"
            placeholder="100.00"
            value={form.initial_price}
            onChange={e => setForm({ ...form, initial_price: e.target.value })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white">Trend (-0.1 to 0.1)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={form.trend}
            onChange={e => setForm({ ...form, trend: e.target.value })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-white">Volatility (0.1 to 0.5)</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.20"
            value={form.volatility}
            onChange={e => setForm({ ...form, volatility: e.target.value })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1 text-white">Description (optional)</label>
        <textarea
          placeholder="Brief company description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
          rows={2}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating...' : 'Create Company'}
      </button>
    </form>
  );
};
