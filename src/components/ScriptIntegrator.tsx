import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Code, X, Check, Loader2, Info, AlertTriangle, Terminal } from 'lucide-react';
import { CustomIndicator } from '../lib/indicators';

interface ScriptIntegratorProps {
  onAddScript: (script: CustomIndicator) => void;
  activeScripts: CustomIndicator[];
  onToggleScript: (id: string) => void;
  onRemoveScript: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ScriptIntegrator: React.FC<ScriptIntegratorProps> = ({ 
  onAddScript, 
  activeScripts, 
  onToggleScript, 
  onRemoveScript,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'import' | 'installed'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [pineCode, setPineCode] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularScripts = [
    { name: 'RSI Divergence', desc: 'Auto-detects bullish/bearish divergences.' },
    { name: 'MACD Leader', desc: 'Anticipates MACD crossovers using momentum.' },
    { name: 'Fibonacci Levels', desc: 'Draws auto-anchored fib levels.' },
    { name: 'Volume Profile', desc: 'Visible range volume analysis.' },
  ];

  const handleConvert = async () => {
    if (!pineCode.trim()) return;
    
    setIsConverting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/convert-pine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pineCode })
      });
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      
      const newScript: CustomIndicator = {
        id: Math.random().toString(36).substr(2, 9),
        name: result.indicatorName,
        description: result.description,
        logic: result.logic,
        visualConfig: result.visualConfig,
        isActive: true
      };
      
      onAddScript(newScript);
      setActiveTab('installed');
      setPineCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to convert script');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-10 bottom-10 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:h-[700px] bg-[#111] border border-white/10 rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                  Pine 脚本中心
                </h2>
                <p className="text-xs text-white/40 mt-1">搜索、导入并安装 TradingView 社区脚本</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-white/5">
              {[
                { id: 'search', label: '搜索社区', icon: Search },
                { id: 'import', label: '导入代码', icon: Code },
                { id: 'installed', label: '已安装', icon: Check },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-all relative ${
                    activeTab === tab.id ? 'text-emerald-500' : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'search' && (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input 
                      type="text"
                      placeholder="搜索指标、策略或作者..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">推荐脚本</p>
                    {popularScripts.map(script => (
                      <div key={script.name} className="group p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{script.name}</h4>
                          <p className="text-xs text-white/40">{script.desc}</p>
                        </div>
                        <button className="p-2 bg-white/5 rounded-xl hover:bg-emerald-500 hover:text-black transition-all">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-start gap-4">
                    <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-400">找不到想要的？</p>
                      <p className="text-xs text-white/40 leading-relaxed">
                        由于 API 限制，目前仅支持热门脚本。您可以点击 “导入代码” 手动粘贴任何 Pine Script 源码，AI 将为您自动转换。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'import' && (
                <div className="space-y-4 h-full flex flex-col">
                  <div className="flex-1 relative min-h-[300px]">
                    <textarea 
                      placeholder="在这里粘贴 Pine Script v4/v5 代码..."
                      value={pineCode}
                      onChange={(e) => setPineCode(e.target.value)}
                      className="w-full h-full bg-[#050505] border border-white/10 rounded-2xl p-4 text-xs font-mono text-emerald-500/80 focus:outline-none focus:border-emerald-500/50 resize-none transition-all"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-50">
                      <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider">Pine v5</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs animate-shake">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button 
                    onClick={handleConvert}
                    disabled={isConverting || !pineCode.trim()}
                    className="w-full py-4 bg-emerald-500 disabled:bg-white/10 disabled:text-white/20 text-black font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        AI 正在解析转换中...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        安装并应用到图表
                      </>
                    )}
                  </button>
                </div>
              )}

              {activeTab === 'installed' && (
                <div className="space-y-4">
                  {activeScripts.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto">
                        <Terminal className="w-8 h-8 text-white/10" />
                      </div>
                      <p className="text-sm text-white/20">暂未安装任何自定义脚本</p>
                    </div>
                  ) : (
                    activeScripts.map(script => (
                      <div key={script.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${script.isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                          <div>
                            <h4 className="font-bold text-white text-sm">{script.name}</h4>
                            <p className="text-[10px] text-white/40">{script.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onToggleScript(script.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              script.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {script.isActive ? '已启用' : '已停用'}
                          </button>
                          <button 
                            onClick={() => onRemoveScript(script.id)}
                            className="p-2 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-white/20 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
