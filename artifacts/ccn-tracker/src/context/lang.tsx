import { createContext, useContext, useState } from "react";

export type Lang = "es" | "en";

const KEY = "ccn_lang";

// ─── Translations ─────────────────────────────────────────────────────────────

const strings = {
  es: {
    // Nav
    nav_live_wars:    "GUERRAS LIVE",
    nav_ranking:      "ELO RANKING",
    nav_qualifier:    "CLASIFICATORIO",
    nav_tournaments:  "TORNEOS",
    nav_team_search:  "BUSCAR EQUIPO",
    nav_mi_clan:      "MI CLAN",
    nav_config:       "CONFIG",
    nav_footer:       "SISTEMA.EN LÍNEA",

    // Settings
    cfg_title:        "Configuración",
    cfg_subtitle:     "Personaliza tu tracker sin tocar el código.",
    cfg_tab_clan:     "MI CLAN",
    cfg_tab_look:     "APARIENCIA",
    cfg_tab_lang:     "IDIOMA",

    cfg_clan_title:   "Tag del Clan",
    cfg_clan_hint:    "El tag de tu clan de Clash of Clans (sin el #). Se guarda en tu navegador.",
    cfg_verify:       "Verificar",
    cfg_save:         "Guardar",
    cfg_reset:        "Resetear",
    cfg_saved:        "Guardado",
    cfg_api_title:    "Estado del API",
    cfg_api_hint:     'Si "Mi Clan" no carga, verifica que el servidor tiene las credenciales correctas.',
    cfg_api_link:     "Abrir diagnóstico del API →",

    cfg_color_title:  "Color de acento",
    cfg_font_title:   "Estilo de fuente",
    cfg_name_title:   "Nombre de la app",
    cfg_name_hint:    "El nombre que aparece en la barra lateral y en el navegador.",
    cfg_name_ph:      "CCN",

    cfg_lang_title:   "Idioma / Language",
    cfg_lang_hint:    "Cambia el idioma de la interfaz.",

    // Mi Clan
    mc_change:        "Cambiar clan",
    mc_tab_rank:      "RANKING",
    mc_tab_don:       "DONACIONES",
    mc_tab_league:    "LIGA / BB",
    mc_tab_clan:      "CLAN",
    mc_rank_col_player: "Jugador",
    mc_rank_col_lvl:  "Nivel",
    mc_don_sent:      "Donadas",
    mc_don_recv:      "Recibidas",
    mc_don_ratio:     "Ratio",
    mc_sort_trophies: "Trofeos casa",
    mc_sort_bb:       "Trofeos BB",
    mc_sort_lvl:      "Nivel exp.",
    mc_no_members:    "No se encontraron miembros.",
    mc_error_title:   "No se pudo cargar el clan",
    mc_error_hint:    "Ve a Configuración → \"Abrir diagnóstico del API\" para ver el error exacto.",

    // Player modal
    pm_loading:       "Cargando estadísticas...",
    pm_th:            "Ayuntamiento",
    pm_level:         "Nivel exp.",
    pm_trophies:      "Trofeos",
    pm_best:          "Mejor marca",
    pm_war_stars:     "Estrellas guerra",
    pm_attacks:       "Ataques ganados",
    pm_defenses:      "Defensas ganadas",
    pm_donations:     "Donaciones",
    pm_received:      "Recibidas",
    pm_capital:       "Capital aportado",
    pm_bh:            "Taller Constructor",
    pm_bb_trophies:   "Trofeos Builder",
    pm_league:        "Liga actual",
    pm_heroes:        "Héroes",
    pm_achievements:  "Logros",

    // Clan info
    ci_private_log:   "Registro de guerras privado",
    ci_war_wins:      "Guerras ganadas",
    ci_war_ties:      "Empates",
    ci_war_losses:    "Derrotas",
    ci_war_streak:    "Racha actual",
    ci_type:          "Tipo de clan",
    ci_freq:          "Frecuencia de guerra",
    ci_req:           "Trofeos requeridos",
    ci_clan_trophies: "Trofeos del clan",
    ci_roles:         "Distribución de roles",
    ci_leagues:       "Liga más común",
    ci_no_league:     "Sin liga",
    ci_role_leader:   "Líder",
    ci_role_co:       "Co-líder",
    ci_role_elder:    "Anciano",
    ci_role_member:   "Miembro",

    // Misc
    common_no:        "No",
    lang_name:        "Español",
  },
  en: {
    nav_live_wars:    "LIVE WARS",
    nav_ranking:      "ELO RANKING",
    nav_qualifier:    "QUALIFIER",
    nav_tournaments:  "TOURNAMENTS",
    nav_team_search:  "TEAM SEARCH",
    nav_mi_clan:      "MY CLAN",
    nav_config:       "CONFIG",
    nav_footer:       "SYSTEM.ONLINE",

    cfg_title:        "Settings",
    cfg_subtitle:     "Customize your tracker without touching the code.",
    cfg_tab_clan:     "MY CLAN",
    cfg_tab_look:     "APPEARANCE",
    cfg_tab_lang:     "LANGUAGE",

    cfg_clan_title:   "Clan Tag",
    cfg_clan_hint:    "Your Clash of Clans clan tag (without the #). Saved in your browser.",
    cfg_verify:       "Verify",
    cfg_save:         "Save",
    cfg_reset:        "Reset",
    cfg_saved:        "Saved",
    cfg_api_title:    "API Status",
    cfg_api_hint:     'If "My Clan" won\'t load, check that the server has the correct credentials.',
    cfg_api_link:     "Open API diagnostics →",

    cfg_color_title:  "Accent color",
    cfg_font_title:   "Font style",
    cfg_name_title:   "App name",
    cfg_name_hint:    "The name shown in the sidebar and browser tab.",
    cfg_name_ph:      "CCN",

    cfg_lang_title:   "Language / Idioma",
    cfg_lang_hint:    "Switch the interface language.",

    mc_change:        "Change clan",
    mc_tab_rank:      "RANKING",
    mc_tab_don:       "DONATIONS",
    mc_tab_league:    "LEAGUE / BB",
    mc_tab_clan:      "CLAN",
    mc_rank_col_player: "Player",
    mc_rank_col_lvl:  "Level",
    mc_don_sent:      "Donated",
    mc_don_recv:      "Received",
    mc_don_ratio:     "Ratio",
    mc_sort_trophies: "Home trophies",
    mc_sort_bb:       "BB trophies",
    mc_sort_lvl:      "Exp level",
    mc_no_members:    "No members found.",
    mc_error_title:   "Could not load clan",
    mc_error_hint:    'Go to Settings → "Open API diagnostics" to see the exact error.',

    pm_loading:       "Loading stats...",
    pm_th:            "Town Hall",
    pm_level:         "Exp level",
    pm_trophies:      "Trophies",
    pm_best:          "Best trophies",
    pm_war_stars:     "War stars",
    pm_attacks:       "Attack wins",
    pm_defenses:      "Defense wins",
    pm_donations:     "Donations",
    pm_received:      "Received",
    pm_capital:       "Capital contributed",
    pm_bh:            "Builder Hall",
    pm_bb_trophies:   "Builder trophies",
    pm_league:        "Current league",
    pm_heroes:        "Heroes",
    pm_achievements:  "Achievements",

    ci_private_log:   "War log is private",
    ci_war_wins:      "Wars won",
    ci_war_ties:      "Ties",
    ci_war_losses:    "Losses",
    ci_war_streak:    "Current streak",
    ci_type:          "Clan type",
    ci_freq:          "War frequency",
    ci_req:           "Required trophies",
    ci_clan_trophies: "Clan trophies",
    ci_roles:         "Role distribution",
    ci_leagues:       "Most common leagues",
    ci_no_league:     "No league",
    ci_role_leader:   "Leader",
    ci_role_co:       "Co-leader",
    ci_role_elder:    "Elder",
    ci_role_member:   "Member",

    common_no:        "No",
    lang_name:        "English",
  },
} as const;

export type TKey = keyof typeof strings.es;

// ─── Context ──────────────────────────────────────────────────────────────────

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const LangContext = createContext<LangCtx>({ lang: "es", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(KEY) as Lang) ?? "es");

  const setLang = (l: Lang) => {
    localStorage.setItem(KEY, l);
    setLangState(l);
  };

  const t = (k: TKey): string => strings[lang][k] as string;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
