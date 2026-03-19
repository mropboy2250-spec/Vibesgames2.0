// ========================= DATA INIT =========================
let apps = [];
let users = [];
let reviews = [];
let downloads = [];
let currentUser = null;
let nextId = 100;

// Load from localStorage
function loadData() {
    apps = JSON.parse(localStorage.getItem('vg_apps')) || [];
    users = JSON.parse(localStorage.getItem('vg_users')) || [];
    reviews = JSON.parse(localStorage.getItem('vg_reviews')) || [];
    downloads = JSON.parse(localStorage.getItem('vg_downloads')) || [];

    if (apps.length === 0) {
        // Sample apps
        apps.push({
            id: 1,
            name: 'Sample Game',
            category: 'Game',
            desc: 'A fun sample game',
            icon: null,
            file: 'sample.apk',
            size: '15 MB',
            rating: 4.5,
            version: '1.0',
            featured: true,
            uploadDate: new Date().toISOString()
        });
    }
    if (users.length === 0) {
        users.push({ user: 'ahmad', pass: 'ahmad123', role: 'owner' });
        users.push({ user: 'guest', pass: 'guest', role: 'user' });
    }
    nextId = Math.max(...apps.map(a => a.id), 0) + 1;
}

function saveData() {
    localStorage.setItem('vg_apps', JSON.stringify(apps));
    localStorage.setItem('vg_users', JSON.stringify(users));
    localStorage.setItem('vg_reviews', JSON.stringify(reviews));
    localStorage.setItem('vg_downloads', JSON.stringify(downloads));
}

// ========================= UI RENDER =========================
function renderApps(filter = 'all', search = '', sort = 'a-z') {
    let filtered = [...apps];
    if (search) {
        filtered = filtered.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filter === 'top') {
        filtered = filtered.filter(a => a.rating >= 4);
    } else if (filter === 'latest') {
        filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } else if (filter === 'featured') {
        filtered = filtered.filter(a => a.featured);
    }

    // Sorting
    if (sort === 'a-z') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'z-a') filtered.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'top-rated') filtered.sort((a, b) => b.rating - a.rating);
    else if (sort === 'newest') filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    const grid = document.getElementById('appsGrid');
    grid.innerHTML = filtered.map(app => `
        <div class="app-card" onclick="openAppModal(${app.id})">
            <div class="app-icon">${app.icon ? `<img src="${app.icon}">` : '📱'}</div>
            <div class="app-name">${app.name}</div>
            <div class="app-category">${app.category}</div>
            <div class="app-rating">${'★'.repeat(Math.floor(app.rating))}${app.rating % 1 ? '½' : ''}</div>
            <div class="app-version">v${app.version}</div>
        </div>
    `).join('');

    // Update featured banner
    const featured = apps.find(a => a.featured);
    if (featured) {
        document.getElementById('featuredTitle').innerText = `⚡ Featured: ${featured.name}`;
        document.getElementById('featuredDesc').innerText = featured.desc;
        document.getElementById('featuredDownloadBtn').onclick = () => downloadApp(featured.id);
    }
}

// ========================= APP MODAL =========================
window.openAppModal = (id) => {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    const appReviews = reviews.filter(r => r.appId === id);
    const avgRating = appReviews.length ? (appReviews.reduce((s, r) => s + r.rating, 0) / appReviews.length).toFixed(1) : app.rating;
    document.getElementById('appDetailContent').innerHTML = `
        <div class="app-detail">
            <div class="detail-icon">${app.icon ? `<img src="${app.icon}">` : '📱'}</div>
            <h2>${app.name}</h2>
            <p class="detail-category">${app.category} | v${app.version}</p>
            <p class="detail-desc">${app.desc}</p>
            <p><strong>Size:</strong> ${app.size || '~15 MB'}</p>
            <p><strong>Downloads:</strong> ${downloads.filter(d => d.appId === id).length}</p>
            <div class="rating-stars" data-app="${id}">
                ${[1,2,3,4,5].map(s => `<span class="star" data-rating="${s}">★</span>`).join('')}
            </div>
            <button class="btn" onclick="downloadApp(${id})">Download</button>
            <hr>
            <div class="reviews">
                <h4>Reviews</h4>
                <textarea id="reviewText" placeholder="Write a review..."></textarea>
                <button class="btn-small" onclick="addReview(${id})">Submit Review</button>
                <div id="reviewsList">
                    ${appReviews.map(r => `<div class="review-item"><strong>${r.user}:</strong> ${'★'.repeat(r.rating)} - ${r.text}</div>`).join('')}
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', (e) => {
            const rating = parseInt(e.target.dataset.rating);
            if (!currentUser) return alert('Please login to rate');
            addReview(id, rating, document.getElementById('reviewText')?.value || '');
        });
    });
    document.getElementById('appModal').style.display = 'block';
};

window.addReview = (appId, rating, text) => {
    if (!currentUser) return alert('Login first');
    const reviewText = document.getElementById('reviewText')?.value || text;
    if (!rating) rating = prompt('Rating (1-5):', 5);
    if (rating < 1 || rating > 5) return alert('Rating must be 1-5');
    reviews.push({
        id: Date.now(),
        appId,
        user: currentUser.user,
        rating: parseInt(rating),
        text: reviewText
    });
    saveData();
    openAppModal(appId);
};

// ========================= DOWNLOAD =========================
window.downloadApp = (id) => {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    showLoader();
    setTimeout(() => {
        downloads.push({ appId: id, user: currentUser?.user || 'guest', date: new Date().toISOString() });
        saveData();
        const content = `VibesGames APK\nApp: ${app.name}\nVersion: ${app.version}\nEnjoy!`;
        const blob = new Blob([content], { type: 'application/vnd.android.package-archive' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${app.name}.apk`;
        a.click();
        URL.revokeObjectURL(url);
        hideLoader();
        showToast('Downloaded successfully!');
    }, 1500);
};

// ========================= UPLOAD =========================
document.getElementById('uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'owner') return alert('Only owner can upload');
    const name = document.getElementById('appName').value;
    const category = document.getElementById('appCategory').value;
    const desc = document.getElementById('appDesc').value;
    const featured = document.getElementById('featuredCheck').checked;
    const file = document.getElementById('appFile').files[0];
    const iconFile = document.getElementById('appIcon').files[0];

    let iconData = null;
    if (iconFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            iconData = e.target.result;
            finishUpload();
        };
        reader.readAsDataURL(iconFile);
    } else {
        finishUpload();
    }

    function finishUpload() {
        const newApp = {
            id: nextId++,
            name,
            category,
            desc,
            icon: iconData,
            file: file ? file.name : 'dummy.apk',
            size: file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '~1 MB',
            rating: 4.0,
            version: '1.0',
            featured,
            uploadDate: new Date().toISOString()
        };
        apps.push(newApp);
        saveData();
        renderApps();
        document.getElementById('uploadForm').reset();
        document.getElementById('iconPreview').innerHTML = '';
        showToast('App uploaded!');
    }
});

// ========================= LOGIN =========================
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const found = users.find(u => u.user === user && u.pass === pass);
    if (found) {
        currentUser = found;
        localStorage.setItem('vg_current', JSON.stringify(found));
        updateUI();
        document.getElementById('loginModal').style.display = 'none';
        showToast(`Welcome ${found.user}!`);
    } else {
        alert('Invalid credentials');
    }
});

document.getElementById('googleLoginBtn').addEventListener('click', () => {
    const names = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley'];
    const random = names[Math.floor(Math.random() * names.length)];
    currentUser = { user: random + '_google', role: 'user' };
    localStorage.setItem('vg_current', JSON.stringify(currentUser));
    updateUI();
    document.getElementById('loginModal').style.display = 'none';
    showToast(`Signed in as ${random} (Google)`);
});

function updateUI() {
    if (currentUser) {
        document.getElementById('userNameDisplay').innerText = currentUser.user;
        if (currentUser.role === 'owner') {
            document.getElementById('uploadSection').classList.remove('hidden');
        } else {
            document.getElementById('uploadSection').classList.add('hidden');
        }
        renderProfile();
    } else {
        document.getElementById('userNameDisplay').innerText = 'Guest';
        document.getElementById('uploadSection').classList.add('hidden');
    }
}

// ========================= PROFILE =========================
function renderProfile() {
    document.getElementById('profileUsername').innerText = currentUser?.user || 'Guest';
    document.getElementById('profileRole').innerText = currentUser?.role || 'user';

    if (currentUser?.role === 'owner') {
        const ownerApps = apps.filter(a => true); // all apps
        document.getElementById('ownerAppsGrid').innerHTML = ownerApps.map(app => `
            <div class="app-card">
                <div class="app-icon">${app.icon ? `<img src="${app.icon}">` : '📱'}</div>
                <div class="app-name">${app.name}</div>
                <div class="app-actions">
                    <button onclick="deleteApp(${app.id})" class="btn-small">🗑️</button>
                    <button onclick="toggleFeature(${app.id})" class="btn-small">⭐</button>
                </div>
            </div>
        `).join('');
    }

    const userDownloads = downloads.filter(d => d.user === currentUser?.user);
    document.getElementById('downloadedApps').innerHTML = userDownloads.map(d => {
        const app = apps.find(a => a.id === d.appId);
        return `<li>${app?.name || 'Unknown'} - ${new Date(d.date).toLocaleDateString()}</li>`;
    }).join('');
}

window.deleteApp = (id) => {
    apps = apps.filter(a => a.id !== id);
    saveData();
    renderApps();
    renderProfile();
    showToast('App deleted');
};

window.toggleFeature = (id) => {
    const app = apps.find(a => a.id === id);
    if (app) {
        app.featured = !app.featured;
        saveData();
        renderApps();
        showToast(app.featured ? 'Featured' : 'Unfeatured');
    }
};

// ========================= UTILS =========================
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

// ========================= EVENT LISTENERS =========================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    const saved = localStorage.getItem('vg_current');
    if (saved) currentUser = JSON.parse(saved);
    updateUI();
    renderApps();

    // Search & filters
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderApps(
            document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
            e.target.value,
            document.getElementById('sortSelect').value
        );
    });
    document.getElementById('sortSelect').addEventListener('change', (e) => {
        renderApps(
            document.querySelector('.filter-btn.active')?.dataset.filter || 'all',
            document.getElementById('searchInput').value,
            e.target.value
        );
    });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderApps(
                e.target.dataset.filter,
                document.getElementById('searchInput').value,
                document.getElementById('sortSelect').value
            );
        });
    });

    // Modals
    document.getElementById('userBadge').addEventListener('click', () => {
        if (currentUser) {
            document.getElementById('profileSection').classList.remove('hidden');
            document.getElementById('mainContent').classList.add('hidden');
            renderProfile();
        } else {
            document.getElementById('loginModal').style.display = 'block';
        }
    });
    document.querySelectorAll('.close').forEach(el => {
        el.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
            document.getElementById('profileSection').classList.add('hidden');
            document.getElementById('mainContent').classList.remove('hidden');
        });
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('vg_current');
        updateUI();
        document.getElementById('profileSection').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        showToast('Logged out');
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = document.querySelector('#themeToggle i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    });

    // Footer modals (simulated)
    document.getElementById('aboutLink').addEventListener('click', (e) => {
        e.preventDefault();
        alert('VibesGames 2.0 – Simple app store for everyone.');
    });
    document.getElementById('contactLink').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Email: support@vibesgames.com');
    });
    document.getElementById('privacyLink').addEventListener('click', (e) => {
        e.preventDefault();
        alert('We respect your privacy. No data collected.');
    });

    // Icon preview
    document.getElementById('appIcon').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('iconPreview').innerHTML = `<img src="${e.target.result}">`;
            };
            reader.readAsDataURL(file);
        }
    });
});
