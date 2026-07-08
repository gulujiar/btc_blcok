import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, BarChart2, Activity, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import CandleChart from './components/CandleChart';
import KDJBlockView from './components/KDJBlockView';
import { PredictionPanel } from './components/PredictionPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchKlines, Timeframe } from './services/binance';
import { Kline, calculateKDJ } from './lib/indicators';

export default function App() {
  const [data, setData] = useState<Kline[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'kline' | 'kdj' | 'blocks'>('blocks');
  const [showPrediction, setShowPrediction] = useState(true);
  const [allTimeframesData, setAllTimeframesData] = useState<Record<Timeframe, Kline[]>>({
    '1m': [],
    '5m': [],
    '15m': [],
    '30m': [],
    '1h': []
  });
  
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);

  // Calculate current KDJ for all timeframes for prediction
  const currentKDJAll = useMemo(() => {
    const results: Record<string, { k: number, d: number }> = {};
    (Object.entries(allTimeframesData) as [Timeframe, Kline[]][]).forEach(([tf, klines]) => {
      if (klines && klines.length >= 9) {
        const kdj = calculateKDJ(klines);
        if (kdj.k.length > 0) {
          results[tf] = {
            k: kdj.k[kdj.k.length - 1].value,
            d: kdj.d[kdj.d.length - 1].value
          };
        }
      }
    });
    return results;
  }, [allTimeframesData]);

  const togglePiP = useCallback(async () => {
    if (pipWindow) {
      pipWindow.close();
      return;
    }

    try {
      // Check if we are in an iframe
      if (window.self !== window.top) {
        alert('悬浮窗功能受预览环境限制，请点击右上角的“在新标签页打开”图标，在独立页面中开启。');
        return;
      }

      if (!('documentPictureInPicture' in window)) {
        alert('您的浏览器不支持悬浮小窗功能。请尝试使用最新版的 Edge 或 Chrome (116+)。');
        return;
      }

      // @ts-ignore
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 480,
      });

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules]
            .map((rule) => rule.cssText)
            .join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          if (styleSheet.href) {
            link.rel = 'stylesheet';
            link.type = styleSheet.type;
            link.href = styleSheet.href;
            pip.document.head.appendChild(link);
          }
        }
      });

      // Create container
      const container = pip.document.createElement('div');
      container.id = 'pip-root';
      pip.document.body.appendChild(container);
      pipContainerRef.current = container;

      pip.addEventListener('pagehide', () => {
        setPipWindow(null);
        pipContainerRef.current = null;
      });

      setPipWindow(pip);
    } catch (error) {
      console.error('PiP failed:', error);
      alert('开启悬浮窗失败。如果是由于预览环境限制，请点击右上角“在新标签页打开”后再试。');
    }
  }, [pipWindow]);

  const symbol = 'BTCUSDT';

  const fetchData = useCallback(async (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
    try {
      const klines = await fetchKlines(symbol, timeframe);
      setData(klines);
    } catch (error) {
      console.error('Error fetching klines:', error);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [symbol, timeframe]);

  const fetchAllData = useCallback(async (isPolling = false) => {
    if (!isPolling) setIsLoading(true);
    try {
      const tfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h'];
      const klineResults = await Promise.all(tfs.map(tf => fetchKlines(symbol, tf)));
      
      const newData = {
        '1m': klineResults[0] || [],
        '5m': klineResults[1] || [],
        '15m': klineResults[2] || [],
        '30m': klineResults[3] || [],
        '1h': klineResults[4] || []
      } as Record<Timeframe, Kline[]>;

      setAllTimeframesData(newData);
      
      // Specifically update current data if in blocks mode or if the current timeframe changed
      setData(newData[timeframe] || []);
    } catch (error) {
      console.error('Error fetching all timeframes:', error);
    } finally {
      if (!isPolling) setIsLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    // Initial fetch always gets everything to warm up PredictionPanel
    fetchAllData();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const priceChange = data.length > 1 ? currentPrice - data[data.length - 2].close : 0;
  const isPositive = priceChange >= 0;

  const kdjData = useMemo(() => {
    if (data.length === 0) return undefined;
    return calculateKDJ(data);
  }, [data]);

  return (
    <div className="h-screen bg-[#0d0d0d] text-[#e0e0e0] font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden">
      <header className="min-h-[4rem] py-2 md:py-0 border-b border-[#222] bg-[#111] sticky top-0 z-20 flex flex-wrap items-center justify-between px-4 md:px-6 gap-y-3">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold text-black shadow-lg shadow-orange-500/20 flex-shrink-0">₿</div>
            <div className="flex flex-col">
              <span className="text-sm md:text-lg font-semibold tracking-tight uppercase leading-none">{symbol.slice(0, 3)}/{symbol.slice(3)}</span>
              <span className="text-[9px] text-zinc-500 font-mono mt-0.5">实时数据</span>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase font-medium">价格</span>
              <span className={`text-xs md:text-sm font-mono ${isPositive ? 'text-[#00ff9d]' : 'text-[#ff4d4d]'}`}>
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase font-medium">涨跌</span>
              <span className={`text-xs md:text-sm font-mono ${isPositive ? 'text-[#00ff9d]' : 'text-[#ff4d4d]'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar max-w-full">
          <nav className="flex bg-[#1a1a1a] p-0.5 rounded-lg border border-[#333]">
            {(['1m', '5m', '15m', '30m', '1h'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 md:px-4 py-1 text-[10px] md:text-xs rounded transition-all font-medium ${
                  timeframe === tf
                    ? 'bg-[#333] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 md:gap-2">
            <button 
              onClick={() => fetchData()}
              className="p-1.5 rounded-lg border border-[#333] hover:bg-[#1a1a1a] transition-colors text-gray-500"
              title="刷新"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={togglePiP}
              className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                pipWindow ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-[#333] hover:bg-[#1a1a1a] text-gray-500'
              }`}
              title="开启悬浮窗"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold hidden lg:inline">小窗</span>
            </button>
          </div>

          <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#333] shadow-inner flex-shrink-0">
            <button
              onClick={() => setMode('kline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                mode === 'kline' ? 'bg-[#333] text-[#00ff9d] shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase hidden sm:inline">图表</span>
            </button>
            <button
              onClick={() => setMode('kdj')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                mode === 'kdj' ? 'bg-[#333] text-[#00ff9d] shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold uppercase hidden sm:inline">KDJ</span>
            </button>
            <button
              onClick={() => setMode('blocks')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                mode === 'blocks' ? 'bg-[#333] text-[#00ff9d] shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1 h-1 bg-current rounded-[0.5px]"></div>
                <div className="w-1 h-1 bg-current rounded-[0.5px]"></div>
                <div className="w-1 h-1 bg-current rounded-[0.5px]"></div>
                <div className="w-1 h-1 bg-current rounded-[0.5px]"></div>
              </div>
              <span className="text-[9px] font-bold uppercase hidden sm:inline">色块</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        <ErrorBoundary>
          <div className="flex-1 flex flex-col bg-[#0a0a0a] relative overflow-hidden">
            {mode === 'blocks' ? (
              pipWindow && pipContainerRef.current ? (
                <div className="flex-1 flex items-center justify-center text-zinc-600 flex-col gap-4">
                  <ExternalLink className="w-12 h-12 opacity-20" />
                  <div className="text-sm font-medium">监控已转至悬浮窗显示</div>
                  <button 
                    onClick={() => pipWindow.close()}
                    className="text-xs bg-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    回收窗口
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
                    <div className="sticky top-0 z-10 drop-shadow-xl flex-shrink-0">
                        <PredictionPanel 
                            allKlines={allTimeframesData} 
                            currentKDJ={currentKDJAll} 
                        />
                    </div>
                    <div className="flex-1">
                        <KDJBlockView data={allTimeframesData} isLoading={isLoading} />
                    </div>
                </div>
              )
            ) : (
              <div className="p-4 flex-1 flex flex-col gap-4 min-h-0">
                <div className="lg:hidden flex-shrink-0">
                    <PredictionPanel 
                        allKlines={allTimeframesData} 
                        currentKDJ={currentKDJAll} 
                    />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={mode} 
                  className="flex-1 min-h-0"
                >
                  <CandleChart 
                    data={data} 
                    isLoading={isLoading} 
                    mode={mode as any}
                    kdjData={kdjData}
                  />
                </motion.div>
              </div>
            )}
          </div>
          
          {mode !== 'blocks' && (
            <aside className="hidden lg:flex w-80 border-l border-[#222] bg-[#0d0d0d] p-4 flex-col gap-4 overflow-y-auto">
               <PredictionPanel 
                    allKlines={allTimeframesData} 
                    currentKDJ={currentKDJAll} 
                />
                
                <div className="bg-[#111] rounded-2xl p-4 border border-white/5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">多空博弈提示</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">当前主趋势</span>
                      <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '震荡上行' : '震荡下行'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">平均波动率</span>
                      <span className="text-xs text-zinc-200 font-mono">{(Math.abs(priceChange) / currentPrice * 100).toFixed(4)}%</span>
                    </div>
                  </div>
                </div>
            </aside>
          )}
        </ErrorBoundary>

        {pipWindow && pipContainerRef.current && createPortal(
          <div className="h-screen w-screen bg-[#0d0d0d] overflow-hidden flex flex-col">
            <PredictionPanel 
              allKlines={allTimeframesData} 
              currentKDJ={currentKDJAll} 
              isPiP 
            />
            <div className="flex-1 overflow-hidden">
              <KDJBlockView data={allTimeframesData} isLoading={isLoading} isPiP={true} />
            </div>
          </div>,
          pipContainerRef.current
        )}
      </main>

      <footer className="h-8 border-t border-[#222] bg-[#111] flex items-center justify-between px-4 text-[10px] text-gray-500 font-medium tracking-tight">
        <div className="flex items-center space-x-3 md:space-x-4">
          <span className="flex items-center space-x-1 flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${data.length > 0 ? 'bg-[#00ff9d]' : 'bg-orange-500 animate-pulse'}`}></span>
            <span className="hidden sm:inline">{data.length > 0 ? '连接稳定' : '正在连接'}</span>
          </span>
          <span className="opacity-70">行情激活</span>
        </div>
        <div className="flex space-x-3 md:space-x-4 uppercase tabular-nums">
           <span>UTC {new Date().getTimezoneOffset() <= 0 ? '+' : ''}{(new Date().getTimezoneOffset() / 60) * -1}:00</span>
           <span className="hidden sm:inline">{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </footer>
    </div>
  );
}

