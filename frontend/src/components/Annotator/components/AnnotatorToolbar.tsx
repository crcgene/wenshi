// @/components/Annotator/components/AnnotatorToolbar.tsx

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import * as Toolbar from '@radix-ui/react-toolbar';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ANNOTATION_TAGS } from '../config';
import { isCJKText } from '../utils/unicode';

interface AnnotatorToolbarProps {
  editor: Editor | null;
  onAnnotationChange?: () => void;
}

type ButtonState = 'disabled' | 'active' | 'checked';

interface TagButtonState {
  state: ButtonState;
  hasTag: boolean;
}

export function AnnotatorToolbar({ editor, onAnnotationChange }: AnnotatorToolbarProps) {
  const [buttonStates, setButtonStates] = useState<Record<string, TagButtonState>>({});

  useEffect(() => {
    if (!editor) return;

    const updateButtonStates = () => {
      const { from, to, empty } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, '');

      // No selection - all buttons disabled
      if (empty || text.length === 0) {
        const states: Record<string, TagButtonState> = {};
        for (const tagCode of Object.keys(ANNOTATION_TAGS)) {
          states[tagCode] = { state: 'disabled', hasTag: false };
        }
        setButtonStates(states);
        return;
      }

      // Check if selection is pure CJK
      if (!isCJKText(text)) {
        const states: Record<string, TagButtonState> = {};
        for (const tagCode of Object.keys(ANNOTATION_TAGS)) {
          states[tagCode] = { state: 'disabled', hasTag: false };
        }
        setButtonStates(states);
        return;
      }

      // Check for annotation conflicts
      const conflict = checkAnnotationConflicts(editor, from, to);

      if (conflict) {
        const states: Record<string, TagButtonState> = {};
        for (const tagCode of Object.keys(ANNOTATION_TAGS)) {
          states[tagCode] = { state: 'disabled', hasTag: false };
        }
        setButtonStates(states);
        return;
      }

      // Get current tags on selection
      const currentTags = getTagsOnSelection(editor, from, to);

      // All buttons active or checked
      const states: Record<string, TagButtonState> = {};
      for (const tagCode of Object.keys(ANNOTATION_TAGS)) {
        const hasTag = currentTags.includes(tagCode);
        states[tagCode] = {
          state: hasTag ? 'checked' : 'active',
          hasTag
        };
      }
      setButtonStates(states);
    };

    // Update on selection change
    updateButtonStates();
    editor.on('selectionUpdate', updateButtonStates);
    editor.on('update', updateButtonStates);

    return () => {
      editor.off('selectionUpdate', updateButtonStates);
      editor.off('update', updateButtonStates);
    };
  }, [editor]);

  const handleTagClick = (tagCode: string) => {
    if (!editor) return;

    const buttonState = buttonStates[tagCode];
    if (!buttonState || buttonState.state === 'disabled') {
      return;
    }

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '');

    if (buttonState.hasTag) {
      // Remove tag
      removeTag(editor, from, to, tagCode);
      console.log('➖ Annotation removed', { tagCode, text, from, to });
    } else {
      // Add tag
      addTag(editor, from, to, tagCode);
      console.log('➕ Annotation added', { tagCode, text, from, to });
    }

    // Notify parent to rebuild annotations
    if (onAnnotationChange) {
      setTimeout(() => onAnnotationChange(), 0);
    }
  };

  const handleResetAllFormatting = () => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    // Remove all marks and reset formatting
    editor.chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .run();

    console.log('🗑️ All formatting reset', { from, to });

    // Notify parent to rebuild annotations
    if (onAnnotationChange) {
      setTimeout(() => onAnnotationChange(), 0);
    }
  };

  // Check if reset button should be enabled
  const hasFormattingInSelection = () => {
    if (!editor) return false;

    const { from, to, empty } = editor.state.selection;
    if (empty) return false;

    let hasFormatting = false;
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.isText && node.marks.length > 0) {
        hasFormatting = true;
        return false;
      }
    });

    return hasFormatting;
  };

  const resetButtonEnabled = hasFormattingInSelection();

  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="annotatorToolbar"
    >
      <Toolbar.Root
        className="flex flex-col items-start gap-1 bg-background border rounded-md shadow-lg mb-[12px] relative z-[9999] p-1"
      >
        {/* Группа 1: ЧлПред */}
        <div className="flex items-center">
          {Object.entries(ANNOTATION_TAGS)
            .filter(([_, config]) => config.group === 'ЧлПред')
            .map(([tagCode, config]) => {
              const buttonState = buttonStates[tagCode] || { state: 'disabled', hasTag: false };
              const isDisabled = buttonState.state === 'disabled';
              const isChecked = buttonState.state === 'checked';

              return (
                <Button
                  key={tagCode}
                  variant={isChecked ? 'default' : 'outline'}
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => handleTagClick(tagCode)}
                  title={`${config.desc} (${config.label})`}
                  className="h-5 px-1.5 py-0.5 text-xs"
                >
                  {config.label}
                </Button>
              );
            })}
        </div>

        {/* Группа 2: Служ + кнопка X */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {Object.entries(ANNOTATION_TAGS)
              .filter(([_, config]) => config.group === 'Служ')
              .map(([tagCode, config]) => {
                const buttonState = buttonStates[tagCode] || { state: 'disabled', hasTag: false };
                const isDisabled = buttonState.state === 'disabled';
                const isChecked = buttonState.state === 'checked';

                return (
                  <Button
                    key={tagCode}
                    variant={isChecked ? 'default' : 'outline'}
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => handleTagClick(tagCode)}
                    title={`${config.desc} (${config.label})`}
                    className="h-5 px-1.5 py-0.5 text-xs"
                  >
                    {config.label}
                  </Button>
                );
              })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!resetButtonEnabled}
            onClick={handleResetAllFormatting}
            title="Reset all formatting"
            className="h-5 px-1.5 py-0.5"
          >
            <X className="size-3" />
          </Button>
        </div>
      </Toolbar.Root>
    </BubbleMenu>
  );
}

// Helper function to check for annotation conflicts
function checkAnnotationConflicts(editor: Editor, from: number, to: number): string | null {
  let hasConflict = false;
  let conflictReason: string | null = null;

  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (hasConflict) return false;

    if (node.isText && node.marks.length > 0) {
      const annotationMark = node.marks.find(mark => mark.type.name === 'annotation');
      if (annotationMark) {
        const markStart = pos;
        const markEnd = pos + node.nodeSize;

        // Check for partial overlap or nested conflict
        const isFullySelected = markStart >= from && markEnd <= to;
        const isExactMatch = markStart === from && markEnd === to;

        if (!isFullySelected && !isExactMatch) {
          // Partial overlap
          if ((markStart < from && markEnd > from) || (markStart < to && markEnd > to)) {
            hasConflict = true;
            conflictReason = 'partial overlap';
          }
        } else if (isFullySelected && !isExactMatch) {
          // Nested conflict - selection contains annotated block but doesn't match exactly
          hasConflict = true;
          conflictReason = 'nested conflict';
        }
      }
    }
  });

  return conflictReason;
}

// Helper function to get tags on current selection
function getTagsOnSelection(editor: Editor, from: number, to: number): string[] {
  const tags = new Set<string>();
  let allTextHasSameTags = true;
  let firstTags: string[] | null = null;

  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText) {
      const annotationMark = node.marks.find(mark => mark.type.name === 'annotation');
      if (annotationMark) {
        const nodeTags = annotationMark.attrs.tags || [];

        if (firstTags === null) {
          firstTags = nodeTags;
          nodeTags.forEach((tag: string) => tags.add(tag));
        } else {
          // Check if tags match
          if (JSON.stringify(nodeTags.sort()) !== JSON.stringify(firstTags.sort())) {
            allTextHasSameTags = false;
          }
        }
      } else {
        // Some text has no annotation
        if (firstTags !== null) {
          allTextHasSameTags = false;
        }
      }
    }
  });

  // Only return tags if all selected text has the same tags
  return allTextHasSameTags ? Array.from(tags) : [];
}

// Helper function to add a tag to the selection
function addTag(editor: Editor, from: number, to: number, tagCode: string) {
  const currentTags = getTagsOnSelection(editor, from, to);
  const newTags = [...currentTags, tagCode];

  // Get actual text length (not position difference)
  const selectedText = editor.state.doc.textBetween(from, to, '');
  const textLength = selectedText.length;

  // Get color and label
  const annotationIndex = 0; // Will be recalculated on content rebuild
  const color = '#999'; // Placeholder, will be set properly on rebuild
  const label = ANNOTATION_TAGS[tagCode as keyof typeof ANNOTATION_TAGS]?.label || tagCode;

  editor.chain()
    .focus()
    .setMark('annotation', {
      tags: newTags,
      annotationIndex,
      color,
      label: newTags.map(t => ANNOTATION_TAGS[t as keyof typeof ANNOTATION_TAGS]?.label || t).join(','),
      count: textLength
    })
    .run();
}

// Helper function to remove a tag from the selection
function removeTag(editor: Editor, from: number, to: number, tagCode: string) {
  const currentTags = getTagsOnSelection(editor, from, to);
  const newTags = currentTags.filter(t => t !== tagCode);

  if (newTags.length === 0) {
    // Remove the mark entirely
    editor.chain().focus().unsetMark('annotation').run();
  } else {
    // Get actual text length (not position difference)
    const selectedText = editor.state.doc.textBetween(from, to, '');
    const textLength = selectedText.length;

    // Update with remaining tags
    const annotationIndex = 0; // Will be recalculated on content rebuild
    const color = '#999'; // Placeholder

    editor.chain()
      .focus()
      .setMark('annotation', {
        tags: newTags,
        annotationIndex,
        color,
        label: newTags.map(t => ANNOTATION_TAGS[t as keyof typeof ANNOTATION_TAGS]?.label || t).join(','),
        count: textLength
      })
      .run();
  }
}
