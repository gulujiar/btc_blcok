import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { Kline } from '../lib/indicators';

interface CandleChartProps {
  data: Kline[];
  isLoading: boolean;
  mode: 'kline' | 'kdj';
  kdjData?: { k: LineData[]; d: LineData[]; j: LineData[] };
}

export default function CandleChart({ data, isLoading, mode, kdjData }: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const kSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const jSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#888',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      timeScale: {
        timeVisible: true,
        borderColor: '#222',
        barSpacing: 12, // Increased spacing
        rightOffset: 15,
        minBarSpacing: 5,
        shiftVisibleRangeOnNewBar: true,
      },
      rightPriceScale: {
        borderColor: '#222',
        autoScale: true,
        alignLabels: true,
      },
      crosshair: {
        vertLine: { color: '#444', labelBackgroundColor: '#222' },
        horzLine: { color: '#444', labelBackgroundColor: '#222' },
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00ff9d',
      downColor: '#ff4d4d',
      borderDownColor: '#ff4d4d',
      borderUpColor: '#00ff9d',
      wickDownColor: '#ff4d4d',
      wickUpColor: '#00ff9d',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    const kSeries = chart.addLineSeries({ color: '#fcd34d', lineWidth: 1, title: 'K' });
    const dSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'D' });
    const jSeries = chart.addLineSeries({ color: '#ec4899', lineWidth: 1, title: 'J' });
    
    kSeriesRef.current = kSeries;
    dSeriesRef.current = dSeries;
    jSeriesRef.current = jSeries;

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current?.clientWidth,
        height: chartContainerRef.current?.clientHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !kSeriesRef.current || !dSeriesRef.current || !jSeriesRef.current) return;

    // Toggle visibility
    const isKline = mode === 'kline';
    candleSeriesRef.current.applyOptions({ visible: isKline });
    volumeSeriesRef.current.applyOptions({ visible: isKline });
    kSeriesRef.current.applyOptions({ visible: !isKline });
    dSeriesRef.current.applyOptions({ visible: !isKline });
    jSeriesRef.current.applyOptions({ visible: !isKline });

    if (isKline) {
      const candles: CandlestickData[] = data.map(d => ({
        time: d.time as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      const volumes: HistogramData[] = data.map(d => ({
        time: d.time as any,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 71, 87, 0.3)',
      }));

      candleSeriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);
    } else if (kdjData) {
      kSeriesRef.current.setData(kdjData.k);
      dSeriesRef.current.setData(kdjData.d);
      jSeriesRef.current.setData(kdjData.j);
    }
    
    if (data.length > 0 && !isLoading) {
      const timeScale = chartRef.current?.timeScale();
      if (timeScale) {
        // If it's the first load or timeframe change, focus on the last 80 candles
        // This makes 1m/5m much more readable
        timeScale.setVisibleLogicalRange({
          from: data.length - 80,
          to: data.length + 5,
        });
      }
    }
  }, [data, isLoading, mode, kdjData]);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden border border-[#2d333b] bg-[#0c0e14]">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-zinc-400 font-medium">Loading Bitcoin Data...</span>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
