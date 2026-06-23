import { useGetCcnRankingMensual, getGetCcnRankingMensualQueryKey } from "@workspace/api-client-react";
import { CcnRankingMensualItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";

function RankMedal({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = [
      "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
      "bg-zinc-400/20 border-zinc-400/40 text-zinc-300",
      "bg-amber-700/20 border-amber-700/40 text-amber-600",
    ];
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-sm border font-display font-bold text-sm ${colors[rank - 1]}`}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 font-mono text-muted-foreground text-sm">
      {rank}
    </span>
  );
}

function Skeleton10() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full bg-card border border-border/50 rounded-sm" />
      ))}
    </div>
  );
}

export default function Qualifier() {
  const { data: teams, isLoading, isError } = useGetCcnRankingMensual({
    query: { queryKey: getGetCcnRankingMensualQueryKey() },
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase font-display">
          Qualifier
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Monthly season standings — CCN qualifier
        </p>
      </div>

      {isLoading ? (
        <Skeleton10 />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-destructive/30 rounded-xl bg-card/20">
          <span className="font-mono text-destructive/70 uppercase tracking-widest text-sm">
            Failed to load standings
          </span>
        </div>
      ) : !teams || teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
          <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">
            No standings available
          </span>
        </div>
      ) : (
        <div className="overflow-hidden border border-border/50 rounded-xl bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/50">
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-14">
                    Pos
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Team
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Points
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                    W
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                    L
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                    W/L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {(teams as CcnRankingMensualItem[]).map((team) => {
                  const wins = team.wins ?? 0;
                  const losses = team.losses ?? 0;
                  const ratio = losses === 0 ? wins : (wins / losses).toFixed(2);
                  const isPositive = wins >= losses;
                  return (
                    <tr
                      key={team.teamId}
                      className="hover:bg-secondary/20 transition-colors duration-150"
                    >
                      <td className="px-4 py-3">
                        <RankMedal rank={team.rank} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-sm bg-secondary border border-border/50 flex items-center justify-center">
                            <Target className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-display font-semibold text-foreground tracking-wide">
                              {team.teamName}
                            </span>
                            {team.clanTag && (
                              <span className="text-[10px] font-mono text-muted-foreground/60">
                                {team.clanTag}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-display font-bold text-accent text-lg tabular-nums">
                          {typeof team.points === "number" ? team.points.toFixed(0) : team.points}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-green-400 tabular-nums">{wins}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-destructive/80 tabular-nums">{losses}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span
                          className={`font-mono text-sm tabular-nums ${isPositive ? "text-green-400" : "text-destructive/70"}`}
                        >
                          {ratio}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
