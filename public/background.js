// Background service worker for Notez Chrome Extension
console.log('Notez background script starting...');

// Constants
const API_BASE_URL = 'http://localhost:3001';

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Notez extension installed:', details.reason);

  // Create context menu items (wrapped in try-catch)
  try {
    createContextMenus();
  } catch (error) {
    console.error('Error creating context menus:', error);
  }

  // Initialize storage if needed (wrapped in try-catch)
  try {
    initializeStorage();
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
});

// Create context menu items
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-selection-to-notez',
      title: 'Save selection to Notez',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'capture-page-to-notez',
      title: 'Capture page to Notez',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'quick-note-notez',
      title: 'Quick note with Notez',
      contexts: ['page']
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    switch (info.menuItemId) {
      case 'save-selection-to-notez':
        await handleSaveSelection(info, tab);
        break;
      case 'capture-page-to-notez':
        await handleCapturePage(info, tab);
        break;
      case 'quick-note-notez':
        await handleQuickNote(info, tab);
        break;
    }
  } catch (error) {
    console.error('Error handling context menu click:', error);
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command, tab) => {
  try {
    switch (command) {
      case 'open-quick-note':
        await handleQuickNote({}, tab);
        break;
      case 'capture-selection':
        await handleSaveSelection({}, tab);
        break;
      case 'toggle-sidepanel':
        await chrome.sidePanel.open({ tabId: tab.id });
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // It's crucial to return true for asynchronous sendResponse
  let resultPromise;
  switch (message.type) {
    case 'SAVE_NOTE':
      resultPromise = saveNote(message.data);
      break;

    case 'UPDATE_NOTE':
      resultPromise = updateNote(message.noteId, message.data);
      break;

    case 'ADD_SELECTION_TO_PAGE_NOTE':
      resultPromise = handleAddSelectionToPageNote(message.data);
      break;

    case 'GET_NOTES':
      resultPromise = getNotes();
      break;

    case 'DELETE_NOTE':
      resultPromise = deleteNote(message.noteId);
      break;

    case 'SEARCH_NOTES':
      resultPromise = searchNotes(message.query);
      break;

    case 'CHECK_URL_ENABLED': // You need this handler from your content script
      // You can implement logic here to check URL patterns from storage
      // For now, always return true, implying it's always enabled unless specific rules apply
      resultPromise = Promise.resolve({ enabled: true });
      break;

    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false; // No async response for unknown messages
  }

  // Handle the promise resolution for all cases that have resultPromise
  if (resultPromise) {
    resultPromise
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => {
        console.error(`Error handling message type "${message.type}":`, error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates that sendResponse will be called asynchronously
  }
});

// Initialize storage (don't make network requests during initialization)
async function initializeStorage() {
  try {
    const result = await chrome.storage.local.get(['notes', 'isInitialized']);

    if (!result.isInitialized) {
      await chrome.storage.local.set({
        notes: [],
        isInitialized: true,
        lastSync: new Date().toISOString()
      });
      console.log('Storage initialized');
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Helper functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Escapes HTML characters in a string.
 * This function is safe to use in a background script as it does not rely on the DOM.
 * @param {string} text - The input string to escape.
 * @returns {string} The HTML-escaped string.
 */
function escapeHtml(text) {
  // Ensure text is a string to prevent errors with non-string inputs
  if (typeof text !== 'string') {
    text = String(text);
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// API Functions with fallback to Chrome storage
async function saveNote(note) {
  try {
    const url = note.id ? `${API_BASE_URL}/notes/${note.id}` : `${API_BASE_URL}/notes`;
    const method = note.id ? 'PUT' : 'POST';

    // Ensure note has an ID before trying API or storage
    if (!note.id) {
      note.id = generateId();
    }
    // Add/update timestamp for `updatedAt` field for consistency
    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) { // Only set createdAt if it doesn't exist (for new notes)
      note.createdAt = note.updatedAt;
    }


    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });

    if (response.ok) {
      console.log(`Note ${note.id} saved via API.`);
      return await response.json();
    } else {
      // If API response is not OK (e.g., 404, 500), consider it unavailable
      console.warn(`API responded with status ${response.status}. Falling back to Chrome storage.`);
      throw new Error(`API error: ${response.statusText}`); // Throw error to trigger catch
    }
  } catch (error) {
    console.warn('API connection failed or responded with error, falling back to Chrome storage:', error);
  }

  // Fallback to Chrome storage
  return await saveNoteToStorage(note);
}

async function saveNoteToStorage(note) {
  try {
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];

    // Ensure note has an ID. If it was an API attempt that failed, it might already have one.
    if (!note.id) {
      note.id = generateId();
    }
    // Update timestamp for `updatedAt` field for consistency
    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) { // Only set createdAt if it doesn't exist (for new notes)
      note.createdAt = note.updatedAt;
    }


    const existingIndex = notes.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      notes[existingIndex] = note;
    } else {
      notes.unshift(note); // Add new notes to the beginning
    }

    await chrome.storage.local.set({ notes });
    console.log(`Note ${note.id} saved to Chrome storage.`);
    return note;
  } catch (error) {
    console.error('Error saving note to storage:', error);
    throw error;
  }
}

async function getNotes() {
  try {
    const response = await fetch(`${API_BASE_URL}/notes?_sort=updatedAt&_order=desc`);
    if (response.ok) {
      const apiNotes = await response.json();
      console.log('Notes retrieved from API.');
      return apiNotes;
    } else {
      console.warn(`API responded with status ${response.status} for getNotes. Falling back to Chrome storage.`);
      throw new Error(`API error: ${response.statusText}`); // Throw error to trigger catch
    }
  } catch (error) {
    console.warn('API connection failed for getNotes, falling back to Chrome storage:', error);
  }

  // Fallback to Chrome storage
  try {
    const result = await chrome.storage.local.get(['notes']);
    console.log('Notes retrieved from Chrome storage.');
    return result.notes || [];
  } catch (error) {
    console.error('Error getting notes from storage:', error);
    return [];
  }
}

async function updateNote(id, updatedNote) {
  // The `saveNote` function already handles updates if `note.id` is provided
  return await saveNote({ ...updatedNote, id });
}

async function deleteNote(noteId) {
  try {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      console.log(`Note ${noteId} deleted via API.`);
      return { id: noteId, message: "Deleted from API" };
    } else {
      console.warn(`API responded with status ${response.status} for deleteNote. Falling back to Chrome storage.`);
      throw new Error(`API error: ${response.statusText}`); // Throw error to trigger catch
    }
  } catch (error) {
    console.warn('API connection failed for deleteNote, falling back to Chrome storage:', error);
  }

  // Fallback to Chrome storage
  try {
    const result = await chrome.storage.local.get(['notes']);
    const notes = result.notes || [];
    const filteredNotes = notes.filter(note => note.id !== noteId);

    await chrome.storage.local.set({ notes: filteredNotes });
    console.log(`Note ${noteId} deleted from Chrome storage.`);
    return { id: noteId, message: "Deleted from storage" };
  } catch (error) {
    console.error('Error deleting note from storage:', error);
    throw error;
  }
}

async function searchNotes(query) {
  try {
    const response = await fetch(`${API_BASE_URL}/notes?q=${encodeURIComponent(query)}&_sort=updatedAt&_order=desc`);
    if (response.ok) {
      const apiResults = await response.json();
      console.log('Notes searched via API.');
      return apiResults;
    } else {
      console.warn(`API responded with status ${response.status} for searchNotes. Falling back to Chrome storage.`);
      throw new Error(`API error: ${response.statusText}`); // Throw error to trigger catch
    }
  } catch (error) {
    console.warn('API connection failed for searchNotes, falling back to Chrome storage:', error);
  }

  // Fallback to Chrome storage with simple search
  try {
    const notes = await getNotes(); // Use getNotes which handles its own API fallback
    const lowercaseQuery = query.toLowerCase();

    const filteredNotes = notes.filter(note =>
      note.title.toLowerCase().includes(lowercaseQuery) ||
      note.content.toLowerCase().includes(lowercaseQuery) ||
      (note.tags && Array.isArray(note.tags) && note.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
    console.log('Notes searched via Chrome storage.');
    return filteredNotes;
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
}

// Context menu handlers
async function handleSaveSelection(info, tab) {
  if (info.selectionText) {
    const noteData = {
      title: `Selection from ${tab.title}`,
      content: `<blockquote>"${escapeHtml(info.selectionText)}"</blockquote><p>From: <a href="${escapeHtml(tab.url)}">${escapeHtml(tab.title)}</a></p>`,
      tags: ['selection', 'web'],
      source: {
        url: tab.url,
        title: tab.title,
        type: 'selection'
      }
    };
    try {
      await saveNote(noteData);
      console.log('Selection saved via context menu.');
    } catch (error) {
      console.error('Failed to save selection via context menu:', error);
    }
  }
}

async function handleCapturePage(info, tab) {
  const noteData = {
    title: `Page: ${tab.title}`,
    content: `<h1>${escapeHtml(tab.title)}</h1><p><a href="${escapeHtml(tab.url)}">${escapeHtml(tab.url)}</a></p><p>Add your notes here...</p>`,
    tags: ['page-capture', 'web'],
    source: {
      url: tab.url,
      title: tab.title,
      type: 'page'
    }
  };
  try {
    await saveNote(noteData);
    console.log('Page captured via context menu.');
  } catch (error) {
    console.error('Failed to capture page via context menu:', error);
  }
}

async function handleQuickNote(info, tab) {
  try {
    // Attempt to send message to the active tab's content script
    await chrome.tabs.sendMessage(tab.id, { type: 'NOTEZ_SHOW_QUICK_NOTE' });
    console.log('Sent message to content script to show quick note.');
  } catch (error) {
    console.warn('Content script not available or failed to respond:', error);
    // If content script is not injected or fails, open the extension popup
    try {
      await chrome.action.openPopup();
      console.log('Opened extension popup as fallback.');
    } catch (popupError) {
      console.error('Failed to open extension popup:', popupError);
    }
  }
}

// Selection to page note handler
async function handleAddSelectionToPageNote(data) {
  console.log('handleAddSelectionToPageNote called with:', data);

  try {
    // First, try to find an existing note for this page
    const notes = await getNotes(); // getNotes handles API fallback itself
    console.log('Currently existing notes:', notes.length);

    // Look for a specific 'web-page' type note for the current URL
    const existingNote = notes.find(note =>
      note.source &&
      note.source.url === data.url &&
      note.tags &&
      Array.isArray(note.tags) && // Ensure tags is an array before checking includes
      note.tags.includes('web-page')
    );

    console.log('Existing page note found:', !!existingNote);

    // Apply escapeHtml here as well
    const selectionHtml = `
<hr>
<h3>📝 Selected Text (${new Date().toLocaleString()})</h3>
<blockquote>"${escapeHtml(data.selectedText)}"</blockquote>
<p><em>Add your notes about this selection...</em></p>
`;
    let result;

    if (existingNote) {
      console.log('Updating existing page note:', existingNote.id);
      // Append to existing note's content
      const updatedContent = existingNote.content + selectionHtml;

      const updatedNote = {
        ...existingNote,
        content: updatedContent,
        updatedAt: new Date().toISOString() // Ensure updated timestamp
      };

      result = await updateNote(existingNote.id, updatedNote);
      console.log('Page note updated successfully');
    } else {
      console.log('Creating new page note for:', data.url);
      // Create new note for this page
      const newNote = {
        id: generateId(),
        title: `Page Notes: ${escapeHtml(data.title)}`, // Apply escapeHtml here
        content: `<h1>${escapeHtml(data.title)}</h1>
<p><strong>URL:</strong> <a href="${escapeHtml(data.url)}" target="_blank">${escapeHtml(data.url)}</a></p>
<p></p>
<p>Add your main page notes here...</p>
${selectionHtml}`, // Initial selection is appended
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['web-page', data.domain], // Use 'web-page' tag to identify these specific notes
        source: {
          url: data.url,
          title: data.title,
          domain: data.domain,
          capturedAt: new Date().toISOString()
        }
      };

      result = await saveNote(newNote);
      console.log('New page note created successfully');
    }
    return result;
  } catch (error) {
    console.error('Error in handleAddSelectionToPageNote:', error);
    throw error; // Re-throw to propagate error to content script
  }
}

console.log('Notez background script loaded successfully');