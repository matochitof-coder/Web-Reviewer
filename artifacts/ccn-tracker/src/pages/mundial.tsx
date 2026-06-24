import { useState, useEffect } from "react";
import { Globe, Trophy, Shield, RefreshCw, ChevronUp, Swords } from "lucide-react";

type GlobalPlayer = {
  rank: number; tag: string; name: string; level: number;
  trophies: number; attackWins?: number; defenseWins?: number;
  leagueName: string | null; leagueIconUrl: string | null;
  clanName: string | null; clanTag: string | null; clanBadgeUrl: string | null;
  countryName: string | null; countryCode: string | null;
};

type GlobalClan = {
  rank: number; tag: string; name: string; level: number;
  trophies: number; members: number;
  badgeUrl: string | null;
  locationName: string | null; locationCountryCode: string | null;
};

type Tab = "jugadores" | "clanes" | "builder";

function FlagEmoji({ code }: { code: string | null }) {
  if (!code || code.length !== 2) return <span className="text-muted-foreground text-xs">🌍</span>;
  const emoji = code.toUpperCase().split("").map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
  return <span className="text-base leading-none">{emoji}</span>;
}

function MedalRank({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-mono font-bold text-sm">🥇</span>;
  if (rank === 2) return <span className="text-slate-300 font-mono font-bold text-sm">🥈</span>;
  if (rank === 3) return <span className="text-amber-600 font-mono font-bold text-sm">🥉</span>;
  return <span className="w-7 text-center font-mono text-xs text-muted-foreground tabular-nums">{rank}</span>;
}

function PlayerRow({ p }: { p: GlobalPlayer }) {
  return (
    <div className="flex items-center gap-3 border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/80 transition-all">
      <div className="w-7 flex justify-center shrink-0"><MedalRank rank={p.rank} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {p.leagueIconUrl && <img src={p.leagueIconUrl} alt="" className="w-4 h-4 shrink-0" />}
          <p className="font-semibold text-sm truncate">{p.name}</p>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">Nv.{p.level}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {p.clanBadgeUrl && <img src={p.clanBadgeUrl} alt="" className="w-3.5 h-3.5 shrink-0" />}
          {p.clanName && <p className="text-[10px] text-muted-foreground truncate">{p.clanName}</p>}
          {p.countryCode && (
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <FlagEmoji code={p.countryCode} />
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{p.countryName}</span>
            </div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm tabular-nums">🏆 {p.trophies.toLocaleString()}</p>
        {(p.attackWins != null) && (
          <p className="text-[10px] text-muted-foreground">⚔️{p.attackWins} 🛡️{p.defenseWins ?? 0}</p>
        )}
      </div>
    </div>
  );
}

function ClanRow({ c }: { c: GlobalClan }) {
  return (
    <div className="flex items-center gap-3 border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/80 transition-all">
      <div className="w-7 flex justify-center shrink-0"><MedalRank rank={c.rank} /></div>
      {c.badgeUrl && <img src={c.badgeUrl} alt="" className="w-9 h-9 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{c.name}</p>
        <p className="text-[10px] text-muted-foreground">Nv.{c.level} · {c.members}/50 miembros</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {c.locationCountryCode && <FlagEmoji code={c.locationCountryCode} />}
        <div className="text-right">
          <p className="font-bold text-sm tabular-nums">🏆 {c.trophies.toLocaleString()}</p>
          {c.locationName && <p className="text-[10px] text-muted-foreground hidden sm:block">{c.locationName}</p>}
        </div>
      </div>
    </div>
  );
}

function RowSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[60px] rounded-lg bg-card/50 border border-border/30 animate-pulse" style={{ opacity: 1 - i * 0.03 }} />
      ))}
    </div>
  );
}

export default function Mundial() {
  const [tab, setTab] = useState<Tab>("jugadores");
  const [players, setPlayers] = useState<GlobalPlayer[]>([]);
  const [clans, setClans] = useState<GlobalClan[]>([]);
  const [bbPlayers, setBbPlayers] = useState<GlobalPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function fetchData(t: Tab) {
    setLoading(true); setError(null);
    try {
      if (t === "jugadores" && players.length === 0) {
        const res = await fetch("/api/ranking/mundial/jugadores");
        const d = await res.json() as { players?: GlobalPlayer[]; error?: string };
        if (d.error) throw new Error(d.error);
        setPlayers(d.players ?? []);
      } else if (t === "clanes" && clans.length === 0) {
        const res = await fetch("/api/ranking/mundial/clanes");
        const d = await res.json() as { clans?: GlobalClan[]; error?: string };
        if (d.error) throw new Error(d.error);
        setClans(d.clans ?? []);
      } else if (t === "builder" && bbPlayers.length === 0) {
        const res = await fetch("/api/ranking/mundial/jugadores-bb");
        const d = await res.json() as { players?: GlobalPlayer[]; error?: string };
        if (d.error) throw new Error(d.error);
        setBbPlayers(d.players ?? []);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    if (tab === "jugadores") setPlayers([]);
    if (tab === "clanes") setClans([]);
    if (tab === "builder") setBbPlayers([]);
    void fetchData(tab);
  }

  useEffect(() => { void fetchData(tab); }, [tab]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "jugadores", label: "Top Jugadores", icon: "🏆", count: players.length },
    { id: "clanes",    label: "Top Clanes",    icon: "🛡️", count: clans.length },
    { id: "builder",   label: "Builder Base",  icon: "🔨", count: bbPlayers.length },
  ];

  const currentData = tab === "jugadores" ? players : tab === "builder" ? bbPlayers : null;
  const currentClans = tab === "clanes" ? clans : null;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase flex items-center gap-3">
          <Globe className="w-8 h-8 md:w-12 md:h-12 text-primary" /> Top 200 Mundial
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Ranking oficial de Clash of Clans · Top 200 globales en tiempo real
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Jugadores", value: "200", icon: "👤", sub: "Home Village" },
          { label: "Clanes", value: "200", icon: "🛡️", sub: "Por trofeos" },
          { label: "Builder Base", value: "200", icon: "🔨", sub: "Trofeos BB" },
        ].map((s) => (
          <div key={s.label} className="border border-border/50 rounded-xl bg-card/50 p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="font-display font-bold text-xl text-primary">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-mono uppercase">{s.label}</p>
            <p className="text-[9px] text-muted-foreground/50">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl border border-border/30">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-xs font-display font-semibold tracking-wider transition-all ${
              tab === t.id
                ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {t.count > 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold uppercase tracking-wider text-base">
            {tab === "jugadores" && "🏆 Top 200 Jugadores · Trofeos"}
            {tab === "clanes" && "🛡️ Top 200 Clanes · Trofeos"}
            {tab === "builder" && "🔨 Top 200 Builder Base"}
          </h2>
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground font-mono">
              {lastUpdated.toLocaleTimeString("es")}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-md transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Content */}
      {loading && <RowSkeleton count={15} />}

      {error && !loading && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-6 text-center space-y-2">
          <Globe className="w-10 h-10 text-red-400/50 mx-auto" />
          <p className="text-red-400 text-sm font-semibold">No se pudo cargar el ranking</p>
          <p className="text-red-400/60 text-xs font-mono">{error}</p>
        </div>
      )}

      {!loading && !error && currentData && currentData.length > 0 && (
        <div className="space-y-1.5">
          {currentData.map((p) => <PlayerRow key={p.tag} p={p} />)}
        </div>
      )}

      {!loading && !error && currentClans && currentClans.length > 0 && (
        <div className="space-y-1.5">
          {currentClans.map((c) => <ClanRow key={c.tag} c={c} />)}
        </div>
      )}

      {!loading && !error && (currentData?.length === 0 || currentClans?.length === 0) && (
        <div className="flex flex-col items-center gap-3 py-16">
          <Globe className="w-12 h-12 text-muted-foreground/20" />
          <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">Sin datos</p>
        </div>
      )}

      {/* Warreport note */}
      <div className="border border-border/30 rounded-xl bg-card/30 p-4 flex items-start gap-3">
        <Swords className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80">Fuente de datos</p>
          <p>Datos oficiales de la API de Clash of Clans · Actualizados cada 10 minutos por Supercell</p>
          <p>Para tracking de guerras CCN ve a <strong>Matches</strong> · Para stats de tu clan usa <strong>Mi Clan</strong></p>
        </div>
      </div>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
