import { Shield, ExternalLink, AlertTriangle, Info, Heart, Code2, BookOpen } from "lucide-react";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  accent?: "primary" | "gold" | "muted";
  children: React.ReactNode;
}

function Section({ icon, title, accent = "primary", children }: SectionProps) {
  const accentClasses = {
    primary: "border-primary/20 bg-primary/5",
    gold:    "border-accent/20  bg-accent/5",
    muted:   "border-border/50  bg-secondary/30",
  };
  const iconClasses = {
    primary: "text-primary",
    gold:    "text-accent",
    muted:   "text-muted-foreground",
  };
  return (
    <div className={`rounded-xl border p-5 space-y-3 ${accentClasses[accent]}`}>
      <div className="flex items-center gap-3">
        <span className={iconClasses[accent]}>{icon}</span>
        <h2 className="font-display font-bold text-base tracking-wider uppercase">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
      {children}
    </span>
  );
}

export default function Legal() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="text-center space-y-3 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_30px_hsl(200_100%_58%_/_0.15)] mx-auto">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl tracking-widest uppercase text-foreground">
          Aviso Legal
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Descargo de responsabilidad, créditos y política de uso de esta herramienta.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 font-mono pt-1">
          <span>CCN War Tracker</span>
          <span>·</span>
          <span>Proyecto sin fines de lucro</span>
          <span>·</span>
          <span>Uso personal / comunitario</span>
        </div>
      </div>

      {/* Non-profit */}
      <Section icon={<Heart className="w-5 h-5" />} title="Proyecto sin fines de lucro" accent="gold">
        <p>
          CCN War Tracker es una herramienta <strong className="text-foreground">independiente, gratuita y sin fines de lucro</strong>,
          creada exclusivamente con fines informativos y de apoyo a la comunidad competitiva de Clash of Clans
          en América Latina.
        </p>
        <p>
          Este proyecto <strong className="text-foreground">no genera ingresos</strong>, no recibe patrocinios,
          no vende servicios ni productos, y no almacena datos personales de ningún usuario.
          Todo el código es desarrollado de forma voluntaria.
        </p>
      </Section>

      {/* CCN Credits */}
      <Section icon={<ExternalLink className="w-5 h-5" />} title="Créditos — Competitive Clash Network" accent="primary">
        <p>
          Los datos de guerras, equipos, torneos y ranking de ELO mostrados en esta aplicación provienen de{" "}
          <a
            href="https://competitiveclash.network"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            competitiveclash.network <ExternalLink className="w-3 h-3" />
          </a>
          , plataforma oficial de la liga competitiva de Clash of Clans CCN.
        </p>
        <p>
          Toda la propiedad intelectual relacionada con CCN — incluyendo nombres de torneos, equipos,
          clasificaciones y formatos de competencia — pertenece a sus respectivos propietarios.
          Esta herramienta <strong className="text-foreground">no es afiliada ni tiene relación oficial</strong> con
          Competitive Clash Network.
        </p>
        <p>
          Si eres parte del equipo de CCN y tienes alguna consulta sobre el uso de sus datos,
          puedes contactarnos directamente para resolver cualquier situación.
        </p>
      </Section>

      {/* Clash of Clans API */}
      <Section icon={<Code2 className="w-5 h-5" />} title="Uso de la API de Clash of Clans" accent="primary">
        <p>
          Algunas funciones de esta aplicación utilizan la{" "}
          <a
            href="https://developer.clashofclans.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            API oficial de Clash of Clans <ExternalLink className="w-3 h-3" />
          </a>{" "}
          provista por <strong className="text-foreground">Supercell</strong>, bajo los
          <a
            href="https://developer.clashofclans.com/#/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1 ml-1"
          >
            Términos de Servicio de la API <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>
        <p>Esto incluye datos como:</p>
        <ul className="space-y-1.5 pl-2">
          {[
            "Información pública de clanes (nombre, tag, emblema, descripción)",
            "Miembros de clanes (nombre, nivel, rol)",
            "Estado actual de guerra de clanes (solo si el registro es público)",
            "Detalles de ataques y defensas durante guerras activas",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-primary mt-0.5 shrink-0">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground/70 italic border-t border-border/30 pt-3">
          El uso de la API se realiza estrictamente con fines informativos, respetando los límites de
          tasa de peticiones y sin almacenar datos permanentes en base de datos propias.
        </p>
      </Section>

      {/* Supercell Fan Content Policy */}
      <Section icon={<BookOpen className="w-5 h-5" />} title="Política de Contenido de Fans — Supercell" accent="gold">
        <div className="flex items-start gap-3 rounded-lg bg-accent/8 border border-accent/20 p-3">
          <span className="text-accent shrink-0 mt-0.5">★</span>
          <p className="text-xs leading-relaxed">
            Este material es <Pill>no oficial</Pill> y no está respaldado por Supercell.
            Para más información, consulta la{" "}
            <a
              href="https://supercell.com/en/fan-content-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent font-semibold hover:underline inline-flex items-center gap-1"
            >
              Política de Contenido de Fans de Supercell <ExternalLink className="w-3 h-3" />
            </a>
            .
          </p>
        </div>
        <p>
          Clash of Clans y todos sus activos, nombres, logotipos e imágenes son marcas registradas de{" "}
          <strong className="text-foreground">Supercell Oy</strong>. Su uso en esta aplicación se realiza
          bajo la Política de Contenido de Fans de Supercell exclusivamente con propósitos
          comunitarios y sin ánimo de lucro.
        </p>
      </Section>

      {/* Disclaimer */}
      <Section icon={<AlertTriangle className="w-5 h-5" />} title="Limitación de responsabilidad" accent="muted">
        <p>
          La información mostrada en CCN War Tracker se obtiene de fuentes públicas y puede
          contener <strong className="text-foreground">imprecisiones, retrasos o datos desactualizados</strong>.
          Los creadores no garantizan la exactitud, integridad ni disponibilidad continua de los datos.
        </p>
        <p>
          Esta herramienta se proporciona <strong className="text-foreground">"tal cual" (as-is)</strong>,
          sin garantías expresas ni implícitas. El uso de la información aquí presentada es
          responsabilidad exclusiva del usuario.
        </p>
        <p>
          Los creadores de esta aplicación no son responsables por decisiones tomadas
          basándose en los datos mostrados, ni por interrupciones del servicio derivadas
          de cambios en las APIs externas utilizadas.
        </p>
      </Section>

      {/* Availability */}
      <Section icon={<Info className="w-5 h-5" />} title="Disponibilidad del servicio" accent="muted">
        <p>
          CCN War Tracker es un proyecto mantenido de forma voluntaria. No se garantiza
          disponibilidad ininterrumpida. El servicio puede ser modificado, actualizado o
          discontinuado en cualquier momento sin previo aviso.
        </p>
        <p>
          Los datos en tiempo real dependen de la disponibilidad de las APIs de terceros
          (Competitive Clash Network y Supercell). Cualquier interrupción en dichas APIs
          puede afectar el funcionamiento de la aplicación.
        </p>
      </Section>

      {/* Footer note */}
      <div className="text-center pt-4 space-y-2">
        <div className="w-12 h-px bg-border/50 mx-auto" />
        <p className="text-xs text-muted-foreground/50 font-mono">
          CCN War Tracker — Hecho con ❤️ para la comunidad CoC Latinoamérica
        </p>
        <p className="text-[11px] text-muted-foreground/35 font-mono">
          Este aviso puede actualizarse en cualquier momento. Última revisión: junio 2025
        </p>
      </div>

    </div>
  );
}
