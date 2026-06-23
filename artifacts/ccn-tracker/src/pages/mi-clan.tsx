import { useEffect, useState, useCallback } from "react";
import { getClanTag } from "./settings";
import { Link } from "wouter";
import { Settings, X, ChevronUp, ChevronDown, Minus, Shield, Swords, Trophy, Heart, Star, Building2 } from "lucide-react";
import WarTab, { WarLogTab } from "./mi-clan-war";
import CWLTab from "./mi-clan-cwl";
import CapitalTab from "./mi-clan-capital";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  tag: string; name: string; role: string; level: number;
  trophies: number; builderBaseTrophies: number;
  donations: number; donationsReceived: number; donationRatio: number;
  clanRank: number; previousClanRank: number; rankChange: number;
  leagueName: string | null; leagueIconUrl: string | null;
};

type ClanInfo = {
  name: string; tag: string; description?: string; level: number;
  memberCount: number; trophies: number;
  warWins?: number; warTies?: number; warLosses?: number; warWinStreak?: number;
  warLogPublic?: boolean; badgeUrl?: string; location?: string;
  warFrequency?: string; requiredTrophies?: number; type?: string;
};

type PlayerDetail = {
  tag: string; name: string; townHallLevel: number; townHallWeaponLevel?: number;
  level: number; trophies: number; bestTrophies: number;
  builderHallLevel?: number; builderBaseTrophies?: number; bestBuilderBaseTrophies?: number;
  warStars: number; attackWins: number; defenseWins: number;
  warPreference?: string; donations: number; donationsReceived: number;
  clanCapitalContributions?: number; role?: string;
  league?: { name: string; iconUrl?: string };
  heroes?: { name: string; level: number; maxLevel: number }[];
  achievements?: { name: string; value: number; stars: number }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  leader: "Líder", coLeader: "Co-líder", admin: "Anciano", member: "Miembro",
};
const WAR_FREQ: Record<string, string> = {
  always: "Siempre", moreThanOncePerWeek: "2+ veces/semana",
  oncePerWeek: "1/semana", lessThanOncePerWeek: "Raramente", never: "Nunca",
};
const HERO_ICONS: Record<string, string> = {
  "Barbarian King": "👑", "Archer Queen": "🏹", "Grand Warden": "📖",
  "Royal Champion": "🛡️", "Minion Prince": "😈",
};

type SortKey = "rank" | "trophies" | "donations" | "received" | "ratio" | "level" | "builderTrophies";
type Tab = "ranking" | "donaciones" | "liga" | "guerra" | "historial" | "cwl" | "capital" | "clan";

// ─── Small helpers ────────────────────────────────────────────────────────────

function RankBadge({ change }: { change: number }) {
  if (change > 0) return <span className="flex items-center gap-0.5 text-emerald-400 text-xs"><ChevronUp className="w-3 h-3" />{change}</span>;
  if (change < 0) return <span className="flex items-center gap-0.5 text-red-400 text-xs"><ChevronDown className="w-3 h-3" />{Math.abs(change)}</span>;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

function StatBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Player Modal ─────────────────────────────────────────────────────────────

function PlayerModal({ tag, name, onClose }: { tag: string; name: string; onClose: () => void }) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cleanTag = tag.replace(/^#/, "");
    fetch(`/api/player/${cleanTag}`)
      .then((r) => r.ok ? r.json() : r.json().then((j: { error?: string }) => Promise.reject(new Error(j.error ?? `Error ${r.status}`))))
      .then((d: PlayerDetail) => setPlayer(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tag]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full md:max-w-lg bg-card border border-border/70 rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display font-bold text-lg tracking-wider">{name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{tag}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {loading && <p className="text-muted-foreground text-sm py-8 text-center">Cargando estadísticas...</p>}
          {error && <p className="text-red-400 text-sm py-8 text-center">{error}</p>}

          {player && (
            <>
              {player.league && (
                <div className="flex items-center gap-3 bg-secondary/40 border border-border/30 rounded-xl p-3">
                  {player.league.iconUrl && <img src={player.league.iconUrl} alt="" className="w-10 h-10" />}
                  <div>
                    <p className="text-xs text-muted-foreground">Liga actual</p>
                    <p className="font-semibold">{player.league.name}</p>
                  </div>
                  {player.warPreference && (
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">Guerra</p>
                      <p className={`text-xs font-bold ${player.warPreference === "in" ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {player.warPreference === "in" ? "✅ Disponible" : "❌ No disponible"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Ayuntamiento", value: `Nv.${player.townHallLevel}${player.townHallWeaponLevel ? ` ★${player.townHallWeaponLevel}` : ""}`, icon: "🏰" },
                  { label: "Nivel exp.", value: player.level, icon: "⭐" },
                  { label: "Trofeos", value: player.trophies.toLocaleString(), icon: "🏆" },
                  { label: "Mejor marca", value: player.bestTrophies.toLocaleString(), icon: "🥇" },
                  { label: "Estrellas guerra", value: (player.warStars ?? 0).toLocaleString(), icon: "⭐" },
                  { label: "Ataques ganados", value: (player.attackWins ?? 0).toLocaleString(), icon: "⚔️" },
                  { label: "Defensas ganadas", value: (player.defenseWins ?? 0).toLocaleString(), icon: "🛡️" },
                  { label: "Donaciones", value: (player.donations ?? 0).toLocaleString(), icon: "🎁" },
                  { label: "Recibidas", value: (player.donationsReceived ?? 0).toLocaleString(), icon: "📥" },
                  { label: "Capital aportado", value: (player.clanCapitalContributions ?? 0).toLocaleString(), icon: "🏛️" },
                  ...(player.builderHallLevel ? [
                    { label: "Taller Constructor", value: `Nv.${player.builderHallLevel}`, icon: "🔨" },
                    { label: "Trofeos Builder", value: (player.builderBaseTrophies ?? 0).toLocaleString(), icon: "🏗️" },
                  ] : []),
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 border border-border/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{s.icon} {s.label}</p>
                    <p className="font-bold text-base">{s.value}</p>
                  </div>
                ))}
              </div>

              {player.heroes && player.heroes.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">Héroes</h3>
                  <div className="space-y-2">
                    {player.heroes.map((h) => (
                      <div key={h.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{HERO_ICONS[h.name] ?? "🦸"} {h.name}</span>
                          <span className="font-mono font-bold text-primary">{h.level}<span className="text-muted-foreground font-normal">/{h.maxLevel}</span></span>
                        </div>
                        <StatBar value={h.level} max={h.maxLevel} color={h.level === h.maxLevel ? "bg-yellow-400" : "bg-primary"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {player.achievements && player.achievements.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">Logros</h3>
                  <div className="space-y-1.5">
                    {player.achievements.map((a) => (
                      <div key={a.name} className="flex items-center justify-between text-sm bg-secondary/30 rounded-lg px-3 py-2">
                        <span className="text-muted-foreground text-xs">{a.name}</span>
                        <span className="font-bold font-mono">{a.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "ranking",   label: "RANKING",   icon: <Trophy className="w-3.5 h-3.5" /> },
  { id: "donaciones",label: "DONAS",     icon: <Heart className="w-3.5 h-3.5" /> },
  { id: "liga",      label: "LIGA",      icon: <Star className="w-3.5 h-3.5" /> },
  { id: "guerra",    label: "GUERRA",    icon: <Swords className="w-3.5 h-3.5" /> },
  { id: "historial", label: "HISTORIAL", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "cwl",       label: "CWL",       icon: <Trophy className="w-3.5 h-3.5" /> },
  { id: "capital",   label: "CAPITAL",   icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: "clan",      label: "INFO",      icon: <Shield className="w-3.5 h-3.5" /> },
];

export default function MiClan() {
  const [members, setMembers] = useState<Member[]>([]);
  const [clan, setClan] = useState<ClanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clanTag, setClanTag] = useState("");
  const [tab, setTab] = useState<Tab>("ranking");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [selectedPlayer, setSelectedPlayer] = useState<{ tag: string; name: string } | null>(null);

  useEffect(() => {
    const tag = getClanTag();
    setClanTag(tag);
    setLoading(true); setError(null);
    Promise.all([
      fetch(`/api/clan/${tag}`).then((r) => r.json() as Promise<ClanInfo & { error?: string }>),
      fetch(`/api/clan/${tag}/members`).then((r) => r.json() as Promise<{ members: Member[]; error?: string }>),
    ])
      .then(([c, m]) => {
        if (c.error) throw new Error(c.error);
        if (m.error) throw new Error(m.error);
        setClan(c); setMembers(m.members ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useCallback((key: SortKey): Member[] =>
    [...members].sort((a, b) => {
      if (key === "rank") return a.clanRank - b.clanRank;
      if (key === "trophies") return b.trophies - a.trophies;
      if (key === "donations") return b.donations - a.donations;
      if (key === "received") return b.donationsReceived - a.donationsReceived;
      if (key === "ratio") return b.donationRatio - a.donationRatio;
      if (key === "level") return b.level - a.level;
      if (key === "builderTrophies") return b.builderBaseTrophies - a.builderBaseTrophies;
      return 0;
    }), [members]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wider">Mi Clan</h1>
          {clanTag && <p className="text-xs text-muted-foreground font-mono mt-0.5">#{clanTag}</p>}
        </div>
        <Link href="/configuracion">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-md transition-all">
            <Settings className="w-3.5 h-3.5" /> Cambiar clan
          </button>
        </Link>
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-card/50 border border-border/30 animate-pulse" />)}</div>}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-5 space-y-2">
          <p className="text-red-400 font-semibold text-sm">No se pudo cargar el clan</p>
          <p className="text-red-400/70 text-xs font-mono">{error}</p>
          <p className="text-muted-foreground text-xs">
            Ve a <Link href="/configuracion" className="text-primary hover:underline">Configuración</Link> → "Abrir diagnóstico del API".
          </p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Clan banner */}
          {clan && (
            <div className="border border-border/50 rounded-xl bg-card/60 p-4">
              <div className="flex items-center gap-4">
                {clan.badgeUrl && <img src={clan.badgeUrl} alt="Badge" className="w-16 h-16 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-bold text-xl tracking-wider truncate">{clan.name}</h2>
                  <p className="text-xs text-muted-foreground">Nivel {clan.level} · {clan.memberCount}/50{clan.location ? ` · ${clan.location}` : ""}</p>
                  {clan.description && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{clan.description}</p>}
                </div>
              </div>
              {clan.warLogPublic && (
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  {[
                    { v: clan.warWins ?? 0, l: "Victorias", icon: "⚔️" },
                    { v: clan.warTies ?? 0, l: "Empates", icon: "🤝" },
                    { v: clan.warLosses ?? 0, l: "Derrotas", icon: "💀" },
                    { v: clan.warWinStreak ?? 0, l: "Racha", icon: "🔥" },
                  ].map((s) => (
                    <div key={s.l} className="bg-secondary/50 rounded-lg p-2">
                      <p className="text-sm font-bold">{s.icon} {s.v}</p>
                      <p className="text-[10px] text-muted-foreground">{s.l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs — scrollable */}
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
            <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl border border-border/30 min-w-max">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-display font-semibold tracking-wider transition-all whitespace-nowrap ${
                    tab === t.id ? "bg-primary/20 text-primary border border-primary/30 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── RANKING ── */}
          {tab === "ranking" && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[2rem_1fr_4rem_4rem] gap-2 px-3 text-[10px] text-muted-foreground font-mono uppercase mb-2">
                <span>#</span><span>Jugador</span><span className="text-right">Nv.</span><span className="text-right">🏆</span>
              </div>
              {sorted("rank").map((m) => (
                <button key={m.tag} onClick={() => setSelectedPlayer({ tag: m.tag, name: m.name })}
                  className="w-full grid grid-cols-[2rem_1fr_4rem_4rem] gap-2 items-center border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/90 hover:border-primary/30 transition-all text-left">
                  <div className="text-center">
                    <span className="text-sm font-mono text-muted-foreground">{m.clanRank}</span>
                    <div className="flex justify-center"><RankBadge change={m.rankChange} /></div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {m.leagueIconUrl && <img src={m.leagueIconUrl} alt="" className="w-5 h-5 shrink-0" />}
                      <p className="font-semibold text-sm truncate">{m.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] ?? m.role}</p>
                  </div>
                  <span className="text-right text-sm font-mono">{m.level}</span>
                  <span className="text-right text-sm font-semibold">{m.trophies.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── DONACIONES ── */}
          {tab === "donaciones" && (
            <div className="space-y-2">
              <div className="flex gap-2 mb-3 flex-wrap">
                {([["donations","Donadas"],["received","Recibidas"],["ratio","Ratio"]] as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setSortKey(key)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${sortKey === key ? "bg-primary/20 text-primary border-primary/30" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 px-3 text-[10px] text-muted-foreground font-mono uppercase mb-1">
                <span>Jugador</span><span className="text-right">⬆</span><span className="text-right">⬇</span><span className="text-right">×</span>
              </div>
              {sorted(sortKey).map((m) => {
                const maxDon = Math.max(...members.map((x) => x.donations), 1);
                return (
                  <button key={m.tag} onClick={() => setSelectedPlayer({ tag: m.tag, name: m.name })}
                    className="w-full border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/90 hover:border-primary/30 transition-all text-left">
                    <div className="grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 items-center">
                      <p className="font-semibold text-sm truncate">{m.name}</p>
                      <span className="text-right text-sm font-mono text-emerald-400">{m.donations.toLocaleString()}</span>
                      <span className="text-right text-sm font-mono text-muted-foreground">{m.donationsReceived.toLocaleString()}</span>
                      <span className="text-right text-sm font-mono text-yellow-400">{m.donationRatio}x</span>
                    </div>
                    <div className="mt-1.5"><StatBar value={m.donations} max={maxDon} color="bg-emerald-500" /></div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── LIGA / BB ── */}
          {tab === "liga" && (
            <div className="space-y-2">
              <div className="flex gap-2 mb-3 flex-wrap">
                {([["trophies","Trofeos casa"],["builderTrophies","Trofeos BB"],["level","Nivel exp."]] as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setSortKey(key)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${sortKey === key ? "bg-primary/20 text-primary border-primary/30" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {sorted(sortKey).map((m) => (
                <button key={m.tag} onClick={() => setSelectedPlayer({ tag: m.tag, name: m.name })}
                  className="w-full flex items-center gap-3 border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/90 hover:border-primary/30 transition-all text-left">
                  {m.leagueIconUrl
                    ? <img src={m.leagueIconUrl} alt="" className="w-8 h-8 shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"><Shield className="w-4 h-4 text-muted-foreground" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.leagueName ?? "Sin liga"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">🏆 {m.trophies.toLocaleString()}</p>
                    {m.builderBaseTrophies > 0 && <p className="text-xs text-muted-foreground">🔨 {m.builderBaseTrophies.toLocaleString()}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── GUERRA ACTUAL ── */}
          {tab === "guerra" && <WarTab clanTag={clanTag} />}

          {/* ── HISTORIAL ── */}
          {tab === "historial" && <WarLogTab clanTag={clanTag} />}

          {/* ── CWL ── */}
          {tab === "cwl" && <CWLTab clanTag={clanTag} />}

          {/* ── CAPITAL ── */}
          {tab === "capital" && <CapitalTab clanTag={clanTag} />}

          {/* ── INFO CLAN ── */}
          {tab === "clan" && clan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tipo de clan", value: clan.type === "inviteOnly" ? "Solo por invitación" : clan.type === "open" ? "Abierto" : "Cerrado" },
                  { label: "Frecuencia de guerra", value: WAR_FREQ[clan.warFrequency ?? ""] ?? clan.warFrequency ?? "—" },
                  { label: "Trofeos requeridos", value: (clan.requiredTrophies ?? 0).toLocaleString() },
                  { label: "Trofeos del clan", value: (clan.trophies ?? 0).toLocaleString() },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 border border-border/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className="font-bold text-sm">{s.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3 flex items-center gap-2">
                  <Swords className="w-3.5 h-3.5" /> Distribución de roles
                </h3>
                {(["leader","coLeader","admin","member"] as const).map((role) => {
                  const count = members.filter((m) => m.role === role).length;
                  if (!count) return null;
                  return (
                    <div key={role} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">{ROLE_LABELS[role]}</span>
                      <div className="flex-1"><StatBar value={count} max={members.length} /></div>
                      <span className="text-xs font-mono w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">Ligas en el clan</h3>
                {Object.entries(members.reduce<Record<string, number>>((acc, m) => { const k = m.leagueName ?? "Sin liga"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}))
                  .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([league, count]) => (
                    <div key={league} className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-muted-foreground flex-1 truncate">{league}</span>
                      <div className="w-24"><StatBar value={count} max={members.length} color="bg-yellow-500" /></div>
                      <span className="text-xs font-mono w-6 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedPlayer && (
        <PlayerModal tag={selectedPlayer.tag} name={selectedPlayer.name} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
