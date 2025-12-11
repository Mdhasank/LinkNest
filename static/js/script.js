// --- DB Config ---
const DB_NAME = 'LinkNestDB';
const DB_VERSION = 2;
let db = null;

// --- IDB Wrapper ---
const idb = {
    open: () => {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },
    getAll: (storeName) => new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
    }),
    put: (storeName, item) => new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(item);
        req.onsuccess = () => resolve(req.result);
    }),
    delete: (storeName, id) => new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
    }),
    clear: (storeName) => new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).clear();
        req.onsuccess = () => resolve();
    })
};

// --- State ---
const state = {
    items: [],
    categories: [],
    page: 1,
    perPage: 20,
    search: '',
    filter: 'All', 
    view: 'grid',
    dragSrc: null
};

// --- DOM ---
const $ = (id) => document.getElementById(id);

// --- Init ---
async function init() {
    try {
        db = await idb.open();
        
        // Restore theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.dataset.theme = savedTheme;
        updateThemeIcon();

        await refreshData();
        setupListeners();
    } catch (e) { console.error(e); alert('DB Error'); }
}

async function refreshData() {
    await Promise.all([loadItems(), loadCategories()]);
    renderSidebar();
    render();
}

async function loadItems() {
    state.items = await idb.getAll('items');
    state.items.forEach(i => { if(typeof i.order === 'undefined') i.order = new Date(i.createdAt).getTime(); });
    state.items.sort((a,b) => b.order - a.order);
}

async function loadCategories() {
    state.categories = await idb.getAll('categories');
    // Default cats if empty is optional now, user might want clear slate. 
    // Keeping defaults for good UX if db is empty empty.
    if(state.categories.length === 0) {
        const defaults = [
            { id: 'cat_work', name: 'Work', icon: '💼' },
            { id: 'cat_learn', name: 'Learn', icon: '🧠' },
            { id: 'cat_tools', name: 'Tools', icon: '🛠️' }
        ];
        for(const c of defaults) await idb.put('categories', c);
        state.categories = defaults;
    }
}

// --- Sidebar ---
function renderSidebar() {
    const navFunc = $('navTree');
    navFunc.innerHTML = '';
    
    // Sort categories
    const cats = [...state.categories].sort((a,b) => a.name.localeCompare(b.name));
    
    cats.forEach(cat => {
        const activeClass = state.filter === cat.name ? 'active' : '';
        const count = state.items.filter(i => (i.tag || '') === cat.name).length;
        
        const btn = document.createElement('div');
        btn.className = `nav-item ${activeClass}`;
        btn.onclick = (e) => { 
            if(e.target.classList.contains('cat-delete')) return;
            setFilter(cat.name); 
        };
        btn.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;flex:1">
                <span>${cat.icon || '📁'}</span>
                ${cat.name}
                <span class="count">${count}</span>
            </div>
            <button class="cat-delete" onclick="deleteCategory('${cat.id}')">✕</button>
        `;
        navFunc.appendChild(btn);
    });

    // Uncategorized count
    const knownNames = new Set(cats.map(c => c.name));
    const uncategorizedCount = state.items.filter(i => !knownNames.has(i.tag)).length;
    
    if(uncategorizedCount > 0) {
        const btn = document.createElement('button');
        btn.className = `nav-item ${state.filter === 'Uncategorized' ? 'active' : ''}`;
        btn.onclick = () => setFilter('Uncategorized');
        btn.innerHTML = `<span>❓</span> Uncategorized <span class="count">${uncategorizedCount}</span>`;
        navFunc.appendChild(btn);
    }
    
    updateTagSelect();
}

function updateTagSelect() {
    const select = $('categorySelect');
    select.innerHTML = '<option value="">Select Category...</option>';
    state.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.icon} ${c.name}`;
        select.appendChild(opt);
    });
}

function setFilter(tag) {
    state.filter = tag;
    state.page = 1;
    render();
    renderSidebar(); 
    if(window.innerWidth <= 860) toggleSidebar(false); 
}

// --- Grid Render ---
function render() {
    const grid = $('itemsGrid');
    grid.className = `items-grid ${state.view === 'list' ? 'list-view' : ''}`;
    grid.innerHTML = '';

    const q = state.search.toLowerCase();
    const visible = state.items.filter(i => {
        if(state.filter !== 'All') {
            if(state.filter === 'Uncategorized') {
                const known = new Set(state.categories.map(c => c.name));
                if(known.has(i.tag)) return false;
            } else {
                if(i.tag !== state.filter) return false;
            }
        }
        if(q && !i.title.toLowerCase().includes(q) && !(i.url||'').toLowerCase().includes(q)) return false;
        return true;
    });

    const start = (state.page - 1) * state.perPage;
    const pageItems = visible.slice(start, start + state.perPage);

    if(pageItems.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;">No items found.</div>`;
    } else {
        pageItems.forEach(item => grid.appendChild(createCard(item)));
    }

    renderPagination(visible.length);
}

function createCard(item) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.id = item.id;

    // Drag
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = '⋮⋮';
    handle.draggable = true;
    handle.addEventListener('dragstart', (e) => {
        state.dragSrc = item;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        el.style.opacity = '0.5';
    });
    handle.addEventListener('dragend', () => el.style.opacity = '1');
    el.addEventListener('dragover', (e) => e.preventDefault());
    el.addEventListener('drop', handleDrop);

    // Thumb
    let thumb = `<div class="thumb">${item.title[0]}</div>`;
    if(item.type === 'image') {
        thumb = `<div class="thumb" id="t-${item.id}">🖼️</div>`;
        getFile(item.id).then(url => { if(url) $(`t-${item.id}`).innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`; });
    }

    // Body
    el.addEventListener('click', (e) => {
        // Only open if not clicking actions/handle
        if(!e.target.closest('.actions') && !e.target.closest('.drag-handle')) openItem(item.id);
    });

    // Content
    const body = document.createElement('div');
    body.className = 'card-body';
    body.innerHTML = `
        ${thumb}
        <div class="details">
            <div class="card-title">${item.title}</div>
            <div class="card-meta">
                <span class="meta-tag">${item.tag || 'Uncategorized'}</span>
                ${item.url ? new URL(item.url).hostname.replace('www.','') : 'File'}
            </div>
        </div>
    `;

    // Actions Overlay
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
        <button class="action-btn" onclick="editItem('${item.id}')" title="Edit">✏️</button>
        <button class="action-btn" onclick="deleteItem('${item.id}')" title="Delete" style="color:var(--danger)">🗑️</button>
    `;

    el.appendChild(handle);
    body.appendChild(actions);
    el.appendChild(body);
    return el;
}

// --- Data Logic ---
async function handleDrop(e) { /* same as before */
    e.stopPropagation();
    const targetId = this.dataset.id;
    const srcId = state.dragSrc.id;
    if(targetId !== srcId) {
        const target = state.items.find(i => i.id === targetId);
        const src = state.items.find(i => i.id === srcId);
        const tmp = target.order;
        target.order = src.order;
        src.order = tmp;
        await Promise.all([idb.put('items', src), idb.put('items', target)]);
        await refreshData();
    }
}

async function saveItem(e) {
    e.preventDefault();
    const form = e.target;
    // Strict Validation
    if(!form.title.value.trim()) return alert('Title is required');
    const url = form.url.value.trim();
    const file = $('fileUpload').files[0];
    const isEdit = !!form.dataset.editId; // edit might have existing file

    if(!url && !file && !isEdit) {
         return alert('You must add a Link URL or Upload a File.');
    }
    // If edit, check if original item had url/file
    if(isEdit && !url && !file) {
        const orig = state.items.find(i => i.id === form.dataset.editId);
        if(!orig || (!orig.url && !orig.fileType)) return alert('Item must have content');
    }

    const id = form.dataset.editId || crypto.randomUUID();
    let item = isEdit ? state.items.find(i => i.id === id) : { id, createdAt: new Date().toISOString() };
    if(!item) item = { id, createdAt: new Date().toISOString() };
    
    item.title = form.title.value;
    item.tag = form.category.value || 'Uncategorized';
    item.url = url;
    // Reminder Removed
    
    item.type = item.type || 'link';
    item.updatedAt = new Date().toISOString();
    if(!item.order) item.order = Date.now();

    if(file) {
        item.type = file.type.startsWith('image') ? 'image' : 'file';
        item.fileType = file.type;
        await idb.put('files', { id: item.id, blob: file });
        if(!item.title) item.title = file.name;
    }

    await idb.put('items', item);
    closeModal('modalOverlay');
    await refreshData();
}

async function saveCategory(e) {
    e.preventDefault();
    const form = e.target;
    if(!form.catName.value) return;
    const cat = { id: 'cat_' + Date.now(), name: form.catName.value, icon: form.catIcon.value || '📁' };
    await idb.put('categories', cat);
    closeModal('categoryModal');
    await refreshData();
}

async function deleteCategory(id) {
    if(confirm('Delete this category? Items will settle into Uncategorized.')) {
        await idb.delete('categories', id);
        await refreshData();
    }
}

// --- Import/Export ---
async function importData(mode) {
    const txt = $('importText').value.trim();
    if(!txt) return alert('No JSON to import');
    try {
        const data = JSON.parse(txt);
        let items = Array.isArray(data) ? data : (data.items || []);
        let cats = data.categories || [];
        if(mode === 'replace') {
            await idb.clear('items');
            await idb.clear('categories'); 
            await idb.clear('files');
        }
        for(const c of cats) await idb.put('categories', c);
        for(const i of items) {
            if(!i.id) i.id = crypto.randomUUID();
            await idb.put('items', i);
        }
        alert('Import Successful!');
        closeModal('importModal');
        await refreshData();
    } catch(e) { alert('Invalid JSON: ' + e); }
}

function exportData() {
    const data = { items: state.items, categories: state.categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linknest_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

// --- UI Helpers ---
function toggleSidebar(force) {
    const sb = $('sidebar');
    if(typeof force === 'boolean') {
        if(force) sb.classList.add('open');
        else sb.classList.remove('open');
    } else {
        sb.classList.toggle('open');
    }
}

function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    updateThemeIcon();
}

function updateThemeIcon() {
    const current = document.documentElement.dataset.theme;
    const icon = current === 'dark' ? '☀️' : '🌑';
    const btn = $('themeToggle');
    const btnMobile = $('themeToggleMobile');
    if(btn) btn.textContent = icon;
    if(btnMobile) btnMobile.textContent = icon;
}

function editItem(id) {
    const item = state.items.find(i => i.id === id);
    if(!item) return;
    $('modalTitle').textContent = 'Edit Item';
    const form = $('itemForm');
    form.dataset.editId = id;
    form.title.value = item.title;
    form.category.value = item.tag;
    form.url.value = item.url || '';
    $('modalOverlay').classList.add('open');
}

function openItem(id) {
    const item = state.items.find(i => i.id === id);
    if(item.url) window.open(item.url, '_blank');
    else if(item.type === 'image' || item.type === 'file') getFile(id).then(u => { if(u) window.open(u,'_blank'); });
}

async function deleteItem(id) {
    if(confirm('Delete item?')) {
        await idb.delete('items', id);
        await idb.delete('files', id);
        await refreshData();
    }
}

async function getFile(id) {
    const r = await new Promise(res => {
        const tx = db.transaction('files','readonly');
        const req = tx.objectStore('files').get(id);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
    });
    return r ? URL.createObjectURL(r.blob) : null;
}

function renderPagination(total) {
    const target = $('pagination');
    target.innerHTML = '';
    const pages = Math.ceil(total / state.perPage);
    if(pages <= 1) return;
    for(let i=1; i<=pages; i++) {
        const btn = document.createElement('button');
        btn.className = `btn btn-ghost ${state.page === i ? 'btn-primary' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { state.page = i; render(); };
        target.appendChild(btn);
    }
}

// --- Setup ---
function setupListeners() {
    $('addBtn').onclick = () => {
        $('itemForm').reset();
        delete $('itemForm').dataset.editId;
        $('modalTitle').textContent = 'New Item';
        $('modalOverlay').classList.add('open');
    };
    $('catAddBtn').onclick = () => $('categoryModal').classList.add('open');
    $('dataBtn').onclick = () => $('importModal').classList.add('open');
    
    // Close Btns
    document.querySelectorAll('.btn-close').forEach(b => {
        b.onclick = function() { this.closest('.modal-overlay').classList.remove('open'); };
    });

    $('itemForm').onsubmit = saveItem;
    $('categoryForm').onsubmit = saveCategory;
    
    $('globalSearch').oninput = (e) => { state.search = e.target.value; state.page = 1; render(); };
    $('viewModeBtn').onclick = () => { state.view = state.view === 'grid' ? 'list' : 'grid'; render(); };
    $('themeToggle').onclick = toggleTheme;
    
    // Mobile Buttons
    if($('themeToggleMobile')) $('themeToggleMobile').onclick = toggleTheme;
    if($('viewModeBtnMobile')) $('viewModeBtnMobile').onclick = () => { state.view = state.view === 'grid' ? 'list' : 'grid'; render(); };

    // Sidebar Toggles
    $('menuBtn').onclick = () => toggleSidebar(true);
    $('closeSidebarBtn').onclick = () => toggleSidebar(false);

    // Import/Export
    $('btnValidate').onclick = () => { try{ JSON.parse($('importText').value); alert('Valid'); } catch(e){ alert('Invalid'); } }
    $('btnMerge').onclick = () => importData('merge');
    $('btnReplace').onclick = () => importData('replace');
    $('btnExport').onclick = exportData;
    
    $('jsonFile').onchange = (e) => {
        const f = e.target.files[0];
        if(f) { const r = new FileReader(); r.onload = (evt) => $('importText').value = evt.target.result; r.readAsText(f); }
    }
}

function closeModal(id) { $(id).classList.remove('open'); }

document.addEventListener('DOMContentLoaded', init);
