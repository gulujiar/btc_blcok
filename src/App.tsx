import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, BarChart2, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import CandleChart from './components/CandleChart';
import KDJBlockView from './components/KDJBlockView';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchKlines, Timeframe } from './services/binance';
import { Kline, calculateKDJ } from './lib/indicators';

export default function App() {
  const [data, setData] = useState<Kline[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'kline' | 'kdj' | 'blocks'>('blocks');
  const [allTimeframesData, setAllTimeframesData] = useState<Record<Timeframe, Kline[]>>({
    '1m': [],
    '5m': [],
    '15m': [],
    '30m': [],
    '1h': []
  });
  
  const symbol = 'BTCUSDT';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const klines = await fetchKlines(symbol, timeframe);
      setData(klines);
    } catch (error) {
      console.error('Error fetching klines:', error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const tfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h'];
      const results = await Promise.all(tfs.map(tf => fetchKlines(symbol, tf)));
      
      const newData = {
        '1m': results[0] || [],
        '5m': results[1] || [],
        '15m': results[2] || [],
        '30m': results[3] || [],
        '1h': results[4] || []
      } as Record<Timeframe, Kline[]>;

      setAllTimeframesData(newData);
      
      // Specifically update current data if in blocks mode to ensure chart/indicator logic has latest
      if (mode === 'blocks') {
        setData(newData[timeframe] || []);
      }
    } catch (error) {
      console.error('Error fetching all timeframes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, mode]);

  useEffect(() => {
    const isBlocks = mode === 'blocks';
    const fetchFunc = isBlocks ? fetchAllData : fetchData;
    
    fetchFunc();
    const interval = setInterval(fetchFunc, 10000);
    
    return () => clearInterval(interval);
  }, [fetchAllData, fetchData, mode]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const priceChange = data.length > 1 ? currentPrice - data[data.length - 2].close : 0;
  const isPositive = priceChange >= 0;

  const kdjData = useMemo(() => {
    if (data.length === 0) return undefined;
    return calculateKDJ(data);
  }, [data]);

  return (
    <div className="h-screen bg-[#0d0d0d] text-[#e0e0e0] font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden">
      <header className="h-16 border-b border-[#222] bg-[#111] sticky top-0 z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center font-bold text-black shadow-lg shadow-orange-500/20">₿</div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight uppercase leading-none">{symbol.slice(0, 3)} / {symbol.slice(3)}</span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">实时数据</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-medium">最新价格</span>
              <span className={`text-sm font-mono ${isPositive ? 'text-[#00ff9d]' : 'text-[#ff4d4d]'}`}>
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase font-medium">涨跌</span>
              <span className={`text-sm font-mono ${isPositive ? 'text-[#00ff9d]' : 'text-[#ff4d4d]'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex bg-[#1a1a1a] p-1 rounded-lg border border-[#333]">
            {(['1m', '5m', '15m', '30m', '1h'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-1 text-xs rounded transition-all font-medium ${
                  timeframe === tf
                    ? 'bg-[#333] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </nav>

          <button 
            onClick={fetchData}
            className="p-1.5 rounded-lg border border-[#333] hover:bg-[#1a1a1a] transition-colors text-gray-500 mr-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-[#333] shadow-inner">
            <button
              onClick={() => setMode('kline')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                mode === 'kline' ? 'bg-[#333] text-[#00ff9d] shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">图表</span>
            </button>
            <button
              onClick={() => setMode('kdj')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                mode === 'kdj' ? 'bg-[#333] text-[#00ff9d] shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase">KDJ</span>
            </button>
            <button
              onClick={() => setMode('blocks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                mode === 'blocks' ? 'bg-[#333] text-[#00ff9d] shadow-sm' : 'text-gray-500 hover:text-white'
              }`}
            >
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-current rounded-[1px]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-[1px]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-[1px]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-[1px]"></div>
              </div>
              <span className="text-[10px] font-bold uppercase">色块</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <ErrorBoundary>
          <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
            {mode === 'blocks' ? (
              <KDJBlockView data={allTimeframesData} isLoading={isLoading} />
            ) : (
              <div className="p-4 flex-1 flex flex-col">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={mode} // Trigger animation on mode change
                  className="flex-1 min-h-0"
                >
                  <CandleChart 
                    data={data} 
                    isLoading={isLoading} 
                    mode={mode}
                    kdjData={kdjData}
                  />
                </motion.div>
              </div>
            )}
          </div>
        </ErrorBoundary>
      </main>

      <footer className="h-8 border-t border-[#222] bg-[#111] flex items-center justify-between px-4 text-[10px] text-gray-500 font-medium tracking-tight">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d]"></span>
            <span>连接稳定</span>
          </span>
          <span>币安 API: 已激活</span>
        </div>
        <div className="flex space-x-4 uppercase">
           <span>UTC {new Date().getHours() >= 12 ? '+' : '-'}{(new Date().getTimezoneOffset() / 60) * -1}:00</span>
           <span>{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </footer>
    </div>
  );
}

