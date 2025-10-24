// @/components/Annotator/utils/unicode.ts

/**
 * Check if a character is a CJK character
 * Valid ranges:
 * - CJK Unified Ideographs: U+4E00–U+9FFF
 * - CJK Unified Ideographs Extension A: U+3400–U+4DBF
 * - CJK Unified Ideographs Extension B-F: U+20000–U+2EBEF
 */
export function isCJKCharacter(char: string): boolean {
  if (char.length === 0) return false;

  const code = char.codePointAt(0);
  if (!code) return false;

  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||     // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) ||     // Extension A
    (code >= 0x20000 && code <= 0x2EBEF)      // Extensions B-F
  );
}

/**
 * Check if a text string contains only CJK characters
 * Returns false if text is empty, contains spaces, punctuation, or non-CJK chars
 */
export function isCJKText(text: string): boolean {
  if (text.length === 0) return false;

  // Convert to array of characters (handles surrogate pairs correctly)
  const chars = Array.from(text);

  return chars.every(char => isCJKCharacter(char));
}

/**
 * Check if a text string contains any CJK characters
 */
export function hasCJKCharacters(text: string): boolean {
  if (text.length === 0) return false;

  const chars = Array.from(text);
  return chars.some(char => isCJKCharacter(char));
}
