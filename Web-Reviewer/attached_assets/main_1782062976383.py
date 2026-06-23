"""
╔══════════════════════════════════════════════════════════════════╗
║         BOT DE TWITCH — CLASH OF CLANS  (Español)               ║
║         Listo para VPS · Configurable · Profesional              ║
╚══════════════════════════════════════════════════════════════════╝

Para correr en un VPS:
  1. pip install -r requirements.txt
  2. Copia .env.example a .env y rellena tus valores
  3. python main.py
"""

import os
import re
import sys
import time
import uuid
import random
import asyncio
import datetime
import logging
import signal
import threading
import socket
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import requests
from dotenv import load_dotenv
from twitchio.ext import commands
import twitchio
from google import genai

# ─── Cliente Gemini ───────────────────────────────────────────────────────────
_gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))


def obtener_datos_stream() -> dict:
    """Consulta la API de Twitch para obtener el estado actual del directo del canal emigamer_sv.
    Devuelve datos en tiempo real: si está en vivo, espectadores, título del stream, juego activo
    y hora de inicio. Usar cuando el usuario pregunte si el canal está en vivo, cuántos viewers hay,
    qué juego se está jugando, el título del stream o cualquier dato del directo actual.
    """
    client_id    = os.environ.get("TWITCH_CLIENT_ID", "")
    access_token = os.environ.get("TWITCH_ACCESS_TOKEN", "")
    if not client_id or not access_token:
        return {"error": "Variables TWITCH_CLIENT_ID o TWITCH_ACCESS_TOKEN no configuradas."}
    try:
        resp = requests.get(
            "https://api.twitch.tv/helix/streams",
            params={"user_login": "emigamer_sv"},
            headers={"Client-ID": client_id, "Authorization": f"Bearer {access_token}"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        if not data:
            return {"en_vivo": False, "mensaje": "El canal emigamer_sv no está en directo ahora."}
        s = data[0]
        return {"en_vivo": True, "espectadores": s.get("viewer_count", 0),
                "titulo": s.get("title", "Sin título"), "juego": s.get("game_name", "?"),
                "inicio": s.get("started_at", "")}
    except Exception as e:
        return {"error": f"No se pudo consultar Twitch API: {e}"}

# Usuarios autorizados para usar comandos de IA
USUARIOS_PERMITIDOS = {"lordhood__", "carolina_a12", "swt_saphi"}

from ccn_api import (
    buscar_equipo,
    formatear_ccn,
    obtener_ranking_mensual,
    formatear_ranking,
    buscar_partidas_equipo,
    formatear_partidas,
    obtener_ultimo_partido,
    formatear_ultimo_partido,
    obtener_torneos_activos,
    formatear_torneos,
    obtener_guerras_dia,
    formatear_guerras_dia,
    obtener_ranking_elo,
    formatear_ranking_elo,
)
from homeland_cup import buscar_pais, lista_paises, roster_pais
from coc_api import (
    renovar_api_key,
    obtener_guerra,
    obtener_warlog,
    obtener_clan,
    obtener_jugador,
    obtener_raid_season,
    obtener_cwl,
    formatear_jugador,
    formatear_clan,
    formatear_guerra,
    formatear_lineup,
    formatear_leyenda,
    formatear_sin_atacar,
    formatear_top_ataques,
    formatear_donaciones,
    formatear_roster_guerra,
    formatear_nexo,
    formatear_progreso_aldea,
    formatear_cuenta_regresiva,
    formatear_historial,
    formatear_comparar_clanes,
    detectar_nuevos_ataques,
    formatear_anuncio_ataque,
    formatear_fin_guerra,
    formatear_inicio_guerra,
    formatear_capital,
    formatear_raid,
    formatear_cwl,
    formatear_vs,
    formatear_sindefensa,
    formatear_mapa,
    formatear_prediccion,
    formatear_equipo_full,
    formatear_temporada,
    formatear_logros,
    formatear_jugador2,
    mensaje_error_api,
    ranking_pais,
    formatear_ranking_pais,
    formatear_skills,
    formatear_roster,
)

# ─── Cargar variables de entorno (.env en VPS, Secrets en Replit) ────────────
load_dotenv()

# ─── Sistema de Logs ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s  [%(levelname)-8s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("CoCBot")
logger.setLevel(logging.DEBUG)

# ═════════════════════════════════════════════════════════════════════════════
#  DEDUP MULTI-INSTANCIA — Evita respuestas dobles cuando Replit corre
#  múltiples contenedores simultáneos del mismo deployment.
#
#  Mecanismo:
#  ┌─────────────────────────────────────────────────────────────────────┐
#  │  Cada contenedor calcula su ROL basado en el hash de su hostname:   │
#  │  • PRIMARIO  → delay   50 ms  (responde casi inmediato)             │
#  │  • SECUNDARIO → delay 1500 ms  (espera a que el primario responda)  │
#  │                                                                     │
#  │  El secundario verifica si bothoodes ya habló en el canal           │
#  │  DESPUÉS de que llegó el comando. Si sí → se salta la respuesta.   │
#  │  Si el primario falla (crash / timeout) → el secundario responde    │
#  │  automáticamente (failover).                                        │
#  └─────────────────────────────────────────────────────────────────────┘
# ─────────────────────────────────────────────────────────────────────────────
_DEDUP_HOSTNAME = socket.gethostname()


def _get_container_uid() -> str:
    """Devuelve un identificador único GARANTIZADO por proceso.

    Estrategia:
    1. ID de cgroup de Docker (64 chars hex) — único por contenedor
    2. machine-id + PID — evita colisión entre procesos del mismo host
    3. UUID puro + PID — fallback, nunca lee /tmp (que puede ser compartido)
    """
    pid = str(os.getpid())

    # 1. Cgroup Docker: único por contenedor incluso si el hostname es 'localhost'
    try:
        with open("/proc/self/cgroup", "r") as f:
            content = f.read()
        m = re.search(r"[a-f0-9]{64}", content)
        if m:
            return m.group(0)   # 64-char hex → diferente por contenedor
    except Exception:
        pass

    # 2. machine-id + PID del proceso (dos instancias en el mismo host tienen distinto PID)
    for path in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
        try:
            with open(path, "r") as f:
                mid = f.read().strip()
            if len(mid) >= 8:
                return f"{mid}-{pid}"   # PID garantiza unicidad entre procesos
        except Exception:
            pass

    # 3. UUID puro + PID  — NO se lee /tmp porque en Replit puede ser compartido
    #    entre contenedores del mismo deployment → todos leerían el mismo UUID.
    return f"{uuid.uuid4()}-{pid}"


# UID y nivel de delay calculados UNA SOLA VEZ al arrancar el proceso.
# Cada proceso obtiene un UID distinto → hash distinto → delay distinto.
_DEDUP_UID  = _get_container_uid()
_DEDUP_HASH = int(hashlib.sha256(_DEDUP_UID.encode()).hexdigest(), 16)

# Delay aleatorio continuo entre 0.5 s y 5.5 s  (resolución: 1 ms).
# Distribución uniforme → probabilidad de colisión ≈ 0 con 2 contenedores.
# MÍNIMO 500 ms para que el round-trip IRC del primer bot llegue antes de que
# el segundo revise si alguien ya respondió (RTT típico Twitch IRC: <300 ms).
_DEDUP_DELAY_S = 0.5 + (_DEDUP_HASH % 5000) / 1000.0   # 0.500 s … 5.499 s
_DEDUP_NIVEL   = int((_DEDUP_DELAY_S - 0.5) // 1.0)     # 0…4 solo para logs

# Registra cuándo habló bothoodes por última vez en cada canal
_dedup_bot_hablo: dict[str, float] = {}   # canal → timestamp última vez que el bot habló
_dedup_pending:   dict[str, float] = {}   # canal → cmd_recv_ts del comando en proceso

# ═════════════════════════════════════════════════════════════════════════════
#   DICCIONARIO DE CONTROL — Edita aquí tus clanes favoritos
#   Uso en chat: !war RNG  →  busca el tag de 'RNG' automáticamente
# ═════════════════════════════════════════════════════════════════════════════
CONFIG_CLANES: dict[str, str] = {
    "RNG":  "#29V9CQQVJ",   # Ejemplo: clan RNG
    "TOP":  "#TAG_AQUI",    # Ejemplo: reemplaza con tu tag real
    # Agrega más clanes así:
    # "ALIAS": "#TAG",
}

# ─── Intervalo del monitor de guerra (segundos) ───────────────────────────────
INTERVALO_MONITOR = 30

# ─── Estado interno del monitor de guerra ─────────────────────────────────────
_cache_guerra: dict[str, dict] = {}
_tag_rastreado:   str | None = None
_canal_wartrack:  str | None = None   # canal donde se activó -wartrack

# ─── Estado interno del monitor de leyenda ────────────────────────────────────
INTERVALO_LEYENDA = 120   # segundos entre cada consulta (2 minutos)
# Reset diario a las 11 PM hora El Salvador (UTC-6) = 05:00 UTC
_RESET_HORA_UTC = 5

_comandos_listos: bool = False  # True una vez conectado y renovada la key

_leyenda_tag:           str | None = None   # tag del jugador rastreado
_leyenda_nombre:        str = ""
_leyenda_trofeos:       int | None = None   # última lectura de trofeos
_leyenda_inicio:        int | None = None   # trofeos al inicio del día (tras el reset)
_leyenda_ganadas:       int = 0             # copas ganadas acumuladas hoy
_leyenda_perdidas:      int = 0             # copas perdidas acumuladas hoy
_leyenda_proximo_reset: float = 0.0         # timestamp UTC del próximo reset
_canal_leyenda:         str | None = None   # canal donde se activó -leyenda (solo ahí se anuncia)

# ─── Jugadores fijos para -ll carito / -ll lorju / -ll saphi ──────────────────
# canal_fijo: el bot siempre monitorea y anuncia en ese canal (sin necesitar -ll)
_LL_PLAYERS: dict[str, dict] = {
    "carito": {"tag": "#82LYCYRJJ", "nombre": "Carito", "canal_fijo": "carolina_a12"},
    "lorju":  {"tag": "#CV9Y2GUP",  "nombre": "LorJu",  "canal_fijo": "lordhood__"},
    "saphi":  {"tag": "#QCLVQ0YQ2", "nombre": "Saphi",  "canal_fijo": "carolina_a12"},
}
# Estado mutable de cada jugador (trofeos, wins, defenses, balance del día)
_ll_estado: dict[str, dict] = {
    key: {
        "trofeos":       None,   # última lectura de trofeos
        "wins":          None,   # ataques del día (API: legendStatistics.currentSeason.wins)
        "defenses":      None,   # defensas del día
        "ganadas":       0,      # trofeos ganados hoy
        "perdidas":      0,      # trofeos perdidos hoy
        "canal":         info["canal_fijo"],   # canal FIJO, siempre activo
        "proximo_reset": 0.0,
    }
    for key, info in _LL_PLAYERS.items()
}


# ─── Memoria de conversación IA por canal ─────────────────────────────────────
_historial_ia: dict[str, list] = {}   # canal → lista de turns [{role, parts}]
_MAX_HISTORIAL = 8                     # máximo de pares pregunta/respuesta a conservar

# ─── Control de saludos por sesión ───────────────────────────────────────────
_SALUDO_COOLDOWN      = 4 * 3600
_carolina_saludada:   dict[str, float] = {}
_lordhood_saludado:   dict[str, float] = {}
_swt_saphi_saludada:  dict[str, float] = {}
_reivaj26_saludado:   dict[str, float] = {}
_karlakarb_saludada:  dict[str, float] = {}
_carolina_canales_activos: dict[str, float] = {}
_carolina_checkin_ts:      dict[str, float] = {}

# ─── Rate limiting de Gemini ──────────────────────────────────────────────────
_IA_COOLDOWN_SEGUNDOS  = 3           # segundos entre peticiones por usuario
_IA_MAX_POR_MINUTO     = 50          # máximo de llamadas globales por minuto
_ia_ultimo_uso:  dict[str, float] = {}   # usuario → timestamp última llamada
_ia_timestamps:  list[float]      = []   # timestamps de las últimas N llamadas globales

# ─── Estado del sorteo ────────────────────────────────────────────────────────
_SORTEO_DURACION       = 60                      # segundos que dura cada sorteo
_sorteo_activo:        dict[str, bool] = {}      # canal → True si hay sorteo en curso
_sorteo_participantes: dict[str, set]  = {}      # canal → conjunto de usernames inscritos


def _ia_puede_llamar(usuario: str) -> tuple[bool, str]:
    """Verifica cooldown por usuario y límite global por minuto.
    Retorna (permitido, motivo_si_no)."""
    ahora = time.time()

    # Cooldown personal
    ultimo = _ia_ultimo_uso.get(usuario, 0.0)
    espera = _IA_COOLDOWN_SEGUNDOS - (ahora - ultimo)
    if espera > 0:
        return False, f"espera {int(espera)}s antes de volver a preguntarme 🕐"

    # Límite global por minuto (ventana deslizante de 60 s)
    recientes = [t for t in _ia_timestamps if ahora - t < 60]
    if len(recientes) >= _IA_MAX_POR_MINUTO:
        mas_antiguo = min(recientes)
        espera_global = int(60 - (ahora - mas_antiguo)) + 1
        return False, f"demasiadas consultas seguidas, intenta en {espera_global}s ⏳"

    return True, ""


def _ia_registrar_llamada(usuario: str):
    """Registra que se realizó una llamada a Gemini."""
    ahora = time.time()
    _ia_ultimo_uso[usuario] = ahora
    _ia_timestamps.append(ahora)
    # Limpiar timestamps viejos (>2 minutos) para no crecer infinito
    while _ia_timestamps and ahora - _ia_timestamps[0] > 120:
        _ia_timestamps.pop(0)


def _agregar_historial(canal: str, rol: str, texto: str):
    """Agrega un turno al historial de IA del canal. Conserva los últimos _MAX_HISTORIAL pares."""
    if canal not in _historial_ia:
        _historial_ia[canal] = []
    _historial_ia[canal].append({"role": rol, "parts": [{"text": texto}]})
    if len(_historial_ia[canal]) > _MAX_HISTORIAL * 2:
        _historial_ia[canal] = _historial_ia[canal][-_MAX_HISTORIAL * 2:]


def _calcular_proximo_reset() -> float:
    """Retorna el timestamp UTC del próximo reset de Leyenda.
    Siempre a las 05:00 UTC (= 11 PM hora El Salvador UTC-6)."""
    ahora = datetime.datetime.utcnow()
    reset = ahora.replace(hour=_RESET_HORA_UTC, minute=0, second=0, microsecond=0)
    if ahora >= reset:
        reset += datetime.timedelta(days=1)
    return reset.timestamp()


def _tiempo_para_reset() -> str:
    """Devuelve el tiempo restante hasta el próximo reset en formato legible."""
    secs = max(0, int(_leyenda_proximo_reset - time.time()))
    h, rem = divmod(secs, 3600)
    m = rem // 60
    return f"{h}h {m}m" if h else f"{m}m"


def resolver_tag(argumento: str) -> str:
    """
    Convierte un alias del CONFIG_CLANES en su tag real.
    Si no es un alias, devuelve el argumento tal cual (puede ser un tag directo).
    """
    limpio = argumento.strip().upper()
    # Buscar alias exacto (sin importar mayúsculas)
    for alias, tag in CONFIG_CLANES.items():
        if alias.upper() == limpio:
            logger.info(f"Alias '{limpio}' → {tag}")
            return tag
    return argumento  # Es un tag directo como #ABC123


def _resolver_tag_ccn(argumento: str) -> str:
    """Normaliza nombre de equipo CCN."""
    return argumento.strip()


# ═════════════════════════════════════════════════════════════════════════════
#   CANALES DE TWITCH donde el bot estará activo
#   Se leen de CHANNEL_NAME (puede ser uno solo o varios separados por coma)
#   Ejemplo: CHANNEL_NAME=emigamer_sv,lordhood__,carolina_a12
# ═════════════════════════════════════════════════════════════════════════════
_channel_env = os.environ.get("CHANNEL_NAME", "emigamer_sv,lordhood__,carolina_a12")
CANALES_BOT: list[str] = [c.strip().lower() for c in _channel_env.split(",") if c.strip()]

# ─── Bot de Twitch ────────────────────────────────────────────────────────────
class CoCBot(commands.Bot):
    def __init__(self):
        token = os.environ["TWITCH_TOKEN"]
        if not token.startswith("oauth:"):
            token = "oauth:" + token

        super().__init__(
            token=token,
            prefix="-",
            initial_channels=CANALES_BOT,
        )
        self._tarea_monitor: asyncio.Task | None = None

    # ── Eventos del sistema ───────────────────────────────────────────────────

    async def event_ready(self):
        global _comandos_listos
        logger.info(f"✅ Bot conectado como '{self.nick}' en canales: {CANALES_BOT}")
        logger.info(f"📋 Clanes configurados: {list(CONFIG_CLANES.keys())}")
        logger.info("🔑 Renovando llave de CoC API automáticamente...")
        ok = await renovar_api_key()
        if ok:
            logger.info("✅ Llave de CoC API renovada con la IP actual.")
        else:
            logger.warning("⚠️ No se pudo renovar la llave automáticamente — usando llave guardada.")
        self._tarea_monitor           = asyncio.create_task(self._monitor_guerra())
        self._tarea_monitor_leyenda   = asyncio.create_task(self._monitor_leyenda())
        self._tarea_monitor_ll        = asyncio.create_task(self._monitor_ll())
        self._tarea_elo_precarga      = asyncio.create_task(self._precargar_elo())
        self._tarea_carolina_checkin  = asyncio.create_task(self._monitor_carolina_checkin())
        _comandos_listos = True
        logger.info("▶️ Comandos habilitados.")

    async def event_message(self, message: twitchio.Message):
        global _comandos_listos
        if message.echo:
            return

        canal = message.channel.name if message.channel else "?"
        autor = message.author.name if message.author else "?"
        logger.debug(f"[MSG] #{canal} <{autor}>: {message.content[:80]}")

        # ── Dedup: registrar cuándo habló el bot (cualquier instancia) ──────────
        bot_nick = os.environ.get("BOT_USERNAME", "bothoodes").lower()
        if autor.lower() == bot_nick:
            _dedup_bot_hablo[canal] = time.time()
            return   # no procesar comandos en los mensajes del propio bot

        if not _comandos_listos:
            logger.debug(f"[MSG] Comandos no listos aún, ignorando.")
            return

        _ahora = time.time()

        if autor.lower() == "carolina_a12":
            _carolina_canales_activos[canal] = _ahora
            if _ahora - _carolina_saludada.get(canal, 0) > _SALUDO_COOLDOWN:
                _carolina_saludada[canal] = _ahora
                asyncio.create_task(self._saludar_carolina(message.channel))

        if autor.lower() == "lordhood__":
            if _ahora - _lordhood_saludado.get(canal, 0) > _SALUDO_COOLDOWN:
                _lordhood_saludado[canal] = _ahora
                asyncio.create_task(self._saludar_lordhood(message.channel))

        if autor.lower() == "swt_saphi":
            if _ahora - _swt_saphi_saludada.get(canal, 0) > _SALUDO_COOLDOWN:
                _swt_saphi_saludada[canal] = _ahora
                asyncio.create_task(self._saludar_swt_saphi(message.channel))

        if autor.lower() == "reivaj26_":
            if _ahora - _reivaj26_saludado.get(canal, 0) > _SALUDO_COOLDOWN:
                _reivaj26_saludado[canal] = _ahora
                asyncio.create_task(self._saludar_reivaj26(message.channel))

        if autor.lower() == "karlakarb":
            if _ahora - _karlakarb_saludada.get(canal, 0) > _SALUDO_COOLDOWN:
                _karlakarb_saludada[canal] = _ahora
                asyncio.create_task(self._saludar_karlakarb(message.channel))

        # ── Responder cuando alguien taguea @bothoodes ────────────────────────
        contenido = (message.content or "").strip()
        if (
            autor.lower() in USUARIOS_PERMITIDOS
            and f"@{bot_nick}" in contenido.lower()
        ):
            pregunta = contenido
            for variante in (f"@{bot_nick}", f"@{bot_nick.capitalize()}"):
                pregunta = pregunta.replace(variante, "").replace(variante.lower(), "")
            pregunta = pregunta.strip()
            if pregunta:
                canal_obj = message.channel
                asyncio.create_task(
                    self._responder_mencion(autor.lower(), pregunta, canal_obj)
                )
                return

        await self._handle_entrar(message)
        try:
            await self.handle_commands(message)
        except Exception as e:
            logger.error(f"[HANDLE_COMMANDS] #{canal} error: {e}", exc_info=True)

    async def handle_commands(self, message: twitchio.Message):
        """Override para dedup multi-instancia (sistema de 3 niveles).

        Niveles por delay:
          0 (~50 ms):   responde rápido; aplica 2ª verificación en ctx.send.
          1 (~800 ms):  espera, verifica si nivel-0 ya respondió.
          2 (~1550 ms): espera, verifica si nivel-0 o nivel-1 ya respondió.

        Doble verificación:
          1ª — Antes de procesar el comando (después del delay).
          2ª — Justo antes de enviar la respuesta (ctx.send en invoke).
        Ambas revisan si bothoodes habló en el canal DESPUÉS de que llegó el comando.

        NOTA: Channel usa __slots__ así que no se puede parchear ch.send.
        En cambio guardamos cmd_recv_ts en _dedup_pending y lo usamos en invoke()
        para parchear ctx.send (Context sí tiene __dict__).
        """
        content = (message.content or "").strip()
        if not content.startswith("-"):
            await super().handle_commands(message)
            return

        canal       = message.channel.name if message.channel else "?"
        cmd_recv_ts = time.time()

        # ── 1ª verificación: esperar el delay aleatorio y comprobar ──────────
        # Todos los contenedores esperan ≥ 500 ms. El más rápido responde y
        # su mensaje llega vía IRC al resto antes de que expiren sus delays.
        await asyncio.sleep(_DEDUP_DELAY_S)

        ultimo = _dedup_bot_hablo.get(canal, 0.0)
        if ultimo > cmd_recv_ts:
            logger.debug(
                f"[DEDUP-1] #{canal} delay={_DEDUP_DELAY_S:.2f}s omite "
                f"'{content[:25]}' (bot habló hace {time.time()-ultimo:.2f}s)"
            )
            return

        # ── 2ª verificación: se aplica en invoke() parcheando ctx.send ───────
        _dedup_pending[canal] = cmd_recv_ts
        try:
            await super().handle_commands(message)
        finally:
            _dedup_pending.pop(canal, None)

    async def invoke(self, ctx: commands.Context):
        """Override para aplicar la 2ª verificación de dedup sobre ctx.send.

        Context tiene __dict__ (a diferencia de Channel que usa __slots__),
        así que podemos parchear ctx.send de forma segura.

        Solo se aplica a instancias lentas (nivel > 0). La verificación bloquea
        únicamente el PRIMER send; si ya enviamos algo, continuamos enviando
        para que los comandos multi-mensaje (cargando + resultado) funcionen.
        """
        canal = ctx.channel.name if ctx.channel else "?"
        cmd_recv_ts = _dedup_pending.get(canal)

        if cmd_recv_ts is not None:
            _orig_ctx_send = ctx.send
            ya_enviamos = [False]   # flag mutable dentro del closure

            async def _dedup_ctx_send(content, **kw):
                if not ya_enviamos[0]:
                    # 1er send: verificar si otro contenedor ya respondió
                    ultimo = _dedup_bot_hablo.get(canal, 0.0)
                    if ultimo > cmd_recv_ts:
                        logger.debug(
                            f"[DEDUP-2] #{canal} delay={_DEDUP_DELAY_S:.2f}s omite send "
                            f"(bot habló hace {time.time()-ultimo:.2f}s)"
                        )
                        return
                # Ya enviamos algo O somos el primero → enviar sin bloquear
                ya_enviamos[0] = True
                await _orig_ctx_send(content, **kw)

            ctx.send = _dedup_ctx_send

        await super().invoke(ctx)

    async def event_command_error(self, ctx: commands.Context, error: Exception):
        logger.error(f"[CMD ERROR] canal=#{ctx.channel.name} cmd='{ctx.message.content}' error={error}")

    # ── Monitor de ataques en tiempo real ─────────────────────────────────────

    async def _monitor_guerra(self):
        global _cache_guerra, _tag_rastreado, _canal_wartrack
        logger.info("🔍 Monitor de guerra iniciado.")
        while True:
            try:
                if _tag_rastreado and _canal_wartrack:
                    nueva_guerra, status = await obtener_guerra(_tag_rastreado)
                    if nueva_guerra:
                        estado_nuevo    = nueva_guerra.get("state")
                        guerra_anterior = _cache_guerra.get(_tag_rastreado)
                        estado_anterior = guerra_anterior.get("state") if guerra_anterior else None

                        # Solo enviar al canal donde se activó -wartrack
                        canal_obj = self.get_channel(_canal_wartrack)

                        if estado_nuevo == "inWar" and estado_anterior == "preparation":
                            msg = formatear_inicio_guerra(nueva_guerra)
                            if canal_obj:
                                await canal_obj.send(msg)
                            logger.info(f"⚔️ Inicio de guerra anunciado en #{_canal_wartrack}: {msg}")
                            _cache_guerra[_tag_rastreado] = nueva_guerra

                        if estado_nuevo == "inWar":
                            nuevos = detectar_nuevos_ataques(guerra_anterior, nueva_guerra)
                            if nuevos and canal_obj:
                                for ataque in nuevos:
                                    msg = formatear_anuncio_ataque(ataque, nueva_guerra)
                                    await canal_obj.send(msg)
                                    logger.info(f"📢 Ataque anunciado en #{_canal_wartrack}: {msg}")
                                    _agregar_historial(_canal_wartrack, "model", msg)
                            _cache_guerra[_tag_rastreado] = nueva_guerra

                        elif estado_nuevo == "warEnded" and estado_anterior == "inWar":
                            msg = formatear_fin_guerra(nueva_guerra)
                            if canal_obj:
                                await canal_obj.send(msg)
                            logger.info(f"🏁 Fin de guerra anunciado en #{_canal_wartrack}: {msg}")
                            _cache_guerra[_tag_rastreado] = nueva_guerra

                    elif status != 200:
                        logger.warning(f"Monitor: error {status} para '{_tag_rastreado}'")
            except Exception as e:
                logger.error(f"Error en monitor de guerra: {e}")
            await asyncio.sleep(INTERVALO_MONITOR)

    # ── Monitor de trofeos de leyenda ─────────────────────────────────────────

    async def _monitor_leyenda(self):
        global _leyenda_tag, _leyenda_nombre, _leyenda_trofeos
        global _leyenda_inicio, _leyenda_ganadas, _leyenda_perdidas
        global _leyenda_proximo_reset
        logger.info("🏅 Monitor de leyenda iniciado.")

        # Inicializar el próximo reset al arrancar
        _leyenda_proximo_reset = _calcular_proximo_reset()

        while True:
            try:
                # ── Reset diario a las 11 PM El Salvador (05:00 UTC) ──────────
                if _leyenda_tag and time.time() >= _leyenda_proximo_reset:
                    _leyenda_ganadas  = 0
                    _leyenda_perdidas = 0
                    _leyenda_inicio   = _leyenda_trofeos  # nueva base del día
                    _leyenda_proximo_reset = _calcular_proximo_reset()
                    logger.info(
                        f"[LEYENDA] 🔄 Reset diario — nueva base: {_leyenda_inicio} copas | "
                        f"Próximo reset en {_tiempo_para_reset()}"
                    )

                # ── Polling de trofeos ────────────────────────────────────────
                if _leyenda_tag:
                    jugador, status = await obtener_jugador(_leyenda_tag)
                    if jugador and status == 200:
                        actuales = jugador.get("trophies", 0)
                        nombre   = jugador.get("name", _leyenda_nombre)

                        if _leyenda_trofeos is not None and actuales != _leyenda_trofeos:
                            delta = actuales - _leyenda_trofeos
                            if delta > 0:
                                _leyenda_ganadas += delta
                                signo = f"⬆️ +{delta}"
                            else:
                                _leyenda_perdidas += abs(delta)
                                signo = f"⬇️ {delta}"

                            balance = _leyenda_ganadas - _leyenda_perdidas
                            bal_str = f"+{balance}" if balance >= 0 else str(balance)

                            msg = (
                                f"🏅 {nombre} | {signo} copas | "
                                f"🏆 {actuales:,} total | "
                                f"Hoy: +{_leyenda_ganadas} / -{_leyenda_perdidas} = {bal_str} | "
                                f"Reset en {_tiempo_para_reset()}"
                            )
                            # Broadcast SOLO en el canal donde se activó -leyenda
                            canal_obj = self.get_channel(_canal_leyenda) if _canal_leyenda else None
                            if canal_obj:
                                await canal_obj.send(msg)
                            logger.info(f"🏅 Leyenda: {msg}")

                        _leyenda_trofeos = actuales
                        _leyenda_nombre  = nombre
                    elif status != 200:
                        logger.warning(f"Monitor leyenda: error {status} para '{_leyenda_tag}'")
            except Exception as e:
                logger.error(f"Error en monitor de leyenda: {e}")
            await asyncio.sleep(INTERVALO_LEYENDA)

    # ── Monitor de trofeos para jugadores fijos (-ll saphi / -ll lorju) ─────────

    async def _monitor_ll(self):
        """Monitorea trofeos de los jugadores fijos y anuncia ataques/defensas
        en su canal_fijo. Siempre activo — no requiere comando de activación."""
        for key in _ll_estado:
            _ll_estado[key]["proximo_reset"] = _calcular_proximo_reset()
        logger.info("🏅 Monitor ll (carito/lorju/saphi) iniciado — canales fijos.")

        while True:
            try:
                now = time.time()
                for key, info in _LL_PLAYERS.items():
                    estado = _ll_estado[key]

                    # Reset diario — resetear contadores, no el canal
                    if estado["trofeos"] is not None and now >= estado["proximo_reset"]:
                        estado["ganadas"]       = 0
                        estado["perdidas"]      = 0
                        estado["wins"]          = None
                        estado["defenses"]      = None
                        estado["proximo_reset"]  = _calcular_proximo_reset()
                        logger.info(f"[LL] Reset diario para {key}")

                    jugador, status = await obtener_jugador(info["tag"])
                    if not jugador or status != 200:
                        continue

                    actuales  = jugador.get("trophies", 0)
                    nombre    = jugador.get("name", info["nombre"])
                    ley       = jugador.get("legendStatistics", {}).get("currentSeason", {})
                    wins_api  = ley.get("wins",     0)
                    defs_api  = ley.get("defenses", 0)

                    # Primera lectura — solo guardar valores base
                    if estado["trofeos"] is None:
                        estado["trofeos"]   = actuales
                        estado["wins"]      = wins_api
                        estado["defenses"]  = defs_api
                        continue

                    # Detectar cambios
                    delta_t = actuales  - estado["trofeos"]
                    delta_w = wins_api  - (estado["wins"]     or 0)
                    delta_d = defs_api  - (estado["defenses"] or 0)

                    if delta_t == 0 and delta_w == 0 and delta_d == 0:
                        continue   # nada cambió

                    # Determinar etiqueta principal
                    if delta_t > 0 or delta_w > 0:
                        estado["ganadas"] += max(0, delta_t)
                        etiqueta = f"⚔️ ATAQUE  ⬆️ +{delta_t}" if delta_t >= 0 else f"⚔️ ATAQUE  ➡️ {delta_t}"
                    else:
                        estado["perdidas"] += max(0, -delta_t)
                        etiqueta = f"🛡️ DEFENSA ⬇️ {delta_t}"

                    balance = estado["ganadas"] - estado["perdidas"]
                    bal_str = f"+{balance}" if balance >= 0 else str(balance)

                    msg = (
                        f"🏅 {nombre} | {etiqueta} copas | "
                        f"🏆 {actuales:,} total | "
                        f"Hoy: +{estado['ganadas']} / -{estado['perdidas']} = {bal_str} | "
                        f"Reset en {_tiempo_para_reset()}"
                    )

                    canal_obj = self.get_channel(estado["canal"])
                    if canal_obj:
                        await canal_obj.send(msg)
                    logger.info(f"🏅 LL {key}: {msg}")

                    estado["trofeos"]  = actuales
                    estado["wins"]     = wins_api
                    estado["defenses"] = defs_api

            except Exception as e:
                logger.error(f"[monitor_ll] {e}")
            await asyncio.sleep(INTERVALO_LEYENDA)

    # ── Pre-carga del ranking ELO en background ───────────────────────────────

    async def _precargar_elo(self):
        """Pre-carga el ranking ELO al arrancar y lo refresca cada 6 horas."""
        while True:
            try:
                await obtener_ranking_elo()
                logger.info("⚡ Ranking ELO CCN pre-cargado/actualizado.")
            except Exception as e:
                logger.warning(f"[elo_precarga] {e}")
            await asyncio.sleep(21600)   # 6 horas

    # ══════════════════════════════════════════════════════════════════════════
    #   COMANDOS DEL BOT
    # ══════════════════════════════════════════════════════════════════════════

    @commands.command(name="player")
    async def cmd_player(self, ctx: commands.Context, *, argumento: str = ""):
        """-player [tag o alias] — Ayuntamiento, Copas, Liga, Heroes, Top 3 tropas."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("👤 | Uso: -player #TAGJUGADOR — ej. -player #ABC123")
            return

        tag = resolver_tag(argumento)
        await ctx.send(f"👤 | Buscando perfil de {tag.upper()} ...")

        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[!player] Error inesperado: {e}")
            await ctx.send("👤 | Error inesperado. Revisa los logs del servidor.")
            return

        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        await ctx.send(formatear_jugador(jugador))

    @commands.command(name="leyenda")
    async def cmd_leyenda(self, ctx: commands.Context, *, argumento: str = ""):
        """-leyenda → resumen diario | -leyenda #TAG → activa seguimiento. Reset 11 PM El Salvador."""
        global _leyenda_tag, _leyenda_nombre, _leyenda_trofeos
        global _leyenda_inicio, _leyenda_ganadas, _leyenda_perdidas
        global _leyenda_proximo_reset, _canal_leyenda

        argumento = argumento.strip()

        # ── Sin tag: mostrar resumen del jugador rastreado ────────────────────
        if not argumento:
            if not _leyenda_tag:
                await ctx.send("🏅 | Usa -leyenda #TAG para iniciar el seguimiento diario")
                return
            balance = _leyenda_ganadas - _leyenda_perdidas
            bal_str = f"+{balance}" if balance >= 0 else str(balance)
            await ctx.send(
                f"🏅 {_leyenda_nombre} | 🏆 {_leyenda_trofeos:,} copas | "
                f"Hoy: +{_leyenda_ganadas} / -{_leyenda_perdidas} = {bal_str} | "
                f"Reset en {_tiempo_para_reset()}"
            )
            return

        # ── Con tag: consultar API y activar/actualizar seguimiento ──────────
        tag = resolver_tag(argumento)

        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[-leyenda] Error inesperado: {e}")
            await ctx.send("🏅 | Error al consultar la API. Intenta de nuevo.")
            return

        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        # Mostrar stats de temporada (un solo mensaje)
        await ctx.send(formatear_leyenda(jugador))

        # Activar seguimiento diario
        trofeos_actuales = jugador.get("trophies", 0)
        liga = jugador.get("league", {}).get("name", "") if jugador.get("league") else ""
        en_leyenda = (
            liga == "Legend League"
            or trofeos_actuales >= 5000
            or bool(jugador.get("legendStatistics", {}).get("currentSeason"))
        )

        if en_leyenda:
            nombre = jugador.get("name", tag)
            _canal_leyenda = ctx.channel.name   # broadcasts solo en este canal
            if _leyenda_tag != tag:
                # Jugador nuevo → reset completo del día
                _leyenda_tag      = tag
                _leyenda_nombre   = nombre
                _leyenda_trofeos  = trofeos_actuales
                _leyenda_inicio   = trofeos_actuales
                _leyenda_ganadas  = 0
                _leyenda_perdidas = 0
                if _leyenda_proximo_reset == 0.0:
                    _leyenda_proximo_reset = _calcular_proximo_reset()
                await ctx.send(
                    f"🔄 Seguimiento diario activado — {nombre} | "
                    f"Base: {trofeos_actuales:,} copas | "
                    f"Reset en {_tiempo_para_reset()} (11 PM El Salvador)"
                )
            else:
                # Mismo jugador → mostrar progreso del día actual
                balance = _leyenda_ganadas - _leyenda_perdidas
                bal_str = f"+{balance}" if balance >= 0 else str(balance)
                await ctx.send(
                    f"📊 Hoy: +{_leyenda_ganadas} / -{_leyenda_perdidas} = {bal_str} | "
                    f"Reset en {_tiempo_para_reset()}"
                )

    @commands.command(name="legendtrack")
    async def cmd_legendtrack(self, ctx: commands.Context, *, argumento: str = ""):
        """!legendtrack [tag] — Activa seguimiento de trofeos de leyenda. Anuncia solo en este canal."""
        global _leyenda_tag, _leyenda_nombre, _leyenda_trofeos
        global _leyenda_inicio, _leyenda_ganadas, _leyenda_perdidas, _canal_leyenda

        argumento = argumento.strip()
        if not argumento:
            if _leyenda_tag:
                balance = _leyenda_ganadas - _leyenda_perdidas
                balance_str = f"+{balance}" if balance >= 0 else str(balance)
                await ctx.send(
                    f"🏅 Rastreando a {_leyenda_nombre} ({_leyenda_tag}) | "
                    f"🏆 {_leyenda_trofeos:,} copas | "
                    f"⚔️ +{_leyenda_ganadas} · 🛡️ -{_leyenda_perdidas} · Balance: {balance_str}"
                )
            else:
                await ctx.send("🏅 | Uso: !legendtrack #TAGJUGADOR — ej. !legendtrack #ABC123")
            return

        tag = resolver_tag(argumento)
        await ctx.send(f"🏅 | Verificando jugador {tag.upper()} ...")

        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[!legendtrack] Error: {e}")
            await ctx.send("🏅 | Error inesperado.")
            return

        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        # Reiniciar contadores y arrancar tracking
        _canal_leyenda    = ctx.channel.name
        _leyenda_tag      = tag
        _leyenda_nombre   = jugador.get("name", tag)
        _leyenda_trofeos  = jugador.get("trophies", 0)
        _leyenda_inicio   = _leyenda_trofeos
        _leyenda_ganadas  = 0
        _leyenda_perdidas = 0

        await ctx.send(
            f"🏅 Seguimiento activado para {_leyenda_nombre} | "
            f"🏆 {_leyenda_trofeos:,} copas al inicio | "
            f"Anunciaré cada cambio de trofeos en #{ctx.channel.name} ✅"
        )
        logger.info(f"🏅 Legend track iniciado: {_leyenda_nombre} ({tag}) — {_leyenda_trofeos} trofeos")

    @commands.command(name="legendstop")
    async def cmd_legendstop(self, ctx: commands.Context):
        """!legendstop — Detiene el seguimiento de trofeos de leyenda."""
        global _leyenda_tag, _leyenda_nombre, _leyenda_trofeos
        global _leyenda_inicio, _leyenda_ganadas, _leyenda_perdidas

        if not _leyenda_tag:
            await ctx.send("🏅 | No hay ningún jugador siendo rastreado ahora mismo.")
            return

        balance = _leyenda_ganadas - _leyenda_perdidas
        balance_str = f"+{balance}" if balance >= 0 else str(balance)

        await ctx.send(
            f"🏅 Seguimiento detenido para {_leyenda_nombre} | "
            f"Resumen: ⚔️ +{_leyenda_ganadas} ganadas · 🛡️ -{_leyenda_perdidas} perdidas · "
            f"Balance final: {balance_str} copas"
        )
        _leyenda_tag      = None
        _leyenda_nombre   = ""
        _leyenda_trofeos  = None
        _leyenda_inicio   = None
        _leyenda_ganadas  = 0
        _leyenda_perdidas = 0

    @commands.command(name="ll")
    async def cmd_ll(self, ctx: commands.Context, *, argumento: str = ""):
        """Comando interno: -ll carito / -ll lorju / -ll saphi — no aparece en -ayuda."""
        key = argumento.strip().lower()
        if key not in _LL_PLAYERS:
            return

        info   = _LL_PLAYERS[key]
        estado = _ll_estado[key]

        try:
            jugador, status = await obtener_jugador(info["tag"])
        except Exception as e:
            logger.error(f"[-ll {key}] {e}")
            return

        if jugador is None:
            return

        actuales = jugador.get("trophies", 0)
        nombre   = jugador.get("name", info["nombre"])

        # Datos de leyenda del día (ataques ganados y defensas)
        leyenda_stats = jugador.get("legendStatistics", {})
        temporada     = leyenda_stats.get("currentSeason", {})
        ataques       = temporada.get("wins",     0)
        defensas      = temporada.get("defenses", 0)

        balance = estado["ganadas"] - estado["perdidas"]
        bal_str = f"+{balance}" if balance >= 0 else str(balance)

        await ctx.send(
            f"🏅 {nombre} | 🏆 {actuales:,} copas | "
            f"⚔️ {ataques} ataques · 🛡️ {defensas} defensas | "
            f"Hoy: +{estado['ganadas']} / -{estado['perdidas']} = {bal_str} | "
            f"Reset en {_tiempo_para_reset()}"
        )

    @commands.command(name="clan")
    async def cmd_clan(self, ctx: commands.Context, *, argumento: str = ""):
        """-clan [tag o alias] — Nivel, Miembros, Record de guerra, Link del clan."""
        argumento = argumento.strip()
        if not argumento:
            alias_disponibles = ", ".join(CONFIG_CLANES.keys()) or "ninguno"
            await ctx.send(
                f"🏆 | Uso: -clan #TAGCLAN o alias | "
                f"Alias disponibles: {alias_disponibles}"
            )
            return

        tag = resolver_tag(argumento)
        await ctx.send(f"🏆 | Buscando datos del clan {tag.upper()} ...")

        try:
            clan, status = await obtener_clan(tag)
        except Exception as e:
            logger.error(f"[!clan] Error inesperado: {e}")
            await ctx.send("🏆 | Error inesperado. Revisa los logs del servidor.")
            return

        if clan is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        await ctx.send(formatear_clan(clan))

    @commands.command(name="war")
    async def cmd_war(self, ctx: commands.Context, *, argumento: str = ""):
        """-war [tag o alias] — Marcador de guerra en vivo con estrellas y % destruccion."""
        argumento = argumento.strip()
        if not argumento:
            alias_disponibles = ", ".join(CONFIG_CLANES.keys()) or "ninguno"
            await ctx.send(
                f"⚔️ | Uso: -war #TAGCLAN o alias | "
                f"Alias disponibles: {alias_disponibles}"
            )
            return

        tag = resolver_tag(argumento)
        await ctx.send(f"⚔️ | Buscando guerra de {tag.upper()} ...")

        try:
            guerra, status = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"[!war] Error inesperado: {e}")
            await ctx.send("⚔️ | Error inesperado. Revisa los logs del servidor.")
            return

        if guerra is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        await ctx.send(formatear_guerra(guerra))

    @commands.command(name="wartag")
    async def cmd_wartag(self, ctx: commands.Context, *, argumento: str = ""):
        """-wartag <nombre equipo CCN> — Busca la guerra activa de un equipo CCN por nombre."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("⚔️ | Uso: -wartag <nombre equipo CCN> — ej. -wartag Furia Latina")
            return
        await ctx.send(f"🔍 | Buscando equipo CCN '{argumento}' ...")
        try:
            equipo = await buscar_equipo(argumento)
        except Exception as e:
            logger.error(f"[-wartag] {e}")
            await ctx.send("⚔️ | Error buscando el equipo CCN.")
            return
        if not equipo:
            await ctx.send(f"⚔️ | No encontré '{argumento}' en la CCN.")
            return
        tag_clan = equipo.get("clanTag") or equipo.get("tag", "")
        if not tag_clan:
            await ctx.send(f"⚔️ | El equipo '{argumento}' no tiene tag de clan registrado.")
            return
        try:
            guerra, status = await obtener_guerra(tag_clan)
        except Exception as e:
            logger.error(f"[-wartag] guerra: {e}")
            await ctx.send("⚔️ | Error obteniendo la guerra del clan.")
            return
        if guerra is None:
            if (e := mensaje_error_api(status)):
                await ctx.send(e)
            return
        await ctx.send(formatear_guerra(guerra))

    @commands.command(name="ing")
    async def cmd_ing(self, ctx: commands.Context, *, argumento: str = ""):
        """-ing <texto en español> — Traduce al inglés usando IA."""
        from google.genai import types as _gtypes
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("🌐 | Uso: -ing <texto en español> — ej. -ing La guerra empieza en 2 horas")
            return
        try:
            respuesta = await asyncio.to_thread(
                lambda: _gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Translate to English. Return only the translation:\n{argumento}",
                    config=_gtypes.GenerateContentConfig(max_output_tokens=200),
                )
            )
            texto = (respuesta.text or "").strip()
            await ctx.send(f"🌐 {texto}" if texto else "🌐 | No se pudo traducir.")
        except Exception as e:
            logger.error(f"[-ing] {e}")
            await ctx.send("🌐 | Error al traducir.")

    @commands.command(name="esp")
    async def cmd_esp(self, ctx: commands.Context, *, argumento: str = ""):
        """-esp <texto en inglés> — Traduce al español usando IA."""
        from google.genai import types as _gtypes
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("🌐 | Uso: -esp <texto en inglés> — ej. -esp The war starts in 2 hours")
            return
        try:
            respuesta = await asyncio.to_thread(
                lambda: _gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=f"Traduce al español. Devuelve solo la traducción:\n{argumento}",
                    config=_gtypes.GenerateContentConfig(max_output_tokens=200),
                )
            )
            texto = (respuesta.text or "").strip()
            await ctx.send(f"🌐 {texto}" if texto else "🌐 | No se pudo traducir.")
        except Exception as e:
            logger.error(f"[-esp] {e}")
            await ctx.send("🌐 | Error al traducir.")

    @commands.command(name="lineup")
    async def cmd_lineup(self, ctx: commands.Context, *, argumento: str = ""):
        """!lineup [tag o alias] — Top 5 jugadores de cada clan con su mejor ataque."""
        argumento = argumento.strip()
        if not argumento:
            alias_disponibles = ", ".join(CONFIG_CLANES.keys()) or "ninguno"
            await ctx.send(
                f"⚔️ | Uso: !lineup #TAGCLAN o alias | "
                f"Alias disponibles: {alias_disponibles}"
            )
            return

        tag = resolver_tag(argumento)
        await ctx.send(f"⚔️ | Buscando alineación de {tag.upper()} ...")

        try:
            guerra, status = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"[!lineup] Error inesperado: {e}")
            await ctx.send("⚔️ | Error inesperado. Revisa los logs del servidor.")
            return

        if guerra is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        mensajes = formatear_lineup(guerra, cantidad=5)
        for msg in mensajes:
            await ctx.send(msg)

    @commands.command(name="wartrack")
    async def cmd_wartrack(self, ctx: commands.Context, *, argumento: str = ""):
        """-wartrack [tag o alias] — Activa anuncio automatico de ataques en este canal."""
        global _tag_rastreado, _canal_wartrack, _cache_guerra
        argumento = argumento.strip()
        if not argumento:
            if _tag_rastreado and _canal_wartrack:
                await ctx.send(
                    f"⚔️ | Rastreando {_tag_rastreado.upper()} en #{_canal_wartrack} | "
                    f"Uso: -wartrack #TAGCLAN"
                )
            else:
                await ctx.send("⚔️ | Sin seguimiento activo | Uso: -wartrack #TAGCLAN")
            return

        tag = resolver_tag(argumento)
        _tag_rastreado  = tag
        _canal_wartrack = ctx.channel.name   # ← guardar el canal que lo pidió
        _cache_guerra.pop(tag, None)
        await ctx.send(
            f"🔔 | ¡Rastreando guerra de {tag.upper()}! "
            f"Nuevos ataques se anunciarán en #{ctx.channel.name} cada {INTERVALO_MONITOR}s ⚔️"
        )

    @commands.command(name="clanes")
    async def cmd_clanes(self, ctx: commands.Context):
        """!clanes — Lista los alias disponibles en CONFIG_CLANES."""
        if not CONFIG_CLANES:
            await ctx.send("📋 | No hay clanes configurados en CONFIG_CLANES.")
            return
        partes = [f"{alias} → {tag}" for alias, tag in CONFIG_CLANES.items()]
        await ctx.send("📋 CLANES CONFIGURADOS | " + " | ".join(partes))

    # ── Respuesta por mención @bothoodes ─────────────────────────────────────

    async def _saludar_lordhood(self, canal):
        """Saluda a lordhood__ la primera vez que escribe en su propio canal durante el stream."""
        saludos = [
            "🎮 ¡El jefe llegó! Bienvenido a tu canal, lordhood__ — que sea un gran stream hoy ⚡",
            "🎮 lordhood__ en el chat, el stream está completo 🔥 ¡Arrancamos!",
            "🎮 El streamer ha llegado 👑 Bienvenido lordhood__, que fluya el buen contenido hoy ⚡",
            "🎮 ¡Ey lordhood__! El canal ya estaba esperándote — ¡vamos con todo hoy! 🔥",
        ]
        if canal:
            await canal.send(random.choice(saludos))

    async def _saludar_carolina(self, canal):
        """Saluda a Carolina la primera vez que escribe en el canal durante el stream.
        El tono varía según si está en su propio canal o en el de lordhood__."""
        canal_nombre = canal.name if canal else ""
        es_su_canal  = canal_nombre == "carolina_a12"

        if es_su_canal:
            saludos = [
                "✨ ¡Bienvenida a casa, Carolina! 🏡 Tu canal te estaba esperando — que sea un stream increíble hoy 😊",
                "✨ ¡Carolina llegó a su reino! 👑 Bienvenida a tu canal, que todo fluya bonito hoy 🌟",
                "✨ ¡La dueña del canal ha llegado! Bienvenida Carolina, que tengas el mejor stream de hoy 😊✨",
                "✨ Bienvenida a casa, Caro 🏡 El canal ya estaba listo para ti — ¡vamos con todo! 🌟",
            ]
        else:
            saludos = [
                "✨ ¡Ey, llegó Carolina al chat! Bienvenida, Caro — qué bonito verte por aquí 😊",
                "✨ Carolina en el chat 🌟 Qué alegría tenerte aquí, bienvenida Caro 😊",
                "✨ ¡Caro llegó! Bienvenida al chat, Carolina — que disfrutes el stream 😊✨",
                "✨ Llegó una visita especial 🌟 ¡Bienvenida Carolina! Qué bueno que estés aquí 😊",
            ]
        if canal:
            await canal.send(random.choice(saludos))

    async def _saludar_swt_saphi(self, canal):
        """Saluda a swt_saphi en cualquier canal (máx cada 4 h)."""
        saludos = [
            "¡swt_saphi en el chat! Bienvenida, qué bueno tenerte aquí 😊",
            "¡Llegó saphi! Bienvenida al stream, que lo disfrutes mucho 😊",
            "swt_saphi por aquí 👋 Bienvenida, que pases un rato increíble 😊",
            "¡Ey saphi! Bienvenida al chat — qué alegría verte por aquí 😊",
        ]
        if canal:
            await canal.send(random.choice(saludos))

    async def _saludar_reivaj26(self, canal):
        """Saluda a Javi (reivaj26) con jerga mexicana amigable y le ofrece una chela."""
        saludos = [
            "🍺 ¡Órale, Javi cayó al stream! Bienvenido, carnal — ya te tenía guardada una chela bien fría 🍺🤙",
            "🍺 ¡Ey, ey! ¡Llegó Javi! Bienvenido al cantón, bro — agárrate una caguama y disfruta el show 😄🍺",
            "🍺 ¡Qué onda Javi! Bienvenido, cuate — ya está la chela fría esperándote, échatela y relajado 🍺🔥",
            "🍺 ¡Simón, llegó Javi! Bienvenido, compa — ponte cómodo que ya hay chelas heladas para ti 😄🍺",
            "🍺 ¡Ahí viene Javi! Qué bueno verte por aquí, bro — ya te serví tu cervecita bien fría 🍺🤙 ¡Salud!",
            "🍺 ¡Nel que llegó Javi! Bienvenido al stream, carnal — agarra tu chela y a disfrutar 🍺😄",
        ]
        if canal:
            await canal.send(random.choice(saludos))

    async def _saludar_karlakarb(self, canal):
        """Saluda a Karla (karlakarb) de manera respetuosa y cálida, sin estrellas."""
        saludos = [
            "¡Bienvenida Karla! Qué gusto tenerte en el stream, esperamos que lo disfrutes mucho 😊",
            "¡Karla llegó al chat! Bienvenida, que pases un rato muy agradable 😊",
            "¡Hola Karla! Bienvenida al stream — qué bueno contar con tu presencia 😊",
            "¡Qué gusto verte por aquí, Karla! Bienvenida, espero que disfrutes el directo 😊",
        ]
        if canal:
            await canal.send(random.choice(saludos))

    async def _monitor_carolina_checkin(self):
        """Cada 30 min le trae algo lindo a Carolina (solo a ella, trato especial con ✨)."""
        _CHECKIN_INTERVAL = 1800
        _INACTIVA_UMBRAL  = 3600
        checkins = [
            "✨ @carolina_a12 ¡Caro! Ya te preparé un cafecito calientito para el stream ☕💜",
            "✨ @carolina_a12 Pasé y te compré un rico alfajor de chocolate 🍫😊 ¡Para ti, Caro!",
            "✨ @carolina_a12 Te traje una bebidita bien fría para acompañar el directo 🥤🌟",
            "✨ @carolina_a12 Caro, te preparé un tecito calientito con mucho cariño 🍵💜",
            "✨ @carolina_a12 ¡Te conseguí un alfajor de dulce de leche! 🍫 Es todo tuyo, Caro 😊✨",
            "✨ @carolina_a12 Te traje un juguito fresquito para el stream 🥤😊 ¡Con todo el cariño! 💜",
        ]
        await asyncio.sleep(60)
        while True:
            await asyncio.sleep(_CHECKIN_INTERVAL)
            try:
                ahora = time.time()
                for canal_nombre, ultimo_msg in list(_carolina_canales_activos.items()):
                    if ahora - ultimo_msg > _INACTIVA_UMBRAL:
                        continue
                    if ahora - _carolina_checkin_ts.get(canal_nombre, 0) < _CHECKIN_INTERVAL - 300:
                        continue
                    canal_obj = self.get_channel(canal_nombre)
                    if canal_obj:
                        await canal_obj.send(random.choice(checkins))
                        _carolina_checkin_ts[canal_nombre] = ahora
                        logger.info(f"[CHECKIN] Carolina check-in en #{canal_nombre}")
            except Exception as e:
                logger.error(f"[monitor_carolina_checkin] {e}")

    async def _responder_mencion(self, autor: str, pregunta: str, canal):
        """Llama a Gemini cuando alguien taguea @bothoodes en el chat. Usa historial y contexto CoC."""
        from google.genai import types as _gtypes

        canal_nombre = canal.name if canal else "?"

        # ── Verificar rate limit antes de llamar a Gemini ─────────────────────
        permitido, motivo = _ia_puede_llamar(autor)
        if not permitido:
            if canal:
                await canal.send(f"🤖 @{autor} {motivo}")
            return

        sistema = (
            "Eres bothoodes, un tipo que sabe un chingo de Clash of Clans y está en el chat de Twitch de lordhood__. "
            "Hablas como una persona normal — casual, directo, sin frases de robot. "
            "Nunca empieces con '¡Claro!', '¡Por supuesto!', 'Entendido' ni nada por el estilo. "
            "Entra directo al punto, como si le respondieras a un amigo. "
            "CoC que conoces: guerra = 2 ataques c/u, gana más estrellas (desempate %destrucción); "
            "TH del 1 al 17; héroes: Rey Bárbaro, Reina Arquera, Gran Guardián, Campeón Real, Titán; "
            "CWL = 1 ataque/día 7 días; Raid Capital = 6 ataques/jugador. "
            "Si recibes datos reales de la API úsalos para responder con números exactos. "
            "Puedes consultar en tiempo real si emigamer_sv está en vivo, viewers, título y juego. "
            "Responde cualquier cosa, no solo CoC. Nada de groserías. Máximo 2-3 líneas."
        )
        try:
            # Construir contexto CoC si la pregunta lo requiere
            contexto_coc = await self._construir_contexto_coc(pregunta)
            pregunta_con_ctx = f"{contexto_coc}\n\nPregunta: {pregunta}" if contexto_coc else pregunta

            historial = list(_historial_ia.get(canal_nombre, []))
            contents  = historial + [{"role": "user", "parts": [{"text": pregunta_con_ctx}]}]
            _ia_registrar_llamada(autor)
            respuesta = await asyncio.to_thread(
                lambda: _gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=_gtypes.GenerateContentConfig(
                        system_instruction=sistema,
                        tools=[obtener_datos_stream],
                        automatic_function_calling=_gtypes.AutomaticFunctionCallingConfig(
                            disable=False
                        ),
                        max_output_tokens=150,
                    ),
                )
            )
            texto = (respuesta.text or "Sin respuesta.").strip()
            if len(texto) > 450:
                texto = texto[:447] + "..."
            if canal:
                await canal.send(f"🤖 {texto}")
            _agregar_historial(canal_nombre, "user",  pregunta)
            _agregar_historial(canal_nombre, "model", texto)
        except Exception as e:
            err_str = str(e)
            logger.error(f"[mencion] Gemini error: {e}")
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                retry = 45
                import re as _re
                m = _re.search(r"retryDelay.*?'(\d+)s'", err_str)
                if m:
                    retry = int(m.group(1)) + 2
                if canal:
                    await canal.send(f"🤖 Cuota de IA alcanzada, intenta en {retry}s ⏳")

    # ── Comandos de análisis de guerra ───────────────────────────────────────

    async def _get_guerra_activa(self, ctx, argumento: str, prefijo: str):
        """Helper: resuelve tag y obtiene guerra, enviando errores si falla."""
        if not argumento.strip():
            alias_disponibles = ", ".join(CONFIG_CLANES.keys()) or "ninguno"
            await ctx.send(f"{prefijo} | Uso: {ctx.message.content.split()[0]} #TAGCLAN o alias | Alias: {alias_disponibles}")
            return None
        tag = resolver_tag(argumento.strip())
        try:
            guerra, status = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"Error guerra: {e}")
            await ctx.send(f"{prefijo} | Error inesperado.")
            return None
        if guerra is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return None
        return guerra

    @commands.command(name="sinatacar")
    async def cmd_sinatacar(self, ctx: commands.Context, *, argumento: str = ""):
        """-sinatacar [tag/alias] — Quiénes del clan aún no han atacado."""
        guerra = await self._get_guerra_activa(ctx, argumento, "⚔️")
        if guerra:
            await ctx.send(formatear_sin_atacar(guerra))

    @commands.command(name="topataques")
    async def cmd_topataques(self, ctx: commands.Context, *, argumento: str = ""):
        """-topataques [tag/alias] — Top 3 mejores ataques de ambos clanes."""
        guerra = await self._get_guerra_activa(ctx, argumento, "🏆")
        if guerra:
            await ctx.send(formatear_top_ataques(guerra))

    @commands.command(name="nexo")
    async def cmd_nexo(self, ctx: commands.Context, *, argumento: str = ""):
        """-nexo [tag/alias] — Siguiente jugador del clan que no ha atacado."""
        guerra = await self._get_guerra_activa(ctx, argumento, "⚔️")
        if guerra:
            await ctx.send(formatear_nexo(guerra))

    @commands.command(name="cuenta")
    async def cmd_cuenta(self, ctx: commands.Context, *, argumento: str = ""):
        """-cuenta [tag/alias] — Tiempo restante de la guerra."""
        guerra = await self._get_guerra_activa(ctx, argumento, "⏳")
        if guerra:
            await ctx.send(formatear_cuenta_regresiva(guerra))

    # ── Comandos de clan ──────────────────────────────────────────────────────

    @commands.command(name="donaciones")
    async def cmd_donaciones(self, ctx: commands.Context, *, argumento: str = ""):
        """-donaciones [tag/alias] — Top donadores del clan."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("💝 | Uso: -donaciones #TAGCLAN o alias")
            return
        tag = resolver_tag(argumento)
        try:
            clan, status = await obtener_clan(tag)
        except Exception as e:
            logger.error(f"[!donaciones] {e}")
            await ctx.send("💝 | Error inesperado.")
            return
        if clan is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_donaciones(clan))

    @commands.command(name="roster")
    async def cmd_roster(self, ctx: commands.Context, *, argumento: str = ""):
        """-roster [tag/alias] — Composición de TH de ambos clanes en guerra."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("👥 | Uso: -roster #TAGCLAN o alias — muestra los rosters de ambos clanes en guerra")
            return
        tag = resolver_tag(argumento)
        try:
            guerra, status_g = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"[!roster/guerra] {e}")
            guerra = None
            status_g = 0

        if guerra and guerra.get("state") not in ("notInWar", None):
            clan_nombre  = guerra.get("clan", {}).get("name", "?")
            rival_nombre = guerra.get("opponent", {}).get("name", "?")
            estado       = guerra.get("state", "?")
            logger.info(f"[roster] {tag} → {clan_nombre} vs {rival_nombre} (estado: {estado})")
            await ctx.send(formatear_roster_guerra(guerra))
        elif status_g != 4031:
            await ctx.send("👥 | El clan no está en guerra ahora mismo.")

    @commands.command(name="historial")
    async def cmd_historial(self, ctx: commands.Context, *, argumento: str = ""):
        """-historial [tag/alias] — Últimas 5 guerras del clan."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("📜 | Uso: -historial #TAGCLAN o alias")
            return
        tag = resolver_tag(argumento)
        try:
            warlog, status = await obtener_warlog(tag)
        except Exception as e:
            logger.error(f"[!historial] {e}")
            await ctx.send("📜 | Error inesperado.")
            return
        if warlog is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_historial(warlog))

    @commands.command(name="clan2")
    async def cmd_clan2(self, ctx: commands.Context, *, argumento: str = ""):
        """-clan2 [tag1] [tag2] — Compara dos clanes directamente."""
        partes = argumento.strip().split()
        if len(partes) < 2:
            await ctx.send("📊 | Uso: -clan2 #TAG1 #TAG2 — ej. -clan2 RNG #OTROCLAN")
            return
        tag1 = resolver_tag(partes[0])
        tag2 = resolver_tag(partes[1])
        await ctx.send(f"📊 | Comparando {tag1.upper()} vs {tag2.upper()} ...")
        try:
            (clan1, s1), (clan2, s2) = await asyncio.gather(
                obtener_clan(tag1), obtener_clan(tag2)
            )
        except Exception as e:
            logger.error(f"[!clan2] {e}")
            await ctx.send("📊 | Error inesperado.")
            return
        if clan1 is None:
            if (e := mensaje_error_api(s1)): await ctx.send(f"📊 | Error con el primer clan: {e}")
            return
        if clan2 is None:
            if (e := mensaje_error_api(s2)): await ctx.send(f"📊 | Error con el segundo clan: {e}")
            return
        for msg in formatear_comparar_clanes(clan1, clan2):
            await ctx.send(msg)

    # ── Comando de aldea ──────────────────────────────────────────────────────

    @commands.command(name="aldea")
    async def cmd_aldea(self, ctx: commands.Context, *, argumento: str = ""):
        """-aldea [tag] — % de progreso de mejoras de la aldea."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("🏗️ | Uso: -aldea #TAGJUGADOR — ej. -aldea #ABC123")
            return
        tag = resolver_tag(argumento)
        await ctx.send(f"🏗️ | Calculando progreso de {tag.upper()} ...")
        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[!aldea] {e}")
            await ctx.send("🏗️ | Error inesperado.")
            return
        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_progreso_aldea(jugador))

    @commands.command(name="skills")
    async def cmd_skills(self, ctx: commands.Context, *, argumento: str = ""):
        """-skills [tag] — Equipo activo de cada héroe con emojis y niveles."""
        argumento = argumento.strip()
        if not argumento:
            await ctx.send("🛡️ | Uso: -skills #TAGJUGADOR — ej. -skills #ABC123")
            return

        tag = resolver_tag(argumento)
        await ctx.send(f"🛡️ | Cargando equipo de héroes de {tag.upper()} ...")

        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[-skills] {e}")
            await ctx.send("🛡️ | Error inesperado.")
            return

        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return

        for msg in formatear_skills(jugador):
            await ctx.send(msg)

    # ── Comandos CCN ──────────────────────────────────────────────────────────

    @commands.command(name="ccn")
    async def cmd_ccn(self, ctx: commands.Context, *, argumento: str = ""):
        """-ccn <equipo> — Stats + última guerra de un equipo en CCN."""
        query = argumento.strip()
        if not query:
            await ctx.send("🏆 | Uso: -ccn <nombre del equipo> — ej. -ccn Tribe Gaming")
            return
        await ctx.send(f"🏆 | Buscando '{query}' en Competitive Clash Network...")
        try:
            equipo = await buscar_equipo(query)
        except Exception as e:
            logger.error(f"[ccn] {e}")
            await ctx.send("🏆 | Error consultando CCN, intenta de nuevo.")
            return
        if not equipo:
            await ctx.send(f"🏆 | No encontré ningún equipo parecido a '{query}' en CCN.")
            return

        await ctx.send(formatear_ccn(equipo))

        try:
            partido = await obtener_ultimo_partido(equipo["id"])
        except Exception as e:
            logger.error(f"[ccn/ultimo_partido] {e}")
            partido = None

        if partido:
            await ctx.send(formatear_ultimo_partido(partido))

    @commands.command(name="torneos")
    async def cmd_torneos(self, ctx: commands.Context):
        """-torneos → Torneos activos y próximos en CCN."""
        try:
            torneos = await obtener_torneos_activos()
        except Exception as e:
            logger.error(f"[torneos] {e}")
            await ctx.send("🏆 | Error consultando CCN, intenta de nuevo.")
            return
        await ctx.send(formatear_torneos(torneos))

    @commands.command(name="ccnrank")
    async def cmd_ccnrank(self, ctx: commands.Context):
        """-ccnrank — Ranking ELO en tiempo real de competitiveclash.network (se actualiza cada 6h)."""
        await ctx.send("⚡ | Consultando ranking ELO CCN...")
        try:
            ranking = await obtener_ranking_elo()
        except Exception as e:
            logger.error(f"[ccnrank] {e}")
            await ctx.send("⚡ | Error consultando CCN, intenta de nuevo.")
            return
        await ctx.send(formatear_ranking_elo(ranking))

    @commands.command(name="matches")
    async def cmd_matches(self, ctx: commands.Context, *, argumento: str = ""):
        """-matches <equipo> — Próximos partidos de un equipo en CCN (hora SV 🇲🇽 y Argentina 🇦🇷)."""
        query = argumento.strip()
        if not query:
            await ctx.send("📅 | Uso: -matches <nombre del equipo> — ej. -matches Team Elektros")
            return
        await ctx.send(f"📅 | Buscando partidas de '{query}' en CCN...")
        try:
            resultado = await buscar_partidas_equipo(query)
        except Exception as e:
            logger.error(f"[matches] {e}")
            await ctx.send("📅 | Error consultando CCN, intenta de nuevo.")
            return
        if not resultado:
            await ctx.send(f"📅 | No encontré partidas programadas para '{query}' en CCN.")
            return
        await ctx.send(formatear_partidas(resultado))

    @commands.command(name="matches1")
    async def cmd_matches1(self, ctx: commands.Context):
        """-matches1 — Todas las guerras de CCN programadas para HOY (hora SV 🇲🇽 y Argentina 🇦🇷)."""
        await ctx.send("⚔️ | Buscando guerras de HOY en CCN...")
        try:
            partidas = await obtener_guerras_dia(offset_dias=0)
        except Exception as e:
            logger.error(f"[matches1] {e}")
            await ctx.send("⚔️ | Error consultando CCN, intenta de nuevo.")
            return
        await ctx.send(formatear_guerras_dia(partidas, offset_dias=0))

    @commands.command(name="matches2")
    async def cmd_matches2(self, ctx: commands.Context):
        """-matches2 — Todas las guerras de CCN programadas para MAÑANA (hora SV 🇲🇽 y Argentina 🇦🇷)."""
        await ctx.send("⚔️ | Buscando guerras de MAÑANA en CCN...")
        try:
            partidas = await obtener_guerras_dia(offset_dias=1)
        except Exception as e:
            logger.error(f"[matches2] {e}")
            await ctx.send("⚔️ | Error consultando CCN, intenta de nuevo.")
            return
        await ctx.send(formatear_guerras_dia(partidas, offset_dias=1))

    @commands.command(name="ranking")
    async def cmd_ranking(self, ctx: commands.Context, *, argumento: str = ""):
        """-ranking <país> — Top 5 jugadores con más copas de un país (datos oficiales CoC)."""
        pais = argumento.strip()
        if not pais:
            await ctx.send("🌎 Uso: -ranking <país>  Ej: -ranking México · -ranking El Salvador · -ranking SV")
            return

        data, info = await ranking_pais(pais)
        if data is None:
            await ctx.send(f"🌎 {info}")
            return

        await ctx.send(formatear_ranking_pais(data, info))

    @commands.command(name="hlc")
    async def cmd_hlc(self, ctx: commands.Context, *, argumento: str = ""):
        """-hlc list → Lista paises | -hlc <pais> → Roster del pais (ej: -hlc elsalvador)"""
        arg = argumento.strip()

        if not arg or arg.lower() == "list":
            await ctx.send(lista_paises())
            return

        datos = buscar_pais(arg)
        if datos is None:
            await ctx.send(
                f"🌍 HLC | No encontré '{arg}'. Usa -hlc list para ver todos los países."
            )
            return

        for msg in roster_pais(datos):
            await ctx.send(msg)

    # ── Capital del Clan ──────────────────────────────────────────────────────

    @commands.command(name="capital")
    async def cmd_capital(self, ctx: commands.Context, *, argumento: str = ""):
        """-capital [alias] — Capital Hall y distritos del clan."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🏛️ | Uso: -capital #TAGCLAN o alias | Ej: -capital RNG")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🏛️ | Buscando Capital de {tag.upper()} ...")
        try:
            clan, status = await obtener_clan(tag)
        except Exception as e:
            logger.error(f"[-capital] {e}")
            await ctx.send("🏛️ | Error inesperado.")
            return
        if clan is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_capital(clan))

    # ── Raid Weekend ───────────────────────────────────────────────────────────

    @commands.command(name="raid")
    async def cmd_raid(self, ctx: commands.Context, *, argumento: str = ""):
        """-raid [alias] — Estado del Raid Weekend del clan."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🏛️ | Uso: -raid #TAGCLAN o alias | Ej: -raid RNG")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🏛️ | Buscando Raid Weekend de {tag.upper()} ...")
        try:
            clan, cs  = await obtener_clan(tag)
            raid, rs  = await obtener_raid_season(tag)
        except Exception as e:
            logger.error(f"[-raid] {e}")
            await ctx.send("🏛️ | Error inesperado.")
            return
        nombre_clan = clan.get("name", tag.upper()) if clan else tag.upper()
        if raid is None:
            if (e := mensaje_error_api(rs)): await ctx.send(e)
            return
        await ctx.send(formatear_raid(raid, nombre_clan))

    # ── CWL ───────────────────────────────────────────────────────────────────

    @commands.command(name="cwl")
    async def cmd_cwl(self, ctx: commands.Context, *, argumento: str = ""):
        """-cwl [alias] — Liga de Guerra de Clanes: temporada, rondas, clanes."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🏆 | Uso: -cwl #TAGCLAN o alias | Ej: -cwl RNG")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🏆 | Buscando CWL de {tag.upper()} ...")
        try:
            cwl, status = await obtener_cwl(tag)
        except Exception as e:
            logger.error(f"[-cwl] {e}")
            await ctx.send("🏆 | Error inesperado.")
            return
        if cwl is None:
            msg = mensaje_error_api(status)
            await ctx.send(msg or "🏆 | CWL no disponible (puede que no esté en temporada).")
            return
        for msg in formatear_cwl(cwl, tag):
            await ctx.send(msg)

    # ── VS: comparar dos jugadores ────────────────────────────────────────────

    @commands.command(name="vs")
    async def cmd_vs(self, ctx: commands.Context, *, argumento: str = ""):
        """-vs #TAG1 #TAG2 — Compara dos jugadores cara a cara."""
        partes = argumento.strip().split()
        if len(partes) < 2:
            await ctx.send("⚔️ | Uso: -vs #TAG1 #TAG2 — Ej: -vs #ABC123 #DEF456")
            return
        tag1 = resolver_tag(partes[0])
        tag2 = resolver_tag(partes[1])
        await ctx.send(f"⚔️ | Comparando {tag1.upper()} vs {tag2.upper()} ...")
        try:
            (j1, s1), (j2, s2) = await asyncio.gather(obtener_jugador(tag1), obtener_jugador(tag2))
        except Exception as e:
            logger.error(f"[-vs] {e}")
            await ctx.send("⚔️ | Error inesperado.")
            return
        if j1 is None:
            if (e := mensaje_error_api(s1)): await ctx.send(e)
            return
        if j2 is None:
            if (e := mensaje_error_api(s2)): await ctx.send(e)
            return
        await ctx.send(formatear_vs(j1, j2))

    # ── Sin defensa ───────────────────────────────────────────────────────────

    @commands.command(name="sindefensa")
    async def cmd_sindefensa(self, ctx: commands.Context, *, argumento: str = ""):
        """-sindefensa [alias] — Miembros del rival que aún no han recibido ataque."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🛡️ | Uso: -sindefensa #TAGCLAN o alias | Ej: -sindefensa RNG")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🛡️ | Buscando sin defensa para {tag.upper()} ...")
        try:
            guerra, status = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"[-sindefensa] {e}")
            await ctx.send("🛡️ | Error inesperado.")
            return
        if guerra is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_sindefensa(guerra))

    # ── Mapa de guerra ────────────────────────────────────────────────────────

    @commands.command(name="map")
    async def cmd_map(self, ctx: commands.Context, *, argumento: str = ""):
        """-map [alias] — Mapa de ataques: quién atacó a quién."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🗺️ | Uso: -map #TAGCLAN o alias | Ej: -map RNG")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🗺️ | Cargando mapa de guerra de {tag.upper()} ...")
        try:
            guerra, status = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"[-map] {e}")
            await ctx.send("🗺️ | Error inesperado.")
            return
        if guerra is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        for msg in formatear_mapa(guerra):
            await ctx.send(msg)

    # ── Predicción de resultado ───────────────────────────────────────────────

    @commands.command(name="prediccion")
    async def cmd_prediccion(self, ctx: commands.Context, *, argumento: str = ""):
        """-prediccion [alias] — Predicción del resultado basada en el promedio de ataques."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🔮 | Uso: -prediccion #TAGCLAN o alias | Ej: -prediccion RNG")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🔮 | Calculando predicción para {tag.upper()} ...")
        try:
            guerra, status = await obtener_guerra(tag)
        except Exception as e:
            logger.error(f"[-prediccion] {e}")
            await ctx.send("🔮 | Error inesperado.")
            return
        if guerra is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_prediccion(guerra))

    # ── Equipo completo de héroe ──────────────────────────────────────────────

    @commands.command(name="equipo")
    async def cmd_equipo(self, ctx: commands.Context, *, argumento: str = ""):
        """-equipo #TAG [héroe] — Todo el equipo disponible del jugador."""
        partes = argumento.strip().split(None, 1)
        if not partes:
            await ctx.send("🎒 | Uso: -equipo #TAG [héroe] — Ej: -equipo #ABC123 bárbaro")
            return
        tag    = resolver_tag(partes[0])
        filtro = partes[1] if len(partes) > 1 else ""
        await ctx.send(f"🎒 | Cargando equipo de {tag.upper()} ...")
        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[-equipo] {e}")
            await ctx.send("🎒 | Error inesperado.")
            return
        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        for msg in formatear_equipo_full(jugador, filtro):
            await ctx.send(msg)

    # ── Temporada de Leyenda ──────────────────────────────────────────────────

    @commands.command(name="temporada")
    async def cmd_temporada(self, ctx: commands.Context, *, argumento: str = ""):
        """-temporada #TAG — Resumen de la temporada de Leyenda del jugador."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🏅 | Uso: -temporada #TAGJUGADOR — Ej: -temporada #ABC123")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🏅 | Cargando temporada de {tag.upper()} ...")
        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[-temporada] {e}")
            await ctx.send("🏅 | Error inesperado.")
            return
        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_temporada(jugador))

    # ── Logros del jugador ────────────────────────────────────────────────────

    @commands.command(name="logros")
    async def cmd_logros(self, ctx: commands.Context, *, argumento: str = ""):
        """-logros #TAG — Logros principales completados y en progreso."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🏆 | Uso: -logros #TAGJUGADOR — Ej: -logros #ABC123")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🏆 | Cargando logros de {tag.upper()} ...")
        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[-logros] {e}")
            await ctx.send("🏆 | Error inesperado.")
            return
        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_logros(jugador))

    # ── Aldea del Constructor ─────────────────────────────────────────────────

    @commands.command(name="aldea2")
    async def cmd_aldea2(self, ctx: commands.Context, *, argumento: str = ""):
        """-aldea2 #TAG — Estadísticas de la Aldea del Constructor."""
        arg = argumento.strip()
        if not arg:
            await ctx.send("🔨 | Uso: -aldea2 #TAGJUGADOR — Ej: -aldea2 #ABC123")
            return
        tag = resolver_tag(arg)
        await ctx.send(f"🔨 | Cargando Aldea del Constructor de {tag.upper()} ...")
        try:
            jugador, status = await obtener_jugador(tag)
        except Exception as e:
            logger.error(f"[-aldea2] {e}")
            await ctx.send("🔨 | Error inesperado.")
            return
        if jugador is None:
            if (e := mensaje_error_api(status)): await ctx.send(e)
            return
        await ctx.send(formatear_jugador2(jugador))

    # ── Ayuda ─────────────────────────────────────────────────────────────────

    @commands.command(name="torneo")
    async def cmd_torneo(self, ctx: commands.Context, *, argumento: str = ""):
        """-torneo #TAG1..#TAG5 — Valida roster 2xTH18 + TH17 + TH16 + TH15."""
        ROSTER_REQUERIDO = {18: 2, 17: 1, 16: 1, 15: 1}
        tags_raw = [t for t in argumento.strip().split() if t]
        if not tags_raw:
            await ctx.send("🏆 | Uso: -torneo #TAG1 #TAG2 #TAG3 #TAG4 #TAG5 — Roster válido: 2×TH18 · 1×TH17 · 1×TH16 · 1×TH15")
            return
        if len(tags_raw) != 5:
            await ctx.send(f"🏆 | Se necesitan exactamente 5 tags (recibí {len(tags_raw)}). Roster: 2×TH18 · 1×TH17 · 1×TH16 · 1×TH15")
            return
        tags = [resolver_tag(t) for t in tags_raw]
        try:
            resultados = await asyncio.gather(*[obtener_jugador(t) for t in tags])
        except Exception as e:
            logger.error(f"[-torneo] {e}")
            await ctx.send("🏆 | Error inesperado consultando jugadores.")
            return
        jugadores = []
        for tag, (jugador, status) in zip(tags, resultados):
            if jugador is None:
                await ctx.send(f"🏆 | ❌ Tag no encontrado: {tag.upper()} — Verifica que sea correcto.")
                return
            jugadores.append(jugador)
        conteo: dict[int, int] = {}
        for j in jugadores:
            th = j.get("townHallLevel", 0)
            conteo[th] = conteo.get(th, 0) + 1
        errores = []
        for th, req in ROSTER_REQUERIDO.items():
            actual = conteo.get(th, 0)
            if actual < req:
                errores.append(f"falta {'un' if req - actual == 1 else req - actual} TH{th}")
            elif actual > req:
                errores.append(f"hay {actual - req} TH{th} de más")
        for th in conteo:
            if th not in ROSTER_REQUERIDO:
                errores.append(f"TH{th} no permitido")
        partes = [
            f"{j.get('name','?')} (TH{j.get('townHallLevel','?')})"
            for j in jugadores
        ]
        jugadores_str = " · ".join(partes)
        if errores:
            msg = ("🏆 TORNEO | ❌ ROSTER INVÁLIDO — " + " · ".join(errores) + " | " + jugadores_str)[:499]
        else:
            msg = ("🏆 TORNEO | ✅ Roster válido — " + jugadores_str)[:499]
        await ctx.send(msg)

    async def _construir_contexto_coc(self, pregunta: str, tag_forzado: str | None = None) -> str:
        """Detecta automáticamente qué datos de la API de CoC necesita la pregunta y los obtiene."""
        import re as _re
        p = pregunta.lower()
        contextos: list[str] = []

        kw_guerra  = {"guerra", "war", "atacar", "ataque", "estrellas", "ganar", "perder",
                      "destruccion", "mapa", "lineup", "ataques restantes", "rival", "ganar"}
        kw_clan    = {"clan", "miembros", "donaciones", "nivel de clan", "descripcion del clan"}
        kw_raid    = {"raid", "capital", "aldea capital", "distritos"}
        kw_jugador = {"jugador", "heroe", "tropas", "ayuntamiento", "aldea"}

        es_guerra  = any(k in p for k in kw_guerra)
        es_clan    = any(k in p for k in kw_clan)
        es_raid    = any(k in p for k in kw_raid)

        # Detectar tag en la pregunta (#XXXX o alias conocido)
        tag_en_pregunta = None
        m = _re.search(r"#[A-Z0-9]{4,12}", pregunta.upper())
        if m:
            tag_en_pregunta = m.group(0)
        else:
            for alias in CONFIG_CLANES:
                if alias.lower() in p:
                    tag_en_pregunta = CONFIG_CLANES[alias]
                    break

        tag = tag_forzado or tag_en_pregunta or _tag_rastreado

        # ── Datos de Guerra ───────────────────────────────────────────
        if tag and (es_guerra or (not es_clan and not es_raid)):
            try:
                guerra, status = await obtener_guerra(tag)
                if guerra and guerra.get("state") in ("inWar", "preparation", "warEnded"):
                    cl   = guerra.get("clan",     {})
                    rv   = guerra.get("opponent", {})
                    sz   = guerra.get("teamSize",  0)
                    atq_cl  = cl.get("attacks",  0);  atq_rv = rv.get("attacks", 0)
                    rst_cl  = max(0, sz * 2 - atq_cl); rst_rv = max(0, sz * 2 - atq_rv)
                    est_cl  = cl.get("stars",  0);    est_rv = rv.get("stars", 0)
                    dest_cl = round(cl.get("destructionPercentage", 0.0), 2)
                    dest_rv = round(rv.get("destructionPercentage", 0.0), 2)
                    prom_cl = round(est_cl / atq_cl, 2) if atq_cl > 0 else 0
                    prom_rv = round(est_rv / atq_rv, 2) if atq_rv > 0 else 0
                    gap = est_rv - est_cl
                    if gap > 0:
                        situacion = f"Van ABAJO por {gap}⭐. Necesitan {gap} estrellas en {rst_cl} ataques para empatar."
                    elif gap == 0:
                        diff_dest = round(dest_rv - dest_cl, 2)
                        situacion = (f"EMPATE en estrellas. Para ganar necesitan superar {diff_dest}% destrucción adicional."
                                     if diff_dest > 0 else
                                     f"VAN GANANDO en destruccion ({dest_cl}% vs {dest_rv}%). Proteger los {rst_cl} ataques.")
                    else:
                        situacion = f"Van ARRIBA por {abs(gap)}⭐ con {rst_cl} ataques restantes."
                    contextos.append(
                        f"[GUERRA CoC TIEMPO REAL — {guerra.get('state','?').upper()} — {sz}v{sz}]\n"
                        f"Nuestro clan '{cl.get('name','?')}': {est_cl}⭐ | {dest_cl}% destruccion | "
                        f"{atq_cl} ataques usados | {rst_cl} restantes | prom {prom_cl}⭐/ataque\n"
                        f"Rival '{rv.get('name','?')}': {est_rv}⭐ | {dest_rv}% destruccion | "
                        f"{atq_rv} ataques usados | {rst_rv} restantes | prom {prom_rv}⭐/ataque\n"
                        f"Situacion: {situacion}"
                    )
                elif status == 200:
                    contextos.append("[No hay guerra activa para ese clan en este momento]")
            except Exception as e:
                logger.warning(f"[ctx_coc guerra] {e}")

        # ── Datos de Clan ─────────────────────────────────────────────
        if es_clan and tag:
            try:
                clan_data, status = await obtener_clan(tag)
                if clan_data and status == 200:
                    contextos.append(
                        f"[CLAN CoC]\n"
                        f"Nombre: {clan_data.get('name','?')} | Nivel: {clan_data.get('clanLevel','?')} | "
                        f"Miembros: {clan_data.get('members','?')}/50 | "
                        f"Puntos: {clan_data.get('clanPoints','?')} | "
                        f"Liga guerra: {clan_data.get('warLeague',{}).get('name','?')} | "
                        f"Racha victorias: {clan_data.get('warWinStreak','?')} | "
                        f"Total victorias: {clan_data.get('warWins','?')}"
                    )
            except Exception as e:
                logger.warning(f"[ctx_coc clan] {e}")

        # ── Datos de Raid Capital ─────────────────────────────────────
        if es_raid and tag:
            try:
                raid_data, status = await obtener_raid_season(tag)
                if raid_data and status == 200:
                    items = raid_data.get("items", [])
                    if items:
                        r = items[0]
                        contextos.append(
                            f"[RAID CAPITAL CoC]\n"
                            f"Estado: {r.get('state','?')} | "
                            f"Ataques totales: {r.get('totalAttacks','?')} | "
                            f"Distritos destruidos: {r.get('districtsDestroyed','?')} | "
                            f"Capital saqueado: {r.get('capitalTotalLoot', 0):,}"
                        )
            except Exception as e:
                logger.warning(f"[ctx_coc raid] {e}")

        return "\n\n".join(contextos)

    @commands.command(name="ia")
    async def cmd_ia(self, ctx: commands.Context, *, argumento: str = ""):
        """-ia <pregunta> — IA experta en CoC que consulta la API en tiempo real."""
        from google.genai import types as _gtypes

        autor = ctx.author.name.lower() if ctx.author else ""
        if autor not in USUARIOS_PERMITIDOS:
            return

        argumento = argumento.strip()
        if not argumento:
            await ctx.send(
                "🤖 Uso: -ia <pregunta> — Ejemplos: -ia ¿qué necesita RNG para ganar? | -ia ¿cuántos ataques quedan?"
            )
            return

        canal_nombre = ctx.channel.name if ctx.channel else "?"
        sistema = (
            "Eres bothoodes, un tipo que sabe un chingo de Clash of Clans y está en el chat de Twitch de lordhood__. "
            "Hablas como una persona normal — casual, directo, sin frases de robot. "
            "Nunca empieces con '¡Claro!', '¡Por supuesto!', 'Entendido' ni nada por el estilo. "
            "Entra directo al punto, como si le respondieras a un amigo. "
            "CoC que conoces: guerra = 2 ataques c/u, gana más estrellas (desempate %destrucción); "
            "TH del 1 al 17; héroes: Rey Bárbaro, Reina Arquera, Gran Guardián, Campeón Real, Titán; "
            "CWL = 1 ataque/día 7 días; Raid Capital = 6 ataques/jugador. "
            "Si recibes datos reales de la API úsalos para responder con números exactos. "
            "Para preguntas como '¿qué necesita el clan para ganar?' calcula directo con los datos. "
            "Responde cualquier cosa, no solo CoC. Nada de groserías. Máximo 2-3 líneas."
        )

        # ── Detectar tag explícito tipo -ia RNG ¿qué pasa? ───────────────────
        partes      = argumento.split(None, 1)
        primer_word = partes[0].upper()
        tag_forzado = None
        if partes[0].startswith("#") or primer_word in (k.upper() for k in CONFIG_CLANES):
            tag_forzado = resolver_tag(partes[0])
            argumento   = partes[1] if len(partes) > 1 else "analiza la situación actual"

        # ── Construir contexto CoC automáticamente (sin mensaje previo) ───────
        contexto_coc = await self._construir_contexto_coc(argumento, tag_forzado)
        pregunta_final = f"{contexto_coc}\n\nPregunta: {argumento}" if contexto_coc else f"Pregunta: {argumento}"

        # ── Verificar rate limit antes de llamar a Gemini ─────────────────────
        permitido, motivo = _ia_puede_llamar(autor)
        if not permitido:
            await ctx.send(f"🤖 @{autor} {motivo}")
            return

        try:
            historial = list(_historial_ia.get(canal_nombre, []))
            contents  = historial + [{"role": "user", "parts": [{"text": pregunta_final}]}]
            _ia_registrar_llamada(autor)
            respuesta = await asyncio.to_thread(
                lambda: _gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=_gtypes.GenerateContentConfig(
                        system_instruction=sistema,
                        tools=[obtener_datos_stream],
                        automatic_function_calling=_gtypes.AutomaticFunctionCallingConfig(
                            disable=False
                        ),
                        max_output_tokens=120,
                    ),
                )
            )
            texto = (respuesta.text or "Sin respuesta.").strip()
            if len(texto) > 450:
                texto = texto[:447] + "..."
            await ctx.send(f"🤖 {texto}")
            _agregar_historial(canal_nombre, "user",  pregunta_final)
            _agregar_historial(canal_nombre, "model", texto)
        except Exception as e:
            err_str = str(e)
            logger.error(f"[-ia] Gemini error: {e}")
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                retry = 45
                import re as _re
                m = _re.search(r"retryDelay.*?'(\d+)s'", err_str)
                if m:
                    retry = int(m.group(1)) + 2
                await ctx.send(f"🤖 Cuota de IA alcanzada, intenta en {retry}s ⏳")
            else:
                await ctx.send("🤖 Error consultando la IA. Verifica GEMINI_API_KEY.")

    @commands.command(name="clear")
    async def cmd_clear(self, ctx: commands.Context):
        """-clear — Borra el historial de conversación IA del canal (solo usuarios permitidos)."""
        autor = ctx.author.name.lower() if ctx.author else ""
        if autor not in USUARIOS_PERMITIDOS:
            return
        canal_nombre = ctx.channel.name if ctx.channel else "?"
        _historial_ia.pop(canal_nombre, None)
        await ctx.send("🤖 Historial de conversación borrado. Empezamos de cero ✨")

    @commands.command(name="historia")
    async def cmd_historia(self, ctx: commands.Context):
        """-historia — Muestra un resumen del historial de conversación IA del canal (solo usuarios permitidos)."""
        autor = ctx.author.name.lower() if ctx.author else ""
        if autor not in USUARIOS_PERMITIDOS:
            return
        canal_nombre = ctx.channel.name if ctx.channel else "?"
        historial = _historial_ia.get(canal_nombre, [])
        if not historial:
            await ctx.send("🤖 No hay historial de conversación en este canal todavía.")
            return
        pares = len(historial) // 2
        intercambios = []
        for i in range(0, len(historial) - 1, 2):
            user_text  = historial[i]["parts"][0]["text"][:40].replace("\n", " ")
            model_text = historial[i + 1]["parts"][0]["text"][:40].replace("\n", " ") if i + 1 < len(historial) else "..."
            intercambios.append(f"[{i//2 + 1}] 👤 {user_text}… → 🤖 {model_text}…")
        resumen = f"🧠 Historial ({pares} intercambio{'s' if pares != 1 else ''}): " + " | ".join(intercambios)
        if len(resumen) > 490:
            resumen = resumen[:487] + "..."
        await ctx.send(resumen)

    async def _handle_entrar(self, message: twitchio.Message):
        """Registra a un viewer que escribe '!entrar' durante un sorteo activo."""
        canal = message.channel.name if message.channel else ""
        autor = message.author.name  if message.author  else ""
        texto = (message.content or "").strip().lower()

        if not canal or not autor:
            return
        if not _sorteo_activo.get(canal):
            return
        if texto != "!entrar":
            return

        _sorteo_participantes.setdefault(canal, set()).add(autor.lower())
        logger.debug(f"[SORTEO] #{canal} - {autor} se inscribio ({len(_sorteo_participantes[canal])} participantes)")

    @commands.command(name="sorteo")
    async def cmd_sorteo(self, ctx):
        """-sorteo — Inicia un sorteo de 60 segundos. Solo usuarios autorizados."""
        canal = ctx.channel.name
        autor = ctx.author.name.lower() if ctx.author else ""

        if autor not in USUARIOS_PERMITIDOS:
            await ctx.send("No tienes permiso para iniciar un sorteo.")
            return

        if _sorteo_activo.get(canal):
            await ctx.send("Ya hay un sorteo en curso. Espera a que termine!")
            return

        _sorteo_activo[canal] = True
        _sorteo_participantes[canal] = set()

        await ctx.send("SORTEO INICIADO! Escribe !entrar para participar. Tienes " + str(_SORTEO_DURACION) + " segundos!")
        logger.info("[SORTEO] #" + canal + " - iniciado por " + autor)

        await asyncio.sleep(30)
        if _sorteo_activo.get(canal):
            n = len(_sorteo_participantes.get(canal, set()))
            await ctx.send("Quedan 30 segundos! " + str(n) + " participante(s). Escribe !entrar!")

        await asyncio.sleep(20)
        if _sorteo_activo.get(canal):
            await ctx.send("Ultimos 10 segundos para entrar al sorteo!")

        await asyncio.sleep(10)

        _sorteo_activo[canal] = False
        participantes = _sorteo_participantes.pop(canal, set())

        if not participantes:
            await ctx.send("El sorteo termino pero nadie participo.")
            return

        ganador = random.choice(list(participantes))
        await ctx.send("El sorteo termino! De " + str(len(participantes)) + " participantes, el ganador es @" + ganador + "! Felicidades!")
        logger.info("[SORTEO] #" + canal + " - ganador: " + ganador)

    @commands.command(name="ayuda")
    async def cmd_ayuda(self, ctx: commands.Context):
        """-ayuda — Muestra todos los comandos disponibles."""
        logger.info(f"[AYUDA] Intentando enviar en #{ctx.channel.name}")
        try:
            await ctx.send(
                "⚔️ GUERRA: -war · -wartag · -lineup · -sinatacar · -sindefensa · -topataques · "
                "-nexo · -cuenta · -map · -prediccion | "
                "🏰 CLAN: -clan · -roster · -donaciones · -historial · -clan2 · "
                "-capital · -raid · -cwl | "
                "👤 JUGADOR: -player · -aldea · -aldea2 · -skills · -equipo · "
                "-temporada · -logros · -leyenda · -ll · -vs | "
                "🌍 HLC: -hlc list · -hlc <país> | "
                "🌐 TRADUCCIÓN: -ing <texto> · -esp <texto> | "
                "📊 OTROS: -ranking · -wartrack · -clanes · -ccn · -ccnrank · "
                "-matches · -torneos · -torneo · -sorteo · -ayuda"
            )
            logger.info(f"[AYUDA] Enviado correctamente en #{ctx.channel.name}")
        except Exception as e:
            logger.error(f"[AYUDA] Falló el envío en #{ctx.channel.name}: {e}", exc_info=True)


# ─── Lock via PostgreSQL Advisory Lock ────────────────────────────────────────
#
# pg_try_advisory_lock(id) es ATÓMICO en el servidor de BD y tiene ALCANCE DE
# SESIÓN: cuando la conexión se cierra (proceso muere o recibe SIGTERM), el
# servidor libera el lock automáticamente. No requiere tablas ni TTL manual.
#
# Todos los contenedores de deployment comparten la MISMA base de datos
# PostgreSQL de Replit → este mecanismo garantiza exactamente 1 bot activo.
#
# Fallback: si DATABASE_URL no está disponible, el bot corre sin coordinación.
# ──────────────────────────────────────────────────────────────────────────────
try:
    import psycopg2 as _psycopg2
    _PSYCOPG2_OK = True
except ImportError:
    _PSYCOPG2_OK = False

_PG_LOCK_ID  = 7483920          # ID arbitrario único para este bot
_KV_HB_SECS  = 8                # compat. con código existente
_pg_lock_conn = None            # conexión que sostiene el advisory lock

# IP del host 'helium' (BD de Replit), pre-resuelta desde el entorno de dev.
# En producción, 'helium' no tiene registro DNS pero la IP sí es accesible.
_HELIUM_IP = "172.31.99.68"


def _build_db_urls(base_url: str) -> list:
    """Devuelve lista de URLs a intentar: original + con hostname→IP."""
    urls = [base_url]
    if base_url and "helium" in base_url:
        urls.append(base_url.replace("helium", _HELIUM_IP))
    return urls


def _acquire_pg_lock() -> bool:
    """
    Intenta adquirir el PostgreSQL advisory lock (no-bloqueante).
    Retorna True si este contenedor debe correr como bot activo.
    Retorna False si otro contenedor ya tiene el lock.
    Retorna None si la BD no está disponible (corre sin coordinación).
    """
    global _pg_lock_conn
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url or not _PSYCOPG2_OK:
        logger.warning("[PG-LOCK] DATABASE_URL no disponible — corriendo sin lock")
        return None

    last_err = None
    for url in _build_db_urls(db_url):
        try:
            conn = _psycopg2.connect(url, connect_timeout=4)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("SELECT pg_try_advisory_lock(%s)", (_PG_LOCK_ID,))
            acquired = cur.fetchone()[0]
            if acquired:
                _pg_lock_conn = conn   # mantener conexión para conservar el lock
                logger.info("[PG-LOCK] 🏆 Advisory lock adquirido — soy el bot activo")
            else:
                conn.close()
                logger.info("[PG-LOCK] Lock en uso por otro contenedor")
            return acquired
        except Exception as e:
            last_err = e
            logger.debug(f"[PG-LOCK] Intento fallido con URL={url[:40]}...: {e}")

    logger.warning(f"[PG-LOCK] Error al conectar a BD: {last_err} — corriendo sin lock")
    return None


def _wait_for_pg_lock() -> None:
    """Bloquea en STANDBY hasta que el advisory lock se libere."""
    logger.info("[PG-LOCK] ⏸️  Modo STANDBY — reintentando cada 10 s...")
    while True:
        time.sleep(10)
        result = _acquire_pg_lock()
        if result is True:
            logger.info("[PG-LOCK] Lock adquirido — reiniciando como instancia activa...")
            os.execv(sys.executable, [sys.executable] + sys.argv)
        elif result is None:
            return   # BD no disponible, correr sin coordinación


def _release_pg_lock() -> None:
    """Cierra la conexión → el servidor PostgreSQL libera el advisory lock."""
    global _pg_lock_conn
    if _pg_lock_conn is not None:
        try:
            _pg_lock_conn.close()
        except Exception:
            pass
        _pg_lock_conn = None


# ─── Health server para deployment standalone ──────────────────────────────────


class _HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, *args):
        pass  # silenciar logs del HTTPServer


def _start_health_thread(port: int) -> None:
    server = HTTPServer(("0.0.0.0", port), _HealthHandler)
    logger.info(f"🌐 Health server escuchando en puerto {port}")
    server.serve_forever()


# ─── Punto de entrada ─────────────────────────────────────────────────────────
def main():
    logger.info("🚀 Iniciando Bot de Clash of Clans para Twitch...")
    logger.info(
        f"[DEDUP] Hostname={_DEDUP_HOSTNAME!r} PID={os.getpid()} "
        f"UID={_DEDUP_UID[:20]!r} delay={_DEDUP_DELAY_S:.3f}s"
    )

    # ── PG Advisory Lock: garantiza exactamente 1 bot activo entre contenedores ─
    # pg_try_advisory_lock es atómico en el servidor de BD y tiene alcance de
    # sesión: si el proceso muere, el servidor libera el lock automáticamente.
    pg_result = _acquire_pg_lock()
    if pg_result is False:
        # Otro contenedor ya tiene el lock → esperar en STANDBY
        _wait_for_pg_lock()
        return   # os.execv dentro de _wait_for_pg_lock reinicia limpio
    # pg_result is True  → lock adquirido, somos el bot activo
    # pg_result is None  → BD no disponible, correr sin coordinación (fallback)

    # ── Delay de arranque: esperar a que la instancia anterior se desconecte ──
    # Replit hace rolling updates: el nuevo contenedor arranca MIENTRAS el viejo
    # todavía vive. El viejo recibe SIGTERM y tiene 5 s para salir antes de
    # que mandemos SIGKILL. Esperamos 20 s para dar margen amplio.
    _startup_delay = int(os.environ.get("BOT_STARTUP_DELAY", "20"))
    if _startup_delay > 0:
        logger.info(f"[STARTUP] Esperando {_startup_delay}s para que la instancia anterior se desconecte de Twitch...")
        time.sleep(_startup_delay)
        logger.info("[STARTUP] Delay completado — conectando a Twitch...")

    # ── SIGTERM: liberar lock, cerrar bot y forzar salida en 5 s ──────────────
    async def _run_bot():
        bot = CoCBot()
        loop = asyncio.get_running_loop()

        def _on_sigterm():
            logger.info("🛑 SIGTERM recibido — liberando lock y desconectando...")
            _release_pg_lock()
            asyncio.create_task(bot.close())
            # Forzar salida en 5 s si bot.close() no termina
            loop.call_later(5.0, lambda: os._exit(0))

        loop.add_signal_handler(signal.SIGTERM, _on_sigterm)
        loop.add_signal_handler(signal.SIGINT,  _on_sigterm)

        await bot.start()

    try:
        asyncio.run(_run_bot())
    except (SystemExit, KeyboardInterrupt):
        pass
    finally:
        _release_pg_lock()   # garantiza liberación al salir por cualquier razón


if __name__ == "__main__":
    main()
