// ==================== GLOBAL CONSTANTS & STATE ==================== //
const AUTH_TOKEN_KEY = 'codeEditorAuthToken';
const API_BASE_URL = 'http://localhost:5000';
const DEFAULT_FILE_TYPES = ['html', 'js', 'css', 'ts', 'json', 'jsx', 'tsx'];

let state = {
  currentProjectId: null,
  currentFileId: null,
  projects: [],
  files: [],
  chatHistory: [],
  openTabs: [],
  dom: {} // Will hold all DOM references
};

// ==================== AUTHENTICATION ==================== //
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginForm')) {
    initializeAuthPage();
  } else if (document.getElementById('editor')) {
    initializeAppPage();
  }
});

function initializeAuthPage() {
  const container = document.getElementById('container');
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  // Redirect if already logged in
  if (getAuthToken()) {
    redirectToApp();
    return;
  }

  // Setup event listeners
  signUpButton.addEventListener('click', () => container.classList.add("right-panel-active"));
  signInButton.addEventListener('click', () => container.classList.remove("right-panel-active"));
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
}

async function handleLogin(e) {
  e.preventDefault();
  const errorElement = document.getElementById('loginError');
  errorElement.textContent = '';
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    errorElement.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Invalid credentials');
    if (!data.token) throw new Error('Authentication token missing');
    
    setAuthToken(data.token);
    window.location.href = '/';
  } catch (error) {
    document.getElementById('loginError').textContent = error.message;
    console.error('Login error:', error);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const errorElement = document.getElementById('signupError');
  errorElement.textContent = '';
  
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  // Client-side validation
  if (!name || !email || !password || !confirmPassword) {
    errorElement.textContent = 'Please fill in all fields';
    return;
  }

  if (password !== confirmPassword) {
    errorElement.textContent = 'Passwords do not match';
    return;
  }

  if (password.length < 6) {
    errorElement.textContent = 'Password must be at least 6 characters';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Signup failed');
    if (!data.token) throw new Error('Authentication token missing');
    console.log(data.token);
    setAuthToken(data.token);
    window.location.href = '/';
  } catch (error) {
    document.getElementById('signupError').textContent = error.message;
    console.error('Signup error:', error);
  }
}


function initializeAppPage() {
  // Verify authentication first
  if (!getAuthToken()) {
    window.location.href = '/login';
    return;
  }

  initializeDOMElements();
  setupEventListeners();
  loadInitialData();
  initializeCodeEditor();
}

function initializeDOMElements() {
  state.dom = {
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    sendMessageBtn: document.getElementById('send-message'),
    editor: document.getElementById('editor'),
    fileTree: document.getElementById('file-tree'),
    editorTabs: document.getElementById('editor-tabs'),
    saveFileBtn: document.getElementById('save-file'),
    aiEditBtn: document.getElementById('ai-edit'),
    newFileBtn: document.getElementById('new-file'),
    newFolderBtn: document.getElementById('new-folder'),
    deleteFileBtn: document.getElementById('delete-file'),
    projectSelector: document.getElementById('project-selector')
  };
}

function setupEventListeners() {
  const { dom } = state;
  
  // Chat functionality
  dom.sendMessageBtn.addEventListener('click', sendMessage);
  dom.chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // File operations
  dom.saveFileBtn.addEventListener('click', saveCurrentFile);
  dom.aiEditBtn.addEventListener('click', requestAIEdit);
  dom.newFileBtn.addEventListener('click', showNewFileDialog);
  dom.newFolderBtn.addEventListener('click', showNewFolderDialog);
  dom.deleteFileBtn.addEventListener('click', deleteCurrentFile);
  
  // Project selection
  if (dom.projectSelector) {
    dom.projectSelector.addEventListener('change', (e) => {
      const projectId = e.target.value;
      if (projectId && projectId !== state.currentProjectId) {
        loadProject(projectId);
      }
    });
  }
}

async function loadInitialData() {
  try {
    await fetchProjects();
    if (state.projects.length > 0) {
      await loadProject(state.projects[0]._id);
    }
    renderUI();
  } catch (error) {
    showError('Failed to initialize application');
    console.error('Initialization error:', error);
  }
}

// ==================== API FUNCTIONS ==================== //
async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return response;
}

async function fetchProjects() {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/projects`);
    state.projects = await response.json();
    renderProjectSelector();
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

async function loadProject(projectId) {
  try {
    state.currentProjectId = projectId;
    
    const [filesResponse, chatResponse] = await Promise.all([
      authenticatedFetch(`${API_BASE_URL}/files/${projectId}`),
      authenticatedFetch(`${API_BASE_URL}/chat/${projectId}`)
    ]);
    
    state.files = await filesResponse.json();
    state.chatHistory = await chatResponse.json();
    
    if (state.files.length > 0) {
      openFile(state.files[0]._id);
    }
  } catch (error) {
    console.error(`Error loading project ${projectId}:`, error);
    throw error;
  }
}

// ==================== FILE OPERATIONS ==================== //
async function openFile(fileId) {
  try {
    if (state.currentFileId === fileId) return;
    
    if (!state.openTabs.includes(fileId)) {
      state.openTabs.push(fileId);
    }
    
    state.currentFileId = fileId;
    
    let file = state.files.find(f => f._id === fileId);
    if (!file.content) {
      file = await fetchFileContent(fileId);
      const index = state.files.findIndex(f => f._id === fileId);
      if (index !== -1) state.files[index] = file;
    }
    
    state.dom.editor.value = file.content || '';
    renderFileTree();
    renderEditorTabs();
  } catch (error) {
    showError('Failed to open file');
    console.error(`Error opening file ${fileId}:`, error);
  }
}

async function fetchFileContent(fileId) {
  const response = await authenticatedFetch(`${API_BASE_URL}/files/${fileId}`);
  return await response.json();
}

async function saveCurrentFile() {
  if (!state.currentFileId) return;
  
  try {
    const content = state.dom.editor.value;
    await saveFile(state.currentFileId, content);
    
    const fileIndex = state.files.findIndex(f => f._id === state.currentFileId);
    if (fileIndex !== -1) state.files[fileIndex].content = content;
    
    addChatMessage('user', `Saved file ${state.files[fileIndex]?.fileName || ''}`, false);
    showSuccess('File saved successfully');
  } catch (error) {
    showError('Failed to save file');
    console.error('Error saving file:', error);
  }
}

async function saveFile(fileId, content) {
  const response = await authenticatedFetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  return await response.json();
}

async function createFile(projectId, fileData) {
  const response = await authenticatedFetch(`${API_BASE_URL}/files/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fileData)
  });
  return await response.json();
}

async function deleteFile(fileId) {
  await authenticatedFetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE'
  });
}

async function sendChatMessage(projectId, message, fileId, selectedCode) {
  const response = await authenticatedFetch(`${API_BASE_URL}/chat/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, fileId, selectedCode })
  });
  return await response.json();
}

async function requestAIEdit(fileId, selectedCode, instruction) {
  const response = await authenticatedFetch(`${API_BASE_URL}/files/${fileId}/ai-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedCode, instruction })
  });
  return await response.json();
}

// ==================== UI RENDERING ==================== //
function renderUI() {
  renderProjectSelector();
  renderFileTree();
  renderChatHistory();
  renderEditorTabs();
}

function renderProjectSelector() {
  const { projectSelector } = state.dom;
  if (!projectSelector) return;
  
  projectSelector.innerHTML = state.projects.map(project => 
    `<option value="${project._id}">${project.title}</option>`
  ).join('');
  
  if (state.currentProjectId) {
    projectSelector.value = state.currentProjectId;
  }
}

function renderFileTree() {
  const { fileTree } = state.dom;
  if (!fileTree) return;
  
  const filesByPath = state.files.reduce((acc, file) => {
    acc[file.filePath] = acc[file.filePath] || [];
    acc[file.filePath].push(file);
    return acc;
  }, {});

  fileTree.innerHTML = Object.entries(filesByPath).map(([path, files]) => `
    <div class="file-path">
      ${path !== '/' ? `<div class="path-name">${path.split('/').filter(Boolean).pop()}</div>` : ''}
      ${files.map(file => `
        <div class="file-item ${file.fileType} ${state.currentFileId === file._id ? 'active' : ''}" 
             data-id="${file._id}">
          ${file.fileName}
        </div>
      `).join('')}
    </div>
  `).join('');

  // Add click event listeners
  document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => openFile(item.dataset.id));
  });
}

function renderEditorTabs() {
  const { editorTabs } = state.dom;
  editorTabs.innerHTML = '';
  
  state.openTabs.forEach(fileId => {
    const file = state.files.find(f => f._id === fileId);
    if (!file) return;
    
    const tab = document.createElement('div');
    tab.className = `editor-tab ${state.currentFileId === fileId ? 'active' : ''}`;
    tab.textContent = file.fileName;
    tab.dataset.id = fileId;
    
    tab.addEventListener('click', () => openFile(fileId));
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(fileId);
    });
    
    tab.appendChild(closeBtn);
    editorTabs.appendChild(tab);
  });
}

function renderChatHistory() {
  const { chatMessages } = state.dom;
  chatMessages.innerHTML = '';
  
  state.chatHistory.forEach(message => {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}`;
    
    if (message.isCode) {
      const codeBlock = document.createElement('pre');
      codeBlock.textContent = message.content;
      messageElement.appendChild(codeBlock);
    } else {
      messageElement.textContent = message.content;
    }
    
    chatMessages.appendChild(messageElement);
  });
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== UTILITY FUNCTIONS ==================== //
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function redirectToApp() {
  window.location.href = '/';
}

function showError(message) {
  console.error('Error:', message);
  alert(message);
}

function showSuccess(message) {
  console.log('Success:', message);
  // In a real app, you would show a notification to the user
}

function initializeCodeEditor() {
  // In a production app, replace with Monaco or CodeMirror
  state.dom.editor.addEventListener('input', handleEditorChanges);
}

function handleEditorChanges() {
  // Handle editor content changes
}

function closeTab(fileId) {
  state.openTabs = state.openTabs.filter(id => id !== fileId);
  
  if (state.currentFileId === fileId) {
    state.currentFileId = state.openTabs.length > 0 ? state.openTabs[0] : null;
    const file = state.currentFileId ? state.files.find(f => f._id === state.currentFileId) : null;
    state.dom.editor.value = file?.content || '';
  }
  
  renderEditorTabs();
  renderFileTree();
}

function addChatMessage(role, content, isCode) {
  state.chatHistory.push({ role, content, isCode });
  renderChatHistory();
}

// ==================== DIALOG FUNCTIONS ==================== //
async function showNewFileDialog() {
  if (!state.currentProjectId) return;
  
  const fileName = prompt('Enter file name (include extension):');
  if (!fileName) return;
  
  const fileType = fileName.split('.').pop().toLowerCase();
  if (!DEFAULT_FILE_TYPES.includes(fileType)) {
    alert(`Unsupported file type: ${fileType}`);
    return;
  }
  
  try {
    const newFile = await createFile(state.currentProjectId, {
      fileName,
      filePath: '/',
      fileType,
      content: ''
    });
    
    state.files.push(newFile);
    renderFileTree();
    openFile(newFile._id);
  } catch (error) {
    showError('Failed to create file');
    console.error('Error creating file:', error);
  }
}

async function showNewFolderDialog() {
  if (!state.currentProjectId) return;
  
  const folderName = prompt('Enter folder name:');
  if (!folderName) return;
  
  // In a real implementation, create folder on backend
  const newFolder = {
    _id: `folder-${Date.now()}`,
    fileName: folderName,
    filePath: '/',
    fileType: 'folder',
    content: ''
  };
  
  state.files.push(newFolder);
  renderFileTree();
}

async function deleteCurrentFile() {
  if (!state.currentFileId) return;
  
  const file = state.files.find(f => f._id === state.currentFileId);
  if (!file) return;
  
  if (!confirm(`Are you sure you want to delete ${file.fileName}?`)) return;
  
  try {
    await deleteFile(state.currentFileId);
    state.files = state.files.filter(f => f._id !== state.currentFileId);
    closeTab(state.currentFileId);
    showSuccess(`${file.fileName} deleted successfully`);
  } catch (error) {
    showError('Failed to delete file');
    console.error('Error deleting file:', error);
  }
}

async function requestAIEdit() {
  if (!state.currentFileId) return;
  
  const selectedCode = state.dom.editor.value.substring(
    state.dom.editor.selectionStart,
    state.dom.editor.selectionEnd
  );
  
  if (!selectedCode) {
    addChatMessage('ai', 'Please select some code to edit first.', false);
    return;
  }
  
  const instruction = prompt('What changes would you like to make?');
  if (!instruction) return;
  
  addChatMessage('user', `Edit request: ${instruction}\n\nSelected code:\n${selectedCode}`, true);
  
  try {
    const result = await requestAIEdit(state.currentFileId, selectedCode, instruction);
    addChatMessage('ai', result.content, result.isCode);
    
    if (result.modifiedCode) {
      const fullContent = state.dom.editor.value;
      const newContent = fullContent.substring(0, state.dom.editor.selectionStart) + 
                         result.modifiedCode + 
                         fullContent.substring(state.dom.editor.selectionEnd);
      state.dom.editor.value = newContent;
    }
  } catch (error) {
    console.error('Error during AI edit:', error);
    addChatMessage('ai', 'Sorry, there was an error processing your edit request.', false);
  }
}

async function sendMessage() {
  const { chatInput, editor } = state.dom;
  const message = chatInput.value.trim();
  if (!message || !state.currentProjectId) return;
  
  addChatMessage('user', message, false);
  chatInput.value = '';
  
  try {
    const selectedCode = editor.value.substring(
      editor.selectionStart,
      editor.selectionEnd
    );
    
    const result = await sendChatMessage(
      state.currentProjectId,
      message,
      state.currentFileId,
      selectedCode
    );
    
    addChatMessage('ai', result.content, result.isCode);
  } catch (error) {
    console.error('Error sending message:', error);
    addChatMessage('ai', 'Sorry, there was an error processing your message.', false);
  }
}