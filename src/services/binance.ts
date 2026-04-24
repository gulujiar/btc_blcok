import { Kline } from '../lib/indicators';

const BINANCE_BASE = 'https://api.binance.com/api/v3';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h';

export async function fetchKlines(symbol: string, interval: Timeframe, limit = 200): Promise<Kline[]> {
  try {
    const response = await fetch(
      `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Proxy API request failed');
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
    console.error('Error fetching klines:', error);
    return [];
  }
}
