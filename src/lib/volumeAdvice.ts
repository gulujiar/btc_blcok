
import { Kline } from './indicators';

export interface VolumeAdvice {
  label: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'warning';
  description: string;
}

export function getVolumeAdvice(data: Kline[]): VolumeAdvice | null {
  if (data.length < 20) return null;

  const current = data[data.length - 1];
  const prev = data[data.length - 2];
  
  // Calculate VOL MA20
  let sum20 = 0;
  for (let i = data.length - 20; i < data.length; i++) {
    sum20 += data[i].volume;
  }
  const volMa20 = sum20 / 20;

  // Calculate VOL MA5
  let sum5 = 0;
  for (let i = data.length - 5; i < data.length; i++) {
    sum5 += data[i].volume;
  }
  const volMa5 = sum5 / 5;

  const vol = current.volume;
  const isUp = current.close > current.open;
  const body = Math.abs(current.close - current.open);
  const upperShadow = isUp ? current.high - current.close : current.high - current.open;
  const lowerShadow = isUp ? current.open - current.low : current.close - current.low;

  // Volume states
  const isHugeVol = vol > volMa20 * 2;
  const isHighVol = vol > volMa20 * 1.5;
  const isLowVol = vol < volMa20 * 0.7;
  
  // Price states
  const isLongUpperShadow = upperShadow > body * 1.5 && upperShadow > 0;
  const isLongLowerShadow = lowerShadow > body * 1.5 && lowerShadow > 0;

  // Breakout detection (simplified)
  const recentHigh = Math.max(...data.slice(-10, -1).map(d => d.high));
  const recentLow = Math.min(...data.slice(-10, -1).map(d => d.low));
  const isBreakoutUp = current.close > recentHigh;
  const isBreakoutDown = current.close < recentLow;

  // Priority logic
  
  // 1. Fake Breakouts
  if (isHighVol && current.high > recentHigh && current.close <= recentHigh) {
    return { label: '放量假突破', type: 'warning', description: '冲高回落，诱多风险大' };
  }
  if (isHighVol && current.low < recentLow && current.close >= recentLow) {
    return { label: '放量假跌破', type: 'warning', description: '探底回升，诱空风险大' };
  }

  // 2. Reversal Signals
  if (isHighVol && isLongUpperShadow) {
    return { label: '放量冲高回落', type: 'bearish', description: '上方卖压沉重，可能见顶' };
  }
  if (isHighVol && isLongLowerShadow) {
    return { label: '放量探底回升', type: 'bullish', description: '下方接盘强劲，可能见底' };
  }

  // 3. Breakouts
  if (isHighVol && isBreakoutUp) {
    return { label: '放量突破', type: 'bullish', description: '强势突破压力位，看多' };
  }
  if (isHighVol && isBreakoutDown) {
    return { label: '放量跌破', type: 'bearish', description: '强势跌破支撑位，看空' };
  }

  // 4. Trend & Volume combinations
  if (isUp) {
    if (isHighVol) return { label: '放量上涨', type: 'bullish', description: '多头增强，上涨趋势健康' };
    if (isLowVol) return { label: '缩量上涨', type: 'warning', description: '动能不足，谨防诱多' };
  } else {
    if (isHighVol) return { label: '放量下跌', type: 'bearish', description: '空头增强，杀跌意愿强' };
    if (isLowVol) return { label: '缩量下跌', type: 'neutral', description: '杀跌减弱，可能止跌' };
  }

  // 5. Default
  if (isLowVol && Math.abs(current.close - current.open) / current.open < 0.001) {
    return { label: '缩量横盘', type: 'neutral', description: '市场平淡，等待方向选择' };
  }

  return null;
}
