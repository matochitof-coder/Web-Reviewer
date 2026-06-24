import { useEffect, useState, useCallback } from "react";
import { X, Shield, Trophy, Swords, Users, Star, Globe, Lock, Unlock, ChevronRight } from "lucide-react";

type ClanDetail = {
  name: string; tag: string; description: string | null; level: number;
  memberCount: number; trophies: number; builderBaseTrophies: number;
  warWins: number; warTies: number; warLosses: number; warWinStreak: number;
  warLogPublic: boolean; warFrequency: string | null;
  badgeUrl: string | null; location: string | null;
  requiredTrophies: number; type: string | null;
};

type Member = {
  tag: string; name: string; role: string; level: number;
  trophies: number; builderBaseTrophies: number;
  donations: number; donationsReceived: number;
  clanRank: number;
  leagueName: string | null; leagueIconUrl: string | null;
};

type Props = {
  clanTag: string | null;
  clanName?: string | null;
  clanBadgeUrl?: string | null;
  onClose: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  leader: "Líder", coLeader: "Colíder", admin: "Colíder", elder: "Veterano", member: "Miembro"
};

const FREQ_LABELS: Record<string, string> = {
  always: "Siempre", moreThanOncePerWeek: "2+ /semana",
  oncePerWeek: "1/semana", lessThanOncePerWeek: "Rara vez",
  never: "Nunca", unknown: "Desconocida"
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  open: <Unlock className="w-3.5 h-3.5 text-emerald-400" />,
  inviteOnly: <Shield className="w-3.5 h-3.5 text-yellow-400" />,
  closed: <Lock className="w-3.5 h-3.5 text-red-400" />,
};
const TYPE_LABELS: Record<string, string> = {
  open: "Abierto", inviteOnly: "Solo con invitación", closed: "Cerrado"
};

function WinRateBar({ wins, ties, losses }: { wins: number; ties: number; losses: number }) {
  const total = wins + ties + losses;
  if (total === 0) return null;
  const wPct = (wins / total) * 100;
  const tPct = (ties / total) * 100;
  const lPct = (losses / total) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${wPct}%` }} />
        <div className="bg-yellow-500 transition-all" style={{ width: `${tPct}%` }} />
        <div className="bg-red-500 rounded-r-full transition-all" style={{ width: `${lPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono">
        <span className="text-emerald-400">✓ {wins} Victorias</span>
        <span className="text-yellow-400">~ {ties} Empates</span>
        <span className="text-red-400">✗ {losses} Derrotas</span>
      </div>
    </div>
  );
}

export default function ClanModal({ clanTag, clanName, clanBadgeUrl, onClose }: Props) {
  const [clan, setClan] = useState<ClanDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingClan, setLoadingClan] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [tab, setTab] = useState<"info" | "miembros">("info");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (tag: string) => {
    setLoadingClan(true); setError(null);
    try {
      const encodedTag = encodeURIComponent(tag.replace(/^#?/, "#"));
      const [cRes, mRes] = await Promise.all([
        fetch(`/api/clan/${encodedTag.replace("%23", "%23")}`),
        fetch(`/api/clan/${encodedTag.replace("%23", "%23")}/members`),
      ]);
      const cData = await cRes.json() as ClanDetail & { error?: string };
      if (cData.error) throw new Error(cData.error);
      setClan(cData);

      const mData = await mRes.json() as { members?: Member[]; error?: string };
      setMembers((mData.members ?? []).slice(0, 50));
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoadingClan(false); setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (!clanTag) return;
    void load(clanTag);
  }, [clanTag, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!clanTag) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:w-[520px] max-h-[90dvh] md:max-h-[80vh] bg-background border border-border/60 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300">
        {/* Handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          {(clan?.badgeUrl ?? clanBadgeUrl) && (
            <img src={clan?.badgeUrl ?? clanBadgeUrl ?? ""} alt="" className="w-12 h-12 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-lg leading-tight truncate">{clan?.name ?? clanName ?? "Cargando..."}</p>
            <p className="text-xs text-muted-foreground font-mono">{clanTag}</p>
            {clan && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-semibold text-primary">Nv.{clan.level}</span>
                {clan.type && (
                  <div className="flex items-center gap-1">
                    {TYPE_ICONS[clan.type] ?? <Shield className="w-3.5 h-3.5" />}
                    <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[clan.type] ?? clan.type}</span>
                  </div>
                )}
                {clan.location && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Globe className="w-3 h-3" /> {clan.location}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50">
          {(["info", "miembros"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-colors ${
                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "info" ? "ℹ️ Info" : `👥 Miembros (${members.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loadingClan && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />)}
            </div>
          )}

          {error && !loadingClan && (
            <div className="text-center py-8 space-y-2">
              <Shield className="w-10 h-10 text-red-400/40 mx-auto" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {clan && !loadingClan && tab === "info" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "🏆", label: "Trofeos", value: clan.trophies.toLocaleString() },
                  { icon: "👥", label: "Miembros", value: `${clan.memberCount}/50` },
                  { icon: "🏰", label: "Trofeos mín.", value: clan.requiredTrophies.toLocaleString() },
                  { icon: "⚔️", label: "Frecuencia guerra", value: FREQ_LABELS[clan.warFrequency ?? ""] ?? clan.warFrequency ?? "—" },
                ].map((s) => (
                  <div key={s.label} className="border border-border/40 rounded-xl bg-card/50 p-3">
                    <p className="text-sm">{s.icon}</p>
                    <p className="font-bold text-sm mt-0.5">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* War record */}
              {(clan.warWins + clan.warTies + clan.warLosses > 0) && (
                <div className="border border-border/40 rounded-xl bg-card/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-display font-bold">
                      <Swords className="w-4 h-4 text-primary" /> Historial de guerra
                    </div>
                    {clan.warWinStreak > 0 && (
                      <div className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
                        <Star className="w-3.5 h-3.5" /> {clan.warWinStreak} racha
                      </div>
                    )}
                  </div>
                  <WinRateBar wins={clan.warWins} ties={clan.warTies} losses={clan.warLosses} />
                </div>
              )}

              {/* Description */}
              {clan.description && (
                <div className="border border-border/40 rounded-xl bg-card/50 p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Descripción</p>
                  <p className="text-sm leading-relaxed">{clan.description}</p>
                </div>
              )}
            </>
          )}

          {!loadingClan && tab === "miembros" && (
            <div className="space-y-1.5">
              {members.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Sin miembros</p>}
              {members.map((m) => (
                <div key={m.tag} className="flex items-center gap-3 border border-border/30 rounded-lg px-3 py-2.5 bg-card/40 hover:bg-card/70 transition-all">
                  <span className="w-5 text-center font-mono text-xs text-muted-foreground shrink-0">{m.clanRank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {m.leagueIconUrl && <img src={m.leagueIconUrl} alt="" className="w-4 h-4 shrink-0" />}
                      <p className="font-semibold text-sm truncate">{m.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-black ${
                        m.role === "leader" ? "bg-yellow-400" :
                        m.role === "coLeader" || m.role === "admin" ? "bg-orange-400" :
                        m.role === "elder" ? "bg-blue-400" : "bg-secondary text-muted-foreground"
                      }`}>{ROLE_LABELS[m.role] ?? m.role}</span>
                      <span className="text-[10px] text-muted-foreground">Nv.{m.level}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">🏆 {m.trophies.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">↑{m.donations} ↓{m.donationsReceived}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
