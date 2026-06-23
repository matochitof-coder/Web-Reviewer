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

// Safe API get — returns null on error (for batch fetches)
async function cocApiGetSafe(path: string): Promise<unknown | null> {
  try { return await cocApiGet(path); }
  catch { return null; }
}

// ─── Debug ────────────────────────────────────────────────────────────────────

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
  } catch (err) { res.status(500).json({ ok: false, error: String(err) }); }
});

// ─── Clan overview ────────────────────────────────────────────────────────────

router.get("/clan/:tag", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const d = (await cocApiGet(`/clans/${tag}`)) as {
      name?: string; tag?: string; description?: string; clanLevel?: number;
      members?: number; clanPoints?: number; clanBuilderBasePoints?: number;
      warWins?: number; warTies?: number; warLosses?: number; warWinStreak?: number;
      isWarLogPublic?: boolean; warFrequency?: string;
      badgeUrls?: { small?: string; medium?: string; large?: string };
      location?: { name?: string }; requiredTrophies?: number; type?: string;
    };
    res.json({
      name: d.name, tag: d.tag, description: d.description, level: d.clanLevel,
      memberCount: d.members, trophies: d.clanPoints, builderBaseTrophies: d.clanBuilderBasePoints,
      warWins: d.warWins, warTies: d.warTies, warLosses: d.warLosses,
      warWinStreak: d.warWinStreak, warLogPublic: d.isWarLogPublic, warFrequency: d.warFrequency,
      badgeUrl: d.badgeUrls?.medium ?? d.badgeUrls?.small,
      location: d.location?.name, requiredTrophies: d.requiredTrophies, type: d.type,
    });
  } catch (err) { req.log.error({ err }, "Error fetching clan"); res.status(502).json({ error: String(err) }); }
});

// ─── Members ──────────────────────────────────────────────────────────────────

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
      }>;
    };
    const members = (data.items ?? []).map((m) => ({
      tag: m.tag, name: m.name, role: m.role, level: m.expLevel,
      trophies: m.trophies, builderBaseTrophies: m.builderBaseTrophies ?? 0,
      donations: m.donations, donationsReceived: m.donationsReceived,
      donationRatio: m.donationsReceived > 0
        ? Math.round((m.donations / m.donationsReceived) * 100) / 100 : m.donations,
      clanRank: m.clanRank, previousClanRank: m.previousClanRank,
      rankChange: m.previousClanRank - m.clanRank,
      leagueName: m.league?.name ?? null,
      leagueIconUrl: m.league?.iconUrls?.small ?? m.league?.iconUrls?.tiny ?? null,
    }));
    res.json({ members });
  } catch (err) { req.log.error({ err }, "Error fetching members"); res.status(502).json({ error: String(err) }); }
});

// ─── Current war ─────────────────────────────────────────────────────────────

router.get("/clan/:tag/war", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const d = (await cocApiGet(`/clans/${tag}/currentwar`)) as {
      state?: string;
      preparationStartTime?: string; startTime?: string; endTime?: string;
      teamSize?: number; attacksPerMember?: number;
      clan?: {
        tag?: string; name?: string; badgeUrls?: { small?: string };
        stars?: number; attacks?: number; destructionPercentage?: number;
        members?: Array<{
          tag: string; name: string; mapPosition: number; townhallLevel: number;
          attacks?: Array<{ defenderTag: string; stars: number; destructionPercentage: number; order: number; duration?: number }>;
          bestOpponentAttack?: { attackerTag: string; stars: number; destructionPercentage: number };
        }>;
      };
      opponent?: {
        tag?: string; name?: string; badgeUrls?: { small?: string };
        stars?: number; attacks?: number; destructionPercentage?: number;
        members?: Array<{
          tag: string; name: string; mapPosition: number; townhallLevel: number;
          attacks?: Array<{ defenderTag: string; stars: number; destructionPercentage: number; order: number }>;
          bestOpponentAttack?: { attackerTag: string; stars: number; destructionPercentage: number };
        }>;
      };
    };

    if (!d.state || d.state === "notInWar") {
      res.json({ state: "notInWar" });
      return;
    }

    const mapMember = (m: NonNullable<typeof d.clan>["members"] extends (infer T)[] | undefined ? T : never, side: "clan" | "opponent") => ({
      tag: m.tag, name: m.name, mapPosition: m.mapPosition, townhallLevel: m.townhallLevel,
      side,
      attacks: (m.attacks ?? []).map((a) => ({
        defenderTag: a.defenderTag, stars: a.stars,
        destructionPercentage: a.destructionPercentage, order: a.order, duration: a.duration ?? 0,
      })),
      bestOpponentAttack: m.bestOpponentAttack ? {
        attackerTag: m.bestOpponentAttack.attackerTag,
        stars: m.bestOpponentAttack.stars,
        destructionPercentage: m.bestOpponentAttack.destructionPercentage,
      } : null,
    });

    res.json({
      state: d.state,
      preparationStartTime: d.preparationStartTime,
      startTime: d.startTime,
      endTime: d.endTime,
      teamSize: d.teamSize,
      attacksPerMember: d.attacksPerMember ?? 1,
      clan: {
        tag: d.clan?.tag, name: d.clan?.name,
        badgeUrl: d.clan?.badgeUrls?.small,
        stars: d.clan?.stars ?? 0,
        attacks: d.clan?.attacks ?? 0,
        destructionPercentage: d.clan?.destructionPercentage ?? 0,
        members: (d.clan?.members ?? []).map((m) => mapMember(m, "clan")),
      },
      opponent: {
        tag: d.opponent?.tag, name: d.opponent?.name,
        badgeUrl: d.opponent?.badgeUrls?.small,
        stars: d.opponent?.stars ?? 0,
        attacks: d.opponent?.attacks ?? 0,
        destructionPercentage: d.opponent?.destructionPercentage ?? 0,
        members: (d.opponent?.members ?? []).map((m) => mapMember(m, "opponent")),
      },
    });
  } catch (err) { req.log.error({ err }, "Error fetching war"); res.status(502).json({ error: String(err) }); }
});

// ─── War log ──────────────────────────────────────────────────────────────────

router.get("/clan/:tag/warlog", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const data = (await cocApiGet(`/clans/${tag}/warlog?limit=20`)) as {
      items?: Array<{
        result?: string; endTime?: string; teamSize?: number; attacksPerMember?: number;
        clan?: { stars?: number; destructionPercentage?: number; expEarned?: number; attacks?: number };
        opponent?: { tag?: string; name?: string; stars?: number; destructionPercentage?: number; badgeUrls?: { small?: string } };
      }>;
    };
    const wars = (data.items ?? []).map((w) => ({
      result: w.result ?? "unknown",
      endTime: w.endTime ?? null,
      teamSize: w.teamSize ?? 0,
      attacksPerMember: w.attacksPerMember ?? 1,
      ourStars: w.clan?.stars ?? 0,
      ourDestructionPercentage: w.clan?.destructionPercentage ?? 0,
      ourAttacks: w.clan?.attacks ?? 0,
      expEarned: w.clan?.expEarned ?? 0,
      opponentTag: w.opponent?.tag ?? null,
      opponentName: w.opponent?.name ?? "???",
      opponentBadgeUrl: w.opponent?.badgeUrls?.small ?? null,
      opponentStars: w.opponent?.stars ?? 0,
      opponentDestructionPercentage: w.opponent?.destructionPercentage ?? 0,
    }));
    res.json({ wars });
  } catch (err) {
    req.log.error({ err }, "Error fetching war log");
    // War log might be private — return 403 hint
    res.status(502).json({ error: String(err), privateLog: String(err).includes("403") });
  }
});

// ─── CWL ─────────────────────────────────────────────────────────────────────

router.get("/clan/:tag/cwl", async (req, res) => {
  const rawTag = String(req.params.tag).replace(/^#?/, "");
  const encodedTag = `%23${rawTag}`;
  const clanTagFull = `#${rawTag}`;

  try {
    const group = (await cocApiGet(`/clans/${encodedTag}/currentwar/leaguegroup`)) as {
      state?: string; season?: string;
      clans?: Array<{ tag: string; name: string; clanLevel: number; badgeUrls?: { small?: string }; members?: Array<{ tag: string; name: string; townHallLevel: number }> }>;
      rounds?: Array<{ warTags: string[] }>;
    };

    if (!group.state || group.state === "notFound") {
      res.json({ state: "notFound" });
      return;
    }

    // Fetch all CWL war results that involve our clan (one per round)
    const rounds = group.rounds ?? [];
    const ourWars: unknown[] = [];

    const roundResults = await Promise.all(
      rounds.map(async (round, idx) => {
        const validTags = (round.warTags ?? []).filter((t) => t !== "#0");
        const wars = await Promise.all(
          validTags.map((wt) => cocApiGetSafe(`/clanwarleagues/wars/${wt.replace("#", "%23")}`))
        );
        const ourWar = wars.find((w) => {
          if (!w) return false;
          const war = w as { clan?: { tag?: string }; opponent?: { tag?: string } };
          return war.clan?.tag === clanTagFull || war.opponent?.tag === clanTagFull;
        });
        return { round: idx + 1, war: ourWar ?? null };
      })
    );

    for (const { round, war } of roundResults) {
      if (!war) continue;
      const w = war as {
        state?: string;
        clan?: { tag?: string; name?: string; badgeUrls?: { small?: string }; stars?: number; attacks?: number; destructionPercentage?: number; members?: Array<{ tag: string; name: string; mapPosition: number; townhallLevel: number; attacks?: Array<{ stars: number; destructionPercentage: number; defenderTag: string }> }> };
        opponent?: { tag?: string; name?: string; badgeUrls?: { small?: string }; stars?: number; attacks?: number; destructionPercentage?: number };
        teamSize?: number;
      };

      // Normalize so our clan is always "clan"
      const isOurClanClan = w.clan?.tag === clanTagFull;
      const us = isOurClanClan ? w.clan : w.opponent;
      const them = isOurClanClan ? w.opponent : w.clan;

      const ourStars = us?.stars ?? 0;
      const theirStars = them?.stars ?? 0;
      let result = "unknown";
      if (w.state === "warEnded" || w.state === "preparation") {
        if (w.state === "preparation") result = "upcoming";
        else if (ourStars > theirStars) result = "win";
        else if (ourStars < theirStars) result = "lose";
        else if ((us?.destructionPercentage ?? 0) > (them?.destructionPercentage ?? 0)) result = "win";
        else if ((us?.destructionPercentage ?? 0) < (them?.destructionPercentage ?? 0)) result = "lose";
        else result = "tie";
      } else if (w.state === "inWar") {
        result = "inWar";
      }

      ourWars.push({
        round,
        state: w.state,
        result,
        teamSize: w.teamSize ?? 15,
        ourName: us?.name, ourBadgeUrl: us?.badgeUrls?.small,
        ourStars, ourAttacks: us?.attacks ?? 0,
        ourDestructionPercentage: us?.destructionPercentage ?? 0,
        opponentName: them?.name, opponentBadgeUrl: them?.badgeUrls?.small,
        opponentStars: theirStars, opponentAttacks: them?.attacks ?? 0,
        opponentDestructionPercentage: them?.destructionPercentage ?? 0,
        // Member attack summary (only our clan members)
        members: (isOurClanClan ? w.clan?.members : w.opponent?.members ?? [])?.map((m: { tag: string; name: string; mapPosition: number; townhallLevel: number; attacks?: Array<{ stars: number; destructionPercentage: number; defenderTag: string }> }) => ({
          tag: m.tag, name: m.name, mapPosition: m.mapPosition, townhallLevel: m.townhallLevel,
          attacks: (m.attacks ?? []).map((a) => ({ stars: a.stars, destructionPercentage: a.destructionPercentage, defenderTag: a.defenderTag })),
        })) ?? [],
      });
    }

    res.json({
      state: group.state,
      season: group.season ?? null,
      clans: (group.clans ?? []).map((c) => ({
        tag: c.tag, name: c.name, level: c.clanLevel, badgeUrl: c.badgeUrls?.small,
        isOurs: c.tag === clanTagFull,
      })),
      wars: ourWars,
    });
  } catch (err) { req.log.error({ err }, "Error fetching CWL"); res.status(502).json({ error: String(err) }); }
});

// ─── Capital raids ────────────────────────────────────────────────────────────

router.get("/clan/:tag/capital", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const data = (await cocApiGet(`/clans/${tag}/capitalraidseasons?limit=5`)) as {
      items?: Array<{
        state?: string; startTime?: string; endTime?: string;
        totalAttacks?: number; enemyDistrictsDestroyed?: number; capitalTotalLoot?: number;
        raidsCompleted?: number; totalRaids?: number;
        offensiveReward?: number; defensiveReward?: number;
        members?: Array<{ tag: string; name: string; attacks: number; attackLimit: number; bonusAttackLimit: number; capitalResourcesLooted: number }>;
        attackLog?: Array<{ defender: { tag: string; name: string; badgeUrls?: { small?: string }; level: number }; attacks: number; districtsDestroyed: number; districts: Array<{ id: number; name: string; destructionPercent: number; attackCount: number; totalLooted: number; attacks?: Array<{ attacker: { tag: string; name: string }; stars: number; destructionPercent: number }> }> }>;
        defenseLog?: Array<{ attacker: { tag: string; name: string; badgeUrls?: { small?: string }; level: number }; attacks: number; districtsDestroyed: number }>;
      }>;
    };

    const seasons = (data.items ?? []).map((s) => ({
      state: s.state,
      startTime: s.startTime,
      endTime: s.endTime,
      totalAttacks: s.totalAttacks ?? 0,
      enemyDistrictsDestroyed: s.enemyDistrictsDestroyed ?? 0,
      capitalTotalLoot: s.capitalTotalLoot ?? 0,
      raidsCompleted: s.raidsCompleted ?? 0,
      totalRaids: s.totalRaids ?? 0,
      offensiveReward: s.offensiveReward ?? 0,
      defensiveReward: s.defensiveReward ?? 0,
      members: (s.members ?? [])
        .sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted)
        .map((m) => ({
          tag: m.tag, name: m.name,
          attacks: m.attacks, attackLimit: m.attackLimit, bonusAttackLimit: m.bonusAttackLimit,
          looted: m.capitalResourcesLooted,
        })),
      raids: (s.attackLog ?? []).map((r) => ({
        defenderName: r.defender.name,
        defenderBadgeUrl: r.defender.badgeUrls?.small,
        defenderLevel: r.defender.level,
        attacks: r.attacks,
        districtsDestroyed: r.districtsDestroyed,
        districts: (r.districts ?? []).map((d) => ({
          name: d.name, destructionPercent: d.destructionPercent,
          attackCount: d.attackCount, looted: d.totalLooted,
        })),
      })),
      defenses: (s.defenseLog ?? []).map((d) => ({
        attackerName: d.attacker.name,
        attackerBadgeUrl: d.attacker.badgeUrls?.small,
        attacks: d.attacks,
        districtsDestroyed: d.districtsDestroyed,
      })),
    }));

    res.json({ seasons });
  } catch (err) { req.log.error({ err }, "Error fetching capital raids"); res.status(502).json({ error: String(err) }); }
});

// ─── Individual player ────────────────────────────────────────────────────────

router.get("/player/:tag", async (req, res) => {
  const tag = String(req.params.tag).replace(/^#?/, "%23");
  try {
    const d = (await cocApiGet(`/players/${tag}`)) as {
      tag?: string; name?: string; townHallLevel?: number; townHallWeaponLevel?: number;
      expLevel?: number; trophies?: number; bestTrophies?: number;
      warStars?: number; attackWins?: number; defenseWins?: number;
      builderHallLevel?: number; builderBaseTrophies?: number; bestBuilderBaseTrophies?: number;
      warPreference?: string; donations?: number; donationsReceived?: number; clanCapitalContributions?: number;
      role?: string;
      league?: { name: string; iconUrls?: { small?: string } };
      clan?: { name: string; tag: string; badgeUrls?: { small?: string } };
      heroes?: Array<{ name: string; level: number; maxLevel: number; village: string }>;
      achievements?: Array<{ name: string; stars: number; value: number; target: number; info: string }>;
    };
    res.json({
      tag: d.tag, name: d.name,
      townHallLevel: d.townHallLevel, townHallWeaponLevel: d.townHallWeaponLevel,
      level: d.expLevel, trophies: d.trophies, bestTrophies: d.bestTrophies,
      builderHallLevel: d.builderHallLevel,
      builderBaseTrophies: d.builderBaseTrophies, bestBuilderBaseTrophies: d.bestBuilderBaseTrophies,
      warStars: d.warStars, attackWins: d.attackWins, defenseWins: d.defenseWins,
      warPreference: d.warPreference, donations: d.donations, donationsReceived: d.donationsReceived,
      clanCapitalContributions: d.clanCapitalContributions, role: d.role,
      league: d.league ? { name: d.league.name, iconUrl: d.league.iconUrls?.small } : null,
      clan: d.clan ? { name: d.clan.name, tag: d.clan.tag, badgeUrl: d.clan.badgeUrls?.small } : null,
      heroes: (d.heroes ?? []).filter((h) => h.village === "home").map((h) => ({ name: h.name, level: h.level, maxLevel: h.maxLevel })),
      achievements: (d.achievements ?? []).filter((a) => [
        "Gold Grab", "Elixir Escapade", "Heroic Heist", "War Hero", "Unbreakable",
        "Friend in Need", "Games Champion", "Well Seasoned", "Aggressive Capitalism",
        "Most Valuable Clanmate", "Nice and Tidy",
      ].includes(a.name)).map((a) => ({ name: a.name, value: a.value, stars: a.stars })),
    });
  } catch (err) { req.log.error({ err }, "Error fetching player"); res.status(502).json({ error: String(err) }); }
});

export default router;
