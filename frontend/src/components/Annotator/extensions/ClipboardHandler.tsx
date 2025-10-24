// @/components/Annotator/extensions/ClipboardHandler.tsx
// Extension to handle copy/paste operations

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const ClipboardHandler = Extension.create({
  name: 'clipboardHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('clipboardHandler'),

        props: {
          // Handle copy - put plain text only in clipboard
          handleDOMEvents: {
            copy: (view, event) => {
              const { state } = view;
              const { from, to } = state.selection;

              // Get plain text from selection
              const text = state.doc.textBetween(from, to, '\n');

              console.log('📋 Copy:', text);

              // Set clipboard data as plain text
              event.clipboardData?.setData('text/plain', text);
              event.preventDefault();

              return true;
            },

            cut: (view, event) => {
              const { state } = view;
              const { from, to } = state.selection;

              // Get plain text from selection
              const text = state.doc.textBetween(from, to, '\n');

              console.log('✂️ Cut:', text);

              // Set clipboard data as plain text
              event.clipboardData?.setData('text/plain', text);

              // Let ProseMirror handle the deletion part
              // (it will delete the selected content)
              // event.preventDefault() would prevent deletion, so we don't call it here

              return false; // Let default cut behavior continue
            },

            paste: (view, event) => {
              const text = event.clipboardData?.getData('text/plain');

              if (!text) {
                event.preventDefault();
                return true;
              }

              console.log('📎 Paste plain text:', text);

              // Clean the text: remove markdown, XML tags, and our annotation marks
              let cleanedText = text;

              // Remove our annotation marks: {{tags}} or {{count,tags}}
              cleanedText = cleanedText.replace(/\{\{(\d+,)?[vwxy,]+\}\}/g, '');

              // Remove common markdown formatting
              cleanedText = cleanedText.replace(/\*\*(.+?)\*\*/g, '$1'); // **bold**
              cleanedText = cleanedText.replace(/\*(.+?)\*/g, '$1');     // *italic*
              cleanedText = cleanedText.replace(/_(.+?)_/g, '$1');       // _italic_
              cleanedText = cleanedText.replace(/~~(.+?)~~/g, '$1');     // ~~strikethrough~~
              cleanedText = cleanedText.replace(/`(.+?)`/g, '$1');       // `code`
              cleanedText = cleanedText.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // [text](url)
              cleanedText = cleanedText.replace(/^#+\s+/gm, '');         // # headers
              cleanedText = cleanedText.replace(/^[*\-+]\s+/gm, '');     // * list items
              cleanedText = cleanedText.replace(/^\d+\.\s+/gm, '');      // 1. numbered lists

              // Remove XML/HTML tags
              cleanedText = cleanedText.replace(/<[^>]+>/g, '');

              // Remove excessive whitespace
              cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

              console.log('✨ Cleaned text:', cleanedText);

              // Insert cleaned text at cursor position
              const { state, dispatch } = view;
              const { from, to } = state.selection;
              const tr = state.tr.insertText(cleanedText, from, to);
              dispatch(tr);

              event.preventDefault();
              return true;
            },
          },
        },
      }),
    ];
  },
});
