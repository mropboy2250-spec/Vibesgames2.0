/* =============================================
   VibesGames 2.0 — script.js
   Owner: ahmad | Password: ahmad123
   ============================================= */

// ===== STATE =====
let currentUser = null;
let apps = [];
let reviews = {};
let userRatings = {};
let downloads = {};
let currentFilter = 'all';
let currentAppId = null;
let pendingFileData = null;
let pendingIconData = null;

// ===== GOOGLE NAMES =====
const googleNames = ['Alex Johnson','Sam Rivera','Taylor Kim','Morgan Chen','Jamie Patel','Casey Singh'];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  loadTheme();
  loadSession();
  renderStore();
  renderFeaturedBanner();
});

// ===== DATA =====
function loadData() {
  apps = JSON.parse(localStorage.getItem('vg_apps') || '[]');
  reviews = JSON.parse(localStorage.getItem('vg_reviews') || '{}');
  userRatings = JSON.parse(localStorage.getItem('vg_ratings') || '{}');
  downloads = JSON.parse(localStorage.getItem('vg_downloads') || '{}');
}
function saveApps() { localStorage.setItem('vg_apps', JSON.stringify(apps)); }
function saveReviews() { localStorage.setItem('vg_reviews', JSON.stringify(reviews)); }
function saveRatings() { localStorage.setItem('vg_ratings', JSON.stringify(userRatings)); }
function saveDownloads() { localStorage.setItem('vg_downloads', JSON.stringify(downloads)); }

// ===== THEME =====
function loadTheme() {
  const t = localStorage.getItem('vg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('.theme-toggle').textContent = t === 'dark' ? '🌙' : '☀️';
}
function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('vg_theme', next);
  document.querySelector('.theme-toggle').textContent = next === 'dark' ? '🌙' : '☀️';
}

// ===== SESSION =====
function loadSession() {
  const saved = localStorage.getItem('vg_session');
  if (saved) {
    currentUser = JSON.parse(saved);
    updateNavUser();
  }
}
function updateNavUser() {
  if (currentUser) {
    document.getElementById('nav-user').classList.remove('hidden');
    document.getElementById('nav-login-btn').style.display = 'none';
    document.getElementById('nav-username').textContent = currentUser.username;
    document.getElementById('admin-nav-btn').style.display = currentUser.isOwner ? '' : 'none';
  } else {
    document.getElementById('nav-user').classList.add('hidden');
    document.getElementById('nav-login-btn').style.display = '';
    document.getElementById('admin-nav-btn').style.display = 'none';
  }
}
function logout() {
  currentUser = null;
  localStorage.removeItem('vg_session');
  updateNavUser();
  showPage('store');
  toast('Logged out successfully', 'info');
}

// ===== LOGIN =====
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  if (!u || !p) { toast('Please enter username and password', 'error'); return; }
  const isOwner = (u === 'ahmad' && p === 'ahmad123');
  currentUser = { username: u, isOwner };
  localStorage.setItem('vg_session', JSON.stringify(currentUser));
  updateNavUser();
  closeModal('login-modal');
  toast(`Welcome back, ${u}! ${isOwner ? '🛡 Admin' : ''}`, 'success');
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}
function googleLogin() {
  const name = googleNames[Math.floor(Math.random() * googleNames.length)];
  currentUser = { username: name, isOwner: false, google: true };
  localStorage.setItem('vg_session', JSON.stringify(currentUser));
  updateNavUser();
  closeModal('login-modal');
  toast(`Signed in as ${name} (Google)`, 'success');
}

// ===== PAGES =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const idx = ['store','profile','admin'].indexOf(name);
  const btns = document.querySelectorAll('.nav-btn');
  if (idx >= 0 && btns[idx]) btns[idx].classList.add('active');
  if (name === 'profile') renderProfile();
  if (name === 'admin') {
    if (!currentUser?.isOwner) { showPage('store'); toast('Access denied', 'error'); return; }
    renderAdmin();
  }
}

// ===== STORE RENDER =====
function renderStore() {
  filterApps();
}

function filterApps() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const sort = document.getElementById('sort-select')?.value || 'newest';
  let filtered = [...apps];

  // Filter
  if (currentFilter === 'top') filtered = filtered.filter(a => getAvgRating(a) >= 4);
  if (currentFilter === 'latest') filtered = filtered.sort((a, b) => b.date - a.date).slice(0, 10);
  if (currentFilter === 'featured') filtered = filtered.filter(a => a.featured);

  // Search
  if (q) filtered = filtered.filter(a => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q));

  // Sort
  if (sort === 'newest') filtered.sort((a, b) => b.date - a.date);
  else if (sort === 'oldest') filtered.sort((a, b) => a.date - b.date);
  else if (sort === 'az') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'za') filtered.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === 'rating') filtered.sort((a, b) => getAvgRating(b) - getAvgRating(a));

  renderGrid(filtered);
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterApps();
}

function renderGrid(list) {
  const grid = document.getElementById('app-grid');
  const noApps = document.getElementById('no-apps');
  if (!list.length) { grid.innerHTML = ''; noApps.classList.remove('hidden'); return; }
  noApps.classList.add('hidden');
  grid.innerHTML = list.map(app => `
    <div class="app-card" onclick="openAppModal('${app.id}')">
      ${app.featured ? '<div class="featured-dot">⭐ Featured</div>' : ''}
      <div class="app-card-icon">${app.icon ? `<img src="${app.icon}" alt="icon"/>` : '🎮'}</div>
      <div class="app-card-name">${esc(app.name)}</div>
      <div class="app-card-cat">${esc(app.category)}</div>
      <div class="app-card-rating">
        ${renderStars(getAvgRating(app))}
        <span style="color:var(--text2);font-size:0.75rem;">${getAvgRating(app).toFixed(1)}</span>
      </div>
      <div style="font-size:0.72rem;color:var(--text2);">${app.version || 'v1.0'}</div>
      <button class="app-card-download" onclick="event.stopPropagation();quickDownload('${app.id}')">⬇ Download</button>
    </div>
  `).join('');
}

function renderStars(rating, size = '') {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="${i <= Math.round(rating) ? 'star-filled' : 'star-empty'}">★</span>`;
  }
  return html;
}

function getAvgRating(app) {
  const appReviews = reviews[app.id] || [];
  const ratings = appReviews.map(r => r.rating).filter(Boolean);
  if (!ratings.length) return app.baseRating || 4.0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return +(sum / ratings.length).toFixed(1);
}

// ===== FEATURED BANNER =====
function renderFeaturedBanner() {
  const featured = apps.filter(a => a.featured);
  const app = featured.length ? featured[Math.floor(Math.random() * featured.length)] : null;
  if (app) {
    document.getElementById('featured-title').textContent = app.name;
    document.getElementById('featured-desc').textContent = app.desc?.slice(0, 100) || 'Click to view details';
    document.getElementById('featured-icon').innerHTML = app.icon ? `<img src="${app.icon}" style="width:80px;height:80px;border-radius:18px;"/>` : '🎮';
    document.getElementById('featured-btn').style.display = '';
    window._featuredAppId = app.id;
  } else {
    document.getElementById('featured-title').textContent = 'Welcome to VibesGames 2.0';
    document.getElementById('featured-desc').textContent = 'Discover, download, and rate the best apps & games.';
    document.getElementById('featured-icon').textContent = '🎮';
    document.getElementById('featured-btn').style.display = 'none';
    window._featuredAppId = null;
  }
}
function openFeaturedApp() {
  if (window._featuredAppId) openAppModal(window._featuredAppId);
}

// ===== APP DETAIL MODAL =====
function openAppModal(id) {
  const app = apps.find(a => a.id === id);
  if (!app) return;
  currentAppId = id;

  document.getElementById('modal-icon').innerHTML = app.icon ? `<img src="${app.icon}" alt="icon"/>` : '🎮';
  document.getElementById('modal-title').textContent = app.name;
  document.getElementById('modal-version').textContent = app.version || 'v1.0';
  document.getElementById('modal-category').textContent = app.category;
  document.getElementById('modal-desc').textContent = app.desc || 'No description provided.';
  document.getElementById('modal-date').textContent = '📅 Uploaded: ' + new Date(app.date).toLocaleDateString();

  const avg = getAvgRating(app);
  document.getElementById('modal-stars').innerHTML = renderStars(avg);
  document.getElementById('modal-avg-rating').textContent = `Average: ${avg.toFixed(1)} / 5`;

  // User's rating
  const myRating = (userRatings[currentUser?.username] || {})[id] || 0;
  highlightRateStars(myRating);
  document.getElementById('your-rating-text').textContent = myRating ? `Your rating: ${myRating} ★` : 'Tap a star to rate';

  // Reset progress
  document.getElementById('dl-progress-wrap').classList.add('hidden');
  document.getElementById('dl-fill').style.width = '0%';

  // Reviews
  renderReviewsList();
  const reviewForm = document.getElementById('review-form');
  const reviewHint = document.getElementById('review-login-hint');
  if (currentUser) { reviewForm.classList.remove('hidden'); reviewHint.classList.add('hidden'); }
  else { reviewForm.classList.add('hidden'); reviewHint.classList.remove('hidden'); }
  document.getElementById('review-text').value = '';

  openModal('app-modal');
}

// ===== RATINGS =====
let pendingRating = 0;
function setUserRating(val) {
  if (!currentUser) { toast('Please login to rate', 'error'); return; }
  pendingRating = val;
  highlightRateStars(val);
  if (!userRatings[currentUser.username]) userRatings[currentUser.username] = {};
  userRatings[currentUser.username][currentAppId] = val;
  saveRatings();
  document.getElementById('your-rating-text').textContent = `Your rating: ${val} ★`;
  // Update avg
  const app = apps.find(a => a.id === currentAppId);
  document.getElementById('modal-stars').innerHTML = renderStars(getAvgRating(app));
  document.getElementById('modal-avg-rating').textContent = `Average: ${getAvgRating(app).toFixed(1)} / 5`;
  toast(`Rated ${val} star${val > 1 ? 's' : ''}!`, 'success');
  renderStore();
}
function highlightRateStars(val) {
  document.querySelectorAll('#rate-stars span').forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

// ===== REVIEWS =====
function renderReviewsList() {
  const list = reviews[currentAppId] || [];
  const el = document.getElementById('reviews-list');
  if (!list.length) { el.innerHTML = '<p class="no-reviews">No reviews yet. Be the first!</p>'; return; }
  el.innerHTML = list.map(r => `
    <div class="review-item">
      <div class="review-user">👤 ${esc(r.user)}</div>
      <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <div class="review-text">${esc(r.text)}</div>
    </div>
  `).join('');
}
function submitReview() {
  if (!currentUser) { toast('Please login', 'error'); return; }
  const text = document.getElementById('review-text').value.trim();
  if (!text) { toast('Review cannot be empty', 'error'); return; }
  const rating = (userRatings[currentUser.username] || {})[currentAppId] || 3;
  if (!reviews[currentAppId]) reviews[currentAppId] = [];
  reviews[currentAppId].push({ user: currentUser.username, rating, text, date: Date.now() });
  saveReviews();
  document.getElementById('review-text').value = '';
  renderReviewsList();
  const app = apps.find(a => a.id === currentAppId);
  document.getElementById('modal-avg-rating').textContent = `Average: ${getAvgRating(app).toFixed(1)} / 5`;
  toast('Review submitted!', 'success');
}

// ===== DOWNLOAD =====
function downloadApp(id) {
  id = id || currentAppId;
  const app = apps.find(a => a.id === id);
  if (!app) return;

  // Track download
  if (currentUser) {
    if (!downloads[currentUser.username]) downloads[currentUser.username] = [];
    if (!downloads[currentUser.username].find(d => d.id === id)) {
      downloads[currentUser.username].push({ id, name: app.name, icon: app.icon, category: app.category, date: Date.now() });
      saveDownloads();
    }
  }

  // Simulate download progress
  const wrap = document.getElementById('dl-progress-wrap');
  const fill = document.getElementById('dl-fill');
  const pct = document.getElementById('dl-pct');
  wrap.classList.remove('hidden');
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 12 + 3;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      fill.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(() => {
        wrap.classList.add('hidden');
        fill.style.width = '0%';
        pct.textContent = '0%';
        toast('✅ Downloaded successfully!', 'success');
        triggerRealDownload(app);
      }, 400);
    } else {
      fill.style.width = progress + '%';
      pct.textContent = Math.round(progress) + '%';
    }
  }, 120);
}

function triggerRealDownload(app) {
  if (app.fileData) {
    const byteString = atob(app.fileData.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (app.name || 'app') + '.apk';
    a.click(); URL.revokeObjectURL(url);
  } else {
    // Simulate: create dummy blob
    const blob = new Blob([`VibesGames App: ${app.name}\nVersion: ${app.version}\nSize: Simulated`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (app.name || 'app') + '.txt';
    a.click(); URL.revokeObjectURL(url);
  }
}

function quickDownload(id) {
  currentAppId = id;
  const app = apps.find(a => a.id === id);
  if (!app) return;
  if (currentUser) {
    if (!downloads[currentUser.username]) downloads[currentUser.username] = [];
    if (!downloads[currentUser.username].find(d => d.id === id)) {
      downloads[currentUser.username].push({ id, name: app.name, icon: app.icon, category: app.category, date: Date.now() });
      saveDownloads();
    }
  }
  toast('Starting download...', 'info');
  setTimeout(() => { toast('✅ Downloaded: ' + app.name, 'success'); triggerRealDownload(app); }, 900);
}

// ===== UPLOAD =====
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const info = document.getElementById('file-info');
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  info.classList.remove('hidden');

  if (file.size > 50 * 1024 * 1024) {
    // Too large for Base64 — simulate storage
    info.textContent = `📦 ${file.name} (${sizeMB} MB) — Large file: simulated storage mode`;
    pendingFileData = null;
    window._pendingFileName = file.name;
    window._pendingFileLarge = true;
    return;
  }
  window._pendingFileLarge = false;
  info.textContent = `📦 ${file.name} (${sizeMB} MB) — Loading...`;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingFileData = ev.target.result;
    info.textContent = `✅ ${file.name} (${sizeMB} MB) — Ready`;
  };
  reader.readAsDataURL(file);
}

function previewIcon(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingIconData = ev.target.result;
    const prev = document.getElementById('icon-preview');
    prev.innerHTML = `<img src="${ev.target.result}" alt="icon"/>`;
  };
  reader.readAsDataURL(file);
}

function uploadApp() {
  if (!currentUser?.isOwner) { toast('Only admin can upload', 'error'); return; }
  const name = document.getElementById('app-name').value.trim();
  const version = document.getElementById('app-version').value.trim() || 'v1.0';
  const category = document.getElementById('app-category').value;
  const desc = document.getElementById('app-desc').value.trim();
  const featured = document.getElementById('app-featured').checked;
  const editId = document.getElementById('edit-app-id').value;

  if (!name) { toast('App name is required', 'error'); return; }
  if (!category) { toast('Please select a category', 'error'); return; }
  if (!desc) { toast('Description is required', 'error'); return; }

  // Progress sim
  const wrap = document.getElementById('upload-progress-wrap');
  const fill = document.getElementById('upload-fill');
  const pct = document.getElementById('upload-pct');
  wrap.classList.remove('hidden');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 15 + 5;
    if (p >= 100) {
      p = 100; clearInterval(iv);
      fill.style.width = '100%'; pct.textContent = '100%';
      setTimeout(() => {
        wrap.classList.add('hidden');
        fill.style.width = '0%'; pct.textContent = '0%';
        finishUpload(name, version, category, desc, featured, editId);
      }, 300);
    } else { fill.style.width = p + '%'; pct.textContent = Math.round(p) + '%'; }
  }, 100);
}

function finishUpload(name, version, category, desc, featured, editId) {
  if (editId) {
    const idx = apps.findIndex(a => a.id === editId);
    if (idx >= 0) {
      apps[idx] = { ...apps[idx], name, version, category, desc, featured,
        icon: pendingIconData || apps[idx].icon,
        fileData: pendingFileData || apps[idx].fileData,
      };
      toast('App updated!', 'success');
    }
  } else {
    const app = {
      id: 'app_' + Date.now(),
      name, version, category, desc, featured,
      baseRating: 4.0,
      date: Date.now(),
      icon: pendingIconData || '',
      fileData: pendingFileData || null,
    };
    apps.unshift(app);
    toast('App uploaded successfully!', 'success');
  }
  saveApps();
  pendingFileData = null; pendingIconData = null;
  closeModal('upload-modal');
  resetUploadForm();
  renderStore();
  renderFeaturedBanner();
  if (currentUser?.isOwner) renderAdmin();
}

function resetUploadForm() {
  ['app-name','app-version','app-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('app-version').value = 'v1.0';
  document.getElementById('app-category').value = '';
  document.getElementById('app-featured').checked = false;
  document.getElementById('app-icon').value = '';
  document.getElementById('app-file').value = '';
  document.getElementById('icon-preview').innerHTML = '🎮';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('edit-app-id').value = '';
  document.getElementById('upload-modal-title').textContent = 'Upload New App';
}

// ===== ADMIN =====
function renderAdmin() {
  const list = document.getElementById('admin-app-list');
  if (!apps.length) { list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:30px;">No apps yet. Upload your first app!</p>'; return; }
  list.innerHTML = apps.map(app => `
    <div class="admin-app-row">
      <div class="admin-app-row-icon">${app.icon ? `<img src="${app.icon}" alt="icon"/>` : '🎮'}</div>
      <div class="admin-app-info">
        <strong>${esc(app.name)}</strong>
        <span>${esc(app.category)} · ${app.version || 'v1.0'} · ${new Date(app.date).toLocaleDateString()}</span>
      </div>
      <div class="admin-actions">
        <button class="btn-edit" onclick="editApp('${app.id}')">✏ Edit</button>
        <button class="btn-feature" onclick="toggleFeature('${app.id}')">${app.featured ? '★ Unfeature' : '☆ Feature'}</button>
        <button class="btn-danger" onclick="deleteApp('${app.id}')">🗑 Delete</button>
      </div>
    </div>
  `).join('');
}

function deleteApp(id) {
  if (!confirm('Delete this app?')) return;
  apps = apps.filter(a => a.id !== id);
  saveApps();
  renderAdmin();
  renderStore();
  renderFeaturedBanner();
  toast('App deleted', 'info');
}

function toggleFeature(id) {
  const app = apps.find(a => a.id === id);
  if (app) { app.featured = !app.featured; saveApps(); renderAdmin(); renderStore(); renderFeaturedBanner(); toast(app.featured ? '⭐ App featured!' : 'App unfeatured', 'info'); }
}

function editApp(id) {
  const app = apps.find(a => a.id === id);
  if (!app) return;
  document.getElementById('edit-app-id').value = id;
  document.getElementById('upload-modal-title').textContent = 'Edit App';
  document.getElementById('app-name').value = app.name;
  document.getElementById('app-version').value = app.version || 'v1.0';
  document.getElementById('app-category').value = app.category;
  document.getElementById('app-desc').value = app.desc || '';
  document.getElementById('app-featured').checked = !!app.featured;
  if (app.icon) document.getElementById('icon-preview').innerHTML = `<img src="${app.icon}" alt="icon"/>`;
  pendingIconData = null; pendingFileData = null;
  openModal('upload-modal');
}

// ===== PROFILE =====
function renderProfile() {
  if (!currentUser) {
    document.getElementById('profile-name').textContent = 'Not Logged In';
    document.getElementById('profile-role').textContent = 'Guest';
    document.getElementById('my-downloads-list').innerHTML = '<p class="empty-state">Please login to see your profile.</p>';
    return;
  }
  document.getElementById('profile-name').textContent = currentUser.username;
  document.getElementById('profile-role').textContent = currentUser.isOwner ? '🛡 Admin (Owner)' : '👤 User';
  document.getElementById('profile-avatar').textContent = currentUser.google ? '🔵' : currentUser.isOwner ? '🛡' : '👤';

  const myDl = downloads[currentUser.username] || [];
  const dlList = document.getElementById('my-downloads-list');
  if (!myDl.length) { dlList.innerHTML = '<p class="empty-state">No downloads yet.</p>'; return; }
  dlList.innerHTML = myDl.map(d => `
    <div class="download-item">
      <div class="download-item-icon">${d.icon ? `<img src="${d.icon}" style="width:40px;height:40px;border-radius:10px;"/>` : '🎮'}</div>
      <div class="download-item-info">
        <strong>${esc(d.name)}</strong>
        <span>${esc(d.category)} · ${new Date(d.date).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeOnOverlay(e, id) { if (e.target.id === id) closeModal(id); }

// ===== TOAST =====
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== HELPERS =====
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ===== KEYBOARD ===== 
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['login-modal','upload-modal','app-modal','about-modal','contact-modal','privacy-modal'].forEach(id => closeModal(id));
  }
});
