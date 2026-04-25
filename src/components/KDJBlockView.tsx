import { useMemo } from 'react';
import { motion } from 'motion/react';
import { calculateKDJ, Kline } from '../lib/indicators';
import { Timeframe } from '../services/binance';

interface KDJBlockViewProps {
  data: Record<Timeframe, Kline[]>;
  isLoading: boolean;
  isPiP?: boolean;
}

export default function KDJBlockView({ data, isLoading, isPiP }: KDJBlockViewProps) {
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
        label = '趋势收敛';
        textColor = 'text-black';
      } else if (lastK > lastD) {
        color = 'bg-[#00ff9d]';
        label = '指标金叉';
        textColor = 'text-black';
      } else {
        color = 'bg-[#ff4d4d]';
        label = '指标死叉';
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
    <div className={`flex-1 grid h-full min-h-0 bg-[#0a0a0a] overflow-hidden ${
      isPiP 
        ? 'grid-cols-1 grid-rows-5' 
        : 'grid-cols-1 grid-rows-5 lg:grid-cols-5 lg:grid-rows-1'
    }`}>
      {results.map((res, i) => (
        <motion.div
          key={res.tf}
          initial={isPiP ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className={`relative flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-l border-white/5 first:border-0 transition-all duration-500 overflow-hidden ${
            res.status === 'ready' ? res.color : 'bg-[#111]'
          }`}
        >
          {res.status === 'loading' ? (
             <div className="flex flex-col items-center">
               <div className="w-8 h-8 lg:w-12 lg:h-12 border-2 lg:border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
             </div>
          ) : res.status === 'error' ? (
            <div className="text-xl lg:text-4xl font-black opacity-20">{res.tf}</div>
          ) : (
            <div className={`flex flex-row lg:flex-col items-center justify-between lg:justify-center w-full px-4 lg:px-0 ${res.textColor} transition-all duration-300`}>
              <div className="flex flex-col lg:items-center">
                <div className="text-xl sm:text-2xl lg:text-6xl font-black lg:mb-2 drop-shadow-sm tracking-tight leading-none pip-hide-text">{res.tf}</div>
                <div className="text-[8px] lg:text-xs font-bold uppercase tracking-[0.1em] opacity-70 mt-1 hidden sm:block">{res.label}</div>
              </div>
              
              <div className="flex gap-2 lg:gap-8 font-mono text-xs sm:text-sm lg:text-xl font-black bg-black/15 px-2 lg:px-10 py-1.5 lg:py-5 rounded-lg lg:rounded-2xl backdrop-blur-md border border-black/5 shadow-xl pip-hide-data">
                <div className="flex flex-col items-center min-w-[28px] lg:min-w-[60px]">
                  <span className="text-[6px] lg:text-[10px] uppercase opacity-40 mb-0.5 lg:mb-1 font-sans hidden sm:block">K</span>
                  <span className="tabular-nums">{res.k}</span>
                </div>
                <div className="w-px h-4 lg:h-10 bg-black/10 self-center"></div>
                <div className="flex flex-col items-center min-w-[28px] lg:min-w-[60px]">
                  <span className="text-[6px] lg:text-[10px] uppercase opacity-40 mb-0.5 lg:mb-1 font-sans hidden sm:block">D</span>
                  <span className="tabular-nums">{res.d}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className={`absolute top-2 left-3 text-[8px] font-black uppercase tracking-[0.25em] opacity-10 pointer-events-none hidden lg:block`}>
            KDJ 实时监控
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @media (max-height: 220px) or (max-width: 140px) {
              .pip-hide-data { display: none !important; }
            }
            @media (max-height: 100px) or (max-width: 80px) {
              .pip-hide-text { display: none !important; }
            }
          `}} />
        </motion.div>
      ))}
    </div>
  );
}
