// @/components/Annotator/extensions/DisableDragDrop.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/**
 * Disables drag and drop functionality in the editor
 */
export const DisableDragDrop = Extension.create({
  name: 'disableDragDrop',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('disableDragDrop'),
        props: {
          handleDOMEvents: {
            dragstart: (view, event) => {
              event.preventDefault(); // Prevent drag image from appearing
              return true; // Block drag start
            },
            drop: () => true, // Block drop
          }
        }
      })
    ];
  }
});
