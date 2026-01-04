/**
 * Header component with navigation and timestep display.
 */
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Rocket, TrendingUp, Briefcase, LogOut, Clock } from 'lucide-react';

export const Header: React.FC = () => {
  const { characterName, currentTimestep } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [timestepPulse, setTimestepPulse] = useState(false);
  const [prevTimestep, setPrevTimestep] = useState(currentTimestep);

  const handleLogout = () => {
    localStorage.removeItem('characterName');
    navigate('/');
    window.location.reload();
  };

  // Trigger pulse animation when timestep changes
  useEffect(() => {
    if (currentTimestep !== prevTimestep && prevTimestep !== 0) {
      setTimestepPulse(true);
      const timer = setTimeout(() => setTimestepPulse(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevTimestep(currentTimestep);
  }, [currentTimestep, prevTimestep]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-space-blue border-b border-gray-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Rocket className="w-8 h-8 text-stellar-cyan" />
            <span className="text-xl font-bold text-white">StandardUseInterface</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            <Link
              to="/dashboard"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/dashboard')
                  ? 'bg-cosmic-purple text-white'
                  : 'text-gray-300 hover:bg-space-dark'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span>Portfolio</span>
            </Link>

            <Link
              to="/market"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/market')
                  ? 'bg-cosmic-purple text-white'
                  : 'text-gray-300 hover:bg-space-dark'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Market</span>
            </Link>
          </nav>

          {/* User info and timestep */}
          <div className="flex items-center space-x-4">
            {/* Timestep indicator */}
            <div
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-space-dark border transition-all ${
                timestepPulse
                  ? 'border-stellar-cyan shadow-lg shadow-stellar-cyan/50 scale-105'
                  : 'border-gray-700'
              }`}
            >
              <Clock className={`w-5 h-5 ${timestepPulse ? 'text-stellar-cyan' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-400">Market Day</span>
              <span className={`font-bold ${timestepPulse ? 'text-stellar-cyan' : 'text-white'}`}>
                {currentTimestep}
              </span>
            </div>

            {/* Character name */}
            {characterName && (
              <div className="flex items-center space-x-3">
                <span className="text-gray-300">
                  <span className="text-gray-500">Playing as:</span>{' '}
                  <span className="font-semibold text-white">{characterName}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-white hover:bg-space-dark rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
