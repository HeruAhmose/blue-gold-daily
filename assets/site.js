/* =====================================================================
   True Mélange Φ — site runtime
   No framework. Web Components for chrome, WebGL for atmosphere,
   canvas2D for the phyllotaxis mark, native APIs everywhere else.
   ===================================================================== */
(function(){
"use strict";
var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Explicit, non-autoplay listening layer. Fresh page loads are silent. */
var TMSound=(function(){
  var ctx=null, master=null, enabled=false;
  function ensure(){
    if(ctx) return ctx;
    var C=window.AudioContext||window.webkitAudioContext;
    if(!C) return null;
    ctx=new C(); master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination); return ctx;
  }
  function setEnabled(on){
    enabled=!!on;
    var c=enabled?ensure():ctx;
    if(c&&c.state==='suspended'&&enabled) c.resume();
    if(master&&c) master.gain.setTargetAtTime(enabled?.22:0,c.currentTime,.04);
    document.documentElement.dataset.blueGoldSound=enabled?'on':'off';
  }
  function play(kind){
    if(!enabled) return;
    var c=ensure(); if(!c||!master) return;
    var now=c.currentTime, notes=kind==='enable'?[392,523.25,659.25]:[kind==='hover'?659.25:523.25];
    notes.forEach(function(freq,i){
      var o=c.createOscillator(), g=c.createGain(); o.type=kind==='click'?'triangle':'sine'; o.frequency.value=freq;
      var t=now+i*.07; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(kind==='hover'?.035:.08,t+.015); g.gain.exponentialRampToValueAtTime(.001,t+(kind==='enable'?.32:.12));
      o.connect(g); g.connect(master); o.start(t); o.stop(t+(kind==='enable'?.36:.14));
    });
  }
  return {enabled:function(){return enabled},setEnabled:setEnabled,play:play};
})();
window.TMSound=TMSound;

if(!document.querySelector('link[rel~="icon"]')){
  var fav=document.createElement('link'); fav.rel='icon'; fav.type='image/svg+xml'; fav.href='assets/favicon.svg'; document.head.appendChild(fav);
}


/* Canonical organism worlds. */
window.PEOPLES_PORTFOLIO = "https://heruahmose.github.io/peoples-portfolio/";
window.TRAI_WORLD = "https://heruahmose.github.io/trai-portfolio/";

var PAGES = [
  {h:'index.html',    t:'Threshold',  n:'Enter'},
  {h:'product.html',  t:'Blue-Gold Daily', n:'The first release'},
  {h:'layers.html',   t:'Φ Layers',   n:'The formulation architecture'},
  {h:'science.html',  t:'Evidence',   n:'What we can prove'},
  {h:'organism.html', t:'TRAI',       n:'One organism, seven organs'},
  {h:'mission.html',  t:'Φ-21',       n:'The sovereignty loop'},
  {h:'join.html',     t:'Join',       n:'Two ways in'}
];

function here(){
  var p = location.pathname.split('/').pop();
  return (!p || p==='') ? 'index.html' : p;
}

/* ---------------- <site-nav> ---------------- */
customElements.define('site-nav', class extends HTMLElement{
  connectedCallback(){
    var cur = here();
    var links = PAGES.slice(1).map(function(p){
      return '<a href="'+p.h+'"'+(p.h===cur?' aria-current="page"':'')+'>'+p.t+'</a>';
    }).join('');
    this.innerHTML =
      '<nav class="nav">'+
        '<a class="brand" href="index.html"><b>Φ</b><span>True Mélange</span></a>'+
        '<div class="links" id="navlinks">'+links+
          '<a class="ext" data-trai-property="trai" href="'+window.PEOPLES_PORTFOLIO+'" target="_blank" rel="noopener">People’s Portfolio ↗</a>'+
        '</div>'+
        '<button class="soundtoggle" type="button" aria-pressed="false" data-bluegold-sound="off">Sound off</button>'+
        '<button class="navtoggle" aria-expanded="false" aria-controls="navlinks">Menu</button>'+
      '</nav>';
    var t = this.querySelector('.navtoggle'), l = this.querySelector('.links'), s = this.querySelector('.soundtoggle');
    s.addEventListener('click', function(){
      var next=!TMSound.enabled(); TMSound.setEnabled(next); s.dataset.bluegoldSound=next?'on':'off'; s.setAttribute('aria-pressed',next?'true':'false'); s.textContent=next?'Sound on':'Sound off'; if(next)TMSound.play('enable');
    });
    t.addEventListener('click', function(){
      var open = l.classList.toggle('open');
      t.setAttribute('aria-expanded', open?'true':'false');
      t.textContent = open ? 'Close' : 'Menu';
    });
  }
});

addEventListener('pointerover',function(e){var el=e.target.closest&&e.target.closest('a,button');if(el&&!el.classList.contains('soundtoggle'))TMSound.play('hover');},true);
addEventListener('click',function(e){var el=e.target.closest&&e.target.closest('a,button');if(el&&!el.classList.contains('soundtoggle'))TMSound.play('click');},true);

/* ---------------- <site-footer> ---------------- */
customElements.define('site-footer', class extends HTMLElement{
  connectedCallback(){
    this.innerHTML =
    '<footer class="foot"><div class="wrap">'+
      '<p class="std">Vast in vision. Exact in claim.</p>'+
      '<p class="spec" style="margin:0">Concord, North Carolina</p>'+
      '<div class="cols">'+
        '<div><h5>True Mélange Φ</h5>'+
          '<a href="product.html">Blue-Gold Daily</a>'+
          '<a href="layers.html">The Φ Layer System</a>'+
          '<a href="science.html">Evidence</a></div>'+
        '<div><h5>TRAI</h5>'+
          '<a href="organism.html">The organism</a>'+
          '<a href="'+window.TRAI_WORLD+'" class="ext">TRAI world ↗</a>'+
          '<a href="mission.html">The sovereignty loop</a>'+
          '<a href="'+window.PEOPLES_PORTFOLIO+'" target="_blank" rel="noopener">People’s Portfolio ↗</a></div>'+
        '<div><h5>Ventures</h5>'+
          '<a href="organism.html#tamerian">Tamerian Materials</a>'+
          '<a href="organism.html#califia">Queen Califia CyberAI</a>'+
          '<a href="organism.html#techbridge">TechBridge Collective</a></div>'+
        '<div><h5>Contact</h5>'+
          '<a href="join.html">Waitlist</a>'+
          '<a href="join.html">Partner enquiries</a>'+
          '<a href="https://github.com/HeruAhmose" rel="noopener" target="_blank">GitHub ↗</a></div>'+
      '</div>'+
      '<p class="legal">These statements have not been evaluated by the Food and Drug Administration. '+
      'This product is not intended to diagnose, treat, cure or prevent any disease. Blue-Gold Daily is in development; '+
      'formulation is subject to change through bench, stability and sensory work with our manufacturing partner. '+
      'Affron® and Lepticrosalides® are registered trademarks of Pharmactive Biotech Products, S.L.U. '+
      'Colour additives are used only within their authorized food categories. Sovereignty and ownership language describes '+
      'economic structure and community benefit. Representation initiatives concern inclusion in research and access to benefit. '+
      '© '+new Date().getFullYear()+' Tamerian Renaissance Alliance Initiative.</p>'+
    '</div></footer>';
  }
});

/* ---------------- <page-pager> ---------------- */
customElements.define('page-pager', class extends HTMLElement{
  connectedCallback(){
    var cur = here();
    var i = PAGES.findIndex(function(p){return p.h===cur});
    if(i<0) return;
    var prev = PAGES[i-1], next = PAGES[i+1];
    var html = '<div class="pager">';
    html += prev ? '<a href="'+prev.h+'"><div class="k">← Previous</div><div class="t display">'+prev.t+'</div></a>'
                 : '<a href="index.html"><div class="k">← Back</div><div class="t display">Threshold</div></a>';
    html += next ? '<a class="n" href="'+next.h+'"><div class="k">Next →</div><div class="t display">'+next.t+'</div></a>'
                 : '<a class="n" href="join.html"><div class="k">Next →</div><div class="t display">Join</div></a>';
    html += '</div>';
    this.innerHTML = html;
  }
});

/* ---------------- reveal fallback (browsers without scroll-timeline) --------- */
if(!CSS.supports('animation-timeline: view()')){
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.1, rootMargin:'0px 0px -6% 0px'});
  addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
  });
}

/* =====================================================================
   WebGL saffron field — ambient atmosphere.
   Domain-warped fBm; saffron core through Galdieria rim.
   Falls back silently to a CSS gradient if WebGL is unavailable.
   ===================================================================== */
window.TMField = function(canvas, opts){
  opts = opts || {};
  var gl = canvas.getContext('webgl',{antialias:false,alpha:true,powerPreference:'low-power'})
        || canvas.getContext('experimental-webgl');
  if(!gl){ canvas.style.background='radial-gradient(circle at 50% 45%,#D6A33A22,#08070A 70%)'; return null; }

  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
  'precision highp float;',
  'uniform vec2 u_res; uniform float u_time; uniform vec2 u_m; uniform float u_amp;',
  'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
  ' return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
  'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=.5;}return v;}',
  'void main(){',
  ' vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);',
  ' float t=u_time*.035; vec2 m=u_m*.12;',
  ' vec2 q=vec2(fbm(uv*1.5+t),fbm(uv*1.5+vec2(5.2,1.3)-t));',
  ' vec2 r=vec2(fbm(uv*1.5+3.6*q+vec2(1.7,9.2)+t*1.3+m),fbm(uv*1.5+3.6*q+vec2(8.3,2.8)-t*1.1+m));',
  ' float f=fbm(uv*1.5+3.6*r);',
  ' float rad=length(uv);',
  ' vec3 gold=vec3(.94,.77,.39), amber=vec3(.84,.64,.23), crim=vec3(.66,.26,.12);',
  ' vec3 blue=vec3(.17,.36,.66), deep=vec3(.031,.027,.039);',
  ' vec3 col=mix(gold,amber,smoothstep(0.,.34,f));',
  ' col=mix(col,crim,smoothstep(.28,.62,f+rad*.38));',
  ' col=mix(col,blue,smoothstep(.42,.92,rad+f*.24));',
  ' col=mix(col,deep,smoothstep(.52,1.22,rad));',
  ' col*=(.5+.72*f)*u_amp;',
  ' float a=smoothstep(1.35,.35,rad);',
  ' gl_FragColor=vec4(col,a);',
  '}'].join('\n');

  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null}return s}
  var vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS);
  if(!vs||!fs){return null}
  var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){console.warn(gl.getProgramInfoLog(pr));return null}
  gl.useProgram(pr);

  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

  var uRes=gl.getUniformLocation(pr,'u_res'), uT=gl.getUniformLocation(pr,'u_time'),
      uM=gl.getUniformLocation(pr,'u_m'), uA=gl.getUniformLocation(pr,'u_amp');
  var dpr=Math.min(devicePixelRatio||1,1.75), mx=0,my=0,tx=0,ty=0, running=true;
  var amp = opts.amp || 1.0;

  function resize(){
    var w=canvas.clientWidth,h=canvas.clientHeight;
    canvas.width=Math.max(1,w*dpr);canvas.height=Math.max(1,h*dpr);
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize(); addEventListener('resize',resize);
  addEventListener('pointermove',function(e){
    tx=(e.clientX/innerWidth-.5)*2; ty=(e.clientY/innerHeight-.5)*2;
  },{passive:true});

  var t0=performance.now();
  function frame(now){
    if(!running) return;
    mx+=(tx-mx)*.045; my+=(ty-my)*.045;
    gl.uniform2f(uRes,canvas.width,canvas.height);
    gl.uniform1f(uT, REDUCE ? 8.0 : (now-t0)/1000);
    gl.uniform2f(uM,mx,my);
    gl.uniform1f(uA,amp);
    gl.drawArrays(gl.TRIANGLES,0,3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* pause offscreen — battery and heat discipline */
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.isIntersecting && !running){ running=true; requestAnimationFrame(frame); }
        else if(!e.isIntersecting){ running=false; }
      });
    },{threshold:0}).observe(canvas);
  }
  return {stop:function(){running=false}};
};

/* =====================================================================
   Phyllotaxis mark — canvas2D. n × 137.507764°, r ∝ √n.
   The literal object: the same rule the cultivation trials test.
   ===================================================================== */
window.TMPhyllo = function(canvas, opts){
  opts=opts||{};
  var ctx=canvas.getContext('2d'), GOLD=Math.PI*(3-Math.sqrt(5));
  var dpr=Math.min(devicePixelRatio||1,2), W,H,CX,CY,unit;
  var spin=0, prog=opts.progress||1, mx=0,my=0,tx=0,ty=0, total=opts.count||520;

  function size(){
    W=canvas.clientWidth;H=canvas.clientHeight;
    canvas.width=Math.max(1,W*dpr);canvas.height=Math.max(1,H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    CX=W/2;CY=H/2;unit=Math.min(W,H)/2/Math.sqrt(total)*(opts.scale||1);
  }
  size(); addEventListener('resize',size);
  addEventListener('pointermove',function(e){
    tx=(e.clientX/innerWidth-.5)*2; ty=(e.clientY/innerHeight-.5)*2;
  },{passive:true});

  function L(a,b,t){return a+(b-a)*t}
  function col(t,a){
    var r,g,b,u;
    if(t<.34){u=t/.34;r=L(240,214,u);g=L(196,163,u);b=L(99,58,u);}
    else if(t<.62){u=(t-.34)/.28;r=L(214,168,u);g=L(163,90,u);b=L(58,45,u);}
    else{u=(t-.62)/.38;r=L(168,43,u);g=L(90,92,u);b=L(45,168,u);}
    return 'rgba('+(r|0)+','+(g|0)+','+(b|0)+','+a+')';
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    mx+=(tx-mx)*.05; my+=(ty-my)*.05;
    if(!REDUCE) spin+=.0008;
    var grow=Math.min(1,prog);
    for(var n=1;n<=total;n++){
      var t=n/total, ang=n*GOLD+spin+mx*.22, rad=unit*Math.sqrt(n)*grow;
      var x=CX+Math.cos(ang)*rad, y=CY+Math.sin(ang)*rad*(.93+my*.04);
      var pulse=REDUCE?1:1+.11*Math.sin(spin*9+n*.055);
      ctx.beginPath();
      ctx.arc(x,y,(1.1+3.3*t)*pulse,0,6.2832);
      ctx.fillStyle=col(t,.13+.6*(1-t));
      ctx.fill();
    }
    var gr=ctx.createRadialGradient(CX,CY,0,CX,CY,unit*7);
    gr.addColorStop(0,'rgba(240,196,99,.24)');gr.addColorStop(1,'rgba(240,196,99,0)');
    ctx.fillStyle=gr;ctx.fillRect(CX-unit*7,CY-unit*7,unit*14,unit*14);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  return {setProgress:function(p){prog=p}};
};

/* =====================================================================
   Forms
   ---------------------------------------------------------------------
   GitHub Pages is static hosting: there is no server to receive a POST.
   Submissions therefore go to Formspree, which works from any host and
   emails you each one.

   Set your endpoint in window.TM_FORM_ENDPOINT (see join.html). Until it
   is set, the form still validates and gives feedback, and tells the
   visitor honestly that signup is not open yet rather than pretending to
   have saved their address.

   Honeypot: a hidden field named _gotcha. Bots fill every field they
   find; a human never sees it. If it has content, the submission is
   dropped silently.
   ===================================================================== */
window.TMForm = function(formId,msgId,ok){
  var f=document.getElementById(formId); if(!f) return;
  var m=document.getElementById(msgId);

  /* honeypot, injected rather than hand-written into every form */
  var hp=document.createElement('input');
  hp.type='text'; hp.name='_gotcha'; hp.tabIndex=-1;
  hp.setAttribute('autocomplete','off'); hp.setAttribute('aria-hidden','true');
  hp.style.cssText='position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  f.appendChild(hp);

  f.addEventListener('submit',function(e){
    e.preventDefault();
    if(hp.value){ return; }               /* bot */

    var em=f.querySelector('input[type=email]');
    if(!em.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value)){
      m.style.color='#C4703F';
      m.textContent='Enter a valid email address so we can reach you.';
      em.focus(); return;
    }

    var endpoint = window.TM_FORM_ENDPOINT;
    if(!endpoint || endpoint.indexOf('YOUR_FORM_ID')>-1){
      m.style.color='#C4703F';
      m.textContent='Signup is not open yet — please check back shortly.';
      return;
    }

    var btn=f.querySelector('button[type=submit]');
    var label=btn?btn.textContent:'';
    if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
    m.style.color='var(--bone-dim)';
    m.textContent='Sending…';

    var data=new FormData(f);
    data.append('_subject','True Mélange \u03a6 — '+formId);
    data.append('form',formId);

    fetch(endpoint,{method:'POST',body:data,headers:{'Accept':'application/json'}})
      .then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        m.style.color='var(--gold)';
        m.textContent=ok;
        f.querySelectorAll('input:not([type=hidden])').forEach(function(i){
          if(i!==hp) i.value='';
        });
      })
      .catch(function(){
        m.style.color='#C4703F';
        m.textContent='Something went wrong. Email us directly and we will add you.';
      })
      .finally(function(){
        if(btn){ btn.disabled=false; btn.textContent=label; }
      });
  });
};

})();
