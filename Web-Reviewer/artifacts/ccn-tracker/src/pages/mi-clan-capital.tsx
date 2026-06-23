import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

type CapitalMember = { tag: string; name: string; attacks: number; attackLimit: number; bonusAttackLimit: number; looted: number };
type CapitalRaid = { defenderName: string; defenderBadgeUrl: string | null; defenderLevel: number; attacks: number; districtsDestroyed: number; districts: Array<{ name: string; destructionPercent: number; attackCount: number; looted: number }> };
type CapitalDefense = { attackerName: string; attackerBadgeUrl: string | null; attacks: number; districtsDestroyed: number };

type CapitalSeason = {
  state: string; startTime: string; endTime: string;
  totalAttacks: number; enemyDistrictsDestroyed: number; capitalTotalLoot: number;
  raidsCompleted: number; totalRaids: number;
  offensiveReward: number; defensiveReward: number;
  members: CapitalMember[];
  raids: CapitalRaid[];
  defenses: CapitalDefense[];
};

function formatDate(iso: string) {
  try {
    const fixed = iso.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6");
    return new Date(fixed).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-secondary/50 border border-border/30 rounded-xl p-3 text-center">
      <p className="text-lg font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-primary">{sub}</p>}
    </div>
  );
}

function SeasonCard({ season, index }: { season: CapitalSeason; index: number }) {
  const [tab, setTab] = useState<"members" | "raids" | "defenses">("members");

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/80 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-display font-bold tracking-wider text-sm">
            {index === 0 ? "Último raid" : `Raid anterior (${index})`}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(season.startTime)} → {formatDate(season.endTime)}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${season.state === "ended" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" : "text-blue-400 border-blue-400/30 bg-blue-400/10"}`}>
          {season.state === "ended" ? "Finalizado" : "En curso"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatCard label="Oro del capital" value={season.capitalTotalLoot} />
          <StatCard label="Ataques totales" value={season.totalAttacks} />
          <StatCard label="Distritos destruidos" value={season.enemyDistrictsDestroyed} />
          <StatCard label="Raids completados" value={`${season.raidsCompleted}/${season.totalRaids}`} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="Recompensa ofensiva" value={`${season.offensiveReward} 🏆`} />
          <StatCard label="Recompensa defensiva" value={`${season.defensiveReward} 🏆`} />
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-secondary/40 p-1 rounded-lg border border-border/30 mb-4">
          {(["members", "raids", "defenses"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 text-xs py-1.5 rounded-md font-semibold transition-all ${tab === t ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "members" ? "👥 Participantes" : t === "raids" ? "⚔️ Ataques" : "🛡 Defensas"}
            </button>
          ))}
        </div>

        {/* Members */}
        {tab === "members" && (
          <div className="space-y-1.5">
            {season.members.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Sin datos de participantes.</p>}
            {season.members.map((m, i) => {
              const usedAttacks = m.attacks;
              const totalLimit = m.attackLimit + m.bonusAttackLimit;
              const pct = Math.round((usedAttacks / Math.max(totalLimit, 1)) * 100);
              return (
                <div key={m.tag} className="flex items-center gap-3 border border-border/30 rounded-lg px-3 py-2 bg-card/30">
                  <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{usedAttacks}/{totalLimit} atqs</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-yellow-400">{m.looted.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">oro</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Raids (attack log) */}
        {tab === "raids" && (
          <div className="space-y-3">
            {season.raids.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Sin datos de ataques.</p>}
            {season.raids.map((raid, i) => (
              <div key={i} className="border border-border/30 rounded-xl bg-card/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {raid.defenderBadgeUrl && <img src={raid.defenderBadgeUrl} alt="" className="w-6 h-6" />}
                    <div>
                      <p className="text-sm font-semibold">{raid.defenderName}</p>
                      <p className="text-xs text-muted-foreground">Nivel {raid.defenderLevel}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold">{raid.districtsDestroyed} distritos</p>
                    <p className="text-muted-foreground">{raid.attacks} ataques</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {raid.districts.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                      <div className="w-16 h-1.5 bg-border/40 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${d.destructionPercent >= 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${d.destructionPercent}%` }} />
                      </div>
                      <span className="font-mono w-8 text-right">{d.destructionPercent.toFixed(0)}%</span>
                      <span className="text-yellow-400 w-16 text-right">{d.looted.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Defenses */}
        {tab === "defenses" && (
          <div className="space-y-2">
            {season.defenses.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Sin defensas registradas.</p>}
            {season.defenses.map((d, i) => (
              <div key={i} className="flex items-center gap-3 border border-border/30 rounded-lg px-3 py-2 bg-card/30">
                {d.attackerBadgeUrl && <img src={d.attackerBadgeUrl} alt="" className="w-7 h-7 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.attackerName}</p>
                  <p className="text-xs text-muted-foreground">{d.attacks} ataques · {d.districtsDestroyed} distritos</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${d.districtsDestroyed > 0 ? "text-red-400 border-red-400/30 bg-red-400/10" : "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"}`}>
                  {d.districtsDestroyed > 0 ? `${d.districtsDestroyed} caídos` : "Defendido"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CapitalTab({ clanTag }: { clanTag: string }) {
  const [seasons, setSeasons] = useState<CapitalSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clanTag) return;
    setLoading(true); setError(null);
    fetch(`/api/clan/${clanTag}/capital`)
      .then((r) => r.ok ? r.json() : r.json().then((j: { error?: string }) => Promise.reject(new Error(j.error ?? `Error ${r.status}`))))
      .then((d: { seasons: CapitalSeason[] }) => setSeasons(d.seasons ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clanTag]);

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-card/50 border border-border/30 animate-pulse" />)}</div>;
  if (error) return <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>;
  if (!seasons.length) return (
    <div className="text-center py-10 space-y-2">
      <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
      <p className="font-semibold">Sin datos de Capital</p>
      <p className="text-muted-foreground text-sm">No hay temporadas de raids de capital disponibles.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {seasons.map((s, i) => <SeasonCard key={i} season={s} index={i} />)}
    </div>
  );
}
