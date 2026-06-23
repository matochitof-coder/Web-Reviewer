let cachedKey: string | null = null;

async function getCurrentIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = (await res.json()) as { ip: string };
  return data.ip;
}

async function loginAndGetKey(): Promise<string> {
  // Support a static token via env var (skips IP-locked auto-generation)
  const staticToken = process.env.COC_API_TOKEN;
  if (staticToken) return staticToken;

  const email = process.env.COC_DEV_EMAIL;
  const password = process.env.COC_DEV_PASSWORD;

  if (!email || !password) {
    throw new Error("Faltan COC_DEV_EMAIL / COC_DEV_PASSWORD (o COC_API_TOKEN)");
  }

  const ip = await getCurrentIp();

  const loginRes = await fetch("https://developer.clashofclans.com/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => "");
    throw new Error(`Login fallido HTTP ${loginRes.status}: ${body}`);
  }

  const loginData = (await loginRes.json()) as {
    status?: { code: number; message?: string };
    temporaryAPIToken?: string;
  };

  if (loginData.status?.code !== 0) {
    throw new Error(
      `Login rechazado por CoC: ${JSON.stringify(loginData.status)}`
    );
  }

  const cookie = loginRes.headers.get("set-cookie") ?? "";

  const listRes = await fetch("https://developer.clashofclans.com/api/apikey/list", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  const listData = (await listRes.json()) as {
    keys?: { id: string; name: string; key: string; cidrRanges?: string[] }[];
  };
  const keys = listData.keys ?? [];

  const existing = keys.find(
    (k) => k.name === "CCN-Tracker-Auto" && k.cidrRanges?.includes(`${ip}/32`)
  );
  if (existing) return existing.key;

  // Revoke old CCN-Tracker-Auto key or oldest key if limit reached
  const stale = keys.find((k) => k.name === "CCN-Tracker-Auto");
  const toRevoke = stale ?? (keys.length >= 10 ? keys[0] : null);
  if (toRevoke) {
    await fetch("https://developer.clashofclans.com/api/apikey/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id: toRevoke.id }),
    });
  }

  const createRes = await fetch("https://developer.clashofclans.com/api/apikey/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      name: "CCN-Tracker-Auto",
      description: "Auto-generated for CCN War Tracker",
      cidrRanges: [`${ip}/32`],
    }),
  });
  const createData = (await createRes.json()) as { key?: { key: string } };
  if (!createData.key?.key) {
    throw new Error("No se pudo crear la key: " + JSON.stringify(createData));
  }
  return createData.key.key;
}

export function resetCocKeyCache(): void {
  cachedKey = null;
}

export async function getCocApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  cachedKey = await loginAndGetKey();
  return cachedKey;
}
