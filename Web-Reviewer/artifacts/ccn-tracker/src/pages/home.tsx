import { useGetCcnGuerras, getGetCcnGuerrasQueryKey } from "@workspace/api-client-react";
import { WarCard } from "@/components/war-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CcnGuerraItem } from "@workspace/api-client-react";

function WarListSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[140px] w-full rounded-xl bg-card border border-border/50" />
      ))}
    </div>
  );
}

export default function Home() {
  const { data: todayWars, isLoading: loadingToday } = useGetCcnGuerras(
    { offset: 0 }, 
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 0 }) } }
  );
  
  const { data: tomorrowWars, isLoading: loadingTomorrow } = useGetCcnGuerras(
    { offset: 1 }, 
    { query: { queryKey: getGetCcnGuerrasQueryKey({ offset: 1 }) } }
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase">Live Wars</h1>
        <p className="text-muted-foreground font-mono text-sm md:text-base">Real-time tracking of the CCN qualifier.</p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3 border-b border-border/50 pb-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h2 className="text-xl font-display font-bold tracking-widest uppercase text-foreground">Today's Matches</h2>
        </div>
        
        {loadingToday ? (
          <WarListSkeleton />
        ) : todayWars && todayWars.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {todayWars.map((war: CcnGuerraItem) => (
              <WarCard key={war.id} war={war} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/50 rounded-xl bg-card/20">
            <span className="font-mono text-muted-foreground uppercase tracking-widest text-sm">No matches scheduled for today</span>
          </div>
        )}
      </section>

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
              <WarCard key={war.id} war={war} />
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
