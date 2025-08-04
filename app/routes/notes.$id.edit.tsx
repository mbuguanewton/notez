import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { NotionEditor, type NotionEditorRef } from "../components/NotionEditor";
import { useNotesStorage } from "../hooks/useNotesAPI";

// Utility function to normalize HTML content for comparison
const normalizeHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
};

export function meta({ params }: any) {
  return [
    { title: `Edit Note - Notez` },
    { name: "description", content: `Edit your note with our Notion-like editor.` },
  ];
}

export default function EditNote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { notes, loading: notesLoading, getNote, updateNote } = useNotesStorage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<NotionEditorRef>(null);

  // Load existing note data when notes are available
  useEffect(() => {
    const loadNote = () => {
      console.log('loadNote called - notesLoading:', notesLoading, 'id:', id);
      if (notesLoading) {
        setIsLoading(true);
        return;
      }

      try {
        if (!id) {
          navigate('/notes');
          return;
        }

        const note = getNote(id);
        if (!note) {
          alert('Note not found.');
          navigate('/notes');
          return;
        }
        
        console.log('Loading note for editing:', note);
        setTitle(note.title);
        setContent(note.content);
        console.log('Set title:', note.title);
        console.log('Set content:', note.content);
      } catch (error) {
        console.error('Error loading note:', error);
        alert('Failed to load note. Please try again.');
        navigate('/notes');
      } finally {
        setIsLoading(false);
      }
    };

    loadNote();
  }, [id, navigate, getNote, notesLoading]);

  // Focus the editor once content is loaded and editor is ready
  useEffect(() => {
    if (!isLoading && content && title) {
      // Small delay to ensure editor is fully initialized
      const timer = setTimeout(() => {
        console.log('Content loaded, editor should be ready');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, content, title]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please add a title for your note');
      return;
    }

    if (!id) {
      alert('Note ID is missing');
      return;
    }

    setIsSaving(true);
    
    try {
      // Flush any pending editor changes before saving
      editorRef.current?.flushChanges();
      
      await updateNote(id, {
        title: title.trim(),
        content
      });
      
      // Navigate back to the note view
      navigate(`/notes/${id}`);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/notes/${id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              <button 
                onClick={handleCancel}
                className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                ← Back to Note
              </button>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Note
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>

        {/* Editor Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <NotionEditor
            ref={editorRef}
            title={title}
            content={content}
            onTitleChange={(newTitle) => {
              console.log('Title changed to:', newTitle);
              setTitle(newTitle);
            }}
            onChange={(newContent) => {
              console.log("Content changed, length:", newContent?.length);
              // Use normalized comparison to avoid unnecessary updates
              const normalizedNewContent = normalizeHtml(newContent || '');
              const normalizedCurrentContent = normalizeHtml(content || '');
              
              if (normalizedNewContent !== normalizedCurrentContent) {
                console.log('Content actually changed, updating state');
                setContent(newContent);
              }
            }}
            placeholder="Start writing your note..."
          />
        </div>

        {/* Last saved info */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Last saved: 2 hours ago
        </div>
      </div>
    </div>
  );
}
