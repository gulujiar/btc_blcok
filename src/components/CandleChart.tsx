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
  const volMa5Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const volMa10Ref = useRef<ISeriesApi<'Line'> | null>(null);
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
    
    const volMa5 = chart.addLineSeries({
      color: '#fcd34d',
      lineWidth: 1,
      priceScaleId: 'volume',
      title: 'VOL MA5',
    });
    volMa5Ref.current = volMa5;

    const volMa10 = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceScaleId: 'volume',
      title: 'VOL MA10',
    });
    volMa10Ref.current = volMa10;

    const kSeries = chart.addLineSeries({ color: '#fcd34d', lineWidth: 1, title: 'K' });
    const dSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'D' });
    const jSeries = chart.addLineSeries({ color: '#ec4899', lineWidth: 1, title: 'J' });

    kSeriesRef.current = kSeries;
    dSeriesRef.current = dSeries;
    jSeriesRef.current = jSeries;

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !volMa5Ref.current || !volMa10Ref.current || !kSeriesRef.current || !dSeriesRef.current || !jSeriesRef.current) return;

    // Toggle visibility
    const isKline = mode === 'kline';
    const isKDJ = mode === 'kdj';

    // Candle series is visible in both modes
    candleSeriesRef.current.applyOptions({ visible: true });
    
    // Volume is only for kline
    volumeSeriesRef.current.applyOptions({ visible: isKline });
    volMa5Ref.current.applyOptions({ visible: isKline });
    volMa10Ref.current.applyOptions({ visible: isKline });
    
    // KDJ series
    kSeriesRef.current.applyOptions({ visible: isKDJ });
    dSeriesRef.current.applyOptions({ visible: isKDJ });
    jSeriesRef.current.applyOptions({ visible: isKDJ });

    if (isKline || isKDJ) {
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

      // Calculate Volume MAs
      const ma5: LineData[] = [];
      const ma10: LineData[] = [];

      for (let i = 0; i < data.length; i++) {
        // MA5
        if (i >= 4) {
          let sum = 0;
          for (let j = 0; j < 5; j++) sum += data[i - j].volume;
          ma5.push({ time: data[i].time as any, value: sum / 5 });
        }
        // MA10
        if (i >= 9) {
          let sum = 0;
          for (let j = 0; j < 10; j++) sum += data[i - j].volume;
          ma10.push({ time: data[i].time as any, value: sum / 10 });
        }
      }

      candleSeriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);
      volMa5Ref.current.setData(ma5);
      volMa10Ref.current.setData(ma10);
    } else if (kdjData) {
      kSeriesRef.current.setData(kdjData.k);
      dSeriesRef.current.setData(kdjData.d);
      jSeriesRef.current.setData(kdjData.j);
    }
    
    if (data.length > 0 && !isLoading) {
      const timeScale = chartRef.current?.timeScale();
      if (timeScale) {
        // Calculate appropriate bar count based on width
        const width = chartContainerRef.current?.clientWidth || 800;
        const visibleBars = Math.floor(width / 10); // Standard density: 1 bar every 10px
        
        // Use requestAnimationFrame to ensure the chart has finished internal layout
        requestAnimationFrame(() => {
          timeScale.setVisibleLogicalRange({
            from: data.length - Math.min(data.length, visibleBars),
            to: data.length + 2,
          });
        });
      }
    }
  }, [data, isLoading, mode, kdjData]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[#2d333b] bg-[#0c0e14]">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-zinc-400 font-medium">正在加载比特币数据...</span>
          </div>
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
