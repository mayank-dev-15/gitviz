(function(){
'use strict';

var currentData=null,currentUser=null;
function $(id){return document.getElementById(id)}

// ===== Background Canvas =====
var bgCanvas=$('bgCanvas'),ctx=bgCanvas.getContext('2d');
var W,H,bgParticles=[];
function resizeBg(){W=bgCanvas.width=window.innerWidth;H=bgCanvas.height=window.innerHeight}
resizeBg();window.addEventListener('resize',resizeBg);

for(var i=0;i<60;i++){
  bgParticles.push({
    x:Math.random()*W,y:Math.random()*H,
    vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,
    r:Math.random()*1.5+.5,a:Math.random()*.4+.1,
    hue:Math.random()*60+200
  });
}
var mouseX=0,mouseY=0;
document.addEventListener('mousemove',function(e){mouseX=e.clientX;mouseY=e.clientY});

function animBg(){
  ctx.clearRect(0,0,W,H);
  bgParticles.forEach(function(p){
    var dx=mouseX-p.x,dy=mouseY-p.y,dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<180){p.vx-=dx*.00004;p.vy-=dy*.00004}
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='hsla('+p.hue+',70%,70%,'+p.a+')';ctx.fill();
  });
  for(var a=0;a<bgParticles.length;a++){
    for(var b=a+1;b<bgParticles.length;b++){
      var dx=bgParticles[a].x-bgParticles[b].x,dy=bgParticles[a].y-bgParticles[b].y;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<120){
        ctx.beginPath();ctx.moveTo(bgParticles[a].x,bgParticles[a].y);
        ctx.lineTo(bgParticles[b].x,bgParticles[b].y);
        ctx.strokeStyle='rgba(88,166,255,'+(1-dist/120)*.12+')';
        ctx.lineWidth=.5;ctx.stroke();
      }
    }
  }
  requestAnimationFrame(animBg);
}
animBg();

// ===== Cursor Glow =====
var cursorGlow=$('cursor-glow');
var glowX=0,glowY=0;
(function animGlow(){
  glowX+=(mouseX-glowX)*.06;glowY+=(mouseY-glowY)*.06;
  cursorGlow.style.left=glowX+'px';cursorGlow.style.top=glowY+'px';
  requestAnimationFrame(animGlow);
})();

// ===== Typewriter =====
var typewriterEl=$('typewriter');
var twWords=['GitHub repository','codebase','project','open-source repo'];
var twIdx=0,twCharIdx=0,twDeleting=false,twPause=0;
function typeAnim(){
  var word=twWords[twIdx];
  if(!twDeleting){
    typewriterEl.textContent=word.substring(0,twCharIdx+1);
    twCharIdx++;
    if(twCharIdx>=word.length){twDeleting=true;twPause=80}
  }else{
    if(twPause>0){twPause--;requestAnimationFrame(typeAnim);return}
    typewriterEl.textContent=word.substring(0,twCharIdx-1);
    twCharIdx--;
    if(twCharIdx<=0){twDeleting=false;twIdx=(twIdx+1)%twWords.length}
  }
  setTimeout(typeAnim,twDeleting?40:80);
}
typeAnim();

// ===== Scroll Reveal =====
function setupReveal(){
  document.querySelectorAll('.fcard').forEach(function(el,i){
    el.style.animationDelay=(i*100)+'ms';
  });
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target)}
    });
  },{threshold:.15});
  document.querySelectorAll('.fcard,.chart-card,.stat-card').forEach(function(el){obs.observe(el)});
}
setupReveal();

// ===== Button Ripple =====
document.addEventListener('click',function(e){
  var btn=e.target.closest('button');if(!btn)return;
  var r=document.createElement('span');r.className='ripple-effect';
  var rect=btn.getBoundingClientRect();
  r.style.left=(e.clientX-rect.left)+'px';r.style.top=(e.clientY-rect.top)+'px';
  btn.appendChild(r);setTimeout(function(){r.remove()},600);
});

// ===== DOM References =====
var repoInput=$('repoInput'),analyzeBtn=$('analyzeBtn');
var heroInput=$('heroInput'),heroBtn=$('heroBtn');
var loginBtn=$('loginBtn'),userArea=$('userArea');
var landing=$('landing'),dashboard=$('dashboard'),loading=$('loading');
var repoName=$('repoName'),repoDesc=$('repoDesc'),repoMeta=$('repoMeta'),repoLink=$('repoLink');
var repoHeader=$('repoHeader');
var statsGrid=$('statsGrid');
var langCanvas=$('langChart'),starCanvas=$('starChart'),commitCanvas=$('commitChart');
var langBars=$('langBars');
var contribBody=$('contribBody'),busFactorBadge=$('busFactorBadge');
var releaseList=$('releaseList');
var embedCode=$('embedCode'),copyBtn=$('copyBtn'),badgePreview=$('badgePreview');
var tokenInfo=$('tokenInfo'),newAnalysisBtn=$('newAnalysisBtn');

function esc(s){return String(s).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}

// ===== Tooltip =====
var tooltipEl=document.createElement('div');
tooltipEl.className='gv-tooltip';tooltipEl.style.display='none';
document.body.appendChild(tooltipEl);
function showTooltip(e,text){
  tooltipEl.textContent=text;tooltipEl.style.display='block';
  var x=e.clientX+12,y=e.clientY-10;
  if(x+tooltipEl.offsetWidth>window.innerWidth)x=e.clientX-tooltipEl.offsetWidth-12;
  if(y<0)y=e.clientY+16;
  tooltipEl.style.left=x+'px';tooltipEl.style.top=y+'px';
}
function hideTooltip(){tooltipEl.style.display='none'}
document.addEventListener('mousemove',function(e){
  if(tooltipEl.style.display==='block'){
    var x=e.clientX+12,y=e.clientY-10;
    if(x+tooltipEl.offsetWidth>window.innerWidth)x=e.clientX-tooltipEl.offsetWidth-12;
    if(y<0)y=e.clientY+16;
    tooltipEl.style.left=x+'px';tooltipEl.style.top=y+'px';
  }
});

function formatNum(n){
  if(n>=1e6)return(n/1e6).toFixed(1)+'M';
  if(n>=1e3)return(n/1e3).toFixed(1)+'K';
  return String(n);
}

function animateCount(el,target){
  var current=0;var step=Math.max(1,Math.floor(target/40));
  var iv=setInterval(function(){
    current+=step;if(current>=target){current=target;clearInterval(iv)}
    el.textContent=formatNum(current);
  },20);
}

// ===== SSE Progress =====
function connectSSE(){
  var es=new EventSource('/api/progress');
  var logBody=$('logBody'),progressFill=$('progressFill'),progressGlow=$('progressGlow');
  var progressPercent=$('progressPercent'),loadingTitle=$('loadingTitle');

  es.onmessage=function(e){
    var ev=JSON.parse(e.data);
    if(progressFill)progressFill.style.width=ev.percent+'%';
    if(progressGlow)progressGlow.style.width=ev.percent+'%';
    if(progressPercent)progressPercent.textContent=ev.percent+'%';
    if(loadingTitle&&ev.message)loadingTitle.textContent=ev.message;

    var time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    var line=document.createElement('div');
    line.className='log-line'+(ev.error?' error':'');
    line.innerHTML='<span class="log-time">'+esc(time)+'</span><span class="log-stage '+esc(ev.stage)+'">'+esc(ev.stage)+'</span><span class="log-msg">'+esc(ev.message)+'</span>';
    if(logBody){logBody.appendChild(line);logBody.scrollTop=logBody.scrollHeight}

    if(ev.done||ev.error){es.close();setTimeout(function(){
      if(progressFill)progressFill.style.width='100%';
      if(progressGlow)progressGlow.style.width='100%';
      if(progressPercent)progressPercent.textContent='100%';
    },200)}
  };
  es.onerror=function(){es.close()};
  return es;
}

// ===== Upload Progress Log =====
function addUploadLog(stage,msg){
  var body=$('uploadLogBody');if(!body)return;
  var time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  var line=document.createElement('div');
  line.className='log-line';
  line.innerHTML='<span class="log-time">'+esc(time)+'</span><span class="log-stage '+esc(stage)+'">'+esc(stage)+'</span><span class="log-msg">'+esc(msg)+'</span>';
  body.appendChild(line);body.scrollTop=body.scrollHeight;
}

// ===== API =====
async function api(url){
  var r=await fetch(url);
  var t=await r.text();
  try{return JSON.parse(t)}catch(e){throw new Error(t||'Request failed')}
}

function showError(msg){
  loading.style.display='none';
  var err=document.createElement('div');
  err.className='chart-card glass';
  err.style.cssText='text-align:center;padding:40px;color:#f85149;animation:fadeIn .3s';
  err.textContent=msg;
  dashboard.insertBefore(err,repoHeader.nextSibling);
}
function clearError(){
  dashboard.querySelectorAll('.chart-card[style*="color:#f85149"]').forEach(function(e){e.remove()});
}

// ===== Analyze =====
async function analyze(url){
  loading.style.display='block';
  clearError();
  dashboard.style.display='block';
  landing.style.display='none';
  repoHeader.style.display='none';
  $('newAnalysisBtn').style.display='none';

  var pf=$('progressFill'),pg=$('progressGlow'),pp=$('progressPercent'),lt=$('loadingTitle'),lb=$('logBody');
  if(pf)pf.style.width='0%';if(pg)pg.style.width='0%';if(pp)pp.textContent='0%';
  if(lb)lb.innerHTML='';if(lt)lt.textContent='Analyzing repository...';

  var sse=connectSSE();
  try{
    var data=await api('/api/repo?url='+encodeURIComponent(url));
    showDashboard(data);
  }catch(e){
    loading.style.display='none';
    showError(e.message);
  }
}

function triggerAnalyze(url){
  if(!url)return;
  url=url.trim();
  // Detect username-only input (no slash, not a URL)
  if(url.match(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/) && !url.includes('/')){
    analyzeProfile(url);
    return;
  }
  if(!url.match(/github\.com\//)){
    if(url.match(/^[\w.-]+\/[\w.-]+$/)){url='https://github.com/'+url}
    else{showError('Enter a GitHub URL, "user/repo", or a username');return}
  }
  analyze(url);
}

async function analyzeProfile(username){
  loading.style.display='block';
  clearError();
  dashboard.style.display='block';
  landing.style.display='none';
  repoHeader.style.display='none';
  newAnalysisBtn.style.display='none';
  statsGrid.innerHTML='';
  if(langBars)langBars.innerHTML='';
  contribBody.innerHTML='';
  releaseList.innerHTML='';
  var badgeGrid2=$('badgeGrid');if(badgeGrid2)badgeGrid2.innerHTML='';

  var pf=$('progressFill'),pg=$('progressGlow'),pp=$('progressPercent'),lt=$('loadingTitle'),lb=$('logBody');
  if(pf)pf.style.width='0%';if(pg)pg.style.width='0%';if(pp)pp.textContent='0%';
  if(lb)lb.innerHTML='';if(lt)lt.textContent='Analyzing profile...';

  var sse=connectSSE();
  try{
    var data=await api('/api/profile?username='+encodeURIComponent(username));
    showProfile(data);
  }catch(e){
    loading.style.display='none';
    showError(e.message);
  }
}

// ===== Show Dashboard =====
function showDashboard(data){
  currentData=data;
  landing.style.display='none';
  dashboard.style.display='block';
  loading.style.display='none';
  repoHeader.style.display='flex';
  newAnalysisBtn.style.display='flex';
  clearError();

  repoName.textContent=data.full_name;
  repoDesc.textContent=data.description||'No description';
  repoLink.href=data.url;

  // Meta tags
  var meta='';
  if(data.license)meta+='<span class="rh-tag">'+esc(data.license)+'</span>';
  if(data.primary_lang)meta+='<span class="rh-tag">● '+esc(data.primary_lang)+'</span>';
  if(data.releases&&data.releases.length)meta+='<span class="rh-tag">'+data.releases.length+' releases</span>';
  meta+='<span class="rh-tag">Updated '+new Date(data.fetched_at).toLocaleDateString()+'</span>';
  repoMeta.innerHTML=meta;

  renderStats(data);
  renderLangBars(data.languages);
  drawLangChart(data.languages);
  drawStarGraph(data,data.stats);
  drawCommitChart(data.stats.weekly_commits);
  renderContributors(data.stats.authors);
  renderReleases(data.releases);
  renderEmbed(data);
  setupReveal();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ===== Show Profile =====
function showProfile(data){
  currentData=null;
  landing.style.display='none';
  dashboard.style.display='block';
  loading.style.display='none';
  repoHeader.style.display='flex';
  newAnalysisBtn.style.display='flex';
  clearError();

  // Hide sections that don't apply to profiles
  var commitSection=$('commitSection');if(commitSection)commitSection.parentElement.style.display='none';
  var starSection=$('starSection');if(starSection)starSection.style.display='none';
  var embedSection=$('embedSection');if(embedSection)embedSection.style.display='none';

  repoName.textContent='@'+data.login;
  repoDesc.textContent=data.bio||'No bio';
  repoLink.href=data.html_url;

  var meta='';
  if(data.name)meta+='<span class="rh-tag">'+esc(data.name)+'</span>';
  if(data.location)meta+='<span class="rh-tag">📍 '+esc(data.location)+'</span>';
  if(data.company)meta+='<span class="rh-tag">🏢 '+esc(data.company)+'</span>';
  if(data.account_age)meta+='<span class="rh-tag">🕐 '+esc(data.account_age)+'</span>';
  meta+='<span class="rh-tag">'+data.public_repos+' repos</span>';
  meta+='<span class="rh-tag">'+data.followers+' followers</span>';
  repoMeta.innerHTML=meta;

  // Avatar
  var existingAvatar=repoHeader.querySelector('.profile-avatar');
  if(existingAvatar)existingAvatar.remove();
  var avatarDiv=document.createElement('div');
  avatarDiv.className='profile-avatar';
  avatarDiv.innerHTML='<img src="'+esc(data.avatar_url)+'" alt="'+esc(data.login)+'">';
  repoHeader.querySelector('.rh-left').insertBefore(avatarDiv,repoHeader.querySelector('.rh-left').firstChild);

  // Stats
  var stats=[
    {icon:'📦',label:'Public Repos',value:data.public_repos,detail:data.public_repos+' public repositories'},
    {icon:'⭐',label:'Total Stars',value:data.total_stars,detail:'Earned across '+data.public_repos+' repos'},
    {icon:'🍴',label:'Total Forks',value:data.total_forks,detail:'Forked across '+data.public_repos+' repos'},
    {icon:'❗',label:'Total Issues',value:data.total_issues,detail:data.total_issues+' open issues across repos'},
    {icon:'👥',label:'Followers',value:data.followers,detail:data.followers+' followers | Following: '+data.following},
    {icon:'📝',label:'Public Gists',value:data.public_gists,detail:data.public_gists+' public gists'},
  ];
  statsGrid.innerHTML='';
  stats.forEach(function(s,i){
    var card=document.createElement('div');card.className='stat-card';card.style.animationDelay=(i*60)+'ms';
    card.setAttribute('data-tip',s.detail);
    card.innerHTML='<span class="stat-icon">'+s.icon+'</span><span class="stat-number" data-target="'+s.value+'">0</span><span class="stat-label">'+s.label+'</span>';
    card.addEventListener('mouseenter',function(e){showTooltip(e,s.detail)});
    card.addEventListener('mouseleave',hideTooltip);
    statsGrid.appendChild(card);
    var numEl=card.querySelector('.stat-number');
    setTimeout(function(){animateCount(numEl,s.value)},200+i*60);
  });

  // Language bars + donut chart
  var langSection=$('langSection');
  if(langSection)langSection.style.display='';
  if(data.top_languages&&data.top_languages.length){
    var langColors2={Go:'#00ADD8',JavaScript:'#f1e05a',TypeScript:'#3178c6',Python:'#3572A5',Java:'#b07219',Rust:'#dea584',C:'#555555','C++':'#f34b7d',Ruby:'#701516',PHP:'#4F5D95',Swift:'#F05138',Kotlin:'#A97BFF',Dart:'#00B4AB',Shell:'#89e051',HTML:'#e34c26',CSS:'#563d7c',Vue:'#41b883',Svelte:'#ff3e00',Scala:'#c22d40',Haskell:'#5e5086',R:'#198CE7',Lua:'#000080',Nim:'#ffc200',Zig:'#ec915c',Elixir:'#6e4a7e',PLpgSQL:'#336791',Cuda:'#3A4E3A',Assembly:'#6E4C13',Makefile:'#427819',Dockerfile:'#384d54',Nix:'#7e7eff',PowerShell:'#012456',Ruby:'#701516'};
    var langs=[];
    data.top_languages.forEach(function(l){langs.push({name:l.name,bytes:1,pct:l.pct,color:langColors2[l.name]||'#8b949e'})});
    drawLangChart(langs);
    renderLangBars(langs);
  }

  // Repos table
  var contribSection=$('contribSection');
  if(contribSection)contribSection.style.display='';
  if(data.repos&&data.repos.length){
    var thRow=document.querySelector('#contribTable thead tr');
    if(thRow)thRow.innerHTML='<th></th><th>Repository</th><th>Language</th><th>Stars</th><th>Forks</th><th>Status</th>';
    contribBody.innerHTML='';
    var sorted=data.repos.slice().sort(function(a,b){return b.stars-a.stars}).slice(0,30);
    sorted.forEach(function(r,i){
      var row=document.createElement('tr');row.className='contrib-row';row.style.animationDelay=(i*60)+'ms';
      var langColor=langColors2&&langColors2[r.language]?langColors2[r.language]:'#8b949e';
      row.innerHTML='<td style="color:#58a6ff;font-weight:600">'+esc(r.name)+'</td><td><span style="color:'+langColor+'">'+esc(r.language||'-')+'</span></td><td>⭐ '+r.stars+'</td><td style="color:#3fb950">🍴 '+r.forks+'</td><td>'+(r.is_fork?'<span style="color:#d29922">fork</span>':r.is_archived?'<span style="color:#f85149">archived</span>':'<span style="color:#3fb950">active</span>')+'</td>';
      contribBody.appendChild(row);
    });
    var bfBadge=$('busFactorBadge');
    if(bfBadge){bfBadge.textContent=data.public_repos+' repos';bfBadge.className='bus-badge good'}
  }

  // Recent activity
  var releaseSection=$('releaseSection');
  if(releaseSection)releaseSection.style.display='';
  var sectionTitle=document.querySelector('#releaseSection .section-title');
  if(sectionTitle)sectionTitle.textContent='Recent Activity';
  if(data.recent_activity&&data.recent_activity.length){
    releaseList.innerHTML='';
    data.recent_activity.slice(0,20).forEach(function(e,i){
      var item=document.createElement('div');item.className='rel-item';item.style.animationDelay=(i*40)+'ms';
      var d=e.created_at?new Date(e.created_at).toLocaleDateString():'';
      var icon='📝';if(e.type==='PushEvent')icon='🔀';if(e.type==='CreateEvent')icon='✨';if(e.type==='IssuesEvent')icon='❗';if(e.type==='WatchEvent')icon='⭐';if(e.type==='DeleteEvent')icon='🗑️';if(e.type==='PullRequestEvent')icon='🔀';if(e.type==='ReleaseEvent')icon='📦';if(e.type==='ForkEvent')icon='🍴';
      item.innerHTML='<a class="rel-name" href="https://github.com/'+esc(e.repo)+'" target="_blank">'+icon+' '+esc(e.repo)+'</a><div class="rel-right"><span class="rel-tag">'+esc(e.type.replace('Event',''))+'</span><span class="rel-date">'+d+'</span></div>';
      releaseList.appendChild(item);
    });
  }

  setupReveal();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ===== Stats =====
function renderStats(data){
  var totalAuthors=data.stats.authors?data.stats.authors.length:0;
  var totalReleases=data.releases?data.releases.length:0;
  var weeklyAvg=data.stats.weekly_commits&&data.stats.weekly_commits.length?
    Math.round(data.stats.total_commits/data.stats.weekly_commits.length):0;
  var stats=[
    {icon:'⭐',label:'Stars',value:data.stars,detail:'Stars: '+formatNum(data.stars)+' | Forks: '+formatNum(data.forks)},
    {icon:'🍴',label:'Forks',value:data.forks,detail:'Forks: '+formatNum(data.forks)+' | Stars: '+formatNum(data.stars)},
    {icon:'❗',label:'Issues',value:data.open_issues,detail:'Open issues: '+data.open_issues+' | Open PRs: '+data.open_prs},
    {icon:'🔀',label:'Pull Requests',value:data.open_prs,detail:'Open PRs: '+data.open_prs+' | Open issues: '+data.open_issues},
    {icon:'📝',label:'Commits',value:data.stats.total_commits,detail:'Total: '+formatNum(data.stats.total_commits)+' | Avg/week: '+weeklyAvg},
    {icon:'👥',label:'Contributors',value:totalAuthors,detail:totalAuthors+' unique contributors | Bus factor: '+data.stats.bus_factor},
    {icon:'📦',label:'Releases',value:totalReleases,detail:totalReleases+' releases published'},
    {icon:'➕',label:'Additions',value:data.stats.total_additions,detail:'+'+formatNum(data.stats.total_additions)+' lines added'},
    {icon:'➖',label:'Deletions',value:data.stats.total_deletions,detail:'-'+formatNum(data.stats.total_deletions)+' lines removed'},
    {icon:'🛡️',label:'Bus Factor',value:data.stats.bus_factor,detail:'Bus factor: '+data.stats.bus_factor+' | '+(data.stats.bus_factor>=3?'Healthy':'Needs more contributors')}
  ];
  statsGrid.innerHTML='';
  stats.forEach(function(s,i){
    var card=document.createElement('div');
    card.className='stat-card';
    card.style.animationDelay=(i*60)+'ms';
    var detail=s.detail||s.label+': '+formatNum(s.value);
    card.setAttribute('data-tip',detail);
    card.innerHTML='<span class="stat-icon">'+s.icon+'</span><span class="stat-number" data-target="'+s.value+'">0</span><span class="stat-label">'+s.label+'</span>';
    card.addEventListener('mouseenter',function(e){showTooltip(e,detail)});
    card.addEventListener('mouseleave',hideTooltip);
    statsGrid.appendChild(card);
    var numEl=card.querySelector('.stat-number');
    setTimeout(function(){animateCount(numEl,s.value)},200+i*60);
  });
}

// ===== Language Bars =====
function renderLangBars(langs){
  if(!langs||!langs.length){langBars.innerHTML='';return}
  langBars.innerHTML='';
  langs.forEach(function(l,i){
    var row=document.createElement('div');row.className='lang-bar-row';
    row.innerHTML='<span class="lang-bar-name">'+esc(l.name)+'</span><div class="lang-bar-track"><div class="lang-bar-fill" style="width:0%;background:'+esc(l.color)+'" data-w="'+Math.round(l.pct)+'%"></div></div><span class="lang-bar-pct">'+l.pct.toFixed(1)+'%</span>';
    langBars.appendChild(row);
    setTimeout(function(){
      row.querySelector('.lang-bar-fill').style.width=Math.round(l.pct)+'%';
    },300+i*100);
  });
}

// ===== Donut Chart =====
function drawLangChart(langs){
  var canvas=langCanvas,ctx2=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var container=canvas.parentElement;
  var W=container.clientWidth-48;
  if(W<200)W=200;
  canvas.style.width=W+'px';
  canvas.style.height='280px';
  canvas.width=W*dpr;canvas.height=280*dpr;
  ctx2.scale(dpr,dpr);
  var H=280;
  var cx=W/2,cy=H/2-10,R=Math.min(W,H)/2-40,r=R*.55;
  if(!langs||!langs.length)return;

  var total=langs.reduce(function(a,b){return a+b.bytes},0);
  var animProgress=0;
  var hoveredIdx=-1;
  var sliceAngles=[];

  function draw(){
    ctx2.clearRect(0,0,W,H);
    var currentAngle=-Math.PI/2;
    sliceAngles=[];

    for(var i=0;i<langs.length;i++){
      var l=langs[i];
      var sweep=(l.bytes/total)*Math.PI*2*animProgress;
      var isHovered=(i===hoveredIdx);
      var expandR=isHovered?8:0;
      var drawR=R+expandR;
      var drawR2=r-expandR/2;
      if(drawR2<0)drawR2=0;

      sliceAngles.push({start:currentAngle,end:currentAngle+sweep,lang:l});

      ctx2.beginPath();
      ctx2.arc(cx,cy,drawR,currentAngle,currentAngle+sweep);
      ctx2.arc(cx,cy,drawR2,currentAngle+sweep,currentAngle,true);
      ctx2.closePath();
      ctx2.fillStyle=l.color;
      if(isHovered){ctx2.shadowColor=l.color;ctx2.shadowBlur=20}
      ctx2.fill();
      ctx2.shadowBlur=0;

      // Label line for large slices
      if(sweep>0.3&&animProgress>=1){
        var midAngle=currentAngle+sweep/2;
        var labelR=drawR+14;
        var lx=cx+labelR*Math.cos(midAngle);
        var ly=cy+labelR*Math.sin(midAngle);
        ctx2.fillStyle='#c9d1d9';ctx2.font='bold 11px Inter,system-ui';
        ctx2.textAlign=midAngle>Math.PI/2&&midAngle<Math.PI*1.5?'right':'left';
        ctx2.textBaseline='middle';
        ctx2.fillText(l.name,lx,ly);
      }

      currentAngle+=sweep;
    }

    // Center hole
    ctx2.beginPath();ctx2.arc(cx,cy,r-1,0,Math.PI*2);
    ctx2.fillStyle='rgba(13,17,23,.92)';ctx2.fill();

    // Center text
    ctx2.fillStyle='#f0f6fc';ctx2.font='bold 24px Inter,system-ui';ctx2.textAlign='center';ctx2.textBaseline='middle';
    ctx2.fillText(langs.length,cx,cy-8);
    ctx2.fillStyle='#8b949e';ctx2.font='12px Inter,system-ui';
    ctx2.fillText('languages',cx,cy+14);

    // Legend
    var lx=W-150,ly=16;
    ctx2.textAlign='left';
    for(var i=0;i<langs.length;i++){
      var l=langs[i];
      var isHov=(i===hoveredIdx);
      ctx2.fillStyle=l.color;ctx2.fillRect(lx,ly,10,10);
      ctx2.fillStyle=isHov?'#f0f6fc':'#8b949e';ctx2.font=(isHov?'bold ':'')+' 11px Inter,system-ui';
      ctx2.fillText(l.name+' '+l.pct.toFixed(0)+'%',lx+16,ly+9);
      ly+=20;
    }

    if(animProgress<1){animProgress+=.025;requestAnimationFrame(draw)}
  }

  // Hover detection
  canvas.onmousemove=function(e){
    var rect=canvas.getBoundingClientRect();
    var mx=(e.clientX-rect.left)*(W/rect.width);
    var my=(e.clientY-rect.top)*(H/rect.height);
    var dx=mx-cx,dy=my-cy;
    var dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>r&&dist<R+10){
      var angle=Math.atan2(dy,dx);
      if(angle<-Math.PI/2)angle+=Math.PI*2;
      for(var i=0;i<sliceAngles.length;i++){
        var s=sliceAngles[i];
        if(angle>=s.start&&angle<=s.end){
          if(hoveredIdx!==i){hoveredIdx=i;draw()}
          showTooltip(e,s.lang.name+': '+s.lang.pct.toFixed(1)+'%');
          return;
        }
      }
    }
    if(hoveredIdx!==-1){hoveredIdx=-1;draw();hideTooltip()}
  };
  canvas.onmouseleave=function(){hoveredIdx=-1;draw();hideTooltip()};

  draw();
}

// Resize handler for all charts
window.addEventListener('resize',function(){
  clearTimeout(window._chartResizeTimer);
  window._chartResizeTimer=setTimeout(function(){
    if(currentData&&currentData.languages){drawLangChart(currentData.languages)}
    if(currentData&&currentData.stats){drawStarGraph(currentData,currentData.stats)}
    if(currentData&&currentData.stats.weekly_commits){drawCommitChart(currentData.stats.weekly_commits)}
  },200);
});
  draw();
}

// ===== Radar Chart =====
function drawStarGraph(data,stats){
  var canvas=starCanvas,ctx2=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var container=canvas.parentElement;
  var W=container.clientWidth-48;
  if(W<200)W=200;
  canvas.style.width=W+'px';
  canvas.style.height='280px';
  canvas.width=W*dpr;canvas.height=280*dpr;
  ctx2.scale(dpr,dpr);
  var H=280;
  var cx=W/2,cy=H/2,R=Math.min(W,H)/2-40;

  var metrics=[
    {label:'Stars',value:Math.min(data.stars/100,1)},
    {label:'Forks',value:Math.min(data.forks/50,1)},
    {label:'Issues',value:data.open_issues>0?Math.min(data.open_issues/20,1):0},
    {label:'Contributors',value:Math.min((stats.authors?stats.authors.length:0)/10,1)},
    {label:'Commits',value:Math.min(stats.total_commits/500,1)},
    {label:'Releases',value:Math.min((data.releases?data.releases.length:0)/10,1)},
    {label:'Bus Factor',value:Math.min(stats.bus_factor/5,1)},
    {label:'Activity',value:stats.weekly_commits?Math.min(stats.weekly_commits.length/10,1):0}
  ];
  var n=metrics.length;
  var animP=0;

  function draw(){
    ctx2.clearRect(0,0,W,H);
    // Grid
    for(var ring=1;ring<=5;ring++){
      ctx2.beginPath();
      for(var i=0;i<=n;i++){
        var angle=(Math.PI*2/n)*i-Math.PI/2;
        var rr=R*ring/5;
        var px=cx+rr*Math.cos(angle),py=cy+rr*Math.sin(angle);
        if(i===0)ctx2.moveTo(px,py);else ctx2.lineTo(px,py);
      }
      ctx2.strokeStyle='rgba(255,255,255,.04)';ctx2.lineWidth=1;ctx2.stroke();
    }
    // Axes
    for(var i=0;i<n;i++){
      var angle=(Math.PI*2/n)*i-Math.PI/2;
      ctx2.beginPath();ctx2.moveTo(cx,cy);
      ctx2.lineTo(cx+R*Math.cos(angle),cy+R*Math.sin(angle));
      ctx2.strokeStyle='rgba(255,255,255,.06)';ctx2.stroke();
    }
    // Data polygon
    ctx2.beginPath();
    for(var i=0;i<=n;i++){
      var idx=i%n;
      var angle=(Math.PI*2/n)*idx-Math.PI/2;
      var val=metrics[idx].value*animP;
      var px=cx+R*val*Math.cos(angle),py=cy+R*val*Math.sin(angle);
      if(i===0)ctx2.moveTo(px,py);else ctx2.lineTo(px,py);
    }
    ctx2.closePath();
    ctx2.fillStyle='rgba(88,166,255,.12)';ctx2.fill();
    ctx2.strokeStyle='#58a6ff';ctx2.lineWidth=2;ctx2.stroke();
    // Dots + labels
    for(var i=0;i<n;i++){
      var angle=(Math.PI*2/n)*i-Math.PI/2;
      var val=metrics[i].value*animP;
      var px=cx+R*val*Math.cos(angle),py=cy+R*val*Math.sin(angle);
      ctx2.beginPath();ctx2.arc(px,py,4,0,Math.PI*2);
      ctx2.fillStyle='#58a6ff';ctx2.fill();
      ctx2.strokeStyle='#0d1117';ctx2.lineWidth=2;ctx2.stroke();
      // Label
      var lx=cx+(R+18)*Math.cos(angle),ly=cy+(R+18)*Math.sin(angle);
      ctx2.fillStyle='#8b949e';ctx2.font='11px Inter,system-ui';ctx2.textAlign='center';ctx2.textBaseline='middle';
      ctx2.fillText(metrics[i].label,lx,ly);
    }
    if(animP<1){animP+=.025;requestAnimationFrame(draw)}
  }
  draw();
}

// ===== Commit Chart =====
function drawCommitChart(weeks){
  var canvas=commitCanvas,ctx2=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var container=canvas.parentElement;
  var W=container.clientWidth-48;
  if(W<300)W=300;
  canvas.style.width=W+'px';
  canvas.style.height='240px';
  canvas.width=W*dpr;canvas.height=240*dpr;
  ctx2.scale(dpr,dpr);
  var H=240;
  var pad={t:20,r:20,b:40,l:50};
  var cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;

  if(!weeks||!weeks.length){
    ctx2.fillStyle='#484f58';ctx2.font='14px Inter,system-ui';ctx2.textAlign='center';
    ctx2.fillText('No commit activity data',W/2,H/2);
    return;
  }
  var maxC=Math.max.apply(null,weeks.map(function(w){return w.commits}));if(maxC===0)maxC=1;
  var step=cw/(weeks.length-1||1);
  var animP=0;

  function draw(){
    ctx2.clearRect(0,0,W,H);
    // Grid
    for(var i=0;i<=4;i++){
      var y=pad.t+ch*(1-i/4);
      ctx2.beginPath();ctx2.moveTo(pad.l,y);ctx2.lineTo(W-pad.r,y);
      ctx2.strokeStyle='rgba(255,255,255,.04)';ctx2.lineWidth=1;ctx2.stroke();
      ctx2.fillStyle='#484f58';ctx2.font='10px Inter,system-ui';ctx2.textAlign='right';
      ctx2.fillText(Math.round(maxC*i/4),pad.l-8,y+3);
    }
    // Area
    ctx2.beginPath();
    ctx2.moveTo(pad.l,pad.t+ch);
    var visibleCount=Math.floor(weeks.length*animP);
    for(var i=0;i<visibleCount;i++){
      var x=pad.l+i*step;
      var y=pad.t+ch-(weeks[i].commits/maxC)*ch;
      if(i===0)ctx2.lineTo(x,y);else{
        var prevX=pad.l+(i-1)*step;
        var prevY=pad.t+ch-(weeks[i-1].commits/maxC)*ch;
        var cpx1=prevX+step*.4,cpx2=x-step*.4;
        ctx2.bezierCurveTo(cpx1,prevY,cpx2,y,x,y);
      }
    }
    var lastX=pad.l+visibleCount*step-step;
    ctx2.lineTo(lastX,pad.t+ch);ctx2.closePath();
    var grad=ctx2.createLinearGradient(0,pad.t,0,pad.t+ch);
    grad.addColorStop(0,'rgba(88,166,255,.25)');grad.addColorStop(1,'rgba(88,166,255,0)');
    ctx2.fillStyle=grad;ctx2.fill();
    // Line
    ctx2.beginPath();
    for(var i=0;i<visibleCount;i++){
      var x=pad.l+i*step;
      var y=pad.t+ch-(weeks[i].commits/maxC)*ch;
      if(i===0)ctx2.moveTo(x,y);else{
        var prevX=pad.l+(i-1)*step;
        var prevY=pad.t+ch-(weeks[i-1].commits/maxC)*ch;
        ctx2.bezierCurveTo(prevX+step*.4,prevY,x-step*.4,y,x,y);
      }
    }
    ctx2.strokeStyle='#58a6ff';ctx2.lineWidth=2;ctx2.stroke();
    // Dots
    for(var i=0;i<visibleCount;i++){
      var x=pad.l+i*step;
      var y=pad.t+ch-(weeks[i].commits/maxC)*ch;
      ctx2.beginPath();ctx2.arc(x,y,3,0,Math.PI*2);
      ctx2.fillStyle='#58a6ff';ctx2.fill();
    }
    // X labels
    var labelStep=Math.max(1,Math.floor(weeks.length/8));
    for(var i=0;i<weeks.length;i+=labelStep){
      var x=pad.l+i*step;
      ctx2.fillStyle='#484f58';ctx2.font='9px Inter,system-ui';ctx2.textAlign='center';
      ctx2.fillText(weeks[i].week.substring(5),x,H-pad.b+16);
    }
    if(animP<1){animP+=.03;requestAnimationFrame(draw)}

    // Hover tooltip
    canvas.onmousemove=function(e){
      var rect=canvas.getBoundingClientRect();
      var mx=e.clientX-rect.left,my=e.clientY-rect.top;
      var found=false;
      for(var i=0;i<weeks.length;i++){
        var x=pad.l+i*step;
        var y=pad.t+ch-(weeks[i].commits/maxC)*ch;
        if(Math.abs(mx-x)<8&&Math.abs(my-y)<12){
          var tip=canvas._tip;
          if(!tip){tip=document.createElement('div');tip.className='chart-tooltip';canvas.parentElement.style.position='relative';canvas.parentElement.appendChild(tip);canvas._tip=tip}
          tip.textContent=weeks[i].week+': '+weeks[i].commits+' commits';
          tip.style.left=(x+10)+'px';tip.style.top=(y-30)+'px';tip.style.opacity='1';
          found=true;break;
        }
      }
      if(!found&&canvas._tip)canvas._tip.style.opacity='0';
    };
    canvas.onmouseleave=function(){if(canvas._tip)canvas._tip.style.opacity='0'};
  }
  draw();
}

// ===== Contributors =====
function renderContributors(authors){
  if(!authors||!authors.length){contribBody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#484f58;padding:20px">No contributors found</td></tr>';return}
  var sorted=authors.slice().sort(function(a,b){return b.commits-a.commits});
  var maxCommits=sorted[0]?sorted[0].commits:1;
  contribBody.innerHTML='';
  sorted.forEach(function(a,i){
    var pct=Math.round(a.commits/maxCommits*100);
    var row=document.createElement('tr');
    row.className='contrib-row';
    row.style.animationDelay=(i*80)+'ms';
    row.innerHTML='<td>'+(a.avatar_url?'<img class="avatar" src="'+esc(a.avatar_url)+'" alt="" loading="lazy">':'<span class="avatar" style="background:#30363d;display:inline-block"></span>')+'</td><td><a class="login" href="https://github.com/'+esc(a.login)+'" target="_blank">'+esc(a.login)+'</a></td><td>'+a.commits+'</td><td style="color:#3fb950">+'+formatNum(a.additions)+'</td><td style="color:#f85149">-'+formatNum(a.deletions)+'</td><td><span class="pct-bar" style="width:0;background:linear-gradient(90deg,#1f6feb,#58a6ff)" data-w="'+pct+'%"></span> '+pct+'%</td>';
    contribBody.appendChild(row);
    setTimeout(function(){row.querySelector('.pct-bar').style.width=pct+'%'},400+i*80);
  });
  // Bus factor
  if(busFactorBadge){
    var bf=currentData?currentData.stats.bus_factor:0;
    busFactorBadge.textContent='Bus Factor: '+bf;
    busFactorBadge.className='bus-badge '+(bf>=3?'good':bf>=2?'warn':'bad');
  }
}

// ===== Releases =====
function renderReleases(releases){
  if(!releases||!releases.length){releaseList.innerHTML='<div style="text-align:center;color:#484f58;padding:20px">No releases</div>';return}
  releaseList.innerHTML='';
  releases.forEach(function(r,i){
    var item=document.createElement('div');item.className='rel-item';
    item.style.animationDelay=(i*60)+'ms';
    var d=r.published_at?new Date(r.published_at).toLocaleDateString():'';
    item.innerHTML='<a class="rel-name" href="'+esc(r.url)+'" target="_blank">'+esc(r.name||r.tag_name)+'</a><div class="rel-right"><span class="rel-tag">'+esc(r.tag_name)+'</span><span class="rel-date">'+d+'</span></div>';
    releaseList.appendChild(item);
  });
}

// ===== Badges =====
function renderEmbed(data){
  if(!data)return;
  var types=[
    {type:'overview',label:'Overview',desc:'Stars, forks, issues combined'},
    {type:'stars',label:'Stars',desc:'Stargazer count'},
    {type:'forks',label:'Forks',desc:'Fork count'},
    {type:'issues',label:'Issues',desc:'Open issues count'},
    {type:'language',label:'Language',desc:'Primary language'},
    {type:'commits',label:'Commits',desc:'Total commit count'},
    {type:'contributors',label:'Contributors',desc:'Unique contributors'},
    {type:'bus-factor',label:'Bus Factor',desc:'Code ownership risk'},
    {type:'activity',label:'Activity',desc:'Weekly commit trend'},
    {type:'health',label:'Health',desc:'Overall health score'}
  ];
  var grid=$('badgeGrid');grid.innerHTML='';
  types.forEach(function(t,i){
    var item=document.createElement('div');item.className='badge-item';
    item.style.animationDelay=(i*50)+'ms';
    var gifUrl='/api/badge/gif?type='+t.type+'&url='+encodeURIComponent(data.url);
    var svgUrl='/api/badge?type='+t.type+'&url='+encodeURIComponent(data.url);
    item.innerHTML='<div class="badge-item-header"><span class="badge-item-label">'+t.label+'</span><span class="badge-item-desc">'+t.desc+'</span></div><div class="badge-item-preview"><img src="'+gifUrl+'" alt="'+t.label+' badge" loading="lazy" onerror="this.onerror=null;this.src=\''+svgUrl+'\'"></div><div class="badge-item-actions"><button class="btn-badge-copy" title="Copy embed" data-url="'+gifUrl+'" data-name="'+t.type+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><a class="btn-badge-dl" title="Download SVG" href="'+svgUrl+'" download><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a><button class="btn-badge-upload" title="Upload to imgbb" data-url="'+gifUrl+'" data-name="'+t.type+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button></div>';
    grid.appendChild(item);
    // Lazy-load with retry: GIF → SVG fallback
    var img=item.querySelector('img');
    img.onload=function(){this.style.opacity='1'};
    img.style.opacity='0';img.style.transition='opacity .4s';
  });
  // Copy buttons
  grid.querySelectorAll('.btn-badge-copy').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var md='![badge]('+btn.dataset.url+')';
      navigator.clipboard.writeText(md).then(function(){
        btn.classList.add('copied');btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(function(){btn.classList.remove('copied');btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'},2000);
      });
    });
  });
  // Individual upload
  grid.querySelectorAll('.btn-badge-upload').forEach(function(btn){
    btn.addEventListener('click',async function(e){
      e.stopPropagation();
      btn.disabled=true;btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/></svg>';
      try{
        var resp=await fetch('/api/badge/upload?url='+encodeURIComponent(data.url)+'&type='+btn.dataset.name,{method:'POST'});
        var result=await resp.json();
        if(result.url){navigator.clipboard.writeText('![GitViz '+btn.dataset.name+']('+result.url+')');btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';btn.style.background='rgba(46,160,67,.12)'}
        else{btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      }catch(ex){btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      setTimeout(function(){btn.disabled=false;btn.style.background=''},2000);
    });
  });
  // Set embed code
  if(data.url){
    embedCode.textContent='![GitViz]('+window.location.origin+'/api/badge/gif?type=overview&url='+encodeURIComponent(data.url)+')';
  }
}

// ===== Upload All with SSE Progress =====
var uploadAllBtn=$('uploadAllBtn');
if(uploadAllBtn){
  uploadAllBtn.addEventListener('click',async function(){
    if(!currentData)return;
    var panel=$('uploadProgress');panel.style.display='block';
    var fill=$('uploadProgressFill'),pct=$('uploadPercent'),body=$('uploadLogBody');
    body.innerHTML='';fill.style.width='0%';pct.textContent='0 / 10';
    uploadAllBtn.disabled=true;uploadAllBtn.style.opacity='.5';

    addUploadLog('upload','Connecting to server...');
    var done=0;var total=10;

    // Connect SSE for live progress
    var es=new EventSource('/api/progress');
    es.onmessage=function(e){
      var ev=JSON.parse(e.data);
      if(ev.stage&&ev.message&&ev.stage!=='done'){
        addUploadLog(ev.stage,ev.message);
        done++;fill.style.width=Math.round(Math.min(done,total)/total*100)+'%';
        pct.textContent=Math.min(done,total)+' / '+total;
      }
      if(ev.done||ev.error){es.close();fill.style.width='100%';pct.textContent='Done!'}
    };
    es.onerror=function(){es.close()};

    // Fire the actual upload
    try{
      var result=await fetch('/api/badge/upload-all?url='+encodeURIComponent(currentData.url),{method:'POST'}).then(function(r){return r.json()});
      es.close();
      if(result.badges){
        body.innerHTML='';done=0;
        result.badges.forEach(function(b,i){
          addUploadLog('imgbb',b.type+' → '+b.url);
          done++;fill.style.width=Math.round(done/total*100)+'%';pct.textContent=done+' / '+total;
        });
        addUploadLog('done','All '+result.badges.length+' badges uploaded!');
        fill.style.width='100%';pct.textContent='Done!';
        // Update badge previews with cloud URLs
        var grid=$('badgeGrid');
        if(grid){
          var items=grid.querySelectorAll('.badge-item');
          result.badges.forEach(function(b){
            items.forEach(function(item){
              var img=item.querySelector('img');
              if(img&&img.src.includes('type='+b.type+'&')){
                img.src=b.url;
              }
            });
          });
        }
      }else{
        addUploadLog('error',result.error||'Upload failed');
      }
    }catch(ex){
      es.close();
      addUploadLog('error','Upload failed: '+ex.message);
    }
    uploadAllBtn.disabled=false;uploadAllBtn.style.opacity='1';
  });
}

// ===== Auth =====
async function checkAuth(){
  try{
    var r=await fetch('/api/user');var d=await r.json();
    if(d.logged_in){
      currentUser=d;
      userArea.innerHTML='<img src="'+esc(d.avatar_url)+'" style="width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.1)"><span style="font-size:12px;color:#c9d1d9;margin-left:6px">'+esc(d.login)+'</span>';
      tokenInfo.style.display='none';loginBtn.style.display='none';
    }else if(d.token_mode){
      tokenInfo.textContent='Token Mode';tokenInfo.style.display='inline';
      loginBtn.style.display='none';userArea.innerHTML='';
    }else{
      loginBtn.style.display='flex';userArea.innerHTML='';
    }
  }catch(ex){}
}

// ===== Init =====
function init(){
  checkAuth();
  analyzeBtn.addEventListener('click',function(){triggerAnalyze(repoInput.value.trim())});
  repoInput.addEventListener('keydown',function(e){if(e.key==='Enter')triggerAnalyze(repoInput.value.trim())});
  heroBtn.addEventListener('click',function(){triggerAnalyze(heroInput.value.trim())});
  heroInput.addEventListener('keydown',function(e){if(e.key==='Enter')triggerAnalyze(heroInput.value.trim())});
  document.querySelectorAll('.chip[data-repo]').forEach(function(el){
    el.addEventListener('click',function(){triggerAnalyze(el.dataset.repo)});
  });
  document.querySelectorAll('.chip[data-profile]').forEach(function(el){
    el.addEventListener('click',function(){analyzeProfile(el.dataset.profile)});
  });
  newAnalysisBtn.addEventListener('click',function(){
    dashboard.style.display='none';landing.style.display='flex';landing.style.flexDirection='column';landing.style.alignItems='center';
    newAnalysisBtn.style.display='none';repoHeader.style.display='none';
    loading.style.display='none';
    var embedSection=$('embedSection');if(embedSection)embedSection.style.display='';
    var commitSection=$('commitSection');if(commitSection)commitSection.parentElement.style.display='';
    var starSection=$('starSection');if(starSection)starSection.style.display='';
    var avatars=document.querySelectorAll('.profile-avatar');avatars.forEach(function(a){a.remove()});
    var thRow=document.querySelector('#contribTable thead tr');
    if(thRow)thRow.innerHTML='<th></th><th>Contributor</th><th>Commits</th><th>Added</th><th>Deleted</th><th>Share</th>';
    var sectionTitle=document.querySelector('#releaseSection .section-title');
    if(sectionTitle)sectionTitle.textContent='Recent Releases';
    window.scrollTo({top:0,behavior:'smooth'});
  });
  loginBtn.addEventListener('click',function(){window.location.href='/auth/github'});

  // Settings
  var settingsModal=$('settingsModal'),settingsBtn=$('settingsBtn'),closeSettingsBtn=$('closeSettingsBtn'),saveSettingsBtn=$('saveSettingsBtn'),settingsStatus=$('settingsStatus');
  settingsBtn.addEventListener('click',function(){settingsModal.style.display='flex';loadSettingsForm()});
  closeSettingsBtn.addEventListener('click',function(){settingsModal.style.display='none'});
  settingsModal.addEventListener('click',function(e){if(e.target===settingsModal)settingsModal.style.display='none'});
  saveSettingsBtn.addEventListener('click',function(){
    var payload={
      github_token:$('settingsToken').value.trim(),
      github_client_id:$('settingsClientID').value.trim(),
      github_client_secret:$('settingsClientSecret').value.trim(),
      imgbb_api_key:$('settingsImgBB').value.trim(),
      port:$('settingsPort').value.trim()
    };
    saveSettingsBtn.disabled=true;saveSettingsBtn.textContent='Saving...';
    fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    .then(function(r){return r.json()}).then(function(d){
      saveSettingsBtn.disabled=false;saveSettingsBtn.textContent='Save Settings';
      settingsStatus.textContent=d.status==='saved'?'Saved!':'Error';
      settingsStatus.className='settings-status '+(d.status==='saved'?'success':'error');
      setTimeout(function(){settingsStatus.textContent=''},3000);
    }).catch(function(){
      saveSettingsBtn.disabled=false;saveSettingsBtn.textContent='Save Settings';
      settingsStatus.textContent='Failed';settingsStatus.className='settings-status error';
    });
  });

  copyBtn.addEventListener('click',function(){
    navigator.clipboard.writeText(embedCode.textContent).then(function(){
      copyBtn.textContent='Copied!';setTimeout(function(){copyBtn.textContent='Copy'},2000);
    });
  });

  // Download All SVGs
  var downloadAllBtn=$('downloadAllBtn');
  if(downloadAllBtn){
    downloadAllBtn.addEventListener('click',function(){
      if(!currentData)return;
      var types=['overview','stars','forks','issues','language','commits','contributors','bus-factor','activity','health'];
      types.forEach(function(t){
        var a=document.createElement('a');
        a.href='/api/badge?type='+t+'&url='+encodeURIComponent(currentData.url);
        a.download='gitviz-'+t+'.svg';
        document.body.appendChild(a);a.click();a.remove();
      });
    });
  }

  // Copy All Embed Codes
  var copyAllBtn=$('copyAllBtn');
  if(copyAllBtn){
    copyAllBtn.addEventListener('click',function(){
      if(!currentData)return;
      var types=['overview','stars','forks','issues','language','commits','contributors','bus-factor','activity','health'];
      var codes=types.map(function(t){
        return '![GitViz '+t+']('+window.location.origin+'/api/badge/gif?type='+t+'&url='+encodeURIComponent(currentData.url)+')';
      }).join('\n');
      navigator.clipboard.writeText(codes).then(function(){
        copyAllBtn.textContent='Copied!';setTimeout(function(){copyAllBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy All Embed Codes'},2000);
      });
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      var sm=$('settingsModal');
      if(sm&&sm.style.display==='flex')sm.style.display='none';
    }
    // Ctrl+K or Cmd+K to focus search
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){
      e.preventDefault();
      if(dashboard.style.display==='block'&&repoInput){repoInput.focus();repoInput.select()}
      else if(heroInput){heroInput.focus();heroInput.select()}
    }
  });

  // Badge click to preview
  document.addEventListener('click',function(e){
    var badgeItem=e.target.closest('.badge-item');
    if(!badgeItem)return;
    if(e.target.closest('.btn-badge-copy')||e.target.closest('.btn-badge-dl')||e.target.closest('.btn-badge-upload'))return;
    var img=badgeItem.querySelector('img');
    if(img&&img.src){
      var preview=$('badgePreview');
      preview.innerHTML='<img src="'+img.src+'" style="max-width:100%;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.4)">';
      preview.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  });
}

async function loadSettingsForm(){
  try{
    var r=await fetch('/api/settings');var s=await r.json();
    $('settingsToken').value=s.github_token||'';
    $('settingsClientID').value=s.github_client_id||'';
    $('settingsClientSecret').value=s.github_client_secret||'';
    $('settingsImgBB').value=s.imgbb_api_key||'';
    $('settingsPort').value=s.port||'';
  }catch(ex){}
}

init();
})();
