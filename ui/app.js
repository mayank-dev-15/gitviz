(function () {
  'use strict';

  var currentData = null;
  var currentUser = null;

  function $(id) { return document.getElementById(id) }

  // ===== Cursor Glow Trail =====
  var cursorGlow = document.createElement('div');
  cursorGlow.className = 'cursor-glow';
  document.body.appendChild(cursorGlow);
  var mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX; mouseY = e.clientY;
  });
  (function animGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top = glowY + 'px';
    requestAnimationFrame(animGlow);
  })();

  // ===== Floating Particles =====
  var particlesCanvas = document.createElement('canvas');
  particlesCanvas.className = 'particles-canvas';
  document.body.appendChild(particlesCanvas);
  var pCtx = particlesCanvas.getContext('2d');
  var particles = [];
  var PARTICLE_COUNT = 40;

  function resizeParticles() {
    particlesCanvas.width = window.innerWidth;
    particlesCanvas.height = window.innerHeight;
  }
  resizeParticles();
  window.addEventListener('resize', resizeParticles);

  for (var i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5,
      a: Math.random() * 0.3 + 0.1,
      hue: Math.random() * 60 + 200
    });
  }

  function animParticles() {
    pCtx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
    particles.forEach(function (p) {
      var dx = mouseX - p.x;
      var dy = mouseY - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        p.vx -= dx * 0.00003;
        p.vy -= dy * 0.00003;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = particlesCanvas.width;
      if (p.x > particlesCanvas.width) p.x = 0;
      if (p.y < 0) p.y = particlesCanvas.height;
      if (p.y > particlesCanvas.height) p.y = 0;
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fillStyle = 'hsla(' + p.hue + ',60%,70%,' + p.a + ')';
      pCtx.fill();
    });
    particles.forEach(function (a) {
      particles.forEach(function (b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120 && d > 0) {
          pCtx.beginPath();
          pCtx.moveTo(a.x, a.y);
          pCtx.lineTo(b.x, b.y);
          pCtx.strokeStyle = 'rgba(88,166,255,' + (0.06 * (1 - d / 120)) + ')';
          pCtx.lineWidth = 0.5;
          pCtx.stroke();
        }
      });
    });
    requestAnimationFrame(animParticles);
  }
  animParticles();

  // ===== Button Ripple Effects =====
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    var rect = btn.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    btn.appendChild(ripple);
    setTimeout(function () { ripple.remove() }, 600);
  });

  // ===== Scroll Reveal Observer =====
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function setupReveal() {
    document.querySelectorAll('.chart-card, .badge-item, .stat-card').forEach(function (el) {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });
  }

  // ===== Chart Tooltip System =====
  var tooltip = document.createElement('div');
  tooltip.style.cssText = 'position:fixed;z-index:9999;background:rgba(13,17,23,.95);border:1px solid rgba(88,166,255,.2);border-radius:8px;padding:8px 12px;font-size:12px;color:#e6edf3;pointer-events:none;opacity:0;transition:opacity .15s;backdrop-filter:blur(8px);box-shadow:0 8px 24px rgba(0,0,0,.4);font-family:"Comic Sans MS",cursive';
  document.body.appendChild(tooltip);

  function showTooltip(e, text) {
    tooltip.textContent = text;
    tooltip.style.opacity = '1';
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY - 10) + 'px';
  }
  function hideTooltip() { tooltip.style.opacity = '0' }

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
  var starCanvas = $('starChart');
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
      ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center'; ctx.font = '14px "Comic Sans MS",cursive';
      ctx.fillText('No language data', w / 2, h / 2);
      return;
    }

    var cx = 130, cy = h / 2, r = 95, inner = 55;
    var total = data.reduce(function (s, d) { return s + d.pct }, 0);
    var startAngle = -Math.PI / 2;
    var hoverIdx = -1;

    function drawPie(highlight) {
      ctx.clearRect(0, 0, w, h);
      var angle = -Math.PI / 2;
      data.forEach(function (lang, i) {
        var slice = (lang.pct / total) * Math.PI * 2;
        var endAngle = angle + slice;
        var expanded = (i === highlight) ? 6 : 0;
        var midAngle = angle + slice / 2;
        var ex = Math.cos(midAngle) * expanded;
        var ey = Math.sin(midAngle) * expanded;

        ctx.beginPath();
        ctx.moveTo(cx + ex, cy + ey);
        ctx.arc(cx + ex, cy + ey, r, angle, endAngle);
        ctx.closePath();
        ctx.fillStyle = lang.color || '#58a6ff';
        ctx.fill();

        if (i === highlight) {
          ctx.strokeStyle = 'rgba(255,255,255,.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (slice > 0.12) {
          var lr = r - (r - inner) / 2 + ex * 0.3;
          var lx = cx + Math.cos(midAngle) * lr;
          var ly = cy + Math.sin(midAngle) * lr;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px "Comic Sans MS",cursive';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (lang.pct >= 6) ctx.fillText(Math.round(lang.pct) + '%', lx, ly);
        }

        angle = endAngle;
      });

      ctx.beginPath();
      ctx.arc(cx, cy, inner, 0, Math.PI * 2);
      ctx.fillStyle = '#0d1117';
      ctx.fill();

      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 18px "Comic Sans MS",cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.length, cx, cy - 6);
      ctx.fillStyle = '#8b949e';
      ctx.font = '10px "Comic Sans MS",cursive';
      ctx.fillText('languages', cx, cy + 10);

      var ly = 12;
      var lx = 280;
      data.forEach(function (lang, i) {
        if (ly > h - 10) return;
        ctx.fillStyle = lang.color || '#58a6ff';
        ctx.beginPath();
        ctx.arc(lx, ly + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = (i === highlight) ? '#fff' : '#c9d1d9';
        ctx.font = '12px "Comic Sans MS",cursive';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(lang.name, lx + 12, ly + 5);
        ctx.fillStyle = '#8b949e';
        ctx.font = '11px "Comic Sans MS",cursive';
        ctx.fillText(lang.pct.toFixed(1) + '%', lx + 12 + ctx.measureText(lang.name).width + 6, ly + 5);
        ly += 20;
      });
    }

    drawPie(-1);

    langCanvas.addEventListener('mousemove', function (e) {
      var rect = langCanvas.getBoundingClientRect();
      var sx = (e.clientX - rect.left) * (w / rect.width);
      var sy = (e.clientY - rect.top) * (h / rect.height);
      var dx = sx - cx, dy = sy - cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < inner || dist > r) { if (hoverIdx !== -1) { hoverIdx = -1; drawPie(-1); } return; }
      var mouseAngle = Math.atan2(dy, dx);
      if (mouseAngle < -Math.PI / 2) mouseAngle += Math.PI * 2;
      var angle = -Math.PI / 2;
      var found = -1;
      for (var i = 0; i < data.length; i++) {
        var slice = (data[i].pct / total) * Math.PI * 2;
        if (mouseAngle >= angle && mouseAngle < angle + slice) { found = i; break; }
        angle += slice;
      }
      if (found !== hoverIdx) { hoverIdx = found; drawPie(found); }
    });

    langCanvas.addEventListener('mouseleave', function () { hoverIdx = -1; drawPie(-1); });
  }

  function drawStarGraph(data, stats) {
    var ctx = starCanvas.getContext('2d');
    var w = starCanvas.width, h = starCanvas.height;
    ctx.clearRect(0, 0, w, h);

    var metrics = [
      { label: 'Stars', value: data.stars || 0, max: Math.max(100, data.stars || 0) * 1.2, color: '#f0c040' },
      { label: 'Forks', value: data.forks || 0, max: Math.max(50, data.forks || 0) * 1.2, color: '#1f6feb' },
      { label: 'Issues', value: Math.max(0, 50 - (data.open_issues || 0)), max: 50, color: '#3fb950' },
      { label: 'Contributors', value: (stats && stats.authors) ? stats.authors.length : 0, max: Math.max(10, ((stats && stats.authors) ? stats.authors.length : 0) * 1.5), color: '#a371f7' },
      { label: 'Commits', value: stats ? stats.total_commits || 0 : 0, max: Math.max(100, (stats ? stats.total_commits || 0 : 0) * 1.2), color: '#58a6ff' },
      { label: 'Activity', value: (stats && stats.weekly_commits) ? stats.weekly_commits.slice(-4).reduce(function (s, w) { return s + w.commits }, 0) : 0, max: Math.max(20, (stats && stats.weekly_commits) ? stats.weekly_commits.slice(-4).reduce(function (s, w) { return s + w.commits }, 0) * 1.5 : 20), color: '#f85149' },
      { label: 'Bus Factor', value: stats ? stats.bus_factor || 0 : 0, max: Math.max(5, (stats ? stats.bus_factor || 0 : 0) * 1.5), color: '#d29922' },
      { label: 'Releases', value: data.releases ? data.releases.length : 0, max: Math.max(5, (data.releases ? data.releases.length : 0) * 1.5), color: '#79c0ff' }
    ];

    var cx = w / 2, cy = h / 2 + 5;
    var maxR = Math.min(w, h) / 2 - 45;
    var n = metrics.length;
    var angleStep = (Math.PI * 2) / n;

    [0.25, 0.5, 0.75, 1.0].forEach(function (pct) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var a = -Math.PI / 2 + i * angleStep;
        var px = cx + Math.cos(a) * maxR * pct;
        var py = cy + Math.sin(a) * maxR * pct;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.stroke();
    }

    ctx.beginPath();
    metrics.forEach(function (m, i) {
      var a = -Math.PI / 2 + i * angleStep;
      var pct = Math.min(1, m.value / m.max);
      var px = cx + Math.cos(a) * maxR * pct;
      var py = cy + Math.sin(a) * maxR * pct;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(31,111,235,.15)';
    ctx.fill();
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 2;
    ctx.stroke();

    metrics.forEach(function (m, i) {
      var a = -Math.PI / 2 + i * angleStep;
      var pct = Math.min(1, m.value / m.max);
      var px = cx + Math.cos(a) * maxR * pct;
      var py = cy + Math.sin(a) * maxR * pct;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      var lx = cx + Math.cos(a) * (maxR + 22);
      var ly = cy + Math.sin(a) * (maxR + 22);
      ctx.fillStyle = m.color;
      ctx.font = '11px "Comic Sans MS",cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.label, lx, ly - 7);
      ctx.fillStyle = '#8b949e';
      ctx.font = '10px "Comic Sans MS",cursive';
      ctx.fillText(typeof m.value === 'number' && m.value > 999 ? (m.value / 1000).toFixed(1) + 'k' : m.value, lx, ly + 7);
    });
  }

  function drawCommitChart(data) {
    var ctx = commitCanvas.getContext('2d');
    var w = commitCanvas.width, h = commitCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!data || data.length < 2) {
      ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center'; ctx.font = '14px "Comic Sans MS",cursive';
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
      ctx.fillStyle = '#484f58'; ctx.font = '9px "Comic Sans MS",cursive'; ctx.textAlign = 'right';
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

    var dots = [];
    data.forEach(function (d, i) {
      var x = pad.left + (i / (data.length - 1)) * bw;
      var barH = (d.commits / maxVal) * bh;
      var y = pad.top + bh - barH;
      dots.push({ x: x, y: y, d: d });
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1f6feb';
      ctx.fill();
    });

    var skip = Math.max(1, Math.floor(data.length / 10));
    data.forEach(function (d, i) {
      if (i % skip === 0 || i === data.length - 1) {
        var x = pad.left + (i / (data.length - 1)) * bw;
        ctx.fillStyle = '#484f58'; ctx.font = '8px "Comic Sans MS",cursive'; ctx.textAlign = 'center';
        ctx.fillText(d.week.slice(5), x, h - 6);
      }
    });

    commitCanvas.onmousemove = function (e) {
      var rect = commitCanvas.getBoundingClientRect();
      var mx = (e.clientX - rect.left) * (w / rect.width);
      var my = (e.clientY - rect.top) * (h / rect.height);
      var closest = null, closestD = Infinity;
      dots.forEach(function (dot) {
        var dx = mx - dot.x, dy = my - dot.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestD && d < 20) { closestD = d; closest = dot; }
      });
      if (closest) {
        showTooltip(e, closest.d.week + ': ' + closest.d.commits + ' commits');
        ctx.clearRect(0, 0, w, h);
        drawCommitChart(data);
        ctx.beginPath(); ctx.arc(closest.x, closest.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#58a6ff'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        hideTooltip();
      }
    };
    commitCanvas.onmouseleave = function () { hideTooltip(); drawCommitChart(data); };
  }

  // ---- Render ----
  function renderStats(data) {
    var items = [
      { icon: '⭐', label: 'Stars', value: data.stars, tip: data.stars + ' stargazers' },
      { icon: '🍴', label: 'Forks', value: data.forks, tip: data.forks + ' forks' },
      { icon: '⚠', label: 'Open Issues', value: data.open_issues, tip: data.open_issues + ' open issues' },
      { icon: '🔀', label: 'Open PRs', value: data.open_prs, tip: data.open_prs + ' open PRs' },
      { icon: '📄', label: 'License', value: data.license || 'N/A', text: true, tip: 'License: ' + (data.license || 'N/A') },
      { icon: '🔤', label: 'Language', value: data.primary_lang || 'N/A', text: true, tip: 'Primary: ' + (data.primary_lang || 'N/A') },
      { icon: '📝', label: 'Commits', value: data.stats.total_commits, tip: data.stats.total_commits + ' total commits (sampled)' },
      { icon: '➕', label: 'Lines Added', value: data.stats.total_additions, tip: '+' + data.stats.total_additions.toLocaleString() + ' lines added' },
      { icon: '➖', label: 'Lines Deleted', value: data.stats.total_deletions, tip: '-' + data.stats.total_deletions.toLocaleString() + ' lines deleted' },
      { icon: '👥', label: 'Contributors', value: data.stats.authors ? data.stats.authors.length : 0, tip: (data.stats.authors ? data.stats.authors.length : 0) + ' contributors' },
    ];

    statsGrid.innerHTML = items.map(function (item, i) {
      var val = item.text ? esc(item.value) : '<span class="stat-number" data-count="' + item.value + '">0</span>';
      return '<div class="stat-card slide-up" style="animation-delay:' + (i * 0.06) + 's" data-tip="' + esc(item.tip || '') + '">' +
        '<span class="stat-icon">' + item.icon + '</span>' + val +
        '<span class="stat-label">' + item.label + '</span></div>';
    }).join('');

    setTimeout(function () {
      statsGrid.querySelectorAll('.stat-number[data-count]').forEach(function (el) {
        animateCount(el, parseInt(el.dataset.count));
      });
    }, 200);

    statsGrid.querySelectorAll('.stat-card').forEach(function (card) {
      card.addEventListener('mouseenter', function (e) { showTooltip(e, card.dataset.tip) });
      card.addEventListener('mouseleave', hideTooltip);
      card.addEventListener('mousemove', function (e) {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
      });
    });

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
      return '<tr class="contrib-row" style="animation-delay:' + (i * 0.04) + 's" data-tip="' + esc(a.login) + ': ' + a.commits + ' commits">' +
        '<td>' + (a.avatar_url ? '<img src="' + esc(a.avatar_url) + '" class="avatar" alt="">' : '<span class="avatar" style="display:inline-block;background:#30363d"></span>') + '</td>' +
        '<td><a class="login" href="https://github.com/' + esc(a.login) + '" target="_blank">' + esc(a.login) + '</a></td>' +
        '<td>' + a.commits + ' <span class="pct-bar" style="width:' + pct + 'px;max-width:80px"></span></td>' +
        '<td style="color:#2ea043">+' + a.additions + '</td>' +
        '<td style="color:#f85149">-' + a.deletions + '</td>' +
        '<td>' + a.pct.toFixed(1) + '%</td></tr>';
    }).join('');

    contribBody.querySelectorAll('tr').forEach(function (row) {
      row.addEventListener('mouseenter', function (e) { showTooltip(e, row.dataset.tip) });
      row.addEventListener('mouseleave', hideTooltip);
      row.addEventListener('mousemove', function (e) {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
      });
    });
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

    var badgeTypes = [
      { type: 'overview', label: 'Overview', desc: 'Repo name + language + star rating' },
      { type: 'stars', label: 'Stars', desc: 'Star count with rating' },
      { type: 'forks', label: 'Forks', desc: 'Fork count' },
      { type: 'issues', label: 'Issues', desc: 'Open issues count' },
      { type: 'language', label: 'Language', desc: 'Primary language' },
      { type: 'commits', label: 'Commits', desc: 'Total commit count' },
      { type: 'contributors', label: 'Contributors', desc: 'Number of contributors' },
      { type: 'bus-factor', label: 'Bus Factor', desc: 'Bus factor with rating' },
      { type: 'activity', label: 'Activity', desc: 'Recent commit frequency' },
      { type: 'health', label: 'Health Score', desc: 'Overall repo health' }
    ];

    var imgbbMap = null;

    embedCode.textContent = 'Loading...';
    badgePreview.innerHTML = '<div style="text-align:center;padding:40px"><div class="upload-spinner" style="margin:0 auto 16px"></div>Uploading GIF badges to imgbb cloud...</div>';

    var uploadAllBtn = $('uploadAllBtn');
    if (uploadAllBtn) uploadAllBtn.style.display = 'none';

    fetch('/api/badge/upload-all?url=' + encodeURIComponent(url), { method: 'POST' })
      .then(function (r) { return r.json() })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        var badges = data.badges || [];
        imgbbMap = {};
        badges.forEach(function (b) { imgbbMap[b.type] = b.url; });

        var overviewUrl = imgbbMap['overview'] || (badges.length > 0 ? badges[0].url : null);

        if (overviewUrl) {
          embedCode.textContent = '[![GitViz](' + overviewUrl + ')](' + url + ')';
          badgePreview.innerHTML = '<img src="' + esc(overviewUrl) + '" alt="GitViz badge" style="max-width:100%;border-radius:4px">';
        } else {
          embedCode.textContent = 'No badge data';
          badgePreview.innerHTML = '<div style="text-align:center;padding:20px;color:#8b949e">No badges uploaded</div>';
        }

        var grid = $('badgeGrid');
        if (grid) {
          grid.innerHTML = badgeTypes.map(function (bt) {
            var imgbbUrl = imgbbMap[bt.type];
            if (!imgbbUrl) return '';
            var mdCode = '[![GitViz ' + bt.label + '](' + imgbbUrl + ')](' + url + ')';
            return '<div class="badge-item" data-md="' + esc(mdCode) + '">' +
              '<div class="badge-item-header">' +
              '<span class="badge-item-label">' + bt.label + '</span>' +
              '<span class="badge-item-desc">' + bt.desc + '</span>' +
              '</div>' +
              '<div class="badge-item-preview"><img src="' + esc(imgbbUrl) + '" alt="' + esc(bt.label) + ' badge"></div>' +
              '<div class="badge-item-actions">' +
              '<button class="btn-badge-copy" data-code="' + esc(mdCode) + '" title="Copy embed code">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
              '</button>' +
              '</div>' +
              '</div>';
          }).join('');

          grid.querySelectorAll('.btn-badge-copy').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(btn.dataset.code).then(function () {
                btn.classList.add('copied');
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
                setTimeout(function () {
                  btn.classList.remove('copied');
                  btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
                }, 1500);
              });
            });
          });

          grid.querySelectorAll('.badge-item').forEach(function (item) {
            item.addEventListener('click', function () {
              navigator.clipboard.writeText(item.dataset.md).then(function () {
                var label = item.querySelector('.badge-item-label');
                var orig = label.textContent;
                label.textContent = 'Copied!';
                label.style.color = '#3fb950';
                setTimeout(function () { label.textContent = orig; label.style.color = ''; }, 1200);
              });
            });
          });
        }

        var copyAllBtn = $('copyAllBtn');
        if (copyAllBtn) {
          copyAllBtn.onclick = function () {
            var allCodes = badgeTypes.map(function (bt) {
              var imgbbUrl = imgbbMap[bt.type];
              return imgbbUrl ? '[![GitViz ' + bt.label + '](' + imgbbUrl + ')](' + url + ')' : '';
            }).filter(Boolean).join('\n');
            navigator.clipboard.writeText(allCodes).then(function () {
              copyAllBtn.textContent = 'Copied!';
              setTimeout(function () { copyAllBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy All Embed Codes'; }, 2000);
            });
          };
        }

        var dlAllBtn = $('downloadAllBtn');
        if (dlAllBtn) {
          dlAllBtn.onclick = function () {
            badgeTypes.forEach(function (bt) {
              var imgbbUrl = imgbbMap[bt.type];
              if (imgbbUrl) window.open(imgbbUrl, '_blank');
            });
          };
        }
      })
      .catch(function (e) {
        badgePreview.innerHTML = '<div style="text-align:center;padding:20px;color:#f85149">Failed to upload badges: ' + esc(e.message) + '</div>';
        embedCode.textContent = 'Error loading badges';
      });
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
    drawStarGraph(data, data.stats);
    drawCommitChart(data.stats.weekly_commits);
    renderContributors(data.stats.authors);
    renderReleases(data.releases);
    renderEmbed(data);
    setupReveal();
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

    // ===== Settings Modal =====
    var settingsModal = $('settingsModal');
    var settingsBtn = $('settingsBtn');
    var closeSettingsBtn = $('closeSettingsBtn');
    var saveSettingsBtn = $('saveSettingsBtn');
    var settingsStatus = $('settingsStatus');

    settingsBtn.addEventListener('click', function () {
      settingsModal.style.display = 'flex';
      loadSettingsForm();
    });

    closeSettingsBtn.addEventListener('click', function () {
      settingsModal.style.display = 'none';
    });

    settingsModal.addEventListener('click', function (e) {
      if (e.target === settingsModal) settingsModal.style.display = 'none';
    });

    saveSettingsBtn.addEventListener('click', function () {
      var payload = {
        github_token: $('settingsToken').value.trim(),
        github_client_id: $('settingsClientID').value.trim(),
        github_client_secret: $('settingsClientSecret').value.trim(),
        imgbb_api_key: $('settingsImgBB').value.trim(),
        port: $('settingsPort').value.trim()
      };

      saveSettingsBtn.disabled = true;
      saveSettingsBtn.textContent = 'Saving...';

      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json() })
        .then(function (d) {
          saveSettingsBtn.disabled = false;
          saveSettingsBtn.textContent = 'Save Settings';
          if (d.error) {
            settingsStatus.textContent = d.error;
            settingsStatus.className = 'settings-status error';
          } else {
            settingsStatus.textContent = 'Settings saved! Restart server to apply port changes.';
            settingsStatus.className = 'settings-status success';
            setTimeout(function () { settingsStatus.textContent = '' }, 4000);
          }
        })
        .catch(function (e) {
          saveSettingsBtn.disabled = false;
          saveSettingsBtn.textContent = 'Save Settings';
          settingsStatus.textContent = 'Error: ' + e.message;
          settingsStatus.className = 'settings-status error';
        });
    });

    function loadSettingsForm() {
      fetch('/api/settings')
        .then(function (r) { return r.json() })
        .then(function (s) {
          $('settingsToken').value = s.github_token === '***' ? '' : (s.github_token || '');
          $('settingsClientID').value = s.github_client_id || '';
          $('settingsClientSecret').value = s.github_client_secret === '***' ? '' : (s.github_client_secret || '');
          $('settingsImgBB').value = s.imgbb_api_key === '***' ? '' : (s.imgbb_api_key || '');
          $('settingsPort').value = s.port || '8080';
        });
    }

    analyze('https://github.com/mayank-dev-15/mayank-dev-15');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
