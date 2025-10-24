# Annotator Component - Technical Specification v2

## Overview
Rich text editor component based on Tiptap for annotating classical Chinese texts using custom marks with double-bracket notation.

## Component Structure
```
@/components/Annotator/
├── index.tsx              # Main component
├── components/
│   └── AnnotatorToolbar.tsx    # Toolbar with annotation buttons
├── extensions/
│   └── AnnotationMark.tsx      # Tiptap custom mark extension
├── utils/
│   ├── unicode.ts         # CJK Unicode validation
│   ├── parser.ts          # Format conversion
│   └── validation.ts      # Import validation & fixing
├── config.ts              # TypeScript types and configuration constants
└── styles.css             # Component styles
```

---

## 1. Data Format

### Storage Format
**Markdown with inline annotation marks**

Format: `text{{count,tags}}` or `text{{tags}}`
- `count` (optional): number of preceding characters to annotate (default: 1)
- `tags`: comma-separated tag names (v, w, x, y)
- Mark appears AFTER the annotated text

Examples:
```markdown
# Chapter 1

Some text 你好世界{{3,v}} more text.

## Section 1.1

中文{{x}}汉字{{2,y}}
```

### Conversion Examples
| Old XML Format | New Mark Format |
|----------------|-----------------|
| `<v>A</v>` | `A{{v}}` |
| `<v>ABC</v>` | `ABC{{3,v}}` |
| `<v>AB</v>C<w>DE</w>` | `AB{{2,v}}CDE{{2,w}}` |
| `<v><w>A</w></v>` | `A{{w,v}}` |
| `<v><w>ABC</w></v>` | `ABC{{3,w,v}}` |

---

## 2. Annotation System

### Predefined Tags
| Tag | Display Label |
|-----|---------------|
| `v` | V |
| `w` | W |
| `x` | X |
| `y` | Y |

### Mark Structure
```typescript
interface AnnotationMark {
  count?: number;  // Number of chars (default: 1)
  tags: string[];  // Array of tag names
}
```

---

## 3. Text Selection & Validation

### 3.1 Double-Click Behavior
- **Annotated text**: select ALL characters in the annotated block
- **CJK character (not annotated)**: select ONLY that single character
- **Other characters**: default Tiptap behavior

Examples:
- Double-click on any char in `ABC{{3,v}}` → selects `ABC`
- Double-click on `你` in `你好` (no annotation) → selects only `你`
- Double-click on English word → default word selection

### 3.2 CJK Character Validation
**Valid annotation targets:**
- CJK Unified Ideographs: `U+4E00–U+9FFF`
- CJK Unified Ideographs Extension A: `U+3400–U+4DBF`
- CJK Unified Ideographs Extension B-F: `U+20000–U+2EBEF`

**Cannot annotate:**
- Mixed CJK/non-CJK selections
- Selections containing spaces, punctuation, line breaks
- Multi-line selections (annotations cannot span multiple lines)
- Selections containing markdown syntax or block boundaries

---

## 4. Annotation Rules

### 4.1 Annotation Process
- Annotations are applied via toolbar buttons
- User must first select text block containing ONLY CJK characters
- Each button toggles its corresponding tag on/off for the selection

### 4.2 Selection Validation & Button States

**Disabled state** (grayed out, not clickable):
- No text selected
- Selected text contains non-CJK characters
- Selected text is mixed (CJK + non-CJK)

**Erroneous state** (disabled + red border/indication):
- Selection contains a nested annotated block that doesn't match selection exactly
- Selection partially overlaps with an existing annotated block

**Active state** (enabled, clickable):
- Pure CJK text selected
- No annotation conflicts
- Can create new annotation

**Checked state** (toggle indicator):
- Button shows as "on" if its tag is present on the selected text
- Multiple buttons can be checked if text has multiple tags
- Users determine available actions by button states in toolbar

### 4.3 Annotation Conflict Rules

**Allowed operations:**
- Annotate plain CJK text
- Add additional tags to fully selected annotated block
- Remove tags from fully selected annotated block
- When all tags removed, mark is deleted and text becomes plain

**Blocked operations (trigger erroneous state):**
- **Nested conflict**: Selection contains annotated block not matching selection
  - Example: `ABC{{2,v}}D` selected as `ABCD` → error (contains `AB{{2,v}}` inside)
- **Partial overlap**: Selection partially intersects annotated block
  - Example: `ABC{{3,v}}DE` with selection `BCD` → error (partial overlap)
  - Example: `ABC{{3,v}}DE` with selection `CDE` → error (partial overlap)

**Valid operations examples:**
- `ABC{{3,v}}` with selection `ABC` → can add `w` tag → `ABC{{3,v,w}}`
- `ABC{{3,v,w}}` with selection `ABC` → can remove `v` → `ABC{{3,w}}`
- `ABC` with selection `ABC` → can add `v` → `ABC{{3,v}}`

### 4.4 Mark Management
- When adding tag to already marked text: append to existing mark's tags
- When removing last tag from mark: delete entire mark notation
- Tags in mark are comma-separated: `{{3,v,w,x}}`
- Order of tags reflects order of application

---

## 5. Text Editing

### 5.1 Keyboard Input
- **Before mark**: normal input
- **After mark**: normal input
- **Within annotated range**: removes ALL marks on that range, then allows input

### 5.2 Deletion Rules
**Any deletion within annotated text → removes ALL marks on affected range**

Examples:
- `ABC{{3,v}}` → delete `A` → `BC` (mark removed)
- `ABC{{3,v}}` → delete `B` → `AC` (mark removed)
- `ABC{{3,v}}` → delete `ABC` → `` (text and mark removed)
- `AB{{2,v}}CD{{2,w}}` → delete `C` → `AB{{2,v}}D` (second mark removed)
- `AB{{2,v}}CD{{2,w}}` → delete `BC` → `AD` (both marks removed)

### 5.3 Clipboard Operations
**Copy:**
- Copies plain text ONLY (annotations not included)
- Works with any selection

**Paste:**
- Always pastes as plain text (strips any formatting/annotations from source)
- Pasting inside annotated block: removes annotation, then inserts text
- External content with annotations: stripped to plain text

### 5.4 Undo/Redo
- All annotation operations must be undoable via Ctrl+Z / Cmd+Z
- Each annotation operation creates separate undo step
- Multiple tag operations NOT grouped (each tag add/remove is separate undo step)

### 5.5 Line Breaks
- Inserting line break inside annotated block: removes annotation
- Annotations cannot span multiple lines
- Each line must be annotated separately

---

## 6. Visual Rendering

### 6.1 Display Strategy

**Annotation Visualization Components:**

1. **Horizontal line with end marks**
   - Positioned above annotated text
   - Line height: 1px
   - End marks: 3px vertical lines extending downward from main line
   - Small gaps (2-3px) between adjacent annotations

2. **Labels above line**
   - Centered over annotated block
   - Rendered as SVG text (non-selectable, non-interactive)
   - Same color as line
   - Font size: smaller than main text (e.g., 10-12px)

**Color Assignment System:**
- Predefined palette of 15 distinct colors with high contrast between adjacent colors
- Colors should be distinguishable and work well on light backgrounds
- Assignment based on annotation creation order (first annotation = first color)
- When all colors exhausted, cycle back to the beginning of palette
- Each annotation gets consistent color throughout the document
- Colors should maintain good readability and visual hierarchy

**Rendering Implementation:**
- Use Tiptap's Decoration system to overlay visual elements on annotated text
- Each annotation generates an inline SVG element positioned above the text
- SVG contains three visual components:
  - Two vertical end marks (3px tall) at the left and right edges of annotated text
  - One horizontal line connecting the end marks
  - Centered text label above the line showing the annotation tags
- SVG element must be absolutely positioned relative to the annotated text span
- All SVG elements must be non-interactive (no pointer events, no text selection)
- Labels rendered as SVG text elements, not HTML text
- Color coordination: line, end marks, and label text use the same assigned color

**Multiple Annotations on Same Text:**
- Single line with combined labels
- Example: `ABC{{3,v,w}}` shows one line with "V,W" label
- Color assigned based on first annotation's index

**Layout Behavior:**
- Annotations flow with text (no fixed positioning)
- Maintain position during zoom (scale with text)
- Stay synchronized during horizontal scroll
- Update immediately when text changes

**CSS Requirements:**
- Annotation marks must be completely non-interactive (no pointer events)
- Annotation labels must be non-selectable by user
- Annotated text spans need relative positioning to anchor the SVG overlays
- Adequate padding above text lines to accommodate annotation visualizations
- Z-index management to ensure annotations appear above text but below other UI elements
- Responsive sizing that scales with text zoom and font size changes

### 6.2 Tiptap Implementation
Use custom Mark extension:
- Parse and hide `{{...}}` notation
- Apply visual styling to preceding characters
- Render labels above text using CSS/decoration

---

## 7. Toolbar

### 7.1 Layout
- Static position (not floating/sticky)
- Always visible
- Contains annotation toggle buttons in fixed order: v, w, x, y
- Additional debug button: "JSON" for viewing internal representation

### 7.2 Annotation Buttons
**Click behavior:**
- Add annotation if not present (toggle ON)
- Remove annotation if present (toggle OFF)
- Only removes the specific tag clicked (if multiple tags exist)

**Visual states:**
- See section 4.2 for button state details
- No tooltips or usage counters needed

### 7.3 JSON Debug Button
- Shows current document structure in JSON format
- Opens in modal/popup with pretty-printed JSON
- Useful for debugging and understanding internal state
- Read-only display

---

## 8. Parser Implementation

### 8.1 Text to Tiptap
1. Parse markdown structure
2. Find all `{{...}}` patterns
3. Extract count and tags
4. Apply marks to preceding characters
5. Hide mark notation from display

### 8.2 Tiptap to Text
1. Iterate through document
2. Identify marked ranges
3. Generate `{{count,tags}}` notation
4. Place after marked text

### 8.3 Error Handling on Import
**Invalid markers are removed:**
- Negative counts: `{{-1,v}}`
- Count exceeding available characters: `{{5,v}}` with only 3 preceding chars
- Unknown tags: `{{2,z}}` where 'z' is not defined
- Malformed syntax: `{{v,2}}` (wrong order)

**Error reporting:**
- Single consolidated message per import operation
- List count of invalid markers removed
- Continue processing valid markers

---

## 9. Export/Import

### 9.1 Methods
```typescript
interface AnnotatorMethods {
  getContent(): string;          // Returns markdown with marks
  setContent(content: string): void;  // Loads markdown with marks
  getJSON(): object;              // Returns document structure as JSON
}
```

### 9.2 Supported Formats
- **Primary**: Markdown with inline `{{count,tags}}` notation
- **Debug**: JSON representation for debugging and inspection
- **Clipboard**: Plain text only (annotations stripped)

### 9.3 onChange Callback
- Triggered on every document change
- Includes: text edits, annotation additions/removals
- Provides updated content in markdown format

---

## 10. Technical Considerations

### 10.1 Why Marks vs Nodes
- Marks allow inline text flow
- Better for overlapping annotations
- Simpler cursor/selection behavior
- Native Tiptap mark merging

### 10.2 Edit Behavior Implementation
- Listen to `beforeinput` or transaction events
- Detect if cursor/change is within marked range
- Remove marks before allowing edit
- This simplifies logic: annotated text is "protected" - any edit removes annotation

### 10.3 Performance
- Expected load: up to 100 annotations per document
- Optimization: update only affected decorations on change
- No virtualization needed for typical use cases
- Re-render decorations only for modified marks

### 10.4 Integration
- Standalone component (no other Tiptap extensions)
- No external state management required
- Self-contained annotation logic
- onChange callback provides external update notifications

### 10.5 Markdown Elements
- Can annotate text inside markdown elements (bold, italic, links)
- Cannot annotate if selection includes markdown syntax characters
- Treat markdown boundaries as non-CJK characters for validation

---

## 11. Debug Logging

### Events to Track
The following events should be logged to console for debugging:

**Selection Events:**
- Text selection changes (selected text, character range, Unicode values)
- Selection validation results (pure CJK, mixed content, overlap detection)
- Double-click behavior (what was selected, how)

**Button State Changes:**
- State transitions (active, disabled, erroneous, checked)
- Reason for state change (no selection, invalid chars, conflicts)
- Which specific conflict was detected

**Annotation Operations:**
- Mark application (text, position, tags added)
- Mark removal (text, position, tags removed)
- Mark merging (when multiple tags combined)
- Failed annotation attempts (reason for failure)

**Text Editing Events:**
- Input attempts within annotated ranges
- Mark removal due to editing
- Deletion operations affecting annotations

**Parser Operations:**
- Import parsing (marks found, positions, validation results)
- Export generation (marks converted to notation)
- Error recovery attempts during import

**Performance Metrics:**
- Time taken for annotation operations
- Number of marks in document
- Re-render counts for decorations

---

## 12. Excluded Features

The following features are explicitly NOT required:
- Hover effects or highlighting on annotated text
- Tooltips showing annotation details
- Keyboard shortcuts for annotations
- HTML export format
- State synchronization with external stores (Zustand)
- Support for other Tiptap extensions
- Virtualization for long documents
- Grouping of multiple operations for undo/redo