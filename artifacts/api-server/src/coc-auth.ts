let cachedKey: string | null = null;

async function getCurrentIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = (await res.json()) as { ip: string };
  return data.ip;
}

async function loginAndGetKey(): Promise<string> {
  const email = process.env.COC_DEV_EMAIL;
  const password = process.env.COC_DEV_PASSWORD;

  if (!email || !password) throw new Error("Faltan COC_DEV_EMAIL / COC_DEV_PASSWORD");

  const loginRes = await fetch("https://developer.clashofclans.com/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const loginData = (await loginRes.json()) as { status?: { code: number }; auth?: { uid: string }; temporaryAPIToken?: string };

  if (loginData.status?.code !== 0) throw new Error("Login fallido: " + JSON.stringify(loginData.status));

  const cookie = loginRes.headers.get("set-cookie") ?? "";
  const ip = await getCurrentIp();

  const listRes = await fetch("https://developer.clashofclans.com/api/apikey/list", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  const listData = (await listRes.json()) as { keys?: { id: string; name: string; key: string; cidrRanges?: string[] }[] };
  const keys = listData.keys ?? [];

  const existing = keys.find(k => k.name === "Web-Reviewer-Auto" && k.cidrRanges?.includes(`${ip}/32`));
  if (existing) return existing.key;

  const same = keys.find(k => k.name === "Web-Reviewer-Auto");
  if (same) {
    await fetch("https://developer.clashofclans.com/api/apikey/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id: same.id }),
    });
  } else if (keys.length >= 10) {
    await fetch("https://developer.clashofclans.com/api/apikey/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id: keys[0].id }),
    });
  }

  const createRes = await fetch("https://developer.clashofclans.com/api/apikey/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ name: "Web-Reviewer-Auto", description: "Auto", cidrRanges: [`${ip}/32`] }),
  });
  const createData = (await createRes.json()) as { key?: { key: string } };
  if (!createData.key?.key) throw new Error("No se pudo crear la key: " + JSON.stringify(createData));
  return createData.key.key;
}

export async function getCocApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  cachedKey = await loginAndGetKey();
  return cachedKey;
}
