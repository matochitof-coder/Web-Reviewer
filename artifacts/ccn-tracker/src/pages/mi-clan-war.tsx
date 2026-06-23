import { useEffect, useState } from "react";
import { Shield, Star, Swords, Clock, CheckCircle, XCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Attack = {
  defenderTag: string; stars: number; destructionPercentage: number; order: number; duration: number;
};

type WarMember = {
  tag: string; name: string; mapPosition: number; townhallLevel: number; side: string;
  attacks: Attack[];
  bestOpponentAttack: { attackerTag: string; stars: number; destructionPercentage: number } | null;
};

type WarSide = {
  tag: string; name: string; badgeUrl: string | null;
  stars: number; attacks: number; destructionPercentage: number;
  members: WarMember[];
};

type CurrentWar = {
  state: string;
  preparationStartTime?: string; startTime?: string; endTime?: string;
  teamSize?: number; attacksPerMember?: number;
  clan?: WarSide; opponent?: WarSide;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  preparation: { label: "⚙ Preparación", color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" },
  inWar:       { label: "⚔️ En guerra", color: "text-red-400 border-red-400/40 bg-red-400/10" },
  warEnded:    { label: "✅ Guerra finalizada", color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
  notInWar:    { label: "💤 Sin guerra activa", color: "text-muted-foreground border-border/40 bg-secondary/30" },
};

function Stars({ count, max }: { count: number; max: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < count ? "text-yellow-400 fill-yellow-400" : "text-border"}`} />
      ))}
    </span>
  );
}

function TimeLeft({ iso }: { iso: string }) {
  const end = new Date(
    iso.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6")
  );
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return <span className="text-xs text-muted-foreground">Finalizado</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return <span className="text-xs font-mono text-yellow-400 flex items-center gap-1"><Clock className="w-3 h-3" />{h}h {m}m</span>;
}

// ─── War Score ────────────────────────────────────────────────────────────────

function WarScore({ war }: { war: CurrentWar }) {
  const { clan, opponent } = war;
  if (!clan || !opponent) return null;

  const weWin = clan.stars > opponent.stars || (clan.stars === opponent.stars && clan.destructionPercentage > opponent.destructionPercentage);
  const tied  = clan.stars === opponent.stars && clan.destructionPercentage === opponent.destructionPercentage;

  return (
    <div className="border border-border/50 rounded-xl bg-card/60 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Our clan */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {clan.badgeUrl && <img src={clan.badgeUrl} alt="" className="w-12 h-12" />}
          <p className="font-display font-bold text-sm text-center truncate w-full text-center">{clan.name}</p>
          <div className="text-3xl font-bold text-primary">{clan.stars} ⭐</div>
          <p className="text-xs text-muted-foreground">{clan.destructionPercentage.toFixed(2)}%</p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="font-display font-black text-lg text-muted-foreground">VS</span>
          {war.state === "inWar" && war.endTime && <TimeLeft iso={war.endTime} />}
          {war.state === "preparation" && war.startTime && <TimeLeft iso={war.startTime} />}
          {(war.state === "warEnded") && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${weWin && !tied ? "text-emerald-400" : tied ? "text-yellow-400" : "text-red-400"}`}>
              {tied ? "EMPATE" : weWin ? "VICTORIA" : "DERROTA"}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{war.teamSize}v{war.teamSize}</span>
        </div>

        {/* Opponent */}
        <div className="flex-1 flex flex-col items-center gap-2">
          {opponent.badgeUrl && <img src={opponent.badgeUrl} alt="" className="w-12 h-12" />}
          <p className="font-display font-bold text-sm text-center truncate w-full text-center">{opponent.name}</p>
          <div className="text-3xl font-bold text-muted-foreground">{opponent.stars} ⭐</div>
          <p className="text-xs text-muted-foreground">{opponent.destructionPercentage.toFixed(2)}%</p>
        </div>
      </div>

      {/* Attack counters */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
        <div className="bg-secondary/40 rounded-lg p-2">
          <p className="font-bold text-foreground text-sm">{clan.attacks}</p>
          <p>ataques usados</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-2">
          <p className="font-bold text-foreground text-sm">{opponent.attacks}</p>
          <p>ataques rival</p>
        </div>
      </div>
    </div>
  );
}

// ─── Member Attack List ───────────────────────────────────────────────────────

function MemberAttackList({ war }: { war: CurrentWar }) {
  const { clan, opponent } = war;
  if (!clan || !opponent) return null;

  const attacksPerMember = war.attacksPerMember ?? 1;
  const opponentByTag = Object.fromEntries(opponent.members.map((m) => [m.tag, m]));
  const clanByTag = Object.fromEntries(clan.members.map((m) => [m.tag, m]));

  const sorted = [...clan.members].sort((a, b) => a.mapPosition - b.mapPosition);

  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold uppercase tracking-wider text-xs text-primary flex items-center gap-2">
        <Swords className="w-3.5 h-3.5" /> Ataques de miembros
      </h3>

      {sorted.map((member) => {
        const attacksDone = member.attacks.length;
        const remaining = attacksPerMember - attacksDone;
        const totalStars = member.attacks.reduce((s, a) => s + a.stars, 0);

        return (
          <div key={member.tag} className="border border-border/40 rounded-lg p-3 bg-card/40">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-5">#{member.mapPosition}</span>
                  <p className="font-semibold text-sm">{member.name}</p>
                  <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">TH{member.townhallLevel}</span>
                </div>
                {remaining > 0 && war.state === "inWar" && (
                  <p className="text-xs text-yellow-400 ml-7 mt-0.5">⚠ {remaining} ataque{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {attacksDone > 0
                  ? <Stars count={totalStars} max={attacksPerMember * 3} />
                  : <span className="text-xs text-muted-foreground italic">{war.state === "preparation" ? "—" : "No atacó"}</span>
                }
              </div>
            </div>

            {member.attacks.map((atk, i) => {
              const defender = opponentByTag[atk.defenderTag];
              return (
                <div key={i} className="ml-7 flex items-center gap-2 text-xs bg-secondary/30 rounded px-2 py-1 mb-1">
                  <Stars count={atk.stars} max={3} />
                  <span className="text-muted-foreground">{atk.destructionPercentage.toFixed(0)}%</span>
                  <span className="text-muted-foreground">→</span>
                  <span>#{defender?.mapPosition ?? "?"} {defender?.name ?? atk.defenderTag}</span>
                  <span className="text-muted-foreground ml-auto">TH{defender?.townhallLevel}</span>
                </div>
              );
            })}

            {member.bestOpponentAttack && (
              <div className="ml-7 flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded px-2 py-1 mt-1">
                <span className="text-red-400">🛡</span>
                <Stars count={member.bestOpponentAttack.stars} max={3} />
                <span className="text-muted-foreground">{member.bestOpponentAttack.destructionPercentage.toFixed(0)}%</span>
                <span className="text-muted-foreground ml-1">por {clanByTag[member.bestOpponentAttack.attackerTag]?.name ?? member.bestOpponentAttack.attackerTag}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function WarTab({ clanTag }: { clanTag: string }) {
  const [war, setWar] = useState<CurrentWar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clanTag) return;
    setLoading(true); setError(null);
    fetch(`/api/clan/${clanTag}/war`)
      .then((r) => r.ok ? r.json() : r.json().then((j: { error?: string }) => Promise.reject(new Error(j.error ?? `Error ${r.status}`))))
      .then((d: CurrentWar) => setWar(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clanTag]);

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-card/50 border border-border/30 animate-pulse" />)}</div>;
  if (error) return <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>;
  if (!war) return null;

  const stateInfo = STATE_LABELS[war.state] ?? STATE_LABELS.notInWar;

  return (
    <div className="space-y-5">
      <div className={`inline-flex items-center gap-2 border px-4 py-2 rounded-xl text-sm font-semibold ${stateInfo.color}`}>
        {stateInfo.label}
      </div>

      {war.state === "notInWar" && (
        <p className="text-muted-foreground text-sm">El clan no está en guerra actualmente.</p>
      )}

      {war.state !== "notInWar" && (
        <>
          <WarScore war={war} />
          {(war.state === "inWar" || war.state === "warEnded") && <MemberAttackList war={war} />}
        </>
      )}
    </div>
  );
}

// ─── War Log Tab ──────────────────────────────────────────────────────────────

type WarLogEntry = {
  result: string; endTime: string | null; teamSize: number; attacksPerMember: number;
  ourStars: number; ourDestructionPercentage: number; ourAttacks: number; expEarned: number;
  opponentName: string; opponentBadgeUrl: string | null;
  opponentStars: number; opponentDestructionPercentage: number;
};

const RESULT_STYLE: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  win:  { label: "Victoria", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", icon: <CheckCircle className="w-4 h-4" /> },
  lose: { label: "Derrota",  cls: "text-red-400 bg-red-400/10 border-red-400/30",             icon: <XCircle className="w-4 h-4" /> },
  tie:  { label: "Empate",   cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",    icon: <Shield className="w-4 h-4" /> },
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const fixed = iso.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5:$6");
    return new Date(fixed).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

export function WarLogTab({ clanTag }: { clanTag: string }) {
  const [wars, setWars] = useState<WarLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privateLog, setPrivateLog] = useState(false);

  useEffect(() => {
    if (!clanTag) return;
    setLoading(true); setError(null); setPrivateLog(false);
    fetch(`/api/clan/${clanTag}/warlog`)
      .then((r) => r.json() as Promise<{ wars?: WarLogEntry[]; error?: string; privateLog?: boolean }>)
      .then((d) => {
        if (d.error) { setError(d.error); setPrivateLog(d.privateLog ?? false); return; }
        setWars(d.wars ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [clanTag]);

  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-card/50 border border-border/30 animate-pulse" />)}</div>;

  if (privateLog || (error && error.includes("403"))) return (
    <div className="border border-border/50 bg-secondary/30 rounded-xl p-5 text-center space-y-2">
      <Shield className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="font-semibold">Registro de guerras privado</p>
      <p className="text-muted-foreground text-xs">El clan tiene el registro de guerras oculto. Un líder puede hacerlo público en la configuración del clan en Clash of Clans.</p>
    </div>
  );

  if (error) return <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>;
  if (!wars.length) return <p className="text-muted-foreground text-sm">No hay guerras registradas.</p>;

  const wins = wars.filter((w) => w.result === "win").length;
  const losses = wars.filter((w) => w.result === "lose").length;
  const ties = wars.filter((w) => w.result === "tie").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-3">
          <p className="text-xl font-bold text-emerald-400">{wins}</p>
          <p className="text-xs text-muted-foreground">victorias</p>
        </div>
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-3">
          <p className="text-xl font-bold text-red-400">{losses}</p>
          <p className="text-xs text-muted-foreground">derrotas</p>
        </div>
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">
          <p className="text-xl font-bold text-yellow-400">{ties}</p>
          <p className="text-xs text-muted-foreground">empates</p>
        </div>
      </div>

      {/* Wars list */}
      <div className="space-y-2">
        {wars.map((w, i) => {
          const r = RESULT_STYLE[w.result] ?? RESULT_STYLE.tie;
          return (
            <div key={i} className="border border-border/40 rounded-lg p-3 bg-card/40 flex items-center gap-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold shrink-0 ${r.cls}`}>
                {r.icon} {r.label}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {w.opponentBadgeUrl && <img src={w.opponentBadgeUrl} alt="" className="w-5 h-5 shrink-0" />}
                  <p className="text-sm font-semibold truncate">vs {w.opponentName}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(w.endTime)} · {w.teamSize}v{w.teamSize}</p>
              </div>
              <div className="text-right shrink-0 text-xs">
                <p className="font-bold">{w.ourStars}⭐ <span className="text-muted-foreground">vs</span> {w.opponentStars}⭐</p>
                <p className="text-muted-foreground">{w.ourDestructionPercentage.toFixed(1)}% vs {w.opponentDestructionPercentage.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
