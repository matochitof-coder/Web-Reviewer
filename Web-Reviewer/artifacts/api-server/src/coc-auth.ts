// CoC API token cache — resets on process restart
let cachedKey: string | null = null;
let cachedExpiry: number = 0;

export function resetCocKeyCache(): void {
  cachedKey = null;
  cachedExpiry = 0;
}

async function loginAndGetKey(): Promise<string> {
  // Support a static pre-created token (no login needed)
  const staticToken = process.env.COC_API_TOKEN;
  if (staticToken) return staticToken;

  const email = process.env.COC_DEV_EMAIL;
  const password = process.env.COC_DEV_PASSWORD;

  if (!email || !password) {
    throw new Error("Faltan COC_DEV_EMAIL / COC_DEV_PASSWORD (o COC_API_TOKEN)");
  }

  const loginRes = await fetch("https://developer.clashofclans.com/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => "");
    throw new Error(`Login HTTP ${loginRes.status}: ${body}`);
  }

  const loginData = (await loginRes.json()) as {
    status?: { code: number; message?: string };
    temporaryAPIToken?: string;
  };

  if (loginData.status?.code !== 0) {
    throw new Error(`Login rechazado: ${JSON.stringify(loginData.status)}`);
  }

  // temporaryAPIToken works for API calls without IP restrictions — no key creation needed
  if (loginData.temporaryAPIToken) {
    // Temporary tokens last ~1 hour; refresh proactively after 50 minutes
    cachedExpiry = Date.now() + 50 * 60 * 1000;
    return loginData.temporaryAPIToken;
  }

  throw new Error("Login OK pero no se recibió temporaryAPIToken");
}

export async function getCocApiKey(): Promise<string> {
  if (cachedKey && Date.now() < cachedExpiry) return cachedKey;
  cachedKey = await loginAndGetKey();
  return cachedKey;
}
