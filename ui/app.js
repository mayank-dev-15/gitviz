(function() {
  'use strict';

  const repoInput = document.getElementById('repoInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const loginBtn = document.getElementById('loginBtn');
  const userInfo = document.getElementById('userInfo');
  const mainEl = document.getElementById('main');
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');

  let currentData = null;

  function esc(s) { return String(s).replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  })}

  async function api(url) {
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.json().catch(function() { return {error: r.statusText} });
      throw new Error(body.error || 'Request failed');
    }
    return r.json();
  }

  async function checkAuth() {
    try {
      const data = await api('/api/user');
      if (data.logged_in) {
        userInfo.innerHTML = '<img src="' + esc(data.avatar_url) + '" class="avatar" alt="">' + esc(data.login);
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = function() { window.location.href = '/api/logout' };
      } else if (data.token_mode) {
        userInfo.textContent = 'Using GITHUB_TOKEN';
        loginBtn.style.display = 'none';
      } else {
        userInfo.textContent = '';
        loginBtn.textContent = 'Login with GitHub';
        loginBtn.onclick = function() { window.location.href = '/auth/github' };
      }
    } catch(e) {
      userInfo.textContent = '';
    }
  }

  function drawLangChart(data) {
    const canvas = document.getElementById('langChart');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
      ctx.fillText('No language data', w/2, h/2);
      return;
    }

    const pad = { top: 10, bottom: 25, left: 90, right: 20 };
    const bw = w - pad.left - pad.right;
    const bh = (h - pad.top - pad.bottom) / data.length;
    const barH = Math.max(12, bh - 4);

    data.forEach(function(lang, i) {
      const y = pad.top + i * bh;
      const barW = (lang.pct / 100) * bw;

      ctx.fillStyle = lang.color || '#58a6ff';
      ctx.fillRect(pad.left, y, Math.max(barW, 2), barH);

      ctx.fillStyle = '#c9d1d9';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(lang.name, pad.left - 6, y + barH - 3);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#8b949e';
      ctx.font = '10px system-ui';
      ctx.fillText(lang.pct.toFixed(1) + '%', pad.left + Math.max(barW, 2) + 4, y + barH - 3);
    });
  }

  function drawCommitChart(data) {
    const canvas = document.getElementById('commitChart');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
      ctx.fillText('No commit data', w/2, h/2);
      return;
    }

    const pad = { top: 10, bottom: 25, left: 40, right: 10 };
    const bw = w - pad.left - pad.right;
    const bh = h - pad.top - pad.bottom;

    const maxCommits = Math.max(1, ...data.map(function(d) { return d.commits }));
    const barW = Math.max(4, bw / data.length - 2);

    data.forEach(function(d, i) {
      const x = pad.left + (i / data.length) * bw;
      const barH = (d.commits / maxCommits) * bh;
      const y = pad.top + bh - barH;

      ctx.fillStyle = '#1f6feb';
      ctx.fillRect(x, y, barW, barH);

      if (i % Math.max(1, Math.floor(data.length / 8)) === 0) {
        ctx.fillStyle = '#8b949e';
        ctx.font = '8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(d.week.slice(5), x + barW/2, h - 5);
      }
    });
  }

  function renderContributors(authors, busFactor) {
    const tbody = document.getElementById('contribBody');
    if (!authors || authors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8b949e">No contributor data</td></tr>';
      return;
    }

    document.getElementById('busFactor').textContent = 'Bus Factor: ' + busFactor;

    const maxCommits = Math.max(1, authors[0].commits);
    tbody.innerHTML = authors.map(function(a) {
      const pct = (a.commits / maxCommits) * 100;
      return '<tr>' +
        '<td>' + (a.avatar_url ? '<img src="' + esc(a.avatar_url) + '" class="avatar" alt="">' : '') + '</td>' +
        '<td><a class="login" href="https://github.com/' + esc(a.login) + '" target="_blank">' + esc(a.login) + '</a></td>' +
        '<td>' + a.commits + ' <span class="pct-bar" style="width:' + pct + 'px;background:#1f6feb"></span></td>' +
        '<td style="color:#2ea043">+' + a.additions + '</td>' +
        '<td style="color:#f85149">-' + a.deletions + '</td>' +
        '<td>' + a.pct.toFixed(1) + '%</td></tr>';
    }).join('');
  }

  function renderReleases(releases) {
    const el = document.getElementById('releases');
    if (!releases || releases.length === 0) {
      el.innerHTML = '<div style="color:#8b949e;padding:10px;font-size:13px">No releases</div>';
      return;
    }
    el.innerHTML = releases.map(function(r) {
      return '<div class="rel-item">' +
        '<a class="rel-name" href="' + esc(r.url) + '" target="_blank">' + esc(r.name || r.tag_name) + '</a>' +
        '<span class="rel-tag">' + esc(r.tag_name) + '</span>' +
        '<span class="rel-date">' + (r.published_at ? r.published_at.slice(0, 10) : '') + '</span></div>';
    }).join('');
  }

  function renderEmbed(data) {
    const base = window.location.origin;
    const url = 'https://github.com/' + data.owner + '/' + data.repo;
    const badgeURL = base + '/api/badge?url=' + encodeURIComponent(url);
    const md = '[![GitViz](' + badgeURL + ')](' + url + ')';
    document.getElementById('embedCode').textContent = md;
    document.getElementById('badgePreview').innerHTML =
      '<img src="' + badgeURL + '" alt="GitViz badge" style="max-width:100%">';
  }

  function showData(data) {
    currentData = data;
    mainEl.style.display = 'block';
    loadingEl.style.display = 'none';
    errorEl.style.display = 'none';

    document.getElementById('stars').textContent = data.stars;
    document.getElementById('forks').textContent = data.forks;
    document.getElementById('issues').textContent = data.open_issues;
    document.getElementById('prs').textContent = data.open_prs;
    document.getElementById('license').textContent = data.license || '-';
    document.getElementById('lang').textContent = data.primary_lang || '-';

    drawLangChart(data.languages);
    drawCommitChart(data.stats.weekly_commits);
    renderContributors(data.stats.authors, data.stats.bus_factor);
    renderReleases(data.releases);
    renderEmbed(data);
  }

  async function analyze(url) {
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    mainEl.style.display = 'none';

    try {
      const data = await api('/api/repo?url=' + encodeURIComponent(url));
      showData(data);
    } catch(e) {
      loadingEl.style.display = 'none';
      errorEl.textContent = e.message;
      errorEl.style.display = 'block';
    }
  }

  function init() {
    checkAuth();

    analyzeBtn.addEventListener('click', function() {
      const url = repoInput.value.trim();
      if (url) analyze(url);
    });

    repoInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const url = repoInput.value.trim();
        if (url) analyze(url);
      }
    });

    // load default repo on start
    analyze('https://github.com/mayank-dev-15/mayank-dev-15');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
