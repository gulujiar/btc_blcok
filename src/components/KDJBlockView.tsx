import { useMemo } from 'react';
import { motion } from 'motion/react';
import { calculateKDJ, Kline } from '../lib/indicators';
import { Timeframe } from '../services/binance';

interface KDJBlockViewProps {
  data: Record<Timeframe, Kline[]>;
  isLoading: boolean;
}

export default function KDJBlockView({ data, isLoading }: KDJBlockViewProps) {
  const tfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h'];

  const results = useMemo(() => {
    return tfs.map(tf => {
      const klines = data[tf];
      if (!klines || klines.length === 0) return { tf, status: 'loading' };

      const kdj = calculateKDJ(klines);
      if (kdj.k.length === 0) return { tf, status: 'loading' };

      const lastK = kdj.k[kdj.k.length - 1].value;
      const lastD = kdj.d[kdj.d.length - 1].value;

      // Color logic:
      // Green: K > D (Golden Cross)
      // Red: K < D (Dead Cross)
      // Yellow: Convergence (abs(K-D) < threshold)
      const diff = Math.abs(lastK - lastD);
      const threshold = 0.8; 

      let color = '';
      let label = '';
      let textColor = 'text-black';

      if (diff < threshold) {
        color = 'bg-yellow-400';
        label = 'Convergence';
      } else if (lastK > lastD) {
        color = 'bg-[#00ff9d]';
        label = 'Golden Cross';
      } else {
        color = 'bg-[#ff4d4d]';
        label = 'Dead Cross';
        textColor = 'text-white';
      }

      return {
        tf,
        color,
        label,
        textColor,
        k: lastK.toFixed(2),
        d: lastD.toFixed(2),
        status: 'ready'
      };
    });
  }, [data]);

  return (
    <div className="flex-1 grid grid-cols-1 grid-rows-5 lg:grid-cols-5 lg:grid-rows-1 h-full min-h-0">
      {results.map((res, i) => (
        <motion.div
          key={res.tf}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`relative flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-l border-black/10 first:border-0 transition-colors duration-500 ${
            res.status === 'ready' ? res.color : 'bg-zinc-900'
          }`}
        >
          {res.status === 'loading' || isLoading ? (
             <div className="animate-pulse flex flex-col items-center">
               <div className="text-4xl font-bold text-white/20 mb-2">{res.tf}</div>
               <div className="text-xs text-white/10 uppercase tracking-widest">Loading...</div>
             </div>
          ) : (
            <div className={`flex flex-col items-center ${res.textColor}`}>
              <div className="text-6xl font-black mb-4 drop-shadow-sm">{res.tf}</div>
              <div className="text-sm font-bold uppercase tracking-widest mb-8 opacity-80">{res.label}</div>
              <div className="flex gap-8 font-mono text-xl font-bold bg-black/10 px-8 py-4 rounded-2xl backdrop-blur-sm border border-black/5 shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase opacity-50 mb-1">K</span>
                  <span>{res.k}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase opacity-50 mb-1">D</span>
                  <span>{res.d}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className={`absolute top-4 left-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 ${res.textColor || 'text-white'}`}>
            KDJ Monitor
          </div>
        </motion.div>
      ))}
    </div>
  );
}
