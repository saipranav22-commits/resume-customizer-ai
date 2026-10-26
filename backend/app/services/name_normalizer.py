import re
import unicodedata
from typing import Optional, List

GENERIC_HEADERS = {
    "resume",
    "curriculum vitae",
    "cv",
    "profile",
    "summary",
    "professional summary",
    "contact",
    "contact information",
    "about me",
    "personal profile",
    "bio",
}

def normalize_candidate_name(raw_name: Optional[str], source_text: Optional[str] = None) -> str:
    """
    Robust Unicode-aware candidate name normalizer:
    1. Trims leading/trailing whitespace and control chars.
    2. Normalizes Unicode to NFC form.
    3. Normalizes accidental multiple spaces while preserving legitimate single spaces.
    4. Preserves legitimate initials (e.g. 'B ', 'J. R. R.').
    5. Preserves multi-word surnames, hyphens, apostrophes and diacritics.
    6. Heals kerning-induced detached single letters (e.g. 'PRANA V' -> 'PRANAV').
    """
    if not raw_name:
        return ""

    # 1. Unicode NFC normalization
    name = unicodedata.normalize("NFC", str(raw_name))

    # Strip control characters except basic spaces
    name = "".join(c for c in name if ord(c) >= 32 or c in (" ", "\t"))
    # Replace non-breaking and special spaces
    name = name.replace("\u00a0", " ").replace("\u200b", "").replace("\u202f", " ")
    # Normalize unicode apostrophes and quotation marks to standard apostrophe
    name = name.replace("’", "'").replace("‘", "'").replace("`", "'")

    # 2. Collapse internal runs of spaces/tabs
    name = re.sub(r"[ \t]+", " ", name).strip()
    if not name:
        return ""

    # 3. Heal kerning-induced single-letter separations
    # e.g., 'PRANA V' -> 'PRANAV', 'BHARATH I' -> 'BHARATHI'
    # In PDF extraction (especially with pypdf), large heading fonts with negative kerning
    # often have the final or penultimate capital letter detached as an isolated token.
    name = _heal_kerning_splits(name, source_text)

    return name.strip()


def _heal_kerning_splits(name: str, source_text: Optional[str] = None) -> str:
    """
    Detects and heals single capital letters accidentally separated from words by PDF kerning jumps.
    Example: 'B SAI PRANA V' -> 'B SAI PRANAV'
    Preserves:
    - Initials at word boundaries with periods: 'J. R. R. TOLKIEN'
    - Legitimate leading initials: 'B SAI PRANAV' ('B' followed by 2+ char word is preserved)
    - Hyphenated names: 'JEAN-LUC'
    - Apostrophes: 'O'BRIEN'
    """
    tokens = name.split(" ")
    if len(tokens) <= 1:
        return name

    # Check if the entire name was spaced out letter-by-letter, e.g. 'B  S A I  P R A N A V'
    # If all tokens are 1 char except maybe one, reconstruct words based on source_text if present
    if source_text:
        clean_source = unicodedata.normalize("NFC", source_text)
        # Check if the exact spaceless name exists in source text
        spaceless_name = "".join(tokens).lower()
        # Find if continuous words exist in clean_source
        reconstructed = []
        skip_to = -1
        for idx in range(len(tokens)):
            if idx <= skip_to:
                continue
            # Try combining with subsequent single-letter tokens
            candidate_word = tokens[idx]
            best_combined = candidate_word
            best_j = idx
            for j in range(idx + 1, min(len(tokens), idx + 8)):
                if len(tokens[j]) == 1 and not tokens[j].endswith("."):
                    candidate_word += tokens[j]
                    if candidate_word.lower() in clean_source.lower():
                        best_combined = candidate_word
                        best_j = j
                else:
                    break
            if best_j > idx:
                reconstructed.append(best_combined)
                skip_to = best_j
            else:
                reconstructed.append(tokens[idx])
        if len(reconstructed) < len(tokens):
            tokens = reconstructed

    healed: List[str] = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        # Lookahead: if current token has length >= 2 and is alphabetic (or ends with alphabet),
        # and the next token is an isolated single letter without a dot (e.g. 'PRANA' followed by 'V')
        if (
            i + 1 < len(tokens)
            and len(tokens[i + 1]) == 1
            and tokens[i + 1].isalpha()
            and not tokens[i + 1].endswith(".")
            and len(token) >= 2
            and token.isalpha()
        ):
            # Check if this single letter is detached by kerning
            # In South Asian, Western and International naming, a single letter without dot at the
            # end of a multi-letter name (e.g. 'PRANA V') is a kerning detachment.
            combined = token + tokens[i + 1]
            healed.append(combined)
            i += 2
            continue

        healed.append(token)
        i += 1

    return " ".join(healed)


def extract_authoritative_name(resume_text: str) -> Optional[str]:
    """
    Extracts the authoritative candidate name directly from the top lines of raw resume text:
    - Filters out email addresses, phone numbers, URLs, and generic headings.
    - Inspects early candidate lines and applies Unicode normalization.
    """
    if not resume_text:
        return None

    lines = [line.strip() for line in resume_text.split("\n") if line.strip()]
    for line in lines[:10]:
        clean_line = unicodedata.normalize("NFC", line).strip()
        # Remove markdown heading hashes if present
        clean_line = re.sub(r"^#+\s*", "", clean_line).strip()
        lower_line = clean_line.lower()

        # Skip generic headings
        if lower_line in GENERIC_HEADERS:
            continue
        # Skip lines containing email, URL, or phone patterns
        if "@" in clean_line or "http://" in lower_line or "https://" in lower_line or "www." in lower_line:
            continue
        if re.search(r"\b(linkedin|github|portfolio|email|phone|tel|mobile)\b", lower_line):
            continue
        if re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", clean_line):
            continue
        # Skip lines that are too long to be a name (e.g. summary or sentence)
        if len(clean_line) > 60 or len(clean_line) < 2:
            continue
        # Line must contain letters
        if not any(c.isalpha() for c in clean_line):
            continue
        # Skip bullet points or numbered lists
        if clean_line.startswith(("-", "*", "•", "1.", "2.")):
            continue

        normalized = normalize_candidate_name(clean_line, resume_text)
        if normalized and len(normalized) >= 2:
            return normalized

    return None


def reconcile_candidate_name(ai_name: Optional[str], source_text: str) -> str:
    """
    Enforces identity preservation between the AI output and the authoritative source resume:
    1. Extracts authoritative name from raw source text.
    2. Heals kerning and whitespace corruptions.
    3. Reconciles AI output against authoritative name.
    4. Prevents generative AI from altering verified identity fields.
    """
    auth_name = extract_authoritative_name(source_text)
    norm_ai_name = normalize_candidate_name(ai_name, source_text) if ai_name else ""

    if not auth_name:
        return norm_ai_name or "Candidate Name"

    if not norm_ai_name:
        return auth_name

    # If normalized names match exactly, return authoritative
    if norm_ai_name == auth_name:
        return auth_name

    # Check case-insensitive equality
    if norm_ai_name.lower() == auth_name.lower():
        # Preserve original source casing if valid
        return auth_name

    # Check if AI name has accidental spaces compared to authoritative name (e.g. 'B SAI PRANA V' vs 'B SAI PRANAV')
    spaceless_auth = re.sub(r"\s+", "", auth_name).lower()
    spaceless_ai = re.sub(r"\s+", "", norm_ai_name).lower()
    if spaceless_auth == spaceless_ai:
        # The characters are identical, but spacing was mutated by AI or parser!
        # Authoritative source name governs.
        return auth_name

    # If the source text contains the exact authoritative name, treat it as authoritative
    if auth_name.lower() in source_text.lower():
        return auth_name

    return norm_ai_name or auth_name


# Regular expression to identify structural cover letter closing blocks:
# Matches standard salutations at the end of the letter and any trailing candidate/placeholder name.
CLOSING_SALUTATION_REGEX = re.compile(
    r"""
    \n+
    [ \t]*
    (?:
        (?:with\s+)?(?:warmest|warm|best|kind|kindest)?\s*regards
        |sincerely(?:\s+yours)?
        |yours\s+(?:sincerely|truly|faithfully|respectfully)
        |respectfully(?:\s+submitted|\s+yours)?
        |cordially
        |warmly
        |with\s+(?:appreciation|gratitude|best\s+regards|warm\s+regards)
    )
    [,\.]?
    [ \t]*
    (?:\n+.*)?$
    """,
    re.IGNORECASE | re.VERBOSE | re.DOTALL,
)

# Trailing standalone bracket placeholders, e.g. \n\n[Your Name] or \n\n[Candidate Name]
TRAILING_PLACEHOLDER_REGEX = re.compile(
    r"""
    \n+
    [ \t]*
    (?:\[(?:your\s+name|candidate\s+name|name|applicant\s+name)\]|\<(?:your\s+name|candidate\s+name|name)\>)
    [ \t]*$
    """,
    re.IGNORECASE | re.VERBOSE,
)


def strip_closing_signature(cover_letter_text: Optional[str]) -> str:
    """
    Safely strips any formal closing salutation (e.g. 'Sincerely,', 'Best regards,')
    and trailing candidate signature/placeholder from the end of a cover letter.
    Preserves all preceding letter body paragraphs intact without broad replacements.
    """
    if not cover_letter_text:
        return ""

    text = unicodedata.normalize("NFC", cover_letter_text).rstrip()

    # 1. Check and strip formal closing salutation and anything following it
    text = CLOSING_SALUTATION_REGEX.sub("", text).rstrip()

    # 2. Check and strip any trailing isolated placeholder
    text = TRAILING_PLACEHOLDER_REGEX.sub("", text).rstrip()

    return text


def format_cover_letter_with_verified_signature(
    cover_letter_text: Optional[str],
    candidate_name: Optional[str],
    source_text: Optional[str] = None
) -> str:
    """
    Deterministically formats a cover letter by:
    1. Normalizing the verified candidate name (healing kerning splits, initials, unicode).
    2. Stripping any existing/corrupted closing salutation or embedded signature from the body.
    3. Deterministically appending the authoritative closing: 'Sincerely,\\n{verified_candidate_name}'.
    Guarantees no duplicate signatures, no AI identity hallucinations, and full identity integrity.
    """
    clean_body = strip_closing_signature(cover_letter_text)
    clean_name = normalize_candidate_name(candidate_name, source_text)

    if not clean_body:
        if clean_name:
            return f"Sincerely,\n{clean_name}"
        return "Sincerely,"

    if clean_name:
        return f"{clean_body}\n\nSincerely,\n{clean_name}"
    return f"{clean_body}\n\nSincerely,"

