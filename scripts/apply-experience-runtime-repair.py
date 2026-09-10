from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s: raise SystemExit(f'expected text not found in {path}: {old[:140]!r}')
    p.write_text(s.replace(old,new,1),encoding='utf-8')

insert='''var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
'''
replace_exact('assets/site.js',"var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;",insert)
replace_exact('assets/site.js','''        '</div>'+\n        '<button class="navtoggle" aria-expanded="false" aria-controls="navlinks">Menu</button>'+\n      '</nav>';\n    var t = this.querySelector('.navtoggle'), l = this.querySelector('.links');\n''','''        '</div>'+\n        '<button class="soundtoggle" type="button" aria-pressed="false" data-bluegold-sound="off">Sound off</button>'+\n        '<button class="navtoggle" aria-expanded="false" aria-controls="navlinks">Menu</button>'+\n      '</nav>';\n    var t = this.querySelector('.navtoggle'), l = this.querySelector('.links'), s = this.querySelector('.soundtoggle');\n    s.addEventListener('click', function(){\n      var next=!TMSound.enabled(); TMSound.setEnabled(next); s.dataset.bluegoldSound=next?'on':'off'; s.setAttribute('aria-pressed',next?'true':'false'); s.textContent=next?'Sound on':'Sound off'; if(next)TMSound.play('enable');\n    });\n''')
replace_exact('assets/site.js','''});\n\n/* ---------------- <site-footer> ---------------- */\n''','''});\n\naddEventListener('pointerover',function(e){var el=e.target.closest&&e.target.closest('a,button');if(el&&!el.classList.contains('soundtoggle'))TMSound.play('hover');},true);\naddEventListener('click',function(e){var el=e.target.closest&&e.target.closest('a,button');if(el&&!el.classList.contains('soundtoggle'))TMSound.play('click');},true);\n\n/* ---------------- <site-footer> ---------------- */\n''')
replace_exact('assets/base.css','''.navtoggle{display:none;background:none;border:1px solid var(--rule);color:var(--bone);\n  font-family:var(--mono);font-size:.64rem;letter-spacing:.16em;text-transform:uppercase;padding:.55rem .9rem;cursor:pointer}\n''','''.soundtoggle,.navtoggle{background:none;border:1px solid var(--rule);color:var(--bone-dim);\n  font-family:var(--mono);font-size:.61rem;letter-spacing:.14em;text-transform:uppercase;padding:.55rem .8rem;cursor:pointer;transition:border-color .25s,color .25s}\n.soundtoggle:hover,.soundtoggle[aria-pressed=true]{border-color:var(--gold);color:var(--gold)}\n.navtoggle{display:none;color:var(--bone)}\n''')
replace_exact(
    'assets/base.css',
    '  .rv{opacity:1;transform:none}\n',
    '  .rv{opacity:1 !important;transform:none !important;animation:none !important;transition:none !important}\n',
)
replace_exact('package.json','''    "audit:security": "npm audit --audit-level=low",\n    "test": "npm run check"\n''','''    "audit:security": "npm audit --audit-level=low",\n    "audit:experience": "node scripts/audit-experience-runtime.mjs",\n    "test": "npm run check"\n''')
print('BLUEGOLD_EXPERIENCE_PATCH=APPLIED')
