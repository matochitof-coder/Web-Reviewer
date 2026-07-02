import { useState } from "react";
import { useGetCcnGuerras, getGetCcnGuerrasQueryKey } from "@workspace/api-client-react";
import { CcnGuerraItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveWarModal } from "@/components/live-war-modal";
import { WarCard } from "@/components/war-card";
import { Swords, Radio, CalendarDays } from "lucide-react";
import { Link } from "wouter";

function WarListSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[140px] w-full rounded-xl bg-card border border-border/50" />
      ))}
    </div>
  );
}

function isLiveWar(war: CcnGuerraItem): boolean {
  const s = war.status.toLowerCase();
  // Trust the backend's "finished" status — never show a finished war as live
  if (s === "finished" || s === "finalizada") return false;
  if (s === "inprogress" || s === "live" || s === "en progreso") return true;
  // Fallback time-based check (should rarely be needed; keep window at 3h to
  // match the backend WAR_BATTLE_DURATION_MS so they stay in sync)
  if (!war.scheduledAt) return false;
  const scheduled = new Date(war.scheduledAt as string).getTime();
  const now = Date.now();
  const threeHoursMs = 3 * 60 * 60 * 1000;
  const tenMinMs = 10 * 60 * 1000;
  return now >= scheduled - tenMinMs && now <= scheduled + threeHoursMs;
}

function getNextWar(wars: CcnGuerraItem[]): CcnGuerraItem | null {
  const now = Date.now();
  const upcoming = wars.filter((w) => {
    const s = w.status.toLowerCase();
    if (s === "finished" || s === "finalizada") return false;
    if (!w.scheduledAt) return false;
    return new Date(w.scheduledAt as string).getTime() > now;
  });
  if (!upcoming.length) return null;
  return upcoming.sort((a, b) =>
    new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime()
  )[0];
}

export default function Home() {
  const [selectedWar, setSelectedWar] = useState<CcnGuerraItem | null>(null);

  const { data: todayWars = [], isLoading: loadingToday } = useGetCcnGuerras(
    { offset: 0 },
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 0 }), refetchInterval: 90_000 } }
  );

  const { data: tomorrowWars = [], isLoading: loadingTomorrow } = useGetCcnGuerras(
    { offset: 1 },
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 1 }), refetchInterval: 120_000 } }
  );

  const allWars = [...(todayWars as CcnGuerraItem[]), ...(tomorrowWars as CcnGuerraItem[])];
  const liveWars = (todayWars as CcnGuerraItem[]).filter(isLiveWar);
  const nextWar = liveWars.length === 0 ? getNextWar(allWars) : null;
  const isLoading = loadingToday || loadingTomorrow;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {selectedWar && (
        <LiveWarModal war={selectedWar} onClose={() => setSelectedWar(null)} />
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,210,255,0.7)]" />
          <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-wider uppercase font-display">En Vivo</h1>
        </div>
        <p className="text-muted-foreground font-mono text-sm">
          Guerras que se juegan ahora mismo en todos los torneos CCN
        </p>
      </div>

      {isLoading ? (
        <WarListSkeleton />
      ) : liveWars.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-mono text-primary font-bold">{liveWars.length} guerra{liveWars.length > 1 ? "s" : ""} en vivo</span>
            <span className="text-xs text-muted-foreground/50 font-mono">· auto-refresh cada 30s</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {liveWars.map((war) => (
              <WarCard key={war.id} war={war} onClick={() => setSelectedWar(war)} forceClickable />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/40 rounded-2xl bg-card/20 space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center">
              <Swords className="w-10 h-10 text-primary/30" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-display font-bold text-lg text-foreground/60 uppercase tracking-widest">
                No hay guerras en vivo
              </p>
              <p className="text-muted-foreground/50 text-sm font-mono">
                Todas las guerras están pausadas o no han comenzado aún
              </p>
            </div>
            {nextWar && (
              <div className="mt-4 px-6 py-4 border border-border/40 rounded-xl bg-card/40 text-center">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Próxima partida</p>
                <p className="font-display font-bold text-base">{nextWar.homeTeam} vs {nextWar.awayTeam}</p>
                <p className="text-xs font-mono text-primary mt-1">{nextWar.scheduledAtSv} SV · {nextWar.tournamentName ?? "CCN"}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border border-border/30 rounded-xl p-4 bg-card/30">
            <CalendarDays className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Ver agenda completa</p>
              <p className="text-xs text-muted-foreground">Todas las partidas de hoy y mañana en Matches</p>
            </div>
            <Link href="/matches">
              <button className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                Ver Matches →
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
