import { useEffect, useState } from "react";
import { Trophy, Star } from "lucide-react";

type CWLWar = {
  round: number; state: string; result: string; teamSize: number;
  ourName: string; ourBadgeUrl: string | null; ourStars: number; ourAttacks: number; ourDestructionPercentage: number;
  opponentName: string; opponentBadgeUrl: string | null; opponentStars: number; opponentAttacks: number; opponentDestructionPercentage: number;
  members: Array<{ tag: string; name: string; mapPosition: number; townhallLevel: number; attacks: Array<{ stars: number; destructionPercentage: number; defenderTag: string }> }>;
};

type CWLData = {
  state: string; season: string | null;
  clans: Array<{ tag: string; name: string; level: number; badgeUrl: string | null; isOurs: boolean }>;
  wars: CWLWar[];
};

const RESULT_COLOR: Record<string, string> = {
  win:     "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  lose:    "text-red-400 bg-red-400/10 border-red-400/30",
  tie:     "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  inWar:   "text-blue-400 bg-blue-400/10 border-blue-400/30",
  upcoming:"text-muted-foreground bg-secondary/40 border-border/40",
  unknown: "text-muted-foreground bg-secondary/40 border-border/40",
};
const RESULT_LABEL: Record<string, string> = {
  win: "Victoria", lose: "Derrota", tie: "Empate",
  inWar: "En curso", upcoming: "Próxima", unknown: "—",
};

function Stars({ count, max }: { count: number; max: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < count ? "text-yellow-400 fill-yellow-400" : "text-border"}`} />
      ))}
    </span>
  );
}

export default function CWLTab({ clanTag }: { clanTag: string }) {
  const [cwl, setCwl] = useState<CWLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openRound, setOpenRound] = useState<number | null>(null);

  useEffect(() => {
    if (!clanTag) return;
    setLoading(true); setError(null);
    fetch(`/api/clan/${clanTag}/cwl`)
      .then((r) => r.ok ? r.json() : r.json().then((j: { error?: string }) => Promise.reject(new Error(j.error ?? `Error ${r.status}`))))
      .then((d: CWLData) => {
        setCwl(d);
        // Auto-open the last completed round
        const lastDone = [...(d.wars ?? [])].reverse().find((w) => w.result !== "upcoming");
        if (lastDone) setOpenRound(lastDone.round);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clanTag]);

  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-card/50 border border-border/30 animate-pulse" />)}</div>;
  if (error) return <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>;
  if (!cwl || cwl.state === "notFound") return (
    <div className="text-center py-10 space-y-2">
      <Trophy className="w-10 h-10 text-muted-foreground mx-auto" />
      <p className="font-semibold">No hay CWL activa</p>
      <p className="text-muted-foreground text-sm">La Liga de Guerras de Clanes no está en progreso este mes.</p>
    </div>
  );

  const totalStars = cwl.wars.filter((w) => ["win","lose","tie"].includes(w.result)).reduce((s, w) => s + w.ourStars, 0);
  const wins = cwl.wars.filter((w) => w.result === "win").length;
  const losses = cwl.wars.filter((w) => w.result === "lose").length;

  // Member star totals across all CWL wars
  const memberStars: Record<string, { name: string; stars: number; attacks: number }> = {};
  for (const war of cwl.wars) {
    for (const m of war.members) {
      if (!memberStars[m.tag]) memberStars[m.tag] = { name: m.name, stars: 0, attacks: 0 };
      for (const a of m.attacks) {
        memberStars[m.tag].stars += a.stars;
        memberStars[m.tag].attacks += 1;
      }
    }
  }
  const topContributors = Object.values(memberStars).sort((a, b) => b.stars - a.stars).slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border border-border/50 rounded-xl bg-card/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold tracking-wider text-lg">Liga de Guerras</h3>
            {cwl.season && <p className="text-xs text-muted-foreground font-mono">Temporada {cwl.season}</p>}
          </div>
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-secondary/40 rounded-lg p-2">
            <p className="text-lg font-bold text-emerald-400">{wins}</p><p className="text-xs text-muted-foreground">victorias</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-2">
            <p className="text-lg font-bold text-red-400">{losses}</p><p className="text-xs text-muted-foreground">derrotas</p>
          </div>
          <div className="bg-secondary/40 rounded-lg p-2">
            <p className="text-lg font-bold text-yellow-400">{totalStars}⭐</p><p className="text-xs text-muted-foreground">estrellas</p>
          </div>
        </div>
      </div>

      {/* Group clans */}
      <div>
        <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">Clanes del grupo</h3>
        <div className="grid grid-cols-2 gap-2">
          {cwl.clans.map((clan) => (
            <div key={clan.tag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${clan.isOurs ? "border-primary/40 bg-primary/10" : "border-border/30 bg-secondary/20"}`}>
              {clan.badgeUrl && <img src={clan.badgeUrl} alt="" className="w-7 h-7 shrink-0" />}
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${clan.isOurs ? "text-primary" : ""}`}>{clan.name}</p>
                <p className="text-[10px] text-muted-foreground">Nivel {clan.level}</p>
              </div>
              {clan.isOurs && <span className="text-[10px] text-primary ml-auto shrink-0">Nuestro</span>}
            </div>
          ))}
        </div>
      </div>

      {/* War rounds */}
      <div>
        <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">Rondas</h3>
        <div className="space-y-2">
          {cwl.wars.map((war) => {
            const r = RESULT_COLOR[war.result] ?? RESULT_COLOR.unknown;
            const isOpen = openRound === war.round;
            return (
              <div key={war.round} className="border border-border/40 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-3 bg-card/50 hover:bg-card/80 transition-colors text-left"
                  onClick={() => setOpenRound(isOpen ? null : war.round)}
                >
                  <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">Ronda {war.round}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${r}`}>{RESULT_LABEL[war.result] ?? "—"}</span>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {war.opponentBadgeUrl && <img src={war.opponentBadgeUrl} alt="" className="w-5 h-5" />}
                      <span className="text-xs truncate max-w-[120px]">vs {war.opponentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                      <Stars count={Math.min(war.ourStars, 3)} max={3} />
                      <span className="text-muted-foreground">{war.ourStars} – {war.opponentStars}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-border/30 p-3 bg-card/20 space-y-3">
                    {/* Score detail */}
                    <div className="grid grid-cols-2 gap-3 text-center text-xs">
                      <div>
                        <p className="font-bold text-base">{war.ourStars}⭐</p>
                        <p className="text-muted-foreground">{war.ourDestructionPercentage.toFixed(1)}%</p>
                        <p className="text-muted-foreground">{war.ourAttacks} ataques</p>
                      </div>
                      <div>
                        <p className="font-bold text-base text-muted-foreground">{war.opponentStars}⭐</p>
                        <p className="text-muted-foreground">{war.opponentDestructionPercentage.toFixed(1)}%</p>
                        <p className="text-muted-foreground">{war.opponentAttacks} ataques</p>
                      </div>
                    </div>

                    {/* Member attacks */}
                    {war.members.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Ataques de miembros</p>
                        {[...war.members].sort((a, b) => a.mapPosition - b.mapPosition).map((m) => (
                          <div key={m.tag} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-5 text-right font-mono">#{m.mapPosition}</span>
                            <span className="flex-1 truncate">{m.name}</span>
                            {m.attacks.length > 0
                              ? m.attacks.map((a, i) => (
                                  <span key={i} className="flex items-center gap-0.5">
                                    <Stars count={a.stars} max={3} />
                                    <span className="text-muted-foreground">{a.destructionPercentage.toFixed(0)}%</span>
                                  </span>
                                ))
                              : <span className="text-muted-foreground italic">—</span>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top contributors */}
      {topContributors.length > 0 && (
        <div>
          <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary mb-3">Top estrellas CWL</h3>
          <div className="space-y-1.5">
            {topContributors.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3 bg-card/40 border border-border/30 rounded-lg px-3 py-2">
                <span className="text-sm font-mono text-muted-foreground w-5">{i + 1}</span>
                <p className="flex-1 text-sm font-semibold truncate">{m.name}</p>
                <Stars count={Math.min(m.stars, 3)} max={3} />
                <span className="text-yellow-400 font-bold text-sm">{m.stars}⭐</span>
                <span className="text-xs text-muted-foreground">{m.attacks} atqs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
