// @/components/Annotator/index.tsx

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import InvisibleCharacters from '@tiptap/extension-invisible-characters';
import Placeholder from '@tiptap/extension-placeholder';
import { AnnotationMark } from './extensions/AnnotationMark';
import { AnnotationSyncPlugin } from './extensions/AnnotationSync';
import { ClipboardHandler } from './extensions/ClipboardHandler';
import { UnannotatedText } from './extensions/UnannotatedText';
import { DoubleClickHandler } from './extensions/DoubleClickHandler';
import { DisableDragDrop } from './extensions/DisableDragDrop';
import { AnnotatorToolbar } from './components/AnnotatorToolbar';
import { parseAnnotations, serializeAnnotations } from './utils/parser';
import { ParsedAnnotation, ANNOTATION_COLORS, ANNOTATION_TAGS } from './config';
import './styles.css';

export interface AnnotatorMethods {
  getContent(): string;
  setContent(content: string): void;
  getJSON(): object;
}

interface AnnotatorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  showInvisibleChars?: boolean;
  onToggleInvisibleChars?: () => void;
}

const Annotator = forwardRef<AnnotatorMethods, AnnotatorProps>(
  ({ initialContent = '', onChange, editable = false, showInvisibleChars, onToggleInvisibleChars }, ref) => {
    const annotationsRef = useRef<ParsedAnnotation[]>([]);
    const annotationIndexRef = useRef(0);
    const isRebuildingRef = useRef(false);

    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        HardBreak,
        History,
        InvisibleCharacters,
        Placeholder.configure({
          placeholder: 'Откройте файл или вставьте текст',
        }),
        AnnotationMark,
        AnnotationSyncPlugin,
        ClipboardHandler,
        UnannotatedText,
        DoubleClickHandler,
        DisableDragDrop,
      ],
      content: '',
      editable,
      editorProps: {
        attributes: {
          /*
           * tiptap — якорный класс для поиска и стилей плагинов
           * relative — позволяет позиционировать внутренние элементы (например, индикаторы)
           * block — делает контейнер блочным (занимает всю ширину)
           * w-full — ширина на 100% родителя
           * h-full — высота на 100% родителя
           * overflow-y-auto — включает вертикальный скролл при переполнении
           * overflow-x-auto — включает горизонтальный общий скролл
           * scroll-smooth — плавная прокрутка по оси X
           * text-base — базовый размер шрифта
           * text-gray-900 — цвет текста в светлой теме
           * dark:text-gray-100 — цвет текста в тёмной теме
           * leading-relaxed — комфортное межстрочное расстояние
           * bg-white — фоновый цвет в светлой теме
           * dark:bg-neutral-900 — фоновый цвет в тёмной теме
           * p-4 — внутренние отступы вокруг текста
           * focus:outline-none — убирает стандартную рамку фокуса
           * rounded-xl — скруглённые углы
           * shadow-inner — мягкая внутренняя тень для визуальной глубины
           */
          class:
            'tiptap relative block w-full h-full overflow-y-auto overflow-x-auto scroll-smooth text-base text-gray-900 dark:text-gray-100 leading-relaxed bg-white dark:bg-neutral-900 p-4 focus:outline-none rounded-xl shadow-inner',
        },
        handlePaste: () => false,
      },
      onUpdate: () => {
        if (onChange && editable && !isRebuildingRef.current) {
          const content = getContentWithAnnotations();
          onChange(content);
        }
      },
    });

    const getContentWithAnnotations = (): string => {
      if (!editor) return '';

      const currentAnnotations: ParsedAnnotation[] = [];
      let textContent = '';
      let isFirstParagraph = true;

      editor.state.doc.descendants((node) => {
        if (node.type.name === 'paragraph') {
          // Add newline before each paragraph except the first
          if (!isFirstParagraph) {
            textContent += '\n';
          }
          isFirstParagraph = false;
        } else if (node.isText && node.text) {
          const startPos = textContent.length;
          textContent += node.text;
          const endPos = textContent.length;

          // Check if this text node has annotation mark
          if (node.marks.length > 0) {
            const annotationMark = node.marks.find(mark => mark.type.name === 'annotation');
            if (annotationMark) {
              currentAnnotations.push({
                start: startPos,
                end: endPos,
                text: node.text,
                mark: {
                  count: node.text.length > 1 ? node.text.length : undefined,
                  tags: annotationMark.attrs.tags || []
                }
              });
            }
          }
        }
      });

      return serializeAnnotations(textContent, currentAnnotations);
    };

    const setContentFromAnnotations = (content: string, preserveCursor = false) => {
      if (!editor) return;

      // Save current cursor position if needed
      const savedPos = preserveCursor ? editor.state.selection.anchor : null;

      // Step 1: Extract annotation marks {{...}} from content
      const { cleanText, annotations } = parseAnnotations(content);
      annotationsRef.current = annotations;

      // Step 2: Convert text with newlines to paragraph structure
      const lines = cleanText.split('\n');
      const htmlContent = lines.map(line => `<p>${line}</p>`).join('');

      // Set the content with paragraph structure
      isRebuildingRef.current = true;
      editor.commands.setContent(htmlContent);
      isRebuildingRef.current = false;

      // Step 3: Apply annotation marks to the document
      if (annotations.length > 0) {
        queueMicrotask(() => {
          if (!editor) return;

          isRebuildingRef.current = true;
          try {
            annotationIndexRef.current = 0;
            const tr = editor.state.tr;
            const docSize = editor.state.doc.content.size;

            // Build a map of text position to ProseMirror position
            // accounting for paragraph structure
            let textPos = 0;
            const textToPmPos = new Map<number, number>();

            let isFirstParagraph = true;
            editor.state.doc.descendants((node, pos) => {
              if (node.type.name === 'paragraph') {
                // Add newline for all paragraphs except the first
                if (!isFirstParagraph) {
                  textPos += 1;
                }
                isFirstParagraph = false;
              } else if (node.isText && node.text) {
                for (let i = 0; i < node.text.length; i++) {
                  textToPmPos.set(textPos + i, pos + i);
                }
                textPos += node.text.length;
              } else if (node.type.name === 'hardBreak') {
                textPos += 1;
              }
            });

            for (const annotation of annotations) {
              const index = annotationIndexRef.current++;
              const color = ANNOTATION_COLORS[index % ANNOTATION_COLORS.length];
              const tags = annotation.mark.tags;
              const label = tags.map(t => ANNOTATION_TAGS[t as keyof typeof ANNOTATION_TAGS]?.label || t.toUpperCase()).join(',');
              const count = annotation.mark.count || 1;

              console.log(`\n🎯 Processing annotation #${index}:`, {
                text: annotation.text,
                textStart: annotation.start,
                textEnd: annotation.end,
                count
              });

              // Map text positions to ProseMirror positions
              const from = textToPmPos.get(annotation.start);
              const to = textToPmPos.get(annotation.end - 1);

              console.log(`🎯 Annotation #${index}: text="${annotation.text}", textPos [${annotation.start}, ${annotation.end}) → PM [${from}, ${to}]`);

              if (from !== undefined && to !== undefined && to >= from) {
                const pmFrom = from;
                const pmTo = to + 1; // +1 because ProseMirror ranges are exclusive at the end

                console.log(`  PM range: [${pmFrom}, ${pmTo})`);

                if (pmTo <= docSize && pmFrom < pmTo) {
                  try {
                    const mark = editor.schema.marks.annotation.create({
                      annotationIndex: index,
                      tags,
                      color,
                      label,
                      count
                    });

                    tr.addMark(pmFrom, pmTo, mark);
                    console.log(`  ✓ addMark applied`);
                  } catch (err) {
                    console.error('Error applying annotation mark:', err);
                  }
                }
              }
            }

            editor.view.dispatch(tr);

            // Debug: check final state after dispatch
            console.log('📊 After dispatch, checking final document structure:');
            editor.state.doc.descendants((node: any, pos: number) => {
              if (node.isText) {
                const annotationMarks = node.marks.filter((m: any) => m.type.name === 'annotation');
                if (annotationMarks.length > 0) {
                  console.log(`  Text node at ${pos}: "${node.text}", annotationMarks=${annotationMarks.length}`);
                }
              }
            });
          } finally {
            isRebuildingRef.current = false;
          }
        });
      }

      // Restore cursor position if it was saved
      if (savedPos !== null) {
        const docSize = editor.state.doc.content.size;
        const safePos = Math.min(savedPos, docSize - 1);
        editor.commands.setTextSelection(safePos);
      }
    };

    useEffect(() => {
      if (initialContent && editor) {
        // Only update if the content is actually different
        const currentContent = getContentWithAnnotations();
        if (currentContent !== initialContent) {
          setContentFromAnnotations(initialContent);
        }
      }
    }, [initialContent, editor]);

    useEffect(() => {
      if (!editor) return;

      // Toggle invisible characters visibility
      if (showInvisibleChars) {
        editor.commands.showInvisibleCharacters();
      } else {
        editor.commands.hideInvisibleCharacters();
      }
    }, [showInvisibleChars, editor]);

    useEffect(() => {
      if (!editor) return;

      // Rebuild annotations on undo/redo to keep visual display in sync
      const handleUpdate = ({ transaction }: any) => {
        // Check if this is an undo/redo operation
        const isHistoryTransaction = transaction.getMeta('history$');

        if (isHistoryTransaction && !isRebuildingRef.current) {
          console.log('🔄 History operation detected, rebuilding annotations');

          // Get current content and rebuild
          queueMicrotask(() => {
            const currentContent = getContentWithAnnotations();
            setContentFromAnnotations(currentContent, true);
          });
        }
      };

      editor.on('update', handleUpdate);

      return () => {
        editor.off('update', handleUpdate);
      };
    }, [editor]);

    useImperativeHandle(ref, () => ({
      getContent: getContentWithAnnotations,
      setContent: setContentFromAnnotations,
      getJSON: () => editor?.getJSON() || {},
    }));

    const handleAnnotationChange = () => {
      if (!editor) return;

      // Get current content with annotations
      const currentContent = getContentWithAnnotations();

      // Rebuild annotations with proper indices and colors
      setContentFromAnnotations(currentContent, true);
    };

    return (
      <div className="annotator-container h-full flex flex-col">
        {editable && (
          <AnnotatorToolbar
            editor={editor}
            onAnnotationChange={handleAnnotationChange}
          />
        )}
        <div className="flex-1 overflow-hidden">
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    );
  }
);

Annotator.displayName = 'Annotator';

export default Annotator;

