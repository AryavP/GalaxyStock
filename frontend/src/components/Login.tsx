/**
 * Login component for character name entry.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Rocket } from 'lucide-react';

export const Login: React.FC = () => {
  const [name, setName] = useState('');
  const { setCharacterName } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setCharacterName(name.trim());
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-space-dark to-space-blue flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Rocket className="w-16 h-16 text-stellar-cyan" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">GalacticStocks</h1>
          <p className="text-gray-400">Galactic Stock Market Simulator</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-space-blue rounded-lg p-8 shadow-xl border border-gray-700">
          <div className="mb-6">
            <label htmlFor="character-name" className="block text-sm font-medium text-gray-300 mb-2">
              Character Name
            </label>
            <input
              id="character-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your character name"
              className="w-full px-4 py-3 bg-space-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cosmic-purple transition-colors"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cosmic-purple to-stellar-cyan text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
          >
            Enter Market
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          No authentication required - honor system trading
        </p>
      </div>
    </div>
  );
};
