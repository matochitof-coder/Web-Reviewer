import { useEffect, useState, useCallback, useRef } from "react";
import { getClanTag, STORAGE_KEY } from "./settings";
import { X, ChevronUp, ChevronDown, Minus, Shield, Swords, Trophy, Heart, Star, Building2, Edit2, Check, Search, StarOff } from "lucide-react";
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

type Favorite = { tag: string; name: string; badgeUrl?: string };

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

const FAVORITES_KEY = "ccn_clan_favorites";

function loadFavorites(): Favorite[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as Favorite[];
  } catch { return []; }
}

function saveFavorites(favs: Favorite[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

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

// ─── Empty State (no clan selected) ──────────────────────────────────────────

function EmptyClanState({ onSelectClan }: { onSelectClan: (tag: string) => void }) {
  const [tagInput, setTagInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const tag = tagInput.trim().replace(/^#/, "").toUpperCase();
    if (!tag) return;
    setSearching(true); setSearchError(null);
    try {
      const res = await fetch(`/api/clan/${tag}`);
      if (!res.ok) throw new Error("Clan no encontrado. Verifica el tag.");
      onSelectClan(tag);
    } catch (err) {
      setSearchError(String((err as Error).message ?? err));
    } finally { setSearching(false); }
  }

  function removeFavorite(tag: string) {
    const updated = favorites.filter((f) => f.tag !== tag);
    saveFavorites(updated);
    setFavorites(updated);
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 pt-4 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold uppercase tracking-wider">Mi Clan</h1>
        <p className="text-sm text-muted-foreground">Ingresa el tag de tu clan para comenzar</p>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-border rounded-xl bg-card overflow-hidden focus-within:border-primary/60 transition-colors">
            <span className="px-3 text-muted-foreground font-mono text-sm select-none">#</span>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => { setTagInput(e.target.value.replace(/^#/, "").toUpperCase()); setSearchError(null); }}
              placeholder="TAG DEL CLAN"
              autoFocus
              className="flex-1 bg-transparent py-3 pr-3 text-sm font-mono outline-none placeholder:text-muted-foreground/40 uppercase"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={searching || !tagInput.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-40"
          >
            {searching ? "..." : <><Search className="w-4 h-4" /> Buscar</>}
          </button>
        </div>
        {searchError && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{searchError}</p>
        )}
      </form>

      {favorites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-foreground/70">Favoritos</h2>
          </div>
          <div className="space-y-2">
            {favorites.map((fav) => (
              <div key={fav.tag} className="flex items-center gap-3 border border-border/50 rounded-xl bg-card/50 px-4 py-3 group">
                {fav.badgeUrl && <img src={fav.badgeUrl} alt="" className="w-10 h-10 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold truncate">{fav.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">#{fav.tag}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectClan(fav.tag)}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.tag)}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Quitar de favoritos"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {favorites.length === 0 && (
        <div className="border border-dashed border-border/40 rounded-xl p-6 text-center space-y-2">
          <Star className="w-8 h-8 mx-auto text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground/50 font-mono">
            Los clanes que marques como favoritos aparecerán aquí para acceso rápido
          </p>
        </div>
      )}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clanTag, setClanTag] = useState<string>(() => getClanTag());
  const SESSION_TAB_KEY = "ccn_miclan_tab";
  const [tab, setTab] = useState<Tab>(
    () => (sessionStorage.getItem(SESSION_TAB_KEY) as Tab | null) ?? "ranking",
  );

  function changeTab(id: Tab) {
    sessionStorage.setItem(SESSION_TAB_KEY, id);
    setTab(id);
  }
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [selectedPlayer, setSelectedPlayer] = useState<{ tag: string; name: string } | null>(null);
  const [editingTag, setEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const isFavorite = clan ? favorites.some((f) => f.tag === clan.tag.replace(/^#/, "")) : false;

  function toggleFavorite() {
    if (!clan) return;
    const tag = clan.tag.replace(/^#/, "");
    let updated: Favorite[];
    if (isFavorite) {
      updated = favorites.filter((f) => f.tag !== tag);
    } else {
      const newFav: Favorite = { tag, name: clan.name, badgeUrl: clan.badgeUrl };
      updated = [newFav, ...favorites.filter((f) => f.tag !== tag)];
    }
    saveFavorites(updated);
    setFavorites(updated);
  }

  function loadClan(tag: string) {
    const cleanTag = tag.replace(/^#/, "").toUpperCase();
    setClanTag(cleanTag);
    localStorage.setItem(STORAGE_KEY, cleanTag);
    setLoading(true); setError(null); setClan(null); setMembers([]);
    Promise.all([
      fetch(`/api/clan/${cleanTag}`).then((r) => r.json() as Promise<ClanInfo & { error?: string }>),
      fetch(`/api/clan/${cleanTag}/members`).then((r) => r.json() as Promise<{ members: Member[]; error?: string }>),
    ])
      .then(([c, m]) => {
        if (c.error) throw new Error(c.error);
        if (m.error) throw new Error(m.error);
        setClan(c); setMembers(m.members ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const tag = getClanTag();
    if (tag) loadClan(tag);
  }, []);

  function handleEditTag() {
    setTagInput(clanTag);
    setEditingTag(true);
    setTimeout(() => tagInputRef.current?.focus(), 50);
  }

  async function handleSaveTag() {
    const tag = tagInput.trim().replace(/^#/, "").toUpperCase();
    if (!tag) return;
    setSavingTag(true);
    try {
      const res = await fetch(`/api/clan/${tag}`);
      if (!res.ok) throw new Error("Clan no encontrado");
      setEditingTag(false);
      loadClan(tag);
    } catch (err) {
      alert(String((err as Error).message ?? err));
    } finally {
      setSavingTag(false);
    }
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSaveTag();
    if (e.key === "Escape") setEditingTag(false);
  }

  function handleClearClan() {
    localStorage.removeItem(STORAGE_KEY);
    setClanTag("");
    setClan(null);
    setMembers([]);
    setError(null);
    setEditingTag(false);
  }

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

  // No clan selected — show empty/search state
  if (!clanTag && !loading) {
    return (
      <>
        {selectedPlayer && (
          <PlayerModal tag={selectedPlayer.tag} name={selectedPlayer.name} onClose={() => setSelectedPlayer(null)} />
        )}
        <EmptyClanState onSelectClan={(tag) => loadClan(tag)} />
      </>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {selectedPlayer && (
        <PlayerModal tag={selectedPlayer.tag} name={selectedPlayer.name} onClose={() => setSelectedPlayer(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wider">Mi Clan</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Favorite toggle */}
          {clan && !editingTag && (
            <button
              onClick={toggleFavorite}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all ${
                isFavorite
                  ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
                  : "border-border/50 text-muted-foreground hover:text-yellow-400 hover:border-yellow-400/40"
              }`}
              title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              {isFavorite ? <Star className="w-3.5 h-3.5 fill-yellow-400" /> : <Star className="w-3.5 h-3.5" />}
              {isFavorite ? "Favorito" : "Favoritos"}
            </button>
          )}

          {editingTag ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center border border-primary/40 rounded-md bg-background overflow-hidden focus-within:border-primary/70 transition-colors">
                  <span className="px-2 text-muted-foreground font-mono text-xs select-none">#</span>
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.replace(/^#/, "").toUpperCase())}
                    onKeyDown={handleTagKeyDown}
                    className="bg-transparent py-1.5 pr-2 text-sm font-mono outline-none w-32 placeholder:text-muted-foreground/40"
                    placeholder="TAG DEL CLAN"
                    spellCheck={false}
                  />
                </div>
                {/* Favorites quick-pick in edit mode */}
                {favorites.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {favorites.map((fav) => (
                      <button
                        key={fav.tag}
                        onClick={() => { setTagInput(fav.tag); }}
                        className="text-[10px] font-mono px-2 py-1 rounded border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition-colors"
                      >
                        ★ {fav.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => void handleSaveTag()}
                disabled={savingTag || !tagInput.trim()}
                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-semibold disabled:opacity-40 transition-all"
              >
                <Check className="w-3.5 h-3.5" /> {savingTag ? "..." : "OK"}
              </button>
              <button
                onClick={() => setEditingTag(false)}
                className="p-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditTag}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-md transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {clanTag ? `#${clanTag}` : "Cambiar clan"}
              </button>
              <button
                onClick={handleClearClan}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 border border-border/50 hover:border-red-400/40 px-2 py-1.5 rounded-md transition-all"
                title="Limpiar clan seleccionado"
              >
                <StarOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-card/50 border border-border/30 animate-pulse" />)}</div>}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-5 space-y-2">
          <p className="text-red-400 font-semibold text-sm">No se pudo cargar el clan</p>
          <p className="text-red-400/70 text-xs font-mono">{error}</p>
          <p className="text-muted-foreground text-xs">
            Verifica tu tag de clan o usa el botón "Abrir diagnóstico del API" en Configuración.
          </p>
          <button onClick={handleClearClan} className="text-xs text-muted-foreground hover:text-foreground underline">
            Cambiar clan
          </button>
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
                <button key={t.id} onClick={() => changeTab(t.id)}
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
                  className="w-full grid grid-cols-[1fr_5rem_5rem] gap-2 items-center border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/90 hover:border-primary/30 transition-all text-left">
                  <div className="min-w-0 flex items-center gap-2">
                    {m.leagueIconUrl && <img src={m.leagueIconUrl} alt="" className="w-5 h-5 shrink-0" />}
                    <p className="font-semibold text-sm truncate">{m.name}</p>
                  </div>
                  <span className="text-right text-sm font-semibold">🏆 {m.trophies.toLocaleString()}</span>
                  <span className="text-right text-sm font-mono text-muted-foreground">🏗️ {m.builderBaseTrophies.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── GUERRA ── */}
          {tab === "guerra" && clan && (
            <WarTab clanTag={clanTag} />
          )}

          {/* ── HISTORIAL ── */}
          {tab === "historial" && clan && (
            <WarLogTab clanTag={clanTag} warLogPublic={clan.warLogPublic ?? false} />
          )}

          {/* ── CWL ── */}
          {tab === "cwl" && clan && (
            <CWLTab clanTag={clanTag} />
          )}

          {/* ── CAPITAL ── */}
          {tab === "capital" && clan && (
            <CapitalTab clanTag={clanTag} />
          )}

          {/* ── CLAN INFO ── */}
          {tab === "clan" && clan && (
            <div className="space-y-3">
              {[
                { label: "Tipo de clan", value: clan.type ?? "—" },
                { label: "Frecuencia de guerra", value: WAR_FREQ[clan.warFrequency ?? ""] ?? clan.warFrequency ?? "—" },
                { label: "Trofeos requeridos", value: clan.requiredTrophies?.toLocaleString() ?? "0" },
                { label: "Trofeos del clan", value: clan.trophies?.toLocaleString() ?? "0" },
                { label: "Ubicación", value: clan.location ?? "—" },
                { label: "Registro de guerras", value: clan.warLogPublic ? "Público" : "Privado" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border border-border/40 rounded-lg px-4 py-3 bg-card/50">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
              {clan.description && (
                <div className="border border-border/40 rounded-lg px-4 py-3 bg-card/50">
                  <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm">{clan.description}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
