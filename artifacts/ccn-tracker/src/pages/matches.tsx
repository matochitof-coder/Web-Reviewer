import { useState } from "react";
import { useGetCcnGuerras, getGetCcnGuerrasQueryKey } from "@workspace/api-client-react";
import { CcnGuerraItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveWarModal } from "@/components/live-war-modal";
import { Calendar, Clock, ChevronDown, ChevronUp, Swords, Flag, Sun, Sunrise } from "lucide-react";

function WarListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-xl bg-card border border-border/50" />
      ))}
    </div>
  );
}

const SV_TZ = "America/El_Salvador";

function nowSV(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SV_TZ });
}

function warSVDate(war: CcnGuerraItem): string {
  if (!war.scheduledAt) return "";
  return new Date(war.scheduledAt as string).toLocaleDateString("en-CA", { timeZone: SV_TZ });
}

function isWarPast(war: CcnGuerraItem): boolean {
  if (!war.scheduledAt) return false;
  const scheduled = new Date(war.scheduledAt as string).getTime();
  const gracePeriodMs = 45 * 60 * 1000;
  return Date.now() > scheduled + gracePeriodMs;
}

function isWarToday(war: CcnGuerraItem): boolean {
  return warSVDate(war) === nowSV();
}

function isWarTomorrow(war: CcnGuerraItem): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowSV = tomorrow.toLocaleDateString("en-CA", { timeZone: SV_TZ });
  return warSVDate(war) === tomorrowSV;
}

const TOURNAMENT_STYLES: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  "elite war league":    { color: "text-cyan-400",   bg: "bg-cyan-400/10",   border: "border-cyan-400/30",   dot: "bg-cyan-400" },
  "blue whales":         { color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30",   dot: "bg-blue-400" },
  "fairy dust":          { color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30", dot: "bg-purple-400" },
  "clash-o-mania":       { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30", dot: "bg-orange-400" },
  "pharmaholix":         { color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30",  dot: "bg-green-400" },
  "default":             { color: "text-muted-foreground", bg: "bg-secondary/50", border: "border-border/40", dot: "bg-muted-foreground/50" },
};

function getTournamentStyle(name: string | null | undefined) {
  if (!name) return TOURNAMENT_STYLES.default;
  const lower = name.toLowerCase();
  for (const [key, style] of Object.entries(TOURNAMENT_STYLES)) {
    if (key !== "default" && lower.includes(key)) return style;
  }
  return TOURNAMENT_STYLES.default;
}

function MatchRow({ war, onClick }: { war: CcnGuerraItem; onClick: () => void }) {
  const style = getTournamentStyle(war.tournamentName);
  const s = war.status.toLowerCase();
  const isLive = s === "inprogress" || s === "live" || s === "en progreso";

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
    >
      <div className={`flex items-stretch border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_12px_rgba(0,210,255,0.07)] ${isLive ? "border-primary/30 bg-primary/5" : "border-border/40 bg-card/40"}`}>
        <div className={`w-1.5 shrink-0 ${style.dot} ${isLive ? "animate-pulse" : ""}`} />

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3">
          <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <div className="min-w-0">
              <p className="font-display font-bold text-sm truncate group-hover:text-primary/90 transition-colors">{war.homeTeam}</p>
              {war.homeTag && <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{war.homeTag}</p>}
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              {isLive ? (
                <span className="text-[10px] font-display font-bold text-primary tracking-wider">EN VIVO</span>
              ) : (
                <span className="text-[10px] text-muted-foreground/50 font-bold">VS</span>
              )}
              {(war.homeStars != null || war.awayStars != null) && (
                <span className="font-display font-bold text-base text-yellow-400">
                  {war.homeStars ?? 0} — {war.awayStars ?? 0}
                </span>
              )}
            </div>
            <div className="min-w-0 text-right">
              <p className="font-display font-bold text-sm truncate group-hover:text-primary/90 transition-colors">{war.awayTeam}</p>
              {war.awayTag && <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{war.awayTag}</p>}
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 sm:pl-4 sm:border-l sm:border-border/30 shrink-0">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono ${style.color} ${style.bg} ${style.border}`}>
              <Flag className="w-2.5 h-2.5" />
              <span className="truncate max-w-[100px]">{war.tournamentName ?? "CCN"}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span>{war.scheduledAtSv} SV</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{war.scheduledAtAr} AR</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function DaySectionHeader({
  title, count, icon, accentClass, borderClass, badgeClass,
}: {
  title: string; count: number; icon: React.ReactNode;
  accentClass: string; borderClass: string; badgeClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 pb-3 border-b-2 ${borderClass}`}>
      <span>{icon}</span>
      <h2 className={`font-display font-bold tracking-widest uppercase text-xl ${accentClass}`}>{title}</h2>
      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}>{count} partidas</span>
    </div>
  );
}

export default function Matches() {
  const [selectedWar, setSelectedWar] = useState<CcnGuerraItem | null>(null);
  const [showTerminadas, setShowTerminadas] = useState(false);

  // offset=0 returns ALL upcoming matches — we filter today/tomorrow client-side
  // using El Salvador timezone so no matches are missed due to UTC offsets
  const { data: allWars = [], isLoading } = useGetCcnGuerras(
    { offset: 0 },
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 0 }), refetchInterval: 60_000 } }
  );

  const warList = allWars as CcnGuerraItem[];
  const todayList = warList.filter(isWarToday);
  const tomorrowList = warList.filter(isWarTomorrow);

  const s = (w: CcnGuerraItem) => w.status.toLowerCase();
  const isLiveStatus = (w: CcnGuerraItem) => s(w) === "inprogress" || s(w) === "live" || s(w) === "en progreso";
  const isFinishedStatus = (w: CcnGuerraItem) => s(w) === "finished" || s(w) === "finalizada" || s(w) === "completed";

  const liveWars = todayList.filter(isLiveStatus);
  const upcomingWars = todayList.filter(
    (w) => !isLiveStatus(w) && !isFinishedStatus(w) && !isWarPast(w)
  );
  const terminadasHoy = todayList.filter(
    (w) => isFinishedStatus(w) || (isWarPast(w) && !isLiveStatus(w))
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {selectedWar && (
        <LiveWarModal war={selectedWar} onClose={() => setSelectedWar(null)} />
      )}

      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase font-display">Matches</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Partidas del día · CCN Qualifier · auto-actualización cada 60s
        </p>
      </div>

      {isLoading ? (
        <WarListSkeleton />
      ) : (
        <div className="space-y-10">

          {/* ── HOY ── */}
          <div className="space-y-5">
            <DaySectionHeader
              title="Hoy"
              count={todayList.length}
              icon={<Sun className="w-5 h-5 text-amber-400" />}
              accentClass="text-amber-400"
              borderClass="border-amber-400/40"
              badgeClass="text-amber-400 border-amber-400/30 bg-amber-400/10"
            />

            {todayList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/40 rounded-2xl bg-card/20 space-y-3">
                <Calendar className="w-10 h-10 text-muted-foreground/30" />
                <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest">No hay partidas para hoy</p>
              </div>
            ) : (
              <div className="space-y-6">
                {liveWars.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,210,255,0.6)]" />
                      <span className="font-display font-bold tracking-widest uppercase text-primary text-sm">En Vivo Ahora</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full border text-primary border-primary/30 bg-primary/10">{liveWars.length}</span>
                    </div>
                    <div className="space-y-2">
                      {liveWars.map((w) => (
                        <MatchRow key={w.id} war={w} onClick={() => setSelectedWar(w)} />
                      ))}
                    </div>
                  </section>
                )}

                {upcomingWars.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400/70" />
                      <span className="font-display font-bold tracking-widest uppercase text-amber-400/80 text-sm">Próximos Hoy</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full border text-amber-400 border-amber-400/30 bg-amber-400/10">{upcomingWars.length}</span>
                    </div>
                    <div className="space-y-2">
                      {upcomingWars.map((w) => (
                        <MatchRow key={w.id} war={w} onClick={() => setSelectedWar(w)} />
                      ))}
                    </div>
                  </section>
                )}

                {terminadasHoy.length > 0 && (
                  <section className="space-y-3">
                    <button
                      onClick={() => setShowTerminadas((v) => !v)}
                      className="w-full flex items-center gap-3 pb-2 border-b border-border/30 hover:border-border/50 transition-colors group"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="font-display font-bold tracking-widest uppercase text-muted-foreground/60 group-hover:text-muted-foreground text-sm transition-colors">Terminadas Hoy</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full border text-muted-foreground border-border/30 bg-secondary/30">{terminadasHoy.length}</span>
                      <span className="ml-auto text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
                        {showTerminadas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>
                    {showTerminadas && (
                      <div className="space-y-2 opacity-60">
                        {terminadasHoy.map((w) => (
                          <MatchRow key={w.id} war={w} onClick={() => setSelectedWar(w)} />
                        ))}
                      </div>
                    )}
                    {!showTerminadas && (
                      <p className="text-xs text-muted-foreground/40 font-mono text-center">
                        Toca para ver · Se borran automáticamente a las 00:00 SV
                      </p>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>

          {/* ── MAÑANA ── */}
          <div className="space-y-5">
            <DaySectionHeader
              title="Mañana"
              count={tomorrowList.length}
              icon={<Sunrise className="w-5 h-5 text-violet-400" />}
              accentClass="text-violet-400"
              borderClass="border-violet-400/40"
              badgeClass="text-violet-400 border-violet-400/30 bg-violet-400/10"
            />

            {tomorrowList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/40 rounded-2xl bg-card/20 space-y-3">
                <Sunrise className="w-10 h-10 text-muted-foreground/30" />
                <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest">No hay partidas para mañana aún</p>
              </div>
            ) : (
              <div className="space-y-2 opacity-90">
                {tomorrowList.map((w) => (
                  <MatchRow key={w.id} war={w} onClick={() => setSelectedWar(w)} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
        {Object.entries(TOURNAMENT_STYLES).filter(([k]) => k !== "default").map(([key, style]) => (
          <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${style.border} ${style.bg}`}>
            <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span className={`text-[10px] font-mono capitalize ${style.color}`}>
              {key.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-muted-foreground/30 font-mono">
        <Swords className="w-3 h-3 inline mr-1" />
        Toca cualquier partida para ver estadísticas en tiempo real
      </p>
    </div>
  );
}
