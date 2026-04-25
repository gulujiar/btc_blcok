import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, BarChart2, Activity, ExternalLink } from 'lucide-react';
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
  
  const [isPipActive, setIsPipActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Function to draw the blocks to canvas for Video PiP
  const drawToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 400;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    const tfs: Timeframe[] = ['1m', '5m', '15m', '30m', '1h'];
    const blockHeight = height / tfs.length;

    tfs.forEach((tf, i) => {
      const klines = allTimeframesData[tf];
      if (!klines || klines.length < 3) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, i * blockHeight, width, blockHeight);
        return;
      }

      const kdj = calculateKDJ(klines);
      const last = kdj[kdj.length - 1];
      const lastK = parseFloat(last.k.toFixed(2));
      const lastD = parseFloat(last.d.toFixed(2));
      const diff = Math.abs(lastK - lastD);
      const threshold = 1.5;

      let color = '#111';
      let label = '';
      let textColor = '#fff';

      if (diff < threshold) {
        color = '#facc15'; // yellow-400
        label = '趋势收敛';
        textColor = '#000';
      } else if (lastK > lastD) {
        color = '#00ff9d'; // emerald
        label = '指标金叉';
        textColor = '#000';
      } else {
        color = '#ff4d4d'; // rose
        label = '指标死叉';
        textColor = '#fff';
      }

      ctx.fillStyle = color;
      ctx.fillRect(0, i * blockHeight, width, blockHeight);

      // Draw text with responsiveness built into the draw call (mocking CSS media queries)
      // Base on typical PiP size, though Video PiP scales the image automatically.
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      
      // We draw at a high res and let the video PiP scale down
      ctx.font = 'bold 80px Inter, sans-serif';
      ctx.fillText(tf, width / 2, i * blockHeight + blockHeight / 2);
      
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.globalAlpha = 0.7;
      ctx.fillText(label, width / 2, i * blockHeight + blockHeight / 2 + 50);
      ctx.globalAlpha = 1.0;

      // Data pill
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`K: ${lastK}  D: ${lastD}`, width / 2, i * blockHeight + blockHeight - 30);
    });

    requestRef.current = requestAnimationFrame(drawToCanvas);
  }, [allTimeframesData]);

  const togglePiP = useCallback(async () => {
    if (isPipActive) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      return;
    }

    try {
      if (window.self !== window.top) {
        alert('悬浮窗功能受预览环境限制，请点击右上角的“在新标签页打开”图标，在独立页面中开启。');
        return;
      }

      if (!canvasRef.current) {
        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }

      if (!videoRef.current) {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        videoRef.current = video;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Start drawing
      drawToCanvas();

      const stream = canvas.captureStream(10); // 10 FPS is enough for KDJ
      video.srcObject = stream;
      
      await video.play();
      await video.requestPictureInPicture();

      video.addEventListener('leavepictureinpicture', () => {
        setIsPipActive(false);
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
      });

      setIsPipActive(true);
    } catch (error) {
      console.error('PiP failed:', error);
      alert('开启悬浮窗失败。如果是由于预览环境限制，请点击右上角“在新标签页打开”后再试。');
    }
  }, [isPipActive, drawToCanvas]);

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
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={togglePiP}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-2 mr-2 ${
              isPipActive ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-[#333] hover:bg-[#1a1a1a] text-gray-500'
            }`}
            title="开启画中画 (真·无边框)"
          >
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold hidden sm:inline">真·小窗监控</span>
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
            <span className={`w-1.5 h-1.5 rounded-full ${data.length > 0 ? 'bg-[#00ff9d]' : 'bg-orange-500 animate-pulse'}`}></span>
            <span>{data.length > 0 ? '连接稳定' : '正在连接'}</span>
          </span>
          <span>实时行情: 已激活</span>
        </div>
        <div className="flex space-x-4 uppercase">
           <span>UTC {new Date().getHours() >= 12 ? '+' : '-'}{(new Date().getTimezoneOffset() / 60) * -1}:00</span>
           <span>{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </footer>
    </div>
  );
}

