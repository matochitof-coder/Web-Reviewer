let cachedKey: string | null = null;

export async function getCocApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const directKey = process.env.COC_API_KEY;
  if (directKey) {
    cachedKey = directKey;
    return cachedKey;
  }

  throw new Error("Falta COC_API_KEY en las variables de entorno");
}
