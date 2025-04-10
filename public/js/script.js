// DOM Elements
const fileTree = document.getElementById('file-tree');
const editorTabs = document.getElementById('editor-tabs');
const codeEditor = document.getElementById('editor');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message');
const newFileBtn = document.getElementById('new-file');
const saveFileBtn = document.getElementById('save-file');
const aiEditBtn = document.getElementById('ai-edit');
const newFolderBtn = document.getElementById('new-folder');
const deleteFileBtn = document.getElementById('delete-file');
const logoutBtn = document.getElementById('logout');
const newProjectBtn = document.querySelector('.new-project-item');

// State variables
let currentUser = JSON.parse(localStorage.getItem('user')) || null;;
let currentProject = null;
let currentFile = null;
let projects = [];
let openFiles = [];
let selectedFile = null;
let selectedCode = '';

// Authentication functions
const checkAuth = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  console.log(token);
  console.log(user);
  if (!token || !user || !user.
    _id) {
    window.location.href = '/login';
    return false;
  }
  currentUser = user;
  return true;
};

const handleLogout = async () => {
    try {
      // Call backend logout to clear token
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

  
      // Clear frontend storage
      localStorage.removeItem('token');
      localStorage.removeItem('tokenExpiry');
      localStorage.removeItem('user');
       // Redirect to login page
    window.location.href = '/login';
} catch (error) {
  console.error('Logout error:', error);
  // Clear local storage even if backend fails
  localStorage.clear();
  window.location.href = '/login';
}
};



const initAuth = async () => {
    if (window.location.pathname === '/login') {
      initAuthPage();
      return;
    }
  
    console.log('Initializing auth...');
    console.log('Current user from storage:', localStorage.getItem('user'));
    console.log('Token exists:', !!localStorage.getItem('token'));
  
    if (!checkAuth()) {
      console.log('Auth check failed');
      return;
    }
  
    console.log('Auth successful, currentUser:', currentUser);
    await fetchProjects();
    initEventListeners();
  };
  
 

  
const initAuthPage = () => {
  const container = document.getElementById('container');
  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  // Animation for switching between login and signup
  if (signUpButton && signInButton) {
    signUpButton.addEventListener('click', () => {
      container.classList.add('right-panel-active');
    });
    
    signInButton.addEventListener('click', () => {
      container.classList.remove('right-panel-active');
    });
  }
  
  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorMsg = document.getElementById('loginError');
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log(data);
        if (!response.ok) {
          errorMsg.textContent = data.error || 'Login failed';
          return;
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ _id: data.user.id,
            name: data.user.name,
            email: data.user.email}));
            
            currentUser = data.user;
        window.location.href = '/';

      } catch (error) {
        errorMsg.textContent = 'Connection error. Please try again.';
      }
    });
  }
  
  // Signup form submission
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const confirmPassword = document.getElementById('signupConfirmPassword').value;
      const errorMsg = document.getElementById('signupError');
      
      if (password !== confirmPassword) {
        errorMsg.textContent = 'Passwords do not match';
        return;
      }
      
      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        console.log(data);
        if (!response.ok) {
          errorMsg.textContent = data.error || 'Signup failed';
          return;
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
            _id: data.user.id,
            name: data.user.name,
            email: data.user.email
          }));
          
          // Update current user
          currentUser = data.user;
          window.location.href = '/';
      } catch (error) {
        errorMsg.textContent = 'Connection error. Please try again.';
      }
    });
  }
};
// backend/public/js/script.js

    
// Project and file management
const fetchProjects = async () => {
  if (!checkAuth()) return;
  
  try {
    const response = await fetch('/api/projects', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    
    projects = await response.json();
    renderFileTree();
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
};

const renderFileTree = () => {
  if (!fileTree) return;
  
  fileTree.innerHTML = '';
  
  projects.forEach(project => {
    const projectElement = document.createElement('div');
    projectElement.classList.add('project-item');
    projectElement.innerHTML = `
      <div class="project-name" data-id="${project._id}">
        <span class="folder-icon">📁</span> ${project.title}
      </div>
      <div class="project-files" id="files-${project._id}">
      </div>
    `;
    
    fileTree.appendChild(projectElement);
    
    const filesContainer = projectElement.querySelector(`#files-${project._id}`);
    
    // Event listener for project click (expand/collapse)
    projectElement.querySelector('.project-name').addEventListener('click', () => {
      currentProject = project;
      projectElement.classList.toggle('expanded');
      
      // Load project files if expanded
      if (projectElement.classList.contains('expanded')) {
        loadProjectFiles(project._id, filesContainer);
      }
    });
  });
  
  // Add a "Create New Project" option
  const newProjectElement = document.createElement('div');
  newProjectElement.classList.add('new-project-item');
  newProjectElement.innerHTML = '<span>+ Create New Project</span>';
  newProjectElement.addEventListener('click', createNewProject);
  fileTree.appendChild(newProjectElement);
};

const loadProjectFiles = async (projectId, container) => {
  try {
    // Only fetch if we don't already have the files
    const project = projects.find(p => p._id === projectId);
    
    if (!project.files || project.files.length === 0) {
      container.innerHTML = '<div class="empty-files">No files yet</div>';
      return;
    }
    
    container.innerHTML = '';
    
    project.files.forEach(file => {
      const fileElement = document.createElement('div');
      fileElement.classList.add('file-item');
      
      // Set icon based on file type
      let fileIcon = '📄';
      if (file.fileType === 'html') fileIcon = '🌐';
      else if (file.fileType === 'js') fileIcon = '📜';
      else if (file.fileType === 'css') fileIcon = '🎨';
      
      fileElement.innerHTML = `<span class="file-icon">${fileIcon}</span> ${file.fileName}`;
      fileElement.setAttribute('data-id', file._id);
      fileElement.setAttribute('data-path', file.filePath);
      
      fileElement.addEventListener('click', () => openFile(file._id));
      
      container.appendChild(fileElement);
    });
  } catch (error) {
    console.error('Error loading project files:', error);
    container.innerHTML = '<div class="error-message">Error loading files</div>';
  }
};

const openFile = async (fileId) => {
  try {
    const response = await fetch(`/api/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }
    
    const file = await response.json();
    currentFile = file;
    
    // Check if the file is already open
    const existingTab = openFiles.find(f => f._id === file._id);
    if (!existingTab) {
      openFiles.push(file);
    }
    
    renderTabs();
    renderEditor(file);
    
    // Highlight the selected file in the file tree
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.remove('selected');
      if (item.getAttribute('data-id') === file._id) {
        item.classList.add('selected');
      }
    });
    
    // Load chat history for this project
    loadChatHistory(file.projectId);
  } catch (error) {
    console.error('Error opening file:', error);
  }
};

const renderTabs = () => {
  if (!editorTabs) return;
  
  editorTabs.innerHTML = '';
  
  openFiles.forEach(file => {
    const tabElement = document.createElement('div');
    tabElement.classList.add('editor-tab');
    if (currentFile && file._id === currentFile._id) {
      tabElement.classList.add('active');
    }
    
    tabElement.innerHTML = `
      <span>${file.fileName}</span>
      <span class="close-tab" data-id="${file._id}">×</span>
    `;
    
    tabElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('close-tab')) {
        openFile(file._id);
      }
    });
    
    editorTabs.appendChild(tabElement);
  });
  
  // Add event listeners for close tab buttons
  document.querySelectorAll('.close-tab').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fileId = closeBtn.getAttribute('data-id');
      closeTab(fileId);
    });
  });
};

const closeTab = (fileId) => {
  openFiles = openFiles.filter(file => file._id !== fileId);
  
  if (currentFile && currentFile._id === fileId) {
    currentFile = openFiles.length > 0 ? openFiles[openFiles.length - 1] : null;
    if (currentFile) {
      renderEditor(currentFile);
    } else {
      codeEditor.value = '';
    }
  }
  
  renderTabs();
};

const renderEditor = (file) => {
  if (!codeEditor) return;
  
  codeEditor.value = file.content;
  
  // Apply syntax highlighting based on file type
  // Note: For a more robust solution, consider using a library like CodeMirror or Monaco Editor
};

// AI Chat functions
const loadChatHistory = async (projectId) => {
  if (!chatMessages) return;
  
  try {
    const response = await fetch(`/api/chat/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // No chat history yet, that's okay
        chatMessages.innerHTML = '<div class="chat-welcome">Ask the AI for help with your code!</div>';
        return;
      }
      throw new Error('Failed to fetch chat history');
    }
    
    const chatHistory = await response.json();
    
    if (!chatHistory || !chatHistory.messages || chatHistory.messages.length === 0) {
      chatMessages.innerHTML = '<div class="chat-welcome">Ask the AI for help with your code!</div>';
      return;
    }
    
    renderChatMessages(chatHistory.messages);
  } catch (error) {
    console.error('Error loading chat history:', error);
    chatMessages.innerHTML = '<div class="error-message">Error loading chat history</div>';
  }
};

const renderChatMessages = (messages) => {
  if (!chatMessages) return;
  
  chatMessages.innerHTML = '';
  
  messages.forEach(message => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', message.role);
    
    let content = message.content;
    
    // Format code blocks
    if (message.isCode || content.includes('```')) {
      content = formatCodeBlocks(content);
    }
    
    messageElement.innerHTML = `
      <div class="message-avatar">${message.role === 'user' ? '👤' : '🤖'}</div>
      <div class="message-content">${content}</div>
    `;
    
    chatMessages.appendChild(messageElement);
  });
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const formatCodeBlocks = (content) => {
  // Simple code block formatting
  // For a more robust solution, consider using a library like highlight.js
  return content.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
    return `<pre class="code-block ${language}"><code>${escapeHtml(code)}</code></pre>`;
  });
};

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sendMessage = async () => {
  if (!currentProject || !chatInput.value.trim()) return;
  
  const message = chatInput.value.trim();
  chatInput.value = '';
  
  // Get selected code if any
  const selection = codeEditor.value.substring(
    codeEditor.selectionStart, 
    codeEditor.selectionEnd
  );
  
  try {
    // Add user message to UI immediately
    const userMessageElement = document.createElement('div');
    userMessageElement.classList.add('chat-message', 'user');
    userMessageElement.innerHTML = `
      <div class="message-avatar">👤</div>
      <div class="message-content">${message}</div>
    `;
    chatMessages.appendChild(userMessageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Show loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('chat-message', 'ai', 'loading');
    loadingElement.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">Thinking...</div>
    `;
    chatMessages.appendChild(loadingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    const response = await fetch(`/api/chat/${currentProject._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        message,
        fileId: currentFile ? currentFile._id : null,
        selectedCode: selection || null
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    const chatHistory = await response.json();
    
    // Remove loading indicator
    chatMessages.removeChild(loadingElement);
    
    // Render the updated chat
    renderChatMessages(chatHistory.messages);
  } catch (error) {
    console.error('Error sending message:', error);
    // Remove loading indicator if it exists
    const loadingEl = document.querySelector('.loading');
    if (loadingEl) chatMessages.removeChild(loadingEl);
    
    // Show error message
    const errorElement = document.createElement('div');
    errorElement.classList.add('chat-message', 'error');
    errorElement.innerHTML = `
      <div class="message-content">Error: Could not send message</div>
    `;
    chatMessages.appendChild(errorElement);
  }
};

// File operations
const createNewFile = async () => {
  if (!currentProject) {
    alert('Please select a project first');
    return;
  }
  
  const fileName = prompt('Enter file name (with extension):');
  if (!fileName) return;
  
  // Validate file name
  const fileExt = fileName.split('.').pop().toLowerCase();
  const validExtensions = ['html', 'js', 'css', 'ts', 'json', 'jsx', 'tsx'];
  
  if (!validExtensions.includes(fileExt)) {
    alert(`Invalid file extension. Please use: ${validExtensions.join(', ')}`);
    return;
  }
  
  try {
    const response = await fetch(`/api/files/${currentProject._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        fileName,
        filePath: fileName,
        content: '',
        fileType: fileExt
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create file');
    }
    
    const newFile = await response.json();
    
    // Update the project's files
    const projectIndex = projects.findIndex(p => p._id === currentProject._id);
    if (projectIndex !== -1) {
      if (!projects[projectIndex].files) {
        projects[projectIndex].files = [];
      }
      projects[projectIndex].files.push(newFile);
    }
    
    // Refresh file tree
    const filesContainer = document.getElementById(`files-${currentProject._id}`);
    if (filesContainer) {
      loadProjectFiles(currentProject._id, filesContainer);
    }
    
    // Open the new file
    openFile(newFile._id);
  } catch (error) {
    console.error('Error creating file:', error);
    alert('Failed to create file');
  }
};

const saveFile = async () => {
  if (!currentFile) return;
  
  try {
    const response = await fetch(`/api/files/${currentFile._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        content: codeEditor.value
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save file');
    }
    
    // Update the file in our local state
    const updatedFile = await response.json();
    
    openFiles = openFiles.map(file => 
      file._id === updatedFile._id ? updatedFile : file
    );
    
    if (currentFile._id === updatedFile._id) {
      currentFile = updatedFile;
    }
    
    // Show success message
    const saveIndicator = document.createElement('div');
    saveIndicator.classList.add('save-indicator');
    saveIndicator.textContent = 'Saved!';
    document.body.appendChild(saveIndicator);
    
    setTimeout(() => {
      document.body.removeChild(saveIndicator);
    }, 2000);
  } catch (error) {
    console.error('Error saving file:', error);
    alert('Failed to save file');
  }
};

const aiEdit = async () => {
    if (!currentFile) {
      alert('Please open a file first');
      return;
    }
  
    const codeEditor = document.getElementById('codeEditor');
    const selection = codeEditor.value.substring(
      codeEditor.selectionStart, 
      codeEditor.selectionEnd
    );
  
    if (!selection.trim()) {
      alert('Please select code to edit');
      return;
    }
  
    const instruction = prompt('What would you like the AI to do with this code?');
    if (!instruction) {
      alert('Please provide an instruction for the AI');
      return;
    }
  
    try {
      const response = await fetch(`/api/files/${currentFile._id}/ai/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          selectedCode: selection,
          instruction
        })
      });
  
      if (!response.ok) {
        const errorDetails = await response.text();
        console.error('API Error:', errorDetails);
        throw new Error('AI edit failed');
      }
  
      const result = await response.json();
  
      // Log the result to ensure you have the correct edited code
      console.log('AI Edit Result:', result);
  
      // Replace the selected text with the AI's edit
      const beforeSelection = codeEditor.value.substring(0, codeEditor.selectionStart);
      const afterSelection = codeEditor.value.substring(codeEditor.selectionEnd);
      codeEditor.value = beforeSelection + result.editedCode + afterSelection;
  
      saveFile(); // Save the file after editing
    } catch (error) {
      console.error('Error during AI edit:', error);
      alert('AI edit failed');
    }
  };
  

const createNewProject = async () => {
    try {
      // Check authentication first
      if (!checkAuth()) return;
      
      const title = prompt('Enter project name:');
      if (!title) return;
      
      const frameworks = ['React', 'Vue', 'Angular', 'Node', 'Static'];
      const framework = prompt(`Enter framework (${frameworks.join(', ')}):`, 'Static');
      
      if (!framework || !frameworks.includes(framework)) {
        alert(`Invalid framework. Please use: ${frameworks.join(', ')}`);
        return;
      }
  
    //   // Get current user
    //   const user = JSON.parse(localStorage.getItem('user'));
    //   console.log(user)
    //   if (!user || !user._id) {
    //     throw new Error('User session is invalid. Please log in again.');
    //   }
  
      const projectData = {
        title: title,
        description: `A ${framework} project`,
        framework: framework,
        files: [],
        userId: currentUser._id
      };
      
      // Show loading state
      const newProjectBtn = document.querySelector('.new-project-item');
    if (newProjectBtn) {
      const originalText = newProjectBtn.textContent;
      newProjectBtn.textContent = 'Creating...';
      newProjectBtn.disabled = true;

      
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
      });
      

      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }
      const responseData = await response.json();
      // Add to projects list and update UI
      projects.push(responseData);
      renderFileTree();
      
      // Show success message
      showNotification('Project created successfully!', 'success');
      
      // Expand the new project
      setTimeout(() => {
        const newProjectEl = document.querySelector(`.project-name[data-id="${responseData._id}"]`);
        if (newProjectEl) newProjectEl.click();
      }, 100);
      
    } }
    catch (error) {
        console.error('Project creation failed:', error);
        showNotification(error.message, 'error');
        
        // Reset button if it exists
        const newProjectBtn = document.querySelector('.new-project-item');
        if (newProjectBtn) {
          newProjectBtn.textContent = '+ Create New Project';
          newProjectBtn.disabled = false;
        }
        
        // If it's an auth error, force logout
        if (error.message.includes('auth') || error.message.includes('session')) { handleLogout();
        }
      }
    };
  
  // Helper function for notifications
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

const initEventListeners = () => {
  // Chat events
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', sendMessage);
  }
  
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // File operations
  if (newFileBtn) {
    newFileBtn.addEventListener('click', createNewFile);
  }
  
  if (saveFileBtn) {
    saveFileBtn.addEventListener('click', saveFile);
  }
  
  if (aiEditBtn) {
    aiEditBtn.addEventListener('click', aiEdit);
  }
  
  // Editor events
  if (codeEditor) {
    codeEditor.addEventListener('input', () => {
      // Mark the file as modified
      if (currentFile) {
        const tab = document.querySelector(`.editor-tab[data-id="${currentFile._id}"]`);
        if (tab && !tab.classList.contains('modified')) {
          tab.classList.add('modified');
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
          } else {
            console.error("Logout button not found!");
            // You might want to create the button dynamically if it's essential
          }
      }
    });
    
    // Track selected text
    codeEditor.addEventListener('mouseup', () => {
      selectedCode = codeEditor.value.substring(
        codeEditor.selectionStart, 
        codeEditor.selectionEnd
      );
    });
    
    codeEditor.addEventListener('keyup', () => {
      selectedCode = codeEditor.value.substring(
        codeEditor.selectionStart, 
        codeEditor.selectionEnd
      );
    });
  }
  
  // File deletion
  if (deleteFileBtn) {
    deleteFileBtn.addEventListener('click', async () => {
      if (!currentFile) {
        alert('Please select a file first');
        return;
      }
      
      if (!confirm(`Are you sure you want to delete ${currentFile.fileName}?`)) {
        return;
      }
      
      // Implementation for file deletion would go here
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
    // First check if we're on a page that needs auth
    if (!window.location.pathname.includes('/login')) {
      initAuth();
    } else {
      initAuthPage();
    }
  });