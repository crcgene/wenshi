// @/components/Annotator/extensions/AnnotationMark.tsx
// TipTap Mark extension for annotations

import { Mark, mergeAttributes } from '@tiptap/core';

export interface AnnotationMarkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    annotationMark: {
      setAnnotation: (attributes: { tags: string[], color?: string, label?: string, count?: number, annotationIndex?: number }) => ReturnType;
      unsetAnnotation: () => ReturnType;
      toggleAnnotation: (attributes: { tags: string[], color?: string, label?: string, count?: number, annotationIndex?: number }) => ReturnType;
    };
  }
}

export const AnnotationMark = Mark.create<AnnotationMarkOptions>({
  name: 'annotation',

  // inclusive: false means cursor at boundaries is NOT part of the mark
  // This gives us the desired behavior:
  // - Inserting at start/end -> outside annotation
  // - Inserting in middle -> expands annotation
  // - Deleting -> shrinks annotation
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tags: {
        default: [],
        parseHTML: element => {
          const tags = element.getAttribute('data-tags');
          return tags ? tags.split(',') : [];
        },
        renderHTML: attributes => {
          return {
            'data-tags': attributes.tags.join(','),
          };
        },
      },
      count: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('data-count') || '1'),
        renderHTML: attributes => ({
          'data-count': attributes.count,
        }),
      },
      annotationIndex: {
        default: null,
        parseHTML: element => {
          const index = element.getAttribute('data-annotation-index');
          return index ? parseInt(index) : null;
        },
        renderHTML: attributes => {
          if (attributes.annotationIndex !== null) {
            return {
              'data-annotation-index': attributes.annotationIndex,
            };
          }
          return {};
        },
      },
      color: {
        default: null,
        parseHTML: element => {
          // Parse from CSS variable in style attribute
          const style = element.getAttribute('style');
          if (style) {
            const match = style.match(/--annotation-color:\s*([^;]+)/);
            return match ? match[1].trim() : null;
          }
          return null;
        },
        renderHTML: () => ({}),  // Don't render as attribute, use in style instead
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (attributes.label) {
            return {
              'data-label': attributes.label,
            };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.annotation-mark',
      },
    ];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const color = mark.attrs.color;
    const label = mark.attrs.label;
    const tags = mark.attrs.tags?.join(',') || '';
    const count = mark.attrs.count || 1;
    const annotationIndex = mark.attrs.annotationIndex || 0;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-label': label,
        'data-tags': tags,
        'data-count': count,
        'data-annotation-index': annotationIndex,
        class: 'annotation-mark',
        style: `--annotation-color: ${color || '#999'}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setAnnotation: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      unsetAnnotation: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
      toggleAnnotation: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
    };
  },
});
