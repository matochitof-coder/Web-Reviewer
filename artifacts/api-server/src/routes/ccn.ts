import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CCN_BASE = "https://competitiveclash.network";
const CCN_TOKEN = "4597f448-784d-45ab-8dd0-8a8e4eb9adbb";

async function ccnApiGet(path: string): Promise<unknown> {
  const res = await fetch(`${CCN_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${CCN_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "CCN-War-Tracker/1.0",
    },
  });
  if (!res.ok) throw new Error(`CCN API error ${res.status} at ${path}`);
  return res.json();
}

async function ccnHtmlGet(path: string): Promise<string> {
  const res = await fetch(`${CCN_BASE}${path}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CCN-War-Tracker/1.0)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`CCN HTML fetch error ${res.status} at ${path}`);
  return res.text();
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

router.get("/ccn/guerras", async (req, res) => {
  const offset = parseInt(String(req.query.offset ?? "0"), 10);
  try {
    const html = await ccnHtmlGet("/matches/upcoming");
    const allMatches = parseMatchRows(html);

    const filtered =
      isNaN(offset) || offset === 0
        ? allMatches
        : allMatches.filter((m) => {
            try {
              const d = new Date(m.scheduledAt);
              const target = new Date();
              target.setUTCDate(target.getUTCDate() + offset);
              return (
                d.getUTCFullYear() === target.getUTCFullYear() &&
                d.getUTCMonth() === target.getUTCMonth() &&
                d.getUTCDate() === target.getUTCDate()
              );
            } catch {
              return false;
            }
          });

    res.json(filtered);
  } catch (err) {
    req.log.error({ err }, "Error fetching CCN guerras");
    res.status(502).json({ error: "Could not fetch wars from CCN" });
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
