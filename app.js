/**
 * TASKA — Advanced Task Manager
 * Full-featured, production-grade JS app
 */

'use strict';

// ─── State ──────────────────────────────────────────────────────────────────

const STATE = {
  tasks: [],
  nextId: 1,
  view: 'all',
  sort: 'manual',
  layout: 'list',     // 'list' | 'grid'
  search: '',
  theme: 'dark',
  activeTag: null,
  editingId: null,    // id of task being edited in modal
};

// ─── Default Tasks ──────────────────────────────────────────────────────────

const DEFAULT_TASKS = [
  { id: 1, title: 'Redesign landing page hero section', desc: 'Update typography, hero copy, and CTA button styles', priority: 'critical', tags: ['design','frontend'], due: futureDateStr(1), done: false, created: Date.now() - 86400000 * 2 },
  { id: 2, title: 'Fix auth token refresh bug', desc: 'Token expires silently — user gets logged out without warning', priority: 'high', tags: ['bug','backend'], due: futureDateStr(2), done: false, created: Date.now() - 86400000 },
  { id: 3, title: 'Write API documentation', desc: '', priority: 'medium', tags: ['docs'], due: futureDateStr(5), done: false, created: Date.now() - 3600000 * 5 },
  { id: 4, title: 'Set up CI/CD pipeline', desc: 'Configure GitHub Actions for staging and production deployments', priority: 'high', tags: ['devops'], due: futureDateStr(3), done: false, created: Date.now() - 3600000 * 8 },
  { id: 5, title: 'Conduct user interviews', desc: 'Schedule 5 sessions for feedback on the new dashboard', priority: 'medium', tags: ['research'], due: futureDateStr(7), done: true, created: Date.now() - 86400000 * 3 },
  { id: 6, title: 'Update npm dependencies', desc: '', priority: 'low', tags: ['maintenance'], due: futureDateStr(14), done: true, created: Date.now() - 86400000 * 4 },
  { id: 7, title: 'Implement dark mode toggle', desc: 'Follow system preference with manual override stored in localStorage', priority: 'medium', tags: ['frontend','design'], due: futureDateStr(4), done: false, created: Date.now() - 3600000 * 2 },
  { id: 8, title: 'Performance audit — Core Web Vitals', desc: 'LCP > 2.5s on mobile, needs investigation', priority: 'critical', tags: ['performance'], due: futureDateStr(1), done: false, created: Date.now() - 1800000 },
];

function futureDateStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem('taska_v2');
    if (raw) {
      const saved = JSON.parse(raw);
      STATE.tasks = saved.tasks || DEFAULT_TASKS;
      STATE.nextId = saved.nextId || (Math.max(...STATE.tasks.map(t => t.id)) + 1);
      STATE.theme = saved.theme || 'dark';
    } else {
      STATE.tasks = DEFAULT_TASKS.map(t => ({ ...t }));
      STATE.nextId = DEFAULT_TASKS.length + 1;
    }
  } catch { STATE.tasks = DEFAULT_TASKS.map(t => ({ ...t })); STATE.nextId = DEFAULT_TASKS.length + 1; }
}

function saveState() {
  try { localStorage.setItem('taska_v2', JSON.stringify({ tasks: STATE.tasks, nextId: STATE.nextId, theme: STATE.theme })); } catch {}
}

// ─── Filtering & Sorting ─────────────────────────────────────────────────────

function getVisibleTasks() {
  let tasks = [...STATE.tasks];

  // Search filter
  if (STATE.search) {
    const q = STATE.search.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.desc || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q))
    );
  }

  // View filter
  const today = new Date().toISOString().split('T')[0];
  switch (STATE.view) {
    case 'today':
      tasks = tasks.filter(t => t.due === today);
      break;
    case 'active':
      tasks = tasks.filter(t => !t.done);
      break;
    case 'completed':
      tasks = tasks.filter(t => t.done);
      break;
    case 'priority-critical':
      tasks = tasks.filter(t => t.priority === 'critical');
      break;
    case 'priority-high':
      tasks = tasks.filter(t => t.priority === 'high');
      break;
    case 'priority-medium':
      tasks = tasks.filter(t => t.priority === 'medium');
      break;
    case 'priority-low':
      tasks = tasks.filter(t => t.priority === 'low');
      break;
    default:
      if (STATE.view.startsWith('tag:')) {
        const tag = STATE.view.slice(4);
        tasks = tasks.filter(t => (t.tags || []).includes(tag));
      }
      break;
  }

  // Sort
  const PRIO = { critical: 0, high: 1, medium: 2, low: 3 };
  switch (STATE.sort) {
    case 'priority': tasks.sort((a, b) => PRIO[a.priority] - PRIO[b.priority]); break;
    case 'due': tasks.sort((a, b) => (a.due || 'z').localeCompare(b.due || 'z')); break;
    case 'alpha': tasks.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'created': tasks.sort((a, b) => b.created - a.created); break;
    // 'manual' — keep insertion order
  }

  return tasks;
}

// ─── Counts ──────────────────────────────────────────────────────────────────

function getCounts() {
  const today = new Date().toISOString().split('T')[0];
  return {
    all: STATE.tasks.length,
    today: STATE.tasks.filter(t => t.due === today).length,
    active: STATE.tasks.filter(t => !t.done).length,
    completed: STATE.tasks.filter(t => t.done).length,
    critical: STATE.tasks.filter(t => t.priority === 'critical' && !t.done).length,
    high: STATE.tasks.filter(t => t.priority === 'high' && !t.done).length,
    medium: STATE.tasks.filter(t => t.priority === 'medium' && !t.done).length,
    low: STATE.tasks.filter(t => t.priority === 'low' && !t.done).length,
  };
}

function getAllTags() {
  const tagSet = new Map();
  STATE.tasks.forEach(t => (t.tags || []).forEach(tag => {
    tagSet.set(tag, (tagSet.get(tag) || 0) + 1);
  }));
  return [...tagSet.entries()].sort((a, b) => b[1] - a[1]);
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDue(due) {
  if (!due) return null;
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const d = new Date(due + 'T00:00:00');
  const label = due === today ? 'Today'
    : due === tomorrow ? 'Tomorrow'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const cls = due < today ? 'overdue' : due <= tomorrow ? 'due-soon' : '';
  return { label, cls };
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderApp() {
  renderSidebar();
  renderTaskList();
  renderStats();
}

function renderSidebar() {
  const counts = getCounts();
  document.getElementById('count-all').textContent = counts.all;
  document.getElementById('count-today').textContent = counts.today;
  document.getElementById('count-active').textContent = counts.active;
  document.getElementById('count-completed').textContent = counts.completed;
  document.getElementById('count-critical').textContent = counts.critical;
  document.getElementById('count-high').textContent = counts.high;
  document.getElementById('count-medium').textContent = counts.medium;
  document.getElementById('count-low').textContent = counts.low;

  // Tags
  const tagList = document.getElementById('tag-list');
  const tags = getAllTags();
  tagList.innerHTML = tags.map(([tag, count]) => `
    <button class="sidebar-tag-btn${STATE.view === 'tag:' + tag ? ' active' : ''}" data-tag="${esc(tag)}">
      <span class="tag-hash">#</span>
      ${esc(tag)}
      <span class="nav-count" style="margin-left:auto">${count}</span>
    </button>
  `).join('');
  tagList.querySelectorAll('.sidebar-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => setView('tag:' + btn.dataset.tag));
  });

  // Active nav
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === STATE.view);
  });

  // Progress ring
  const total = STATE.tasks.length;
  const done = STATE.tasks.filter(t => t.done).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const circumference = 2 * Math.PI * 18; // 113.1
  const offset = circumference - (circumference * pct / 100);
  document.getElementById('ring-fill').style.strokeDashoffset = offset;
  document.getElementById('ring-pct').textContent = pct + '%';
  const left = total - done;
  document.getElementById('footer-progress-text').textContent =
    pct === 100 ? 'All done! 🎉' : pct > 50 ? 'Great progress' : pct > 0 ? 'In progress' : 'Getting started';
  document.getElementById('footer-tasks-left').textContent =
    left === 0 ? 'Nothing left' : `${left} task${left !== 1 ? 's' : ''} remaining`;
}

function renderStats() {
  const total = STATE.tasks.length;
  const done = STATE.tasks.filter(t => t.done).length;
  const left = total - done;
  const crit = STATE.tasks.filter(t => t.priority === 'critical' && !t.done).length;
  const pct = total ? Math.round(done / total * 100) : 0;

  document.getElementById('s-total').textContent = total;
  document.getElementById('s-done').textContent = done;
  document.getElementById('s-left').textContent = left;
  document.getElementById('s-critical').textContent = crit;
  document.getElementById('progress-strip-fill').style.width = pct + '%';
  document.getElementById('progress-pct-label').textContent = pct + '% complete';
}

function renderTaskList() {
  const ul = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const visible = getVisibleTasks();

  ul.innerHTML = '';

  if (!visible.length) {
    empty.classList.add('visible');
    document.getElementById('empty-title').textContent =
      STATE.search ? 'No results found' : 'No tasks here';
    document.getElementById('empty-sub').textContent =
      STATE.search ? `No tasks match "${STATE.search}"` : 'Click "New Task" or press N to add one';
    return;
  }
  empty.classList.remove('visible');

  visible.forEach(task => {
    const li = buildTaskEl(task);
    ul.appendChild(li);
  });
}

function buildTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item p-${task.priority}${task.done ? ' is-done' : ''}`;
  li.dataset.id = task.id;
  li.draggable = true;

  const due = task.due ? formatDue(task.due) : null;
  const tagsHtml = (task.tags || []).map(t => `<span class="task-tag">#${esc(t)}</span>`).join('');
  const dueHtml = due ? `<span class="due-badge ${due.cls}">
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="1" y="1.5" width="8" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.1"/><path d="M3 1v1M7 1v1M1 4h8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>
    ${esc(due.label)}
  </span>` : '';

  li.innerHTML = `
    <div class="task-drag">
      <span></span><span></span><span></span>
    </div>
    <button class="task-check ${task.done ? 'checked' : ''}" aria-label="${task.done ? 'Mark incomplete' : 'Mark complete'}"></button>
    <div class="task-body">
      <div class="task-title">${esc(task.title)}</div>
      ${task.desc ? `<div class="task-desc">${esc(task.desc)}</div>` : ''}
      <div class="task-footer">
        <span class="prio-badge ${task.priority}">${task.priority}</span>
        ${dueHtml}
        ${tagsHtml}
      </div>
    </div>
    <div class="task-right">
      <button class="task-action-btn edit-btn" aria-label="Edit task">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 2l2.5 2.5L4 11H1.5V8.5L8.5 2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
      </button>
      <button class="task-action-btn del delete-btn" aria-label="Delete task">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M4.5 3.5V2h4v1.5M5 5.5v4M8 5.5v4M3 3.5l.5 7h6l.5-7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  `;

  // Checkbox
  li.querySelector('.task-check').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTask(task.id);
  });

  // Edit
  li.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(task.id);
  });

  // Delete
  li.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id, li);
  });

  // Right-click context menu
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, task.id, li);
  });

  // Drag
  li.addEventListener('dragstart', onDragStart);
  li.addEventListener('dragover', onDragOver);
  li.addEventListener('drop', onDrop);
  li.addEventListener('dragend', onDragEnd);
  li.addEventListener('dragleave', onDragLeave);

  return li;
}

// ─── Task Actions ─────────────────────────────────────────────────────────────

function addTask(data) {
  const task = {
    id: STATE.nextId++,
    title: data.title.trim(),
    desc: (data.desc || '').trim(),
    priority: data.priority || 'medium',
    tags: parseTags(data.tags || ''),
    due: data.due || null,
    done: false,
    created: Date.now(),
  };
  STATE.tasks.unshift(task);
  saveState();
  renderApp();
  toast('Task added', 'success');
}

function updateTask(id, data) {
  const task = STATE.tasks.find(t => t.id === id);
  if (!task) return;
  task.title = data.title.trim();
  task.desc = (data.desc || '').trim();
  task.priority = data.priority;
  task.tags = parseTags(data.tags || '');
  task.due = data.due || null;
  saveState();
  renderApp();
  toast('Task updated', 'info');
}

function toggleTask(id) {
  const task = STATE.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveState();
  renderApp();
  if (task.done) toast('Task completed ✓', 'success');
}

function deleteTask(id, li) {
  if (li) {
    li.classList.add('removing');
    setTimeout(() => { _removeTask(id); }, 250);
  } else { _removeTask(id); }
}

function _removeTask(id) {
  STATE.tasks = STATE.tasks.filter(t => t.id !== id);
  saveState();
  renderApp();
  toast('Task deleted', 'error');
}

function duplicateTask(id) {
  const task = STATE.tasks.find(t => t.id === id);
  if (!task) return;
  const copy = { ...task, id: STATE.nextId++, title: task.title + ' (copy)', done: false, created: Date.now() };
  const idx = STATE.tasks.findIndex(t => t.id === id);
  STATE.tasks.splice(idx + 1, 0, copy);
  saveState();
  renderApp();
  toast('Task duplicated', 'info');
}

function parseTags(str) {
  return str.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function clearCompleted() {
  const count = STATE.tasks.filter(t => t.done).length;
  STATE.tasks = STATE.tasks.filter(t => !t.done);
  saveState();
  renderApp();
  if (count) toast(`Cleared ${count} completed task${count !== 1 ? 's' : ''}`, 'info');
}

// ─── View / Sort ──────────────────────────────────────────────────────────────

const VIEW_TITLES = {
  all: 'All Tasks', today: 'Today', active: 'Active', completed: 'Completed',
  'priority-critical': 'Critical Priority', 'priority-high': 'High Priority',
  'priority-medium': 'Medium Priority', 'priority-low': 'Low Priority',
};

function setView(view) {
  STATE.view = view;
  const title = VIEW_TITLES[view] || (view.startsWith('tag:') ? '#' + view.slice(4) : view);
  document.getElementById('view-title').textContent = title;
  renderApp();
}

// ─── Drag and Drop ────────────────────────────────────────────────────────────

let dragSrcId = null;
let dragOverId = null;

function onDragStart(e) {
  dragSrcId = parseInt(this.dataset.id);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcId);
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const id = parseInt(this.dataset.id);
  if (id !== dragOverId) {
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
    dragOverId = id;
    if (id !== dragSrcId) this.classList.add('drag-over');
  }
}

function onDragLeave() {
  this.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  const destId = parseInt(this.dataset.id);
  if (dragSrcId == null || dragSrcId === destId) return;
  const srcIdx = STATE.tasks.findIndex(t => t.id === dragSrcId);
  const dstIdx = STATE.tasks.findIndex(t => t.id === destId);
  if (srcIdx < 0 || dstIdx < 0) return;
  const [moved] = STATE.tasks.splice(srcIdx, 1);
  STATE.tasks.splice(dstIdx, 0, moved);
  dragSrcId = null;
  dragOverId = null;
  if (STATE.sort !== 'manual') {
    STATE.sort = 'manual';
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === 'manual'));
  }
  saveState();
  renderApp();
}

function onDragEnd() {
  document.querySelectorAll('.task-item').forEach(el => {
    el.classList.remove('dragging', 'drag-over');
  });
  dragSrcId = null;
  dragOverId = null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(editId = null) {
  STATE.editingId = editId;
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const titleInput = document.getElementById('modal-task-title');
  const descInput = document.getElementById('modal-task-desc');
  const prioSel = document.getElementById('modal-priority');
  const dueInput = document.getElementById('modal-due');
  const tagsInput = document.getElementById('modal-tags');

  if (editId !== null) {
    const task = STATE.tasks.find(t => t.id === editId);
    if (!task) return;
    titleEl.textContent = 'Edit Task';
    titleInput.value = task.title;
    descInput.value = task.desc || '';
    prioSel.value = task.priority;
    dueInput.value = task.due || '';
    tagsInput.value = (task.tags || []).join(', ');
  } else {
    titleEl.textContent = 'New Task';
    titleInput.value = '';
    descInput.value = '';
    prioSel.value = 'medium';
    dueInput.value = '';
    tagsInput.value = '';
  }

  overlay.classList.add('open');
  requestAnimationFrame(() => titleInput.focus());
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  STATE.editingId = null;
}

function saveModal() {
  const title = document.getElementById('modal-task-title').value.trim();
  if (!title) {
    const input = document.getElementById('modal-task-title');
    input.style.borderColor = 'var(--critical)';
    input.focus();
    setTimeout(() => { input.style.borderColor = ''; }, 1000);
    return;
  }
  const data = {
    title,
    desc: document.getElementById('modal-task-desc').value,
    priority: document.getElementById('modal-priority').value,
    due: document.getElementById('modal-due').value,
    tags: document.getElementById('modal-tags').value,
  };
  if (STATE.editingId !== null) { updateTask(STATE.editingId, data); }
  else { addTask(data); }
  closeModal();
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

let ctxTaskId = null;
let ctxTaskEl = null;

function openContextMenu(x, y, taskId, taskEl) {
  ctxTaskId = taskId;
  ctxTaskEl = taskEl;
  const menu = document.getElementById('context-menu');
  const task = STATE.tasks.find(t => t.id === taskId);

  // Update toggle label
  const toggleBtn = menu.querySelector('[data-action="toggle"]');
  toggleBtn.querySelector('span') && (toggleBtn.lastChild.textContent = ' ' + (task?.done ? 'Mark active' : 'Mark complete'));

  menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 180) + 'px';
  menu.classList.add('open');
}

function closeContextMenu() {
  document.getElementById('context-menu').classList.remove('open');
  ctxTaskId = null;
  ctxTaskEl = null;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function toast(msg, type = 'info') {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-dot ${type}"></span>${esc(msg)}`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('dismissing');
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function toggleTheme() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('light', STATE.theme === 'light');
  saveState();
}

// ─── Layout toggle ────────────────────────────────────────────────────────────

function toggleLayout() {
  STATE.layout = STATE.layout === 'list' ? 'grid' : 'list';
  const board = document.getElementById('task-board');
  board.classList.toggle('grid-layout', STATE.layout === 'grid');
  document.getElementById('layout-icon-list').style.display = STATE.layout === 'grid' ? 'block' : 'none';
  document.getElementById('layout-icon-grid').style.display = STATE.layout === 'list' ? 'block' : 'none';
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName.toLowerCase();
    const inInput = ['input','textarea','select'].includes(tag);

    if (e.key === 'Escape') {
      if (document.getElementById('modal-overlay').classList.contains('open')) { closeModal(); return; }
      closeContextMenu();
      return;
    }
    if (e.key === 'Enter' && document.getElementById('modal-overlay').classList.contains('open')) {
      if (tag !== 'textarea') { saveModal(); }
      return;
    }
    if (!inInput) {
      if (e.key === 'n' || e.key === 'N') { openModal(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input').focus();
        return;
      }
    }
  });
}

// ─── Event Wiring ─────────────────────────────────────────────────────────────

function initEvents() {
  // Sidebar toggle
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  // New task
  document.getElementById('new-task-btn').addEventListener('click', () => openModal());

  // Sort
  document.querySelectorAll('.seg-btn[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.sort = btn.dataset.sort;
      renderApp();
    });
  });

  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    STATE.search = e.target.value;
    renderTaskList();
  });

  // Clear completed
  document.getElementById('clear-completed-btn').addEventListener('click', clearCompleted);

  // Layout toggle
  document.getElementById('layout-btn').addEventListener('click', toggleLayout);

  // Theme toggle
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Context menu
  document.getElementById('context-menu').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || ctxTaskId == null) return;
    const action = btn.dataset.action;
    const id = ctxTaskId;
    const el = ctxTaskEl;
    closeContextMenu();
    if (action === 'edit') openModal(id);
    else if (action === 'toggle') toggleTask(id);
    else if (action === 'duplicate') duplicateTask(id);
    else if (action === 'delete') deleteTask(id, el);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) closeContextMenu();
  });

  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.task-item')) closeContextMenu();
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  loadState();
  if (STATE.theme === 'light') document.body.classList.add('light');
  initEvents();
  initKeyboard();
  renderApp();
}

document.addEventListener('DOMContentLoaded', init);