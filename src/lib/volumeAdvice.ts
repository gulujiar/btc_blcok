
import { Kline } from './indicators';

export interface VolumeAdvice {
  label: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'warning';
  description: string;
}

export function getVolumeAdvice(data: Kline[]): VolumeAdvice | null {
  if (data.length < 25) return null;

  const current = data[data.length - 1];
  const prev = data[data.length - 2];
  
  // Calculate VOL MA20 and MA5
  const getMA = (len: number, offset: number = 0) => {
    let sum = 0;
    const end = data.length - offset;
    const start = end - len;
    for (let i = start; i < end; i++) sum += data[i].volume;
    return sum / len;
  };

  const volMa20Current = getMA(20, 0);
  const volMa5Current = getMA(5, 0);
  const volMa20Prev = getMA(20, 1);
  const volMa5Prev = getMA(5, 1);

  const vol = current.volume;
  const isUp = current.close > current.open;
  const body = Math.abs(current.close - current.open);
  const upperShadow = isUp ? current.high - current.close : current.high - current.open;
  const lowerShadow = isUp ? current.open - current.low : current.close - current.low;

  // MA Cross detection
  const isGoldenCross = volMa5Prev <= volMa20Prev && volMa5Current > volMa20Current;
  const isDeadCross = volMa5Prev >= volMa20Prev && volMa5Current < volMa20Current;

  // Basic Volume states
  const isHighVol = vol > volMa20Current * 1.5;
  const isLowVol = vol < volMa20Current * 0.7;
  
  // Price states
  const isLongUpperShadow = upperShadow > body * 1.5 && upperShadow > 0;
  const isLongLowerShadow = lowerShadow > body * 1.5 && lowerShadow > 0;
  const isSideways = Math.abs(current.close - current.open) / current.open < 0.0005;

  // Breakout detection
  const recentHigh = Math.max(...data.slice(-10, -1).map(d => d.high));
  const recentLow = Math.min(...data.slice(-10, -1).map(d => d.low));

  // Priority logic based on new rules

  // 1. Cross Signals
  if (isGoldenCross) {
    if (isUp) return { label: '量能金叉上涨', type: 'bullish', description: '成交活跃且价格上升，多头启动信号' };
    if (!isUp && !isSideways) return { label: '量能金叉下跌', type: 'bearish', description: '成交活跃但价格下跌，空头放量风险' };
    return { label: '量能金叉横盘', type: 'neutral', description: '成交活跃但方向不明，关注变盘方向' };
  }

  if (isDeadCross) {
    if (isUp) return { label: '多头乏力', type: 'warning', description: '量能死叉上涨，涨势不济，警惕假突破' };
    if (!isUp && !isSideways) return { label: '空头减弱', type: 'neutral', description: '量能死叉下跌，杀跌动力不足，可能止跌' };
    return { label: '缩量横盘', type: 'neutral', description: '成交降温，市场进入蓄力或观望期' };
  }

  // 2. High Priority Reversals/Fakeouts
  if (isHighVol && current.high > recentHigh && current.close <= recentHigh) {
    return { label: '放量假突破', type: 'warning', description: '诱多风险，冲高回落压力大' };
  }
  if (isHighVol && current.low < recentLow && current.close >= recentLow) {
    return { label: '放量假跌破', type: 'warning', description: '诱空风险，探底回升支撑强' };
  }

  // 3. Classic Combinations
  if (isHighVol) {
    if (isLongUpperShadow) return { label: '冲高回落', type: 'bearish', description: '放量留长上影，上方抛压极重' };
    if (isLongLowerShadow) return { label: '探底回升', type: 'bullish', description: '放量留长下影，下方承接力强' };
    if (isUp) return { label: '放量上涨', type: 'bullish', description: '放量看方向，多头意愿强烈' };
    return { label: '放量下跌', type: 'bearish', description: '放量看方向，空头杀跌意愿强' };
  }

  if (isLowVol) {
    if (isUp) return { label: '缩量上涨', type: 'warning', description: '缩量看没劲，多头跟风不足' };
    if (!isUp) return { label: '缩量下跌', type: 'neutral', description: '缩量看没劲，空头动能正在衰竭' };
  }

  return null;
}
