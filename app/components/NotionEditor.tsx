import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import './notion-editor.css';

// Utility function to normalize HTML content for comparison
const normalizeHtml = (html: string): string => {
  if (!html) return '';
  // Remove extra whitespace, normalize line endings, and trim
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
};

interface NotionEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  title?: string;
  onTitleChange?: (title: string) => void;
  className?: string;
}

export interface NotionEditorRef {
  flushChanges: () => void;
  getContent: () => string;
}

export const NotionEditor = forwardRef<NotionEditorRef, NotionEditorProps>(({ 
  content = '', 
  onChange, 
  placeholder = "Type '/' for commands...",
  title = '',
  onTitleChange,
  className = ''
}, ref) => {
  console.log('NotionEditor rendered with:', { title, contentLength: content?.length, hasOnChange: !!onChange });
  
  const [editorTitle, setEditorTitle] = useState(title);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: true,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          return placeholder;
        },
        emptyEditorClass: 'is-editor-empty',
      }),
      Typography,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'notion-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Dropcursor.configure({
        color: '#3B82F6',
        width: 2,
      }),
      Gapcursor,
    ],
    content: content, // Use the prop content directly
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      
      console.log("Editor updated with HTML length:", html?.length);
      
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Use debouncing to prevent excessive updates
      debounceTimeoutRef.current = setTimeout(() => {
        // Only call onChange if the content has actually changed
        const normalizedHtml = normalizeHtml(html);
        const normalizedPropContent = normalizeHtml(content || '');
        
        if (normalizedHtml !== normalizedPropContent) {
          console.log('Calling onChange with new content');
          onChange?.(html);
        }
      }, 200); // Slightly longer debounce for stability
      
      // Check for slash command trigger
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.nodeBefore?.textContent || '';
      
      if (textBefore.endsWith('/')) {
        const coords = editor.view.coordsAtPos($from.pos);
        setSlashMenuPosition({
          top: coords.bottom,
          left: coords.left,
        });
        setShowSlashMenu(true);
      } else {
        setShowSlashMenu(false);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-0',
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false);
          return true;
        }
        
        // Handle slash command trigger
        if (event.key === '/' && !showSlashMenu) {
          // Small delay to let the character be inserted first
          setTimeout(() => {
            const { selection } = view.state;
            const { $from } = selection;
            const coords = view.coordsAtPos($from.pos);
            setSlashMenuPosition({
              top: coords.bottom,
              left: coords.left,
            });
            setShowSlashMenu(true);
          }, 10);
        }
        
        return false;
      },
    },
  });

  const handleSlashCommand = useCallback((command: string) => {
    if (!editor) return;

    // Remove the slash character
    const { selection } = editor.state;
    const { $from } = selection;
    const textBefore = $from.nodeBefore?.textContent || '';
    
    if (textBefore.endsWith('/')) {
      // Delete the slash character
      const from = $from.pos - 1;
      const to = $from.pos;
      editor.chain().focus().deleteRange({ from, to }).run();
    }

    // Execute the command
    switch (command) {
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'numbered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'todo':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'code':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'table':
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }
    setShowSlashMenu(false);
  }, [editor]);

  const slashCommands = [
    { key: 'h1', label: 'Heading 1', description: 'Big section heading', icon: 'H1' },
    { key: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: 'H2' },
    { key: 'h3', label: 'Heading 3', description: 'Small section heading', icon: 'H3' },
    { key: 'bullet', label: 'Bullet List', description: 'Create a simple bullet list', icon: '•' },
    { key: 'numbered', label: 'Numbered List', description: 'Create a numbered list', icon: '1.' },
    { key: 'todo', label: 'To-do List', description: 'Track tasks with a to-do list', icon: '☐' },
    { key: 'quote', label: 'Quote', description: 'Capture a quote', icon: '"' },
    { key: 'code', label: 'Code Block', description: 'Capture a code snippet', icon: '</>' },
    { key: 'table', label: 'Table', description: 'Add a table', icon: '⊞' },
    { key: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: '—' },
  ];

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setEditorTitle(newTitle);
    onTitleChange?.(newTitle);
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Normalize HTML for comparison
      const normalizedContent = normalizeHtml(content);
      const normalizedCurrentContent = normalizeHtml(currentContent);
      
      // Only update if content is different to avoid loops
      if (normalizedContent !== normalizedCurrentContent) {
        console.log('Setting editor content:', { 
          newContentLength: normalizedContent.length, 
          currentContentLength: normalizedCurrentContent.length,
          areEqual: normalizedContent === normalizedCurrentContent 
        });
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
  }, [editor, content]); // Depend on both editor and content

  // Focus the editor when it's first created
  useEffect(() => {
    if (editor) {
      // Small delay to ensure the editor is fully rendered
      setTimeout(() => {
        editor.commands.focus('end');
      }, 100);
    }
  }, [editor]);

  // Update title when prop changes
  useEffect(() => {
    setEditorTitle(title);
  }, [title]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    flushChanges: () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (editor && onChange) {
        onChange(editor.getHTML());
      }
    },
    getContent: () => {
      return editor ? editor.getHTML() : '';
    }
  }), [editor, onChange]);

  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`font-serif notion-editor ${className}`}>
      {/* Title Input */}
      <textarea
        value={editorTitle}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full text-4xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none resize-none focus:outline-none mb-6 overflow-hidden"
        style={{ minHeight: '3rem', height: 'auto' }}
        rows={1}
      />

      {/* Enhanced Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        {/* Text Formatting */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${
              editor.isActive('bold')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-3 py-1 text-sm italic rounded-md transition-colors ${
              editor.isActive('italic')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-3 py-1 text-sm line-through rounded-md transition-colors ${
              editor.isActive('strike')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            S
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              editor.isActive('highlight')
                ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            ⬛
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

        {/* Headings */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            H3
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

        {/* Lists */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            •
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            1.
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              editor.isActive('taskList')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            ☐
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

        {/* Blocks */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              editor.isActive('blockquote')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            "
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-3 py-1 text-sm font-mono rounded-md transition-colors ${
              editor.isActive('codeBlock')
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            &lt;/&gt;
          </button>
          <button
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="px-3 py-1 text-sm rounded-md transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ⊞
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-3 py-1 text-sm rounded-md transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            —
          </button>
        </div>
      </div>

      {/* Slash Menu */}
      {showSlashMenu && (
        <div 
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[300px]"
          style={{ top: slashMenuPosition.top + 25, left: slashMenuPosition.left }}
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 border-b border-gray-200 dark:border-gray-700 mb-2">
            BLOCKS
          </div>
          {slashCommands.map((command) => (
            <button
              key={command.key}
              onClick={() => handleSlashCommand(command.key)}
              className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-sm">
                {command.icon}
              </span>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {command.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {command.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Editor Content */}
      <div 
        className="notion-editor-content-wrapper"
        onClick={() => {
          setShowSlashMenu(false);
          // Ensure editor is focused when clicked
          if (editor) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent 
          editor={editor} 
          className="notion-editor-content prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-0"
        />
      </div>
    </div>
  );
});

// Add display name for debugging
NotionEditor.displayName = 'NotionEditor';
