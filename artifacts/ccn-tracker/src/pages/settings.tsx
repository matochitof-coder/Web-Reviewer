import { useState, useEffect } from "react";
import { Shield, Save, RotateCcw, CheckCircle } from "lucide-react";

const DEFAULT_CLAN_TAG = "L0JVQGYR";
const STORAGE_KEY = "ccn_clan_tag";

export function getClanTag(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CLAN_TAG;
}

export default function Settings() {
  const [clanTag, setClanTag] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<{ name?: string; members?: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    setClanTag(getClanTag());
  }, []);

  function normalizeTag(raw: string): string {
    return raw.trim().replace(/^#/, "").toUpperCase();
  }

  function handleSave() {
    const tag = normalizeTag(clanTag);
    if (!tag) return;
    localStorage.setItem(STORAGE_KEY, tag);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    setClanTag(DEFAULT_CLAN_TAG);
    setPreview(null);
    setCheckError(null);
  }

  async function handleCheck() {
    const tag = normalizeTag(clanTag);
    if (!tag) return;
    setChecking(true);
    setPreview(null);
    setCheckError(null);
    try {
      const res = await fetch(`/api/clan/${tag}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { name?: string; members?: number };
      setPreview({ name: data.name, members: data.members });
    } catch (err) {
      setCheckError(String((err as Error).message ?? err));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personaliza tu tracker sin tocar el código.
        </p>
      </div>

      <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-5">
        <div>
          <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary mb-1">
            Tu Clan
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            El tag de tu clan de Clash of Clans (sin el #). Se guarda en tu navegador.
          </p>

          <label className="block text-sm font-medium mb-2" htmlFor="clan-tag">
            Tag del Clan
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center border border-border rounded-md bg-background overflow-hidden focus-within:border-primary/60 transition-colors">
              <span className="px-3 text-muted-foreground font-mono text-sm select-none">#</span>
              <input
                id="clan-tag"
                type="text"
                value={clanTag}
                onChange={(e) => {
                  setClanTag(e.target.value.replace(/^#/, "").toUpperCase());
                  setPreview(null);
                  setCheckError(null);
                }}
                placeholder={DEFAULT_CLAN_TAG}
                className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-mono outline-none placeholder:text-muted-foreground/40"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={checking || !clanTag.trim()}
              className="px-4 py-2.5 rounded-md border border-border/60 bg-secondary text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checking ? "..." : "Verificar"}
            </button>
          </div>

          {preview && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-3 py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{preview.name}</strong> · {preview.members} miembros
              </span>
            </div>
          )}
          {checkError && (
            <p className="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
              {checkError}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!clanTag.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Guardado
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border/60 text-muted-foreground text-sm hover:text-foreground hover:border-border transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Resetear
          </button>
        </div>
      </div>

      <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-3">
        <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary">
          Estado del API
        </h2>
        <p className="text-xs text-muted-foreground">
          Si "Mi Clan" no carga, verifica que el servidor tiene las credenciales correctas.
        </p>
        <a
          href="/api/clan/debug"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-mono text-primary/80 hover:text-primary border border-primary/20 hover:border-primary/40 bg-primary/5 px-3 py-2 rounded-md transition-all"
        >
          Abrir diagnóstico del API →
        </a>
      </div>
    </div>
  );
}
