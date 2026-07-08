
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Info, ShieldCheck, Zap } from 'lucide-react';
import { PatternMatcher } from '../lib/prediction';
import { Kline, calculateKDJ } from '../lib/indicators';
import { getVolumeAdvice } from '../lib/volumeAdvice';

interface PredictionPanelProps {
  allKlines: Record<string, Kline[]>;
  currentKDJ: Record<string, { k: number, d: number }>;
  isPiP?: boolean;
}

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ allKlines, currentKDJ, isPiP }) => {
  const matcher = useMemo(() => {
    if (Object.keys(allKlines).length < 5) return null;
    return new PatternMatcher(allKlines);
  }, [allKlines]);

  const result = useMemo(() => {
    if (!matcher || Object.keys(currentKDJ).length < 5) return null;
    return matcher.predict(currentKDJ);
  }, [matcher, currentKDJ]);

  const volAdvice = useMemo(() => {
    const klines = allKlines['1m'] || [];
    if (klines.length === 0) return null;
    
    // Calculate KDJ for the 1m timeframe for volume advice
    const kdj = calculateKDJ(klines);
    
    return getVolumeAdvice(klines, kdj);
  }, [allKlines]);

  if (!result || result.confidence === 0) {
    return (
      <div className={`bg-[#111] border border-white/5 rounded-2xl flex items-center justify-center ${isPiP ? 'h-12' : 'h-24 p-4'}`}>
        <div className="flex flex-col items-center gap-1 opacity-30">
          <Info className={isPiP ? "w-3 h-3" : "w-5 h-5"} />
          <span className={`${isPiP ? 'text-[6px]' : 'text-[10px]'} font-bold uppercase tracking-widest text-center`}>预热中...</span>
        </div>
      </div>
    );
  }

  const isUp = result.probability > 0.5;
  const confidencePercent = Math.round(result.confidence * 100);

  if (isPiP) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`relative overflow-hidden bg-black/40 border-b border-white/10 p-2 flex flex-col gap-2`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center p-1 rounded-md ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-black ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                PREDICT: {isUp ? 'UP' : 'DOWN'}
              </span>
              <span className="text-[7px] text-white/30 font-mono">MATCH: {confidencePercent}%</span>
            </div>
          </div>
          
          <div className="flex-1 max-w-[100px] h-1 bg-white/5 rounded-full overflow-hidden self-center">
            <div 
              style={{ width: `${confidencePercent}%` }}
              className={`h-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
          </div>
        </div>

        {volAdvice && (
          <div className="flex items-center gap-2 px-1 py-0.5 rounded bg-white/5 border border-white/5">
            <Zap className={`w-3 h-3 ${volAdvice.type === 'bullish' ? 'text-emerald-400' : volAdvice.type === 'bearish' ? 'text-rose-400' : 'text-amber-400'}`} />
            <span className="text-[8px] font-black text-white/60 uppercase">{volAdvice.label}</span>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1 pt-1 border-t border-white/5">
          {['1m', '5m', '15m', '30m', '1h'].map((tf) => {
            const score = result.tfScores[tf] || 0;
            return (
              <div key={tf} className="flex flex-col gap-0.5">
                <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${score * 100}%` }}
                    className={`h-full ${isUp ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}
                  />
                </div>
                <span className="text-[5px] text-center opacity-30 text-white font-mono">{tf}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-[#161616] to-[#0a0a0a] border border-white/10 rounded-2xl p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-2 lg:mb-4">
        <div className="flex items-center gap-1 lg:gap-2">
          <div className={`p-1 lg:p-1.5 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            <ShieldCheck className="w-3 h-3 lg:w-4 lg:h-4" />
          </div>
          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.1em] lg:tracking-[0.2em] text-white/40">最优历史镜像模式 (12H)</span>
        </div>
        <div className="flex items-center gap-1 bg-white/5 px-1.5 lg:px-2 py-0.5 rounded-full border border-white/5">
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[7px] lg:text-[8px] font-mono text-white/30">MATCH FOUND</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 lg:gap-6">
        <div className="flex-1">
          <div className="flex items-baseline gap-1 lg:gap-2 mb-1">
            <span className={`text-2xl sm:text-3xl lg:text-5xl font-black ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? '看涨' : '看跌'}
            </span>
            <span className="text-[8px] lg:text-sm font-bold uppercase text-white/30">
              预期方向
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 lg:gap-2">
          <div className={`flex items-center gap-1 p-1.5 lg:p-2 rounded-lg lg:rounded-xl border border-white/5 bg-white/5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-4 h-4 lg:w-6 lg:h-6" /> : <TrendingDown className="w-4 h-4 lg:w-6 lg:h-6" />}
          </div>
          <div className="text-right">
            <div className="text-[8px] lg:text-[10px] font-bold text-white/30 uppercase">拟合精度</div>
            <div className="text-xs lg:text-sm font-mono font-bold text-white/60">{confidencePercent}%</div>
          </div>
        </div>
      </div>

      {volAdvice && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`mt-4 p-4 rounded-xl border flex items-start gap-4 transition-colors ${
            volAdvice.type === 'bullish' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
            volAdvice.type === 'bearish' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
            volAdvice.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
          }`}
        >
          <div className={`p-2 rounded-lg ${
            volAdvice.type === 'bullish' ? 'bg-emerald-500/20' : 
            volAdvice.type === 'bearish' ? 'bg-rose-500/20' : 
            volAdvice.type === 'warning' ? 'bg-amber-500/20' :
            'bg-zinc-500/20'
          }`}>
            <Zap className="w-5 h-5 shrink-0" />
          </div>
          
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider">{volAdvice.label}</span>
              {volAdvice.comboSignal && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[7px] font-black uppercase tracking-tighter border border-white/5 opacity-60">
                  Combo Logic
                </span>
              )}
            </div>

            {volAdvice.suggestion && (
              <div className="flex items-center">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  volAdvice.type === 'bullish' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 
                  volAdvice.type === 'bearish' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 
                  volAdvice.type === 'warning' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
                  'bg-zinc-500/20 border-zinc-500/30 text-zinc-300'
                }`}>
                  {volAdvice.suggestion}
                </span>
              </div>
            )}

            <p className="text-[10px] opacity-70 font-medium leading-relaxed mt-0.5 italic">
              {volAdvice.description}
            </p>
          </div>
        </motion.div>
      )}

      <div className="mt-2 lg:mt-4 pt-2 lg:pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-4 lg:gap-6">
        <div className="flex-1">
          <div className="text-[7px] lg:text-[8px] uppercase text-white/20 font-bold mb-2">多周期拟合评分 (1m - 1h)</div>
          <div className="grid grid-cols-5 gap-1.5">
            {['1m', '5m', '15m', '30m', '1h'].map((tf) => {
              const score = result.tfScores[tf] || 0;
              return (
                <div key={tf} className="flex flex-col gap-1">
                  <div className="h-1 lg:h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${score * 100}%` }}
                      className={`h-full ${isUp ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`}
                    />
                  </div>
                  <span className="text-[6px] lg:text-[7px] text-center opacity-30 text-white font-mono">{tf}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[8px] lg:text-[9px] text-white/20 italic max-w-full sm:max-w-[140px] leading-tight">
          深度神经网络模式识别：正在对五个核心周期进行多维拟合计算
        </p>
      </div>
    </motion.div>
  );
};
