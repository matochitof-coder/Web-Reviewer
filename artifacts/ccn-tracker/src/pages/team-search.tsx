import { useState } from "react";
import {
  useSearchCcnEquipo,
  useGetCcnEquipoPartidas,
  getSearchCcnEquipoQueryKey,
  getGetCcnEquipoPartidasQueryKey,
} from "@workspace/api-client-react";
import {
  CcnEquipo,
  CcnPartida,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarDisplay } from "@/components/star-display";
import { StatusBadge } from "@/components/status-badge";
import { Search, Trophy, TrendingUp, TrendingDown, Swords } from "lucide-react";

function TeamProfile({ team }: { team: CcnEquipo }) {
  const wins = team.wins ?? 0;
  const losses = team.losses ?? 0;
  const ratio = losses === 0 ? wins : (wins / losses).toFixed(2);
  const isPositive = wins >= losses;

  return (
    <div className="border border-primary/20 rounded-xl bg-card/50 p-5 shadow-[0_0_30px_rgba(0,210,255,0.05)]">
      <div className="flex items-start gap-4">
        {team.badgeUrl ? (
          <img
            src={team.badgeUrl}
            alt=""
            className="w-16 h-16 object-contain rounded-sm bg-secondary/50 p-1 border border-border/50"
          />
        ) : (
          <div className="w-16 h-16 rounded-sm bg-secondary border border-border/50 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-2xl text-foreground tracking-wider uppercase leading-tight">
            {team.name}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs font-mono text-muted-foreground">
            {team.clanTag && <span>{team.clanTag}</span>}
            {team.clanName && <span>{team.clanName}</span>}
            {team.region && <span>{team.region}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/40">
        {team.elo != null && (
          <div className="flex flex-col gap-0.5 p-3 bg-secondary/30 rounded-lg border border-border/30">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              ELO
            </span>
            <span className="font-display font-bold text-xl text-primary tabular-nums">
              {Math.round(team.elo)}
            </span>
          </div>
        )}
        {team.rank != null && (
          <div className="flex flex-col gap-0.5 p-3 bg-secondary/30 rounded-lg border border-border/30">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Rank
            </span>
            <span className="font-display font-bold text-xl text-foreground tabular-nums">
              #{team.rank}
            </span>
          </div>
        )}
        <div className="flex flex-col gap-0.5 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Wins
          </span>
          <span className="font-display font-bold text-xl text-green-400 tabular-nums">{wins}</span>
        </div>
        <div className="flex flex-col gap-0.5 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Losses
          </span>
          <span className="font-display font-bold text-xl text-destructive/80 tabular-nums">
            {losses}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 p-3 bg-secondary/30 rounded-lg border border-border/30">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Ratio
          </span>
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-destructive/70" />
            )}
            <span
              className={`font-display font-bold text-xl tabular-nums ${isPositive ? "text-green-400" : "text-destructive/70"}`}
            >
              {ratio}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: CcnPartida }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "inProgress";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors ${isLive ? "bg-primary/5" : ""}`}
    >
      <StatusBadge status={match.status} />
      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-2 items-center min-w-0">
        <span className="font-display font-semibold text-sm text-foreground truncate">
          {match.homeTeam.name}
        </span>
        <div className="flex flex-col items-center text-center px-2">
          {isFinished || isLive ? (
            <div className="flex items-center gap-1.5 font-display font-bold tabular-nums">
              <span className="text-foreground">{match.homeStars ?? 0}</span>
              <span className="text-muted-foreground/50 text-xs">—</span>
              <span className="text-foreground">{match.awayStars ?? 0}</span>
            </div>
          ) : (
            <Swords className="w-4 h-4 text-muted-foreground/30" />
          )}
          {(isFinished || isLive) && (
            <div className="flex items-center gap-1 mt-0.5">
              <StarDisplay count={match.homeStars} max={5} className="w-2.5 h-2.5" />
            </div>
          )}
        </div>
        <span className="font-display font-semibold text-sm text-foreground truncate text-right">
          {match.awayTeam.name}
        </span>
      </div>
      {match.tournamentName && (
        <span className="hidden lg:block text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider truncate max-w-[120px]">
          {match.tournamentName}
        </span>
      )}
    </div>
  );
}

function TeamMatches({ teamId }: { teamId: string }) {
  const { data: matches, isLoading } = useGetCcnEquipoPartidas(teamId, {
    query: {
      enabled: !!teamId,
      queryKey: getGetCcnEquipoPartidasQueryKey(teamId),
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-6">
        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">
          Match History
        </h3>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-card border border-border/50 rounded-sm" />
        ))}
      </div>
    );
  }

  if (!matches || matches.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-display font-bold uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2 mb-0">
        Match History
      </h3>
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40">
        {(matches as CcnPartida[]).map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

export default function TeamSearch() {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");

  const {
    data: team,
    isLoading,
    isError,
    error,
  } = useSearchCcnEquipo(
    { q: query },
    {
      query: {
        enabled: query.length > 0,
        queryKey: getSearchCcnEquipoQueryKey({ q: query }),
        retry: false,
      },
    },
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) setQuery(trimmed);
  }

  const notFound =
    isError && (error as { status?: number })?.status === 404;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase font-display">
          Team Search
        </h1>
        <p className="text-muted-foreground font-mono text-sm">
          Search any registered CCN team by name
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 max-w-lg">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Team name..."
          className="bg-card border-border/60 font-mono text-sm focus:border-primary/50 focus:ring-primary/20 h-10"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="bg-primary text-primary-foreground hover:bg-primary/80 font-display font-semibold tracking-wider uppercase text-xs h-10 px-4 gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full bg-card border border-border/50 rounded-xl" />
          <Skeleton className="h-12 w-full bg-card border border-border/50 rounded-xl" />
        </div>
      )}

      {notFound && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
          <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">
            No team found matching &ldquo;{query}&rdquo;
          </span>
        </div>
      )}

      {isError && !notFound && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-destructive/30 rounded-xl bg-card/20">
          <span className="font-mono text-destructive/70 uppercase tracking-widest text-sm">
            Error fetching team data
          </span>
        </div>
      )}

      {team && !isLoading && (
        <>
          <TeamProfile team={team as CcnEquipo} />
          <TeamMatches teamId={(team as CcnEquipo).id} />
        </>
      )}

      {!query && !isLoading && (
        <div className="flex flex-col items-center justify-center p-16 border border-dashed border-border/30 rounded-xl bg-card/10">
          <Search className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <span className="font-mono text-muted-foreground/50 uppercase tracking-widest text-xs text-center">
            Enter a team name to search
          </span>
        </div>
      )}
    </div>
  );
}
