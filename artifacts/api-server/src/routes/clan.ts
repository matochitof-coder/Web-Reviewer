import { Router, type IRouter } from "express";

const router: IRouter = Router();

const COC_BASE = "https://api.clashofclans.com/v1";
const COC_API_KEY = process.env.COC_API_KEY ?? "";

async function cocApiGet(path: string): Promise<unknown> {
  const res = await fetch(`${COC_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${COC_API_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoC API error ${res.status} at ${path}: ${body}`);
  }
  return res.json();
}

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
    res.status(502).json({ error: "Could not fetch clan members from Clash of Clans" });
  }
});

export default router;
