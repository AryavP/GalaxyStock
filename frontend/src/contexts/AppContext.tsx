/**
 * Application context for managing global state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { marketApi, portfolioApi } from '../api/client';
import { getMarketWebSocket } from '../api/websocket';
import type { MarketData, Portfolio, WebSocketMessage } from '../types';

interface AppContextType {
  characterName: string | null;
  setCharacterName: (name: string) => void;
  marketData: MarketData | null;
  portfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  refreshMarket: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  currentTimestep: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [characterName, setCharacterNameState] = useState<string | null>(() => {
    return localStorage.getItem('characterName');
  });
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTimestep, setCurrentTimestep] = useState(0);

  const setCharacterName = useCallback((name: string) => {
    setCharacterNameState(name);
    localStorage.setItem('characterName', name);
  }, []);

  const refreshMarket = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await marketApi.getMarket();
      setMarketData(data);
      setCurrentTimestep(data.timestep);
      console.log('[AppContext] Market data refreshed, timestep:', data.timestep);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load market data';
      setError(message);
      console.error('[AppContext] Error refreshing market:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    if (!characterName) return;

    try {
      setLoading(true);
      setError(null);
      const data = await portfolioApi.getPortfolio(characterName);
      setPortfolio(data);
      console.log('[AppContext] Portfolio refreshed for', characterName);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load portfolio';
      setError(message);
      console.error('[AppContext] Error refreshing portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [characterName]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      console.log('[AppContext] WebSocket message:', message.type);

      if (message.type === 'connected') {
        console.log('[AppContext] Connected to market, timestep:', message.timestep);
        setCurrentTimestep(message.timestep);
        // Refresh market data on connection
        refreshMarket();
      } else if (message.type === 'timestep_updated') {
        console.log('[AppContext] Timestep updated to:', message.timestep);
        setCurrentTimestep(message.timestep);

        // Update market data with new prices
        setMarketData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            timestep: message.timestep,
            last_updated: message.timestamp,
            prices: message.prices,
          };
        });

        // Refresh portfolio to update values
        if (characterName) {
          refreshPortfolio();
        }
      }
    },
    [characterName, refreshMarket, refreshPortfolio]
  );

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = getMarketWebSocket();
    ws.addMessageHandler(handleWebSocketMessage);
    ws.connect();

    return () => {
      ws.removeMessageHandler(handleWebSocketMessage);
    };
  }, [handleWebSocketMessage]);

  // Load initial data
  useEffect(() => {
    refreshMarket();
  }, [refreshMarket]);

  // Load portfolio when character changes
  useEffect(() => {
    if (characterName) {
      refreshPortfolio();
    } else {
      setPortfolio(null);
    }
  }, [characterName, refreshPortfolio]);

  const value: AppContextType = {
    characterName,
    setCharacterName,
    marketData,
    portfolio,
    loading,
    error,
    refreshMarket,
    refreshPortfolio,
    currentTimestep,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
