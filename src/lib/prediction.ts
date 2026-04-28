
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

export interface PredictionResult {
  probability: number;
  confidence: number;
  similarCounts: number;
  tfScores: Record<string, number>; // Similarity score for each TF (0-1)
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
    const snapshots: MarketSnapshot[] = [];
    
    for (let i = 0; i < oneMinKlines.length; i++) {
      const kline = oneMinKlines[i];
      const ts = kline.time * 1000;
      
      const states: Record<string, KDJState> = {};
      let hasAllTFs = true;

      this.timeframes.forEach(tf => {
        const results = kdjResults[tf];
        if (!results) {
          hasAllTFs = false;
          return;
        }
        
        // Find current or nearest previous bar for this TF
        // Using reverse find for efficiency
        const kdjIdx = results.k.slice().reverse().findIndex((item: any) => (item.time * 1000) <= ts);
        if (kdjIdx !== -1) {
          const actualIdx = results.k.length - 1 - kdjIdx;
          states[tf] = {
            k: results.k[actualIdx].value,
            d: results.d[actualIdx].value,
            j: results.j[actualIdx].value,
          };
        } else {
          hasAllTFs = false;
        }
      });

      if (!hasAllTFs) continue;

      // Label with future return (10 mins later)
      // Look for a kline that is roughly 10 mins in the future
      const futureTime = kline.time + (10 * 60);
      const futureKline = oneMinKlines.find(k => k.time >= futureTime && k.time <= futureTime + 60);
      
      let futureReturn = undefined;
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

    this.history = snapshots;
  }

  public predict(currentData: Record<string, any>): PredictionResult {
    const defaultResult = { probability: 0.5, confidence: 0, similarCounts: 0, tfScores: {} };
    if (this.history.length === 0) return defaultResult;

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
        return defaultResult;
    }

    const currentVec = vectorize({ timestamp: Date.now(), price: 0, states: currentStates }, this.timeframes);

    // Find the single absolute most similar historical pattern
    const labeledHistory = this.history.filter(s => s.futureReturn !== undefined);
    if (labeledHistory.length === 0) return defaultResult;

    let topMatch = labeledHistory[0];
    let minScore = euclideanDistance(currentVec, vectorize(topMatch, this.timeframes));

    for (let i = 1; i < labeledHistory.length; i++) {
        const score = euclideanDistance(currentVec, vectorize(labeledHistory[i], this.timeframes));
        if (score < minScore) {
            minScore = score;
            topMatch = labeledHistory[i];
        }
    }

    // Calculate individual TF scores for the top match
    const tfScores: Record<string, number> = {};
    this.timeframes.forEach(tf => {
      const current = currentStates[tf];
      const historical = topMatch.states[tf];
      if (current && historical) {
        const dist = Math.sqrt(Math.pow(current.k - historical.k, 2) + Math.pow(current.d - historical.d, 2));
        // Normalize 0-30 distance to 0-1 score
        tfScores[tf] = Math.max(0, 1 - (dist / 30));
      } else {
        tfScores[tf] = 0;
      }
    });

    // Probability is binary based on the most similar pattern's outcome
    const probability = (topMatch.futureReturn || 0) > 0 ? 1 : 0;
    
    // Confidence is based on distance to the single top match
    const confidence = Math.max(0, 1 - (minScore / 60));

    return { probability, confidence, similarCounts: 1, tfScores };
  }
}
