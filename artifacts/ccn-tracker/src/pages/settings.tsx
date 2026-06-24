import { useState, useEffect } from "react";
import { Shield, Save, RotateCcw, CheckCircle, Palette, Type, Globe, Lock, Bell, Database, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useTheme, COLOR_THEMES, FONT_PRESETS } from "@/context/theme";
import { useLang, type Lang } from "@/context/lang";

export const STORAGE_KEY = "ccn_clan_tag";
const ACCESS_CODE = "SHOOZARD";
const SESSION_KEY = "ccn_settings_unlocked";

// Migration: erase the old hardcoded default clan so the page opens clean
const OLD_DEFAULTS = ["L0JVQGYR", "l0jvqgyr"];
(function clearOldDefault() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && OLD_DEFAULTS.includes(stored.toUpperCase())) {
    localStorage.removeItem(STORAGE_KEY);
  }
})();

export function getClanTag(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

type Tab = "clan" | "look" | "lang" | "avanzado" | "notificaciones";

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [shake, setShake] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.toUpperCase() === ACCESS_CODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => { setShake(false); setError(false); setCode(""); }, 1200);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-3">
        <div className={`w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center ${shake ? "animate-bounce" : ""}`}>
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold uppercase tracking-wider">Configuración Protegida</h1>
        <p className="text-sm text-muted-foreground">Ingresa el código de acceso para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type={showCode ? "text" : "password"}
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(false); }}
            placeholder="CÓDIGO DE ACCESO"
            autoFocus
            className={`w-full border rounded-xl bg-card px-4 py-3 text-center font-mono font-bold text-lg uppercase tracking-widest outline-none transition-all pr-12 ${
              error
                ? "border-red-500/60 bg-red-500/5 text-red-400"
                : "border-border focus:border-primary/60"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && (
          <p className="text-center text-sm text-red-400 font-mono animate-in fade-in">
            Código incorrecto. Inténtalo de nuevo.
          </p>
        )}
        <button
          type="submit"
          disabled={!code.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold uppercase tracking-wider hover:bg-primary/90 transition-all disabled:opacity-40"
        >
          Acceder
        </button>
      </form>
    </div>
  );
}

export default function Settings() {
  const { colorId, fontId, appName, setColor, setFont, setAppName } = useTheme();
  const { lang, setLang, t } = useLang();

  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("clan");

  const [clanTag, setClanTag] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<{ name?: string; members?: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState(appName);
  const [nameSaved, setNameSaved] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem("ccn_auto_refresh") ?? "5");
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem("ccn_compact") === "1");
  const [showElo, setShowElo] = useState(() => localStorage.getItem("ccn_show_elo") !== "0");
  const [warAlerts, setWarAlerts] = useState(() => localStorage.getItem("ccn_war_alerts") !== "0");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setUnlocked(true);
  }, []);

  useEffect(() => { setClanTag(getClanTag()); }, []);
  useEffect(() => { setNameInput(appName); }, [appName]);

  function normalizeTag(raw: string) { return raw.trim().replace(/^#/, "").toUpperCase(); }

  function handleClanSave() {
    const tag = normalizeTag(clanTag);
    if (!tag) return;
    localStorage.setItem(STORAGE_KEY, tag);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClanReset() {
    localStorage.removeItem(STORAGE_KEY);
    setClanTag("");
    setPreview(null);
    setCheckError(null);
  }

  async function handleCheck() {
    const tag = normalizeTag(clanTag);
    if (!tag) return;
    setChecking(true); setPreview(null); setCheckError(null);
    try {
      const res = await fetch(`/api/clan/${tag}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { name?: string; memberCount?: number };
      setPreview({ name: data.name, members: data.memberCount });
    } catch (err) { setCheckError(String((err as Error).message ?? err)); }
    finally { setChecking(false); }
  }

  function handleNameSave() {
    setAppName(nameInput);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  function handleClearCache() {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("ccn_cache_"));
    keys.forEach((k) => localStorage.removeItem(k));
  }

  function handleResetAll() {
    if (!window.confirm("¿Resetear toda la configuración? Esto borrará todos los ajustes guardados.")) return;
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  const tabs = [
    { id: "clan" as Tab, label: t("cfg_tab_clan"), icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "look" as Tab, label: t("cfg_tab_look"), icon: <Palette className="w-3.5 h-3.5" /> },
    { id: "lang" as Tab, label: t("cfg_tab_lang"), icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "notificaciones" as Tab, label: "Alertas", icon: <Bell className="w-3.5 h-3.5" /> },
    { id: "avanzado" as Tab, label: "Avanzado", icon: <Database className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> {t("cfg_title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("cfg_subtitle")}</p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); setUnlocked(false); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:border-border px-3 py-1.5 rounded-md transition-all"
        >
          <Lock className="w-3.5 h-3.5" /> Bloquear
        </button>
      </div>

      <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
        <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl border border-border/30 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-display font-semibold tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "clan" && (
        <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-5">
          <div>
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary mb-1">{t("cfg_tab_clan")}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t("cfg_clan_hint")}</p>
            <label className="block text-sm font-medium mb-2" htmlFor="clan-tag">{t("cfg_clan_title")}</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-border rounded-md bg-background overflow-hidden focus-within:border-primary/60 transition-colors">
                <span className="px-3 text-muted-foreground font-mono text-sm select-none">#</span>
                <input
                  id="clan-tag" type="text" value={clanTag}
                  onChange={(e) => { setClanTag(e.target.value.replace(/^#/, "").toUpperCase()); setPreview(null); setCheckError(null); }}
                  className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-mono outline-none placeholder:text-muted-foreground/40"
                  spellCheck={false} autoComplete="off" placeholder="TAG DEL CLAN"
                />
              </div>
              <button
                onClick={handleCheck} disabled={checking || !clanTag.trim()}
                className="px-4 py-2.5 rounded-md border border-border/60 bg-secondary text-sm font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
              >
                {checking ? "..." : t("cfg_verify")}
              </button>
            </div>
            {preview && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-3 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span><strong>{preview.name}</strong> · {preview.members} {lang === "es" ? "miembros" : "members"}</span>
              </div>
            )}
            {checkError && (
              <p className="mt-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">{checkError}</p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClanSave} disabled={!clanTag.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-40"
            >
              {saved ? <><CheckCircle className="w-4 h-4" /> {t("cfg_saved")}</> : <><Save className="w-4 h-4" /> {t("cfg_save")}</>}
            </button>
            <button onClick={handleClanReset} className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-border/60 text-muted-foreground text-sm hover:text-foreground transition-all">
              <RotateCcw className="w-4 h-4" /> {t("cfg_reset")}
            </button>
          </div>
          <div className="border-t border-border/30 pt-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary mb-1">{t("cfg_api_title")}</h2>
            <p className="text-xs text-muted-foreground mb-3">{t("cfg_api_hint")}</p>
            <a href="/api/clan/debug" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-mono text-primary/80 hover:text-primary border border-primary/20 hover:border-primary/40 bg-primary/5 px-3 py-2 rounded-md transition-all">
              {t("cfg_api_link")}
            </a>
          </div>
        </div>
      )}

      {activeTab === "look" && (
        <div className="space-y-5">
          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Palette className="w-4 h-4" /> {t("cfg_color_title")}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_THEMES.map((theme) => {
                const isActive = colorId === theme.id;
                return (
                  <button key={theme.id} onClick={() => setColor(theme.id)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${isActive ? "border-primary/60 bg-primary/10" : "border-border/40 bg-secondary/30 hover:border-border"}`}>
                    <div className="w-8 h-8 rounded-full shadow-lg"
                      style={{ background: `hsl(${theme.primary})`, boxShadow: isActive ? `0 0 12px hsl(${theme.primary})` : undefined }} />
                    <span className="text-[10px] text-center text-muted-foreground leading-tight">
                      {lang === "es" ? theme.name : theme.nameEn}
                    </span>
                    {isActive && <CheckCircle className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Type className="w-4 h-4" /> {t("cfg_font_title")}
            </h2>
            <div className="space-y-2">
              {FONT_PRESETS.map((preset) => {
                const isActive = fontId === preset.id;
                return (
                  <button key={preset.id} onClick={() => setFont(preset.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isActive ? "border-primary/60 bg-primary/10" : "border-border/40 bg-secondary/30 hover:border-border"}`}>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{lang === "es" ? preset.name : preset.nameEn}</p>
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: preset.display }}>
                        CCN WAR TRACKER — Aa Bb Cc
                      </p>
                    </div>
                    {isActive && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary">{t("cfg_name_title")}</h2>
            <p className="text-xs text-muted-foreground">{t("cfg_name_hint")}</p>
            <div className="flex gap-2">
              <input
                type="text" value={nameInput} maxLength={20}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t("cfg_name_ph")}
                className="flex-1 border border-border rounded-md bg-background px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wider outline-none focus:border-primary/60 transition-colors"
              />
              <button onClick={handleNameSave}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all">
                {nameSaved ? <><CheckCircle className="w-4 h-4" /> {t("cfg_saved")}</> : <><Save className="w-4 h-4" /> {t("cfg_save")}</>}
              </button>
            </div>
          </div>

          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary">Opciones de vista</h2>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Modo compacto</p>
                <p className="text-xs text-muted-foreground">Reduce el espaciado entre elementos</p>
              </div>
              <button
                onClick={() => { setCompactMode((v) => !v); localStorage.setItem("ccn_compact", compactMode ? "0" : "1"); }}
                className={`w-11 h-6 rounded-full border transition-all relative ${compactMode ? "bg-primary border-primary/60" : "bg-secondary border-border/50"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${compactMode ? "left-5" : "left-0.5"}`} />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Mostrar ELO en ranking</p>
                <p className="text-xs text-muted-foreground">Muestra puntos ELO en la clasificación</p>
              </div>
              <button
                onClick={() => { setShowElo((v) => !v); localStorage.setItem("ccn_show_elo", showElo ? "0" : "1"); }}
                className={`w-11 h-6 rounded-full border transition-all relative ${showElo ? "bg-primary border-primary/60" : "bg-secondary border-border/50"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${showElo ? "left-5" : "left-0.5"}`} />
              </button>
            </label>
          </div>
        </div>
      )}

      {activeTab === "lang" && (
        <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-5">
          <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
            <Globe className="w-4 h-4" /> {t("cfg_lang_title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("cfg_lang_hint")}</p>
          <div className="grid grid-cols-2 gap-3">
            {(["es", "en"] as Lang[]).map((l) => {
              const isActive = lang === l;
              const flag = l === "es" ? "🇪🇸" : "🇬🇧";
              const label = l === "es" ? "Español" : "English";
              return (
                <button key={l} onClick={() => setLang(l)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${isActive ? "border-primary/60 bg-primary/10" : "border-border/40 bg-secondary/30 hover:border-border"}`}>
                  <span className="text-4xl">{flag}</span>
                  <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{label}</span>
                  {isActive && <CheckCircle className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "notificaciones" && (
        <div className="space-y-4">
          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-5">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Bell className="w-4 h-4" /> Alertas de Guerra
            </h2>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Alertas de guerra en vivo</p>
                <p className="text-xs text-muted-foreground">Notificación cuando una guerra pase a "En Vivo"</p>
              </div>
              <button
                onClick={() => { setWarAlerts((v) => !v); localStorage.setItem("ccn_war_alerts", warAlerts ? "0" : "1"); }}
                className={`w-11 h-6 rounded-full border transition-all relative ${warAlerts ? "bg-primary border-primary/60" : "bg-secondary border-border/50"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${warAlerts ? "left-5" : "left-0.5"}`} />
              </button>
            </label>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Auto-actualización (minutos)</label>
              <p className="text-xs text-muted-foreground">Frecuencia de actualización automática de las guerras</p>
              <div className="flex gap-2 mt-2">
                {["1", "2", "5", "10", "30"].map((v) => (
                  <button key={v}
                    onClick={() => { setAutoRefresh(v); localStorage.setItem("ccn_auto_refresh", v); }}
                    className={`flex-1 py-2 rounded-lg border text-xs font-mono font-bold transition-all ${autoRefresh === v ? "bg-primary/20 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-border"}`}>
                    {v}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-border/50 rounded-xl bg-card/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="w-4 h-4" />
              <p className="text-xs">Las notificaciones push requieren permiso del navegador. Las alertas visuales están siempre activas.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "avanzado" && (
        <div className="space-y-4">
          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-5">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Database className="w-4 h-4" /> Datos y Caché
            </h2>
            <p className="text-xs text-muted-foreground">Gestiona los datos guardados localmente en tu dispositivo.</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div>
                  <p className="text-sm font-medium">Limpiar caché</p>
                  <p className="text-xs text-muted-foreground">Elimina datos en caché sin perder configuración</p>
                </div>
                <button onClick={handleClearCache}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> Limpiar
                </button>
              </div>

              <a href="/api/clan/debug" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30 hover:border-border transition-all">
                <div>
                  <p className="text-sm font-medium">Diagnóstico de API</p>
                  <p className="text-xs text-muted-foreground">Ver estado de la conexión con la API de CoC</p>
                </div>
                <span className="text-xs text-primary font-mono">→</span>
              </a>
            </div>
          </div>

          <div className="border border-red-500/20 rounded-xl bg-red-500/5 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Zona de Peligro
            </h2>
            <p className="text-xs text-muted-foreground">Estas acciones son irreversibles. Procede con cuidado.</p>
            <button onClick={handleResetAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-all">
              <Trash2 className="w-4 h-4" /> Resetear toda la configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
