"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingDown, TrendingUp, Clock, Fuel, Info,
  AlertTriangle, CheckCircle2, Menu, MapPin,
  Navigation, Loader2, AlertCircle, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Station {
  id: string;
  name: string;
  brand: string;
  city: string;
  dist_km: number | null;
  is_open: boolean;
  prices: { e10?: number; e5?: number; diesel?: number };
}

interface FuturesSignal {
  brent: number;
  wti: number;
  brent_7d_delta: number;
  pump_change_estimate: number;
  currency: string;
}

interface Analysis {
  model: string;
  trend: string;
  action: string;
  recommendation: string;
  pump_change_estimate_eur: number;
}

interface PriceData {
  timestamp: string;
  country: string;
  location: { lat: number; lng: number; rad_km: number; using_default: boolean };
  fuel_type_filter: string;
  futures: FuturesSignal;
  analysis: Analysis;
  stations: Station[];
}

type Country   = "DE" | "FR";
type FuelType  = "all" | "e10" | "e5" | "diesel";
type Radius    = 1 | 2 | 5 | 10 | 25;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TREND_COLORS: Record<string, string> = {
  increasing_soon: "from-red-500 to-orange-500",
  decreasing:      "from-emerald-500 to-teal-500",
  peaking:         "from-amber-400 to-orange-500",
  low:             "from-blue-500 to-indigo-500",
  stable:          "from-zinc-500 to-slate-600",
};

const TREND_ICONS: Record<string, React.ReactNode> = {
  increasing_soon: <TrendingUp className="w-6 h-6 text-white" />,
  decreasing:      <TrendingDown className="w-6 h-6 text-white" />,
  peaking:         <AlertTriangle className="w-6 h-6 text-white" />,
  low:             <CheckCircle2 className="w-6 h-6 text-white" />,
  stable:          <Clock className="w-6 h-6 text-white" />,
};

function formatPump(val: number): string {
  const sign = val > 0 ? "+" : "";
  return `${sign}€${val.toFixed(3)}/L`;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const geo = useGeolocation();
  const [country,   setCountry]   = useState<Country>("DE");
  const [fuelType,  setFuelType]  = useState<FuelType>("all");
  const [radius,    setRadius]    = useState<Radius>(5);
  const [data,      setData]      = useState<PriceData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (
    c: Country, f: FuelType, r: Radius, lat?: number | null, lng?: number | null
  ) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({ country: c, type: f, rad: String(r) });
      if (lat != null && lng != null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      const res  = await fetch(`/api/index?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "API error");
      setData(json);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever any filter or location changes
  useEffect(() => {
    fetchData(country, fuelType, radius, geo.lat, geo.lng);
  }, [country, fuelType, radius, geo.lat, geo.lng, fetchData]);

  return (
    <div className="min-h-screen bg-[#050510] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Background glow orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[140px]" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Fuel className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              FuelPulse
            </span>
          </div>

          {/* Country toggle */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            {(["DE", "FR"] as Country[]).map(c => (
              <button
                key={c}
                id={`toggle-${c}`}
                onClick={() => setCountry(c)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  country === c
                    ? c === "DE"
                      ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                      : "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-zinc-500 hover:text-white"
                )}
              >
                <span>{c === "DE" ? "🇩🇪" : "🇫🇷"}</span>
                <span className="hidden sm:inline">{c === "DE" ? "GERMANY" : "FRANCE"}</span>
              </button>
            ))}
          </div>

          {/* Timestamp + menu */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-[10px] text-zinc-600 tabular-nums">
              {data ? new Date(data.timestamp).toLocaleTimeString() : "—"}
            </span>
            <button className="bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
              <Menu className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      <div className="relative z-10 border-b border-white/5 bg-white/[0.015] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Geolocation */}
          <GeoButton geo={geo} />

          <div className="w-px h-5 bg-white/10 hidden sm:block" />

          {/* Fuel type */}
          <FuelSelector value={fuelType} onChange={setFuelType} />

          <div className="w-px h-5 bg-white/10 hidden sm:block" />

          {/* Radius */}
          <RadiusSelector value={radius} onChange={setRadius} />

          {/* Using default coords notice */}
          {data?.location.using_default && (
            <span className="ml-auto text-[10px] text-amber-500/80 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Using city centre — enable location for nearby stations
            </span>
          )}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* Left: Prediction + Stations */}
          <section className="lg:col-span-2 space-y-8">

            {/* ── Prediction card ─────────────────────────────────────────── */}
            <motion.div
              key={country}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-3xl overflow-hidden relative shadow-2xl"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    {data?.analysis.model ?? "Loading…"}
                  </span>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mt-2">
                    Should I Refuel?
                  </h1>
                </div>
                {data && (
                  <div className={cn(
                    "p-4 rounded-2xl bg-gradient-to-tr shadow-2xl shrink-0",
                    TREND_COLORS[data.analysis.trend] ?? "from-zinc-600 to-zinc-700"
                  )}>
                    {TREND_ICONS[data.analysis.trend] ?? <Clock className="w-6 h-6 text-white" />}
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-48 flex items-center justify-center mt-8"
                  >
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </motion.div>
                ) : fetchError ? (
                  <motion.div key="error"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {fetchError}
                  </motion.div>
                ) : data ? (
                  <motion.div key={`${data.analysis.trend}-${country}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="mt-10 space-y-6 relative z-10"
                  >
                    {/* Recommendation text */}
                    <p className="text-xl md:text-2xl font-medium leading-relaxed text-zinc-200">
                      {data.analysis.recommendation}
                    </p>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Metric label="Brent Oil" value={`$${data.futures.brent}`} />
                      <Metric label="WTI Crude"  value={`$${data.futures.wti}`}  />
                      <Metric
                        label="7-Day Brent Δ"
                        value={`${data.futures.brent_7d_delta > 0 ? "+" : ""}$${data.futures.brent_7d_delta.toFixed(2)}`}
                        highlight={
                          data.futures.brent_7d_delta > 0 ? "red"
                          : data.futures.brent_7d_delta < 0 ? "green" : undefined
                        }
                      />
                      <Metric
                        label="Est. Pump Δ"
                        value={formatPump(data.futures.pump_change_estimate)}
                        sub="in ~1 week"
                        highlight={
                          data.futures.pump_change_estimate > 0.02 ? "red"
                          : data.futures.pump_change_estimate < -0.02 ? "green" : undefined
                        }
                      />
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            </motion.div>

            {/* ── Station list ────────────────────────────────────────────── */}
            {data && (
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2 px-1">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  Stations within {data.location.rad_km} km
                  {!data.location.using_default && " · near you"}
                  {data.location.using_default && ` · ${country === "DE" ? "Berlin" : "Saran / Orléans"} (default)`}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.stations.length === 0 ? (
                    <p className="text-zinc-600 text-sm col-span-2 py-6 text-center">
                      No stations found. Try increasing the radius.
                    </p>
                  ) : data.stations.map(s => (
                    <StationCard key={s.id} station={s} activeFuel={fuelType} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right: Sidebar */}
          <aside className="space-y-6">
            {/* Futures signal */}
            {data && (
              <FuturesCard futures={data.futures} />
            )}

            {/* Smart tip */}
            <div className="p-7 rounded-[28px] bg-emerald-500/10 border border-emerald-500/20 group hover:bg-emerald-500/15 transition-all overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none" aria-hidden>
                <Fuel className="w-20 h-20 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold text-[10px] tracking-widest">SMART TIP</span>
                </div>
                <p className="text-emerald-100 text-sm leading-relaxed mb-5">
                  {country === "DE"
                    ? "Austrian model: evening low typically hits between 19:30–20:30. Target €1.85/L for E10 today."
                    : "Mondays at Leclerc / E.Leclerc typically carry the week's best SP95-E10 rates. Arrive before 8 AM to beat the rush."}
                </p>
              </div>
            </div>

            {/* Market notes */}
            <div className="p-7 rounded-[28px] bg-white/[0.02] border border-white/8 space-y-5">
              <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Model Notes</h3>
              <div className="space-y-5">
                {country === "DE" ? (
                  <>
                    <Insight icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
                      title="1 Hike / Day" desc="Single daily price increase permitted (at ~12:00). Decreases are unrestricted." />
                    <Insight icon={<TrendingDown className="w-4 h-4 text-emerald-500" />}
                      title="Pump Lag" desc="Crude oil price changes take ~1–2 weeks to reach the pump at 60% pass-through." />
                  </>
                ) : (
                  <>
                    <Insight icon={<Info className="w-4 h-4 text-blue-400" />}
                      title="Supermarket Competition" desc="Leclerc / Intermarché drive ~40% of volumes, forcing competitive pricing weekly." />
                    <Insight icon={<Clock className="w-4 h-4 text-emerald-500" />}
                      title="Weekly Cycle" desc="Lowest prices Mon–Tue mornings. Highest demand Thu–Sat." />
                  </>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-white/5 bg-black/30 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-600">
            © 2026 FuelPulse · Data: Tankerkönig (MTS-K) & data.economie.gouv.fr
          </p>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {data?.analysis.model ?? "INITIALISING"}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GeoButton({ geo }: { geo: ReturnType<typeof useGeolocation> }) {
  return (
    <button
      id="btn-geolocation"
      onClick={geo.request}
      disabled={geo.loading}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
        geo.granted
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : geo.error
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
      )}
    >
      {geo.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
      {geo.loading ? "Locating…" : geo.granted ? "Location on" : geo.error ? "Denied" : "Enable location"}
    </button>
  );
}

function FuelSelector({ value, onChange }: { value: FuelType; onChange: (v: FuelType) => void }) {
  const options: { val: FuelType; label: string }[] = [
    { val: "all",    label: "All"     },
    { val: "e10",    label: "E10"     },
    { val: "e5",     label: "E5/98"   },
    { val: "diesel", label: "Diesel"  },
  ];
  return (
    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
      {options.map(o => (
        <button
          key={o.val}
          id={`fuel-${o.val}`}
          onClick={() => onChange(o.val)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
            value === o.val ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RadiusSelector({ value, onChange }: { value: Radius; onChange: (v: Radius) => void }) {
  const options: Radius[] = [1, 2, 5, 10, 25];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-zinc-600 font-bold uppercase">Radius</span>
      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
        {options.map(r => (
          <button
            key={r}
            id={`radius-${r}`}
            onClick={() => onChange(r)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
              value === r ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {r}km
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: "red" | "green" }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-0.5 hover:bg-white/[0.05] transition-colors">
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</span>
      <div className={cn("text-base font-bold",
        highlight === "red"   ? "text-red-400"
        : highlight === "green" ? "text-emerald-400"
        : "text-white"
      )}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-zinc-600">{sub}</div>}
    </div>
  );
}

function FuturesCard({ futures }: { futures: FuturesSignal }) {
  const rising  = futures.brent_7d_delta > 0;
  const falling = futures.brent_7d_delta < 0;

  return (
    <div className="p-7 rounded-[28px] bg-white/[0.02] border border-white/8 space-y-5">
      <h3 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Crude Oil Signal</h3>

      <div className={cn(
        "p-4 rounded-2xl border flex items-center gap-4",
        rising  ? "bg-red-500/10 border-red-500/20"
        : falling ? "bg-emerald-500/10 border-emerald-500/20"
        : "bg-white/5 border-white/10"
      )}>
        {rising ? <TrendingUp className="w-8 h-8 text-red-400 shrink-0" />
          : falling ? <TrendingDown className="w-8 h-8 text-emerald-400 shrink-0" />
          : <ChevronDown className="w-8 h-8 text-zinc-500 shrink-0" />}
        <div>
          <p className={cn("text-xl font-bold",
            rising ? "text-red-400" : falling ? "text-emerald-400" : "text-zinc-400"
          )}>
            {rising ? "+" : ""}{futures.brent_7d_delta.toFixed(2)} $/bbl
          </p>
          <p className="text-[10px] text-zinc-500">Brent 7-day change</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Est. pump impact</span>
          <span className={cn("font-bold",
            futures.pump_change_estimate > 0.02  ? "text-red-400"
            : futures.pump_change_estimate < -0.02 ? "text-emerald-400"
            : "text-zinc-500"
          )}>
            {formatPump(futures.pump_change_estimate)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Formula</span>
          <span className="text-zinc-600 text-[10px]">Δbrent / 159L × 0.92 × 60%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Lag</span>
          <span className="text-zinc-500">~1–2 weeks</span>
        </div>
      </div>
    </div>
  );
}

function StationCard({ station, activeFuel }: { station: Station; activeFuel: FuelType }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 rounded-3xl bg-white/[0.02] border border-white/8 hover:bg-white/[0.04] transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0">
          <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors uppercase truncate">
            {station.brand || station.name}
          </h4>
          <p className="text-[10px] text-zinc-500 truncate">{station.name}</p>
          {station.city && (
            <p className="text-[10px] text-zinc-600">{station.city}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
          {station.dist_km != null && (
            <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-zinc-400">
              {station.dist_km} km
            </span>
          )}
          <span className={cn(
            "text-[8px] font-bold px-2 py-0.5 rounded-full",
            station.is_open
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-red-500/15 text-red-400"
          )}>
            {station.is_open ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <PriceChip label="E10"    price={station.prices.e10}    active={activeFuel === "e10" || activeFuel === "all"} />
        <PriceChip label="E5/98"  price={station.prices.e5}     active={activeFuel === "e5"  || activeFuel === "all"} highlight />
        <PriceChip label="Diesel" price={station.prices.diesel} active={activeFuel === "diesel" || activeFuel === "all"} />
      </div>
    </motion.div>
  );
}

function PriceChip({ label, price, active, highlight }: {
  label: string; price?: number; active?: boolean; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "p-2 rounded-xl border flex flex-col items-center gap-0.5 transition-all",
      !active
        ? "bg-black/20 border-white/5 opacity-30"
        : highlight
          ? "bg-emerald-500/10 border-emerald-500/20"
          : "bg-black/30 border-white/8"
    )}>
      <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={cn("text-xs font-bold",
        active && highlight ? "text-emerald-400" : "text-white"
      )}>
        {price != null ? `€${price.toFixed(3)}` : "—"}
      </span>
    </div>
  );
}

function Insight({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 p-2 rounded-xl bg-white/5 border border-white/5 shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-zinc-500 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
