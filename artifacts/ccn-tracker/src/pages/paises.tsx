import { useState, useEffect, useCallback } from "react";
import { Globe, Search, RefreshCw, Trophy, Swords, Shield, Users } from "lucide-react";

type Country = { id: number; name: string; countryCode: string | null };

type Player = {
  rank: number; tag: string; name: string; level: number;
  trophies: number; attackWins: number; defenseWins: number;
  leagueName: string | null; leagueIconUrl: string | null;
  clanName: string | null; clanTag: string | null; clanBadgeUrl: string | null;
};

type Clan = {
  rank: number; tag: string; name: string; level: number;
  trophies: number; members: number;
  badgeUrl: string | null;
  locationName: string | null; locationCountryCode: string | null;
};

type ViewMode = "jugadores" | "clanes";

function FlagEmoji({ code }: { code: string | null }) {
  if (!code || code.length !== 2) return <Globe className="w-5 h-5 text-muted-foreground" />;
  const emoji = code.toUpperCase().split("").map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
  return <span className="text-xl leading-none">{emoji}</span>;
}

function PlayerRow({ player }: { player: Player }) {
  const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];
  const rankColor = player.rank <= 3 ? medalColors[player.rank - 1] : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/80 transition-all">
      <span className={`w-6 text-center font-mono font-bold text-sm ${rankColor}`}>{player.rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {player.leagueIconUrl && <img src={player.leagueIconUrl} alt="" className="w-5 h-5 shrink-0" />}
          <p className="font-semibold text-sm truncate">{player.name}</p>
          <span className="text-xs text-muted-foreground font-mono shrink-0">Nv.{player.level}</span>
        </div>
        {player.clanName && (
          <div className="flex items-center gap-1 mt-0.5">
            {player.clanBadgeUrl && <img src={player.clanBadgeUrl} alt="" className="w-3.5 h-3.5" />}
            <p className="text-xs text-muted-foreground truncate">{player.clanName}</p>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm">🏆 {player.trophies.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">⚔️{player.attackWins} 🛡️{player.defenseWins}</p>
      </div>
    </div>
  );
}

function ClanRow({ clan }: { clan: Clan }) {
  const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];
  const rankColor = clan.rank <= 3 ? medalColors[clan.rank - 1] : "text-muted-foreground";

  return (
    <div className="flex items-center gap-3 border border-border/40 rounded-lg px-3 py-2.5 bg-card/50 hover:bg-card/80 transition-all">
      <span className={`w-6 text-center font-mono font-bold text-sm shrink-0 ${rankColor}`}>{clan.rank}</span>
      {clan.badgeUrl
        ? <img src={clan.badgeUrl} alt="" className="w-9 h-9 shrink-0" />
        : <Shield className="w-9 h-9 text-muted-foreground/30 shrink-0" />
      }
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{clan.name}</p>
        <p className="text-xs text-muted-foreground">
          Nv.{clan.level} · <Users className="w-3 h-3 inline" /> {clan.members}/50
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm">🏆 {clan.trophies.toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function Paises() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Country | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("jugadores");

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null);

  const [clans, setClans] = useState<Clan[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [errorClans, setErrorClans] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/paises")
      .then((r) => r.json() as Promise<{ countries: Country[]; error?: string }>)
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCountries(d.countries ?? []);
        const sv = d.countries.find((c) => c.countryCode === "SV");
        const ar = d.countries.find((c) => c.countryCode === "AR");
        if (sv) setSelected(sv);
        else if (ar) setSelected(ar);
        else if (d.countries.length > 0) setSelected(d.countries[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingCountries(false));
  }, []);

  const fetchPlayers = useCallback(async (country: Country) => {
    setLoadingPlayers(true); setErrorPlayers(null); setPlayers([]);
    try {
      const res = await fetch(`/api/paises/${country.id}/jugadores`);
      const d = await res.json() as { players: Player[]; error?: string };
      if (d.error) throw new Error(d.error);
      setPlayers(d.players ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setErrorPlayers(String((err as Error).message ?? err));
    } finally { setLoadingPlayers(false); }
  }, []);

  const fetchClans = useCallback(async (country: Country) => {
    setLoadingClans(true); setErrorClans(null); setClans([]);
    try {
      const res = await fetch(`/api/paises/${country.id}/clanes`);
      const d = await res.json() as { clans: Clan[]; error?: string };
      if (d.error) throw new Error(d.error);
      setClans(d.clans ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setErrorClans(String((err as Error).message ?? err));
    } finally { setLoadingClans(false); }
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (viewMode === "jugadores") void fetchPlayers(selected);
    else void fetchClans(selected);
  }, [selected, viewMode, fetchPlayers, fetchClans]);

  function handleRefresh() {
    if (!selected) return;
    if (viewMode === "jugadores") { setPlayers([]); void fetchPlayers(selected); }
    else { setClans([]); void fetchClans(selected); }
  }

  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.countryCode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = viewMode === "jugadores" ? loadingPlayers : loadingClans;
  const error = viewMode === "jugadores" ? errorPlayers : errorClans;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase flex items-center gap-3">
          <Globe className="w-8 h-8 md:w-12 md:h-12 text-primary" /> Top Países
        </h1>
        <p className="text-muted-foreground font-mono text-sm md:text-base">
          Top 10 jugadores y clanes por país · Clash of Clans oficial
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Country list */}
        <div className="w-full md:w-64 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país..."
              className="w-full border border-border rounded-lg bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          <div className="border border-border/50 rounded-xl bg-card/30 overflow-hidden max-h-[400px] md:max-h-[600px] overflow-y-auto">
            {loadingCountries ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-secondary/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filtered.map((c) => (
                  <button
                    key={c.id} onClick={() => setSelected(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                      selected?.id === c.id
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "hover:bg-secondary/40 text-foreground border-l-2 border-transparent"
                    }`}
                  >
                    <FlagEmoji code={c.countryCode} />
                    <span className="text-sm font-medium truncate">{c.name}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No se encontró ningún país</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 space-y-4">
          {selected && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <FlagEmoji code={selected.countryCode} />
                <div>
                  <h2 className="font-display font-bold text-xl tracking-wider uppercase">{selected.name}</h2>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Actualizado: {lastUpdated.toLocaleTimeString("es")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefresh} disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-md transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
          )}

          {/* Jugadores / Clanes sub-tabs */}
          <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl border border-border/30">
            <button
              onClick={() => setViewMode("jugadores")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-display font-bold tracking-wider transition-all ${
                viewMode === "jugadores"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> Jugadores
            </button>
            <button
              onClick={() => setViewMode("clanes")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-display font-bold tracking-wider transition-all ${
                viewMode === "clanes"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Clanes
            </button>
          </div>

          <div className="border border-border/50 rounded-xl bg-card/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-secondary/20 flex items-center gap-2">
              {viewMode === "jugadores"
                ? <Trophy className="w-4 h-4 text-yellow-500" />
                : <Shield className="w-4 h-4 text-primary" />
              }
              <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                {viewMode === "jugadores" ? "Top 10 Jugadores" : "Top 10 Clanes"}
              </h3>
              {viewMode === "jugadores" && (
                <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1"><Swords className="w-3 h-3" /> Ataques</div>
                  <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Defensas</div>
                </div>
              )}
            </div>

            <div className="p-3 space-y-1.5">
              {isLoading && (
                <div className="space-y-2">
                  {[1,2,3,4,5,6,7,8,9,10].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-secondary/30 animate-pulse" />
                  ))}
                </div>
              )}

              {error && !isLoading && (
                <div className="py-8 text-center space-y-2">
                  <Globe className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-red-400">{error}</p>
                  <p className="text-xs text-muted-foreground">Puede que este país no tenga datos disponibles</p>
                </div>
              )}

              {!isLoading && !error && viewMode === "jugadores" && players.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No hay datos para este país</p>
              )}

              {!isLoading && !error && viewMode === "clanes" && clans.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No hay clanes para este país</p>
              )}

              {!isLoading && viewMode === "jugadores" && players.map((p) => (
                <PlayerRow key={p.tag} player={p} />
              ))}

              {!isLoading && viewMode === "clanes" && clans.map((c) => (
                <ClanRow key={c.tag} clan={c} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
