/**
 * TypeScript type definitions for GalacticStocks frontend.
 */

export interface Company {
  symbol: string;
  name: string;
  description?: string;
}

export interface StockPrice {
  timestep: number;
  price: number;
  timestamp: string;
  is_override: boolean;
}

export interface Holding {
  symbol: string;
  quantity: number;
  avg_purchase_price: number;
  current_price: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
}

export interface Portfolio {
  character_name: string;
  holdings: Holding[];
  total_value: number;
  total_cost_basis: number;
  total_profit_loss: number;
  profit_loss_percentage: number;
}

export interface MarketData {
  timestep: number;
  last_updated: string;
  prices: Record<string, number>;
  companies: Record<string, Company>;
}

export interface Transaction {
  id: number;
  character_name: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  total_amount: number;
  timestamp: string;
  timestep: number;
}

export interface TransactionResponse {
  success: boolean;
  transaction_id?: number;
  message: string;
  new_holding?: {
    symbol: string;
    quantity: number;
    avg_purchase_price: number;
  };
}

export interface WebSocketMessage {
  type: 'connected' | 'timestep_updated';
  timestep: number;
  prices: Record<string, number>;
  timestamp: string;
}
