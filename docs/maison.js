/* Enselm Maison: appearance preference, the static arrival seal, and press-and-hold sealing.
   Presentation only. It never reads notes, keys or vault data, and makes no network requests. */
(function(){
  'use strict';
  const THEME_KEY='enselm-appearance';
  const root=document.documentElement;
  const themes=['dark','light','system'];

  function readTheme(){try{const v=localStorage.getItem(THEME_KEY);return themes.includes(v)?v:'dark';}catch{return 'dark';}}
  function applyTheme(value){root.dataset.theme=themes.includes(value)?value:'dark';drawSeal();}
  root.dataset.theme=readTheme();

  /* Guilloché rosette: layered epitrochoid curves, drawn once per size or theme. Never animated. */
  function drawSeal(){
    const canvas=document.getElementById('seal-canvas');if(!canvas||!canvas.getContext)return;
    const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,box.width,box.height);
    const styles=getComputedStyle(root);
    const ink=(styles.getPropertyValue('--seal').trim()||'194,164,110');
    const ground=styles.getPropertyValue('--bg').trim()||'#0d0c0b';
    const cx=box.width/2,cy=box.height/2,R=Math.min(box.width,box.height)/2*.92;
    const layers=[{a:.62,b:.16,k:24,alpha:.5,w:.6},{a:.78,b:.12,k:36,alpha:.32,w:.5},{a:.92,b:.06,k:60,alpha:.42,w:.5},{a:.40,b:.18,k:14,alpha:.26,w:.5}];
    for(const L of layers){for(let s=0;s<3;s++){c.beginPath();const ph=s*Math.PI/(L.k*1.5);for(let i=0;i<=1440;i++){const t=i/1440*Math.PI*2,rr=R*(L.a+L.b*Math.cos(L.k*t+ph));const x=cx+rr*Math.cos(t),y=cy+rr*Math.sin(t);if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.strokeStyle=`rgba(${ink},${(L.alpha*(1-s*.25)).toFixed(2)})`;c.lineWidth=L.w;c.stroke();}}
    c.beginPath();c.arc(cx,cy,R*.99,0,Math.PI*2);c.strokeStyle=`rgba(${ink},.45)`;c.lineWidth=.7;c.stroke();
    c.beginPath();c.arc(cx,cy,R*.3,0,Math.PI*2);c.fillStyle=ground;c.fill();
    c.beginPath();c.arc(cx,cy,R*.3,0,Math.PI*2);c.strokeStyle=`rgba(${ink},.35)`;c.lineWidth=.6;c.stroke();
  }

  /* Press and hold to seal. A pointer must hold for HOLD_MS; keyboard activation (Enter or Space) seals directly,
     because the required consent checkbox and the review itself remain the deliberate step. */
  const HOLD_MS=1000;let holdTimer=null,holding=null;
  function hint(text){const h=document.getElementById('hold-hint');if(h)h.textContent=text;}
  function cancelHold(){clearTimeout(holdTimer);holdTimer=null;if(holding){holding.classList.remove('holding');holding=null;}}
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest&&e.target.closest('#export-message');if(!b||b.disabled||e.button>0)return;
    const form=b.form;if(!form)return;
    if(!form.checkValidity()){form.reportValidity();return;}
    cancelHold();holding=b;b.classList.add('holding');hint('Keep holding to seal…');
    holdTimer=setTimeout(()=>{const target=holding;cancelHold();if(!target||target.disabled||!target.isConnected)return;hint('Sealed. Encrypting now.');target.dataset.sealing='1';form.requestSubmit(target);delete target.dataset.sealing;},HOLD_MS);
  });
  for(const type of ['pointerup','pointercancel','pointerleave']){
    document.addEventListener(type,e=>{if(!holding)return;if(type==='pointerleave'&&e.target!==holding)return;const early=!!holdTimer;cancelHold();if(early)hint('Released early. Nothing was sealed. Press and hold to seal.');},true);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('#export-message');if(!b)return;
    if(e.detail===0)return; // keyboard or implicit submission
    e.preventDefault();e.stopPropagation();
  },true);
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('#export-message'))e.preventDefault();});

  document.addEventListener('change',e=>{if(e.target&&e.target.id==='appearance-setting'){const v=e.target.value;try{localStorage.setItem(THEME_KEY,v);}catch{}applyTheme(v);}});
  window.addEventListener('hashchange',()=>{cancelHold();requestAnimationFrame(drawSeal);});
  let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawSeal,150);});
  if(window.matchMedia)window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',drawSeal);
  function start(){drawSeal();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(drawSeal);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.EnselmMaison={theme:()=>root.dataset.theme};
})();
