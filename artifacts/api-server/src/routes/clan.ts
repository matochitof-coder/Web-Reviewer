import { Router, type IRouter } from "express";
import { getCocApiKey, resetCocKeyCache } from "../coc-auth";

const router: IRouter = Router();
const COC_BASE = "https://api.clashofclans.com/v1";

async function cocApiGet(path: string): Promise<unknown> {
  const apiKey = await getCocApiKey();
  const res = await fetch(`${COC_BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) {
    resetCocKeyCache();
    const freshKey = await getCocApiKey();
    const retry = await fetch(`${COC_BASE}${path}`, {
      headers: { Authorization: `Bearer ${freshKey}`, Accept: "application/json" },
    });
    if (!retry.ok) {
      const body = await retry.text().catch(() => "");
      throw new Error(`CoC API ${retry.status}: ${body}`);
    }
    return retry.json();
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoC API ${res.status}: ${body}`);
  }
  return res.json();
}

// Debug
router.get("/clan/debug", async (_req, res) => {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const { ip } = (await ipRes.json()) as { ip: string };
    const apiKey = await getCocApiKey();
    res.json({
      ok: true, ip,
      keyPrefix: apiKey.slice(0, 8) + "...",
      env: {
        hasCOC_API_TOKEN: !!process.env.COC_API_TOKEN,
        hasCOC_DEV_EMAIL: !!process.env.COC_DEV_EMAIL,
        hasCOC_DEV_PASSWORD: !!process.env.COC_DEV_PASSWORD,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Clan overview
router.get("/clan/:tag", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const d = (await cocApiGet(`/clans/${tag}`)) as {
      name?: string; tag?: string; description?: string; clanLevel?: number;
      members?: number; clanPoints?: number; clanBuilderBasePoints?: number;
      warWins?: number; warTies?: number; warLosses?: number; warWinStreak?: number;
      isWarLogPublic?: boolean; warFrequency?: string;
      badgeUrls?: { small?: string; medium?: string; large?: string };
      location?: { name?: string; isCountry?: boolean };
      requiredTrophies?: number; type?: string;
    };
    res.json({
      name: d.name,
      tag: d.tag,
      description: d.description,
      level: d.clanLevel,
      memberCount: d.members,
      trophies: d.clanPoints,
      builderBaseTrophies: d.clanBuilderBasePoints,
      warWins: d.warWins,
      warTies: d.warTies,
      warLosses: d.warLosses,
      warWinStreak: d.warWinStreak,
      warLogPublic: d.isWarLogPublic,
      warFrequency: d.warFrequency,
      badgeUrl: d.badgeUrls?.medium ?? d.badgeUrls?.small,
      location: d.location?.name,
      requiredTrophies: d.requiredTrophies,
      type: d.type,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching clan info");
    res.status(502).json({ error: String(err) });
  }
});

// Clan members list
router.get("/clan/:tag/members", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const data = (await cocApiGet(`/clans/${tag}/members`)) as {
      items?: Array<{
        tag: string; name: string; role: string; expLevel: number;
        trophies: number; builderBaseTrophies?: number;
        donations: number; donationsReceived: number;
        clanRank: number; previousClanRank: number;
        league?: { name: string; iconUrls?: { small?: string; tiny?: string } };
        builderBaseLeague?: { name: string; iconUrls?: { small?: string } };
        playerHouse?: unknown;
      }>;
    };
    const members = (data.items ?? []).map((m) => ({
      tag: m.tag, name: m.name, role: m.role, level: m.expLevel,
      trophies: m.trophies,
      builderBaseTrophies: m.builderBaseTrophies ?? 0,
      donations: m.donations, donationsReceived: m.donationsReceived,
      donationRatio: m.donationsReceived > 0
        ? Math.round((m.donations / m.donationsReceived) * 100) / 100
        : m.donations,
      clanRank: m.clanRank, previousClanRank: m.previousClanRank,
      rankChange: m.previousClanRank - m.clanRank,
      leagueName: m.league?.name ?? null,
      leagueIconUrl: m.league?.iconUrls?.small ?? m.league?.iconUrls?.tiny ?? null,
    }));
    res.json({ members });
  } catch (err) {
    req.log.error({ err }, "Error fetching clan members");
    res.status(502).json({ error: String(err) });
  }
});

// Individual player full stats
router.get("/player/:tag", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const d = (await cocApiGet(`/players/${tag}`)) as {
      tag?: string; name?: string; townHallLevel?: number; townHallWeaponLevel?: number;
      expLevel?: number; trophies?: number; bestTrophies?: number;
      warStars?: number; attackWins?: number; defenseWins?: number;
      builderHallLevel?: number; builderBaseTrophies?: number; bestBuilderBaseTrophies?: number;
      warPreference?: string; donations?: number; donationsReceived?: number;
      clanCapitalContributions?: number;
      role?: string;
      league?: { name: string; iconUrls?: { small?: string } };
      clan?: { name: string; tag: string; badgeUrls?: { small?: string } };
      heroes?: Array<{ name: string; level: number; maxLevel: number; village: string }>;
      achievements?: Array<{ name: string; stars: number; value: number; target: number; info: string }>;
    };
    res.json({
      tag: d.tag, name: d.name,
      townHallLevel: d.townHallLevel, townHallWeaponLevel: d.townHallWeaponLevel,
      level: d.expLevel,
      trophies: d.trophies, bestTrophies: d.bestTrophies,
      builderHallLevel: d.builderHallLevel,
      builderBaseTrophies: d.builderBaseTrophies, bestBuilderBaseTrophies: d.bestBuilderBaseTrophies,
      warStars: d.warStars, attackWins: d.attackWins, defenseWins: d.defenseWins,
      warPreference: d.warPreference,
      donations: d.donations, donationsReceived: d.donationsReceived,
      clanCapitalContributions: d.clanCapitalContributions,
      role: d.role,
      league: d.league ? { name: d.league.name, iconUrl: d.league.iconUrls?.small } : null,
      clan: d.clan ? { name: d.clan.name, tag: d.clan.tag, badgeUrl: d.clan.badgeUrls?.small } : null,
      heroes: (d.heroes ?? [])
        .filter((h) => h.village === "home")
        .map((h) => ({ name: h.name, level: h.level, maxLevel: h.maxLevel })),
      achievements: (d.achievements ?? [])
        .filter((a) => [
          "Gold Grab", "Elixir Escapade", "Heroic Heist",
          "War Hero", "Unbreakable", "Friend in Need",
          "Games Champion", "Well Seasoned", "Aggressive Capitalism",
        ].includes(a.name))
        .map((a) => ({ name: a.name, value: a.value, stars: a.stars })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching player");
    res.status(502).json({ error: String(err) });
  }
});

export default router;
