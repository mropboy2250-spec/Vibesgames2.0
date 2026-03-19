// ==================== DATABASE (IndexedDB – Unlimited Storage) ====================
let db;
let currentUser = null; // { name, email, picture, isAdmin }

const DB_NAME = 'VibesGamesDB';
const DB_VERSION = 1;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('apps')) {
                const store = db.createObjectStore('apps', { keyPath: 'id', autoIncrement: true });
                store.createIndex('title', 'title');
                store.createIndex('developer', 'developer');
                store.createIndex('rating', 'rating');
            }
            if (!db.objectStoreNames.contains('users')) {
                db.createObjectStore('users', { keyPath: 'email' });
            }
            if (!db.objectStoreNames.contains('ratings')) {
                db.createObjectStore('ratings', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// ==================== LOAD / SAVE APPS ====================
let apps = [];

async function loadApps() {
    const tx = db.transaction('apps', 'readonly');
    const store = tx.objectStore('apps');
    apps = await new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
    }) || [];
    renderHome();
}

async function saveApp(app) {
    const tx = db.transaction('apps', 'readwrite');
    const store = tx.objectStore('apps');
    await store.add(app);
    await loadApps();
}

async function updateApp(app) {
    const tx = db.transaction('apps', 'readwrite');
    const store = tx.objectStore('apps');
    await store.put(app);
    await loadApps();
}

async function deleteApp(id) {
    const tx = db.transaction('apps', 'readwrite');
    const store = tx.objectStore('apps');
    await store.delete(id);
    await loadApps();
}

// ==================== SAMPLE APPS ====================
async function addSampleApps() {
    const sample = [
        { title: 'PUBG Mobile', icon: 'https://via.placeholder.com/80?text=PUBG', size: '1.2 GB', downloads: 15000, rating: 4.5, developer: 'admin' },
        { title: 'WhatsApp', icon: 'https://via.placeholder.com/80?text=WA', size: '45 MB', downloads: 50200, rating: 4.8, developer: 'admin' },
        { title: 'Netflix', icon: 'https://via.placeholder.com/80?text=Netflix', size: '25 MB', downloads: 30000, rating: 4.7, developer: 'admin' },
    ];
    for (let s of sample) {
        await saveApp(s);
    }
}

// ==================== RENDER HOME ====================
function renderHome() {
    const main = document.getElementById('mainContent');
    const topApps = [...apps].sort((a,b) => b.downloads - a.downloads).slice(0, 10);
    const topRated = [...apps].sort((a,b) => b.rating - a.rating).slice(0, 10);

    main.innerHTML = `
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="Search apps..." onkeyup="searchApps()">
        </div>
        <div class="tabs">
            <span class="tab active" onclick="showTab('home')">Home</span>
            <span class="tab" onclick="showTab('top')">Top Downloads</span>
            <span class="tab" onclick="showTab('rated')">Top Rated</span>
            ${currentUser?.isAdmin ? `<span class="tab" onclick="showDashboard()">Dashboard</span>` : ''}
        </div>
        <div id="homeContent">
            <h3>🔥 Top Downloads</h3>
            <div class="app-grid" id="topGrid">
                ${topApps.map(app => renderAppCard(app)).join('')}
            </div>
            <h3>⭐ Top Rated</h3>
            <div class="app-grid" id="ratedGrid">
                ${topRated.map(app => renderAppCard(app)).join('')}
            </div>
        </div>
        <div id="searchResults" style="display:none;"></div>
    `;
}

function renderAppCard(app) {
    return `
        <div class="app-card" onclick="openAppModal(${app.id})">
            <img src="${app.icon || 'https://via.placeholder.com/80'}" class="app-icon">
            <div class="app-title">${app.title}</div>
            <div class="app-meta">
                <span>⭐ ${app.rating || 0}</span>
                <span>📥 ${app.downloads || 0}</span>
            </div>
        </div>
    `;
}

function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    if (tab === 'home') {
        document.getElementById('homeContent').style.display = 'block';
        document.getElementById('searchResults').style.display = 'none';
    } else if (tab === 'top') {
        const top = [...apps].sort((a,b) => b.downloads - a.downloads);
        document.getElementById('homeContent').style.display = 'none';
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchResults').innerHTML = `<h3>Top Downloads</h3><div class="app-grid">${top.map(renderAppCard).join('')}</div>`;
    } else if (tab === 'rated') {
        const rated = [...apps].sort((a,b) => b.rating - a.rating);
        document.getElementById('homeContent').style.display = 'none';
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchResults').innerHTML = `<h3>Top Rated</h3><div class="app-grid">${rated.map(renderAppCard).join('')}</div>`;
    }
}

function searchApps() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    if (term.length < 2) return;
    const results = apps.filter(a => a.title.toLowerCase().includes(term));
    document.getElementById('homeContent').style.display = 'none';
    document.getElementById('searchResults').style.display = 'block';
    document.getElementById('searchResults').innerHTML = `<h3>Search Results</h3><div class="app-grid">${results.map(renderAppCard).join('')}</div>`;
}

// ==================== APP MODAL ====================
function openAppModal(id) {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    const html = `
        <h2>${app.title}</h2>
        <img src="${app.icon || 'https://via.placeholder.com/200'}" style="width:100%; border-radius:1rem;">
        <p><strong>Size:</strong> ${app.size}</p>
        <p><strong>Downloads:</strong> ${app.downloads}</p>
        <p><strong>Rating:</strong> ⭐ ${app.rating || 0}</p>
        <p><strong>Developer:</strong> ${app.developer}</p>
        <button class="btn" onclick="downloadApp(${app.id})">Download APK</button>
        <hr>
        <h4>Rate this app</h4>
        <select id="ratingSelect">
            <option value="1">1 ⭐</option><option value="2">2 ⭐</option><option value="3">3 ⭐</option>
            <option value="4">4 ⭐</option><option value="5">5 ⭐</option>
        </select>
        <button class="btn" onclick="rateApp(${app.id})">Submit Rating</button>
        ${currentUser?.isAdmin ? `<button class="btn" style="background:#f72585;" onclick="deleteAppModal(${app.id})">Delete App</button>` : ''}
    `;
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('appModal').style.display = 'flex';
}

function downloadApp(id) {
    const app = apps.find(a => a.id === id);
    if (app) {
        app.downloads = (app.downloads || 0) + 1;
        updateApp(app);
        alert(`Downloading ${app.title}... (simulated)`);
    }
    closeModal();
}

async function rateApp(id) {
    const rating = parseInt(document.getElementById('ratingSelect').value);
    const app = apps.find(a => a.id === id);
    if (app) {
        // Simple average (just for demo)
        app.rating = ((app.rating || 0) + rating) / 2;
        await updateApp(app);
        alert('Thanks for rating!');
        closeModal();
    }
}

// ==================== ADMIN DASHBOARD (Ahmad ka area) ====================
function showDashboard() {
    if (!currentUser?.isAdmin) {
        alert('Sirf Ahmad ke liye!');
        return;
    }
    const myApps = apps.filter(a => a.developer === 'ahmad');
    const html = `
        <h2>Admin Dashboard (Ahmad)</h2>
        <div class="upload-area" onclick="document.getElementById('apkUpload').click()">
            <i class="fas fa-cloud-upload-alt" style="font-size:2rem;"></i>
            <p>Click to upload APK (up to 1GB+)</p>
            <input type="file" id="apkUpload" accept=".apk" style="display:none;" onchange="uploadApp()">
        </div>
        <div class="app-list">
            <h3>Your Uploaded Apps</h3>
            ${myApps.map(app => `
                <div class="app-row">
                    <img src="${app.icon || 'https://via.placeholder.com/40'}">
                    <div><strong>${app.title}</strong> (${app.downloads} downloads)</div>
                    <button onclick="deleteApp(${app.id})">🗑️</button>
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('mainContent').innerHTML = html;
}

async function uploadApp() {
    const file = document.getElementById('apkUpload').files[0];
    if (!file) return;
    if (!file.name.endsWith('.apk')) {
        alert('Sirf APK file allowed hai!');
        return;
    }
    const title = prompt('App ka naam?', file.name.replace('.apk',''));
    if (!title) return;
    const newApp = {
        title: title,
        icon: 'https://via.placeholder.com/80?text=' + title.charAt(0),
        size: (file.size / (1024*1024)).toFixed(2) + ' MB',
        downloads: 0,
        rating: 0,
        developer: 'ahmad',
    };
    await saveApp(newApp);
    alert('App upload ho gayi!');
    showDashboard();
}

async function deleteAppModal(id) {
    if (confirm('Pakka delete?')) {
        await deleteApp(id);
        closeModal();
    }
}

// ==================== LOGIN SYSTEM ====================
document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').style.display = 'flex';
});

document.getElementById('googleLoginBtn').addEventListener('click', () => {
    // Simulated Google login
    currentUser = {
        name: 'Ahmad (Google)',
        email: 'ahmad@gmail.com',
        picture: '',
        isAdmin: true  // Sirf Ahmad admin hai
    };
    updateUI();
    closeModal();
});

document.getElementById('anyLoginBtn').addEventListener('click', () => {
    const name = document.getElementById('anyName').value || 'Guest';
    currentUser = {
        name: name,
        email: name + '@demo.com',
        picture: '',
        isAdmin: (name.toLowerCase() === 'ahmad') // Sirf Ahmad admin
    };
    updateUI();
    closeModal();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    updateUI();
    renderHome();
});

function updateUI() {
    if (currentUser) {
        document.getElementById('displayName').innerText = `👤 ${currentUser.name}`;
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
    } else {
        document.getElementById('displayName').innerText = '';
        document.getElementById('loginBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'none';
    }
    renderHome(); // refresh home
}

// ==================== CLOSE MODALS ====================
document.querySelectorAll('.close').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });
});

function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// ==================== INIT ====================
window.onload = async () => {
    await openDB();
    await loadApps();
    if (apps.length === 0) {
        await addSampleApps();
        await loadApps();
    }
    renderHome();
};
