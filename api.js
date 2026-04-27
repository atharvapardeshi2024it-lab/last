// api.js — Drop this in the same folder as your HTML
// Replace your existing <script> functions with these

const API = 'https://collabspacesi156-production.up.railway.app/api';

// ── Token helpers ──────────────────────────────────────────
const getToken  = () => localStorage.getItem('cs_token');
const setToken  = (t) => localStorage.setItem('cs_token', t);
const clearToken = () => localStorage.removeItem('cs_token');

// ── Base fetch wrapper ─────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── AUTH ───────────────────────────────────────────────────
async function doLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    window._currentUser = data.user;
    if (data.user.avatar_url) {
      document.querySelectorAll('.avatar').forEach(el => {
        el.style.backgroundImage = 'url(https://collabspacesi156-production.up.railway.app' + data.user.avatar_url + ')';
        el.style.backgroundSize = 'cover';
        el.textContent = '';
      });
    }
    document.getElementById('main-nav').style.display = 'flex';
    toast('✅', data.message);
    showPage('dashboard');
    loadDashboard();
    initChat();
  } catch (err) {
    toast('❌', err.message);
  }
}
async function doRegister() {
  const payload = {
    first_name: document.querySelector('#auth-register input[placeholder="John"]').value,
    last_name:  document.querySelector('#auth-register input[placeholder="Doe"]').value,
    email:      document.querySelector('#auth-register input[type="email"]').value,
    department: document.querySelector('#auth-register select').value,
    year:       document.querySelectorAll('#auth-register select')[1].value,
    password:   document.querySelector('#auth-register input[type="password"]').value,
  };
  try {
    await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    toast('🎉', 'Registered! Please sign in.');
    switchAuthTab('login', document.querySelector('.auth-tab'));
  } catch (err) {
    toast('❌', err.message);
  }
}

function logout() {
  clearToken();
  window._currentUser = null;
  document.getElementById('main-nav').style.display = 'none';
  toast('👋', 'Logged out.');
  showPage('landing');
}

// ── PROJECTS ───────────────────────────────────────────────
async function loadProjects() {
  try {
    const data = await apiFetch('/projects');
    renderProjects(data.data);
  } catch (err) { toast('❌', 'Could not load projects'); }
}

async function createNewProject() {
  const payload = {
    title:       document.querySelector('#create-project-modal input[placeholder*="AI"]').value,
    description: document.querySelector('#create-project-modal textarea').value,
    category:    document.querySelector('#create-project-modal select').value,
    tags:        document.querySelector('#create-project-modal input[placeholder*="Python"]').value,
  };
  try {
    await apiFetch('/projects', { method: 'POST', body: JSON.stringify(payload) });
    closeModal('create-project-modal');
    toast('🎉', 'Project created!');
    loadProjects();
  } catch (err) { toast('❌', err.message); }
}

async function joinProject(projectId) {
  try {
    const data = await apiFetch(`/projects/${projectId}/join`, { method: 'POST' });
    toast('✅', data.message);
    loadProjects();
  } catch (err) { toast('❌', err.message); }
}

// ── STUDY GROUPS ───────────────────────────────────────────
async function loadStudyGroups() {
  try {
    const data = await apiFetch('/study-groups');
    renderStudyGroups(data.data);
  } catch (err) { toast('❌', 'Could not load study groups'); }
}

async function createNewGroup() {
  const payload = {
    name:         document.querySelector('#create-group-modal input[placeholder*="Database"]').value,
    description:  document.querySelector('#create-group-modal textarea').value,
    max_members:  document.querySelector('#create-group-modal input[type="number"]').value,
    meeting_freq: document.querySelector('#create-group-modal select').value,
  };
  try {
    await apiFetch('/study-groups', { method: 'POST', body: JSON.stringify(payload) });
    closeModal('create-group-modal');
    toast('📚', 'Study group created!');
    loadStudyGroups();
  } catch (err) { toast('❌', err.message); }
}

async function joinStudyGroup(groupId) {
  try {
    const data = await apiFetch(`/study-groups/${groupId}/join`, { method: 'POST' });
    toast('📚', data.message);
  } catch (err) { toast('❌', err.message); }
}

// ── RESOURCES ──────────────────────────────────────────────
async function loadResources() {
  try {
    const data = await apiFetch('/resources');
    renderResources(data.data);
  } catch (err) { toast('❌', 'Could not load resources'); }
}

async function uploadResource() {
  const modal      = document.getElementById('upload-resource-modal');
  const inputs     = modal.querySelectorAll('input:not([type="file"])');
  const select     = modal.querySelector('select');
  const fileInput  = document.getElementById('file-input');

  const title       = inputs[0].value.trim();
  const type        = select.value;
  const course_code = inputs[1] ? inputs[1].value.trim() : '';
  const file        = fileInput ? fileInput.files[0] : null;

  if (!title) { toast('⚠️', 'Please enter a title'); return; }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('type', type);
  formData.append('course_code', course_code);
  if (file) formData.append('file', file);

  try {
    const token = getToken();
    const res   = await fetch('https://collabspacesi156-production.up.railway.app/api/resources', {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    closeModal('upload-resource-modal');
    toast('📤', 'Resource uploaded!');
    loadResources();
  } catch (err) {
    toast('❌', err.message);
  }
}
// ── DASHBOARD ──────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [user, projects, groups] = await Promise.all([
      apiFetch('/auth/me'),
      apiFetch('/projects?limit=3'),
      apiFetch('/study-groups?limit=2'),
    ]);
    const u = user.user;
    // Update greeting
    document.querySelector('#dashboard .section-title').textContent = `Welcome back, ${u.first_name}! 👋`;
    // Update stats
    const statVals = document.querySelectorAll('#dashboard .stat-value');
    if (statVals[3]) statVals[3].textContent = u.points;
  } catch (err) { /* user not logged in, skip */ }
}

// ── RENDER HELPERS ─────────────────────────────────────────
function renderProjects(projects) {
  const container = document.querySelector('#projects-page .grid-3');
  if (!container || !projects.length) return;
  container.innerHTML = projects.map(p => `
   <div class="project-card" onclick="openProjectDetails(${p.id})" style="cursor:pointer">
      <div class="project-header">
        <div class="project-icon">${p.icon}</div>
        <span class="badge badge-blue">${p.category}</span>
      </div>
      <div class="project-body">
        <div class="project-title">${p.title}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">${p.description}</div>
        <div class="project-meta">
          <span>👥 ${p.member_count} members</span>
          <span class="badge badge-${statusColor(p.status)}">${p.status}</span>
        </div>
        <div class="project-tags">${tagsHtml(p.tags)}</div>
      </div>
      <div class="project-footer">
        <span style="font-size:0.75rem;color:var(--text-muted)">by ${p.first_name} ${p.last_name}</span>
        <button class="btn btn-primary btn-sm" onclick="joinProject(${p.id})">Join</button>
      </div>
    </div>`
  ).join('');
}

function renderStudyGroups(groups) {
  const container = document.querySelector('#study-groups-page .grid-3');
  if (!container || !groups.length) return;
  container.innerHTML = groups.map(g => `
    <div class="group-card">
      <div class="group-header">
        <div class="group-avatar">${g.icon}</div>
        <div>
          <div style="font-weight:700">${g.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${g.course_code} · ${g.member_count} members</div>
        </div>
      </div>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:1rem">${tagsHtml(g.tags)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:0.8rem;color:var(--text-muted)">${g.meeting_freq}</div>
        <button class="btn btn-primary btn-sm" onclick="joinStudyGroup(${g.id})">Join</button>
<button class="btn btn-secondary btn-sm" onclick="joinChatRoom('group-${g.id}')">💬 Chat</button>
      </div>
    </div>`
  ).join('');
}

function renderResources(resources) {
  const container = document.querySelector('#resources-page .grid-3');
  if (!container || !resources.length) return;
  container.innerHTML = resources.map(r => `
    <div class="resource-card">
      <div class="resource-icon">${typeIcon(r.type)}</div>
      <div style="flex:1">
        <div style="font-weight:600">${r.title}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">by ${r.first_name} · ${r.downloads} downloads</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="downloadResource(${r.id})">↓</button>
    </div>`
  ).join('');
}

async function createNewProject() {
  const modal    = document.getElementById('create-project-modal');
  const inputs   = modal.querySelectorAll('input');
  const textarea = modal.querySelector('textarea');
  const select   = modal.querySelector('select');

  const title       = inputs[0].value.trim();
  const description = textarea.value.trim();
  const category    = select.value;
  const tags        = inputs[1] ? inputs[1].value.trim() : '';

  if (!title)       { toast('⚠️', 'Please enter a project title'); return; }
  if (!description) { toast('⚠️', 'Please enter a description');   return; }

  try {
    await apiFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description, category, tags }),
    });
    closeModal('create-project-modal');
    toast('🎉', 'Project created successfully!');
    loadProjects();
  } catch (err) {
    toast('❌', err.message);
  }
}
// ── Utility ────────────────────────────────────────────────
function tagsHtml(tags) {
  if (!tags) return '';
  return tags.split(',').map(t => `<span class="badge badge-blue">${t.trim()}</span>`).join('');
}

function statusColor(s) {
  return { 'Planning': 'blue', 'In Progress': 'green', 'Review': 'purple', 'Completed': 'orange' }[s] || 'blue';
}

function typeIcon(t) {
  return { 'Notes': '📘', 'Video': '📺', 'Previous Paper': '📄', 'Assignment': '📝' }[t] || '📄';
}
async function downloadResource(id) {
  try {
    const data = await apiFetch(`/resources/${id}/download`, { method: 'POST' });
    if (data.url) window.open(`https://collabspacesi156-production.up.railway.app${data.url}`, '_blank');
  } catch (err) {
    toast('❌', err.message);
  }
}
// ── Hook into page navigation ──────────────────────────────


// ── SOCKET.IO CHAT ─────────────────────────────────────────
let socket = null;
let currentRoom = null;
let currentUsername = null;

function initChat() {
  const user = window._currentUser;
  if (!user) return;
  currentUsername = `${user.first_name} ${user.last_name}`;
  socket = io('https://collabspacesi156-production.up.railway.app');

  socket.on('receive_message', (data) => {
    const type = data.username === currentUsername ? 'user' : 'bot';
    
    // Update StudyBot window
    const studyBot = document.getElementById('chat-messages');
    if (studyBot) {
      const el = document.createElement('div');
      el.className = `chat-msg ${type}`;
      el.style.maxWidth = '80%';
      el.style.padding = '0.5rem 0.8rem';
      el.style.borderRadius = '12px';
      el.style.fontSize = '0.82rem';
      el.style.background = type === 'bot' ? 'var(--surface2)' : 'var(--grad)';
      el.style.color = type === 'bot' ? 'var(--text)' : '#fff';
      el.style.alignSelf = type === 'bot' ? 'flex-start' : 'flex-end';
      el.textContent = data.username === currentUsername ? data.message : `${data.username}: ${data.message}`;
      studyBot.appendChild(el);
      studyBot.scrollTop = studyBot.scrollHeight;
    }

    // Update chat panel window
    const panel = document.getElementById('chat-panel-messages');
    if (panel) {
      const el2 = document.createElement('div');
      el2.className = `chat-msg ${type}`;
      el2.style.maxWidth = '80%';
      el2.style.padding = '0.5rem 0.8rem';
      el2.style.borderRadius = '12px';
      el2.style.fontSize = '0.82rem';
      el2.style.background = type === 'bot' ? 'var(--surface2)' : 'var(--grad)';
      el2.style.color = type === 'bot' ? 'var(--text)' : '#fff';
      el2.style.alignSelf = type === 'bot' ? 'flex-start' : 'flex-end';
      el2.textContent = data.username === currentUsername ? data.message : `${data.username}: ${data.message}`;
      panel.appendChild(el2);
      panel.scrollTop = panel.scrollHeight;
    }
  });
  document.getElementById('chat-room-name').textContent = room;
  document.getElementById('chat-messages').innerHTML = '';
  document.getElementById('chat-panel').style.display = 'flex';
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  addChatMsg(msg, 'user');
  input.value = '';

  if (!socket) initChat();
  if (!currentRoom) {
    currentRoom = 'studybot-general';
    socket.emit('join_room', { room: currentRoom, username: currentUsername || 'Student' });
  }
  socket.emit('send_message', { 
    room: currentRoom, 
    username: currentUsername || 'Student', 
    message: msg 
  });
}
function appendChatMessage(username, message, type) {
  const msgs = document.getElementById("chat-panel-messages");;
  if (!msgs) return;
  const div = document.createElement('div');
  div.style.cssText = `margin-bottom:0.75rem; display:flex; flex-direction:column; align-items:${type === 'user' ? 'flex-end' : 'flex-start'}`;
  div.innerHTML = `
    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.2rem">${username}</div>
    <div style="background:${type === 'user' ? 'var(--accent)' : type === 'system' ? 'transparent' : 'var(--surface2)'}; 
                color:${type === 'user' ? '#fff' : type === 'system' ? 'var(--text-muted)' : 'var(--text)'};
                padding:0.5rem 0.75rem; border-radius:12px; font-size:0.85rem; max-width:80%;
                ${type === 'system' ? 'font-style:italic; font-size:0.75rem;' : ''}">
      ${message}
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
function sendChatMessage() { sendChat(); }

async function filterProjects(category, el) {
  document.querySelectorAll('#projects-page .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  try {
    const url = category === 'all' ? '/projects' : `/projects?category=${encodeURIComponent(category)}`;
    const data = await apiFetch(url);
    renderProjects(data.data);
  } catch (err) {
    toast('❌', 'Could not filter projects');
  }
}
async function openProjectDetails(id) {
  try {
    const data = await apiFetch(`/projects/${id}`);
    const p = data.data;
    const userId = window._currentUser ? window._currentUser.id : null;
    const isMember = p.members.some(m => m.id === userId);
    const isOwner = p.members.some(m => m.id === userId && m.role === 'owner');

    const members = p.members.map(m => `
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
        <div class="avatar" style="width:32px;height:32px;font-size:0.7rem">${m.first_name[0]}${m.last_name[0]}</div>
        <div>
          <div style="font-weight:600;font-size:0.85rem">${m.first_name} ${m.last_name}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">${m.role} · ${m.department}</div>
        </div>
      </div>`).join('');

    const progress = p.status === 'Completed' ? 100 : p.status === 'Review' ? 75 : p.status === 'In Progress' ? 50 : 20;
    const progressColor = progress === 100 ? 'var(--accent3)' : progress >= 50 ? 'var(--accent)' : 'var(--accent2)';

    const tasks = JSON.parse(localStorage.getItem(`tasks_${id}`) || '[]');
    const taskHtml = tasks.map((t, i) => `
      <div style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTask(${id}, ${i}, this.checked)" style="cursor:pointer">
        <span style="font-size:0.85rem;${t.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${t.text}</span>
      </div>`).join('');

    document.getElementById('project-details-content').innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <div style="width:56px;height:56px;font-size:1.75rem;background:rgba(59,130,246,0.15);border-radius:14px;display:flex;align-items:center;justify-content:center">${p.icon}</div>
        <div style="flex:1">
          <h2 style="font-size:1.3rem;font-weight:800">${p.title}</h2>
          <div style="color:var(--text-muted);font-size:0.85rem">by ${p.first_name} ${p.last_name}</div>
        </div>
        <span class="badge badge-${statusColor(p.status)}">${p.status}</span>
      </div>

      <!-- Progress Bar -->
      <div style="margin-bottom:1.25rem">
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.4rem">
          <span>Progress</span><span>${progress}%</span>
        </div>
        <div style="background:var(--surface2);border-radius:10px;height:8px">
          <div style="width:${progress}%;background:${progressColor};height:8px;border-radius:10px;transition:width 0.5s"></div>
        </div>
      </div>

      <!-- Description -->
      <div style="margin-bottom:1rem">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:0.4rem">Description</div>
        <div style="font-size:0.9rem;line-height:1.6">${p.description}</div>
      </div>

      <!-- Tags -->
      <div style="margin-bottom:1rem">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:0.4rem">Tags</div>
        <div>${tagsHtml(p.tags)}</div>
      </div>

      <!-- Tasks -->
      <div style="margin-bottom:1rem">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:0.5rem">Tasks</div>
        <div id="task-list">${taskHtml || '<div style="font-size:0.8rem;color:var(--text-muted)">No tasks yet</div>'}</div>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
          <input id="new-task-input" placeholder="Add a task..." style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:0.4rem 0.75rem;color:var(--text);font-size:0.85rem;outline:none">
          <button class="btn btn-primary btn-sm" onclick="addTask(${id})">Add</button>
        </div>
      </div>

      <!-- Members -->
      <div style="margin-bottom:1rem">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:0.75rem">Members (${p.member_count})</div>
        ${members}
      </div>
      <!-- Comments -->
      <div style="margin-bottom:1rem">
        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:0.75rem">💬 Comments</div>
        <div id="comments-list-${id}" style="max-height:200px;overflow-y:auto;margin-bottom:0.75rem"></div>
        <div style="display:flex;gap:0.5rem">
          <input id="comment-input-${id}" placeholder="Add a comment..." style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:0.4rem 0.75rem;color:var(--text);font-size:0.85rem;outline:none">
          <button class="btn btn-primary btn-sm" onclick="submitComment(${id})">Post</button>
        </div>
      </div>

      <!-- Buttons -->
      <div style="display:flex;gap:0.75rem;margin-top:1.5rem;flex-wrap:wrap">
        ${isMember ? `
          <button class="btn btn-secondary btn-sm" onclick="joinChatRoom('project-${id}');closeModal('project-details-modal')">💬 Project Chat</button>
          ${!isOwner ? `<button class="btn btn-ghost btn-sm" onclick="leaveProjectFromModal(${id})">Leave Project</button>` : ''}
        ` : `
          <button class="btn btn-primary" onclick="joinProject(${id});closeModal('project-details-modal')">Join Project</button>
        `}
        <button class="btn btn-ghost" onclick="closeModal('project-details-modal')">Close</button>
      </div>`;

    openModal('project-details-modal');
    loadComments(id);
  } catch (err) {
    toast('❌', err.message);
  }
}

function addTask(projectId) {
  const input = document.getElementById('new-task-input');
  const text = input.value.trim();
  if (!text) return;
  const tasks = JSON.parse(localStorage.getItem(`tasks_${projectId}`) || '[]');
  tasks.push({ text, done: false });
  localStorage.setItem(`tasks_${projectId}`, JSON.stringify(tasks));
  input.value = '';
  openProjectDetails(projectId);
  toast('✅', 'Task added!');
}

function toggleTask(projectId, index, done) {
  const tasks = JSON.parse(localStorage.getItem(`tasks_${projectId}`) || '[]');
  tasks[index].done = done;
  localStorage.setItem(`tasks_${projectId}`, JSON.stringify(tasks));
  toast(done ? '✅' : '🔄', done ? 'Task completed!' : 'Task reopened');
}

async function leaveProjectFromModal(id) {
  try {
    await apiFetch(`/projects/${id}/leave`, { method: 'DELETE' });
    closeModal('project-details-modal');
    toast('👋', 'Left project');
    loadProjects();
  } catch (err) {
    toast('❌', err.message);
  }
}

function joinChatRoom(room) {
  if (!socket) initChat();
  if (currentRoom) socket.emit('leave_room', currentRoom);
  currentRoom = room;
  socket.emit('join_room', { room, username: currentUsername || 'Student' });
  document.getElementById('chat-room-name').textContent = room;
  document.getElementById('chat-panel-messages').innerHTML = '';
  document.getElementById('chat-panel').style.display = 'flex';
}

function sendChatMessage() {
  const input = document.getElementById('chat-msg-input');
  const msg = input.value.trim();
  if (!msg || !currentRoom) return;
  socket.emit('send_message', { 
    room: currentRoom, 
    username: currentUsername || 'Student', 
    message: msg 
  });
  input.value = '';
}

async function uploadAvatar() {
  const input = document.getElementById('avatar-input');
  if (!input || !input.files[0]) {
    toast('⚠️', 'Please select an image first');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', input.files[0]);

  try {
    const token = getToken();
    const res = await fetch('https://collabspacesi156-production.up.railway.app/api/resources/avatar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // Update avatar in navbar
    const avatarUrl = `https://collabspacesi156-production.up.railway.app${data.avatar_url}?t=${Date.now()}`;
    document.querySelectorAll('.avatar').forEach(el => {
      if (el.tagName === 'INPUT') return;
      el.style.backgroundImage = `url(${avatarUrl})`;
      el.style.backgroundSize = 'cover';
      el.textContent = '';
    });

    toast('📸', 'Profile photo updated!');
  } catch (err) {
    toast('❌', err.message);
  }
}

// ── NOTIFICATIONS ──────────────────────────────────────────
let notifOpen = false;

async function loadNotifications() {
  try {
    const data = await apiFetch('/notifications');
    const badge = document.getElementById('notif-badge');
    const list  = document.getElementById('notif-list');
    if (!badge || !list) return;

    // Update badge
    if (data.unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = data.unread;
    } else {
      badge.style.display = 'none';
    }

    // Update list
    if (!data.data.length) {
      list.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--text-muted);font-size:0.85rem">No notifications yet</div>';
      return;
    }

    list.innerHTML = data.data.map(n => `
      <div style="padding:0.75rem;border-radius:8px;margin-bottom:0.25rem;background:${n.is_read ? 'transparent' : 'rgba(59,130,246,0.08)'};border-left:3px solid ${n.is_read ? 'transparent' : 'var(--accent)'}">
        <div style="font-weight:600;font-size:0.85rem">${n.title}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem">${n.message}</div>
        <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.3rem">${new Date(n.created_at).toLocaleString()}</div>
      </div>`).join('');
  } catch (err) {
    console.error('Notifications error:', err.message);
  }
}

function toggleNotifications() {
  notifOpen = !notifOpen;
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) {
    dropdown.style.display = notifOpen ? 'block' : 'none';
    if (notifOpen) loadNotifications();
  }
}

async function markAllRead() {
  try {
    await apiFetch('/notifications/read', { method: 'PUT' });
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    loadNotifications();
  } catch (err) {
    toast('❌', err.message);
  }
}

async function loadLeaderboard() {
  try {
    const data = await apiFetch('/leaderboard');
    const container = document.getElementById('leaderboard-list');
    if (!container) return;

    container.innerHTML = data.data.map((u, i) => `
      <div class="card" style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;padding:1.25rem">
        <div style="font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;color:${i===0?'#f59e0b':i===1?'#8f9bb3':i===2?'#cd7f32':'var(--text-muted)'};width:40px;text-align:center">
          ${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
        </div>
        <div class="avatar" style="width:48px;height:48px;font-size:1rem;background:${i===0?'linear-gradient(135deg,#f59e0b,#ef4444)':'var(--grad)'}">
          ${u.avatar_url ? `<img src="https://collabspacesi156-production.up.railway.app${u.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : `${u.first_name[0]}${u.last_name[0]}`}
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:1rem">${u.first_name} ${u.last_name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${u.department} · ${u.year}</div>
          <div style="display:flex;gap:1rem;margin-top:0.4rem;font-size:0.75rem;color:var(--text-muted)">
            <span>💻 ${u.project_count} projects</span>
            <span>📚 ${u.group_count} groups</span>
            <span>📄 ${u.resource_count} resources</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;color:var(--accent)">${u.points}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">points</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">Level ${u.level}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Leaderboard error:', err.message);
  }
}

async function loadComments(projectId) {
  try {
    const data = await apiFetch(`/projects/${projectId}/comments`);
    const container = document.getElementById(`comments-list-${projectId}`);
    if (!container) return;
    if (!data.data.length) {
      container.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted)">No comments yet. Be the first!</div>';
      return;
    }
    container.innerHTML = data.data.map(c => `
      <div style="padding:0.6rem;background:var(--surface2);border-radius:8px;margin-bottom:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
          <div style="font-weight:600;font-size:0.8rem">${c.first_name} ${c.last_name}</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">${new Date(c.created_at).toLocaleDateString()}</div>
        </div>
        <div style="font-size:0.85rem">${c.comment}</div>
      </div>`).join('');
  } catch (err) {
    console.error('Comments error:', err.message);
  }
}

async function submitComment(projectId) {
  const input = document.getElementById(`comment-input-${projectId}`);
  const comment = input.value.trim();
  if (!comment) { toast('⚠️', 'Please enter a comment'); return; }
  try {
    await apiFetch(`/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    input.value = '';
    toast('💬', 'Comment added!');
    loadComments(projectId);
  } catch (err) {
    toast('❌', err.message);
  }
}

async function checkDbStatus() {
  const landingDot  = document.getElementById("landing-db-dot");
  const landingText = document.getElementById("landing-db-text");
  try {
    const res  = await fetch('https://collabspacesi156-production.up.railway.app/api/db-status');
    const data = await res.json();
    const dot  = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    if (dot && text) {
      if (data.status === 'connected') {
        dot.style.background  = "#10b981";
      if (landingDot) { landingDot.style.background = "#10b981"; landingText.textContent = "🟢 Database Connected"; landingText.style.color = "#10b981"; }
        text.textContent      = 'DB ✓';
        text.style.color      = '#10b981';
      } else {
        dot.style.background  = '#ef4444';
        text.textContent      = 'DB ✗';
        text.style.color      = '#ef4444';
      }
    }
  } catch (err) {
    const dot  = document.getElementById('db-status-dot');
    const text = document.getElementById('db-status-text');
    if (dot) dot.style.background = "#ef4444";
    if (landingDot) { landingDot.style.background = "#ef4444"; landingText.textContent = "🔴 Database Disconnected"; landingText.style.color = "#ef4444"; }
    if (text) { text.textContent = 'DB ✗'; text.style.color = '#ef4444'; }
  }
}

// Check DB status every 30 seconds
window.addEventListener('load', () => {
  checkDbStatus();
  setInterval(checkDbStatus, 300000);
});

async function sendContactMessage() {
  const inputs = document.querySelectorAll('#contact-page input');
  const textarea = document.querySelector('#contact-page textarea');
  const name    = inputs[0].value.trim();
  const email   = inputs[1].value.trim();
  const message = textarea.value.trim();

  if (!name || !email || !message) { toast('⚠️', 'Please fill all fields'); return; }

  try {
    const res  = await fetch('https://collabspacesi156-production.up.railway.app/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, message }),
    });
    const data = await res.json();
    if (data.success) {
      toast('📬', 'Message sent successfully!');
      inputs[0].value = '';
      inputs[1].value = '';
      textarea.value  = '';
    }
  } catch (err) {
    toast('❌', 'Failed to send message');
  }
}

async function loadAdminMessages() {
  try {
    const res  = await fetch('https://collabspacesi156-production.up.railway.app/api/contact');
    const data = await res.json();
    const container = document.getElementById('admin-messages');
    if (!container) return;

    if (!data.data.length) {
      container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:2rem">No messages yet</div>';
      return;
    }

    container.innerHTML = data.data.map(m => `
      <div class="card" style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <div>
            <strong>${m.name}</strong>
            <span style="color:var(--text-muted);font-size:0.8rem;margin-left:0.5rem">${m.email}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${new Date(m.created_at).toLocaleString()}</div>
        </div>
        <p style="color:var(--text-muted);font-size:0.9rem;line-height:1.6">${m.message}</p>
      </div>`).join('');
  } catch (err) {
    console.error('Admin error:', err.message);
  }
}

async function showPublicProjects() {
  try {
    const data = await fetch('https://collabspacesi156-production.up.railway.app/api/projects').then(r => r.json());
    
    // Create a simple modal to show projects
    const existing = document.getElementById('public-projects-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'public-projects-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:3000;display:flex;align-items:center;justify-content:center;padding:2rem';
    
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:2rem;max-width:800px;width:100%;max-height:80vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h2 style="font-family:'Syne',sans-serif">🚀 Active Projects</h2>
          <button onclick="document.getElementById('public-projects-modal').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.5rem">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem">
          ${data.data.map(p => `
            <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1rem">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
                <span style="font-size:1.5rem">${p.icon}</span>
                <span class="badge badge-blue">${p.category}</span>
              </div>
              <div style="font-weight:700;margin-bottom:0.25rem">${p.title}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">${p.description}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">👥 ${p.member_count} members</div>
            </div>`).join('')}
        </div>
        <div style="text-align:center;margin-top:1.5rem">
          <button class="btn btn-primary" onclick="showPage('auth');document.getElementById('public-projects-modal').remove()">Join CollabSpace to Collaborate →</button>
        </div>
      </div>`;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  } catch (err) {
    toast('❌', 'Could not load projects');
  }
}

function toggleFaq(el) {
  const answer = el.querySelector('.faq-answer');
  const arrow  = el.querySelector('span:last-child');
  if (answer.style.display === 'none' || answer.style.display === '') {
    answer.style.display = 'block';
    if (arrow) arrow.textContent = '▲';
  } else {
    answer.style.display = 'none';
    if (arrow) arrow.textContent = '▼';
  }
}

let currentChatUserId = null;

async function loadMessages() {
  try {
    const data = await apiFetch('/messages/users');
    const container = document.getElementById('users-list');
    if (!container) return;

    container.innerHTML = data.data.map(u => `
      <div onclick="openConversation(${u.id}, '${u.first_name} ${u.last_name}')"
           style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;border-radius:8px;cursor:pointer;margin-bottom:0.5rem;background:var(--surface);border:1px solid var(--border)">
        <div class="avatar" style="width:36px;height:36px;font-size:0.75rem">${u.first_name[0]}${u.last_name[0]}</div>
        <div>
          <div style="font-weight:600;font-size:0.9rem">${u.first_name} ${u.last_name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${u.department} · ${u.year}</div>
        </div>
      </div>`).join('');
  } catch (err) {
    console.error('Messages error:', err.message);
  }
}

async function openConversation(userId, userName) {
  currentChatUserId = userId;
  document.getElementById('msg-header').innerHTML = `<strong>💬 Chat with ${userName}</strong>`;
  document.getElementById('msg-input-row').style.display = 'flex';
  
  try {
    const data = await apiFetch(`/messages/${userId}`);
    const container = document.getElementById('msg-messages');
    
    if (!data.data.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.85rem;margin-top:2rem">No messages yet. Say hello!</div>';
      return;
    }

    container.innerHTML = data.data.map(m => {
      const isMe = m.sender_id === window._currentUser.id;
      return `
        <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'}">
          <div style="background:${isMe ? 'var(--grad)' : 'var(--surface2)'};color:${isMe ? '#fff' : 'var(--text)'};padding:0.5rem 0.75rem;border-radius:12px;max-width:75%;font-size:0.85rem">
            ${m.message}
          </div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem">${new Date(m.created_at).toLocaleTimeString()}</div>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    toast('❌', err.message);
  }
}

async function sendDirectMessage() {
  const input = document.getElementById('msg-input');
  const message = input.value.trim();
  if (!message || !currentChatUserId) return;

  try {
    await apiFetch(`/messages/${currentChatUserId}`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    input.value = '';
    openConversation(currentChatUserId, document.getElementById('msg-header').querySelector('strong').textContent.replace('💬 Chat with ', ''));
  } catch (err) {
    toast('❌', err.message);
  }
}

async function loadAcademics() {
  try {
    const data = await apiFetch('/academics');
    const { courses, assignments, peers } = data.data;

    const pending   = assignments.filter(a => a.status === 'Pending').length;
    const submitted = assignments.filter(a => a.status === 'Submitted').length;
    const graded    = assignments.filter(a => a.status === 'Graded').length;

    if (document.getElementById('stat-courses'))   document.getElementById('stat-courses').textContent  = courses.length;
    if (document.getElementById('stat-pending'))   document.getElementById('stat-pending').textContent  = pending;
    if (document.getElementById('stat-submitted')) document.getElementById('stat-submitted').textContent = submitted;
    if (document.getElementById('stat-graded'))    document.getElementById('stat-graded').textContent   = graded;

    const coursesEl = document.getElementById('academics-courses');
    if (coursesEl) {
      coursesEl.innerHTML = courses.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600">${c.code} - ${c.name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${c.professor} · ${c.semester}</div>
          </div>
          <span class="badge badge-${gradeColor(c.grade)}">${c.grade}</span>
        </div>`).join('');
    }

    const assignEl = document.getElementById('academics-assignments');
    if (assignEl) {
      assignEl.innerHTML = assignments.map(a => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600;font-size:0.9rem">${a.title}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${a.code} · Due: ${new Date(a.due_date).toLocaleDateString()}</div>
          </div>
          <select onchange="updateAssignmentStatus(${a.id}, this.value)" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:0.3rem 0.5rem;color:var(--text);font-size:0.8rem;cursor:pointer">
            <option value="Pending" ${a.status==='Pending'?'selected':''}>Pending</option>
            <option value="Submitted" ${a.status==='Submitted'?'selected':''}>Submitted</option>
            <option value="Graded" ${a.status==='Graded'?'selected':''}>Graded</option>
          </select>
        </div>`).join('');
    }

    const peersEl = document.getElementById('academics-peers');
    if (peersEl) {
      peersEl.innerHTML = peers.length ? peers.map(p => `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
          <div class="avatar" style="width:36px;height:36px;font-size:0.75rem">${p.first_name[0]}${p.last_name[0]}</div>
          <div>
            <div style="font-weight:600;font-size:0.9rem">${p.first_name} ${p.last_name}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${p.common_courses} common courses</div>
          </div>
        </div>`).join('') : '<div style="color:var(--text-muted);font-size:0.85rem">No peers found yet</div>';
    }
  } catch (err) {
    console.error('Academics error:', err.message);
  }
}

function toggleTheme() {
  const body = document.body;
  const btn  = document.getElementById('theme-btn');
  body.classList.toggle('light-mode');
  const isLight = body.classList.contains('light-mode');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Apply saved theme on load
window.addEventListener('load', () => {
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = '🌙';
  }
});
