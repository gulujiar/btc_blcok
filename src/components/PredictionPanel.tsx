
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Info, ShieldCheck } from 'lucide-react';
import { PatternMatcher } from '../lib/prediction';
import { Kline } from '../lib/indicators';

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
  const probPercent = Math.round(result.probability * 100);
  const confidencePercent = Math.round(result.confidence * 100);

  if (isPiP) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`relative overflow-hidden bg-black/40 border-b border-white/10 p-2 flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center p-1 rounded-md ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
          <div className="flex flex-col">
            <span className={`text-xs font-black ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              PREDICT: {isUp ? 'UP' : 'DOWN'}
            </span>
            <div className="flex items-center gap-1">
               <span className="text-[7px] text-white/30 font-mono">MATCH: {confidencePercent}%</span>
            </div>
          </div>
        </div>
        
        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            style={{ width: `${confidencePercent}%` }}
            className={`h-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
          />
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">最优历史镜像模式 (12H)</span>
        </div>
        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[8px] font-mono text-white/30">MATCH FOUND</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-4xl lg:text-5xl font-black ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? '看涨' : '看跌'}
            </span>
            <span className="text-sm font-bold uppercase text-white/30">
              预期方向
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercent}%` }}
              className={`h-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}
            />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={`flex items-center gap-1 p-2 rounded-xl border border-white/5 bg-white/5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-white/30 uppercase">匹配度</div>
            <div className="text-sm font-mono font-bold text-white/60">{confidencePercent}%</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex gap-4">
        <div className="flex-1">
          <div className="text-[8px] uppercase text-white/20 font-bold mb-1">多周期重合评分</div>
          <div className="grid grid-cols-5 gap-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`h-1 rounded-full ${i <= (confidencePercent / 20) ? (isUp ? 'bg-emerald-500/50' : 'bg-rose-500/50') : 'bg-white/5'}`} />
            ))}
          </div>
        </div>
        <p className="text-[9px] text-white/20 italic max-w-[120px] leading-tight">
          已在过去12小时记录中找寻到形态最匹配的单一时刻，图示其后续10分钟表现
        </p>
      </div>
    </motion.div>
  );
};
