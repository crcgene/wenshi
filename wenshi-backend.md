# Wenshi Backend Requirements

## Overview

Backend implementation for file operations in the Wenshi application. Handles opening, saving, and validating .txt and .wen files with CJK text content and annotations.

## File Formats

### .txt Format
- Plain text files containing Chinese text with optional annotation marks
- Annotation format: `text{{count,tag1,tag2}}` (see annotator-spec-v2.md)
- No special headers or metadata

**Validation Requirements:**
- Must contain at least 50% CJK characters (excluding annotation marks)
- Must NOT contain XML tags (`<` or `>` characters)
- Empty files are not allowed

### .wen Format
- Custom XML-wrapped format for annotated Chinese texts
- Structure:
```xml
<wenshi ver="1.0" createdAt="2025-01-15T10:30:00Z" modifiedAt="2025-01-20T14:45:00Z">
content with annotations here
</wenshi>
```

**Metadata Attributes:**
- `ver`: File format version (string, currently "1.0")
- `createdAt`: ISO 8601 timestamp of file creation
- `modifiedAt`: ISO 8601 timestamp of last modification

**Validation Requirements:**
- Must be valid XML with single root `<wenshi>` element
- Must have all three required attributes (ver, createdAt, modifiedAt)
- Content inside must follow .txt validation rules (50% CJK, no nested XML tags)
- Timestamps must be valid ISO 8601 format

## Go Methods (app.go)

All methods should be bound to the `App` struct and callable from frontend via Wails runtime.

### 1. OpenFileDialog
```go
func (a *App) OpenFileDialog() (string, error)
```
- Opens native file picker dialog
- Filter: "Text files|*.txt;*.wen|All files|*.*"
- Returns: selected file path (empty string if cancelled)
- Error: dialog initialization errors

### 2. SaveFileDialog
```go
func (a *App) SaveFileDialog(suggestedFilename string) (string, error)
```
- Opens native save file dialog
- Default extension: .wen
- Suggested filename parameter for "Save As" functionality
- Returns: selected file path (empty string if cancelled)
- Error: dialog initialization errors

### 3. ReadFile
```go
func (a *App) ReadFile(filepath string) (string, error)
```
- Reads file content as UTF-8 text
- Returns: file content as string
- Error: file not found, permission denied, encoding errors

### 4. WriteFile
```go
func (a *App) WriteFile(filepath string, content string) error
```
- Writes UTF-8 text content to file
- Creates file if doesn't exist, overwrites if exists
- Error: permission denied, disk full, write errors

### 5. ValidateTxtFile
```go
func (a *App) ValidateTxtFile(content string) (bool, string)
```
- Validates .txt file content
- Returns: (isValid bool, errorMessage string)
- Checks:
  - Not empty
  - At least 50% CJK characters (excluding `{{...}}` annotation marks)
  - No XML tags (`<` or `>` characters)

**CJK Character Ranges:**
- CJK Unified Ideographs: U+4E00–U+9FFF
- CJK Extension A: U+3400–U+4DBF
- CJK Extension B-F: U+20000–U+2A6DF
- CJK Compatibility: U+F900–U+FAFF

**Error Messages:**
- "File is empty"
- "File must contain at least 50% CJK characters"
- "File contains XML tags (< or >) which are not allowed in .txt files"

### 6. ParseWenFile
```go
type WenFileData struct {
    Ver        string `json:"ver"`
    CreatedAt  string `json:"createdAt"`
    ModifiedAt string `json:"modifiedAt"`
    Content    string `json:"content"`
}

func (a *App) ParseWenFile(content string) (WenFileData, error)
```
- Parses .wen file XML structure
- Extracts metadata attributes and content
- Returns: structured data with metadata and content
- Error: invalid XML, missing required attributes, invalid timestamp format

**Validation:**
- Must have single `<wenshi>` root element
- Must have all three attributes: ver, createdAt, modifiedAt
- Timestamps must be valid ISO 8601 format
- Content must pass ValidateTxtFile checks

**Error Messages:**
- "Invalid .wen file: missing <wenshi> root element"
- "Invalid .wen file: missing required attribute 'ver'"
- "Invalid .wen file: missing required attribute 'createdAt'"
- "Invalid .wen file: missing required attribute 'modifiedAt'"
- "Invalid .wen file: invalid timestamp format in 'createdAt'"
- "Invalid .wen file: invalid timestamp format in 'modifiedAt'"
- Plus all ValidateTxtFile error messages

### 7. SerializeWenFile
```go
func (a *App) SerializeWenFile(content string, createdAt string, modifiedAt string) (string, error)
```
- Creates .wen file XML structure
- Parameters:
  - content: text with annotations
  - createdAt: ISO 8601 timestamp (empty string = use current time)
  - modifiedAt: ISO 8601 timestamp (empty string = use current time)
- Returns: formatted XML string
- Error: invalid timestamp format, content validation failure

**Format:**
```xml
<wenshi ver="1.0" createdAt="{createdAt}" modifiedAt="{modifiedAt}">
{content}
</wenshi>
```

**Behavior:**
- If createdAt is empty string, use current time
- If modifiedAt is empty string, use current time
- Validate content with ValidateTxtFile before serializing
- Escape any special XML characters in content (but this should not happen as < > are not allowed)

## Frontend State Management (HomeView)

### State Variables
```typescript
interface FileState {
  path: string;           // Current file path, empty string if new file
  hasUnsavedChanges: boolean;
  metadata: {
    ver: string;
    createdAt: string;    // ISO 8601 timestamp
    modifiedAt: string;   // ISO 8601 timestamp
  } | null;               // null for .txt files or new files
}

const [fileState, setFileState] = useState<FileState>({
  path: '',
  hasUnsavedChanges: false,
  metadata: null
});
```

### Unsaved Changes Tracking
- Set `hasUnsavedChanges = true` when Annotator's `onChange` is called
- Reset `hasUnsavedChanges = false` after successful save
- Show confirmation dialog before:
  - Opening new file when hasUnsavedChanges = true
  - Closing application when hasUnsavedChanges = true (requires Wails window close handler)

**Confirmation Dialog Message:**
"У вас есть несохраненные изменения. Продолжить без сохранения?"

## Frontend Operations

### Open File Operation

**Flow:**
1. User clicks Open icon button in MainToolbar
2. If `fileState.hasUnsavedChanges = true`:
   - Show confirmation dialog
   - If user cancels, abort operation
3. Call `OpenFileDialog()` to get file path
4. If cancelled (empty path), abort operation
5. Call `ReadFile(path)` to get content
6. Determine file type from extension (.txt or .wen)
7. **If .txt file:**
   - Call `ValidateTxtFile(content)`
   - If invalid, show error message and abort
   - Call `annotatorRef.current.setContent(content)`
   - Update state:
     ```typescript
     setFileState({
       path: filepath,
       hasUnsavedChanges: false,
       metadata: null
     });
     ```
8. **If .wen file:**
   - Call `ParseWenFile(content)` to extract data
   - If invalid, show error message and abort
   - Call `annotatorRef.current.setContent(data.content)`
   - Update state:
     ```typescript
     setFileState({
       path: filepath,
       hasUnsavedChanges: false,
       metadata: {
         ver: data.ver,
         createdAt: data.createdAt,
         modifiedAt: data.modifiedAt
       }
     });
     ```

### Save File Operation

**Flow:**
1. User clicks Save icon button in MainToolbar
2. Get content: `const content = annotatorRef.current.getContent()`
3. **If new file (fileState.path is empty):**
   - Call `SaveFileDialog('')` to get save location
   - If cancelled, abort operation
   - Proceed to step 4 with selected path
4. **If existing file:**
   - Use `fileState.path`
5. Determine target file type from extension
6. **If saving as .txt:**
   - Call `ValidateTxtFile(content)`
   - If invalid, show error and abort
   - Call `WriteFile(path, content)`
7. **If saving as .wen:**
   - If `fileState.metadata` exists (opened .wen file):
     - Use existing `createdAt`
     - Update `modifiedAt` to current time
   - If `fileState.metadata` is null (new file or opened .txt):
     - Set both `createdAt` and `modifiedAt` to current time
   - Call `SerializeWenFile(content, createdAt, modifiedAt)`
   - Call `WriteFile(path, serializedContent)`
8. Update state:
   ```typescript
   setFileState({
     path: savedPath,
     hasUnsavedChanges: false,
     metadata: // updated metadata or null depending on file type
   });
   ```

### Save As Operation

**Flow:**
1. User clicks Save As icon button in MainToolbar
2. Get content: `const content = annotatorRef.current.getContent()`
3. Suggest filename:
   - If `fileState.path` exists, extract filename
   - Otherwise use "untitled.wen"
4. Call `SaveFileDialog(suggestedFilename)`
5. If cancelled, abort operation
6. Follow steps 5-8 from Save File Operation with new path

**Special case:** If saving existing .wen as .txt:
- Lose metadata (fileState.metadata becomes null)
- Show warning: "Сохранение как .txt файл приведет к потере метаданных. Продолжить?"

## Error Handling

### Error Display
All errors should be displayed to user via native dialog or notification:
- File validation errors: Show validation error message
- File I/O errors: Show system error (e.g., "Permission denied", "File not found")
- Parse errors: Show parse error message

### Error Recovery
- Validation errors: Keep current state, allow user to fix or cancel
- I/O errors: Keep current state, allow user to retry or choose different location
- Parse errors: Keep current state, suggest checking file format

## Icons (lucide-react)

- **Open File:** `FileOpen` icon
- **Save:** `Save` icon
- **Save As:** `SaveAs` icon (or `Save` with different label)

## Implementation Notes

### CJK Character Detection
Use Unicode ranges for CJK detection in Go:
```go
func isCJK(r rune) bool {
    return (r >= 0x4E00 && r <= 0x9FFF) ||   // CJK Unified Ideographs
           (r >= 0x3400 && r <= 0x4DBF) ||   // CJK Extension A
           (r >= 0x20000 && r <= 0x2A6DF) || // CJK Extensions B-F
           (r >= 0xF900 && r <= 0xFAFF)      // CJK Compatibility
}
```

### Annotation Mark Exclusion
When counting CJK percentage, exclude annotation marks from total character count:
```go
// Remove all {{...}} patterns before counting
cleanText := regexp.MustCompile(`\{\{[^}]*\}\}`).ReplaceAllString(content, "")
```

### XML Parsing
Use Go's `encoding/xml` package for parsing .wen files:
```go
import "encoding/xml"

type WenshiXML struct {
    XMLName    xml.Name `xml:"wenshi"`
    Ver        string   `xml:"ver,attr"`
    CreatedAt  string   `xml:"createdAt,attr"`
    ModifiedAt string   `xml:"modifiedAt,attr"`
    Content    string   `xml:",chardata"`
}
```

### Timestamp Handling
Use Go's `time` package for ISO 8601 timestamps:
```go
import "time"

// Parse ISO 8601
t, err := time.Parse(time.RFC3339, timestamp)

// Format ISO 8601
timestamp := time.Now().Format(time.RFC3339)
```

### Wails Runtime Usage (Frontend)
```typescript
import { OpenFileDialog, ReadFile, ValidateTxtFile, ParseWenFile,
         WriteFile, SerializeWenFile, SaveFileDialog } from '../wailsjs/go/main/App';

// Example usage:
const path = await OpenFileDialog();
if (path) {
  const content = await ReadFile(path);
  const [isValid, error] = await ValidateTxtFile(content);
  if (isValid) {
    annotatorRef.current.setContent(content);
  } else {
    alert(error);
  }
}
```

## Testing Requirements

### Go Unit Tests
- Test each validation function with valid and invalid inputs
- Test CJK percentage calculation with various texts
- Test XML parsing with valid and malformed .wen files
- Test timestamp parsing with valid and invalid formats

### Frontend Integration Tests
- Test full Open → Edit → Save cycle
- Test unsaved changes warning
- Test .txt to .wen conversion (metadata creation)
- Test .wen to .txt conversion (metadata loss warning)
- Test file type detection by extension
- Test error handling for I/O failures

## Future Enhancements (Out of Scope)

- Auto-save functionality
- Backup file creation
- Recent files list
- File format migration (older .wen versions)
- Multi-file batch operations
- Cloud storage integration
