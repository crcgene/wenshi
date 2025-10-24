package main

import (
	"context"
	"encoding/xml"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// WenFileData represents parsed .wen file structure
type WenFileData struct {
	Ver        string `json:"ver"`
	CreatedAt  string `json:"createdAt"`
	ModifiedAt string `json:"modifiedAt"`
	Content    string `json:"content"`
}

// ValidationResult represents validation result
type ValidationResult struct {
	IsValid      bool   `json:"isValid"`
	ErrorMessage string `json:"errorMessage"`
}

// wenshiXML is the internal XML structure for parsing .wen files
type wenshiXML struct {
	XMLName    xml.Name `xml:"wenshi"`
	Ver        string   `xml:"ver,attr"`
	CreatedAt  string   `xml:"createdAt,attr"`
	ModifiedAt string   `xml:"modifiedAt,attr"`
	Content    string   `xml:",chardata"`
}

// OpenFileDialog opens a file picker dialog and returns the selected file path
func (a *App) OpenFileDialog() (string, error) {
	filepath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Открыть файл",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Text files",
				Pattern:     "*.txt;*.wen",
			},
			{
				DisplayName: "All files",
				Pattern:     "*.*",
			},
		},
	})
	return filepath, err
}

// SaveFileDialog opens a save file dialog and returns the selected file path
func (a *App) SaveFileDialog(suggestedFilename string) (string, error) {
	filepath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Сохранить файл",
		DefaultFilename: suggestedFilename,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Wenshi files",
				Pattern:     "*.wen",
			},
			{
				DisplayName: "Text files",
				Pattern:     "*.txt",
			},
			{
				DisplayName: "All files",
				Pattern:     "*.*",
			},
		},
	})
	return filepath, err
}

// ReadFile reads file content as UTF-8 text
func (a *App) ReadFile(filepath string) (string, error) {
	data, err := os.ReadFile(filepath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteFile writes UTF-8 text content to file
func (a *App) WriteFile(filepath string, content string) error {
	return os.WriteFile(filepath, []byte(content), 0644)
}

// isCJK checks if a rune is a CJK character
func isCJK(r rune) bool {
	return (r >= 0x4E00 && r <= 0x9FFF) || // CJK Unified Ideographs
		(r >= 0x3400 && r <= 0x4DBF) || // CJK Extension A
		(r >= 0x20000 && r <= 0x2A6DF) || // CJK Extensions B-F
		(r >= 0xF900 && r <= 0xFAFF) // CJK Compatibility
}

// ValidateTxtFile validates .txt file content
func (a *App) ValidateTxtFile(content string) ValidationResult {
	// Check if empty
	if strings.TrimSpace(content) == "" {
		return ValidationResult{IsValid: false, ErrorMessage: "File is empty"}
	}

	// Remove annotation marks {{...}} before counting
	annotationRegex := regexp.MustCompile(`\{\{[^}]*\}\}`)
	cleanText := annotationRegex.ReplaceAllString(content, "")

	// Check for XML tags
	if strings.Contains(cleanText, "<") || strings.Contains(cleanText, ">") {
		return ValidationResult{IsValid: false, ErrorMessage: "File contains XML tags (< or >) which are not allowed in .txt files"}
	}

	// Count CJK characters
	totalChars := 0
	cjkChars := 0
	for _, r := range cleanText {
		// Skip whitespace and punctuation
		if unicode.IsSpace(r) || unicode.IsPunct(r) {
			continue
		}
		totalChars++
		if isCJK(r) {
			cjkChars++
		}
	}

	// Check if at least 50% CJK
	if totalChars == 0 {
		return ValidationResult{IsValid: false, ErrorMessage: "File contains no text characters"}
	}

	percentage := float64(cjkChars) / float64(totalChars)
	if percentage < 0.5 {
		return ValidationResult{IsValid: false, ErrorMessage: "File must contain at least 50% CJK characters"}
	}

	return ValidationResult{IsValid: true, ErrorMessage: ""}
}

// ParseWenFile parses .wen file XML structure
func (a *App) ParseWenFile(content string) (WenFileData, error) {
	var result WenFileData
	var xmlData wenshiXML

	// Parse XML
	err := xml.Unmarshal([]byte(content), &xmlData)
	if err != nil {
		return result, fmt.Errorf("Invalid .wen file: %w", err)
	}

	// Check required attributes
	if xmlData.Ver == "" {
		return result, fmt.Errorf("Invalid .wen file: missing required attribute 'ver'")
	}
	if xmlData.CreatedAt == "" {
		return result, fmt.Errorf("Invalid .wen file: missing required attribute 'createdAt'")
	}
	if xmlData.ModifiedAt == "" {
		return result, fmt.Errorf("Invalid .wen file: missing required attribute 'modifiedAt'")
	}

	// Validate timestamp formats
	_, err = time.Parse(time.RFC3339, xmlData.CreatedAt)
	if err != nil {
		return result, fmt.Errorf("Invalid .wen file: invalid timestamp format in 'createdAt'")
	}
	_, err = time.Parse(time.RFC3339, xmlData.ModifiedAt)
	if err != nil {
		return result, fmt.Errorf("Invalid .wen file: invalid timestamp format in 'modifiedAt'")
	}

	// Validate content
	validationResult := a.ValidateTxtFile(xmlData.Content)
	if !validationResult.IsValid {
		return result, fmt.Errorf("Invalid .wen file content: %s", validationResult.ErrorMessage)
	}

	// Populate result
	result.Ver = xmlData.Ver
	result.CreatedAt = xmlData.CreatedAt
	result.ModifiedAt = xmlData.ModifiedAt
	result.Content = strings.TrimSpace(xmlData.Content)

	return result, nil
}

// SerializeWenFile creates .wen file XML structure
func (a *App) SerializeWenFile(content string, createdAt string, modifiedAt string) (string, error) {
	// Validate content first
	validationResult := a.ValidateTxtFile(content)
	if !validationResult.IsValid {
		return "", fmt.Errorf("Invalid content: %s", validationResult.ErrorMessage)
	}

	// Use current time if timestamps are empty
	now := time.Now().Format(time.RFC3339)
	if createdAt == "" {
		createdAt = now
	}
	if modifiedAt == "" {
		modifiedAt = now
	}

	// Validate timestamp formats
	_, err := time.Parse(time.RFC3339, createdAt)
	if err != nil {
		return "", fmt.Errorf("Invalid timestamp format in 'createdAt'")
	}
	_, err = time.Parse(time.RFC3339, modifiedAt)
	if err != nil {
		return "", fmt.Errorf("Invalid timestamp format in 'modifiedAt'")
	}

	// Normalize newlines to CRLF and escape special XML characters
	escapedContent := content
	// First normalize all newlines to \n
	escapedContent = strings.ReplaceAll(escapedContent, "\r\n", "\n")
	escapedContent = strings.ReplaceAll(escapedContent, "\r", "\n")
	// Then convert to CRLF
	escapedContent = strings.ReplaceAll(escapedContent, "\n", "\r\n")
	// Escape XML special characters
	escapedContent = strings.ReplaceAll(escapedContent, "&", "&amp;")
	escapedContent = strings.ReplaceAll(escapedContent, "<", "&lt;")
	escapedContent = strings.ReplaceAll(escapedContent, ">", "&gt;")

	// Escape attribute values
	escapeAttr := func(s string) string {
		s = strings.ReplaceAll(s, "&", "&amp;")
		s = strings.ReplaceAll(s, "<", "&lt;")
		s = strings.ReplaceAll(s, ">", "&gt;")
		s = strings.ReplaceAll(s, "\"", "&quot;")
		return s
	}

	// Manually create XML to preserve newlines in content
	result := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<wenshi ver="%s" createdAt="%s" modifiedAt="%s">%s</wenshi>`,
		escapeAttr("1.0"),
		escapeAttr(createdAt),
		escapeAttr(modifiedAt),
		escapedContent)

	return result, nil
}
