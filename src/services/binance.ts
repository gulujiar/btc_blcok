import { Kline } from '../lib/indicators';

const BINANCE_BASE = 'https://api.binance.com/api/v3';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h';

export async function fetchKlines(symbol: string, interval: Timeframe, limit = 200): Promise<Kline[]> {
  const endpoints = [
    `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api2.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;
      
      const data = await response.json();
      return data.map((k: any) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (error) {
      console.warn(`Failed to fetch from ${url}:`, error);
    }
  }

  console.error('All Binance API endpoints failed');
  return [];
}
