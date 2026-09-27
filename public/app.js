class App {
  constructor() {
    this.token = localStorage.getItem('zaad_token');
    this.userId = localStorage.getItem('zaad_userId');
    this.role = localStorage.getItem('zaad_role');
    this.apiBase = 'http://localhost:3000/api';
    this.init();
  }

  async init() {
    if (!this.token) {
      this.showAuthPage();
    } else {
      this.showAppPage();
      await this.loadContent();
    }
  }

  async request(endpoint, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers.Authorization = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(this.apiBase + endpoint, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Request failed:', e);
      return null;
    }
  }

  async register(username, email, password) {
    const data = await this.request('/auth/register', 'POST', { username, email, password });
    if (data && data.token) {
      this.saveAuth(data.token, data.userId, data.role);
      this.showAppPage();
      await this.loadContent();
    }
  }

  async login(email, password) {
    const data = await this.request('/auth/login', 'POST', { email, password });
    if (data && data.token) {
      this.saveAuth(data.token, data.userId, data.role);
      this.showAppPage();
      await this.loadContent();
    }
  }

  saveAuth(token, userId, role) {
    this.token = token;
    this.userId = userId;
    this.role = role;
    localStorage.setItem('zaad_token', token);
    localStorage.setItem('zaad_userId', userId);
    localStorage.setItem('zaad_role', role);
  }

  logout() {
    this.token = null;
    this.userId = null;
    this.role = null;
    localStorage.clear();
    this.showAuthPage();
  }

  async loadContent() {
    this.surahs = await this.request('/content/surahs') || [];
    this.athkar = await this.request('/content/athkar') || [];
    this.hadith = await this.request('/content/hadith') || [];
  }

  showAuthPage() {
    document.getElementById('app').innerHTML = `
      <div class="auth-container">
        <h1>زاد المسلم</h1>
        <div class="auth-tabs">
          <button class="tab active" onclick="app.switchAuthTab('login')">دخول</button>
          <button class="tab" onclick="app.switchAuthTab('register')">تسجيل</button>
        </div>
        <form id="authForm" class="auth-form" onsubmit="app.handleAuth(event)">
          <div id="loginFields">
            <input type="email" id="email" placeholder="البريد الإلكتروني" required>
            <input type="password" id="password" placeholder="كلمة المرور" required>
          </div>
          <div id="registerFields" hidden>
            <input type="text" id="username" placeholder="اسم المستخدم">
            <input type="email" id="regEmail" placeholder="البريد الإلكتروني">
            <input type="password" id="regPassword" placeholder="كلمة المرور">
          </div>
          <button type="submit" class="btn">دخول</button>
          <p id="authError" class="error"></p>
        </form>
      </div>
    `;
  }

  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tabs .tab').forEach((b, i) => {
      b.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
    });
    document.getElementById('loginFields').hidden = tab !== 'login';
    document.getElementById('registerFields').hidden = tab !== 'register';
    const btn = document.querySelector('.auth-form button[type="submit"]');
    btn.textContent = tab === 'login' ? 'دخول' : 'تسجيل';
    window.currentAuthTab = tab;
  }

  async handleAuth(e) {
    e.preventDefault();
    const tab = window.currentAuthTab || 'login';
    if (tab === 'login') {
      await this.login(document.getElementById('email').value, document.getElementById('password').value);
    } else {
      await this.register(
        document.getElementById('username').value,
        document.getElementById('regEmail').value,
        document.getElementById('regPassword').value
      );
    }
  }

  showAppPage() {
    document.getElementById('app').innerHTML = `
      <header class="app-header">
        <h1>زاد المسلم</h1>
        <button class="btn secondary" onclick="app.logout()">خروج</button>
      </header>
      <main class="app-main">
        <nav class="tabs">
          <button class="tab active" onclick="app.showView('home')">الرئيسية</button>
          <button class="tab" onclick="app.showView('quran')">القرآن</button>
          <button class="tab" onclick="app.showView('athkar')">الأذكار</button>
          <button class="tab" onclick="app.showView('hadith')">الحديث</button>
          <button class="tab" onclick="app.showView('tracker')">المتابعة</button>
        </nav>
        <div id="viewContainer"></div>
      </main>
    `;
    this.showView('home');
  }

  showView(view) {
    document.querySelectorAll('.tabs .tab').forEach((b, i) => {
      const views = ['home', 'quran', 'athkar', 'hadith', 'tracker'];
      b.classList.toggle('active', views[Array.from(document.querySelectorAll('.tabs .tab')).indexOf(b)] === view);
    });
    const container = document.getElementById('viewContainer');
    switch (view) {
      case 'home':
        container.innerHTML = `<h2>أهلا وسهلا</h2><p>اختر قسم من الأعلى لبدء الاستفادة من المحتوى.</p>`;
        break;
      case 'quran':
        this.renderSurahs();
        break;
      case 'athkar':
        this.renderAthkar();
        break;
      case 'hadith':
        this.renderHadith();
        break;
      case 'tracker':
        this.renderTracker();
        break;
    }
  }

  renderSurahs() {
    const html = this.surahs.map(s => `
      <div class="item">
        <b>${s.id}. ${s.name}</b>
        <div>${s.type} • ${s.verses} آية</div>
        <small>الجزء ${s.juz}</small>
      </div>
    `).join('');
    document.getElementById('viewContainer').innerHTML = `<h2>سور القرآن</h2><div class="list">${html}</div>`;
  }

  renderAthkar() {
    const html = this.athkar.map(a => `
      <div class="item">
        <p>${a.text}</p>
        <div>${a.category} • ${a.source}</div>
        <button class="mini" onclick="app.recordActivity('athkar_${a.id}')">تسجيل</button>
      </div>
    `).join('');
    document.getElementById('viewContainer').innerHTML = `<h2>الأذكار</h2><div class="list">${html}</div>`;
  }

  renderHadith() {
    const html = this.hadith.map(h => `
      <div class="item">
        <b>${h.title}</b>
        <p>${h.text}</p>
        <small>${h.source}</small>
      </div>
    `).join('');
    document.getElementById('viewContainer').innerHTML = `<h2>الأحاديث</h2><div class="list">${html}</div>`;
  }

  renderTracker() {
    const today = new Date().toISOString().split('T')[0];
    const html = `
      <h2>متابعة اليوم</h2>
      <div class="tracker-form">
        <label><input type="checkbox" data-tracker="prayer_fajr"> صلاة الفجر</label>
        <label><input type="checkbox" data-tracker="prayer_dhuhr"> صلاة الظهر</label>
        <label><input type="checkbox" data-tracker="prayer_asr"> صلاة العصر</label>
        <label><input type="checkbox" data-tracker="prayer_maghrib"> صلاة المغرب</label>
        <label><input type="checkbox" data-tracker="prayer_isha"> صلاة العشاء</label>
        <label><input type="checkbox" data-tracker="athkar_morning"> أذكار الصباح</label>
        <label><input type="checkbox" data-tracker="athkar_evening"> أذكار المساء</label>
        <label><input type="checkbox" data-tracker="quran_read"> قراءة القرآن</label>
        <button class="btn" onclick="app.saveTracker('${today}')">حفظ</button>
      </div>
    `;
    document.getElementById('viewContainer').innerHTML = html;
  }

  async saveTracker(date) {
    const data = {};
    document.querySelectorAll('.tracker-form input[type="checkbox"]').forEach(cb => {
      data[cb.dataset.tracker] = cb.checked ? 1 : 0;
    });
    await this.request('/progress/save', 'POST', { date, data });
    alert('تم حفظ النشاط');
  }

  recordActivity(activity) {
    const today = new Date().toISOString().split('T')[0];
    const data = { [activity]: 1 };
    this.request('/progress/save', 'POST', { date: today, data });
    alert('تم تسجيل النشاط');
  }
}

const app = new App();
