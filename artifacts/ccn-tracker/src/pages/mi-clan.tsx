import { useEffect, useState } from "react";

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

const CLAN_TAG = "L0JVQGYR";

export default function MiClan() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/clan/${CLAN_TAG}/members`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el clan");
        return res.json();
      })
      .then((data) => setMembers(data.members ?? []))
      .catch((err) => setError(String(err.message ?? err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-display font-bold uppercase tracking-wider mb-4">
        Mi Clan
      </h1>

      {loading && <p className="text-muted-foreground">Cargando miembros...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.tag}
              className="flex items-center justify-between border border-border/50 rounded-lg p-3 bg-card/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm w-6 text-right">
                  {m.clanRank}
                </span>
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.role} · Nivel {m.level}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p>🏆 {m.trophies}</p>
                <p className="text-xs text-muted-foreground">⬆ {m.donations} / ⬇ {m.donationsReceived}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
