/**
 * Anthropic removed `temperature` from Opus 4.7 and later, Sonnet 5, and the
 * Fable and Mythos line: sending it there is a 400, not a quietly ignored
 * field. This is an allowlist rather than a blocklist so an unrecognised
 * model — including one released after this was written — omits the parameter
 * and runs at the API default instead of failing outright.
 */
const TEMPERATURE_MODELS = [
  /^claude-haiku-/u,
  /^claude-[23][.-]/u,
  /^claude-opus-4-[0156](?!\d)/u,
  /^claude-sonnet-4-[056](?!\d)/u,
];

export function supportsTemperature(model: string): boolean {
  const id = model.trim().toLowerCase();
  return TEMPERATURE_MODELS.some((pattern) => pattern.test(id));
}
