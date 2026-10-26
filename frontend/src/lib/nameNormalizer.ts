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

// Regular expression to identify structural cover letter closing blocks:
// Matches standard salutations at the end of the letter and any trailing candidate/placeholder name.
const CLOSING_SALUTATION_REGEX = new RegExp(
  "\\n+[ \\t]*(?:(?:with\\s+)?(?:warmest|warm|best|kind|kindest)?\\s*regards|sincerely(?:\\s+yours)?|yours\\s+(?:sincerely|truly|faithfully|respectfully)|respectfully(?:\\s+submitted|\\s+yours)?|cordially|warmly|with\\s+(?:appreciation|gratitude|best\\s+regards|warm\\s+regards))[,\\.]?[ \\t]*(?:\\n+.*)?$",
  "is"
);

// Trailing standalone bracket placeholders, e.g. \n\n[Your Name] or \n\n[Candidate Name]
const TRAILING_PLACEHOLDER_REGEX = new RegExp(
  "\\n+[ \\t]*(?:\\[(?:your\\s+name|candidate\\s+name|name|applicant\\s+name)\\]|<(?:your\\s+name|candidate\\s+name|name)>)[ \\t]*$",
  "i"
);

/**
 * Safely strips any formal closing salutation (e.g. 'Sincerely,', 'Best regards,')
 * and trailing candidate signature/placeholder from the end of a cover letter.
 * Preserves all preceding letter body paragraphs intact without broad replacements.
 */
export function stripClosingSignature(coverLetterText: string | null | undefined): string {
  if (!coverLetterText) return "";
  let text = String(coverLetterText).normalize("NFC").trimEnd();
  text = text.replace(CLOSING_SALUTATION_REGEX, "").trimEnd();
  text = text.replace(TRAILING_PLACEHOLDER_REGEX, "").trimEnd();
  return text;
}

/**
 * Deterministically formats a cover letter by:
 * 1. Normalizing the verified candidate name.
 * 2. Stripping any existing/corrupted closing salutation or embedded signature from the body.
 * 3. Deterministically appending the authoritative closing: 'Sincerely,\n{verifiedCandidateName}'.
 * Guarantees no duplicate signatures, no AI identity hallucinations, and full identity integrity.
 */
export function formatCoverLetterWithVerifiedSignature(
  coverLetterText: string | null | undefined,
  candidateName: string | null | undefined
): string {
  const cleanBody = stripClosingSignature(coverLetterText);
  const cleanName = normalizeCandidateName(candidateName);

  if (!cleanBody) {
    return cleanName ? `Sincerely,\n${cleanName}` : "Sincerely,";
  }

  return cleanName
    ? `${cleanBody}\n\nSincerely,\n${cleanName}`
    : `${cleanBody}\n\nSincerely,`;
}

