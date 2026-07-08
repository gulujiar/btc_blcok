
import { Kline } from './indicators';

export interface VolumeAdvice {
  label: string;
  type: 'bullish' | 'bearish' | 'neutral' | 'warning';
  description: string;
  suggestion?: string;
  comboSignal?: string;
}

export interface KDJData {
  k: { value: number }[];
  d: { value: number }[];
  j: { value: number }[];
}

export function getVolumeAdvice(data: Kline[], kdj?: KDJData): VolumeAdvice | null {
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

  // Volume MA Cross detection
  const isVolGoldenCross = volMa5Prev <= volMa20Prev && volMa5Current > volMa20Current;
  const isVolDeadCross = volMa5Prev >= volMa20Prev && volMa5Current < volMa20Current;

  // KDJ Logic
  let isKDJGolden = false;
  let isKDJDead = false;
  let isKDJLow = false;
  let isKDJHigh = false;
  let kVal = 50;
  let dVal = 50;

  if (kdj && kdj.k.length > 2) {
    kVal = kdj.k[kdj.k.length - 1].value;
    dVal = kdj.d[kdj.d.length - 1].value;
    const kPrev = kdj.k[kdj.k.length - 2].value;
    const dPrev = kdj.d[kdj.d.length - 2].value;

    isKDJGolden = kPrev <= dPrev && kVal > dVal;
    isKDJDead = kPrev >= dPrev && kVal < dVal;
    isKDJLow = kVal <= 50;
    isKDJHigh = kVal > 50;
  }

  // Basic Volume states
  const isHighVol = vol > volMa20Current * 1.1;
  const isLowVol = vol < volMa20Current * 0.9;
  
  // Price states
  const isLongUpperShadow = upperShadow > body * 1.5 && upperShadow > 0;
  const isLongLowerShadow = lowerShadow > body * 1.5 && lowerShadow > 0;
  const isSideways = Math.abs(current.close - current.open) / current.open < 0.0005;

  // Breakout detection
  const recentHigh = Math.max(...data.slice(-10, -1).map(d => d.high));
  const recentLow = Math.min(...data.slice(-10, -1).map(d => d.low));

  // Indicator States (instead of just Crosses) to cover all cases
  const isKDJPos = kVal >= dVal;
  const isKDJNeg = kVal < dVal;
  const isVolPos = volMa5Current >= volMa20Current;
  const isVolNeg = volMa5Current < volMa20Current;

  // --- 8 Specific KDJ + VOL MA Combinations (State-based) ---

  // 1. KDJ 低位金叉 + VOL MA 金叉
  if (isKDJLow && isKDJPos && isVolPos) {
    return {
      label: '低位放量金叉',
      type: 'bullish',
      suggestion: '低多确认',
      description: '放量阳线是低多确认',
      comboSignal: 'Rule 1'
    };
  }
  // 2. KDJ 低位金叉 + VOL MA 死叉
  if (isKDJLow && isKDJPos && isVolNeg) {
    return {
      label: '低位金叉无量',
      type: 'warning',
      suggestion: '弱反弹，观察',
      description: '动能不足',
      comboSignal: 'Rule 2'
    };
  }
  // 3. KDJ 高位死叉 + VOL MA 金叉
  if (isKDJHigh && isKDJNeg && isVolPos) {
    return {
      label: '高位放量死叉',
      type: 'bearish',
      suggestion: '高空确认',
      description: '放量阴线是高空确认',
      comboSignal: 'Rule 3'
    };
  }
  // 4. KDJ 高位死叉 + VOL MA 死叉
  if (isKDJHigh && isKDJNeg && isVolNeg) {
    return {
      label: '高位死叉无量',
      type: 'warning',
      suggestion: '弱回调，观察',
      description: '杀跌动力不足',
      comboSignal: 'Rule 4'
    };
  }
  // 5. KDJ 高位金叉 + VOL MA 金叉
  if (isKDJHigh && isKDJPos && isVolPos) {
    return {
      label: '高位放量延续',
      type: 'bullish',
      suggestion: '强势延续，不要乱空',
      description: '多头意愿强烈',
      comboSignal: 'Rule 5'
    };
  }
  // 6. KDJ 高位金叉 + VOL MA 死叉
  if (isKDJHigh && isKDJPos && isVolNeg) {
    return {
      label: '高位缩量上涨',
      type: 'warning',
      suggestion: '缩量上涨，谨慎追多',
      description: '防范冲高回落',
      comboSignal: 'Rule 6'
    };
  }
  // 7. KDJ 低位死叉 + VOL MA 金叉
  if (isKDJLow && isKDJNeg && isVolPos) {
    return {
      label: '低位放量杀跌',
      type: 'bearish',
      suggestion: '放量杀跌，不要抄底',
      description: '趋势仍向下',
      comboSignal: 'Rule 7'
    };
  }
  // 8. KDJ 低位死叉 + VOL MA 死叉
  if (isKDJLow && isKDJNeg && isVolNeg) {
    return {
      label: '低位缩量下跌',
      type: 'neutral',
      suggestion: '缩量下跌，不追空',
      description: '等反转信号',
      comboSignal: 'Rule 8'
    };
  }

  // --- Fallback Standard Rules ---

  if (isHighVol) {
    if (current.high > recentHigh && current.close <= recentHigh) return { label: '放量假突破', type: 'warning', description: '诱多风险，冲高回落压力大' };
    if (current.low < recentLow && current.close >= recentLow) return { label: '放量假跌破', type: 'warning', description: '诱空风险，探底回升支撑强' };
    if (isLongUpperShadow) return { label: '冲高回落', type: 'bearish', description: '放量留长上影，上方抛压极重' };
    if (isLongLowerShadow) return { label: '探底回升', type: 'bullish', description: '放量留长下影，下方承接力强' };
    if (isUp) return { label: '放量上涨', type: 'bullish', description: '放量看方向，多头意愿强烈' };
    return { label: '放量下跌', type: 'bearish', description: '放量看方向，空头杀跌意愿强' };
  }

  if (isLowVol) {
    if (isUp) return { label: '缩量上涨', type: 'warning', description: '多头跟风不足，上涨质量一般' };
    return { label: '缩量下跌', type: 'neutral', description: '空头动能不足，抛压减弱' };
  }

  return null;
}
