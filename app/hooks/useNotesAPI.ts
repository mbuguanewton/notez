import { useState, useEffect } from 'react';
import { notesAPI } from '../services/notesAPI';
import type { Note } from '../services/notesAPI';

export function useNotesAPI() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedNotes = await notesAPI.fetchNotes();
      setNotes(fetchedNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (title: string, content: string, tags?: string[]): Promise<Note> => {
    try {
      setError(null);
      console.log('Creating note via API:', { title, content: content.substring(0, 100), tags });
      const newNote = await notesAPI.createNote({
        title,
        content,
        tags: tags || [],
      });
      console.log('Note created successfully:', newNote);
      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (err) {
      console.error('Failed to create note via API:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) => {
    try {
      setError(null);
      const updatedNote = await notesAPI.updateNote(id, updates);
      setNotes(prev => 
        prev.map(note => 
          note.id === id ? updatedNote : note
        )
      );
      return updatedNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      setError(null);
      await notesAPI.deleteNote(id);
      setNotes(prev => prev.filter(note => note.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getNote = (id: string): Note | undefined => {
    return notes.find(note => note.id === id);
  };

  const searchNotes = async (query: string): Promise<Note[]> => {
    try {
      setError(null);
      const results = await notesAPI.searchNotes(query);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search notes';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    getNote,
    searchNotes,
    refreshNotes: loadNotes,
  };
}

// Keep the old interface for backward compatibility and fallback
export function useNotesStorage() {
  const api = useNotesAPI();
  
  // Fallback to localStorage if API is not available
  const createNoteFallback = async (title: string, content: string) => {
    console.log('Using localStorage fallback for note creation');
    const now = new Date().toISOString();
    const newNote = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
      tags: [],
    };
    
    // Try to save to localStorage as fallback
    try {
      const existing = JSON.parse(localStorage.getItem('notez-notes') || '[]');
      const updated = [newNote, ...existing];
      localStorage.setItem('notez-notes', JSON.stringify(updated));
      console.log('Note saved to localStorage:', newNote);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      throw error;
    }
    
    return newNote;
  };

  const createNoteWrapper = async (title: string, content: string) => {
    try {
      console.log('Attempting to create note via API');
      return await api.createNote(title, content);
    } catch (error) {
      console.warn('API createNote failed, falling back to localStorage:', error);
      return await createNoteFallback(title, content);
    }
  };

  return {
    notes: api.notes,
    loading: api.loading,
    error: api.error,
    createNote: createNoteWrapper,
    updateNote: api.updateNote,
    deleteNote: api.deleteNote,
    getNote: api.getNote,
    searchNotes: api.searchNotes,
    refreshNotes: api.refreshNotes,
  };
}

export type { Note };
