import { useGetCcnTorneos, getGetCcnTorneosQueryKey } from "@workspace/api-client-react";
import { CcnTorneo } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, MapPin } from "lucide-react";

function TournamentStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "finished" || s === "completed") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider bg-muted/50 text-muted-foreground border border-border/50">
        Finished
      </span>
    );
  }
  if (s === "inprogress" || s === "live" || s === "active" || s === "ongoing") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,210,255,0.1)]">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider bg-secondary/50 text-muted-foreground border border-border/50">
      Upcoming
    </span>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBD";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function Tournaments() {
  const { data: torneos, isLoading, isError } = useGetCcnTorneos({
    query: { queryKey: getGetCcnTorneosQueryKey() },
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase font-display">
          Tournaments
        </h1>
        <p className="text-muted-foreground font-mono text-sm">Active CCN events and competitions</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full bg-card border border-border/50 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-destructive/30 rounded-xl bg-card/20">
          <span className="font-mono text-destructive/70 uppercase tracking-widest text-sm">
            Failed to load tournaments
          </span>
        </div>
      ) : !torneos || torneos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
          <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">
            No active tournaments
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(torneos as CcnTorneo[]).map((torneo) => {
            const isLive =
              torneo.status.toLowerCase() === "inprogress" ||
              torneo.status.toLowerCase() === "live" ||
              torneo.status.toLowerCase() === "active" ||
              torneo.status.toLowerCase() === "ongoing";
            return (
              <div
                key={torneo.id}
                className={`relative overflow-hidden border rounded-xl p-5 bg-card/40 backdrop-blur-sm transition-all hover:bg-card/60 ${
                  isLive
                    ? "border-primary/30 shadow-[0_0_20px_rgba(0,210,255,0.05)]"
                    : "border-border/50"
                }`}
              >
                {isLive && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none rounded-full" />
                )}
                <div className="relative z-10 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-lg text-foreground tracking-wide leading-tight">
                      {torneo.name}
                    </h3>
                    <TournamentStatusBadge status={torneo.status} />
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-mono text-muted-foreground">
                    {(torneo.startDate || torneo.endDate) && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        <span>
                          {formatDate(torneo.startDate)}
                          {torneo.endDate && torneo.endDate !== torneo.startDate
                            ? ` — ${formatDate(torneo.endDate)}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {torneo.region && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 opacity-60" />
                        <span>{torneo.region}</span>
                      </div>
                    )}
                    {torneo.teamsCount != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 opacity-60" />
                        <span>{torneo.teamsCount} teams</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
