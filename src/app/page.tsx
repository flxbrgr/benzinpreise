"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Fuel, 
  Info, 
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PriceData {
  timestamp: string;
  futures: {
    brent: number;
    wti: number;
    currency: string;
  };
  analysis: {
    model: string;
    recommendation: string;
    trend: string;
    target_market: string;
  };
}

export default function Home() {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/index")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch price data:", err);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (trend: string) => {
    switch (trend) {
      case "increasing_soon": return "from-red-500 to-orange-500";
      case "decreasing": return "from-emerald-500 to-teal-500";
      case "peaking": return "from-amber-400 to-orange-400";
      case "low": return "from-blue-500 to-indigo-500";
      default: return "from-zinc-500 to-slate-500";
    }
  };

  const getStatusIcon = (trend: string) => {
    switch (trend) {
      case "increasing_soon": return <TrendingUp className="w-6 h-6 text-white" />;
      case "decreasing": return <TrendingDown className="w-6 h-6 text-white" />;
      case "peaking": return <AlertTriangle className="w-6 h-6 text-white" />;
      case "low": return <CheckCircle2 className="w-6 h-6 text-white" />;
      default: return <Clock className="w-6 h-6 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
              FuelPulse
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Analyzer</a>
            <a href="#" className="hover:text-white transition-colors">Markets</a>
            <a href="#" className="hover:text-white transition-colors">History</a>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-xs text-zinc-500 tabular-nums">
              Refreshed: {data ? new Date(data.timestamp).toLocaleTimeString() : '...'}
            </div>
            <button className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Prediction Card */}
          <section className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-3xl overflow-hidden relative"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-2">
                  <span className="text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full text-xs uppercase tracking-widest">
                    Prediction Engine 2.0
                  </span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Should I Refuel?
                  </h2>
                </div>
                {data && (
                  <div className={cn(
                    "p-4 rounded-2xl bg-gradient-to-tr shadow-2xl",
                    getStatusColor(data.analysis.trend)
                  )}>
                    {getStatusIcon(data.analysis.trend)}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={data?.analysis.trend}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-12 space-y-8 relative z-10"
                  >
                    <div className="p-6 rounded-2xl bg-white/[0.05] border border-white/10">
                      <p className="text-2xl font-medium leading-relaxed bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        {data?.analysis.recommendation}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-zinc-500 text-xs font-medium uppercase">Brent Oil</span>
                        <div className="text-lg font-bold">${data?.futures.brent}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-zinc-500 text-xs font-medium uppercase">WTI Crude</span>
                        <div className="text-lg font-bold">${data?.futures.wti}</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-zinc-500 text-xs font-medium uppercase">Market Model</span>
                        <div className="text-xs font-bold text-emerald-400">Austrian (1-Hike)</div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <span className="text-zinc-500 text-xs font-medium uppercase">Volatilty</span>
                        <div className="text-xs font-bold text-amber-500">Low/Stable</div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Decorative Gradient Line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            </motion.div>

            {/* Price Trend Visualization */}
            <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  Intra-day Forecast (Germany)
                </h3>
                <div className="flex bg-white/5 rounded-lg p-1 text-xs">
                  <button className="px-3 py-1 bg-white/10 rounded-md">24h</button>
                  <button className="px-3 py-1 text-zinc-500 hover:text-white transition-colors">7d</button>
                </div>
              </div>
              
              {/* Dummy SVG Chart for Aesthetics */}
              <div className="h-48 w-full relative group">
                <svg viewBox="0 0 1000 200" className="w-full h-full stroke-emerald-500/40 fill-emerald-500/5" preserveAspectRatio="none">
                  <path d="M0,50 L100,60 L200,45 L300,55 L400,20 L500,20 L600,80 L700,100 L800,120 L900,110 L1000,130 L1000,200 L0,200 Z" strokeWidth="2" />
                  <path d="M0,50 L100,60 L200,45 L300,55 L400,20 L500,20 L600,80 L700,100 L800,120 L900,110 L1000,130" strokeWidth="4" strokeLinecap="round" className="stroke-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <circle cx="500" cy="20" r="4" className="fill-white" />
                </svg>
                <div className="absolute top-2 left-[50%] scale-0 group-hover:scale-100 transition-transform origin-bottom bg-emerald-500 text-white text-[10px] px-2 py-1 rounded shadow-xl -translate-x-1/2">
                   12:00 PM Daily Hike
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-zinc-600 font-medium px-2 py-2">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span className="text-emerald-500/80">12:00 (Hike)</span>
                  <span>18:00</span>
                  <span>23:59</span>
                </div>
              </div>
            </div>
          </section>

          {/* Market Insights Sidebar */}
          <aside className="space-y-8">
            <div className="p-6 rounded-[24px] bg-gradient-to-br from-zinc-900 to-black border border-white/10 space-y-4">
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Market Context</h4>
              <div className="space-y-4">
                <MarketInsight 
                  icon={<TrendingDown className="w-4 h-4 text-emerald-500" />}
                  title="Crude Correction"
                  desc="Brent dipped below $80, suggesting stable base prices."
                />
                <MarketInsight 
                  icon={<Info className="w-4 h-4 text-blue-500" />}
                  title="Regulatory Shift"
                  desc="Austria Model active. Evening decays now deeper."
                />
              </div>
            </div>

            <div className="p-6 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 group cursor-pointer hover:bg-emerald-500/20 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500 font-bold text-sm">PRO Tip</span>
              </div>
              <p className="text-emerald-300 text-sm leading-relaxed mb-4">
                The deepest discounts in the Austrian model usually hit between 19:30 and 20:30. Set an alert for 1.85€/L.
              </p>
              <button className="w-full py-3 rounded-xl bg-emerald-500 text-black font-bold flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform">
                Set Smart Alert
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-auto py-12 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-zinc-500">
            © 2026 FuelPulse. Data provided by Tankerkönig & Yahoo Finance.
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API STATUS: OPERATIONAL
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MarketInsight({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1">{icon}</div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-zinc-500 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
