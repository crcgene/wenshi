// @/components/Annotator/utils/parser.ts

import { AnnotationMark, ParsedAnnotation, ANNOTATION_TAGS } from '../config';

/**
 * Parse markdown text with annotation marks format: text{{count,tags}}
 * Also extracts markdown formatting (bold, italic, etc.)
 */
export function parseAnnotations(text: string): {
  cleanText: string;
  annotations: ParsedAnnotation[];
} {
  const annotations: ParsedAnnotation[] = [];
  let cleanText = '';

  // Build maps for both label and code lookup
  const labelToTag = new Map<string, string>();
  for (const [tagCode, config] of Object.entries(ANNOTATION_TAGS)) {
    labelToTag.set(config.label.toLowerCase(), tagCode);
  }
  const validCodes = Object.keys(ANNOTATION_TAGS);

  // Simple regex that matches any Unicode characters in {{...}} or empty {{}}
  // Supports any language/script
  const markRegex = /\{\{(\d+,)?([\p{L}\p{N},]*)\}\}/gu;
  let lastIndex = 0;
  let match;

  while ((match = markRegex.exec(text)) !== null) {
    const beforeMark = text.slice(lastIndex, match.index);
    cleanText += beforeMark;
    const textLengthBeforeMark = cleanText.length;

    // Parse the mark
    const fullMatch = match[0];
    const countPart = match[1]; // "3," or undefined
    const tagsPart = match[2];   // "V,W" or "动,名" etc, or "" for empty {{}}

    // Skip empty marks {{}}
    if (!tagsPart || tagsPart.trim() === '') {
      lastIndex = match.index + fullMatch.length;
      continue;
    }

    const count = countPart ? parseInt(countPart.slice(0, -1)) : 1;

    // Convert labels or codes to tag codes (case-insensitive)
    // Try label first, then code
    const tags = tagsPart
      .split(',')
      .map((item: string) => item.trim())
      .filter((item: string) => item !== '')
      .map((item: string) => {
        const lower = item.toLowerCase();
        // Try label first, then code
        return labelToTag.get(lower) || (validCodes.includes(item) ? item : undefined);
      })
      .filter((tag): tag is string => tag !== undefined);

    if (tags.length > 0 && count > 0) {
      // The mark applies to the preceding characters
      const start = Math.max(0, textLengthBeforeMark - count);
      const end = textLengthBeforeMark;

      if (end > start) {
        const annotatedText = cleanText.slice(start, end);
        annotations.push({
          start,
          end,
          text: annotatedText,
          mark: {
            count: count > 1 ? count : undefined,
            tags
          }
        });
      }
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  cleanText += text.slice(lastIndex);

  return { cleanText, annotations };
}

/**
 * Convert annotations back to markdown format
 * Also handles TipTap formatting marks (bold, italic, etc.)
 */
export function serializeAnnotations(
  text: string,
  annotations: ParsedAnnotation[]
): string {
  if (annotations.length === 0) return text;

  // Sort annotations by position (reverse order for insertion)
  const sorted = [...annotations].sort((a, b) => b.end - a.end);

  let result = text;
  for (const annotation of sorted) {
    const count = annotation.mark.count || 1;
    // Convert tag codes to labels for output
    const labels = annotation.mark.tags.map(code => ANNOTATION_TAGS[code as keyof typeof ANNOTATION_TAGS]?.label || code).join(',');
    const markStr = count > 1 ? `{{${count},${labels}}}` : `{{${labels}}}`;

    // Insert mark after the annotated text
    result = result.slice(0, annotation.end) + markStr + result.slice(annotation.end);
  }

  return result;
}

