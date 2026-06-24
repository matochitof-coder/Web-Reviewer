import { useState } from "react";
import { Swords, Copy, Check, ChevronDown, ChevronUp, Shield, Star, Zap } from "lucide-react";

type Troop = { name: string; qty: number; emoji: string };
type Spell = { name: string; qty: number; emoji: string };

type Army = {
  id: string;
  name: string;
  thMin: number;
  thMax?: number;
  stars: number;
  tags: string[];
  description: string;
  troops: Troop[];
  spells: Spell[];
  strategy: string;
  copyLink: string;
};

const ARMIES: Army[] = [
  {
    id: "blavaloon",
    name: "BlavaLoon",
    thMin: 12, stars: 3,
    tags: ["Aéreo", "Clásico", "Fácil"],
    description: "El ejército aéreo más clásico y efectivo. Las Lava Hounds absorben daño de las defensas anti-aéreas mientras los Balloons destruyen todo.",
    troops: [
      { name: "Lava Hound", qty: 3, emoji: "🐉" },
      { name: "Balloon", qty: 28, emoji: "🎈" },
      { name: "Minion", qty: 12, emoji: "💜" },
    ],
    spells: [
      { name: "Rage", qty: 2, emoji: "😡" },
      { name: "Haste", qty: 4, emoji: "💨" },
      { name: "Freeze", qty: 1, emoji: "❄️" },
    ],
    strategy: "Despliega las Lava Hounds primero para distraer las defensas AA. Luego envía los Balloons desde el flanco y usa Haste para acelerar su avance. Rage para el núcleo.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u18x3u5x28u10x12-s2x2s5x4s3x1",
  },
  {
    id: "witch-slap",
    name: "Witch Slap",
    thMin: 12, stars: 3,
    tags: ["Terrestre", "Clásico", "Versátil"],
    description: "Combinación devastadora de PEKKA y Witches. Los esqueletos crean distracción masiva mientras las PEKKA rompen el núcleo.",
    troops: [
      { name: "PEKKA", qty: 3, emoji: "🤖" },
      { name: "Golem", qty: 2, emoji: "🗿" },
      { name: "Witch", qty: 4, emoji: "🧙‍♀️" },
      { name: "Wizard", qty: 6, emoji: "🧙" },
      { name: "Wall Breaker", qty: 6, emoji: "💣" },
    ],
    spells: [
      { name: "Rage", qty: 3, emoji: "😡" },
      { name: "Freeze", qty: 2, emoji: "❄️" },
      { name: "Healing", qty: 1, emoji: "💚" },
      { name: "Earthquake", qty: 1, emoji: "🌍" },
    ],
    strategy: "Golem al frente, luego PEKKA y Witches detrás. Wall Breakers para abrir muros. Rage en el núcleo, Freeze para el Inferno Tower y Eagle Artillery.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u9x3u15x2u17x4u6x6u4x6-s2x3s3x2s1x1s4x1",
  },
  {
    id: "edrag",
    name: "Electro Dragon",
    thMin: 13, stars: 3,
    tags: ["Aéreo", "Potente", "Económico"],
    description: "Los Electro Dragons son devastadores con su daño en cadena. Simples de usar y muy efectivos contra bases compactas.",
    troops: [
      { name: "Electro Dragon", qty: 8, emoji: "⚡" },
      { name: "Balloon", qty: 10, emoji: "🎈" },
      { name: "Baby Dragon", qty: 4, emoji: "🐲" },
    ],
    spells: [
      { name: "Lightning", qty: 3, emoji: "⚡" },
      { name: "Rage", qty: 2, emoji: "😡" },
      { name: "Freeze", qty: 2, emoji: "❄️" },
      { name: "Haste", qty: 1, emoji: "💨" },
    ],
    strategy: "Usa Lightning para eliminar el Eagle Artillery o Inferno Tower. Despliega EDrags en línea recta cubriendo toda la base. Rage al entrar al núcleo.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u22x8u5x10u20x4-s0x3s2x2s3x2s5x1",
  },
  {
    id: "yeti-smash",
    name: "Yeti Smash",
    thMin: 13, stars: 3,
    tags: ["Terrestre", "Poderoso", "TH13"],
    description: "Los Yetis y sus Yetimites crean caos total. Combinados con PEKKA son prácticamente imparables en la base enemiga.",
    troops: [
      { name: "Yeti", qty: 6, emoji: "🧊" },
      { name: "PEKKA", qty: 2, emoji: "🤖" },
      { name: "Witch", qty: 2, emoji: "🧙‍♀️" },
      { name: "Golem", qty: 1, emoji: "🗿" },
      { name: "Wall Breaker", qty: 8, emoji: "💣" },
    ],
    spells: [
      { name: "Rage", qty: 3, emoji: "😡" },
      { name: "Freeze", qty: 3, emoji: "❄️" },
      { name: "Earthquake", qty: 1, emoji: "🌍" },
    ],
    strategy: "Golem al frente, Yetis en el medio, PEKKA en la retaguardia. Wall Breakers para abrir múltiples secciones. Rage para el Scattershot o Eagle Artillery.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u23x6u9x2u17x2u15x1u4x8-s2x3s3x3s4x1",
  },
  {
    id: "mass-miner",
    name: "Mass Miner",
    thMin: 14, stars: 3,
    tags: ["Terrestre", "Subterráneo", "Alta velocidad"],
    description: "Los Miners se entierran para esquivar defensas y atacar desde abajo. Masivos y muy difíciles de defender.",
    troops: [
      { name: "Miner", qty: 30, emoji: "⛏️" },
      { name: "Hog Rider", qty: 10, emoji: "🐗" },
      { name: "Wall Breaker", qty: 4, emoji: "💣" },
    ],
    spells: [
      { name: "Healing", qty: 4, emoji: "💚" },
      { name: "Rage", qty: 2, emoji: "😡" },
      { name: "Haste", qty: 1, emoji: "💨" },
    ],
    strategy: "Envía todos los Miners a la vez desde un flanco. Hogs como apoyo. Usa Healing para mantener vivos a los Miners en la fase final. Rage cuando están en el núcleo.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u21x30u11x10u4x4-s1x4s2x2s5x1",
  },
  {
    id: "dragon-rider",
    name: "Dragon Rider",
    thMin: 14, stars: 3,
    tags: ["Aéreo", "TH14", "Top meta"],
    description: "Los Dragon Riders combinan velocidad y daño masivo con los Balloons. Uno de los ejércitos más poderosos del meta actual.",
    troops: [
      { name: "Dragon Rider", qty: 6, emoji: "🐉" },
      { name: "Dragon", qty: 4, emoji: "🔥" },
      { name: "Balloon", qty: 8, emoji: "🎈" },
      { name: "Baby Dragon", qty: 4, emoji: "🐲" },
    ],
    spells: [
      { name: "Rage", qty: 2, emoji: "😡" },
      { name: "Freeze", qty: 2, emoji: "❄️" },
      { name: "Lightning", qty: 2, emoji: "⚡" },
      { name: "Haste", qty: 1, emoji: "💨" },
    ],
    strategy: "Lightning para eliminar la Eagle Artillery. Dragon Riders primero para abrir el camino. Luego Balloons y Dragoness de soporte. Rage en el núcleo.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u24x6u8x4u5x8u20x4-s2x2s3x2s0x2s5x1",
  },
  {
    id: "super-witch",
    name: "Super Witch Smash",
    thMin: 15, stars: 3,
    tags: ["Terrestre", "Super tropa", "TH15+"],
    description: "Las Super Witches invocan Big Boy skeletons masivos que absorben todo el daño. Combinadas con Lava Hounds es devastador.",
    troops: [
      { name: "Super Witch", qty: 5, emoji: "🧙‍♀️✨" },
      { name: "Lava Hound", qty: 2, emoji: "🐉" },
      { name: "Golem", qty: 1, emoji: "🗿" },
      { name: "Wizard", qty: 6, emoji: "🧙" },
      { name: "Wall Breaker", qty: 6, emoji: "💣" },
    ],
    spells: [
      { name: "Rage", qty: 2, emoji: "😡" },
      { name: "Freeze", qty: 2, emoji: "❄️" },
      { name: "Invisibility", qty: 2, emoji: "👻" },
      { name: "Bat", qty: 1, emoji: "🦇" },
    ],
    strategy: "Golem al frente, Super Witches en el medio. Las Super Witches crean esqueletos grandes que atraen todo el fuego. Usa Invisibility para proteger tus héroes en el núcleo.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u18x2u15x1u6x6u4x6-s2x2s3x2s10x2s8x1",
  },
  {
    id: "mass-balloon",
    name: "Mass Balloon",
    thMin: 10, stars: 2,
    tags: ["Aéreo", "Simple", "Fácil"],
    description: "Clásico ejército para farmeo rápido. Balloons masivos destruyen todas las defensas en segundos.",
    troops: [
      { name: "Balloon", qty: 40, emoji: "🎈" },
      { name: "Minion", qty: 20, emoji: "💜" },
    ],
    spells: [
      { name: "Rage", qty: 2, emoji: "😡" },
      { name: "Haste", qty: 3, emoji: "💨" },
    ],
    strategy: "Despliega todos los Balloons en línea atacando un flanco. Usa Minions para clean up. Rage para el Eagle Artillery y Haste para acelerar los Balloons lentos.",
    copyLink: "https://link.clashofclans.com/en?action=CopyArmy&army=u5x40u10x20-s2x2s5x3",
  },
];

const TH_COLORS: Record<number, string> = {
  10: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  12: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  13: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  14: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  15: "border-red-500/40 bg-red-500/10 text-red-400",
};

function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= stars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function CopyButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
      style={copied ? {
        borderColor: "rgba(34,197,94,0.4)", background: "rgba(34,197,94,0.1)", color: "rgb(134,239,172)"
      } : {
        borderColor: "rgba(0,210,255,0.3)", background: "rgba(0,210,255,0.08)", color: "rgb(0,210,255)"
      }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "¡Copiado!" : "Copiar link"}
    </button>
  );
}

function OpenInGame({ link }: { link: string }) {
  return (
    <a
      href={link} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
    >
      <Swords className="w-3.5 h-3.5" /> Abrir en juego
    </a>
  );
}

function ArmyCard({ army }: { army: Army }) {
  const [expanded, setExpanded] = useState(false);
  const thColor = TH_COLORS[army.thMin] ?? TH_COLORS[10];

  return (
    <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40 hover:bg-card/60 transition-all">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-lg tracking-wide">{army.name}</h3>
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${thColor}`}>
              TH{army.thMin}+
            </span>
            <StarRating stars={army.stars} />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {army.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/30">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{army.description}</p>
        </div>
      </div>

      {/* Troop grid */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {army.troops.map((t) => (
            <div key={t.name} className="flex flex-col items-center gap-0.5 bg-secondary/40 rounded-xl px-3 py-2 min-w-[52px] border border-border/30">
              <span className="text-xl leading-none">{t.emoji}</span>
              <span className="text-xs font-bold text-primary">×{t.qty}</span>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">{t.name}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {army.spells.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-0.5 bg-violet-500/5 border border-violet-500/20 rounded-xl px-3 py-2 min-w-[52px]">
              <span className="text-xl leading-none">{s.emoji}</span>
              <span className="text-xs font-bold text-violet-400">×{s.qty}</span>
              <span className="text-[9px] text-muted-foreground text-center leading-tight">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy (expandable) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between border-t border-border/30 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-all"
      >
        <span className="font-semibold">📋 Estrategia de uso</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-sm text-muted-foreground bg-secondary/10 border-t border-border/20 leading-relaxed pt-3">
          {army.strategy}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 pt-3 flex gap-2 flex-wrap border-t border-border/20">
        <OpenInGame link={army.copyLink} />
        <CopyButton link={army.copyLink} />
      </div>
    </div>
  );
}

const TH_FILTERS = [0, 10, 12, 13, 14, 15] as const;

export default function Armys() {
  const [thFilter, setThFilter] = useState<number>(0);
  const [tagFilter, setTagFilter] = useState<string>("");

  const allTags = Array.from(new Set(ARMIES.flatMap((a) => a.tags)));
  const filtered = ARMIES.filter((a) => {
    if (thFilter > 0 && a.thMin !== thFilter) return false;
    if (tagFilter && !a.tags.includes(tagFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-5xl font-bold text-foreground tracking-wider uppercase flex items-center gap-3">
          <Swords className="w-8 h-8 md:w-12 md:h-12 text-primary" /> Armys Populares
        </h1>
        <p className="text-muted-foreground font-mono text-sm md:text-base">
          Ejércitos meta del momento · Abre directo en Clash of Clans
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Ejércitos", value: ARMIES.length.toString(), icon: "⚔️" },
          { label: "Estrategias", value: "3 estrellas", icon: "⭐" },
          { label: "Modo", value: "Abre en juego", icon: "📱" },
        ].map((s) => (
          <div key={s.label} className="border border-border/50 rounded-xl bg-card/50 p-3 text-center">
            <p className="text-lg">{s.icon}</p>
            <p className="font-bold text-sm text-primary">{s.value}</p>
            <p className="text-[10px] text-muted-foreground font-mono uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* TH filter */}
        <div className="flex flex-wrap gap-2">
          {TH_FILTERS.map((th) => (
            <button
              key={th} onClick={() => setThFilter(th)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                thFilter === th
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {th === 0 ? "Todos" : `TH${th}+`}
            </button>
          ))}
        </div>
        {/* Tag filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter("")}
            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
              !tagFilter ? "bg-secondary border-border text-foreground" : "border-border/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Todos los tipos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag} onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                tagFilter === tag
                  ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="border border-primary/20 rounded-xl bg-primary/5 p-4 flex items-start gap-3">
        <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Toca <strong className="text-foreground">"Abrir en juego"</strong> para cargar el ejército directamente en Clash of Clans. 
          Si no funciona, copia el link con el otro botón y ábrelo en el navegador de tu móvil.
        </p>
      </div>

      {/* Army list */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No hay ejércitos con ese filtro</p>
        )}
        {filtered.map((army) => <ArmyCard key={army.id} army={army} />)}
      </div>
    </div>
  );
}
