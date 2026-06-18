(function () {
  'use strict';

  var currentData = null;
  var currentUser = null;

  function $(id) { return document.getElementById(id) }

  var repoInput = $('repoInput');
  var analyzeBtn = $('analyzeBtn');
  var heroInput = $('heroInput');
  var heroBtn = $('heroBtn');
  var loginBtn = $('loginBtn');
  var userArea = $('userArea');
  var landing = $('landing');
  var dashboard = $('dashboard');
  var loading = $('loading');
  var repoName = $('repoName');
  var repoDesc = $('repoDesc');
  var statsGrid = $('statsGrid');
  var langCanvas = $('langChart');
  var commitCanvas = $('commitChart');
  var contribBody = $('contribBody');
  var busFactorBadge = $('busFactorBadge');
  var releaseList = $('releaseList');
  var embedCode = $('embedCode');
  var copyBtn = $('copyBtn');
  var badgePreview = $('badgePreview');
  var tokenInfo = $('tokenInfo');
  var newAnalysisBtn = $('newAnalysisBtn');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] }) }

  function animateCount(el, target) {
    var current = 0;
    var step = Math.max(1, Math.floor(target / 40));
    var interval = setInterval(function () {
      current += step;
      if (current >= target) { current = target; clearInterval(interval) }
      el.textContent = current;
    }, 20);
  }

  function showError(msg) {
    loading.style.display = 'none';
    var err = document.createElement('div');
    err.className = 'chart-card glass';
    err.style.cssText = 'text-align:center;padding:40px;color:#f85149;animation:fadeIn .3s';
    err.textContent = msg;
    var parent = dashboard.querySelector('.charts-row');
    if (parent) parent.before(err);
    else dashboard.appendChild(err);
  }

  function clearError() {
    dashboard.querySelectorAll('.chart-card[style*="color:#f85149"]').forEach(function (e) { e.remove() });
  }

  async function api(url) {
    var r = await fetch(url);
    if (!r.ok) {
      var body = await r.json().catch(function () { return {} });
      throw new Error(body.error || 'Request failed (' + r.status + ')');
    }
    return r.json();
  }

  // ---- Auth ----
  async function checkAuth() {
    try {
      var data = await api('/api/user');
      currentUser = data;
      if (data.logged_in) {
        userArea.innerHTML = '<div class="user-badge" style="display:flex;align-items:center;gap:6px"><img src="' + esc(data.avatar_url) + '" class="avatar" alt="" style="width:22px;height:22px;border-radius:50%">' + esc(data.login) + '</div>';
        loginBtn.style.display = 'none';
        loadUserRepos();
      } else if (data.token_mode) {
        tokenInfo.style.display = 'inline-block';
        tokenInfo.textContent = 'Token Active';
        loginBtn.style.display = 'none';
      } else {
        userArea.innerHTML = '';
        tokenInfo.style.display = 'none';
        loginBtn.style.display = 'flex';
      }
    } catch (e) {
      userArea.innerHTML = '';
    }
  }

  async function loadUserRepos() {
    try {
      var repos = await api('/api/user/repos');
      if (!repos || repos.length === 0) return;
      var publicRepos = repos.filter(function (r) { return !r.private && !r.fork }).slice(0, 12);
      if (publicRepos.length === 0) return;

      var suggestions = document.querySelector('.hero-suggestions');
      if (!suggestions) return;

      var header = suggestions.querySelector('span');
      var chips = suggestions.querySelectorAll('.chip');
      suggestions.innerHTML = '<span>Your repos:</span>';
      publicRepos.forEach(function (r) {
        var btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = r.full_name;
        btn.dataset.repo = r.html_url;
        btn.addEventListener('click', function () { triggerAnalyze(r.html_url) });
        suggestions.appendChild(btn);
      });
    } catch (e) { /* silent */ }
  }

  // ---- Charts ----
  function drawLangChart(data) {
    var ctx = langCanvas.getContext('2d');
    var w = langCanvas.width, h = langCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length === 0) {
      ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center'; ctx.font = '14px system-ui';
      ctx.fillText('No language data', w / 2, h / 2);
      return;
    }

    var pad = { top: 10, bottom: 28, left: 100, right: 50 };
    var bw = w - pad.left - pad.right;
    var barH = Math.min(26, (h - pad.top - pad.bottom) / data.length - 4);

    data.forEach(function (lang, i) {
      var y = pad.top + i * (barH + 4);
      var barW = (lang.pct / 100) * bw;
      var color = lang.color || '#58a6ff';

      ctx.fillStyle = 'rgba(255,255,255,.03)';
      ctx.fillRect(pad.left, y, bw, barH);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(pad.left, y, barW, barH);
      ctx.globalAlpha = 1;
      ctx.fillRect(pad.left, y, Math.max(barW, 2), barH);
      ctx.fillStyle = '#e6edf3';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(lang.name, pad.left - 8, y + barH / 2 + 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px system-ui';
      ctx.fillText(lang.pct.toFixed(1) + '%', pad.left + Math.max(barW, 4) + 6, y + barH / 2 + 4);
    });
  }

  function drawCommitChart(data) {
    var ctx = commitCanvas.getContext('2d');
    var w = commitCanvas.width, h = commitCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length < 2) {
      ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center'; ctx.font = '14px system-ui';
      ctx.fillText('Not enough commit data', w / 2, h / 2);
      return;
    }

    var pad = { top: 12, bottom: 28, left: 40, right: 16 };
    var bw = w - pad.left - pad.right;
    var bh = h - pad.top - pad.bottom;
    var maxVal = Math.max(1, data.reduce(function (m, d) { return Math.max(m, d.commits) }, 0)) * 1.15;

    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var gy = pad.top + (bh * (1 - i / 4));
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(w - pad.right, gy); ctx.stroke();
      ctx.fillStyle = '#484f58'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * i / 4) + '', pad.left - 6, gy + 3);
    }

    ctx.beginPath();
    data.forEach(function (d, i) {
      var x = pad.left + (i / (data.length - 1)) * bw;
      var barH = (d.commits / maxVal) * bh;
      var y = pad.top + bh - barH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + bw, pad.top + bh);
    ctx.lineTo(pad.left, pad.top + bh);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + bh);
    grad.addColorStop(0, 'rgba(31,111,235,.25)');
    grad.addColorStop(1, 'rgba(31,111,235,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    data.forEach(function (d, i) {
      var x = pad.left + (i / (data.length - 1)) * bw;
      var barH = (d.commits / maxVal) * bh;
      var y = pad.top + bh - barH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 2;
    ctx.stroke();

    data.forEach(function (d, i) {
      var x = pad.left + (i / (data.length - 1)) * bw;
      var barH = (d.commits / maxVal) * bh;
      var y = pad.top + bh - barH;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1f6feb';
      ctx.fill();
    });

    var skip = Math.max(1, Math.floor(data.length / 10));
    data.forEach(function (d, i) {
      if (i % skip === 0 || i === data.length - 1) {
        var x = pad.left + (i / (data.length - 1)) * bw;
        ctx.fillStyle = '#484f58'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(d.week.slice(5), x, h - 6);
      }
    });
  }

  // ---- Render ----
  function renderStats(data) {
    var items = [
      { icon: '⭐', label: 'Stars', value: data.stars },
      { icon: '🍴', label: 'Forks', value: data.forks },
      { icon: '⚠', label: 'Open Issues', value: data.open_issues },
      { icon: '🔀', label: 'Open PRs', value: data.open_prs },
      { icon: '📄', label: 'License', value: data.license || 'N/A', text: true },
      { icon: '🔤', label: 'Language', value: data.primary_lang || 'N/A', text: true },
      { icon: '📝', label: 'Commits (sampled)', value: data.stats.total_commits },
      { icon: '➕', label: 'Lines Added', value: data.stats.total_additions },
      { icon: '➖', label: 'Lines Deleted', value: data.stats.total_deletions },
      { icon: '👥', label: 'Contributors', value: data.stats.authors ? data.stats.authors.length : 0 },
    ];

    statsGrid.innerHTML = items.map(function (item, i) {
      var val = item.text ? esc(item.value) : '<span class="stat-number" data-count="' + item.value + '">0</span>';
      return '<div class="stat-card slide-up" style="animation-delay:' + (i * 0.05) + 's">' +
        '<span class="stat-icon">' + item.icon + '</span>' + val +
        '<span class="stat-label">' + item.label + '</span></div>';
    }).join('');

    setTimeout(function () {
      statsGrid.querySelectorAll('.stat-number[data-count]').forEach(function (el) {
        animateCount(el, parseInt(el.dataset.count));
      });
    }, 200);

    var bf = data.stats.bus_factor || 0;
    busFactorBadge.textContent = 'Bus Factor: ' + bf;
    busFactorBadge.className = 'bus-badge ' + (bf <= 1 ? 'bad' : bf <= 3 ? 'warn' : 'good');
  }

  function renderContributors(authors) {
    if (!authors || authors.length === 0) {
      contribBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8b949e;padding:20px">No contributor data</td></tr>';
      return;
    }
    var maxCommits = Math.max(1, authors[0].commits);
    contribBody.innerHTML = authors.map(function (a, i) {
      var pct = (a.commits / maxCommits) * 100;
      return '<tr style="animation:fadeIn .3s both;animation-delay:' + (i * 0.03) + 's">' +
        '<td>' + (a.avatar_url ? '<img src="' + esc(a.avatar_url) + '" class="avatar" alt="">' : '<span class="avatar" style="display:inline-block;background:#30363d"></span>') + '</td>' +
        '<td><a class="login" href="https://github.com/' + esc(a.login) + '" target="_blank">' + esc(a.login) + '</a></td>' +
        '<td>' + a.commits + ' <span class="pct-bar" style="width:' + pct + 'px;max-width:80px"></span></td>' +
        '<td style="color:#2ea043">+' + a.additions + '</td>' +
        '<td style="color:#f85149">-' + a.deletions + '</td>' +
        '<td>' + a.pct.toFixed(1) + '%</td></tr>';
    }).join('');
  }

  function renderReleases(releases) {
    if (!releases || releases.length === 0) {
      releaseList.innerHTML = '<div style="color:#8b949e;padding:16px;text-align:center;font-size:13px">No releases yet</div>';
      return;
    }
    releaseList.innerHTML = releases.map(function (r, i) {
      return '<div class="rel-item" style="animation-delay:' + (i * 0.05) + 's">' +
        '<a class="rel-name" href="' + esc(r.url) + '" target="_blank">' + esc(r.name || r.tag_name) + '</a>' +
        '<div class="rel-right"><span class="rel-tag">' + esc(r.tag_name) + '</span><span class="rel-date">' + (r.published_at ? r.published_at.slice(0, 10) : '') + '</span></div></div>';
    }).join('');
  }

  function renderEmbed(data) {
    var base = window.location.origin;
    var url = 'https://github.com/' + data.owner + '/' + data.repo;
    var badgeURL = base + '/api/badge?url=' + encodeURIComponent(url);
    embedCode.textContent = '[![GitViz](' + badgeURL + ')](' + url + ')';
    badgePreview.innerHTML = '<img src="' + badgeURL + '" alt="GitViz badge" style="max-width:100%;border-radius:4px">';
  }

  function showDashboard(data) {
    currentData = data;
    landing.style.display = 'none';
    dashboard.style.display = 'block';
    loading.style.display = 'none';
    clearError();
    repoName.textContent = data.full_name;
    repoDesc.textContent = data.description || 'No description';
    renderStats(data);
    drawLangChart(data.languages);
    drawCommitChart(data.stats.weekly_commits);
    renderContributors(data.stats.authors);
    renderReleases(data.releases);
    renderEmbed(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function analyze(url) {
    loading.style.display = 'grid';
    clearError();
    dashboard.style.display = 'block';
    landing.style.display = 'none';
    try {
      var data = await api('/api/repo?url=' + encodeURIComponent(url));
      showDashboard(data);
    } catch (e) {
      loading.style.display = 'none';
      showError(e.message);
    }
  }

  function triggerAnalyze(url) {
    if (!url) return;
    if (!url.match(/github\.com\//)) {
      if (url.match(/^[\w.-]+\/[\w.-]+$/)) {
        url = 'https://github.com/' + url;
      } else {
        showError('Enter a GitHub URL (github.com/user/repo) or "user/repo" format');
        return;
      }
    }
    analyze(url);
  }

  function init() {
    checkAuth();

    analyzeBtn.addEventListener('click', function () { triggerAnalyze(repoInput.value.trim()) });
    repoInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') triggerAnalyze(repoInput.value.trim()) });
    heroBtn.addEventListener('click', function () { triggerAnalyze(heroInput.value.trim()) });
    heroInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') triggerAnalyze(heroInput.value.trim()) });

    document.querySelectorAll('.chip[data-repo]').forEach(function (el) {
      el.addEventListener('click', function () { triggerAnalyze(el.dataset.repo) });
    });

    newAnalysisBtn.addEventListener('click', function () {
      dashboard.style.display = 'none';
      landing.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(embedCode.textContent).then(function () {
        copyBtn.textContent = 'Copied!';
        setTimeout(function () { copyBtn.textContent = 'Copy' }, 2000);
      }).catch(function () {});
    });

    loginBtn.addEventListener('click', function () { window.location.href = '/auth/github' });

    analyze('https://github.com/mayank-dev-15/mayank-dev-15');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
