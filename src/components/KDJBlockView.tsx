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
      if (isLoading && (!klines || klines.length === 0)) return { tf, status: 'loading' };
      if (!klines || klines.length === 0) return { tf, status: 'error' };

      const kdj = calculateKDJ(klines);
      if (kdj.k.length === 0) return { tf, status: 'error' };

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
        textColor = 'text-black';
      } else if (lastK > lastD) {
        color = 'bg-[#00ff9d]';
        label = 'Golden Cross';
        textColor = 'text-black';
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
        k: isNaN(lastK) ? '--' : lastK.toFixed(2),
        d: isNaN(lastD) ? '--' : lastD.toFixed(2),
        status: 'ready'
      };
    });
  }, [data]);

  return (
    <div className="flex-1 grid grid-cols-1 grid-rows-5 lg:grid-cols-5 lg:grid-rows-1 h-full min-h-0 bg-[#0a0a0a]">
      {results.map((res, i) => (
        <motion.div
          key={res.tf}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`relative flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-l border-white/5 first:border-0 transition-all duration-700 ${
            res.status === 'ready' ? res.color : 'bg-[#111]'
          }`}
        >
          {res.status === 'loading' ? (
             <div className="flex flex-col items-center">
               <div className="w-12 h-12 border-4 border-[#00ff9d]/20 border-t-[#00ff9d] rounded-full animate-spin mb-4"></div>
               <div className="text-2xl font-bold text-white mb-1">{res.tf}</div>
               <div className="text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">Fetching Data</div>
             </div>
          ) : res.status === 'error' ? (
            <div className="flex flex-col items-center text-rose-400">
               <div className="text-4xl font-black mb-2 opacity-20">{res.tf}</div>
               <div className="text-[10px] font-bold uppercase tracking-widest">API Error</div>
            </div>
          ) : (
            <div className={`flex flex-row lg:flex-col items-center justify-between lg:justify-center w-full px-8 lg:px-0 ${res.textColor} transition-opacity duration-300`}>
              <div className="flex flex-col lg:items-center">
                <div className="text-3xl lg:text-6xl font-black lg:mb-2 drop-shadow-sm tracking-tight">{res.tf}</div>
                <div className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] opacity-70">{res.label}</div>
              </div>
              
              <div className="flex gap-3 lg:gap-8 font-mono text-base lg:text-xl font-black bg-black/15 px-4 lg:px-10 py-2.5 lg:py-5 rounded-lg lg:rounded-2xl backdrop-blur-md border border-black/5 shadow-xl">
                <div className="flex flex-col items-center min-w-[40px] lg:min-w-[60px]">
                  <span className="text-[8px] lg:text-[10px] uppercase opacity-40 mb-0.5 lg:mb-1 font-sans">K</span>
                  <span className="tabular-nums">{res.k}</span>
                </div>
                <div className="w-px h-6 lg:h-10 bg-black/10 self-center"></div>
                <div className="flex flex-col items-center min-w-[40px] lg:min-w-[60px]">
                  <span className="text-[8px] lg:text-[10px] uppercase opacity-40 mb-0.5 lg:mb-1 font-sans">D</span>
                  <span className="tabular-nums">{res.d}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className={`absolute top-4 left-6 text-[10px] font-black uppercase tracking-[0.25em] opacity-20 ${res.textColor || 'text-white'}`}>
            KDJ Monitoring
          </div>
        </motion.div>
      ))}
    </div>
  );
}
