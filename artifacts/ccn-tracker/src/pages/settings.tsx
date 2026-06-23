import { useState, useEffect } from "react";
import { Shield, Save, RotateCcw, CheckCircle, Palette, Type, Globe } from "lucide-react";
import { useTheme, COLOR_THEMES, FONT_PRESETS } from "@/context/theme";
import { useLang, type Lang } from "@/context/lang";

const DEFAULT_CLAN_TAG = "L0JVQGYR";
const STORAGE_KEY = "ccn_clan_tag";

export function getClanTag(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CLAN_TAG;
}

type Tab = "clan" | "look" | "lang";

export default function Settings() {
  const { colorId, fontId, appName, setColor, setFont, setAppName } = useTheme();
  const { lang, setLang, t } = useLang();

  const [activeTab, setActiveTab] = useState<Tab>("clan");

  // Clan tab state
  const [clanTag, setClanTag] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState<{ name?: string; members?: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Look tab state
  const [nameInput, setNameInput] = useState(appName);
  const [nameSaved, setNameSaved] = useState(false);

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
    setClanTag(DEFAULT_CLAN_TAG);
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

  const tabs = [
    { id: "clan" as Tab, label: t("cfg_tab_clan"), icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "look" as Tab, label: t("cfg_tab_look"), icon: <Palette className="w-3.5 h-3.5" /> },
    { id: "lang" as Tab, label: t("cfg_tab_lang"), icon: <Globe className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> {t("cfg_title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("cfg_subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/40 p-1 rounded-xl border border-border/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-display font-semibold tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── CLAN tab ── */}
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
                  spellCheck={false} autoComplete="off" placeholder={DEFAULT_CLAN_TAG}
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

      {/* ── APARIENCIA tab ── */}
      {activeTab === "look" && (
        <div className="space-y-5">
          {/* Color themes */}
          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Palette className="w-4 h-4" /> {t("cfg_color_title")}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_THEMES.map((theme) => {
                const isActive = colorId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setColor(theme.id)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      isActive ? "border-primary/60 bg-primary/10" : "border-border/40 bg-secondary/30 hover:border-border"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full shadow-lg"
                      style={{ background: `hsl(${theme.primary})`, boxShadow: isActive ? `0 0 12px hsl(${theme.primary})` : undefined }}
                    />
                    <span className="text-[10px] text-center text-muted-foreground leading-tight">
                      {lang === "es" ? theme.name : theme.nameEn}
                    </span>
                    {isActive && <CheckCircle className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font presets */}
          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary flex items-center gap-2">
              <Type className="w-4 h-4" /> {t("cfg_font_title")}
            </h2>
            <div className="space-y-2">
              {FONT_PRESETS.map((preset) => {
                const isActive = fontId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setFont(preset.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isActive ? "border-primary/60 bg-primary/10" : "border-border/40 bg-secondary/30 hover:border-border"
                    }`}
                  >
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

          {/* App name */}
          <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
            <h2 className="font-display font-semibold uppercase tracking-wider text-sm text-primary">
              {t("cfg_name_title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("cfg_name_hint")}</p>
            <div className="flex gap-2">
              <input
                type="text" value={nameInput} maxLength={20}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t("cfg_name_ph")}
                className="flex-1 border border-border rounded-md bg-background px-3 py-2.5 text-sm font-display font-bold uppercase tracking-wider outline-none focus:border-primary/60 transition-colors"
              />
              <button
                onClick={handleNameSave}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
              >
                {nameSaved ? <><CheckCircle className="w-4 h-4" /> {t("cfg_saved")}</> : <><Save className="w-4 h-4" /> {t("cfg_save")}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IDIOMA tab ── */}
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
                <button
                  key={l} onClick={() => setLang(l)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                    isActive ? "border-primary/60 bg-primary/10" : "border-border/40 bg-secondary/30 hover:border-border"
                  }`}
                >
                  <span className="text-4xl">{flag}</span>
                  <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{label}</span>
                  {isActive && <CheckCircle className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
