let cachedKey: string | null = null;
let pendingLogin: Promise<string> | null = null;

const KEY_NAME = "Web-Reviewer (Railway, auto)";

async function getCurrentIp(): Promise<string> {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = (await res.json()) as { ip: string };
  return data.ip;
}

async function loginAndGetKey(): Promise<string> {
  const email = process.env.COC_DEV_EMAIL;
  const password = process.env.COC_DEV_PASSWORD;

  if (!email || !password) {
    const fallback = process.env.COC_API_KEY;
    if (fallback) return fallback;
    throw new Error("Faltan COC_DEV_EMAIL / COC_DEV_PASSWORD (o COC_API_KEY)");
  }

  const loginRes = await fetch("https://developer.clashofclans.com/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login a Clash of Clans fallo: ${loginRes.status}`);
  }

  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) {
    throw new Error("No se recibio cookie de sesion de Supercell");
  }

  const ip = await getCurrentIp();

  const listRes = await fetch("https://developer.clashofclans.com/api/apikey/list", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
  });
  const listData = (await listRes.json()) as { keys?: any[] };
  const keys = listData.keys ?? [];

  const existing = keys.find(
    (k) => k.name === KEY_NAME && k.cidrRanges?.includes(`${ip}/32`)
  );
  if (existing) {
    return existing.key;
  }

  const sameName = keys.find((k) => k.name === KEY_NAME);
  if (sameName) {
    await fetch("https://developer.clashofclans.com/api/apikey/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id: sameName.id }),
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
    body: JSON.stringify({
      name: KEY_NAME,
      description: "Auto-generada por Web-Reviewer en Railway",
      cidrRanges: [`${ip}/32`],
    }),
  });

  if (!createRes.ok) {
    throw new Error(`No se pudo crear la API key: ${createRes.status}`);
  }

  const createData = (await createRes.json()) as { key: { key: string } };
  return createData.key.key;
}

export async function getCocApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  if (!pendingLogin) {
    pendingLogin = loginAndGetKey()
      .then((key) => {
        cachedKey = key;
        return key;
      })
      .catch((err) => {
        pendingLogin = null;
        throw err;
      });
  }
  return pendingLogin;
}
