# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Wails v2 desktop application for annotating classical Chinese texts. It combines a Go backend with a React + TypeScript frontend, featuring a custom rich text editor ("Annotator") built on TipTap for marking up CJK text with visual highlights and tags.

## Technology Stack

### Backend
- **Wails v2.10.2** - Go-based framework for building desktop apps with web frontends
- **Go 1.23** - Backend runtime
- Module name: `win-n8n`

### Frontend
- **React 19** with TypeScript
- **Vite 7** - Build tool and dev server
- **TailwindCSS v4** - Styling framework
- **shadcn/ui components** - UI component library based on Radix UI
- **TipTap** - Rich text editor framework (used for annotation rendering)
- **Biome** - Linter and formatter

## Development Commands

### Backend (Go)
```bash
# Run in development mode with hot reload
wails dev

# Build production binary
wails build

# Check environment and dependencies
wails doctor
```

### Frontend (from `frontend/` directory)
```bash
# Install dependencies
npm install

# Start Vite dev server (standalone, not needed when using wails dev)
npm run dev

# Build for production
npm run build

# Format code
npm run format

# Lint code
npm run lint

# Check and fix issues
npm run check

# CI check (no fixes)
npm run ci
```

## Project Structure

```
.
├── main.go              # Wails app entry point, embeds frontend assets
├── app.go               # App struct with bound methods exposed to frontend
├── wails.json           # Wails configuration
├── go.mod               # Go dependencies
├── build/               # Build assets and output binaries
│   ├── bin/            # Compiled binaries
│   └── windows/        # Windows-specific resources
└── frontend/            # React frontend
    ├── src/
    │   ├── App.tsx              # Root component with view routing
    │   ├── main.tsx             # React entry point
    │   ├── global.css           # Global styles
    │   ├── views/               # Application views/pages
    │   │   ├── HomeView/        # Main application view
    │   │   ├── SettingsView/    # Settings page
    │   │   └── TestView/        # Annotator component test suite
    │   ├── components/
    │   │   ├── Annotator/       # Core annotation component
    │   │   │   ├── index.tsx           # Main component with TipTap editor
    │   │   │   ├── config.ts           # Annotation types and colors
    │   │   │   ├── extensions/         # TipTap custom extensions
    │   │   │   ├── utils/              # Parser and validation utilities
    │   │   │   ├── styles.css          # Component styles
    │   │   │   └── annotator-spec-v2.md  # COMPLETE specification (READ THIS FIRST!)
    │   │   ├── ui/              # shadcn/ui components
    │   │   ├── theme-provider.tsx
    │   │   └── mode-toggle.tsx
    │   └── lib/                 # Utility functions
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

## Architecture

### Go Backend
The backend is minimal, providing:
- Window creation and lifecycle management via Wails
- Context binding for frontend-to-Go method calls
- Static asset serving from embedded `frontend/dist`

All Go methods in `App` struct are automatically exposed to frontend via Wails bindings.

### Frontend Architecture
- **View-based routing**: App.tsx handles view switching via state (test/main/settings)
- **Component aliasing**: Uses `@/` alias for `./src/` imports
- **Theme system**: next-themes provider for dark/light mode support

## Annotator Component - Critical Information

**IMPORTANT**: Before making ANY changes to the Annotator component, you MUST read `frontend/src/components/Annotator/annotator-spec-v2.md` in its entirety. This is a comprehensive technical specification that defines all behavior, rules, and edge cases.

### Quick Reference

**Annotation Format**: Markdown-style inline notation
```
文本{{count,tag1,tag2}}
```
- `count` (optional): Number of characters to annotate (default: 1)
- `tags`: Comma-separated tags (v, w, x, y)
- Mark appears AFTER the annotated text
- Example: `你好世界{{3,v}}` annotates "你好世" with tag "v"

**Key Architecture Decisions**:
1. **Marks, not Nodes**: Uses TipTap marks for inline flow and overlapping support
2. **Parse/Hide notation**: `{{...}}` patterns parsed and hidden from display
3. **SVG overlays**: Visual annotations rendered as SVG decorations above text
4. **CJK validation**: Only pure CJK Unicode ranges can be annotated
5. **Edit protection**: Any edit within annotated text removes ALL marks from that range

**Component API**:
```typescript
interface AnnotatorMethods {
  getContent(): string;    // Returns text with annotation syntax
  setContent(content: string): void;
  getJSON(): object;       // Returns TipTap JSON for debugging
}

interface AnnotatorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}
```

**Annotation Rules** (see spec for complete details):
- Only pure CJK text can be annotated (U+3400–U+9FFF, U+20000–U+2EBEF)
- Cannot annotate mixed CJK/non-CJK, spaces, punctuation, line breaks
- Cannot partially overlap existing annotations
- Can add/remove tags on fully selected annotated blocks
- Editing annotated text removes the annotation first

**Selection Behavior**:
- Double-click on annotated text → selects entire annotated block
- Double-click on non-annotated CJK character → selects only that character
- Toolbar buttons show state: disabled, erroneous (conflicts), active, checked

**Visual Rendering**:
- Horizontal line with end marks above annotated text
- SVG-based labels showing tags (non-selectable)
- 15-color palette, assigned by creation order, cycles when exhausted
- Multiple tags on same text show combined label (e.g., "V,W")

**Key Files**:
- `index.tsx`: Main component with parsing and rendering logic
- `config.ts`: Types, tag definitions, 15-color palette
- `extensions/AnnotationMark.tsx`: TipTap mark extension
- `utils/parser.ts`: Converts between markdown notation and TipTap structure
- `utils/validation.ts`: Import validation and error recovery
- `utils/unicode.ts`: CJK character validation

**Error Handling**:
- Invalid marks on import (negative counts, unknown tags, malformed syntax) are removed
- Single consolidated error message per import
- Continue processing valid markers

## Key Technical Details

### TypeScript Path Alias
The `@/` alias maps to `./frontend/src/` (configured in vite.config.ts and tsconfig.json).

### Wails Asset Embedding
`//go:embed all:frontend/dist` in main.go embeds the entire Vite build output into the Go binary.

### Vite Dev Server Configuration
Vite listens on `0.0.0.0:5173` to work with Wails dev mode hot reload.

### Styling
- TailwindCSS v4 with Vite plugin
- shadcn/ui components use class-variance-authority for variants
- Custom CSS in `components/Annotator/styles.css` for annotation rendering
- Global styles in `src/global.css`

## Testing

The `TestView` provides a comprehensive test suite for the Annotator component with:
- 8 test cases covering various annotation patterns
- Edge cases: adjacent annotations, dense annotations, markdown integration
- Chinese text samples from classical literature
- JSON and content export testing

Access by setting view state to "test" in App.tsx (line 8).

## Common Tasks

### Adding a Go Method Callable from Frontend
1. Add method to `App` struct in `app.go`
2. Method is automatically bound and available in frontend via Wails runtime
3. Call from frontend using Wails runtime methods

### Adding a New View
1. Create directory in `frontend/src/views/`
2. Export default component
3. Add view to routing logic in `App.tsx`
4. Update view state type union

### Adding shadcn/ui Components
Components are installed via `frontend/components.json` configuration. The project uses the New York style with CSS variables for theming.

### Working with Annotations
**CRITICAL**: Always read `annotator-spec-v2.md` first before making changes.

When modifying annotation logic:
1. Understand the complete specification first
2. Update parser in `utils/parser.ts` for syntax changes
3. Modify `config.ts` for new tags or colors
4. Extend `AnnotationMark` extension for rendering changes
5. Update validation in `utils/validation.ts` for new rules
6. Test thoroughly in TestView before using in production views
7. Consider edge cases: overlaps, conflicts, editing behavior, undo/redo

### Debug Logging
The spec (section 11) defines events to track for debugging. When implementing features, add console logging for:
- Selection validation and state changes
- Button state transitions and conflicts
- Annotation operations (add/remove/merge)
- Text editing within annotated ranges
- Parser operations and error recovery

## Important Constraints

### Annotator Excluded Features
The following are explicitly NOT required (see spec section 12):
- Hover effects or highlighting on annotated text
- Tooltips showing annotation details
- Keyboard shortcuts for annotations
- HTML export format
- State synchronization with external stores
- Support for other TipTap extensions besides StarterKit
- Virtualization for long documents
- Grouping of multiple operations for undo/redo
