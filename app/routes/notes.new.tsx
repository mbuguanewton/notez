import { useState } from "react";
import { useNavigate } from "react-router";
import { NotionEditor } from "../components/NotionEditor";
import { useNotesStorage } from "../hooks/useNotesAPI";

export function meta() {
  return [
    { title: "New Note - Notez" },
    { name: "description", content: "Create a new note with our Notion-like editor." },
  ];
}

export default function NewNote() {
  const navigate = useNavigate();
  const { createNote } = useNotesStorage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please add a title for your note');
      return;
    }

    setIsSaving(true);
    
    try {
      // Create note using API
      const newNote = await createNote(title.trim(), content);
      
      // Navigate to the new note
      navigate(`/notes/${newNote.id}`);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || content.trim()) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/notes');
      }
    } else {
      navigate('/notes');
    }
  };

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
                ← Back to Notes
              </button>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Note
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
                'Save Note'
              )}
            </button>
          </div>
        </div>

        {/* Editor Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <NotionEditor
            title={title}
            content={content}
            onTitleChange={setTitle}
            onChange={setContent}
            placeholder="Start writing your note... Use / for commands, or the toolbar above to format your text."
          />
        </div>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            📝 Editor Tips
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl/Cmd + B</kbd> for bold, <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Ctrl/Cmd + I</kbd> for italic</li>
            <li>• Start a line with <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">#</kbd> for headings, <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">-</kbd> for bullet points</li>
            <li>• Use <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">```</kbd> for code blocks, <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">&gt;</kbd> for quotes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
