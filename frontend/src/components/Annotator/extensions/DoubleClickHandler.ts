// @/components/Annotator/extensions/DoubleClickHandler.ts

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { isCJKCharacter } from '../utils/unicode';

/**
 * Custom double-click handler for CJK text and annotations
 *
 * Behavior:
 * - Double-click on annotated text → select entire annotated block
 * - Double-click on non-annotated CJK character → select only that character
 * - Double-click on non-CJK text → default browser behavior (select word)
 */

// Get basic character position info from click coordinates
function getCharIndexAtClick(
  view: any,
  viewDesc: any,
  event: MouseEvent
): { startPos: number; pmNode: ProseMirrorNode; charIndex: number } | null {
  if (!viewDesc.node?.text) return null;

  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!coords) return null;

  const startPos = viewDesc.posAtStart;
  const pmNode = viewDesc.node;
  const charIndex = coords.pos - startPos;

  return { startPos, pmNode, charIndex };
}

export const DoubleClickHandler = Extension.create({
  name: 'doubleClickHandler',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('doubleClickHandler'),
        props: {
          handleDOMEvents: {
            // Prevent default selection flash on mousedown during double-click
            mousedown: (view, event) => {
              // Check if this is the second click of a double-click
              if (event.detail === 2) {
                const target = event.target as any;
                const viewDesc = target.pmViewDesc;

                if (!viewDesc) return false;

                // Prevent flash for annotation spans
                if (viewDesc.mark?.type.name === 'annotation') {
                  event.preventDefault();
                  return true;
                }

                // Prevent flash for CJK text - check the clicked character
                if (viewDesc.node?.isText && !viewDesc.mark) {
                  const result = getCharIndexAtClick(view, viewDesc, event);
                  if (result) {
                    let charIndex = Math.max(0, Math.min(result.charIndex, result.pmNode.text!.length - 1));
                    const clickedChar = result.pmNode.text![charIndex];
                    if (clickedChar && isCJKCharacter(clickedChar)) {
                      event.preventDefault();
                      return true;
                    }
                  }
                }
              }
              return false;
            },
            dblclick: (view, event) => {
              const { doc, tr } = view.state;
              const target = event.target as any;

              // Get ProseMirror view descriptor from the clicked element
              const viewDesc = target.pmViewDesc;
              if (!viewDesc) return false; // No descriptor - use default browser behavior

              // Case 1: Clicked on annotation span
              if (viewDesc.mark?.type.name === 'annotation') {
                // Select entire annotated range
                const startPos = viewDesc.posAtStart;
                const endPos = startPos + viewDesc.size;

                const selection = TextSelection.create(doc, startPos, endPos);
                view.dispatch(tr.setSelection(selection));
                return true;
              }

              // Case 2: Clicked on non-annotated text - check if CJK
              if (viewDesc.node?.isText && !viewDesc.mark) {
                const result = getCharIndexAtClick(view, viewDesc, event);
                if (!result) return false;

                let charIndex = result.charIndex;

                // Refine character position using DOM coordinates
                if (charIndex > 0 && charIndex < result.pmNode.text!.length) {
                  const charStart = view.coordsAtPos(result.startPos + charIndex);
                  if (event.clientX < charStart.left) {
                    charIndex--;
                  }
                }

                charIndex = Math.max(0, Math.min(charIndex, result.pmNode.text!.length - 1));
                const char = result.pmNode.text![charIndex];

                if (char && isCJKCharacter(char)) {
                  // Select only this single CJK character
                  const selectStart = result.startPos + charIndex;
                  const selectEnd = selectStart + 1;

                  const selection = TextSelection.create(doc, selectStart, selectEnd);
                  view.dispatch(tr.setSelection(selection));
                  return true;
                }
              }

              // Case 3: Non-CJK, non-annotated text - use default browser behavior
              return false;
            }
          }
        }
      })
    ];
  }
});
