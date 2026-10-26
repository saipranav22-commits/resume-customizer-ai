/**
 * Frontend Unicode-Aware Candidate Name Normalizer
 * Preserves initials, multi-word surnames, hyphens, apostrophes, and diacritics.
 * Heals kerning artifacts (e.g. 'PRANA V' -> 'PRANAV') and normalizes accidental multiple whitespace.
 */

export function normalizeCandidateName(rawName: string | null | undefined): string {
  if (!rawName) return "";

  // 1. Unicode NFC normalization
  let name = String(rawName).normalize("NFC");

  // Remove non-printable control characters except standard space
  name = name.replace(/[\x00-\x1F\x7F]/g, "");
  // Replace non-breaking spaces and zero-width spaces
  name = name.replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/\u202f/g, " ");
  // Normalize smart quotes and backticks
  name = name.replace(/[‘’`]/g, "'");

  // 2. Collapse internal horizontal spaces
  name = name.replace(/[ \t]+/g, " ").trim();
  if (!name) return "";

  // 3. Heal kerning-induced detached single letters (e.g. 'PRANA V' -> 'PRANAV')
  const tokens = name.split(" ");
  if (tokens.length <= 1) return name;

  const healed: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    // If current token is >= 2 letters and the next token is an isolated single letter without a dot
    if (
      i + 1 < tokens.length &&
      tokens[i + 1].length === 1 &&
      /^[A-Za-z]$/.test(tokens[i + 1]) &&
      !tokens[i + 1].endsWith(".") &&
      token.length >= 2 &&
      /^[A-Za-z]+$/.test(token)
    ) {
      // Heal kerning detachment e.g. PRANA + V -> PRANAV
      healed.push(token + tokens[i + 1]);
      i += 2;
      continue;
    }
    healed.push(token);
    i += 1;
  }

  return healed.join(" ").trim();
}
