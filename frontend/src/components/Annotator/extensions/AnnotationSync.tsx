// @/components/Annotator/extensions/AnnotationSync.tsx
// Plugin to sync annotation marks with ref when document changes

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Mark as PMMark } from '@tiptap/pm/model';

export const AnnotationSyncPlugin = Extension.create({
  name: 'annotationSync',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('annotationSync'),

        view() {
          return {
            update(view, prevState) {
              const { state } = view;

              // Only process if document changed
              if (prevState.doc === state.doc) {
                return;
              }

              console.log('🔄 Document changed, checking annotations');

              // Build a map of annotationIndex -> text content in current state
              const currentAnnotations = new Map<number, string>();
              state.doc.descendants((node, pos) => {
                if (node.isText && node.marks.length > 0) {
                  node.marks.forEach(mark => {
                    if (mark.type.name === 'annotation') {
                      const index = mark.attrs.annotationIndex;
                      currentAnnotations.set(index, node.text || '');
                    }
                  });
                }
              });

              console.log('📋 Current annotations in state:', Array.from(currentAnnotations.entries()));

              // Now check the actual DOM to see if there are stale attributes
              const editorDom = view.dom;
              const annotatedSpans = editorDom.querySelectorAll('span[data-annotation-index]');

              console.log('📋 Found spans in DOM:', annotatedSpans.length);

              annotatedSpans.forEach((span: Element) => {
                const indexAttr = span.getAttribute('data-annotation-index');
                if (indexAttr) {
                  const index = parseInt(indexAttr);
                  const currentText = span.textContent || '';
                  const expectedText = currentAnnotations.get(index);

                  console.log('🔍 Checking DOM span:', {
                    index,
                    domText: currentText,
                    expectedText,
                    match: expectedText === currentText,
                  });

                  // If this annotation index doesn't exist in state, or exists but on different text
                  if (!expectedText || expectedText !== currentText) {
                    console.log('⚠️ Found stale annotation in DOM:', {
                      index,
                      domText: currentText,
                      expectedText,
                    });

                    // Remove the data attributes to clear the visual annotation
                    span.removeAttribute('data-annotation');
                    span.removeAttribute('data-annotation-index');
                    span.removeAttribute('data-color');
                    span.removeAttribute('data-label');
                    span.removeAttribute('data-tags');
                    span.removeAttribute('data-count');
                    span.classList.remove('annotation-mark');

                    console.log('✅ Cleaned up stale annotation from DOM');
                  }
                }
              });
            },
          };
        },
      }),
    ];
  },
});
