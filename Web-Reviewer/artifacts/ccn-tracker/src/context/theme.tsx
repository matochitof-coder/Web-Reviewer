import { createContext, useContext, useEffect, useState } from "react";

// ─── Theme definitions ────────────────────────────────────────────────────────

export type ColorTheme = {
  id: string;
  name: string;
  nameEn: string;
  primary: string;       // HSL values e.g. "190 100% 50%"
  accent: string;
  ring: string;
};

export const COLOR_THEMES: ColorTheme[] = [
  { id: "cyan",    name: "Cian (por defecto)", nameEn: "Cyan (default)", primary: "190 100% 50%", accent: "340 100% 50%", ring: "190 100% 50%" },
  { id: "red",     name: "Rojo combate",        nameEn: "Combat Red",     primary: "0 100% 55%",   accent: "45 100% 50%",  ring: "0 100% 55%" },
  { id: "gold",    name: "Dorado",              nameEn: "Gold",           primary: "45 100% 50%",  accent: "0 100% 55%",   ring: "45 100% 50%" },
  { id: "purple",  name: "Púrpura",             nameEn: "Purple",         primary: "270 100% 65%", accent: "190 100% 50%", ring: "270 100% 65%" },
  { id: "green",   name: "Verde esmeralda",     nameEn: "Emerald Green",  primary: "140 100% 45%", accent: "340 100% 50%", ring: "140 100% 45%" },
  { id: "pink",    name: "Rosa neón",           nameEn: "Neon Pink",      primary: "320 100% 60%", accent: "190 100% 50%", ring: "320 100% 60%" },
];

export type FontPreset = {
  id: string;
  name: string;
  nameEn: string;
  display: string;
  sans: string;
  googleFonts?: string;
};

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "military",
    name: "Militar (por defecto)", nameEn: "Military (default)",
    display: "'Rajdhani', sans-serif",
    sans: "'Inter', sans-serif",
  },
  {
    id: "futuristic",
    name: "Futurista", nameEn: "Futuristic",
    display: "'Orbitron', sans-serif",
    sans: "'Exo 2', sans-serif",
    googleFonts: "Orbitron:wght@400;500;600;700&family=Exo+2:wght@400;500;600",
  },
  {
    id: "clean",
    name: "Limpio", nameEn: "Clean",
    display: "'Inter', sans-serif",
    sans: "'Inter', sans-serif",
  },
];

// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEY_COLOR   = "ccn_theme_color";
const KEY_FONT    = "ccn_theme_font";
const KEY_NAME    = "ccn_app_name";

// ─── Applier ─────────────────────────────────────────────────────────────────

function applyColorTheme(theme: ColorTheme) {
  const r = document.documentElement;
  r.style.setProperty("--primary", theme.primary);
  r.style.setProperty("--ring", theme.ring);
  r.style.setProperty("--accent", theme.accent);
  r.style.setProperty("--sidebar-primary", theme.primary);
  r.style.setProperty("--sidebar-ring", theme.ring);
  r.style.setProperty("--chart-1", theme.primary);
  r.style.setProperty("--chart-2", theme.accent);
}

function applyFontPreset(preset: FontPreset) {
  const r = document.documentElement;
  r.style.setProperty("--app-font-display", preset.display);
  r.style.setProperty("--app-font-sans", preset.sans);

  if (preset.googleFonts) {
    const id = `gfont-${preset.id}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${preset.googleFonts}&display=swap`;
      document.head.appendChild(link);
    }
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

type ThemeCtx = {
  colorId: string;
  fontId: string;
  appName: string;
  setColor: (id: string) => void;
  setFont: (id: string) => void;
  setAppName: (name: string) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  colorId: "cyan", fontId: "military", appName: "CCN",
  setColor: () => {}, setFont: () => {}, setAppName: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorId, setColorId] = useState(() => localStorage.getItem(KEY_COLOR) ?? "cyan");
  const [fontId, setFontId]   = useState(() => localStorage.getItem(KEY_FONT) ?? "military");
  const [appName, setAppNameState] = useState(() => localStorage.getItem(KEY_NAME) ?? "CCN");

  useEffect(() => {
    const theme = COLOR_THEMES.find((t) => t.id === colorId) ?? COLOR_THEMES[0];
    applyColorTheme(theme);
  }, [colorId]);

  useEffect(() => {
    const preset = FONT_PRESETS.find((p) => p.id === fontId) ?? FONT_PRESETS[0];
    applyFontPreset(preset);
  }, [fontId]);

  const setColor = (id: string) => {
    localStorage.setItem(KEY_COLOR, id);
    setColorId(id);
  };
  const setFont = (id: string) => {
    localStorage.setItem(KEY_FONT, id);
    setFontId(id);
  };
  const setAppName = (name: string) => {
    localStorage.setItem(KEY_NAME, name || "CCN");
    setAppNameState(name || "CCN");
  };

  return (
    <ThemeContext.Provider value={{ colorId, fontId, appName, setColor, setFont, setAppName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
