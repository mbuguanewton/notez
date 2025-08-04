// API service for communicating with json-server backend

const API_BASE_URL = 'http://localhost:3001';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  source?: {
    url: string;
    title: string;
    type: string;
    domain?: string;
    capturedAt?: string;
  } | null;
}

class NotesAPI {
  async fetchNotes(): Promise<Note[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes?_sort=updatedAt&_order=desc`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return await response.json();
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  }

  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }): Promise<Note> {
    try {
      const noteData = {
        ...note,
        id: note.id || this.generateId(),
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('Making POST request to:', `${API_BASE_URL}/notes`);
      console.log('Request body:', noteData);
      
      const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(noteData),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to create note: ${response.status} ${errorText}`);
      }
      
      const createdNote = await response.json();
      console.log('Note created successfully:', createdNote);
      return createdNote;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    try {
      // First get the existing note to merge with updates
      const existingResponse = await fetch(`${API_BASE_URL}/notes/${id}`);
      if (!existingResponse.ok) throw new Error('Failed to fetch existing note');
      const existingNote = await existingResponse.json();
      
      // Merge existing note with updates
      const updatedNoteData = {
        ...existingNote,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      console.log('Updating note with data:', updatedNoteData);
      
      const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedNoteData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update response error:', errorText);
        throw new Error(`Failed to update note: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Note updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async deleteNote(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete note');
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  async searchNotes(query: string): Promise<Note[]> {
    try {
      if (!query.trim()) {
        return await this.fetchNotes();
      }
      
      // json-server supports q parameter for full-text search
      const response = await fetch(`${API_BASE_URL}/notes?q=${encodeURIComponent(query)}&_sort=updatedAt&_order=desc`);
      if (!response.ok) throw new Error('Failed to search notes');
      return await response.json();
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const notesAPI = new NotesAPI();
export type { Note };
