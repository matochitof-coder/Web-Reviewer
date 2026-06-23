import { Card, CardContent } from "@/components/ui/card";
import { StarDisplay } from "./star-display";
import { StatusBadge } from "./status-badge";
import { CcnGuerraItem } from "@workspace/api-client-react";
import { Trophy, ExternalLink } from "lucide-react";

interface WarCardProps {
  war: CcnGuerraItem;
  onClick?: () => void;
}

export function WarCard({ war, onClick }: WarCardProps) {
  const isFinished = war.status.toLowerCase() === 'finished' || war.status.toLowerCase() === 'finalizada';
  const isLive = war.status.toLowerCase() === 'inprogress' || war.status.toLowerCase() === 'live' || war.status.toLowerCase() === 'en progreso';
  const isClickable = (isLive || isFinished) && (war.homeTag || war.awayTag);

  const homeWinner = war.winner === war.homeTeam;
  const awayWinner = war.winner === war.awayTeam;

  const cardContent = (
    <Card className={`relative overflow-hidden border-border/50 bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card/60 ${isLive ? 'border-primary/30 shadow-[0_0_20px_rgba(0,210,255,0.05)]' : ''} ${isFinished ? 'opacity-80' : ''} ${isClickable ? 'cursor-pointer' : ''}`}>
      {isLive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-primary/5 blur-3xl pointer-events-none rounded-full" />
      )}

      {isFinished && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
      )}

      <CardContent className="p-0 relative z-10">
        <div className="flex justify-between items-center px-4 py-2 border-b border-border/50 bg-secondary/30">
          <div className="flex items-center gap-2">
            <StatusBadge status={war.status} />
            {war.tournamentName && (
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate max-w-[120px]">
                {war.tournamentName}
              </span>
            )}
            {isFinished && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 border border-border/30 bg-muted/20 px-1.5 py-0.5 rounded-sm">
                Guerra finalizada
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
            {isClickable && (
              <ExternalLink className="w-3 h-3 text-primary/50" />
            )}
            <div className="flex gap-1 items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
              <span className="text-primary/70">SV</span>
              <span>{war.scheduledAtSv}</span>
            </div>
            <div className="flex gap-1 items-center bg-background/50 px-1.5 py-0.5 rounded border border-border/50">
              <span className="text-blue-400/70">AR</span>
              <span>{war.scheduledAtAr}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] divide-x divide-border/30">
          <div className={`p-4 flex flex-col ${homeWinner ? 'bg-green-500/5' : ''} ${isFinished && !homeWinner && !awayWinner ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-col">
                <span className={`font-display font-bold text-lg leading-tight truncate ${homeWinner ? 'text-foreground' : 'text-foreground/90'}`}>
                  {war.homeTeam}
                </span>
                {war.homeTag && (
                  <span className="text-xs text-muted-foreground font-mono mt-0.5">{war.homeTag}</span>
                )}
              </div>
              {homeWinner && <Trophy className="w-4 h-4 text-yellow-500 shrink-0 mt-1" />}
            </div>
            {(isFinished || isLive) && (
              <div className="mt-auto pt-3 flex items-end justify-between border-t border-border/20">
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono mb-1 tracking-wider">Stars</span>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl font-bold leading-none">{war.homeStars ?? 0}</span>
                    <StarDisplay count={war.homeStars} max={15} className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono mb-1 tracking-wider">Destruction</span>
                  <span className="font-mono text-sm text-muted-foreground">{(war.homeDestruction ?? 0).toFixed(2)}%</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-3 bg-secondary/10 relative">
            <span className="font-display text-xs font-bold text-muted-foreground/50 italic absolute">VS</span>
          </div>

          <div className={`p-4 flex flex-col ${awayWinner ? 'bg-green-500/5' : ''} ${isFinished && !homeWinner && !awayWinner ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-2 mb-2 flex-row-reverse text-right">
              <div className="flex flex-col items-end">
                <span className={`font-display font-bold text-lg leading-tight truncate ${awayWinner ? 'text-foreground' : 'text-foreground/90'}`}>
                  {war.awayTeam}
                </span>
                {war.awayTag && (
                  <span className="text-xs text-muted-foreground font-mono mt-0.5">{war.awayTag}</span>
                )}
              </div>
              {awayWinner && <Trophy className="w-4 h-4 text-yellow-500 shrink-0 mt-1" />}
            </div>
            {(isFinished || isLive) && (
              <div className="mt-auto pt-3 flex items-end justify-between border-t border-border/20 flex-row-reverse text-right">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono mb-1 tracking-wider">Stars</span>
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="font-display text-2xl font-bold leading-none">{war.awayStars ?? 0}</span>
                    <StarDisplay count={war.awayStars} max={15} className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono mb-1 tracking-wider">Destruction</span>
                  <span className="font-mono text-sm text-muted-foreground">{(war.awayDestruction ?? 0).toFixed(2)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isClickable && onClick) {
    return (
      <button className="w-full text-left" onClick={onClick}>
        {cardContent}
      </button>
    );
  }

  return cardContent;
}
