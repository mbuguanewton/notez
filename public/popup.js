// Function to find the active development server URL
async function findDevServerUrl() {
  const ports = [5173, 5174, 5175];
  for (const port of ports) {
    try {
      await fetch(`http://localhost:${port}`);
      console.log(`Dev server found at http://localhost:${port}`);
      return `http://localhost:${port}`;
    } catch (e) {
      // Ignore and try next port
    }
  }
  console.error("Could not find dev server. Please ensure it's running on port 5173, 5174, or 5175.");
  return null; // Or a default/production URL
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentPageInfo();
  await loadRecentNotes();
  setupEventListeners();
});

// Load current page information and check for existing note
async function loadCurrentPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      // Update UI with current page info
      updatePageInfo(tab);
      
      // Check if a page note already exists for this URL
      await checkAndShowPageNote(tab);
    }
  } catch (error) {
    console.error('Error loading page info:', error);
  }
}

function updatePageInfo(tab) {
  // Add current page info to the header
  const header = document.querySelector('.header');
  const pageInfo = document.createElement('div');
  pageInfo.className = 'current-page-info';
  pageInfo.innerHTML = `
    <div class="page-title">${truncateText(tab.title, 40)}</div>
    <div class="page-url">${getDomain(tab.url)}</div>
  `;
  
  // Insert after the title
  header.appendChild(pageInfo);
}

async function checkAndShowPageNote(tab) {
  try {
    // Get all notes to check if one exists for this page
    const response = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
    
    if (response.success) {
      // Look for existing page note
      const existingNote = response.data.find(note => 
        note.source && 
        note.source.url === tab.url && 
        note.tags && 
        note.tags.includes('web-page')
      );
      
      if (existingNote) {
        // Show existing note summary and options to add more content
        showExistingPageNote(existingNote, tab);
      } else {
        // Create new page-based note as before
        await createPageBasedNote(tab);
      }
    } else {
      // Fallback to creating new note
      await createPageBasedNote(tab);
    }
  } catch (error) {
    console.error('Error checking for existing page note:', error);
    // Fallback to creating new note
    await createPageBasedNote(tab);
  }
}

function showExistingPageNote(note, tab) {
  const quickActions = document.querySelector('.quick-actions');
  
  // Create existing page note section
  const pageNoteSection = document.createElement('div');
  pageNoteSection.className = 'page-note-section existing-note';
  pageNoteSection.innerHTML = `
    <div class="page-note-header">
      <h3>📄 Page Note Exists</h3>
      <span class="note-date">Updated ${formatDate(note.updatedAt)}</span>
    </div>
    <div class="existing-note-summary">
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-preview">${escapeHtml(getPlainTextPreview(note.content, 150))}</div>
      <div class="note-meta">
        <span class="source-indicator">📄 ${getDomain(tab.url)}</span>
        <span class="note-stats">${getWordCount(note.content)} words</span>
      </div>
    </div>
    <div class="add-content-section">
      <textarea id="additionalContent" class="additional-content-input" placeholder="Add more notes to this page..." rows="3"></textarea>
      <div class="content-actions">
        <button id="addContentBtn" class="btn-primary">Add Content</button>
        <button id="openExistingNoteBtn" class="btn-secondary">Open Note</button>
      </div>
    </div>
    <div class="page-note-actions">
      <button id="captureSelectionToPageBtn" class="btn-tertiary">📋 Add Selection</button>
      <button id="createNewPageNoteBtn" class="btn-tertiary">➕ New Page Note</button>
    </div>
  `;
  
  // Insert before quick actions
  quickActions.parentNode.insertBefore(pageNoteSection, quickActions);
  
  // Add event listeners
  document.getElementById('addContentBtn').addEventListener('click', () => addContentToExistingNote(note, tab));
  document.getElementById('openExistingNoteBtn').addEventListener('click', () => openNoteInEditor(note.id));
  document.getElementById('captureSelectionToPageBtn').addEventListener('click', () => captureSelectionToPage(tab));
  document.getElementById('createNewPageNoteBtn').addEventListener('click', () => {
    // Remove existing note section and show new note creator
    pageNoteSection.remove();
    createPageBasedNote(tab);
  });
}

function showPageNoteCreator(noteData) {
  // Add a prominent "Save Page Note" button at the top
  const quickActions = document.querySelector('.quick-actions');
  
  // Create page note section
  const pageNoteSection = document.createElement('div');
  pageNoteSection.className = 'page-note-section';
  pageNoteSection.innerHTML = `
    <div class="page-note-header">
      <h3>📄 Create Note from Current Page</h3>
    </div>
    <div class="page-note-preview">
      <input type="text" id="pageNoteTitle" class="note-title-input" value="${noteData.title}" placeholder="Note title...">
      <div class="page-note-meta">
        <span class="source-indicator">📄 ${noteData.source.domain}</span>
      </div>
    </div>
    <div class="page-note-actions">
      <button id="savePageNoteBtn" class="btn-primary">Save Page Note</button>
      <button id="openEditorBtn" class="btn-secondary">Open in Editor</button>
    </div>
  `;
  
  // Insert before quick actions
  quickActions.parentNode.insertBefore(pageNoteSection, quickActions);
  
  // Add event listeners for page note actions
  document.getElementById('savePageNoteBtn').addEventListener('click', () => savePageNote(noteData));
  document.getElementById('openEditorBtn').addEventListener('click', () => openInEditor(noteData));
}

function setupEventListeners() {
  // Quick actions
  document.getElementById('quickNoteBtn').addEventListener('click', showQuickNote);
  document.getElementById('capturePageBtn').addEventListener('click', capturePage);
  document.getElementById('captureSelectionBtn').addEventListener('click', captureSelection);
  
  // Navigation
  document.getElementById('openFullAppBtn').addEventListener('click', openFullApp);
  document.getElementById('openSidepanelBtn').addEventListener('click', openSidepanel);
  
  // Settings
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('backBtn').addEventListener('click', hideSettings);
  document.getElementById('addPatternBtn').addEventListener('click', addUrlPattern);
  document.getElementById('resetPatternsBtn').addEventListener('click', resetUrlPatterns);
  document.getElementById('savePatternsBtn').addEventListener('click', saveUrlPatterns);
  
  // Settings controls
  document.getElementById('extensionEnabled').addEventListener('change', updateExtensionEnabled);
  document.getElementById('urlPatternMode').addEventListener('change', updatePatternMode);
}

async function loadRecentNotes() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
    
    if (response.success) {
      const notes = response.data.slice(0, 5); // Show last 5 notes
      renderNotes(notes);
    } else {
      showError('Failed to load notes');
    }
  } catch (error) {
    console.error('Error loading notes:', error);
    showError('Error loading notes');
  }
}

function renderNotes(notes) {
  const notesList = document.getElementById('notesList');
  
  if (notes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📝</div>
        <h4>No notes yet</h4>
        <p>Create your first note to get started</p>
      </div>
    `;
    return;
  }
  
  notesList.innerHTML = notes.map(note => `
    <a href="#" class="note-item" data-note-id="${note.id}">
      <div class="icon">📝</div>
      <div class="note-content">
        <div class="note-title">${escapeHtml(note.title)}</div>
        <div class="note-preview">${escapeHtml(getPlainTextPreview(note.content))}</div>
        <div class="note-meta">${formatDate(note.updatedAt)}</div>
      </div>
    </a>
  `).join('');
  
  // Add click listeners to note items
  document.querySelectorAll('.note-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const noteId = item.getAttribute('data-note-id');
      if (noteId) {
        await openNoteInEditor(noteId);
      }
    });
  });
}

function showError(message) {
  const notesList = document.getElementById('notesList');
  notesList.innerHTML = `
    <div class="empty-state">
      <div class="icon">⚠️</div>
      <h4>Error</h4>
      <p>${message}</p>
    </div>
  `;
}

async function showQuickNote() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        window.postMessage({ type: 'NOTEZ_SHOW_QUICK_NOTE' }, '*');
      }
    });
    
    window.close();
  } catch (error) {
    console.error('Error showing quick note:', error);
  }
}

async function capturePage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.runtime.sendMessage({ 
      type: 'SAVE_NOTE', 
      data: {
        title: `Captured: ${tab.title}`,
        content: `<h2>${escapeHtml(tab.title)}</h2>
<p><strong>URL:</strong> <a href="${escapeHtml(tab.url)}" target="_blank">${escapeHtml(tab.url)}</a></p>
<p><strong>Captured on:</strong> ${new Date().toLocaleString()}</p>
<hr>
<p><em>Add your notes about this page here...</em></p>`,
        tags: ['captured', 'page'],
        source: {
          url: tab.url,
          title: tab.title,
          type: 'web'
        }
      }
    });
    
    if (response.success) {
      showNotification('Page captured!');
      await loadRecentNotes();
    } else {
      showNotification('Error capturing page');
    }
  } catch (error) {
    console.error('Error capturing page:', error);
    showNotification('Error capturing page');
  }
}

async function captureSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const selection = window.getSelection();
        return selection.toString().trim();
      }
    });
    
    const selectedText = results[0]?.result;
    
    if (!selectedText) {
      showNotification('No text selected');
      return;
    }
    
    // Add selection to the current page note instead of creating a new note
    const response = await chrome.runtime.sendMessage({ 
      type: 'ADD_SELECTION_TO_PAGE_NOTE', 
      data: {
        selectedText: selectedText,
        url: tab.url,
        title: tab.title,
        domain: getDomain(tab.url)
      }
    });
    
    if (response.success) {
      showNotification('Selection added to page note!');
      await loadRecentNotes();
    } else {
      showNotification('Error adding selection to page note');
    }
  } catch (error) {
    console.error('Error capturing selection:', error);
    showNotification('Error capturing selection');
  }
}

async function createPageBasedNote(tab) {
  try {
    // Create a note with page information
    const noteData = {
      title: `Notes: ${tab.title}`,
      content: `<h1>${tab.title}</h1><p><strong>URL:</strong> <a href="${tab.url}">${tab.url}</a></p><p></p><p>Add your notes here...</p>`,
      tags: ['web-page', getDomain(tab.url)],
      source: {
        url: tab.url,
        title: tab.title,
        domain: getDomain(tab.url),
        capturedAt: new Date().toISOString()
      }
    };

    // Show the page-based note creation UI
    showPageNoteCreator(noteData);
    
  } catch (error) {
    console.error('Error creating page-based note:', error);
  }
}

async function addContentToExistingNote(note, tab) {
  try {
    const additionalContent = document.getElementById('additionalContent').value.trim();
    
    if (!additionalContent) {
      showNotification('Please enter some content to add');
      return;
    }
    
    // Add the new content to the existing note
    const timestamp = new Date().toLocaleString();
    const newContentHtml = `
<hr>
<h3>📝 Added Notes (${timestamp})</h3>
<p>${escapeHtml(additionalContent).replace(/\n/g, '</p><p>')}</p>
`;
    
    const updatedContent = note.content + newContentHtml;
    
    // Update the note via background script
    const response = await chrome.runtime.sendMessage({ 
      type: 'UPDATE_NOTE', 
      noteId: note.id,
      data: {
        ...note,
        content: updatedContent,
        updatedAt: new Date().toISOString()
      }
    });
    
    if (response.success) {
      showSuccessMessage('Content added to page note!');
      
      // Clear the textarea
      document.getElementById('additionalContent').value = '';
      
      // Refresh the recent notes list
      await loadRecentNotes();
      
      // Update the summary to reflect the new content
      const updatedNote = { ...note, content: updatedContent, updatedAt: new Date().toISOString() };
      updateNoteSummary(updatedNote);
    } else {
      showNotification('Error adding content to note');
    }
  } catch (error) {
    console.error('Error adding content to note:', error);
    showNotification('Error adding content to note');
  }
}

async function captureSelectionToPage(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const selection = window.getSelection();
        return selection.toString().trim();
      }
    });
    
    const selectedText = results[0]?.result;
    
    if (!selectedText) {
      showNotification('No text selected on the page');
      return;
    }
    
    // Send the selection to be added to the page note
    const response = await chrome.runtime.sendMessage({ 
      type: 'ADD_SELECTION_TO_PAGE_NOTE', 
      data: {
        url: tab.url,
        title: tab.title,
        domain: getDomain(tab.url),
        selectedText: selectedText
      }
    });
    
    if (response.success) {
      showSuccessMessage('Selection added to page note!');
      await loadRecentNotes();
    } else {
      showNotification('Error adding selection to page note');
    }
  } catch (error) {
    console.error('Error capturing selection to page:', error);
    showNotification('Error capturing selection');
  }
}

function updateNoteSummary(note) {
  const summaryElement = document.querySelector('.existing-note-summary');
  if (summaryElement) {
    summaryElement.innerHTML = `
      <div class="note-title">${escapeHtml(note.title)}</div>
      <div class="note-preview">${escapeHtml(getPlainTextPreview(note.content, 150))}</div>
      <div class="note-meta">
        <span class="source-indicator">📄 ${note.source?.domain || 'Unknown'}</span>
        <span class="note-stats">${getWordCount(note.content)} words</span>
      </div>
    `;
  }
  
  // Update the date in header
  const dateElement = document.querySelector('.note-date');
  if (dateElement) {
    dateElement.textContent = `Updated ${formatDate(note.updatedAt)}`;
  }
}

function getWordCount(content) {
  const div = document.createElement('div');
  div.innerHTML = content;
  const text = div.textContent || div.innerText || '';
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

async function openFullApp() {
  try {
    // Try to find the development server
    const devUrl = await findDevServerUrl();
    const extensionUrl = chrome.runtime.getURL('index.html');
    
    if (devUrl) {
      // Dev server is running, open there
      await chrome.tabs.create({ url: devUrl });
    } else {
      // Use extension version
      await chrome.tabs.create({ url: extensionUrl });
    }
    
    window.close();
  } catch (error) {
    console.error('Error opening full app:', error);
  }
}

async function openSidepanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch (error) {
    console.error('Error opening sidepanel:', error);
  }
}

// Helper functions
function truncateText(text, maxLength) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

async function savePageNote(noteData) {
  try {
    // Get the current title from the input
    const titleInput = document.getElementById('pageNoteTitle');
    noteData.title = titleInput.value || noteData.title;
    
    // Save the note
    const response = await chrome.runtime.sendMessage({ 
      type: 'SAVE_NOTE', 
      data: noteData 
    });
    
    if (response.success) {
      showSuccessMessage('Page note saved!');
      // Refresh the recent notes list
      await loadRecentNotes();
      
      // Remove the page note creator after successful save
      const pageNoteSection = document.querySelector('.page-note-section');
      if (pageNoteSection) {
        pageNoteSection.remove();
      }
    } else {
      showError('Failed to save note');
    }
  } catch (error) {
    console.error('Error saving page note:', error);
    showError('Error saving note');
  }
}

async function openInEditor(noteData) {
  try {
    // Get the current title from the input
    const titleInput = document.getElementById('pageNoteTitle');
    noteData.title = titleInput.value || noteData.title;
    
    // Save as draft first to the API/storage
    const response = await chrome.runtime.sendMessage({ 
      type: 'SAVE_NOTE', 
      data: noteData 
    });
    
    if (response.success) {
      const noteId = response.data.id;
      
      // Try to find the development server
      const devBaseUrl = await findDevServerUrl();
      const extensionUrl = chrome.runtime.getURL(`index.html#/notes/${noteId}/edit`);
      
      if (devBaseUrl) {
        // Dev server is running, open there
        const devUrl = `${devBaseUrl}/notes/${noteId}/edit`;
        await chrome.tabs.create({ url: devUrl });
      } else {
        // Use extension version
        await chrome.tabs.create({ url: extensionUrl });
      }
      
      window.close();
    } else {
      showError('Failed to create note');
    }
  } catch (error) {
    console.error('Error opening editor:', error);
    showError('Error opening editor');
  }
}

async function openNoteInEditor(noteId) {
  try {
    // Try to find the development server
    const devBaseUrl = await findDevServerUrl();
    const extensionUrl = chrome.runtime.getURL(`index.html#/notes/${noteId}/edit`);
    
    if (devBaseUrl) {
      // Dev server is running, open there
      const devUrl = `${devBaseUrl}/notes/${noteId}/edit`;
      console.log('Opening note in dev editor:', devUrl);
      await chrome.tabs.create({ url: devUrl });
    } else {
      // Use extension version
      await chrome.tabs.create({ url: extensionUrl });
    }
    
    window.close();
  } catch (error) {
    console.error('Error opening note in editor:', error);
    showError('Error opening note');
  }
}

function showSuccessMessage(message) {
  const popup = document.querySelector('.popup-container');
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  popup.insertBefore(successDiv, popup.firstChild);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

function showNotification(message) {
  const popup = document.querySelector('.popup-container');
  const notificationDiv = document.createElement('div');
  notificationDiv.className = 'success-message';
  notificationDiv.textContent = message;
  popup.insertBefore(notificationDiv, popup.firstChild);
  
  setTimeout(() => {
    notificationDiv.remove();
  }, 3000);
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPlainTextPreview(html, maxLength = 100) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return `${Math.floor(diffMs / (1000 * 60))}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ----------------- SETTINGS -----------------

function showSettings() {
  document.querySelector('.main-content').style.display = 'none';
  document.getElementById('settings').style.display = 'block';
  loadSettings();
}

function hideSettings() {
  document.querySelector('.main-content').style.display = 'block';
  document.getElementById('settings').style.display = 'none';
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || {
      extensionEnabled: true,
      urlPatternMode: 'blacklist',
      urlPatterns: ['localhost']
    };

    document.getElementById('extensionEnabled').checked = settings.extensionEnabled;
    document.querySelector(`input[name="urlPatternMode"][value="${settings.urlPatternMode}"]`).checked = true;
    
    renderUrlPatterns(settings.urlPatterns);

  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

function renderUrlPatterns(patterns) {
  const patternsList = document.getElementById('urlPatternsList');
  patternsList.innerHTML = '';
  if (patterns && patterns.length > 0) {
    patterns.forEach(pattern => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${escapeHtml(pattern)}</span>
        <button class="delete-pattern-btn" data-pattern="${escapeHtml(pattern)}">&times;</button>
      `;
      patternsList.appendChild(li);
    });
  }

  document.querySelectorAll('.delete-pattern-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('li').remove();
    });
  });
}

function addUrlPattern() {
  const input = document.getElementById('newPatternInput');
  const pattern = input.value.trim();
  if (pattern) {
    const patternsList = document.getElementById('urlPatternsList');
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(pattern)}</span>
      <button class="delete-pattern-btn" data-pattern="${escapeHtml(pattern)}">&times;</button>
    `;
    patternsList.appendChild(li);
    li.querySelector('.delete-pattern-btn').addEventListener('click', (e) => {
      e.target.closest('li').remove();
    });
    input.value = '';
  }
}

async function saveUrlPatterns() {
  try {
    const patterns = [...document.querySelectorAll('#urlPatternsList li span')].map(span => span.textContent);
    const mode = document.querySelector('input[name="urlPatternMode"]:checked').value;
    const enabled = document.getElementById('extensionEnabled').checked;

    const newSettings = {
      extensionEnabled: enabled,
      urlPatternMode: mode,
      urlPatterns: patterns
    };

    await chrome.storage.local.set({ settings: newSettings });
    
    // Notify background script to update its settings
    await chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: newSettings });

    showSuccessMessage('Settings saved!');
    hideSettings();
  } catch (error) {
    console.error("Error saving settings:", error);
    showError('Failed to save settings.');
  }
}

async function resetUrlPatterns() {
    const defaultPatterns = ['localhost'];
    renderUrlPatterns(defaultPatterns);
}

async function updateExtensionEnabled() {
  const enabled = document.getElementById('extensionEnabled').checked;
  const result = await chrome.storage.local.get('settings');
  const settings = result.settings || {};
  settings.extensionEnabled = enabled;
  await chrome.storage.local.set({ settings });
  await chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings });
}

async function updatePatternMode() {
  const mode = document.querySelector('input[name="urlPatternMode"]:checked').value;
  const result = await chrome.storage.local.get('settings');
  const settings = result.settings || {};
  settings.urlPatternMode = mode;
  await chrome.storage.local.set({ settings });
  await chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings });
}
