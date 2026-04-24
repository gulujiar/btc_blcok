/**
 * Technical Indicator Calculations
 */

export interface Kline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calculateEMA(prices: number[], period: number): (number | null)[] {
  if (prices.length < period) return Array(prices.length).fill(null);
  const k = 2 / (period + 1);
  const ema: (number | null)[] = Array(period - 1).fill(null);
  
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  let currentEma = sum / period;
  ema.push(currentEma);

  for (let i = period; i < prices.length; i++) {
    currentEma = (prices[i] - currentEma) * k + currentEma;
    ema.push(currentEma);
  }
  return ema;
}

export function calculateRSI(prices: number[], period = 14): (number | null)[] {
  if (prices.length < period + 1) return Array(prices.length).fill(null);
  const rsi: (number | null)[] = Array(period).fill(null);
  
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }

  avgGain /= period;
  avgLoss /= period;
  rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));
  }
  return rsi;
}

export function calculateKDJ(data: Kline[], n = 9, m1 = 3, m2 = 3) {
  if (data.length < n) return { k: [], d: [], j: [] };

  const rsV: number[] = [];
  const kArr: number[] = [];
  const dArr: number[] = [];
  const jArr: number[] = [];

  let k = 50;
  let d = 50;

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - n + 1);
    const slice = data.slice(start, i + 1);
    const lowN = Math.min(...slice.map(d => d.low));
    const highN = Math.max(...slice.map(d => d.high));
    
    const currentRsv = highN === lowN ? 50 : ((data[i].close - lowN) / (highN - lowN)) * 100;
    
    k = (2 / 3) * k + (1 / 3) * currentRsv;
    d = (2 / 3) * d + (1 / 3) * k;
    const j = 3 * k - 2 * d;

    kArr.push(k);
    dArr.push(d);
    jArr.push(j);
  }

  return {
    k: kArr.map((v, i) => ({ time: data[i].time as any, value: v })),
    d: dArr.map((v, i) => ({ time: data[i].time as any, value: v })),
    j: jArr.map((v, i) => ({ time: data[i].time as any, value: v }))
  };
}
