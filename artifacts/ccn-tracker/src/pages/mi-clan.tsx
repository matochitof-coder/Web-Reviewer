import { useEffect, useState } from "react";
import { getClanTag } from "./settings";
import { Link } from "wouter";
import { Settings } from "lucide-react";

type Member = {
  tag: string;
  name: string;
  role: string;
  level: number;
  trophies: number;
  donations: number;
  donationsReceived: number;
  clanRank: number;
  rankChange: number;
  leagueName: string | null;
  leagueIconUrl: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  leader: "Líder",
  coLeader: "Co-líder",
  admin: "Anciano",
  member: "Miembro",
};

function RankChange({ change }: { change: number }) {
  if (change === 0) return <span className="text-muted-foreground text-xs">—</span>;
  if (change > 0)
    return <span className="text-emerald-400 text-xs">▲ {change}</span>;
  return <span className="text-red-400 text-xs">▼ {Math.abs(change)}</span>;
}

export default function MiClan() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clanTag, setClanTag] = useState("");

  useEffect(() => {
    const tag = getClanTag();
    setClanTag(tag);
    setLoading(true);
    setError(null);

    fetch(`/api/clan/${tag}/members`)
      .then((res) => {
        if (!res.ok) return res.json().then((j: { error?: string }) => { throw new Error(j.error ?? `Error ${res.status}`); });
        return res.json();
      })
      .then((data: { members: Member[] }) => setMembers(data.members ?? []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wider">
            Mi Clan
          </h1>
          {clanTag && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              #{clanTag}
            </p>
          )}
        </div>
        <Link href="/configuracion">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-md transition-all">
            <Settings className="w-3.5 h-3.5" />
            Cambiar clan
          </button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-card/50 border border-border/30 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-5 space-y-2">
          <p className="text-red-400 font-semibold text-sm">No se pudo cargar el clan</p>
          <p className="text-red-400/80 text-xs font-mono">{error}</p>
          <p className="text-muted-foreground text-xs mt-2">
            Verifica las credenciales del API en{" "}
            <Link href="/configuracion" className="text-primary hover:underline">
              Configuración
            </Link>
            .
          </p>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <p className="text-muted-foreground text-sm">No se encontraron miembros.</p>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.tag}
              className="flex items-center justify-between border border-border/50 rounded-lg p-3 bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-center w-8 shrink-0">
                  <span className="text-muted-foreground text-sm font-mono leading-none">{m.clanRank}</span>
                  <div className="flex justify-center mt-0.5">
                    <RankChange change={m.rankChange} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.leagueIconUrl && (
                    <img src={m.leagueIconUrl} alt={m.leagueName ?? ""} className="w-7 h-7 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-sm leading-tight">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[m.role] ?? m.role} · Nv.{m.level}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm shrink-0">
                <p className="font-semibold">🏆 {m.trophies.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  ⬆ {m.donations} / ⬇ {m.donationsReceived}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
