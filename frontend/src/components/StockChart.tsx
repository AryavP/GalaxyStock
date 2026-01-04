/**
 * Stock price chart component using Recharts.
 */
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { marketApi } from '../api/client';
import type { StockPrice } from '../types';

interface StockChartProps {
  symbol: string;
}

export const StockChart: React.FC<StockChartProps> = ({ symbol }) => {
  const [history, setHistory] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await marketApi.getPriceHistory(symbol);
        setHistory(data.history);
      } catch (error) {
        console.error('Error loading price history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      loadHistory();
    }
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No price history available</div>
      </div>
    );
  }

  const chartData = history.map((item) => ({
    timestep: item.timestep,
    price: item.price,
  }));

  const minPrice = Math.min(...history.map((h) => h.price)) * 0.95;
  const maxPrice = Math.max(...history.map((h) => h.price)) * 1.05;

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="timestep"
            stroke="#9CA3AF"
            label={{ value: 'Market Day', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
          />
          <YAxis
            stroke="#9CA3AF"
            domain={[minPrice, maxPrice]}
            tickFormatter={(value) => `¢${value.toFixed(2)}`}
            label={{ value: 'Price', angle: -90, position: 'insideLeft', offset: -15, fill: '#9CA3AF' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1f3a',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number) => [`¢${value.toFixed(2)}`, 'Price']}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#22d3ee"
            strokeWidth={2}
            dot={{ fill: '#22d3ee', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
