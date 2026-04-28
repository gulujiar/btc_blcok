
import { Kline, calculateKDJ } from './indicators';

export interface KDJState {
  k: number;
  d: number;
  j: number;
}

export interface MarketSnapshot {
  timestamp: number;
  price: number;
  states: Record<string, KDJState>; // tf -> state
  futureReturn?: number; // 10 min later return
}

export function vectorize(snapshot: MarketSnapshot, timeframes: string[]): number[] {
  const vec: number[] = [];
  timeframes.forEach(tf => {
    const s = snapshot.states[tf];
    if (s) {
      vec.push(s.k, s.d); // Using K and D for the pattern vector
    } else {
      vec.push(50, 50);
    }
  });
  return vec;
}

export function euclideanDistance(v1: number[], v2: number[]): number {
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += Math.pow(v1[i] - v2[i], 2);
  }
  return Math.sqrt(sum);
}

export class PatternMatcher {
  private history: MarketSnapshot[] = [];
  private timeframes = ['1m', '5m', '15m', '30m', '1h'];

  constructor(initialData: Record<string, Kline[]>) {
    this.buildHistory(initialData);
  }

  private buildHistory(data: Record<string, Kline[]>) {
    const oneMinKlines = data['1m'];
    if (!oneMinKlines || oneMinKlines.length < 20) return;

    // Calculate KDJ for all timeframes
    const kdjResults: Record<string, any> = {};
    this.timeframes.forEach(tf => {
      if (data[tf]) {
        kdjResults[tf] = calculateKDJ(data[tf]);
      }
    });

    // We align history based on 1m klines
    // We need to find the KDJ value for each timeframe at every minute of the past 12 hours
    const snapshots: MarketSnapshot[] = [];
    
    // Start from 12 hours ago until 10 minutes ago (so we can label them)
    const now = Date.now();
    const tenMinMs = 10 * 60 * 1000;
    
    for (let i = 0; i < oneMinKlines.length; i++) {
      const kline = oneMinKlines[i];
      const ts = kline.time * 1000;
      
      const states: Record<string, KDJState> = {};
      this.timeframes.forEach(tf => {
        const results = kdjResults[tf];
        if (!results) return;
        
        // Find the index in the results for this timeframe that corresponds to this timestamp
        // For 1m/5m/etc. we find the latest bar that closed before or at this time
        const kdjIdx = results.k.findIndex((item: any) => (item.time * 1000) >= ts);
        if (kdjIdx !== -1) {
          states[tf] = {
            k: results.k[kdjIdx].value,
            d: results.d[kdjIdx].value,
            j: results.j[kdjIdx].value,
          };
        }
      });

      // Label with future return (10 mins later)
      let futureReturn = undefined;
      const futureKline = oneMinKlines.find(k => k.time === kline.time + (10 * 60));
      if (futureKline) {
        futureReturn = (futureKline.close - kline.close) / kline.close;
      }

      snapshots.push({
        timestamp: ts,
        price: kline.close,
        states,
        futureReturn
      });
    }

    this.history = snapshots.filter(s => Object.keys(s.states).length === this.timeframes.length);
  }

  public predict(currentData: Record<string, any>): { probability: number, confidence: number, similarCounts: number } {
    if (this.history.length === 0) return { probability: 0.5, confidence: 0, similarCounts: 0 };

    // Get current state vector
    const currentStates: Record<string, KDJState> = {};
    this.timeframes.forEach(tf => {
        const k = currentData[tf]?.k;
        const d = currentData[tf]?.d;
        if (k !== undefined && d !== undefined) {
            currentStates[tf] = { k, d, j: 0 };
        }
    });

    if (Object.keys(currentStates).length < this.timeframes.length) {
        return { probability: 0.5, confidence: 0, similarCounts: 0 };
    }

    const currentVec = vectorize({ timestamp: Date.now(), price: 0, states: currentStates }, this.timeframes);

    // Find the single absolute most similar historical pattern
    const labeledHistory = this.history.filter(s => s.futureReturn !== undefined);
    if (labeledHistory.length === 0) return { probability: 0.5, confidence: 0, similarCounts: 0 };

    let topMatch = labeledHistory[0];
    let minScore = euclideanDistance(currentVec, vectorize(topMatch, this.timeframes));

    for (let i = 1; i < labeledHistory.length; i++) {
        const score = euclideanDistance(currentVec, vectorize(labeledHistory[i], this.timeframes));
        if (score < minScore) {
            minScore = score;
            topMatch = labeledHistory[i];
        }
    }

    // Probability is binary based on the most similar pattern's outcome
    const probability = (topMatch.futureReturn || 0) > 0 ? 1 : 0;
    
    // Confidence is based on distance to the single top match
    const confidence = Math.max(0, 1 - (minScore / 60));

    return { probability, confidence, similarCounts: 1 };
  }
}
