export function normalizeProviderBaseUrl(value: string): string {
  const trimmed = value.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid LiteLLM Base URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("LiteLLM Base URL must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Do not include credentials in the LiteLLM Base URL.");
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/u, "");
}

export function providerOriginPattern(value: string): string {
  const parsed = new URL(normalizeProviderBaseUrl(value));
  return `${parsed.protocol}//${parsed.hostname}/*`;
}
