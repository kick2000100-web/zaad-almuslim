class App {
  constructor() {
    this.root = document.getElementById('app');
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.active = 'home';
    this.searchQuery = '';
    this.content = { surahs: [], athkar: [], hadith: [], lectures: [], fiqh: [], courses: [] };
    this.init();
  }

  async init() {
    this.renderShell();
    this.bindEvents();
    if (this.token) {
      try {
        const me = await this.request('/api/auth/me');
        this.user = me;
        localStorage.setItem('user', JSON.stringify(me));
      } catch (error) {
        this.logout();
      }
    }
    await this.loadDashboard();
    this.showSection('home');
  }

  renderShell() {
    this.root.innerHTML = `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-mark">ز</div>
            <div>
              <strong>زاد المسلم</strong><br>
              <small class="muted">المنظومة الرقمية الإسلامية</small>
            </div>
          </div>
          <nav class="nav">
            <button class="active" data-target="home">الرئيسية</button>
            <button data-target="search">البحث</button>
            <button data-target="content">المحتوى</button>
            <button data-target="admin">الإدارة</button>
          </nav>
          <div id="authBar" class="row"></div>
        </div>
      </header>
      <main class="container">
        <section id="home" class="page-section"></section>
        <section id="search" class="page-section hidden"></section>
        <section id="content" class="page-section hidden"></section>
        <section id="admin" class="page-section hidden"></section>
      </main>
      <div class="footer-space"></div>
    `;
    this.renderAuthBar();
  }

  bindEvents() {
    document.body.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-target]');
      if (trigger) {
        this.showSection(trigger.dataset.target);
      }

      const authTrigger = event.target.closest('[data-auth-action]');
      if (authTrigger) {
        const action = authTrigger.dataset.authAction;
        if (action === 'login') this.showAuthModal('login');
        if (action === 'register') this.showAuthModal('register');
        if (action === 'logout') this.logout();
      }

      const searchTrigger = event.target.closest('[data-search-type]');
      if (searchTrigger) {
        this.loadSearch(searchTrigger.dataset.searchType);
      }

      const adminAction = event.target.closest('[data-admin-action]');
      if (adminAction) {
        const { adminAction: action, type, id } = adminAction.dataset;
        if (action === 'approve') this.updateContentStatus(type, Number(id), 'verified');
        if (action === 'reject') this.updateContentStatus(type, Number(id), 'rejected');
      }
    });

    document.body.addEventListener('submit', async (event) => {
      const form = event.target;
      if (form.matches('#authForm')) {
        event.preventDefault();
        const mode = form.dataset.mode;
        const payload = {
          username: form.username.value.trim(),
          email: form.email.value.trim(),
          password: form.password.value
        };
        if (mode === 'register') {
          await this.register(payload);
        } else {
          await this.login(payload);
        }
      }

      if (form.matches('#contentForm')) {
        event.preventDefault();
        const type = form.dataset.type;
        const data = Object.fromEntries(new FormData(form).entries());
        await this.createContent(type, data);
      }
    });

    document.body.addEventListener('input', (event) => {
      if (event.target.matches('#searchInput')) {
        this.searchQuery = event.target.value.trim();
        this.loadSearch('all');
      }
    });
  }

  renderAuthBar() {
    const authBar = document.getElementById('authBar');
    if (!this.user) {
      authBar.innerHTML = `
        <button class="primary" data-auth-action="login">تسجيل الدخول</button>
        <button class="ghost" data-auth-action="register">إنشاء حساب</button>
      `;
      return;
    }

    authBar.innerHTML = `
      <span class="muted">${this.user.username || 'مستخدم'}</span>
      <span class="chip">${this.user.role || 'user'}</span>
      <button class="ghost" data-auth-action="logout">تسجيل الخروج</button>
    `;
  }

  showSection(target) {
    this.active = target;
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => section.classList.add('hidden'));
    const activeSection = document.getElementById(target);
    if (activeSection) {
      activeSection.classList.remove('hidden');
    }
    document.querySelectorAll('[data-target]').forEach(button => {
      button.classList.toggle('active', button.dataset.target === target);
    });

    if (target === 'home') this.loadDashboard();
    if (target === 'content') this.renderContentSection();
    if (target === 'search') this.renderSearchSection();
    if (target === 'admin') this.renderAdminSection();
  }

  async loadDashboard() {
    const home = document.getElementById('home');
    if (!home) return;

    const [surahs, athkar, hadith, lectures, fiqh, courses] = await Promise.all([
      this.request('/api/content/surahs?limit=20'),
      this.request('/api/content/athkar?limit=20'),
      this.request('/api/content/hadith?limit=20'),
      this.request('/api/content/lectures?limit=20'),
      this.request('/api/content/fiqh?limit=20'),
      this.request('/api/content/courses?limit=20')
    ]);

    this.content = { surahs, athkar, hadith, lectures, fiqh, courses };

    home.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="stat">
          <div class="num">${surahs.length}</div>
          <div class="label">السور</div>
        </div>
        <div class="stat">
          <div class="num">${athkar.length}</div>
          <div class="label">الأذكار</div>
        </div>
        <div class="stat">
          <div class="num">${hadith.length}</div>
          <div class="label">الأحاديث</div>
        </div>
        <div class="stat">
          <div class="num">${lectures.length}</div>
          <div class="label">المحاضرات</div>
        </div>
      </div>

      <div class="grid grid-3">
        <div class="card">
          <div class="kicker">أخر المعلومات</div>
          <h2 class="headline" style="font-size:1.6rem; margin-top:12px;">القرآن</h2>
          <div class="list">
            ${surahs.slice(0, 5).map(s => `<div class="item"><h4>${s.name}</h4><div class="small muted">النوع: ${s.type} · الآيات: ${s.verses}</div></div>`).join('') || '<div class="item">لا توجد بيانات</div>'}
          </div>
        </div>

        <div class="card">
          <div class="kicker">المحتوى الموثق</div>
          <h2 class="headline" style="font-size:1.6rem; margin-top:12px;">الأذكار</h2>
          <div class="list">
            ${athkar.slice(0, 5).map(item => `<div class="item"><h4>${item.text}</h4><div class="small muted">${item.source}</div></div>`).join('') || '<div class="item">لا توجد بيانات</div>'}
          </div>
        </div>

        <div class="card">
          <div class="kicker">المنظومة</div>
          <h2 class="headline" style="font-size:1.6rem; margin-top:12px;">الملفات</h2>
          <div class="list">
            <div class="item"><h4>البحث الموحد</h4><div class="small muted">يبحث في القرآن، الحديث، المحاضرات، الفقه، الدورات.</div></div>
            <div class="item"><h4>المراجعة</h4><div class="small muted">تتبع محتوى قيد المراجعة مع صلاحيات الإداري.</div></div>
            <div class="item"><h4>التقدم</h4><div class="small muted">حفظ نشاط المستخدم ومدة المشاهدة.</div></div>
          </div>
        </div>
      </div>
    `;
  }

  renderContentSection() {
    const section = document.getElementById('content');
    const data = this.content;
    section.innerHTML = `
      <div class="card" style="margin-bottom:16px;">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div class="kicker">المحتوى</div>
            <h2 class="headline" style="font-size:1.7rem; margin-top:12px;">إدارة المحتوى</h2>
          </div>
          <button class="primary" data-target="search">بحث سريع</button>
        </div>
      </div>

      <div class="grid grid-2" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));">
        <div class="card">
          <h3>الأذكار</h3>
          <div class="list">
            ${this.renderList(data.athkar, 'athkar', 'text', 'source')}
          </div>
        </div>
        <div class="card">
          <h3>الحديث</h3>
          <div class="list">
            ${this.renderList(data.hadith, 'hadith', 'title', 'source')}
          </div>
        </div>
        <div class="card">
          <h3>المحاضرات</h3>
          <div class="list">
            ${this.renderList(data.lectures, 'lectures', 'title', 'speaker')}
          </div>
        </div>
        <div class="card">
          <h3>الفقه</h3>
          <div class="list">
            ${this.renderList(data.fiqh, 'fiqh', 'title', 'source')}
          </div>
        </div>
        <div class="card">
          <h3>الدورات</h3>
          <div class="list">
            ${this.renderList(data.courses, 'courses', 'title', 'instructor')}
          </div>
        </div>
        <div class="card">
          <h3>السور</h3>
          <div class="list">
            ${this.renderList(data.surahs, 'surahs', 'name', 'type')}
          </div>
        </div>
      </div>
    `;
  }

  renderList(items, type, titleKey, metaKey) {
    if (!items || !items.length) return '<div class="item">لا توجد بيانات</div>';
    return items.slice(0, 4).map(item => `
      <div class="item">
        <h4>${item[titleKey]}</h4>
        <div class="small muted">${item[metaKey] || 'غير محدد'}</div>
      </div>
    `).join('');
  }

  renderSearchSection() {
    const section = document.getElementById('search');
    section.innerHTML = `
      <div class="card">
        <div class="kicker">البحث الموحد</div>
        <h2 class="headline" style="font-size:1.7rem; margin-top:12px;">ابحث في المنظومة</h2>
        <div class="search-wrap">
          <input id="searchInput" class="field" type="text" value="${this.searchQuery}" placeholder="اكتب كلمة أو عنوانًا مثل: الفاتحة، الأذكار، الفقه..." />
          <button class="primary" data-search-type="all">بحث</button>
        </div>
        <div class="row" style="margin-top:12px;">
          <button class="small-btn" data-search-type="all">الكل</button>
          <button class="small-btn" data-search-type="surahs">السور</button>
          <button class="small-btn" data-search-type="athkar">الأذكار</button>
          <button class="small-btn" data-search-type="hadith">الأحاديث</button>
          <button class="small-btn" data-search-type="lectures">المحاضرات</button>
        </div>
        <div id="searchResults" style="margin-top:16px;"></div>
      </div>
    `;
    this.loadSearch('all');
  }

  async loadSearch(type = 'all') {
    const query = this.searchQuery || document.getElementById('searchInput')?.value || '';
    if (!query.trim()) {
      const results = document.getElementById('searchResults');
      if (results) results.innerHTML = '<div class="item">اكتب كلمة للبحث.</div>';
      return;
    }

    try {
      const data = await this.request(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
      const filtered = type === 'all' ? data.results : data.results.filter(item => item.type === type);
      const results = document.getElementById('searchResults');
      if (!results) return;
      if (!filtered.length) {
        results.innerHTML = '<div class="item">لا توجد نتائج مناسبة لهذه الكلمة.</div>';
        return;
      }
      results.innerHTML = filtered.map(item => `
        <div class="item">
          <div class="row" style="justify-content:space-between;">
            <h4>${item.title || item.name || 'غير محدد'}</h4>
            <span class="badge">${item.type}</span>
          </div>
          <div class="small muted">${item.meta || 'لا يوجد مصدر واضح'}</div>
        </div>
      `).join('');
    } catch (error) {
      document.getElementById('searchResults').innerHTML = `<div class="item error">${error.message || 'حدث خطأ أثناء البحث'}</div>`;
    }
  }

  async renderAdminSection() {
    const section = document.getElementById('admin');
    if (!this.user || !['admin', 'reviewer', 'content_manager', 'editor'].includes(this.user.role)) {
      section.innerHTML = `
        <div class="card auth-box">
          <div class="notice error">غير مسموح لك بالدخول إلى لوحة الإدارة. تحتاج إلى صلاحية مناسبة.</div>
        </div>
      `;
      return;
    }

    try {
      const review = await this.request('/api/admin/review');
      const rows = [];
      Object.entries(review).forEach(([type, items]) => {
        if (!items.length) return;
        rows.push(`
          <div class="card" style="margin-bottom:10px;">
            <h3>${this.camelCase(type)}</h3>
            ${items.map(item => `
              <div class="item">
                <div class="row" style="justify-content:space-between;">
                  <strong>${item.title || item.text || item.name || 'محتوى جديد'}</strong>
                  <span class="chip">${item.status || 'review'}</span>
                </div>
                <div class="small muted" style="margin-top:8px;">${item.source || item.meta || 'مصدر غير محدد'}</div>
                <div class="row" style="margin-top:10px;">
                  <button class="primary small-btn" data-admin-action="approve" data-type="${type}" data-id="${item.id}">اعتماد</button>
                  <button class="danger small-btn" data-admin-action="reject" data-type="${type}" data-id="${item.id}">رفض</button>
                </div>
              </div>
            `).join('')}
          </div>
        `);
      });

      section.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
          <div class="kicker">الإدارة</div>
          <h2 class="headline" style="font-size:1.7rem; margin-top:12px;">لوحة مراجعة المحتوى</h2>
        </div>
        ${rows.length ? rows.join('') : '<div class="card"><div class="notice success">لا توجد عناصر قيد المراجعة</div></div>'}

        <div class="card" style="margin-top:16px;">
          <h3>إضافة محتوى جديد</h3>
          <div class="form-grid">
            <form id="contentForm" data-type="athkar">
              <input class="field" name="category" placeholder="التصنيف: morning" value="morning" />
              <textarea class="area" name="text" placeholder="نص الذكر"></textarea>
              <input class="field" name="count" placeholder="العداد" value="3" />
              <input class="field" name="source" placeholder="المصدر" value="مراجعة داخلية" />
              <button class="primary" type="submit">إضافة ذكر</button>
            </form>
            <form id="contentForm" data-type="lectures">
              <input class="field" name="title" placeholder="عنوان المحاضرة" />
              <input class="field" name="speaker" placeholder="اسم المتحدث" />
              <input class="field" name="category" placeholder="الفئة" value="quran" />
              <textarea class="area" name="description" placeholder="وصف المحاضرة"></textarea>
              <input class="field" name="source" placeholder="المصدر" value="مراجعة داخلية" />
              <button class="primary" type="submit">إضافة محاضرة</button>
            </form>
          </div>
        </div>
      `;
    } catch (error) {
      section.innerHTML = `<div class="card"><div class="notice error">${error.message || 'تعذر تحميل لوحة الإدارة'}</div></div>`;
    }
  }

  async updateContentStatus(type, id, status) {
    try {
      await this.request(`/api/admin/content/${type}/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ status })
      });
      this.renderAdminSection();
    } catch (error) {
      alert(error.message || 'حدث خطأ أثناء التحديث');
    }
  }

  async createContent(type, data) {
    if (!this.token) {
      alert('يجب تسجيل الدخول أولًا');
      return;
    }
    const payload = { ...data };
    try {
      await this.request(`/api/admin/content/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: JSON.stringify(payload)
      });
      this.renderAdminSection();
    } catch (error) {
      alert(error.message || 'حدث خطأ أثناء إنشاء المحتوى');
    }
  }

  showAuthModal(mode) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="row" style="justify-content:space-between;">
          <h3>${mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h3>
          <button class="ghost" data-dismiss="auth">إغلاق</button>
        </div>
        <form id="authForm" data-mode="${mode}">
          ${mode === 'register' ? '<input class="field" name="username" placeholder="اسم المستخدم" required />' : ''}
          <input class="field" name="email" type="email" placeholder="البريد الإلكتروني" required />
          <input class="field" name="password" type="password" placeholder="كلمة المرور" required />
          <button class="primary" type="submit" style="width:100%;margin-top:12px;">${mode === 'login' ? 'دخول' : 'تسجيل'}</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const dismiss = modal.querySelector('[data-dismiss="auth"]');
    dismiss.addEventListener('click', () => modal.remove());
  }

  async login(data) {
    try {
      const result = await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: data.email, password: data.password })
      });
      this.token = result.token;
      this.user = { id: result.userId, role: result.role, username: result.username };
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
      this.renderAuthBar();
      document.querySelector('.modal')?.remove();
      this.showSection('home');
    } catch (error) {
      this.notify(error.message || 'فشل تسجيل الدخول', 'error');
    }
  }

  async register(data) {
    try {
      const result = await this.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: data.username, email: data.email, password: data.password })
      });
      this.token = result.token;
      this.user = { id: result.userId, role: result.role, username: data.username };
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
      this.renderAuthBar();
      document.querySelector('.modal')?.remove();
      this.showSection('home');
    } catch (error) {
      this.notify(error.message || 'فشل إنشاء الحساب', 'error');
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.renderAuthBar();
    this.showSection('home');
  }

  notify(message, type = 'success') {
    const existing = document.querySelector('.notice');
    if (existing) existing.remove();
    const notice = document.createElement('div');
    notice.className = `notice ${type === 'error' ? 'error' : 'success'}`;
    notice.textContent = message;
    const app = document.getElementById('home') || document.getElementById('content');
    if (app) app.prepend(notice);
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const response = await fetch(path, { ...options, headers });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
      throw new Error((data && data.error) || 'حدث خطأ غير متوقع');
    }
    return data;
  }

  camelCase(value) {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
}

window.addEventListener('DOMContentLoaded', () => new App());
