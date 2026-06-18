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

// ===== Landing Stats Counter =====
function animateLandingStats(){
  var nums=document.querySelectorAll('.ls-num');
  nums.forEach(function(el){
    var target=parseInt(el.dataset.target)||0;
    var current=0;var step=Math.max(1,Math.floor(target/50));
    var iv=setInterval(function(){
      current+=step;if(current>=target){current=target;clearInterval(iv)}
      el.textContent=current;
    },25);
  });
}
animateLandingStats();

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
  if(!url.match(/github\.com\//)){
    if(url.match(/^[\w.-]+\/[\w.-]+$/)){url='https://github.com/'+url}
    else{showError('Enter a GitHub URL or "user/repo" format');return}
  }
  analyze(url);
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

// ===== Stats =====
function renderStats(data){
  var stats=[
    {icon:'⭐',label:'Stars',value:data.stars},
    {icon:'🍴',label:'Forks',value:data.forks},
    {icon:'❗',label:'Issues',value:data.open_issues},
    {icon:'🔀',label:'Pull Requests',value:data.open_prs},
    {icon:'📝',label:'Commits',value:data.stats.total_commits},
    {icon:'👥',label:'Contributors',value:data.stats.authors?data.stats.authors.length:0},
    {icon:'📦',label:'Releases',value:data.releases?data.releases.length:0},
    {icon:'➕',label:'Additions',value:data.stats.total_additions},
    {icon:'➖',label:'Deletions',value:data.stats.total_deletions},
    {icon:'🛡️',label:'Bus Factor',value:data.stats.bus_factor}
  ];
  statsGrid.innerHTML='';
  stats.forEach(function(s,i){
    var card=document.createElement('div');
    card.className='stat-card';
    card.style.animationDelay=(i*60)+'ms';
    card.innerHTML='<span class="stat-icon">'+s.icon+'</span><span class="stat-number" data-target="'+s.value+'">0</span><span class="stat-label">'+s.label+'</span>';
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
  canvas.width=canvas.offsetWidth*dpr;canvas.height=280*dpr;
  ctx2.scale(dpr,dpr);
  var W=canvas.offsetWidth,H=280;
  var cx=W/2,cy=H/2,R=Math.min(W,H)/2-30,r=R*.55;
  if(!langs||!langs.length)return;

  var total=langs.reduce(function(a,b){return a+b.bytes},0);
  var angle=-Math.PI/2;
  var animProgress=0;

  function draw(){
    ctx2.clearRect(0,0,W,H);
    var currentAngle=-Math.PI/2;
    langs.forEach(function(l){
      var sweep=(l.bytes/total)*Math.PI*2*animProgress;
      ctx2.beginPath();ctx2.moveTo(cx+r*Math.cos(currentAngle),cy+r*Math.sin(currentAngle));
      ctx2.arc(cx,cy,R,currentAngle,currentAngle+sweep);
      ctx2.arc(cx,cy,r,currentAngle+sweep,currentAngle,true);
      ctx2.closePath();
      ctx2.fillStyle=l.color;ctx2.fill();
      currentAngle+=sweep;
    });
    // Center hole
    ctx2.beginPath();ctx2.arc(cx,cy,r-1,0,Math.PI*2);
    ctx2.fillStyle='rgba(13,17,23,.9)';ctx2.fill();
    // Center text
    ctx2.fillStyle='#f0f6fc';ctx2.font='bold 22px Inter,system-ui';ctx2.textAlign='center';ctx2.textBaseline='middle';
    ctx2.fillText(langs.length,cx,cy-8);
    ctx2.fillStyle='#8b949e';ctx2.font='12px Inter,system-ui';
    ctx2.fillText('languages',cx,cy+12);
    // Legend
    var lx=W-140,ly=20;
    langs.forEach(function(l){
      ctx2.fillStyle=l.color;ctx2.fillRect(lx,ly,10,10);
      ctx2.fillStyle='#c9d1d9';ctx2.font='11px Inter,system-ui';ctx2.textAlign='left';
      ctx2.fillText(l.name+' '+l.pct.toFixed(0)+'%',lx+16,ly+9);
      ly+=20;
    });
    if(animProgress<1){animProgress+=.03;requestAnimationFrame(draw)}
  }
  draw();
}

// ===== Radar Chart =====
function drawStarGraph(data,stats){
  var canvas=starCanvas,ctx2=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  canvas.width=canvas.offsetWidth*dpr;canvas.height=280*dpr;
  ctx2.scale(dpr,dpr);
  var W=canvas.offsetWidth,H=280;
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
  canvas.width=canvas.offsetWidth*dpr;canvas.height=240*dpr;
  ctx2.scale(dpr,dpr);
  var W=canvas.offsetWidth,H=240;
  var pad={t:20,r:20,b:40,l:50};
  var cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;

  if(!weeks||!weeks.length)return;
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
    var badgeUrl='/api/badge/gif?type='+t.type+'&url='+encodeURIComponent(data.url);
    item.innerHTML='<div class="badge-item-header"><span class="badge-item-label">'+t.label+'</span><span class="badge-item-desc">'+t.desc+'</span></div><div class="badge-item-preview"><img src="'+badgeUrl+'" alt="'+t.label+' badge" loading="lazy"></div><div class="badge-item-actions"><button class="btn-badge-copy" title="Copy embed" data-url="'+badgeUrl+'" data-name="'+t.type+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><a class="btn-badge-dl" title="Download SVG" href="/api/badge?type='+t.type+'&url='+encodeURIComponent(data.url)+'" download><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a><button class="btn-badge-upload" title="Upload to imgbb" data-url="'+badgeUrl+'" data-name="'+t.type+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button></div>';
    grid.appendChild(item);
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
        var resp=await fetch('/api/badge/upload?url='+encodeURIComponent(btn.dataset.url)+'&name='+btn.dataset.name);
        var result=await resp.json();
        if(result.url){navigator.clipboard.writeText(result.url);btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';btn.style.background='rgba(46,160,67,.12)'}
        else{btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      }catch(ex){btn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
      setTimeout(function(){btn.disabled=false},2000);
    });
  });
  // Set embed code
  if(data.url){
    embedCode.textContent='![GitViz]('+window.location.origin+'/api/badge/gif?type=overview&url='+encodeURIComponent(data.url)+')';
  }
}

// ===== Upload All with Progress =====
var uploadAllBtn=$('uploadAllBtn');
if(uploadAllBtn){
  uploadAllBtn.addEventListener('click',async function(){
    if(!currentData)return;
    var panel=$('uploadProgress');panel.style.display='block';
    var fill=$('uploadProgressFill'),pct=$('uploadPercent'),body=$('uploadLogBody');
    body.innerHTML='';fill.style.width='0%';
    var types=['overview','stars','forks','issues','language','commits','contributors','bus-factor','activity','health'];
    var total=types.length+1;
    var done=0;

    addUploadLog('upload','Starting batch upload to imgbb...');
    try{
      var resp=await fetch('/api/badge/upload-all?url='+encodeURIComponent(currentData.url));
      var reader=resp.body.getReader();
      var decoder=new TextDecoder();
      var buffer='';
      while(true){
        var chunk=await reader.read();
        if(chunk.done)break;
        buffer+=decoder.decode(chunk,{stream:true});
        var lines=buffer.split('\n');
        buffer=lines.pop();
        for(var i=0;i<lines.length;i++){
          var line=lines[i].trim();
          if(!line||!line.startsWith('data:'))continue;
          try{
            var ev=JSON.parse(line.substring(5));
            if(ev.stage&&ev.message){
              addUploadLog(ev.stage,ev.message);
              done++;
              fill.style.width=Math.round(done/total*100)+'%';
              pct.textContent=done+' / '+total;
            }
          }catch(ex){}
        }
      }
      // Fallback: simple fetch
      if(done===0){
        var result=await fetch('/api/badge/upload-all?url='+encodeURIComponent(currentData.url)).then(function(r){return r.json()});
        if(result.badges){
          result.badges.forEach(function(b,i){
            addUploadLog('imgbb',b.type+' → '+b.url);
            done++;fill.style.width=Math.round(done/total*100)+'%';pct.textContent=done+' / '+total;
          });
        }
      }
      addUploadLog('done','All badges uploaded successfully!');
      fill.style.width='100%';pct.textContent='Done!';
    }catch(ex){
      addUploadLog('error','Upload failed: '+ex.message);
    }
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
  newAnalysisBtn.addEventListener('click',function(){
    dashboard.style.display='none';landing.style.display='flex';
    newAnalysisBtn.style.display='none';
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
