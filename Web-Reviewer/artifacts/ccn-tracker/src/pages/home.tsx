import { useState, useEffect } from "react";
import { useGetCcnGuerras, getGetCcnGuerrasQueryKey } from "@workspace/api-client-react";
import { WarCard } from "@/components/war-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CcnGuerraItem } from "@workspace/api-client-react";
import { X, Swords, Star, Percent, Clock } from "lucide-react";

function WarListSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[140px] w-full rounded-xl bg-card border border-border/50" />
      ))}
    </div>
  );
}

type WarDetail = {
  state: string;
  teamSize?: number;
  endTime?: string;
  clan: {
    name?: string; tag?: string; badgeUrl?: string;
    stars: number; attacks: number; destructionPercentage: number;
    members: Array<{
      tag: string; name: string; mapPosition: number; townhallLevel: number;
      attacks: Array<{ defenderTag: string; stars: number; destructionPercentage: number; order: number }>;
      bestOpponentAttack?: { stars: number; destructionPercentage: number } | null;
    }>;
  };
  opponent: {
    name?: string; tag?: string; badgeUrl?: string;
    stars: number; attacks: number; destructionPercentage: number;
    members: Array<{ tag: string; name: string; mapPosition: number; townhallLevel: number }>;
  };
};

function LiveWarModal({ war, onClose }: { war: CcnGuerraItem; onClose: () => void }) {
  const [detail, setDetail] = useState<WarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedTag, setUsedTag] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
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
            setDetail(data);
            setUsedTag(tag);
            found = true;
            break;
          }
        } catch { continue; }
      }
      if (!found) setError("No se pudo obtener datos en tiempo real para esta guerra.");
      setLoading(false);
    }
    void load();
  }, [war.homeTag, war.awayTag]);

  const isLive = war.status.toLowerCase() === 'inprogress' || war.status.toLowerCase() === 'live' || war.status.toLowerCase() === 'en progreso';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-2xl bg-card border border-border/70 rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              {isLive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              <h2 className="font-display font-bold text-lg tracking-wider">
                {war.homeTeam} vs {war.awayTeam}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {war.tournamentName ?? "CCN Qualifier"} · {war.scheduledAtSv} SV / {war.scheduledAtAr} AR
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 space-y-3">
              <Swords className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">{error}</p>
              <p className="text-xs text-muted-foreground/60">Los datos en tiempo real requieren que los clanes tengan registro público de guerras.</p>
              <div className="mt-4 p-4 border border-border/50 rounded-xl bg-card/50 space-y-2">
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 text-center">
                  <div>
                    <p className="font-display font-bold truncate">{war.homeTeam}</p>
                    <p className="text-2xl font-bold text-primary">{war.homeStars ?? 0} ⭐</p>
                    <p className="text-xs text-muted-foreground">{(war.homeDestruction ?? 0).toFixed(2)}%</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="font-display text-sm font-bold text-muted-foreground/50">VS</span>
                  </div>
                  <div>
                    <p className="font-display font-bold truncate">{war.awayTeam}</p>
                    <p className="text-2xl font-bold text-primary">{war.awayStars ?? 0} ⭐</p>
                    <p className="text-xs text-muted-foreground">{(war.awayDestruction ?? 0).toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {detail && !loading && (
            <>
              {usedTag && (
                <p className="text-xs text-muted-foreground/60 font-mono">
                  Datos desde clan: {usedTag} {isLive ? "· Tiempo real" : ""}
                </p>
              )}

              {detail.endTime && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 border border-border/30 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Fin: {new Date(detail.endTime).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: detail.clan.name ?? war.homeTeam, tag: detail.clan.tag, badge: detail.clan.badgeUrl, stars: detail.clan.stars, attacks: detail.clan.attacks, dest: detail.clan.destructionPercentage, total: detail.teamSize ?? 15 },
                  { label: detail.opponent.name ?? war.awayTeam, tag: detail.opponent.tag, badge: detail.opponent.badgeUrl, stars: detail.opponent.stars, attacks: detail.opponent.attacks, dest: detail.opponent.destructionPercentage, total: detail.teamSize ?? 15 },
                ].map((side) => (
                  <div key={side.label} className="border border-border/50 rounded-xl bg-card/50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {side.badge && <img src={side.badge} alt="" className="w-8 h-8" />}
                      <div>
                        <p className="font-display font-bold text-sm leading-tight truncate">{side.label}</p>
                        {side.tag && <p className="text-xs text-muted-foreground font-mono">{side.tag}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3" />
                          <span className="font-bold text-lg">{side.stars}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Estrellas</p>
                      </div>
                      <div>
                        <p className="font-bold text-lg">{side.attacks}</p>
                        <p className="text-[10px] text-muted-foreground">Ataques</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-0.5">
                          <Percent className="w-3 h-3 text-muted-foreground" />
                          <span className="font-bold text-base">{side.dest.toFixed(1)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Destrucción</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {detail.clan.members && detail.clan.members.length > 0 && (
                <div>
                  <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">
                    Ataques — {detail.clan.name ?? war.homeTeam}
                  </h3>
                  <div className="space-y-1.5">
                    {detail.clan.members
                      .filter((m) => m.attacks && m.attacks.length > 0)
                      .sort((a, b) => {
                        const aStars = a.attacks.reduce((s, at) => s + at.stars, 0);
                        const bStars = b.attacks.reduce((s, at) => s + at.stars, 0);
                        return bStars - aStars;
                      })
                      .map((m) => {
                        const totalStars = m.attacks.reduce((s, a) => s + a.stars, 0);
                        const totalDest = m.attacks.reduce((s, a) => s + a.destructionPercentage, 0) / Math.max(m.attacks.length, 1);
                        return (
                          <div key={m.tag} className="flex items-center gap-3 bg-secondary/30 border border-border/30 rounded-lg px-3 py-2">
                            <span className="text-xs text-muted-foreground font-mono w-5 text-center">{m.mapPosition}</span>
                            <span className="text-xs font-semibold flex-1 truncate">TH{m.townhallLevel} {m.name}</span>
                            <div className="flex items-center gap-1 text-xs font-mono">
                              <span className="text-yellow-400">{"⭐".repeat(totalStars)}</span>
                              <span className="text-muted-foreground ml-1">{totalDest.toFixed(0)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    {detail.clan.members.filter((m) => !m.attacks || m.attacks.length === 0).length > 0 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        + {detail.clan.members.filter((m) => !m.attacks || m.attacks.length === 0).length} sin atacar aún
                      </p>
                    )}
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
