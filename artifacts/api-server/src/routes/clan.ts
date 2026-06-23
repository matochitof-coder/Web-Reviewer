import { Router, type IRouter } from "express";
import { getCocApiKey, resetCocKeyCache } from "../coc-auth";

const router: IRouter = Router();

const COC_BASE = "https://api.clashofclans.com/v1";

async function cocApiGet(path: string): Promise<unknown> {
  const apiKey = await getCocApiKey();
  const res = await fetch(`${COC_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  // If auth failed, key might be stale (IP changed) — reset and retry once
  if (res.status === 401 || res.status === 403) {
    resetCocKeyCache();
    const freshKey = await getCocApiKey();
    const retry = await fetch(`${COC_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${freshKey}`,
        Accept: "application/json",
      },
    });
    if (!retry.ok) {
      const body = await retry.text().catch(() => "");
      throw new Error(`CoC API error ${retry.status} at ${path}: ${body}`);
    }
    return retry.json();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoC API error ${res.status} at ${path}: ${body}`);
  }
  return res.json();
}

// Debug endpoint — returns current IP and whether auth succeeds
router.get("/clan/debug", async (req, res) => {
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const { ip } = (await ipRes.json()) as { ip: string };
    const apiKey = await getCocApiKey();
    res.json({
      ok: true,
      ip,
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

router.get("/clan/:tag", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const data = await cocApiGet(`/clans/${tag}`);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error fetching clan info");
    res.status(502).json({ error: "Could not fetch clan info from Clash of Clans" });
  }
});

router.get("/clan/:tag/members", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const data = (await cocApiGet(`/clans/${tag}/members`)) as {
      items?: Array<{
        tag: string;
        name: string;
        role: string;
        expLevel: number;
        trophies: number;
        donations: number;
        donationsReceived: number;
        clanRank: number;
        previousClanRank: number;
        league?: { name: string; iconUrls?: { small?: string } };
      }>;
    };

    const members = (data.items ?? []).map((m) => ({
      tag: m.tag,
      name: m.name,
      role: m.role,
      level: m.expLevel,
      trophies: m.trophies,
      donations: m.donations,
      donationsReceived: m.donationsReceived,
      clanRank: m.clanRank,
      previousClanRank: m.previousClanRank,
      rankChange: m.previousClanRank - m.clanRank,
      leagueName: m.league?.name ?? null,
      leagueIconUrl: m.league?.iconUrls?.small ?? null,
    }));

    res.json({ members });
  } catch (err) {
    req.log.error({ err }, "Error fetching clan members");
    res.status(502).json({ error: String(err) });
  }
});

export default router;
