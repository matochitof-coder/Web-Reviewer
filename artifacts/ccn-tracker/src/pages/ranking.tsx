import { useGetCcnRankingElo, getGetCcnRankingEloQueryKey } from "@workspace/api-client-react";
import { CcnRankingEloItem } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, TrendingUp, TrendingDown, X, Swords, Calendar,
  ExternalLink, Twitter, ChevronRight, Star, Shield
} from "lucide-react";
import { useState, useEffect } from "react";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="inline-flex items-center justify-center w-7 h-7 rounded-sm bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-display font-bold text-sm">1</span>;
  if (rank === 2)
    return <span className="inline-flex items-center justify-center w-7 h-7 rounded-sm bg-zinc-400/20 border border-zinc-400/40 text-zinc-300 font-display font-bold text-sm">2</span>;
  if (rank === 3)
    return <span className="inline-flex items-center justify-center w-7 h-7 rounded-sm bg-amber-700/20 border border-amber-700/40 text-amber-600 font-display font-bold text-sm">3</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 font-mono text-muted-foreground text-sm">{rank}</span>;
}

type RecentMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  scheduledAtSv: string;
  status: string;
  tournamentName: string | null;
};

type RosterMember = { name: string; tag?: string };

type TeamInfo = {
  teamId: string;
  teamName: string;
  badgeUrl: string | null;
  twitter: string | null;
  profileUrl: string | null;
  roster: RosterMember[];
  recentMatches: RecentMatch[];
};

function MatchResultBadge({ match, teamName }: { match: RecentMatch; teamName: string }) {
  const isHome = match.homeTeam.toLowerCase() === teamName.toLowerCase();
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const s = match.status.toLowerCase();
  const isWin = (isHome && s.includes("home")) || (!isHome && s.includes("away")) || s.includes("win");
  const isLoss = (isHome && s.includes("away")) || (!isHome && s.includes("home")) || s.includes("loss");
  const isFinished = s.includes("finish") || s.includes("final") || s.includes("complet");

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFinished ? (isWin ? "bg-green-400" : isLoss ? "bg-red-400" : "bg-muted-foreground/50") : "bg-primary animate-pulse"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">vs {opponent}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{match.tournamentName ?? "CCN"} · {match.scheduledAtSv} SV</p>
      </div>
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
        isFinished
          ? isWin ? "text-green-400 border-green-400/30 bg-green-400/10"
          : isLoss ? "text-red-400 border-red-400/30 bg-red-400/10"
          : "text-muted-foreground border-border/30"
          : "text-primary border-primary/30 bg-primary/10"
      }`}>
        {isFinished ? (isWin ? "WIN" : isLoss ? "LOSS" : s.toUpperCase().slice(0, 8)) : "LIVE"}
      </span>
    </div>
  );
}

function TeamPanel({ team, teamData, onClose }: {
  team: CcnRankingEloItem;
  teamData: TeamInfo | null;
  onClose: () => void;
}) {
  const wins = team.wins ?? 0;
  const losses = team.losses ?? 0;
  const winRate = wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(0) : "-";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-card border-l border-border/70 shadow-2xl h-full overflow-y-auto flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border/50 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-display font-bold text-lg tracking-wider uppercase">Perfil del Equipo</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          <div className="flex items-center gap-4">
            {team.badgeUrl ? (
              <img src={team.badgeUrl} alt="" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-secondary border border-border/50 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-muted-foreground/50" />
              </div>
            )}
            <div>
              <h3 className="font-display font-bold text-xl">{team.teamName}</h3>
              {team.clanTag && <p className="text-xs font-mono text-muted-foreground">{team.clanTag}</p>}
              {team.twitter && (
                <a href={`https://twitter.com/${team.twitter}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                  <Twitter className="w-3 h-3" /> @{team.twitter}
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/30 border border-border/30 rounded-xl p-3 text-center">
              <p className="font-display font-bold text-2xl text-primary">{Math.round(team.elo)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ELO</p>
            </div>
            <div className="bg-secondary/30 border border-border/30 rounded-xl p-3 text-center">
              <p className="font-display font-bold text-2xl text-green-400">{wins}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Victorias</p>
            </div>
            <div className="bg-secondary/30 border border-border/30 rounded-xl p-3 text-center">
              <p className="font-display font-bold text-2xl text-red-400">{losses}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Derrotas</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 border border-border/30 rounded-xl p-3 text-center">
              <p className="font-display font-bold text-xl"># {team.rank}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rank ELO</p>
            </div>
            <div className="bg-secondary/30 border border-border/30 rounded-xl p-3 text-center">
              <p className="font-display font-bold text-xl">{winRate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
            </div>
          </div>

          {teamData === null && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          )}

          {teamData && teamData.recentMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h4 className="font-display font-semibold uppercase tracking-wider text-sm">Últimas Partidas</h4>
              </div>
              <div className="border border-border/30 rounded-xl bg-card/50 px-4 py-1">
                {teamData.recentMatches.slice(0, 8).map((m) => (
                  <MatchResultBadge key={m.id} match={m} teamName={team.teamName} />
                ))}
              </div>
            </div>
          )}

          {teamData && teamData.roster.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <h4 className="font-display font-semibold uppercase tracking-wider text-sm">Roster CCN</h4>
              </div>
              <div className="border border-border/30 rounded-xl bg-card/50 divide-y divide-border/20">
                {teamData.roster.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-mono text-muted-foreground/60 w-4">{i + 1}</span>
                    <span className="text-sm font-semibold">{p.name}</span>
                    {p.tag && <span className="text-xs font-mono text-muted-foreground ml-auto">{p.tag}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamData && teamData.profileUrl && (
            <a
              href={teamData.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-primary/30 rounded-xl text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ver en CCN
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const CCN_BASE = "https://competitiveclash.network";

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full bg-card border border-border/50 rounded-sm" />
      ))}
    </div>
  );
}

export default function Ranking() {
  const { data: teams, isLoading, isError } = useGetCcnRankingElo({
    query: { queryKey: getGetCcnRankingEloQueryKey() },
  });

  const [selectedTeam, setSelectedTeam] = useState<CcnRankingEloItem | null>(null);
  const [teamData, setTeamData] = useState<TeamInfo | null>(null);

  useEffect(() => {
    if (!selectedTeam) { setTeamData(null); return; }
    setTeamData(null);
    const id = selectedTeam.teamId;
    Promise.all([
      fetch(`/api/ccn/equipo/${id}/partidas`).then(r => r.ok ? r.json() : []),
      fetch(`/api/ccn/equipo/${id}/info`).then(r => r.ok ? r.json() : null),
    ]).then(([matches, info]) => {
      setTeamData({
        teamId: id,
        teamName: selectedTeam.teamName,
        badgeUrl: selectedTeam.badgeUrl ?? null,
        twitter: selectedTeam.twitter ?? null,
        profileUrl: info?.profileUrl ?? `${CCN_BASE}/teams/${id}`,
        roster: info?.roster ?? [],
        recentMatches: Array.isArray(matches) ? matches : [],
      });
    }).catch(() => setTeamData({
      teamId: id, teamName: selectedTeam.teamName,
      badgeUrl: selectedTeam.badgeUrl ?? null, twitter: null,
      profileUrl: `${CCN_BASE}/teams/${id}`, roster: [], recentMatches: [],
    }));
  }, [selectedTeam]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {selectedTeam && (
        <TeamPanel
          team={selectedTeam}
          teamData={teamData}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase font-display">ELO Ranking</h1>
        <p className="text-muted-foreground font-mono text-sm">
          Live ELO standings — competitiveclash.network · <span className="text-primary/70">Toca un equipo para ver detalles</span>
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-destructive/30 rounded-xl bg-card/20">
          <span className="font-mono text-destructive/70 uppercase tracking-widest text-sm">Failed to load ranking</span>
        </div>
      ) : !teams || teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
          <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">No ranking data available</span>
        </div>
      ) : (
        <div className="overflow-hidden border border-border/50 rounded-xl bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/50">
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-14">Rank</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Team</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground">ELO</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:table-cell">W</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:table-cell">L</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden md:table-cell">W/L</th>
                  <th className="px-3 py-3 w-8 hidden sm:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {(teams as CcnRankingEloItem[]).map((team) => {
                  const wins = team.wins ?? 0;
                  const losses = team.losses ?? 0;
                  const ratio = losses === 0 ? wins : (wins / losses).toFixed(2);
                  const isPositive = wins >= losses;
                  const isSelected = selectedTeam?.teamId === team.teamId;
                  return (
                    <tr
                      key={team.teamId}
                      onClick={() => setSelectedTeam(team)}
                      className={`hover:bg-secondary/30 transition-colors duration-150 group cursor-pointer ${isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                    >
                      <td className="px-4 py-3"><RankBadge rank={team.rank} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {team.badgeUrl ? (
                            <img src={team.badgeUrl} alt="" className="w-8 h-8 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-8 h-8 rounded-sm bg-secondary border border-border/50 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-display font-semibold text-foreground tracking-wide">{team.teamName}</span>
                            {team.clanTag && <span className="text-[10px] font-mono text-muted-foreground/60">{team.clanTag}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-display font-bold text-primary text-lg tabular-nums">{Math.round(team.elo)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-green-400 tabular-nums">{wins}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-red-400/80 tabular-nums">{losses}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400/70" />}
                          <span className={`font-mono text-sm tabular-nums ${isPositive ? "text-green-400" : "text-red-400/70"}`}>{ratio}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pt-2">
        <Swords className="w-3.5 h-3.5 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground/40 font-mono">Toca cualquier equipo para ver su roster y partidas recientes</span>
      </div>
    </div>
  );
}
