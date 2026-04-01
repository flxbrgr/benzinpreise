"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Fuel, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  Menu,
  ChevronRight,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Station {
  id: string;
  name: string;
  brand: string;
  city?: string;
  prices: {
    e10?: number;
    e5?: number;
    diesel?: number;
  };
}

interface PriceData {
  timestamp: string;
  country: string;
  futures: {
    brent: number;
    wti: number;
    currency: string;
  };
  analysis: {
    model: string;
    recommendation: string;
    trend: string;
  };
  stations: Station[];
}

export default function Home() {
  const [country, setCountry] = useState<"DE" | "FR">("DE");
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (selectedCountry: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/index?country=${selectedCountry}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch price data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(country);
  }, [country, fetchData]);

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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center">
                <Fuel className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                FuelPulse
              </span>
            </div>
            
            {/* Market Selector */}
            <div className="hidden sm:flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setCountry("DE")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  country === "DE" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"
                )}
              >
                <span>🇩🇪</span> GERMANY
              </button>
              <button 
                onClick={() => setCountry("FR")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  country === "FR" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-white"
                )}
              >
                <span>🇫🇷</span> FRANCE
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-xs text-zinc-500 tabular-nums">
              Refreshed: {data ? new Date(data.timestamp).toLocaleTimeString() : '...'}
            </div>
            <button className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
              <Menu className="w-5 h-5 text-zinc-400 hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Prediction & Station Card */}
          <section className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-3xl overflow-hidden relative shadow-2xl"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-2">
                  <span className="text-emerald-500 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-emerald-500/20">
                    {country === "DE" ? "MTS-K ENGINE v2.0" : "GOUV-ECONOMIE ENGINE"}
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
                    key={`${country}-${data?.analysis.trend}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="mt-12 space-y-8 relative z-10"
                  >
                    <div className="p-6 rounded-2xl bg-white/[0.05] border border-white/10 shadow-inner">
                      <p className="text-2xl font-medium leading-relaxed bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        {data?.analysis.recommendation}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MarketMetric label="Brent Oil" value={`$${data?.futures.brent}`} />
                      <MarketMetric label="WTI Crude" value={`$${data?.futures.wti}`} />
                      <MarketMetric label="Model Type" value={data?.analysis.model || "None"} sub="Market Specific" />
                      <MarketMetric label="Market" value={country === "DE" ? "Germany" : "France"} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Decorative Gradient Line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            </motion.div>

            {/* Stations List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 px-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Top Stations in {country === "DE" ? "Berlin (Demo)" : "France"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.stations.map((station) => (
                  <StationCard key={station.id} station={station} />
                ))}
              </div>
            </div>
          </section>

          {/* Market Insights Sidebar */}
          <aside className="space-y-8">
            <div className="p-8 rounded-[32px] bg-gradient-to-br from-zinc-900 to-black border border-white/10 space-y-6">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Market Insights</h4>
              <div className="space-y-6">
                <MarketInsight 
                  icon={<TrendingDown className="w-5 h-5 text-emerald-500" />}
                  title="Brent Outlook"
                  desc="Recent crude corrections suggest stable pump prices for the next 72h."
                />
                <MarketInsight 
                  icon={<Info className="w-5 h-5 text-blue-500" />}
                  title={country === "DE" ? "Austrian Model" : "French Model"}
                  desc={country === "DE" 
                    ? "One-hike-per-day rule active. Evening decays are now deeper."
                    : "Stable retail margins. Compare supermarkets for the best weekend rates."}
                />
              </div>
            </div>

            <div className="p-8 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 group cursor-pointer hover:bg-emerald-500/20 transition-all overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Fuel className="w-24 h-24 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-500 font-bold text-xs">SMART TIP</span>
                </div>
                <p className="text-emerald-100 text-sm leading-relaxed mb-6 font-medium">
                  {country === "DE" 
                    ? "Prices hit their daily low between 19:30 and 20:30. Aim for €1.85/L today."
                    : "Supermarket chains (Leclerc, Carrefour) drop prices early morning. Target €1.70/L."}
                </p>
                <button className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform text-sm">
                  Set Price Alert
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="mt-8 py-12 border-t border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xs text-zinc-500">
            © 2026 FuelPulse. Data provided by Tankerkönig & gouv.fr.
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              MARKET: {data?.analysis.model || "DETECTING"}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MarketMetric({ label, value, sub }: { label: string, value: string, sub?: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 group hover:bg-white/[0.04] transition-colors">
      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{label}</span>
      <div className="text-lg font-bold text-white tracking-tight">{value}</div>
      {sub && <div className="text-[10px] text-emerald-500 font-medium">{sub}</div>}
    </div>
  );
}

function StationCard({ station }: { station: Station }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h5 className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors uppercase">{station.brand}</h5>
          <p className="text-[10px] text-zinc-500 font-medium truncate max-w-[150px]">{station.name}</p>
        </div>
        {station.city && <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded-lg text-zinc-400 capitalize">{station.city}</span>}
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <FuelPrice label="E10" price={station.prices.e10} />
        <FuelPrice label="E5" price={station.prices.e5} highlight />
        <FuelPrice label="Diesel" price={station.prices.diesel} />
      </div>
    </motion.div>
  );
}

function FuelPrice({ label, price, highlight }: { label: string, price?: number, highlight?: boolean }) {
  return (
    <div className={cn(
      "p-2 rounded-xl border flex flex-col items-center gap-0.5",
      highlight ? "bg-emerald-500/10 border-emerald-500/20" : "bg-black/20 border-white/5"
    )}>
      <span className="text-[8px] font-bold text-zinc-500 uppercase">{label}</span>
      <span className={cn("text-xs font-bold", highlight ? "text-emerald-400" : "text-white")}>
        {price ? `€${price.toFixed(3)}` : "N/A"}
      </span>
    </div>
  );
}

function MarketInsight({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 shadow-2xl p-2 rounded-xl bg-white/5 border border-white/5">{icon}</div>
      <div>
        <div className="text-sm font-bold text-white tracking-tight">{title}</div>
        <div className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">{desc}</div>
      </div>
    </div>
  );
}
