import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  
  if (normalizedStatus === 'scheduled' || normalizedStatus === 'programada') {
    return (
      <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm">
        Scheduled
      </Badge>
    );
  }
  
  if (normalizedStatus === 'inprogress' || normalizedStatus === 'en progreso' || normalizedStatus === 'live') {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-[0_0_10px_rgba(0,210,255,0.15)] animate-pulse">
        Live
      </Badge>
    );
  }
  
  if (normalizedStatus === 'finished' || normalizedStatus === 'finalizada' || normalizedStatus === 'completed') {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm">
        Finished
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm">
      {status}
    </Badge>
  );
}
