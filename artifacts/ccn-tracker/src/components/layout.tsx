import { Link, useLocation } from "wouter";
import { Radio, Trophy, Target, CalendarDays, Search, Shield, Settings, Globe, Swords } from "lucide-react";
import { useTheme } from "@/context/theme";
import { useLang } from "@/context/lang";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { appName } = useTheme();
  const { lang, setLang, t } = useLang();

  const navItems = [
    { href: "/",               label: "En Vivo",             icon: Radio },
    { href: "/matches",        label: "Matches",             icon: Swords },
    { href: "/ranking",        label: t("nav_ranking"),      icon: Trophy },
    { href: "/clasificatorio", label: t("nav_qualifier"),    icon: Target },
    { href: "/torneos",        label: t("nav_tournaments"),  icon: CalendarDays },
    { href: "/equipo",         label: t("nav_team_search"),  icon: Search },
    { href: "/mi-clan",        label: t("nav_mi_clan"),      icon: Shield },
    { href: "/paises",         label: "Top Países",          icon: Globe },
    { href: "/configuracion",  label: t("nav_config"),       icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row w-full bg-background text-foreground font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <Swords className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-wider uppercase">{appName} Tracker</span>
        </div>
        <button
          onClick={() => setLang(lang === "es" ? "en" : "es")}
          className="text-lg leading-none px-2 py-1 rounded border border-border/40 hover:border-border transition-colors"
          title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
        >
          {lang === "es" ? "🇪🇸" : "🇬🇧"}
        </button>
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(0,210,255,0.1)]">
            <Swords className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display font-bold text-2xl leading-none tracking-wider text-primary truncate">{appName}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">War Tracker</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            const isLive = item.href === "/";
            return (
              <Link
                key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,210,255,0.5)]" />}
                <div className="relative shrink-0">
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                  {isLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <span className="font-display font-semibold tracking-wider text-sm truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono opacity-50">{t("nav_footer")}</span>
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="text-base leading-none px-2 py-1 rounded border border-border/40 hover:border-border transition-colors opacity-70 hover:opacity-100"
            title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
          >
            {lang === "es" ? "🇪🇸" : "🇬🇧"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-x-hidden">
        {/* Mobile Nav */}
        <nav className="md:hidden flex overflow-x-auto p-2 border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-[65px] z-40 no-scrollbar">
          <div className="flex gap-2 min-w-max px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              const isLive = item.href === "/";
              return (
                <Link
                  key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 text-xs font-display font-semibold tracking-wider ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary text-muted-foreground border border-transparent"
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-3.5 h-3.5" />
                    {isLive && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                  </div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
