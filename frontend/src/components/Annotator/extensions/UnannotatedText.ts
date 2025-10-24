// @/components/Annotator/extensions/UnannotatedText.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const UnannotatedTextPluginKey = new PluginKey('unannotatedText');

export const UnannotatedText = Extension.create({
  name: 'unannotatedText',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: UnannotatedTextPluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                // Check if this text node has NO annotation mark
                const hasAnnotation = node.marks.some(mark => mark.type.name === 'annotation');

                if (!hasAnnotation) {
                  // Wrap non-annotated text in a span with class
                  decorations.push(
                    Decoration.inline(pos, pos + node.nodeSize, {
                      class: 'unannotated-text'
                    })
                  );
                }
              }
            });

            return DecorationSet.create(state.doc, decorations);
          }
        }
      })
    ];
  }
});
