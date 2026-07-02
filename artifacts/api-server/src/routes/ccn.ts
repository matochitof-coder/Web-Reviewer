import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const CCN_BASE = "https://competitiveclash.network";
const CCN_TOKEN = "4597f448-784d-45ab-8dd0-8a8e4eb9adbb";

// ─── Response-level HTTP cache ────────────────────────────────────────────────
// Prevents hammering CCN on every user request.
// Even with 50 concurrent users refreshing every 90 s, CCN only gets 1 req/TTL.
type CacheEntry = { data: unknown; ts: number };
const _responseCache = new Map<string, CacheEntry>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const e = _responseCache.get(key);
  if (e && Date.now() - e.ts < ttlMs) return e.data as T;
  return null;
}
function setCache(key: string, data: unknown): void {
  _responseCache.set(key, { data, ts: Date.now() });
  // Prune old entries when cache grows large (>200 keys)
  if (_responseCache.size > 200) {
    const oldest = [..._responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) _responseCache.delete(oldest[0]);
  }
}

// Cached wrappers ─────────────────────────────────────────────────────────────
async function ccnApiGet(path: string, ttlMs = 120_000): Promise<unknown> {
  const cached = getCached<unknown>(`api:${path}`, ttlMs);
  if (cached !== null) return cached;
  const res = await fetch(`${CCN_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${CCN_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "CCN-War-Tracker/1.0",
    },
  });
  if (!res.ok) throw new Error(`CCN API error ${res.status} at ${path}`);
  const data = await res.json();
  setCache(`api:${path}`, data);
  return data;
}

async function ccnHtmlGet(path: string, ttlMs = 90_000): Promise<string> {
  const cached = getCached<string>(`html:${path}`, ttlMs);
  if (cached !== null) return cached;
  const res = await fetch(`${CCN_BASE}${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CCN-War-Tracker/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`CCN HTML fetch error ${res.status} at ${path}`);
  const html = await res.text();
  setCache(`html:${path}`, html);
  return html;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseCcnDate(raw: string): string {
  const MONTHS: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const m = raw.trim().match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})\s+(\d{2}):(\d{2})/);
  if (!m) return raw;
  const [, day, mon, yr, hh, mm] = m;
  const year = yr.length === 2 ? `20${yr}` : yr;
  const month = MONTHS[mon] ?? "01";
  return `${year}-${month}-${day.padStart(2, "0")}T${hh}:${mm}:00Z`;
}

function isoToLocal(iso: string, tz: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function parseMatchRows(html: string): Array<{
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeEloRank: string | null;
  awayEloRank: string | null;
  scheduledAt: string;
  scheduledAtSv: string;
  scheduledAtAr: string;
  status: string;
  tournamentName: string | null;
  hasStream: boolean;
}> {
  const rows: ReturnType<typeof parseMatchRows> = [];
  const trPattern = /<tr[^>]+data-id="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
  let trMatch;
  while ((trMatch = trPattern.exec(html)) !== null) {
    const id = trMatch[1];
    const rowHtml = trMatch[2];

    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
      cells.push(tdMatch[1]);
    }

    if (cells.length < 4) continue;

    const rawDate = stripTags(cells[0]);
    const scheduledAt = parseCcnDate(rawDate);

    const teamSpans = Array.from(cells[1].matchAll(/<span>([\s\S]*?)<\/span>/g)).map(
      (m) => stripTags(m[1]),
    );
    const homeTeam = teamSpans[0] ?? "TBD";
    const awayTeam = teamSpans[1] ?? "TBD";

    const eloTexts = Array.from(cells[2].matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)).map((m) =>
      stripTags(m[1]),
    );
    const homeEloRank = eloTexts[0]?.replace(/-/, "").trim() ? eloTexts[0].trim() : null;
    const awayEloRank = eloTexts[1]?.replace(/-/, "").trim() ? eloTexts[1].trim() : null;

    const eventSpanM = cells[3].match(/<span>([\s\S]*?)<\/span>/);
    const tournamentName = eventSpanM ? stripTags(eventSpanM[1]) : null;

    const hasStream = cells[4]?.includes("fa-video") ?? false;

    rows.push({
      id,
      homeTeam,
      awayTeam,
      homeEloRank: homeEloRank === "-" || !homeEloRank ? null : homeEloRank,
      awayEloRank: awayEloRank === "-" || !awayEloRank ? null : awayEloRank,
      scheduledAt,
      scheduledAtSv: isoToLocal(scheduledAt, "America/El_Salvador"),
      scheduledAtAr: isoToLocal(scheduledAt, "America/Argentina/Buenos_Aires"),
      status: "scheduled",
      tournamentName: tournamentName || null,
      hasStream,
    });
  }
  return rows;
}

interface EloRankEntry {
  team_id: number;
  elo_rank: number;
  elo_points: number;
  elo_rank_classic: number;
  elo_points_classic: number;
  team: {
    team_id: number;
    team_name: string;
    twitter: string | null;
    active: boolean;
    has_image: boolean;
    contact: string | null;
    profileurl: string;
  };
}

interface TeamEntry {
  team_id: number;
  team_name: string;
  twitter: string | null;
  active: boolean;
  has_image: boolean;
  contact: string | null;
  profileurl: string;
}


// ─── War memory cache ─────────────────────────────────────────────────────────
// Keeps wars visible even after they leave /matches/upcoming (i.e. when live)
type CachedWar = {
  id: string; homeTeam: string; awayTeam: string;
  homeEloRank: string | null; awayEloRank: string | null;
  scheduledAt: string; scheduledAtSv: string; scheduledAtAr: string;
  tournamentName: string | null; hasStream: boolean;
};
const warMemory = new Map<string, { war: CachedWar; scheduledMs: number }>();

const WAR_DURATION_MS = 7 * 60 * 60 * 1000;   // 7 h — CoC war lasts up to 24h, CCN matches ~7h
const WAR_CACHE_TTL  = 9 * 60 * 60 * 1000;   // Evict 9 h after scheduled time

function computeStatus(scheduledMs: number): string {
  const now = Date.now();
  if (now >= scheduledMs - 10 * 60 * 1000 && now <= scheduledMs + WAR_DURATION_MS) return "inprogress";
  if (now > scheduledMs + WAR_DURATION_MS) return "finished";
  return "scheduled";
}

function filterByOffset(matches: Array<CachedWar & { status: string }>, offset: number) {
  if (isNaN(offset) || offset === 0) return matches;
  return matches.filter((m) => {
    try {
      const d = new Date(m.scheduledAt);
      const target = new Date();
      target.setUTCDate(target.getUTCDate() + offset);
      return (
        d.getUTCFullYear() === target.getUTCFullYear() &&
        d.getUTCMonth() === target.getUTCMonth() &&
        d.getUTCDate() === target.getUTCDate()
      );
    } catch { return false; }
  });
}

// ─── Background polling ────────────────────────────────────────────────────────
// Proactively fetches CCN data so the cache is always warm and users get
// instant responses without waiting for an on-demand CCN round-trip.

const POLL_WARS_MS = 2 * 60 * 1000;   // 2 min — wars update frequently
const POLL_ELO_MS  = 10 * 60 * 1000;  // 10 min — ranking changes slowly

/** Fetches fresh war HTML from CCN, warms the cache, and updates warMemory. */
async function pollWars(): Promise<void> {
  const res = await fetch(`${CCN_BASE}/matches/upcoming`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CCN-War-Tracker/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`CCN HTML ${res.status}`);
  const html = await res.text();

  // Warm the shared response cache so on-demand requests skip the CCN trip
  setCache("html:/matches/upcoming", html);

  const fresh = parseMatchRows(html);
  const now = Date.now();
  for (const m of fresh) {
    const scheduledMs = new Date(m.scheduledAt).getTime();
    warMemory.set(m.id, { war: m, scheduledMs });
  }
  for (const [id, entry] of warMemory.entries()) {
    if (now > entry.scheduledMs + WAR_CACHE_TTL) warMemory.delete(id);
  }
}

/** Fetches fresh ELO ranking from CCN API and warms the response cache. */
async function pollElo(): Promise<void> {
  const res = await fetch(`${CCN_BASE}/api/elo-rank`, {
    headers: {
      Authorization: `Bearer ${CCN_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "CCN-War-Tracker/1.0",
    },
  });
  if (!res.ok) throw new Error(`CCN API ${res.status}`);
  const data = await res.json();
  setCache("api:/api/elo-rank", data);
}

/**
 * Starts background polling of CCN data.
 * Call once after the server starts listening.
 * Wars are refreshed every 2 min; ELO ranking every 10 min.
 */
export function startPolling(): void {
  // Prime the caches immediately on startup
  void pollWars()
    .then(() => logger.info("CCN poll: wars primed"))
    .catch((e: unknown) => logger.error({ err: e }, "CCN poll: initial war fetch failed"));

  void pollElo()
    .then(() => logger.info("CCN poll: ELO primed"))
    .catch((e: unknown) => logger.error({ err: e }, "CCN poll: initial ELO fetch failed"));

  // Recurring background refresh
  setInterval(() => {
    void pollWars()
      .then(() => logger.info("CCN poll: wars refreshed"))
      .catch((e: unknown) => logger.error({ err: e }, "CCN poll: war refresh failed"));
  }, POLL_WARS_MS);

  setInterval(() => {
    void pollElo()
      .then(() => logger.info("CCN poll: ELO refreshed"))
      .catch((e: unknown) => logger.error({ err: e }, "CCN poll: ELO refresh failed"));
  }, POLL_ELO_MS);
}

router.get("/ccn/guerras", async (req, res) => {
  const offset = parseInt(String(req.query.offset ?? "0"), 10);
  const now = Date.now();

  try {
    const html = await ccnHtmlGet("/matches/upcoming");
    const fresh = parseMatchRows(html);

    // Upsert fresh matches into cache
    for (const m of fresh) {
      const scheduledMs = new Date(m.scheduledAt).getTime();
      warMemory.set(m.id, { war: m, scheduledMs });
    }

    // Evict expired entries
    for (const [id, entry] of warMemory.entries()) {
      if (now > entry.scheduledMs + WAR_CACHE_TTL) warMemory.delete(id);
    }

    // Build result from full cache (includes wars that just went live)
    const allMatches = [...warMemory.values()]
      .map(({ war, scheduledMs }) => ({ ...war, status: computeStatus(scheduledMs) }))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    res.json(filterByOffset(allMatches, offset));
  } catch (err) {
    req.log.error({ err }, "Error fetching CCN guerras — serving from cache");

    // Serve stale cache rather than a hard error
    const cached = [...warMemory.values()]
      .map(({ war, scheduledMs }) => ({ ...war, status: computeStatus(scheduledMs) }))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    if (cached.length > 0) {
      res.json(filterByOffset(cached, offset));
    } else {
      res.status(502).json({ error: "Could not fetch wars from CCN" });
    }
  }
});
router.get("/ccn/ranking-elo", async (req, res) => {
  try {
    const data = (await ccnApiGet("/api/elo-rank")) as EloRankEntry[];
    const ranking = (Array.isArray(data) ? data : []).map((entry) => ({
      rank: entry.elo_rank,
      teamId: String(entry.team_id),
      teamName: entry.team.team_name,
      elo: entry.elo_points,
      // wins/losses not provided by CCN ELO API; default to 0
      wins: 0,
      losses: 0,
      eloClassic: entry.elo_points_classic,
      rankClassic: entry.elo_rank_classic,
      badgeUrl: entry.team.has_image
        ? `${CCN_BASE}/static/teams/t-${entry.team_id}-sized.png`
        : `${CCN_BASE}/static/teams/default.png`,
      profileUrl: entry.team.profileurl,
      twitter: entry.team.twitter,
    }));
    res.json(ranking);
  } catch (err) {
    req.log.error({ err }, "Error fetching CCN ranking ELO");
    res.status(502).json({ error: "Could not fetch ELO ranking from CCN" });
  }
});

router.get("/ccn/ranking-mensual", async (req, res) => {
  try {
    const data = (await ccnApiGet("/api/elo-rank")) as EloRankEntry[];
    const ranking = (Array.isArray(data) ? data : [])
      .sort((a, b) => a.elo_rank_classic - b.elo_rank_classic)
      .slice(0, 50)
      .map((entry) => ({
        rank: entry.elo_rank_classic,
        teamId: String(entry.team_id),
        teamName: entry.team.team_name,
        points: entry.elo_points_classic,
        badgeUrl: entry.team.has_image
          ? `${CCN_BASE}/static/teams/t-${entry.team_id}-sized.png`
          : `${CCN_BASE}/static/teams/default.png`,
        profileUrl: entry.team.profileurl,
      }));
    res.json(ranking);
  } catch (err) {
    req.log.error({ err }, "Error fetching CCN ranking mensual");
    res.status(502).json({ error: "Could not fetch monthly ranking from CCN" });
  }
});

router.get("/ccn/torneos", async (req, res) => {
  try {
    const html = await ccnHtmlGet("/events");

    const torneos: Array<{
      id: string;
      name: string;
      status: string;
      imageUrl: string | null;
      profileUrl: string;
    }> = [];

    let currentStatus = "active";
    const h2Pattern = /<h2[^>]*>([\s\S]*?)<\/h2>/g;
    const blockPattern =
      /<div class="flex justify-start[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;

    const eventBlockPattern =
      /<a href="(https:\/\/competitiveclash\.network\/events\/(\d+))"[^>]*>\s*<div class="text-lg font-semibold">([\s\S]*?)<\/div>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g;

    const imagePattern =
      /<img src="(https:\/\/competitiveclash\.network\/static\/tournaments\/[^"]+)"[^>]*>/g;

    const sections = html.split(/<h2[^>]*>/);
    for (const section of sections) {
      const h2Match = section.match(/^([^<]*)/);
      const sectionTitle = h2Match ? h2Match[1].toLowerCase() : "";
      if (sectionTitle.includes("active") || sectionTitle.includes("ongoing")) {
        currentStatus = "active";
      } else if (sectionTitle.includes("completed") || sectionTitle.includes("past")) {
        currentStatus = "completed";
      } else if (sectionTitle.includes("upcoming")) {
        currentStatus = "upcoming";
      }

      const localEventPattern =
        /href="(https:\/\/competitiveclash\.network\/events\/(\d+))"[^>]*>[\s\S]*?<div class="text-lg font-semibold">([\s\S]*?)<\/div>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g;
      const localImagePattern =
        /src="(https:\/\/competitiveclash\.network\/static\/tournaments\/[^"]+)"/g;

      let evMatch;
      while ((evMatch = localEventPattern.exec(section)) !== null) {
        const profileUrl = evMatch[1];
        const id = evMatch[2];
        const name = stripTags(evMatch[3]);
        const rawStatus = stripTags(evMatch[4]).toLowerCase();

        let status = currentStatus;
        if (rawStatus.includes("ongoing")) status = "active";
        else if (rawStatus.includes("upcoming")) status = "upcoming";
        else if (rawStatus.includes("completed")) status = "completed";

        const imgM = localImagePattern.exec(section);
        const imageUrl = imgM ? imgM[1] : null;

        if (id && name) {
          torneos.push({ id, name, status, imageUrl, profileUrl });
        }
      }

      void h2Pattern;
      void blockPattern;
      void eventBlockPattern;
      void imagePattern;
    }

    res.json(torneos);
  } catch (err) {
    req.log.error({ err }, "Error fetching CCN torneos");
    res.status(502).json({ error: "Could not fetch tournaments from CCN" });
  }
});

router.get("/ccn/equipo", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({ error: "Query param q is required" });
    return;
  }
  try {
    const data = (await ccnApiGet("/api/teams")) as TeamEntry[];
    const lower = q.toLowerCase();
    const list = Array.isArray(data) ? data : [];
    const matches = list.filter(
      (t) => typeof t.team_name === "string" && t.team_name.toLowerCase().includes(lower),
    );

    if (matches.length === 0) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    const results = matches.slice(0, 10).map((t) => ({
      id: String(t.team_id),
      name: t.team_name,
      twitter: t.twitter,
      active: t.active,
      badgeUrl: t.has_image
        ? `${CCN_BASE}/static/teams/t-${t.team_id}-sized.png`
        : `${CCN_BASE}/static/teams/default.png`,
      profileUrl: t.profileurl,
    }));

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error searching CCN team");
    res.status(502).json({ error: "Could not search team on CCN" });
  }
});

router.get("/ccn/equipo/:id/partidas", async (req, res) => {
  const { id } = req.params;
  try {
    const html = await ccnHtmlGet(`/teams/${id}`);
    const matches = parseMatchRows(html);
    res.json(matches);
  } catch (err) {
    req.log.error({ err }, "Error fetching team matches");
    res.status(502).json({ error: "Could not fetch team matches from CCN" });
  }
});

router.get("/ccn/equipo/:id/info", async (req, res) => {
  const { id } = req.params;
  try {
    const [eloData, html] = await Promise.all([
      ccnApiGet("/api/elo-rank") as Promise<EloRankEntry[]>,
      ccnHtmlGet(`/teams/${id}`),
    ]);

    const teamEntry = (Array.isArray(eloData) ? eloData : []).find(e => String(e.team_id) === id);
    const matches = parseMatchRows(html);

    const roster: Array<{ name: string; tag?: string }> = [];
    const seen = new Set<string>();

    const playerLinkPattern = /href="\/players\/[^"]*"[^>]*>\s*<[^>]+>\s*([\w\s\-_.#]+)<\/[^>]+>/g;
    let pm;
    while ((pm = playerLinkPattern.exec(html)) !== null) {
      const name = pm[1].trim();
      if (name && name.length > 1 && !seen.has(name)) {
        seen.add(name);
        roster.push({ name });
      }
    }

    if (roster.length === 0) {
      const altPattern = /href="\/players\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
      while ((pm = altPattern.exec(html)) !== null) {
        const name = stripTags(pm[1]).trim();
        if (name && name.length > 1 && name.length < 40 && !seen.has(name)) {
          seen.add(name);
          roster.push({ name });
        }
      }
    }

    res.json({
      teamId: id,
      teamName: teamEntry?.team.team_name ?? `Team ${id}`,
      elo: teamEntry?.elo_points ?? null,
      eloRank: teamEntry?.elo_rank ?? null,
      badgeUrl: teamEntry?.team.has_image ? `${CCN_BASE}/static/teams/t-${id}-sized.png` : null,
      twitter: teamEntry?.team.twitter ?? null,
      profileUrl: teamEntry?.team.profileurl ?? `${CCN_BASE}/teams/${id}`,
      roster: roster.slice(0, 15),
      recentMatches: matches.slice(0, 10),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching team info");
    res.status(502).json({ error: "Could not fetch team info" });
  }
});

router.get("/ccn/equipo/:id/ultimo-partido", async (req, res) => {
  const { id } = req.params;
  try {
    const data = (await ccnApiGet("/api/elo-rank")) as EloRankEntry[];
    const team = (Array.isArray(data) ? data : []).find((e) => String(e.team_id) === id);

    if (!team) {
      res.status(404).json({ error: "Team not found in ELO ranking" });
      return;
    }

    res.json({
      teamId: String(team.team_id),
      teamName: team.team.team_name,
      eloRank: team.elo_rank,
      eloPoints: team.elo_points,
      eloRankClassic: team.elo_rank_classic,
      eloPointsClassic: team.elo_points_classic,
      profileUrl: team.team.profileurl,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching last team match");
    res.status(502).json({ error: "Could not fetch team info from CCN" });
  }
});

export default router;
