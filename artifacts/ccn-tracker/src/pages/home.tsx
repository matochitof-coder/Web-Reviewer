import { useState, useEffect, useCallback } from "react";
import { useGetCcnGuerras, getGetCcnGuerrasQueryKey } from "@workspace/api-client-react";
import { WarCard } from "@/components/war-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CcnGuerraItem } from "@workspace/api-client-react";
import { X, Swords, Star, Percent, Clock, RefreshCw, Shield, Zap, ChevronDown, ChevronUp } from "lucide-react";

function WarListSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[140px] w-full rounded-xl bg-card border border-border/50" />
      ))}
    </div>
  );
}

type WarMember = {
  tag: string; name: string; mapPosition: number; townhallLevel: number;
  attacks?: Array<{ defenderTag: string; stars: number; destructionPercentage: number; order: number }>;
  bestOpponentAttack?: { stars: number; destructionPercentage: number; attackerTag?: string } | null;
};

type WarSide = {
  name?: string; tag?: string; badgeUrl?: string;
  stars: number; attacks: number; destructionPercentage: number;
  members: WarMember[];
};

type WarDetail = {
  state: string; teamSize?: number; endTime?: string; startTime?: string;
  attacksPerMember?: number;
  clan: WarSide;
  opponent: WarSide;
};

function useCountdown(targetIso: string | undefined) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!targetIso) return;
    const tick = () => setDiff(new Date(targetIso).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (!targetIso || diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h > 0 ? `${h}h ` : ""}${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

function AttackRow({ member, showDefense }: { member: WarMember; showDefense?: boolean }) {
  const attacks = member.attacks ?? [];
  const totalStars = attacks.reduce((s, a) => s + a.stars, 0);
  const avgDest = attacks.length > 0 ? attacks.reduce((s, a) => s + a.destructionPercentage, 0) / attacks.length : 0;
  const bestDef = member.bestOpponentAttack;
  const maxStars = attacks.length * 3;

  if (attacks.length === 0 && !showDefense) return null;

  return (
    <div className="flex items-center gap-2 bg-secondary/20 border border-border/20 rounded-lg px-3 py-2">
      <div className="flex flex-col items-center w-6 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground/60">TH{member.townhallLevel}</span>
        <span className="text-[10px] font-mono text-muted-foreground/50">#{member.mapPosition}</span>
      </div>
      <span className="text-xs font-semibold flex-1 truncate">{member.name}</span>
      {attacks.length > 0 ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < totalStars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{avgDest.toFixed(0)}%</span>
        </div>
      ) : (
        <span className="text-[10px] font-mono text-muted-foreground/40 italic">sin atacar</span>
      )}
      {showDefense && bestDef && (
        <div className="flex items-center gap-0.5 shrink-0 ml-1 opacity-50" title="Mejor ataque recibido">
          <Shield className="w-2.5 h-2.5 text-red-400" />
          <span className="text-[10px] font-mono text-red-400">{"★".repeat(bestDef.stars)}</span>
        </div>
      )}
    </div>
  );
}

function WarSidePanel({ side, warName, teamSize, attacksPerMember }: {
  side: WarSide; warName: string; teamSize: number; attacksPerMember: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalPossibleAttacks = teamSize * attacksPerMember;
  const attacksLeft = totalPossibleAttacks - side.attacks;
  const attackers = (side.members ?? []).filter(m => m.attacks && m.attacks.length > 0);
  const nonAttackers = (side.members ?? []).filter(m => !m.attacks || m.attacks.length === 0);

  return (
    <div className="border border-border/50 rounded-xl bg-card/40 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/20 transition-colors"
      >
        {side.badgeUrl && <img src={side.badgeUrl} alt="" className="w-8 h-8 object-contain shrink-0" />}
        <div className="flex-1 text-left min-w-0">
          <p className="font-display font-bold text-sm truncate">{side.name ?? warName}</p>
          {side.tag && <p className="text-[10px] font-mono text-muted-foreground">{side.tag}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-lg text-yellow-400">{side.stars}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{side.destructionPercentage.toFixed(1)}% · {side.attacks}/{totalPossibleAttacks} ataques</p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          {attackers.length > 0 && (
            <>
              <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2">Ataques realizados ({attackers.length})</p>
              {attackers
                .sort((a, b) => {
                  const aS = (a.attacks ?? []).reduce((s, at) => s + at.stars, 0);
                  const bS = (b.attacks ?? []).reduce((s, at) => s + at.stars, 0);
                  return bS - aS;
                })
                .map(m => <AttackRow key={m.tag} member={m} showDefense />)}
            </>
          )}
          {nonAttackers.length > 0 && (
            <>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50 mt-3 mb-1">Sin atacar ({nonAttackers.length}) · {attacksLeft > 0 ? `${attacksLeft} ataques restantes` : ""}</p>
              {nonAttackers.slice(0, 5).map(m => <AttackRow key={m.tag} member={m} />)}
              {nonAttackers.length > 5 && (
                <p className="text-[10px] text-muted-foreground/50 text-center pt-1">+ {nonAttackers.length - 5} más</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LiveWarModal({ war, onClose }: { war: CcnGuerraItem; onClose: () => void }) {
  const [detail, setDetail] = useState<WarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const isLive = war.status.toLowerCase() === 'inprogress' || war.status.toLowerCase() === 'live' || war.status.toLowerCase() === 'en progreso';
  const isScheduled = war.status.toLowerCase() === 'scheduled' || war.status.toLowerCase() === 'programada';
  const countdown = useCountdown(isScheduled ? (war.scheduledAt as string | undefined) : undefined);
  const endCountdown = useCountdown(detail?.endTime);

  const load = useCallback(async () => {
    setLoading(true);
    const tags = [war.homeTag, war.awayTag].filter(Boolean) as string[];
    let found = false;
    for (const tag of tags) {
      const clean = tag.replace(/^#/, "");
      try {
        const res = await fetch(`/api/clan/${clean}/war`);
        if (!res.ok) continue;
        const data = await res.json() as WarDetail & { state?: string };
        if (data.state && data.state !== "notInWar") {
          setDetail(data); setLastFetched(new Date()); found = true; break;
        }
      } catch { continue; }
    }
    if (!found) setError("No se pudo obtener datos en tiempo real para esta guerra.");
    setLoading(false);
  }, [war.homeTag, war.awayTag]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => { void load(); }, 60_000);
    return () => clearInterval(id);
  }, [isLive, load]);

  const teamSize = detail?.teamSize ?? 15;
  const attacksPerMember = detail?.attacksPerMember ?? 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-2xl bg-card border border-border/70 rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isLive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />}
              {isScheduled && <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />}
              <h2 className="font-display font-bold text-base md:text-lg tracking-wider truncate">
                {war.homeTeam} <span className="text-muted-foreground/60 text-sm">vs</span> {war.awayTeam}
              </h2>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {war.tournamentName ?? "CCN Qualifier"} · {war.scheduledAtSv} SV / {war.scheduledAtAr} AR
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {!loading && (
              <button onClick={() => void load()} className="p-1.5 rounded-full hover:bg-secondary transition-colors" title="Refrescar">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isScheduled && countdown && (
            <div className="flex items-center gap-2 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-2.5 text-yellow-400 font-mono">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Comienza en <strong>{countdown}</strong></span>
            </div>
          )}

          {detail?.endTime && endCountdown && isLive && (
            <div className="flex items-center gap-2 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5 text-red-400 font-mono">
              <Zap className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Termina en <strong>{endCountdown}</strong></span>
            </div>
          )}

          {detail?.endTime && !endCountdown && (
            <div className="flex items-center gap-2 text-xs bg-secondary/30 border border-border/30 rounded-lg px-3 py-2 text-muted-foreground font-mono">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Fin: {new Date(detail.endTime).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          )}

          {error && !loading && (
            <div className="space-y-3">
              <div className="text-center py-6 space-y-2">
                <Swords className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">{error}</p>
                <p className="text-xs text-muted-foreground/50">Los datos en tiempo real requieren registro público de guerras.</p>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 text-center border border-border/50 rounded-xl bg-card/50 p-4">
                <div>
                  <p className="font-display font-bold text-sm truncate">{war.homeTeam}</p>
                  <p className="text-2xl font-bold text-yellow-400">{war.homeStars ?? 0} ⭐</p>
                  <p className="text-xs text-muted-foreground">{(war.homeDestruction ?? 0).toFixed(2)}%</p>
                </div>
                <div className="flex items-center justify-center">
                  <span className="font-display text-sm font-bold text-muted-foreground/50">VS</span>
                </div>
                <div>
                  <p className="font-display font-bold text-sm truncate">{war.awayTeam}</p>
                  <p className="text-2xl font-bold text-yellow-400">{war.awayStars ?? 0} ⭐</p>
                  <p className="text-xs text-muted-foreground">{(war.awayDestruction ?? 0).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          )}

          {detail && !loading && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { side: detail.clan,     fallback: war.homeTeam },
                  { side: detail.opponent, fallback: war.awayTeam },
                ].map(({ side, fallback }) => (
                  <div key={fallback} className="border border-border/50 rounded-xl bg-card/50 p-3 text-center space-y-1">
                    {side.badgeUrl && <img src={side.badgeUrl} alt="" className="w-8 h-8 mx-auto object-contain" />}
                    <p className="font-display font-bold text-xs truncate">{side.name ?? fallback}</p>
                    <div className="flex justify-center gap-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.min(Math.floor(side.stars / (teamSize || 1)), 3) || side.stars > i * teamSize ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    <p className="font-bold text-xl text-yellow-400">{side.stars}</p>
                    <div className="flex items-center justify-center gap-3 text-xs font-mono text-muted-foreground">
                      <span>{side.attacks}/{teamSize * attacksPerMember} atk</span>
                      <span>{side.destructionPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {detail.clan.members?.length > 0 && (
                <WarSidePanel
                  side={detail.clan}
                  warName={war.homeTeam}
                  teamSize={teamSize}
                  attacksPerMember={attacksPerMember}
                />
              )}

              {detail.opponent.members?.length > 0 && (
                <WarSidePanel
                  side={detail.opponent}
                  warName={war.awayTeam}
                  teamSize={teamSize}
                  attacksPerMember={attacksPerMember}
                />
              )}

              {lastFetched && (
                <p className="text-center text-[10px] text-muted-foreground/40 font-mono">
                  {isLive ? "🔴 En vivo · " : ""}Actualizado: {lastFetched.toLocaleTimeString("es")}
                  {isLive && " · auto-refresh cada 60s"}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function isWarPast(war: CcnGuerraItem): boolean {
  if (!war.scheduledAt) return false;
  const now = new Date();
  const warTime = new Date(war.scheduledAt as string);
  const isFinished = war.status.toLowerCase() === 'finished' || war.status.toLowerCase() === 'finalizada';
  if (isFinished) {
    const endOf = new Date(warTime);
    endOf.setHours(endOf.getHours() + 30);
    return now > endOf;
  }
  const pastThreshold = new Date(warTime);
  pastThreshold.setHours(pastThreshold.getHours() + 1);
  const isScheduled = war.status.toLowerCase() === 'scheduled' || war.status.toLowerCase() === 'programada';
  return isScheduled && now > pastThreshold;
}

export default function Home() {
  const [selectedWar, setSelectedWar] = useState<CcnGuerraItem | null>(null);

  const { data: todayWars, isLoading: loadingToday } = useGetCcnGuerras(
    { offset: 0 },
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 0 }), refetchInterval: 60_000 } }
  );

  const { data: tomorrowWars, isLoading: loadingTomorrow } = useGetCcnGuerras(
    { offset: 1 },
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 1 }), refetchInterval: 120_000 } }
  );

  const activeWars = (todayWars ?? []).filter((w: CcnGuerraItem) => !isWarPast(w));
  const liveWars = activeWars.filter((w: CcnGuerraItem) => {
    const s = w.status.toLowerCase();
    return s === 'inprogress' || s === 'live' || s === 'en progreso';
  });
  const upcomingWars = activeWars.filter((w: CcnGuerraItem) => {
    const s = w.status.toLowerCase();
    return s === 'scheduled' || s === 'programada';
  });
  const finishedWars = activeWars.filter((w: CcnGuerraItem) => {
    const s = w.status.toLowerCase();
    return s === 'finished' || s === 'finalizada' || s === 'completed';
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {selectedWar && (
        <LiveWarModal war={selectedWar} onClose={() => setSelectedWar(null)} />
      )}

      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase">Live Wars</h1>
        <p className="text-muted-foreground font-mono text-sm md:text-base">
          Real-time tracking of the CCN qualifier.
          {liveWars.length > 0 && (
            <span className="ml-2 text-primary font-bold">{liveWars.length} en vivo ahora</span>
          )}
        </p>
      </div>

      {liveWars.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-primary/30 pb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,210,255,0.6)]" />
            <h2 className="text-xl font-display font-bold tracking-widest uppercase text-primary">En Vivo Ahora</h2>
            <span className="text-xs font-mono bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">{liveWars.length}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {liveWars.map((war: CcnGuerraItem) => (
              <WarCard key={war.id} war={war} onClick={() => setSelectedWar(war)} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-border/50 pb-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h2 className="text-xl font-display font-bold tracking-widest uppercase text-foreground">Today's Matches</h2>
        </div>
        {loadingToday ? (
          <WarListSkeleton />
        ) : upcomingWars.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {upcomingWars.map((war: CcnGuerraItem) => (
              <WarCard key={war.id} war={war} onClick={() => setSelectedWar(war)} />
            ))}
          </div>
        ) : !loadingToday && liveWars.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
            <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">No hay partidas programadas para hoy</span>
          </div>
        ) : null}
      </section>

      {finishedWars.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border/30 pb-2">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            <h2 className="text-lg font-display font-bold tracking-widest uppercase text-muted-foreground">Finalizadas Hoy</h2>
            <span className="text-xs font-mono bg-muted/20 border border-border/30 text-muted-foreground px-2 py-0.5 rounded-full">{finishedWars.length}</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 opacity-70">
            {finishedWars.map((war: CcnGuerraItem) => (
              <WarCard key={war.id} war={war} onClick={() => setSelectedWar(war)} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-3 border-b border-border/50 pb-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <h2 className="text-xl font-display font-bold tracking-widest uppercase text-muted-foreground">Mañana</h2>
        </div>
        {loadingTomorrow ? (
          <WarListSkeleton />
        ) : tomorrowWars && tomorrowWars.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {tomorrowWars.map((war: CcnGuerraItem) => (
              <WarCard key={war.id} war={war} onClick={() => setSelectedWar(war)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
            <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">No matches scheduled for tomorrow</span>
          </div>
        )}
      </section>
    </div>
  );
}
