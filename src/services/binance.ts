import { Kline } from '../lib/indicators';

const BINANCE_BASE = 'https://api.binance.com/api/v3';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h';

let bestEndpoint: string | null = null;

export async function fetchKlines(symbol: string, interval: Timeframe, limit = 200): Promise<Kline[]> {
  const bybitInterval = interval === '1h' ? '60' : interval.replace('m', '');
  
  const allEndpoints = [
    `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  ];

  // If we already found a working endpoint, try it first
  const endpoints = bestEndpoint 
    ? [bestEndpoint.replace(/\?.*$/, `?category=linear&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`).replace(/v3\/klines.*$/, `v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`), ...allEndpoints.filter(e => !e.includes(bestEndpoint!.split('/')[2]))]
    : allEndpoints;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      
      // Found a working one, remember it
      if (!bestEndpoint) {
        bestEndpoint = url.split('?')[0];
      }
      
      if (url.includes('bybit')) {
        if (!data.result?.list) continue;
        const klines: Kline[] = data.result.list.map((k: any) => ({
          time: Math.floor(parseInt(k[0]) / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        return klines.sort((a, b) => a.time - b.time);
      }
      
      const klines: Kline[] = data.map((k: any) => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      return klines.sort((a, b) => a.time - b.time);
    } catch (error) {
      // Endpoint failed, clear memory to re-scan if it was our best one
      if (bestEndpoint && url.includes(bestEndpoint.split('/')[2])) {
        bestEndpoint = null;
      }
    }
  }

  return [];
}
