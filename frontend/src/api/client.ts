/**
 * API client for GalacticStocks backend.
 * Handles all HTTP requests to the FastAPI server.
 */
import axios, { AxiosError } from 'axios';
import type { MarketData, Portfolio, StockPrice, TransactionResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Error handler for API calls.
 */
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail: string }>;
    const message = axiosError.response?.data?.detail || axiosError.message;
    throw new Error(message);
  }
  throw error;
};

/**
 * Market API endpoints.
 */
export const marketApi = {
  /**
   * Get current market data with all stock prices.
   */
  getMarket: async (): Promise<MarketData> => {
    try {
      const response = await api.get<MarketData>('/market');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get price history for a specific stock.
   */
  getPriceHistory: async (
    symbol: string,
    limit?: number
  ): Promise<{ symbol: string; history: StockPrice[] }> => {
    try {
      const params = limit ? { limit } : {};
      const response = await api.get(`/market/${symbol}/history`, { params });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * Portfolio API endpoints.
 */
export const portfolioApi = {
  /**
   * Get portfolio for a character.
   */
  getPortfolio: async (characterName: string): Promise<Portfolio> => {
    try {
      const response = await api.get<Portfolio>(`/portfolio/${characterName}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * Transaction API endpoints.
 */
export const transactionApi = {
  /**
   * Buy stock for a character.
   */
  buyStock: async (
    characterName: string,
    symbol: string,
    quantity: number
  ): Promise<TransactionResponse> => {
    try {
      const response = await api.post<TransactionResponse>('/transaction/buy', {
        character_name: characterName,
        symbol,
        quantity,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Sell stock for a character.
   */
  sellStock: async (
    characterName: string,
    symbol: string,
    quantity: number
  ): Promise<TransactionResponse> => {
    try {
      const response = await api.post<TransactionResponse>('/transaction/sell', {
        character_name: characterName,
        symbol,
        quantity,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * Admin API endpoints (GM only).
 */
export const adminApi = {
  /**
   * Generate a new market timestep.
   */
  generateTimestep: async (): Promise<{
    success: boolean;
    timestep: number;
    last_updated: string;
    prices: Record<string, number>;
  }> => {
    try {
      const response = await api.post('/admin/timestep');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get all transactions with optional filters.
   */
  getTransactions: async (filters?: {
    character_name?: string;
    symbol?: string;
    limit?: number;
  }): Promise<{ transactions: any[]; count: number }> => {
    try {
      const response = await api.get('/admin/transactions', { params: filters });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get current market state.
   */
  getMarketState: async (): Promise<{
    current_timestep: number;
    last_updated: string;
    is_generating: boolean;
  }> => {
    try {
      const response = await api.get('/admin/market-state');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export default api;
