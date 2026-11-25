const DEFAULT_GIF = "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";
const RARITIES=[ // Fortnite-style colours
  {k:'common',l:'Common',c:'#e8e8e8'},{k:'uncommon',l:'Uncommon',c:'#5fd35a'},{k:'rare',l:'Rare',c:'#3fa8ff'},
  {k:'epic',l:'Epic',c:'#b45cff'},{k:'legendary',l:'Legendary',c:'#ff9f2e'}];
const rarityOf=k=>RARITIES.find(r=>r.k===k)||RARITIES[0];
const rarityDot=(k,size=10)=>{const r=rarityOf(k);return `<i class="rdot" style="--rc:${r.c};width:${size}px;height:${size}px" title="${r.l}"></i>`;};
const STATES=[{k:'idle',l:'Idle',i:'💤'},{k:'sad',l:'Sad',i:'💧'},{k:'angry',l:'Angry',i:'💢'},{k:'love',l:'Love',i:'💗'},{k:'walk',l:'Walk',i:'🐾'}];
// Happiness under this and a cat idles in its sad animation (shared/catflix/rules.js mood). `m`: its stats or meters.
const MOOD={sadBelow:20};
const lowMood=m=>!!m&&typeof m.happiness==="number"&&m.happiness<MOOD.sadBelow;
// Coats: one click recolours the fur (coatLook below). Every kind looks at the base form's own fur first, so a coat
// works on any base form, not just an orange cat:
//   kind 'hue'    the fur turned to a colour: an absolute `hue`, or a `turn` round the colour wheel from the fur's
//                 own main hue; `sat` its saturation (the fur's own, if not given), `l` lighter (+) or darker (-).
//                 Each shade keeps its own small differences in hue, so the shading stays.
//   kind 'shift'  the fur's own colours with saturation times `s` and lighter or darker by `l` (tints, shades, tones).
//   kind 'ramp'   hue shifting, as pixel artists paint: each shade of the fur its own colour, the lightest at hue
//                 `light`, the darkest at `dark`, the ones between blended the short way round the wheel.
const COATS=[
  {name:'Original',group:'Natural',kind:'shift'},
  // Real cat coats, whatever colour the base form started.
  {name:'Ginger',group:'Natural',kind:'hue',hue:26,sat:.85},
  {name:'Cream',group:'Natural',kind:'hue',hue:38,sat:.5,l:.38},
  {name:'Fawn',group:'Natural',kind:'hue',hue:30,sat:.3,l:.15},
  {name:'Cinnamon',group:'Natural',kind:'hue',hue:18,sat:.55,l:-.15},
  {name:'Chocolate',group:'Natural',kind:'hue',hue:20,sat:.5,l:-.42},
  {name:'Blue grey',group:'Natural',kind:'hue',hue:210,sat:.16,l:-.1},
  {name:'Lilac',group:'Natural',kind:'hue',hue:275,sat:.22,l:.2},
  {name:'Silver',group:'Natural',kind:'hue',hue:210,sat:.06,l:.3},
  {name:'Smoke',group:'Natural',kind:'hue',hue:220,sat:.08,l:-.45},
  {name:'Snow',group:'Natural',kind:'hue',hue:200,sat:.05,l:.72},
  {name:'Void',group:'Natural',kind:'hue',hue:260,sat:.12,l:-.66},
  // Colour theory, from the fur's own colour: its opposite on the colour wheel (complementary), the two either side
  // of its opposite (split complementary), a third of the way round (triadic), a quarter (square), its neighbours
  // (analogous); then the same colour with white mixed in (tint), black (shade) or grey (tone), or more of it (vivid).
  {name:'Complementary',group:'Colour theory',kind:'hue',turn:180},
  {name:'Split warm',group:'Colour theory',kind:'hue',turn:150},
  {name:'Split cool',group:'Colour theory',kind:'hue',turn:210},
  {name:'Triadic I',group:'Colour theory',kind:'hue',turn:120},
  {name:'Triadic II',group:'Colour theory',kind:'hue',turn:240},
  {name:'Square',group:'Colour theory',kind:'hue',turn:90},
  {name:'Analogous +',group:'Colour theory',kind:'hue',turn:30},
  {name:'Analogous −',group:'Colour theory',kind:'hue',turn:-30},
  {name:'Tint',group:'Colour theory',kind:'shift',s:.55,l:.4},
  {name:'Shade',group:'Colour theory',kind:'shift',s:1.05,l:-.4},
  {name:'Tone',group:'Colour theory',kind:'shift',s:.35},
  {name:'Vivid',group:'Colour theory',kind:'shift',s:1.7,l:.05},
  // Hue shifting: warm lights and cool shadows (or the other way), each shade a colour of its own.
  {name:'Sunset',group:'Hue-shifted',kind:'ramp',light:48,dark:330,sat:.9},
  {name:'Ocean',group:'Hue-shifted',kind:'ramp',light:175,dark:235,sat:.75},
  {name:'Forest',group:'Hue-shifted',kind:'ramp',light:75,dark:160,sat:.6,l:-.05},
  {name:'Galaxy',group:'Hue-shifted',kind:'ramp',light:320,dark:240,sat:.7,l:-.05},
  {name:'Candy',group:'Hue-shifted',kind:'ramp',light:20,dark:300,sat:.8,l:.15},
  {name:'Ember',group:'Hue-shifted',kind:'ramp',light:50,dark:350,sat:.95,l:-.05},
  {name:'Aurora',group:'Hue-shifted',kind:'ramp',light:140,dark:280,sat:.7}];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ================= color helpers ================= */
const clamp01=v=>Math.max(0,Math.min(1,v));
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0;const l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h*=60;}return [h,s,l];}
function hsl2rgb(h,s,l){h=((h%360)+360)%360/360;if(!s){const v=Math.round(l*255);return [v,v,v];}
  const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;const f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p};
  return [Math.round(f(h+1/3)*255),Math.round(f(h)*255),Math.round(f(h-1/3)*255)];}
const hex=(r,g,b)=>'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
const unhex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function adjust(rgb,a){let [h,s,l]=rgb2hsl(...rgb);h+=a.h;s=clamp01(s*a.s);l=a.l>=0?l+(1-l)*a.l:l+l*a.l;return hsl2rgb(h,s,l);}
const isNeutralAdj=a=>a.h===0&&a.s===1&&a.l===0;

/* ================= decoding ================= */
function decodeGif(bytes){
  const rd=new GifReader(bytes);const W=rd.width,H=rd.height,n=rd.numFrames();
  let buf=new Uint8ClampedArray(W*H*4);const frames=[],delays=[];
  for(let i=0;i<n;i++){const fi=rd.frameInfo(i);const prev=fi.disposal===3?buf.slice():null;
    rd.decodeAndBlitFrameRGBA(i,buf);frames.push(buf.slice());delays.push(Math.max(20,(fi.delay||10)*10));
    if(fi.disposal===2){for(let y=fi.y;y<fi.y+fi.height;y++)for(let x=fi.x;x<fi.x+fi.width;x++){const o=(y*W+x)*4;buf[o]=buf[o+1]=buf[o+2]=buf[o+3]=0;}}
    else if(fi.disposal===3)buf=prev;}
  return {W,H,frames,delays};
}
async function decodePng(bytes,n){
  const bmp=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
  if(!n)n=bmp.width%bmp.height===0?bmp.width/bmp.height:1;
  const cv=Object.assign(document.createElement('canvas'),{width:bmp.width,height:bmp.height});const g=cv.getContext('2d');g.drawImage(bmp,0,0);
  const all=g.getImageData(0,0,bmp.width,bmp.height).data;const fw=Math.floor(bmp.width/n),H=bmp.height,frames=[],delays=[];
  for(let k=0;k<n;k++){const f=new Uint8ClampedArray(fw*H*4);
    for(let y=0;y<H;y++)for(let x=0;x<fw;x++){const s=(y*bmp.width+k*fw+x)*4,d=(y*fw+x)*4;f[d]=all[s];f[d+1]=all[s+1];f[d+2]=all[s+2];f[d+3]=all[s+3];}
    frames.push(f);delays.push(150);}
  return {W:fw,H,frames,delays,n};
}
function detectScale(W,H,frames){
  const gcd=(a,b)=>{while(b){[a,b]=[b,a%b]}return a};let g=0;
  for(const fr of frames.slice(0,4)){const p=new Uint32Array(fr.buffer.slice(0));
    for(let y=0;y<H;y++){let run=1;for(let x=1;x<=W;x++){if(x<W&&p[y*W+x]===p[y*W+x-1])run++;else{g=gcd(g,run);run=1;if(g===1)return 1;}}}
    for(let x=0;x<W;x++){let run=1;for(let y=1;y<=H;y++){if(y<H&&p[y*W+x]===p[(y-1)*W+x])run++;else{g=gcd(g,run);run=1;if(g===1)return 1;}}}}
  return g||1;
}

/* ================= Form: animations sharing one palette ================= */
// A resize worth keeping: both numbers, and not the file's own size.
const goodResize=z=>z&&Number.isFinite(z.x)&&Number.isFinite(z.y)&&z.x>0&&z.y>0&&(z.x!==1||z.y!==1)?{x:z.x,y:z.y}:null;
class Form{
  constructor(id){this.id=id;this.colors=[];this.key=new Map();this.anims={};this.raw={};this.resize={};this.fur=new Set();this.failed=[];}
  // `resize`: the animation's own size from the Studio ({x, y}: how many times wider and taller than its file), or none.
  addAnim(state,{W,H,frames,delays},resize=null){
    const sc=detectScale(W,H,frames),w=Math.floor(W/sc),h=Math.floor(H/sc);
    this.colors.forEach(c=>delete c.uses[state]);
    let x0=w,y0=h,x1=-1,y1=-1;const idx=[];
    for(const fr of frames){const ix=new Uint16Array(w*h).fill(0xFFFF);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=((y*sc)*W+x*sc)*4;if(fr[o+3]<8)continue;
        const key=(fr[o]<<16)|(fr[o+1]<<8)|fr[o+2];let i=this.key.get(key);
        if(i===undefined){i=this.colors.length;this.key.set(key,i);const rgb=[fr[o],fr[o+1],fr[o+2]];this.colors.push({rgb,hex:hex(...rgb),a:fr[o+3],uses:{},hsl:rgb2hsl(...rgb)});}
        const c=this.colors[i];c.uses[state]=(c.uses[state]||0)+1;ix[y*w+x]=i;
        if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
      idx.push(ix);}
    this.raw[state]={w,h,scale:sc,frames:idx,delays,box:x1<0?[0,0,w-1,h-1]:[x0,y0,x1,y1]};
    this.resize[state]=goodResize(resize);this.relayout();
  }
  removeAnim(state){delete this.raw[state];delete this.resize[state];this.colors.forEach(c=>delete c.uses[state]);this.relayout();}
  setResize(state,z){this.resize[state]=goodResize(z);this.relayout();}
  // The animations as drawn. A resized one is scaled like resizing its file in an image editor (from the top-left
  // corner, nearest pixel, so pixel art stays crisp): a 256 px animation set to 64 px lines up with 64 px ones.
  relayout(){
    this.anims={};
    for(const [k,a] of Object.entries(this.raw)){const z=this.resize[k];
      if(!z){this.anims[k]=a;continue;}
      const W=Math.max(1,Math.round(a.w*z.x)),H=Math.max(1,Math.round(a.h*z.y));let x0=W,y0=H,x1=-1,y1=-1;
      const frames=a.frames.map(src=>{const ix=new Uint16Array(W*H).fill(0xFFFF);
        for(let v=0;v<H;v++){const sy=Math.min(a.h-1,Math.floor((v+.5)*a.h/H));
          for(let u=0;u<W;u++){const sx=Math.min(a.w-1,Math.floor((u+.5)*a.w/W)),i=src[sy*a.w+sx];if(i===0xFFFF)continue;
            ix[v*W+u]=i;if(u<x0)x0=u;if(v<y0)y0=v;if(u>x1)x1=u;if(v>y1)y1=v;}}
        return ix;});
      this.anims[k]={w:W,h:H,scale:a.scale,frames,delays:a.delays,box:x1<0?[0,0,W-1,H-1]:[x0,y0,x1,y1]};}
    this.computeCrop();
  }
  computeCrop(){ // union box across animations so the pet doesn't jump between states
    const a=Object.values(this.anims);if(!a.length){this.crop=null;return;}
    const w=Math.max(...a.map(x=>x.w)),h=Math.max(...a.map(x=>x.h));
    let x0=1e9,y0=1e9,x1=-1,y1=-1;a.forEach(({box})=>{x0=Math.min(x0,box[0]);y0=Math.min(y0,box[1]);x1=Math.max(x1,box[2]);y1=Math.max(y1,box[3]);});
    x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(w-1,x1+1);y1=Math.min(h-1,y1+1);
    this.crop={x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
  }
  total(c){let t=0;for(const k in c.uses)t+=c.uses[k];return t;}
  active(){return this.colors.map((c,i)=>({c,i,t:this.total(c)})).filter(x=>x.t>0).sort((a,b)=>b.t-a.t);}
  guessFur(){
    const act=this.active();const all=act.reduce((s,x)=>s+x.t,0)||1;
    const chroma=act.filter(({c})=>c.hsl[1]>.15&&c.hsl[2]>.08&&c.hsl[2]<.96);if(!chroma.length)return [];
    const base=chroma[0].c.hsl[0];
    return chroma.filter(({c,t})=>Math.abs(((c.hsl[0]-base+540)%360)-180)<=45&&t/all>=.005).map(({c})=>c.hex);
  }
  firstState(){return STATES.map(s=>s.k).find(k=>this.anims[k]);}
}
// Every colour of a form as drawn: picked by hand (`over`), else, for fur, its coat's colour (`base`) or its own,
// shifted by the sliders (`adj`); anything else as it is.
function mapFor(form,{adj={h:0,s:1,l:0},over=new Map(),base=new Map(),fur=form.fur}={}){
  return form.colors.map(c=>over.has(c.hex)?over.get(c.hex):fur.has(c.hex)?adjust(base.get(c.hex)||c.rgb,adj):c.rgb);
}
/* ---------- coats, from colour theory ---------- */
// The fur's main hue (degrees): every fur colour, weighted by how much of it there is and how colourful it is;
// and its most colourful saturation.
function furTone(form){let x=0,y=0,maxS=0;
  for(const c of form.colors){if(!form.fur.has(c.hex))continue;const t=form.total(c);if(!t)continue;const w=t*(c.hsl[1]+.05),a=c.hsl[0]*Math.PI/180;
    x+=Math.cos(a)*w;y+=Math.sin(a)*w;maxS=Math.max(maxS,c.hsl[1]);}
  return {hue:x||y?(Math.atan2(y,x)*180/Math.PI+360)%360:0,maxS};}
// Each fur colour's place from its darkest (0) to its lightest (1).
function furRanks(form){const fur=form.colors.filter(c=>form.fur.has(c.hex)&&form.total(c)>0).sort((a,b)=>a.hsl[2]-b.hsl[2]);
  return new Map(fur.map((c,i)=>[c.hex,fur.length>1?i/(fur.length-1):.5]));}
const turnBy=d=>((d%360)+540)%360-180;   // a hue difference, the short way round (-180 to 180)
const lighten=(l,d)=>clamp01(d>=0?l+(1-l)*d:l+l*d);
// A coat on a form: { adj, base } for mapFor. 'shift' coats are the sliders; 'hue' and 'ramp' coats give every fur
// colour a new one, and the sliders still work on top.
function coatLook(form,coat){
  if(!coat||!coat.kind||coat.kind==='shift')return {adj:{h:0,s:coat&&coat.s!==undefined?coat.s:1,l:(coat&&coat.l)||0},base:new Map()};
  const {hue,maxS}=furTone(form),ranks=furRanks(form),base=new Map(),wantS=coat.sat!==undefined?coat.sat:Math.max(maxS,.45);
  for(const c of form.colors){if(!form.fur.has(c.hex))continue;const [h0,s0,l0]=c.hsl,t=ranks.has(c.hex)?ranks.get(c.hex):.5;
    const h=coat.kind==='ramp'?coat.dark+turnBy(coat.light-coat.dark)*t:(coat.turn!==undefined?hue+coat.turn:coat.hue)+turnBy(h0-hue);
    const s=clamp01(wantS*(maxS>0?.55+.45*s0/maxS:1));
    base.set(c.hex,hsl2rgb(h,s,lighten(l0,coat.l||0)));}
  return {adj:{h:0,s:1,l:0},base};}
const coatMap=(form,coat)=>mapFor(form,coatLook(form,coat));
function mapFromChanges(form,changes){return form.colors.map(c=>changes&&changes[c.hex]?unhex(changes[c.hex]):c.rgb);}
function bake(form,anim,map,dimHex=null){
  const {w,h}=anim;return anim.frames.map(ix=>{
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');const id=g.createImageData(w,h);const d=id.data;
    for(let k=0;k<ix.length;k++){const i=ix[k];if(i===0xFFFF)continue;const o=k*4;const [r,gg,b]=map[i];
      if(dimHex){if(form.colors[i].hex===dimHex){d[o]=255;d[o+1]=60;d[o+2]=200;d[o+3]=255;}else{const y=Math.round((r+gg+b)/3*.35);d[o]=d[o+1]=d[o+2]=y;d[o+3]=150;}}
      else{d[o]=r;d[o+1]=gg;d[o+2]=b;d[o+3]=form.colors[i].a;}}
    g.putImageData(id,0,0);return cv;});
}

/* ================= players (one animation loop for every canvas) ================= */
const players=new Set();let playing=true,speed=1,lastT=performance.now();
const HOVER_AMP=2,HOVER_MS=1800; // hover height in art pixels, time for one up-and-down
// Stepper settings. Shake amounts are in art pixels; rlfN = how many final frames RLF repeats.
const frameCount=(form,state)=>(form&&form.anims[state]?form.anims[state].frames.length:1);
const STEP_CONF={
  shakeAmt:{min:()=>.1,max:()=>2,step:.1,def:()=>.6,fmt:v=>v.toFixed(1),tip:'Shake amount (art pixels)'},
  ushakeAmt:{min:()=>.1,max:()=>2,step:.1,def:()=>.6,fmt:v=>v.toFixed(1),tip:'Shake amount (art pixels)'},
  rlfN:{min:()=>1,max:(f,s)=>frameCount(f,s),step:1,def:(f,s)=>Math.min(2,frameCount(f,s)),fmt:v=>String(v),tip:'How many of the last frames to repeat'}};
const SHAKE_MS=70,USHAKE_MS=83; // shake distance in art pixels; time for one left-right / up-down wiggle (different so both together jitter instead of sliding diagonally)
function player(canvas){const p={canvas,ctx:canvas.getContext('2d'),baked:[],alt:null,delays:[],cur:0,acc:0,crop:null,hover:false,shake:false,ushake:false,ht:Math.random()*HOVER_MS,st:0,ut:0};players.add(p);return p;}
const flagOf=(form,state,flag)=>{const d=form&&baseDocs.get(form.id);const m=d&&d.anims&&d.anims[state];return !!(m&&m[flag]);};
const hoverOf=(form,state)=>flagOf(form,state,'hover');
const pendingAmt=new Map(); // stepper values not yet confirmed by the database
function amtOf(form,state,key){
  const c=STEP_CONF[key];const pk=form&&(form.id+'|'+state+'|'+key);let v;
  if(pk&&pendingAmt.has(pk))v=pendingAmt.get(pk);
  else{const d=form&&baseDocs.get(form.id);const m=d&&d.anims&&d.anims[state];v=m&&typeof m[key]==='number'?m[key]:c.def(form,state);}
  return Math.min(c.max(form,state),Math.max(c.min(form,state),v));}
const padH=p=>p.hover?HOVER_AMP*2+2:0; // extra art-pixel rows so the bob + shadow never clip
function feed(p,form,state,map,{dim=null,alt=null}={}){
  const a=form&&form.anims[state];if(!a){p.baked=[];p.alt=null;return p;}
  p.baked=bake(form,a,map,dim);p.alt=alt?bake(form,a,alt):null;p.delays=a.delays;p.crop=form.crop;p.hover=hoverOf(form,state);p.shake=flagOf(form,state,'shake');p.ushake=flagOf(form,state,'ushake');if(p.fid!==form.id||p.state!==state){p.cur=0;p.acc=0;}p.fid=form.id;p.state=state;p.rlf=flagOf(form,state,'rlf');p.rlfN=amtOf(form,state,'rlfN');p.shakeAmt=amtOf(form,state,'shakeAmt');p.ushakeAmt=amtOf(form,state,'ushakeAmt');if(p.cur>=p.baked.length)p.cur=0;return p;
}
let showOrig=false;
// ground offset per base form, in art pixels (+ = stands lower). Shared by every recolor of that form.
const sinkPending=new Map();
const sinkOf=f=>{const id=typeof f==='string'?f:f&&f.id;if(!id)return 0;if(sinkPending.has(id))return sinkPending.get(id);const d=baseDocs.get(id);return d&&Number.isFinite(d.sink)?d.sink:0;};
// Left (-) or right (+) over its shadow, in art pixels, set next to the ground in the Studio. In the way the art faces:
// drawn before a pet is mirrored, so a pet turned round has it mirrored too (aura and card art, mirrored already, flip it by hand).
const nudgePending=new Map();
const nudgeOf=f=>{const id=typeof f==='string'?f:f&&f.id;if(!id)return 0;if(nudgePending.has(id))return nudgePending.get(id);const d=baseDocs.get(id);return d&&Number.isFinite(d.nudge)?d.nudge:0;};
function drawP(p){
  const g=p.ctx,cw=p.canvas.width,ch=p.canvas.height;g.imageSmoothingEnabled=false;g.clearRect(0,0,cw,ch);
  const set=(showOrig&&p.alt)?p.alt:p.baked;const f=set[p.cur];if(!f||!p.crop)return;
  const {x,y,w,h}=p.crop;
  if(p.ground){ // Studio: show the ground line and shadow the pet will stand on in the games
    const sk=sinkOf(p.fid),top=Math.max(0,sk),bot=Math.max(0,-sk)+3,H=h+top+bot+(p.hover?HOVER_AMP*2:0);let k=Math.min(cw/w,ch/H);if(k>=1)k=Math.floor(k);
    const dx0=Math.round((cw-w*k)/2),oy=Math.round((ch-H*k)/2)+(p.hover?HOVER_AMP*2*k:0);
    const groundY=oy+(h+Math.max(0,-sk))*k,dyS=groundY-(h-1-sk)*k;   // feet row (h-1-sk) sits on the ground line
    g.fillStyle='rgba(0,0,0,.3)';g.fillRect(dx0+Math.round(w*k*.2),groundY,Math.round(w*k*.6),2*k);
    g.fillStyle='rgba(95,211,141,.75)';for(let xx=0;xx<cw;xx+=6*Math.max(1,k/2))g.fillRect(xx,groundY,3*Math.max(1,k/2),Math.max(1,Math.round(k/3)));
    let dx=dx0+nudgeOf(p.fid)*k,dy=dyS;if(p.hover)dy-=Math.round(HOVER_AMP*k*(.6+(Math.sin(p.ht/HOVER_MS*Math.PI*2)+1)/2));
    if(p.shake)dx+=Math.round(Math.sin(p.st/SHAKE_MS*Math.PI*2)*p.shakeAmt*k);
    if(p.ushake)dy+=Math.round(Math.sin(p.ut/USHAKE_MS*Math.PI*2)*p.ushakeAmt*k);
    g.drawImage(f,x,y,w,h,dx,dy,w*k,h*k);return;}
  const H=h+padH(p);let k=Math.min(cw/w,ch/H);if(k>=1)k=Math.floor(k);
  let dx=Math.round((cw-w*k)/2);let dy=Math.round((ch-h*k)/2);
  if(p.hover){
    const lift=(Math.sin(p.ht/HOVER_MS*Math.PI*2)+1)/2;            // 0 = lowest, 1 = highest
    dy=Math.round((ch-H*k)/2+HOVER_AMP*k*(1-lift));                  // sprite rises and falls
    const sy=Math.round((ch-H*k)/2+(h+HOVER_AMP*2+1)*k);             // shadow stays on the "ground"
    g.save();g.globalAlpha=.28-.12*lift;g.fillStyle='#000';g.beginPath();
    g.ellipse(cw/2,sy,w*k*(.3-.06*lift),Math.max(1.5,k*(.9-.25*lift)),0,0,Math.PI*2);g.fill();g.restore();
  }
  if(p.shake)dx+=Math.round(Math.sin(p.st/SHAKE_MS*Math.PI*2)*p.shakeAmt*k);
  if(p.ushake)dy+=Math.round(Math.sin(p.ut/USHAKE_MS*Math.PI*2)*p.ushakeAmt*k);
  g.drawImage(f,x,y,w,h,dx,dy,w*k,h*k);
}
// After the last frame: normally back to frame 0; with RLF, back to the start of the last N frames
function nextFrame(p){const n=p.baked.length;if(p.cur+1<n)return p.cur+1;return p.rlf?Math.max(0,n-Math.min(n,p.rlfN||1)):0;}
function loop(t){
  const dt=Math.min(250,t-lastT);lastT=t;
  for(const p of players){if(!p.canvas.isConnected){players.delete(p);continue;}
    if(playing&&p.hover)p.ht+=dt*speed;
    if(playing&&p.shake)p.st+=dt*speed;
    if(playing&&p.ushake)p.ut+=dt*speed;
    if(playing&&p.baked.length>1){p.acc+=dt*speed;let d=p.delays[p.cur]||100;while(p.acc>=d){p.acc-=d;p.cur=nextFrame(p);d=p.delays[p.cur]||100;}}
    drawP(p);}
  requestAnimationFrame(loop);
}

/* ================= storage: the club's server for the forms, this browser for the rest ================= */
// Base forms, their animations and registered forms are what Catflix No
// Chill's pets are made of: they're saved on the server, for admins only
// (backend/routes/petForgeRouter.js). Everything else on this page (pets,
// neighbours, the player: PP, packs, cards, auras, food, the egg, the
// profile) is a sandbox for trying things out, kept in this browser only
// (localStorage, SANDBOX_KEY), so nothing done in it touches the real site.
const store={db:null,assets:null,downloads:null,mode:'connecting'};
const baseDocs=new Map(),regDocs=new Map(),localBlobs=new Map(),formCache=new Map();
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const chains=new Map();
function serial(key,fn){const prev=chains.get(key)||Promise.resolve();const next=prev.catch(()=>{}).then(fn);chains.set(key,next);return next;}
const LOCAL={baseForms:()=>[baseDocs,onBaseChange],registeredForms:()=>[regDocs,onRegChange],pets:()=>[petDocs,onPetsChange],player:()=>[playerDocs,onPlayerChange],neighbors:()=>[neighborDocs,visitUi]};
const SERVER_COLS=new Set(['baseForms','registeredForms']);
// ---- Catflix No Chill: this page, opened at /api/catflix/app/, is the real game ----
// The same Room (called Explore here), Pet room, Race, Run and Shop as Pet Forge's sandbox, but every pet is a real
// one and every change goes through the server (backend/routes/catflixRouter.js), which decides it: the page only
// shows what it says. The Race is Nekomusume: Kitty Race and the Run is Ruin Run, both played for PP. Pet Forge's own
// tabs (Studio, Registered forms, Profile) aren't shown.
const LIVE=/\/catflix\//.test(location.pathname);
const LV={points:0,player:null,prices:{},room:null,egg:null};
// Opened in a window over the site's Notifications to open an awarded pack (#open=<kind>): only the pack opening shows.
const EMBED=LIVE&&/^#open=/.test(location.hash);
// Tells the page around it (components/catflix/PackOpener.jsx): "closed", or "goto" somewhere on the site.
function embedSay(what,extra={}){if(EMBED&&window.parent!==window)window.parent.postMessage({catflix:'pack',what,...extra},location.origin);}
// A call to the game's part of the server: resolves to its answer, or throws its reason.
async function cfx(path,{method='GET',body}={}){
  const t=authToken();
  const r=await fetch('/api/catflix'+path,{method,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw Object.assign(new Error((data&&data.error)||('The server said '+r.status)),{status:r.status});
  return data;
}
// A pet as the server sends it, as this page keeps pets.
function toPetDoc(p){return {name:p.name,skinId:p.skinId,stats:{happiness:p.meters.happiness,love:p.mine?p.love:(p.loveForMe||0),hunger:p.meters.hunger,confidence:p.meters.confidence},
  roomStyle:p.roomStyle||'cozy',aura:p.aura||'',poops:p.poops||0,full:!!p.full,loveBy:{me:p.loveForMe||0},owner:p.owner,mine:!!p.mine,createdAt:0};}
// The server's answer taken in: their pet, their things, their points, the aura prices.
function liveApply(d){
  if(!d)return;
  if(d.points!==undefined)LV.points=d.points;
  if(d.prices)LV.prices=d.prices;
  if(d.player)LV.player=d.player;
  if('pet' in d){for(const [id,doc] of [...petDocs])if(doc.mine)petDocs.delete(id);
    if(d.pet){petDocs.set(String(d.pet._id),toPetDoc(d.pet));PR.id=String(d.pet._id);}else PR.id=null;}
  if(d.pet){LV.egg=null;try{localStorage.removeItem('catflix.egg');}catch(_){}}   // hatched: no egg any more
  const pl=LV.player||{};
  playerDocs.set('me',{pp:LV.points,cards:{...(pl.cards||{})},packs:{single:0,triple:0,blackGold:0,...(pl.packs||{})},pending:pl.pending||null,
    auras:Object.fromEntries((pl.auras||[]).map(k=>[k,true])),profile:{},egg:LV.egg,food:pl.food||0,balls:{...(pl.balls||{})}});
  onPetsChange();onPlayerChange();liveSyncPoop();
}
// Everything again, after a buy or a cast: and the site's wallet in the nav bar hears about it.
async function liveRefresh(){liveApply(await cfx('/me'));if(window.parent!==window)window.parent.postMessage({catflix:'wallet'},location.origin);}
// Runs a server call, toasting why not if it says no. Resolves to its answer, or null.
async function liveCall(path,body,okToast){try{const r=await cfx(path,{method:'POST',body});if(okToast)toast(okToast);return r;}catch(e){toast(e.message);return null;}}
// The poop on the floor: as many as the server says the pet in this room has.
function liveSyncPoop(){
  if(!LIVE||typeof PR==='undefined'||!PR.items)return;
  const pid=PR.visit?PR.visit.hostId:PR.id,doc=pid&&petDocs.get(pid),want=doc?Math.max(0,doc.poops||0):0;
  const have=PR.items.filter(i=>i.type==='poop');
  while(have.length>want)PR.items.splice(PR.items.indexOf(have.pop()),1);
  for(let i=have.length;i<want;i++)PR.items.push({type:'poop',x:Math.round(rnd(FLOOR.x0+8,FLOOR.x1-8)),y:Math.round(rnd(FLOOR.y0+6,FLOOR.y1)),t:0,id:Math.random()});
}
// One kind of care (feed, brush, scoop, praise, scold) for the pet in this room: yours, or the one you're visiting.
// Resolves to whether the server agreed.
async function liveCare(kind){
  const pid=PR.visit?PR.visit.hostId:PR.id;if(!pid)return false;
  const r=await liveCall('/care',{petId:pid,kind});if(!r)return false;
  LV.player=r.player;livePet(r.pet);liveApply({player:r.player});return true;
}
// A visit to the Room Room: the pets in it (yours and 6 others), picked again every time, and the weather.
async function roomLive(){
  if(!LIVE)return;
  const d=await cfx('/room?map='+encodeURIComponent(RM.room)).catch(e=>{toast(e.message);return null;});if(!d)return;
  LV.room=d;RM.weather=d.weather[RM.room]||'sunny';RM.drops=[];RM.splashes=[];syncRoomWx();roomSync();
}
// A pet's answer from a care or a Room action, taken in.
function livePet(view){if(!view)return;const doc=toPetDoc(view);petDocs.set(String(view._id),doc);if(view.mine)PR.id=String(view._id);onPetsChange();liveSyncPoop();visitUi();}
const SANDBOX_KEY='forge.sandbox';

// The logged-in admin's token, as the rest of the site keeps it.
function authToken(){try{return JSON.parse(localStorage.getItem('user')||'null')?.token||null;}catch(_){return null;}}
// A call to Pet Forge's part of the server: resolves to its answer, or
// throws its reason (error.status: the HTTP status).
async function api(path,{method='GET',body}={}){
  const t=authToken();
  const r=await fetch('/api/pet-forge'+path,{method,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw Object.assign(new Error((data&&data.error)||('The server said '+r.status)),{status:r.status});
  return data;
}
// The sandbox, saved after every change and read back on opening.
function saveSandbox(){
  try{localStorage.setItem(SANDBOX_KEY,JSON.stringify({pets:[...petDocs],neighbors:[...neighborDocs],player:[...playerDocs]}));}catch(_){}
}
function loadSandbox(){
  try{const s=JSON.parse(localStorage.getItem(SANDBOX_KEY)||'null');if(!s)return;
    for(const [M,list] of [[petDocs,s.pets],[neighborDocs,s.neighbors],[playerDocs,s.player]])(list||[]).forEach(([id,doc])=>M.set(id,doc));}catch(_){}
}
async function writeDoc(col,id,data){
  if(LIVE&&!SERVER_COLS.has(col))return;   // the game's changes all go through the server, by name (cfx)
  const [M,fn]=LOCAL[col]();
  if(SERVER_COLS.has(col))return serial(col+'/'+id,async()=>{const r=await api('/'+col+'/'+encodeURIComponent(id),{method:'PUT',body:data});M.set(id,r.doc);fn();});
  M.set(id,data);saveSandbox();fn();
}
async function deleteDoc(col,id){
  if(LIVE)return;
  const [M,fn]=LOCAL[col]();
  if(SERVER_COLS.has(col))return serial(col+'/'+id,async()=>{await api('/'+col+'/'+encodeURIComponent(id),{method:'DELETE'});M.delete(id);fn();});
  M.delete(id);saveSandbox();fn();
}
async function liveStart(){
  try{LV.egg=JSON.parse(localStorage.getItem('catflix.egg')||'null');}catch(_){LV.egg=null;}
  try{
    const [forms,me]=await Promise.all([cfx('/forms'),cfx('/me')]);
    Object.entries(forms.baseForms||{}).forEach(([id,doc])=>baseDocs.set(id,doc));
    Object.entries(forms.registeredForms||{}).forEach(([id,doc])=>regDocs.set(id,doc));
    store.mode='online';setStatus();onBaseChange();onRegChange();liveApply(me);
    if(!location.hash||location.hash==='#room')roomLive();
    // "Open now" on an awarded pack in the site's Notifications opens this page at #open=<kind>, in a window over them:
    // straight into opening one (the shop's own way), and it tells the page around it when it's done (embedSay).
    const open=/^#open=(single|triple|blackGold)$/.exec(location.hash);
    if(open){if((ME().packs[open[1]]||0)>0)packStage(open[1]);else{toast('No packs like that left to open');embedSay('closed');}}
    // "Visit Pet" on a member's profile opens here with #visit=<their pet's id>: a Play Date in their room
    // (or your own pet's room, when it's yours).
    const visit=/^#visit=([0-9a-f]{24})$/.exec(location.hash);
    if(visit){if(visit[1]===PR.id)location.hash='pet';
      else startPlayDate({id:visit[1]}).then(()=>{if(!PR.visit){history.replaceState(null,'','#room');roomLive();}});}   // couldn't (no pet yet): the Room Room
  }catch(e){store.mode='stale';setStatus();toast(e.status===401?'Log in to play Catflix No Chill':e.status===403?e.message:'Can’t reach the server: '+e.message);}
}
function setStatus(){
  const el=$('status'),t=el.querySelector('span');el.className='status '+(store.mode==='online'?'on':store.mode==='local'?'local':'');
  t.textContent=store.mode==='online'?'Forms saved to the server · the rest stays in this browser':store.mode==='stale'?'Can’t reach the server':'Connecting…';
}
// Uploads go to the server as the bytes themselves (base64 in JSON).
function blobToBase64(blob){return new Promise((ok,no)=>{const fr=new FileReader();fr.onload=()=>ok(String(fr.result).split(',')[1]||'');fr.onerror=()=>no(fr.error);fr.readAsDataURL(blob);});}
async function initStore(){
  if(LIVE)return liveStart();
  loadSandbox();
  store.assets={
    upload:async blob=>{const r=await api('/assets',{method:'POST',body:{type:blob.type,data:await blobToBase64(blob)}});return {id:r.id,url:r.url};},
    delete:id=>api('/assets/'+encodeURIComponent(id),{method:'DELETE'}),
  };
  try{
    const d=await api('');
    Object.entries(d.baseForms||{}).forEach(([id,doc])=>baseDocs.set(id,doc));
    Object.entries(d.registeredForms||{}).forEach(([id,doc])=>regDocs.set(id,doc));
    store.mode='online';
  }catch(e){store.mode='stale';toast(e.status===401||e.status===403?'Pet Forge is for admins only: log in as an admin':'Can’t reach the server: '+e.message);}
  setStatus();onBaseChange();onRegChange();onPetsChange();visitUi();onPlayerChange();
}
const animSig=doc=>JSON.stringify(STATES.map(s=>{const m=doc.anims&&doc.anims[s.k];return m?(m.asset||m.local)+(m.resize?`@${m.resize.x}x${m.resize.y}`:''):null;}));
async function fetchBytes(m){
  if(m.local)return localBlobs.get(m.local);
  const r=await fetch(m.url||('/_blob/'+m.asset));if(!r.ok)throw new Error('asset '+r.status);return new Uint8Array(await r.arrayBuffer());
}
function getForm(id){
  const doc=baseDocs.get(id);if(!doc)return Promise.resolve(null);const sig=animSig(doc);
  const hit=formCache.get(id);if(hit&&hit.sig===sig){hit.form&&(hit.form.fur=new Set(doc.fur&&doc.fur.length?doc.fur:hit.form.fur));return hit.p;}
  const entry={sig,form:null};
  entry.p=(async()=>{const f=new Form(id);
    for(const s of STATES){const m=doc.anims&&doc.anims[s.k];if(!m)continue;
      try{const bytes=await fetchBytes(m);f.addAnim(s.k,m.kind==='png'?await decodePng(bytes,m.n):decodeGif(bytes),m.resize);}catch(e){console.warn(e);f.failed.push(s.k);}}
    for(const [k,z] of (typeof pendingSize==='undefined'?[]:pendingSize)){const [fid,st]=k.split('|');if(fid===id&&f.raw[st])f.setResize(st,z);}   // sizes not saved yet
    f.fur=new Set(doc.fur&&doc.fur.length?doc.fur:f.guessFur());entry.form=f;return f;})();
  formCache.set(id,entry);return entry.p;
}

/* ================= Studio state ================= */
const S={formId:null,form:null,adj:{h:0,s:1,l:0},over:new Map(),base:new Map(),coat:'Original',focus:'idle',editing:null,loc:null,token:0};
const big=player($('bigCanvas'));big.ground=true;let slotPlayers={},coatPlayers=[];

function renderFormSel(){
  const sel=$('formSel');const ids=[...baseDocs.keys()].sort((a,b)=>(baseDocs.get(a).createdAt||0)-(baseDocs.get(b).createdAt||0));
  sel.innerHTML=ids.length?ids.map(id=>`<option value="${esc(id)}">${esc(baseDocs.get(id).name||'Untitled')}</option>`).join(''):'<option value="">No base forms yet</option>';
  if(S.formId&&baseDocs.has(S.formId))sel.value=S.formId;
  $('delFormBtn').disabled=!ids.length;$('faceSel').disabled=!ids.length;
  const fd=S.formId&&baseDocs.get(S.formId);$('faceSel').value=fd&&fd.facing==='right'?'right':'left';
  renderSink();
}
function renderSink(){renderNudge();const v=S.formId?sinkOf(S.formId):0;$('sinkOut').textContent=(v>0?'+':'')+v;
  const [up,dn]=$('sinkStep').querySelectorAll('button');up.disabled=!S.formId||v<=-16;dn.disabled=!S.formId||v>=16;}
let sinkTimer=null;
$('sinkStep').onclick=e=>{const b=e.target.closest('button');if(!b||!S.formId)return;const id=S.formId,d=baseDocs.get(id);if(!d)return;
  const v=Math.max(-16,Math.min(16,sinkOf(id)+(+b.dataset.d)));sinkPending.set(id,v);renderSink();
  clearTimeout(sinkTimer);sinkTimer=setTimeout(async()=>{const cur=baseDocs.get(id);if(!cur)return;
    try{await writeDoc('baseForms',id,{...cur,sink:sinkPending.get(id)});}catch(_){toast('Could not save');}sinkPending.delete(id);renderSink();},450);};
function renderNudge(){const v=S.formId?nudgeOf(S.formId):0;$('nudgeOut').textContent=(v>0?'+':'')+v;
  const [lf,rt]=$('nudgeStep').querySelectorAll('button');lf.disabled=!S.formId||v<=-16;rt.disabled=!S.formId||v>=16;}
let nudgeTimer=null;
$('nudgeStep').onclick=e=>{const b=e.target.closest('button');if(!b||!S.formId)return;const id=S.formId,d=baseDocs.get(id);if(!d)return;
  const v=Math.max(-16,Math.min(16,nudgeOf(id)+(+b.dataset.d)));nudgePending.set(id,v);renderNudge();
  clearTimeout(nudgeTimer);nudgeTimer=setTimeout(async()=>{const cur=baseDocs.get(id);if(!cur)return;
    try{await writeDoc('baseForms',id,{...cur,nudge:nudgePending.get(id)});}catch(_){toast('Could not save');}nudgePending.delete(id);renderNudge();},450);};
async function openForm(id,{keep=false}={}){
  const tok=++S.token;S.formId=id||null;renderSink();
  if(!keep){S.adj={h:0,s:1,l:0};S.over=new Map();S.base=new Map();S.coat='Original';S.editing=null;}
  const f=id?await getForm(id):null;if(tok!==S.token)return;
  const d0=id&&baseDocs.get(id);if(d0)lastSig=studioSig(d0);
  S.form=f;if(f&&!f.anims[S.focus])S.focus=f.firstState()||'idle';
  if(f&&f.failed.length)toast('Could not load: '+f.failed.join(', '));
  syncSliders();renderStudio();
}
function curMap(){return S.form?mapFor(S.form,{adj:S.adj,over:S.over,base:S.base}):[];}
function renderStudio(){renderSlots();renderPalette();renderCoats();renderRegister();rebake();}
function rebake(){
  const f=S.form;const map=curMap();
  const orig=f?f.colors.map(c=>c.rgb):null;
  feed(big,f,S.focus,map,{dim:S.loc,alt:orig});
  const has=f&&f.anims[S.focus];$('bigCanvas').hidden=!has;$('stageEmpty').hidden=!!has;
  $('stageLabel').textContent=(STATES.find(s=>s.k===S.focus)||{}).l?.toUpperCase()||'';$('stageLabel').hidden=!has;
  sizeBig();
  for(const s of STATES){const p=slotPlayers[s.k];if(p)feed(p,f,s.k,map,{dim:S.loc});}
  document.querySelectorAll('.coat').forEach(d=>d.classList.toggle('sel',d.dataset.name===S.coat));
}
function sizeBig(){
  const c=big.crop;if(!c)return;const stage=$('stage');const maxW=stage.clientWidth-24,maxH=Math.max(240,Math.min(400,innerHeight*.48));
  const hh=c.h+padH(big);const k=Math.max(1,Math.floor(Math.min(maxW/c.w,maxH/hh)));const cv=$('bigCanvas');if(cv.width!==c.w*k||cv.height!==hh*k){cv.width=c.w*k;cv.height=hh*k;}
}
new ResizeObserver(sizeBig).observe($('stage'));

/* slots */
function renderSlots(){
  const el=$('slots');el.innerHTML='';slotPlayers={};const f=S.form;const canUp=!!S.formId&&(store.mode==='local'||!!store.assets);
  STATES.forEach(s=>{
    const a=f&&f.anims[s.k];const d=document.createElement('div');d.className='slot'+(S.focus===s.k&&a?' focus':'');d.dataset.state=s.k;
    d.innerHTML=`<div class="hd">${s.i} ${s.l}${a?`<small>${a.frames.length}f · ${(f.raw[s.k]||a).w}px</small>`:''}</div>`+
      (a?`<canvas class="px" width="112" height="112"></canvas><div class="flags"><label class="hov" title="Bob up and down — for floating or flying pets"><input type="checkbox" data-flag="hover" ${flagOf(f,s.k,'hover')?'checked':''}> Hover</label><div class="frow"><label class="hov" title="Vibrate left and right very slightly"><input type="checkbox" data-flag="shake" ${flagOf(f,s.k,'shake')?'checked':''}> LRShake</label>${stepper(f,s.k,'shake','shakeAmt')}</div><div class="frow"><label class="hov" title="Vibrate up and down very slightly"><input type="checkbox" data-flag="ushake" ${flagOf(f,s.k,'ushake')?'checked':''}> UDShake</label>${stepper(f,s.k,'ushake','ushakeAmt')}</div><div class="frow"><label class="hov" title="Repeat last frames: play once, then loop only the last frames"><input type="checkbox" data-flag="rlf" ${flagOf(f,s.k,'rlf')?'checked':''}> RLF</label>${stepper(f,s.k,'rlf','rlfN')}</div>${sizeRow(f,s.k)}</div><div class="acts"><label class="btn">Replace<input type="file" accept="image/gif,image/png"></label><button class="btn danger">✕</button></div>`
        :`<label class="up">${canUp?'＋ Upload GIF':'Uploads need Editor access'}<input type="file" accept="image/gif,image/png" ${canUp?'':'disabled'}></label>`);
    if(a){slotPlayers[s.k]=player(d.querySelector('canvas'));
      d.querySelector('canvas').onclick=()=>{S.focus=s.k;renderSlots();rebake();};
      const rm=d.querySelector('.btn.danger');armButton(rm,'✕','Sure?',()=>removeAnim(s.k));}
    d.querySelectorAll('.step button').forEach(b=>{b.onclick=e=>{e.stopPropagation();const st=b.parentElement;stepAmt(s.k,st.dataset.key,+b.dataset.d,st);};});
    d.querySelectorAll('.hov input[data-flag]').forEach(cb=>{cb.onclick=e=>e.stopPropagation();cb.onchange=()=>setFlag(s.k,cb.dataset.flag,cb.checked,cb);});
    const sr=d.querySelector('.srow');if(sr){sr.onclick=e=>e.stopPropagation();
      sr.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>stepSize(s.k,+b.dataset.rs,sr));
      sr.querySelectorAll('[data-dim]').forEach(inp=>{inp.oninput=()=>typeSize(s.k,inp.dataset.dim,+inp.value,sr);inp.onchange=()=>sizeShow(s.k,sr);});   // in place: redrawing the slots here would swallow the click that ended the typing
      sr.querySelector('[data-sync]').onchange=e=>sizeSync.set(S.formId+'|'+s.k,e.target.checked);}
    const fi=d.querySelector('input[type=file]');if(fi)fi.onchange=()=>fi.files[0]&&uploadAnim(s.k,fi.files[0],d);
    el.appendChild(d);});
}
async function uploadAnim(state,file,card){
  if(!S.formId){toast('Create a base form first');return;}
  const isGif=file.type==='image/gif'||/\.gif$/i.test(file.name),isPng=file.type==='image/png'||/\.png$/i.test(file.name);
  if(!isGif&&!isPng){toast('Use a GIF or PNG');return;}
  const bytes=new Uint8Array(await file.arrayBuffer());let dec;
  try{dec=isGif?decodeGif(bytes):await decodePng(bytes);}catch(e){toast('Could not read that file');return;}
  // palette check against the other animations
  if(S.form&&Object.keys(S.form.anims).some(k=>k!==state)){
    const known=new Set(S.form.colors.filter(c=>Object.keys(c.uses).some(k=>k!==state)).map(c=>c.hex));const fresh=new Set();
    const sc=detectScale(dec.W,dec.H,dec.frames);
    for(const fr of dec.frames)for(let y=0;y<dec.H;y+=sc)for(let x=0;x<dec.W;x+=sc){const o=(y*dec.W+x)*4;if(fr[o+3]<8)continue;const hx=hex(fr[o],fr[o+1],fr[o+2]);if(!known.has(hx))fresh.add(hx);}
    if(fresh.size)toast(`${STATES.find(s=>s.k===state).l} uses ${fresh.size} color${fresh.size>1?'s':''} the other animations don’t — check the palette`);
  }
  card&&card.classList.add('busy');
  try{
    let meta={kind:isGif?'gif':'png',file:file.name.slice(0,80),frames:dec.frames.length};if(dec.n)meta.n=dec.n;
    const doc=JSON.parse(JSON.stringify(baseDocs.get(S.formId)));const old=doc.anims&&doc.anims[state];
    if(store.assets){
      const r=await store.assets.upload(new Blob([bytes],{type:isGif?'image/gif':'image/png'}));meta.asset=r.id;meta.url=r.url;
    }else{const k=newId();localBlobs.set(k,bytes);meta.local=k;}
    doc.anims=doc.anims||{};doc.anims[state]=meta;
    // first animation: pick the fur colors automatically
    if(!doc.fur||!doc.fur.length){const tmp=new Form('tmp');tmp.addAnim(state,dec);doc.fur=tmp.guessFur();}
    S.focus=state;await writeDoc('baseForms',S.formId,doc);
    if(old&&old.asset&&store.assets)store.assets.delete(old.asset).catch(()=>{});
    toast(`${STATES.find(s=>s.k===state).l} saved`);
  }catch(e){console.warn(e);toast('Upload failed: '+e.message);}
  finally{card&&card.classList.remove('busy');}
}
// Each animation's size, in art pixels: its width × height, like its file's (an animation uploaded at 256 px shows
// 256 × 256; type 64 to match 64 px ones). Type either, or use the arrows; with Sync ticked the other follows, keeping
// them in proportion. ▼ ▲ shrink or grow both by a pixel; ↺ goes back to the file's own size. Saved with the base form
// as `resize` ({x, y}: times the file's size), so the cat is that size everywhere, for everyone.
const sizeSync=new Map();   // form|state → keep width and height in proportion (ticked unless untick)
const syncOf=state=>sizeSync.get(S.formId+'|'+state)!==false;
function sizeOf(f,state){const a=f&&f.raw[state];if(!a)return null;const z=f.resize[state]||{x:1,y:1},bw=a.w,bh=a.h;
  return {bw,bh,z,w:Math.max(1,Math.round(bw*z.x)),h:Math.max(1,Math.round(bh*z.y))};}
function sizeRow(f,state){const z=sizeOf(f,state);if(!z)return '';
  return `<div class="srow" title="This animation’s size in art pixels, like its file’s: make it match the others"><span>Size</span>
    <input type="number" min="1" max="999" step="1" data-dim="w" value="${z.w}" aria-label="Width in art pixels">×<input type="number" min="1" max="999" step="1" data-dim="h" value="${z.h}" aria-label="Height in art pixels">
    <span class="step"><button type="button" data-rs="-1" aria-label="Smaller">▼</button><button type="button" data-rs="1" aria-label="Bigger">▲</button></span>
    <label class="hov" title="Keep width and height in proportion"><input type="checkbox" data-sync ${syncOf(state)?'checked':''}> Sync</label>
    <button type="button" class="btn rs0" data-rs="0" title="Back to the file’s own size" ${z.z.x!==1||z.z.y!==1?'':'hidden'}>↺</button></div>`;}
// The size row showing an animation's size as it is now.
function sizeShow(state,row){const t=sizeOf(S.form,state);if(!t||!row)return;
  for(const inp of row.querySelectorAll('[data-dim]'))if(document.activeElement!==inp||inp.dataset.dim!==row.dataset.typing)inp.value=inp.dataset.dim==='w'?t.w:t.h;
  row.querySelector('.rs0').hidden=t.z.x===1&&t.z.y===1;}
// A new size for an animation: shown at once, and saved (with any other new sizes of the same base form, in one go)
// once you stop changing them. Until then it's kept here, so the form loading again in between (another setting
// saved) doesn't lose it.
const sizeTimers=new Map(),pendingSize=new Map();   // form id → save timer; form|state → size not saved yet
function applySize(state,z){const f=S.form,id=S.formId;if(!f||!id||!f.raw[state])return;
  const r=v=>Math.round(Math.min(8,Math.max(.1,v))*1e4)/1e4;z={x:r(z.x),y:r(z.y)};
  f.setResize(state,z);pendingSize.set(id+'|'+state,z);rebake();
  clearTimeout(sizeTimers.get(id));sizeTimers.set(id,setTimeout(()=>saveSizes(id),500));}
async function saveSizes(id){const doc=JSON.parse(JSON.stringify(baseDocs.get(id)||{}));if(!doc.anims)return;const sent=[];
  for(const [k,z] of pendingSize){const [fid,st]=k.split('|');if(fid!==id||!doc.anims[st])continue;
    if(goodResize(z))doc.anims[st].resize=z;else delete doc.anims[st].resize;sent.push([k,z]);}
  if(!sent.length)return;
  try{await writeDoc('baseForms',id,doc);for(const [k,z] of sent)if(pendingSize.get(k)===z)pendingSize.delete(k);}
  catch(e){toast('Could not save that size');}}
function stepSize(state,dir,row){const s=sizeOf(S.form,state);if(!s)return;
  if(dir===0)applySize(state,{x:1,y:1});
  else{const big=Math.max(s.w,s.h),k=Math.max(1,big+dir)/big;applySize(state,{x:s.z.x*k,y:s.z.y*k});}
  row.dataset.typing='';sizeShow(state,row);}
function typeSize(state,dim,value,row){const s=sizeOf(S.form,state);if(!s||!(value>=1))return;const v=Math.min(999,Math.round(value));
  let {x,y}=s.z;
  if(dim==='w'){const nx=v/s.bw;if(syncOf(state))y*=nx/x;x=nx;}else{const ny=v/s.bh;if(syncOf(state))x*=ny/y;y=ny;}
  applySize(state,{x,y});row.dataset.typing=dim;sizeShow(state,row);}   // the box being typed in keeps what's typed
function stepper(f,state,flag,key){
  const c=STEP_CONF[key],v=amtOf(f,state,key);
  return `<span class="step${flagOf(f,state,flag)?'':' off'}" data-key="${key}" title="${c.tip}"><button data-d="-1" ${v<=c.min(f,state)+1e-9?'disabled':''} aria-label="Less">−</button><output>${c.fmt(v)}</output><button data-d="1" ${v>=c.max(f,state)-1e-9?'disabled':''} aria-label="More">+</button></span>`;
}
function restartState(id,state){for(const p of players)if(p.fid===id&&p.state===state){p.cur=0;p.acc=0;}}
const amtTimers=new Map();
function stepAmt(state,key,dir,el){
  const f=S.form,id=S.formId;if(!f||!id)return;
  const c=STEP_CONF[key],mn=c.min(f,state),mx=c.max(f,state);
  const v=Math.round(Math.min(mx,Math.max(mn,amtOf(f,state,key)+dir*c.step))*10)/10;
  const pk=id+'|'+state+'|'+key;pendingAmt.set(pk,v);
  el.querySelector('output').textContent=c.fmt(v);
  el.querySelector('[data-d="-1"]').disabled=v<=mn+1e-9;el.querySelector('[data-d="1"]').disabled=v>=mx-1e-9;
  for(const p of players)if(p.fid===id&&p.state===state)p[key]=v;   // instant feedback everywhere
  if(key==='rlfN'&&flagOf(f,state,'rlf'))restartState(id,state);   // replay from the start so the change is visible
  const tk=id+'|'+state;clearTimeout(amtTimers.get(tk));
  amtTimers.set(tk,setTimeout(async()=>{             // save once you stop clicking
    const doc=JSON.parse(JSON.stringify(baseDocs.get(id)||{}));if(!doc.anims||!doc.anims[state])return;
    const sent={};for(const k of Object.keys(STEP_CONF)){const q=id+'|'+state+'|'+k;if(pendingAmt.has(q)){doc.anims[state][k]=sent[k]=pendingAmt.get(q);}}
    try{await writeDoc('baseForms',id,doc);for(const k in sent){const q=id+'|'+state+'|'+k;if(pendingAmt.get(q)===sent[k])pendingAmt.delete(q);}}
    catch(e){toast('Could not save that setting');}
  },450));
}
async function setFlag(state,flag,on,box){
  const id=S.formId,doc=JSON.parse(JSON.stringify(baseDocs.get(id)||{}));if(!doc.anims||!doc.anims[state])return;
  doc.anims[state][flag]=on;if(flag==='rlf')restartState(id,state);
  try{await writeDoc('baseForms',id,doc);}catch(e){box.checked=!on;toast('Could not save (do you have edit access?)');}
}
async function removeAnim(state){
  const doc=JSON.parse(JSON.stringify(baseDocs.get(S.formId)));const old=doc.anims[state];delete doc.anims[state];
  await writeDoc('baseForms',S.formId,doc);if(old&&old.asset&&store.assets)store.assets.delete(old.asset).catch(()=>{});
}

/* palette */
function renderPalette(){
  const el=$('pal');el.innerHTML='';const f=S.form;if(!f){el.innerHTML='<div class="empty">No colors yet.</div>';return;}
  const map=curMap();const act=f.active();const all=act.reduce((s,x)=>s+x.t,0)||1;
  act.forEach(({c,i,t})=>{
    const nw=hex(...map[i]);const used=STATES.filter(s=>c.uses[s.k]).map(s=>s.l.toLowerCase()).join(' · ');
    const row=document.createElement('div');row.className='prow'+(S.loc===c.hex?' loc':'');
    row.innerHTML=`<input type="checkbox" ${f.fur.has(c.hex)?'checked':''} aria-label="Fur group">
      <button class="sw" style="background:${c.hex}" title="Show where it’s used"></button><span class="arrow">→</span>
      <label class="sw" style="background:${nw}"><input type="color" value="${nw}"></label>
      <div class="hex">${c.hex}${nw!==c.hex?' → '+nw:''}${S.over.has(c.hex)?'<span class="dot" title="Picked by hand"></span>':''}<small>${(t/all*100).toFixed(t/all<.01?1:0)}% · ${used}</small></div>
      <button class="mini" title="Reset">↺</button>`;
    const [cb,orig,,lab,,rst]=row.children;const ci=lab.querySelector('input');
    cb.onchange=()=>{cb.checked?f.fur.add(c.hex):f.fur.delete(c.hex);saveFur();renderPalette();renderCoats();rebake();};
    orig.onclick=()=>locate(c.hex);
    ci.oninput=()=>{S.over.set(c.hex,unhex(ci.value));lab.style.background=ci.value;S.coat=null;rebake();};
    ci.onchange=()=>renderPalette();
    rst.onclick=()=>{S.over.delete(c.hex);renderPalette();rebake();};
    el.appendChild(row);});
}
let furTimer;
function saveFur(){clearTimeout(furTimer);const id=S.formId,fur=[...S.form.fur];furTimer=setTimeout(()=>{const d=baseDocs.get(id);if(!d)return;writeDoc('baseForms',id,{...d,fur}).catch(()=>toast('Could not save fur group'));},600);}
let locTimer;
function locate(h){S.loc=h;renderPalette();rebake();clearTimeout(locTimer);locTimer=setTimeout(()=>{S.loc=null;renderPalette();rebake();},1400);}

/* coats */
function renderCoats(){
  const el=$('coats');el.innerHTML='';coatPlayers=[];const f=S.form;if(!f||!f.firstState()){el.innerHTML='<div class="note">Upload an animation to see coats.</div>';return;}
  const st=f.anims[S.focus]?S.focus:f.firstState();
  let group=null;
  COATS.forEach(c=>{if(c.group!==group){group=c.group;const h=document.createElement('div');h.className='coatgroup';h.textContent=group;el.appendChild(h);}
    const d=document.createElement('div');d.className='coat'+(S.coat===c.name?' sel':'');d.dataset.name=c.name;d.title=c.name;
    d.innerHTML=`<canvas class="px" width="96" height="96"></canvas><span>${c.name}</span>`;
    const p=player(d.querySelector('canvas'));feed(p,f,st,coatMap(f,c));coatPlayers.push(p);
    d.onclick=()=>{const look=coatLook(f,c);S.adj=look.adj;S.base=look.base;[...S.over.keys()].forEach(k=>{if(f.fur.has(k))S.over.delete(k);});S.coat=c.name;syncSliders();renderPalette();rebake();};
    el.appendChild(d);});
}

/* sliders */
const sH=$('sH'),sS=$('sS'),sL=$('sL');
function syncSliders(){sH.value=S.adj.h;sS.value=Math.round(S.adj.s*100);sL.value=Math.round(S.adj.l*100);outs();}
function outs(){$('oH').textContent=sH.value+'°';$('oS').textContent=sS.value+'%';$('oL').textContent=(sL.value>0?'+':'')+sL.value;}
[sH,sS,sL].forEach(el=>{el.oninput=()=>{S.adj={h:+sH.value,s:sS.value/100,l:sL.value/100};S.coat=null;outs();rebake();};el.onchange=()=>renderPalette();});
$('resetAll').onclick=()=>{S.adj={h:0,s:1,l:0};S.over=new Map();S.base=new Map();S.coat='Original';syncSliders();renderPalette();rebake();};

/* register */
function changesNow(){const f=S.form,map=curMap(),ch={};f.colors.forEach((c,i)=>{if(f.total(c)>0){const n=hex(...map[i]);if(n!==c.hex)ch[c.hex]=n;}});return ch;}
let selRarity='common';
function renderRarity(){$('raritySel').innerHTML=RARITIES.map(r=>`<button type="button" role="radio" style="--rc:${r.c}" data-k="${r.k}" aria-pressed="${r.k===selRarity}" aria-checked="${r.k===selRarity}">${rarityDot(r.k,12)}${r.l}</button>`).join('');}
$('raritySel').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b)return;selRarity=b.dataset.k;renderRarity();};
renderRarity();
function renderRegister(){
  const ed=S.editing&&regDocs.get(S.editing);
  $('editingBar').classList.toggle('on',!!ed);$('editingTxt').innerHTML=ed?`Editing <b>${esc(ed.name)}</b>`:'';
  $('updBtn').hidden=!ed;$('regBtn').textContent=ed?'Save as new':'Register form';
  const ok=!!(S.form&&S.form.firstState());$('regBtn').disabled=!ok;$('updBtn').disabled=!ok;
}
$('regBtn').onclick=async()=>{
  const name=$('regName').value.trim();if(!name){toast('Give it a name first');$('regName').focus();return;}
  const id=newId();const doc={name:name.slice(0,40),baseFormId:S.formId,rarity:selRarity,look:S.coat||'custom',changes:changesNow(),createdAt:Date.now()};
  try{await writeDoc('registeredForms',id,doc);S.editing=id;renderRegister();toast(`Registered “${name}” · ${JSON.stringify(doc).length} bytes`);}
  catch(e){toast(e&&e.code==='quota_exceeded'?'Database is full':'Could not save (do you have edit access?)');}
};
$('updBtn').onclick=async()=>{
  const id=S.editing,old=regDocs.get(id);if(!old)return;const name=$('regName').value.trim()||old.name;
  const doc={...old,name:name.slice(0,40),rarity:selRarity,look:S.coat||'custom',changes:changesNow(),updatedAt:Date.now()};
  try{await writeDoc('registeredForms',id,doc);toast(`Updated “${name}”`);}catch(e){toast('Could not save');}
};
$('stopEditBtn').onclick=()=>{S.editing=null;$('regName').value='';selRarity='common';renderRarity();renderRegister();};

/* base form bar */
$('formSel').onchange=e=>{openForm(e.target.value);const d=baseDocs.get(e.target.value);$('faceSel').value=d&&d.facing==='right'?'right':'left';renderSink();};
$('faceSel').onchange=async e=>{const id=S.formId,d=baseDocs.get(id);if(!d)return;try{await writeDoc('baseForms',id,{...d,facing:e.target.value});toast('Saved — pets will turn the right way in the Room');}catch(_){toast('Could not save');}};
$('newFormBtn').onclick=()=>{$('newRow').classList.add('on');$('newName').focus();};
$('cancelNewBtn').onclick=()=>$('newRow').classList.remove('on');
$('createFormBtn').onclick=async()=>{
  const name=$('newName').value.trim();if(!name){$('newName').focus();return;}
  const id=newId();try{await writeDoc('baseForms',id,{name:name.slice(0,40),createdAt:Date.now(),fur:[],anims:{}});
    $('newName').value='';$('newRow').classList.remove('on');S.formId=id;openForm(id);toast('Now upload its animations');}
  catch(e){toast('Could not create (do you have edit access?)');}
};
armButton($('delFormBtn'),'Delete','Delete base form?',async()=>{
  const id=S.formId;if(!id)return;const uses=[...regDocs.values()].filter(r=>r.baseFormId===id).length;
  if(uses){toast(`${uses} registered form${uses>1?'s use':' uses'} this base form — delete ${uses>1?'them':'it'} first`);return;}
  const doc=baseDocs.get(id);await deleteDoc('baseForms',id);
  if(doc&&store.assets)Object.values(doc.anims||{}).forEach(m=>m&&m.asset&&store.assets.delete(m.asset).catch(()=>{}));
  toast('Base form deleted');
});
function armButton(btn,label,armed,fn){let t;btn.onclick=e=>{e.stopPropagation();if(btn.classList.contains('arm')){clearTimeout(t);btn.classList.remove('arm');btn.textContent=label;fn();}
  else{btn.classList.add('arm');btn.textContent=armed;t=setTimeout(()=>{btn.classList.remove('arm');btn.textContent=label;},3000);}};}

/* playback controls */
$('restartBtn').onclick=()=>{for(const p of players){p.cur=0;p.acc=0;}};
$('playBtn').onclick=()=>{playing=!playing;$('playBtn').textContent=playing?'❚❚ Pause':'▶ Play';};
function seg(id,fn){const el=$(id);el.onclick=e=>{const b=e.target.closest('button');if(!b)return;[...el.children].forEach(x=>x.setAttribute('aria-pressed',x===b));fn(b.dataset.v);};}
seg('speedSeg',v=>speed=+v);
seg('bgSeg',v=>{$('stage').className='stage bg-'+v;$('dStage').className='stage bg-'+v;});
const cmp=$('cmpBtn');const on=e=>{e.preventDefault();showOrig=true;$('origBadge').classList.add('on');},off=()=>{showOrig=false;$('origBadge').classList.remove('on');};
cmp.addEventListener('pointerdown',on);['pointerup','pointerleave','pointercancel'].forEach(t=>cmp.addEventListener(t,off));

/* ================= Registered forms gallery ================= */
let selReg=null,dState='idle';const dPlayer=player($('dCanvas'));let gTok=0;
function renderGallery(){
  const tok=++gTok;const el=$('ggrid');el.innerHTML='';
  const ids=[...regDocs.keys()].sort((a,b)=>(regDocs.get(b).createdAt||0)-(regDocs.get(a).createdAt||0));
  $('regCount').textContent=ids.length;$('gEmpty').hidden=!!ids.length;
  ids.forEach(id=>{const r=regDocs.get(id);const base=baseDocs.get(r.baseFormId);
    const d=document.createElement('div');d.className='gcard'+(selReg===id?' sel':'');
    d.style.setProperty('--rc',rarityOf(r.rarity).c);
    d.innerHTML=`<canvas class="px" width="128" height="128"></canvas><div class="nm">${rarityDot(r.rarity)}<span>${esc(r.name)}</span></div><div class="sub">${base?esc(base.name):'Base form missing'} · ${esc(r.look||'custom')}</div>`;
    const p=player(d.querySelector('canvas'));
    getForm(r.baseFormId).then(f=>{if(tok!==gTok||!f)return;feed(p,f,f.anims.idle?'idle':f.firstState(),mapFromChanges(f,r.changes));});
    d.onclick=()=>{selReg=id;dState='idle';renderGallery();renderDetail();$('detail').scrollIntoView({behavior:'smooth',block:'nearest'});};
    el.appendChild(d);});
  if(selReg&&!regDocs.has(selReg)){selReg=null;}
  renderDetail();
}
// change a registered form's rarity right here — no trip to the Studio
$('dRarity').onclick=async e=>{const b=e.target.closest('button[data-k]');if(!b||!selReg)return;const id=selReg,r=regDocs.get(id);if(!r||rarityOf(r.rarity).k===b.dataset.k)return;
  $('dRarity').querySelectorAll('button').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',on);x.setAttribute('aria-checked',on);});
  try{await writeDoc('registeredForms',id,{...r,rarity:b.dataset.k,updatedAt:Date.now()});toast(`${r.name} is now ${rarityOf(b.dataset.k).l}`);}catch(_){toast('Could not save (do you have edit access?)');renderDetail();}};
async function renderDetail(){
  const r=selReg&&regDocs.get(selReg);$('detail').classList.toggle('on',!!r);if(!r)return;
  const base=baseDocs.get(r.baseFormId);$('dName').textContent=r.name;
  const rr=rarityOf(r.rarity);
  $('dSub').innerHTML=`<span class="rlabel" style="--rc:${rr.c}">${rarityDot(rr.k,12)}${rr.l}</span> · ${esc(base?base.name:'Base form missing')} · ${esc(r.look||'custom')} · ${Object.keys(r.changes||{}).length} color changes`;
  $('dRarity').innerHTML=RARITIES.map(x=>`<button type="button" role="radio" style="--rc:${x.c}" data-k="${x.k}" aria-pressed="${x.k===rr.k}" aria-checked="${x.k===rr.k}">${rarityDot(x.k,12)}${x.l}</button>`).join('');
  const stored={name:r.name,baseFormId:r.baseFormId,rarity:rr.k,look:r.look,changes:r.changes};
  $('dJson').textContent=JSON.stringify(stored,null,2)+`\n\n// ${JSON.stringify(r).length} bytes`;
  const f=await getForm(r.baseFormId);if(!f){dPlayer.baked=[];$('dStates').innerHTML='';return;}
  if(!f.anims[dState])dState=f.firstState();
  $('dStates').innerHTML=STATES.map(s=>`<button class="btn" data-k="${s.k}" aria-pressed="${s.k===dState}" ${f.anims[s.k]?'':'disabled'}>${s.i} ${s.l}</button>`).join('');
  $('dStates').onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;dState=b.dataset.k;renderDetail();};
  feed(dPlayer,f,dState,mapFromChanges(f,r.changes));
  const c=f.crop;if(c){const st=$('dStage');const hh=c.h+padH(dPlayer);const k=Math.max(1,Math.floor(Math.min((st.clientWidth-24)/c.w,300/hh)));$('dCanvas').width=c.w*k;$('dCanvas').height=hh*k;}
}
$('dEdit').onclick=async()=>{const id=selReg,r=regDocs.get(id);if(!r)return;location.hash='studio';
  S.formId=r.baseFormId;$('formSel').value=r.baseFormId;await openForm(r.baseFormId);
  S.over=new Map(Object.entries(r.changes||{}).map(([k,v])=>[k,unhex(v)]));S.base=new Map();S.adj={h:0,s:1,l:0};S.coat=null;S.editing=id;$('regName').value=r.name;selRarity=rarityOf(r.rarity).k;renderRarity();
  syncSliders();renderStudio();};
$('dCopy').onclick=async()=>{const r=regDocs.get(selReg);try{await navigator.clipboard.writeText(JSON.stringify({name:r.name,baseFormId:r.baseFormId,changes:r.changes},null,2));toast('Copied');}catch(e){toast('Copy not allowed here');}};
armButton($('dDel'),'Delete','Delete form?',async()=>{const id=selReg;selReg=null;if(S.editing===id)S.editing=null;await deleteDoc('registeredForms',id);toast('Deleted');});
$('dGif').onclick=async()=>{const r=regDocs.get(selReg);const f=await getForm(r.baseFormId);if(!f)return;
  const blob=exportGif(f,f.anims[dState],mapFromChanges(f,r.changes));if(!blob)return;
  offer(blob,`${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${dState}.gif`);};
function exportGif(f,a,map){
  if(f.colors.length>255){toast('Too many colors for a GIF');return null;}
  const k=a.scale,W=a.w*k,H=a.h*k;let n=2;while(n<f.colors.length+1)n*=2;
  const pal=new Array(n).fill(0);map.forEach((c,i)=>pal[i+1]=(c[0]<<16)|(c[1]<<8)|c[2]);
  const buf=new Uint8Array(W*H*a.frames.length*2+65536);const gw=new GifWriter(buf,W,H,{loop:0,palette:pal});
  a.frames.forEach((ix,fi)=>{const px=new Uint8Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=ix[Math.floor(y/k)*a.w+Math.floor(x/k)];px[y*W+x]=i===0xFFFF?0:i+1;}
    gw.addFrame(0,0,W,H,px,{delay:Math.round(a.delays[fi]/10),transparent:0,disposal:2});});
  return new Blob([buf.slice(0,gw.end())],{type:'image/gif'});
}
async function offer(blob,filename){
  if(store.downloads){try{await store.downloads.save({filename,data:blob});toast('Saved '+filename);return;}catch(e){if(e&&e.code==='declined')return;}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();}catch(e){toast('Download not available here');}
}

/* ================= change handlers ================= */
let lastSig=null;
const studioSig=D=>animSig(D)+JSON.stringify(D.fur||[])+JSON.stringify(STATES.map(s=>{const m=D.anims&&D.anims[s.k];return m?[!!m.hover,!!m.shake,!!m.ushake,m.shakeAmt??null,m.ushakeAmt??null,!!m.rlf,m.rlfN??null,m.resize??null]:0;}));
function onBaseChange(){
  renderFormSel();
  if(!S.formId||!baseDocs.has(S.formId)){const first=$('formSel').value||null;if(first!==S.formId||!S.form){openForm(first);}}
  else{const sig=studioSig(baseDocs.get(S.formId));
    if(sig!==lastSig){lastSig=sig;openForm(S.formId,{keep:true});}}
  renderGallery();roomSync();raceSync();runSync();onPetsChange();
}
function onRegChange(){renderGallery();renderRegister();roomSync();raceSync();runSync();onPetsChange();renderShop();renderProfile();}

/* ===================================================================
   ROOM — registered forms walking around one shared scene
   World coordinates = pixels of the background image (1254 × 1254).
   =================================================================== */
const ROOM={
  W:1254, H:1254,
  view:{x:0,y:250,w:1254,h:1004},            // part of the image shown (skips the empty top banners)
  floor:{back:915,front:1236,left:46,right:1208}, // walkable area: feet must stay inside
  pxBack:2.6, pxFront:4.0,                    // art-pixel size at the back / front (depth scaling)
  speed:175,                                  // walk speed in image px per second at the front
  maxCats:12, defaultCats:6, emoteMs:2800
};
const GUEST_NAMES=['Biscuit','Pepper','Miso','Tofu','Nori','Clove','Juniper','Pixel','Mochi','Sesame','Waffle','Bean'];
const R={cats:[],mine:null,count:ROOM.defaultCats,bg:null,bgOk:false,canvas:null,ctx:null,s:1,menu:null,marks:[],running:false,last:0,building:0,guests:[]};
try{const n=+localStorage.getItem('forge.roomCount');if(n>=1&&n<=ROOM.maxCats)R.count=n;}catch(e){}

const lerp=(a,b,t)=>a+(b-a)*t;
const depthT=y=>Math.max(0,Math.min(1,(y-ROOM.floor.back)/(ROOM.floor.front-ROOM.floor.back)));
const pxAt=y=>lerp(ROOM.pxBack,ROOM.pxFront,depthT(y));
const clampFloor=(x,y)=>({x:Math.max(ROOM.floor.left,Math.min(ROOM.floor.right,x)),y:Math.max(ROOM.floor.back,Math.min(ROOM.floor.front,y))});
const randFloor=()=>({x:lerp(ROOM.floor.left,ROOM.floor.right,Math.random()),y:lerp(ROOM.floor.back,ROOM.floor.front,Math.random())});
const rnd=(a,b)=>a+Math.random()*(b-a);

class RoomCat{
  constructor(o){Object.assign(this,o);const p=randFloor();this.x=p.x;this.y=p.y;this.tx=null;this.ty=null;
    this.face=Math.random()<.5?-1:1;this.state='idle';this.cur=0;this.acc=0;this.clock=0;
    this.until=0;this.bubble=null;this.lock=false;this.task=null;this.hop=0;this.cache={};this.aiAt=performance.now()+rnd(800,4000);}
  artFaces(){const d=baseDocs.get(this.form.id);return d&&d.facing==='right'?1:-1;}
  anim(state){ // falls back to idle when a pet has no animation for that state
    if(state==='idle'&&this.low&&this.form.anims.sad)state='sad';   // an unhappy cat (`low`: happiness under 20) idles sad
    const st=this.form.anims[state]?state:(this.form.anims.idle?'idle':this.form.firstState());
    if(!this.cache[st]){const a=this.form.anims[st],f=this.form;
      this.cache[st]={st,frames:bake(f,a,this.map),delays:a.delays,
        hover:flagOf(f,st,'hover'),shake:flagOf(f,st,'shake'),ushake:flagOf(f,st,'ushake'),
        shakeAmt:amtOf(f,st,'shakeAmt'),ushakeAmt:amtOf(f,st,'ushakeAmt'),rlf:flagOf(f,st,'rlf'),rlfN:amtOf(f,st,'rlfN')};}
    return this.cache[st];
  }
  setState(s){if(s!==this.state){this.state=s;this.cur=0;this.acc=0;}}
  walkTo(x,y){const p=clampFloor(x,y);this.tx=p.x;this.ty=p.y;this.setState('walk');}
  emote(state,ms,emoji,{hop=false,then=null}={}){const now=performance.now();this.tx=null;this.setState(state);this.until=now+ms;
    this.bubble=emoji?{e:emoji,t0:now,ms}:null;this.hop=hop?ms:0;this.hopT0=now;this.then=then;}
  cycleMs(state){const A=this.anim(state);return A.delays.reduce((a,b)=>a+b,0);} // one full play of an animation
  update(dt,now){
    // frames (with RLF: after the last frame, loop only the final N frames)
    const A=this.anim(this.state);const n=A.frames.length;
    if(n>1){this.acc+=dt;let d=A.delays[this.cur]||100;
      while(this.acc>=d){this.acc-=d;this.cur=this.cur+1<n?this.cur+1:(A.rlf?Math.max(0,n-Math.min(n,A.rlfN)):0);d=A.delays[this.cur]||100;}}
    else this.cur=0;
    this.clock+=dt;
    // walking
    if(this.tx!==null){
      const dx=this.tx-this.x,dy=this.ty-this.y,dist=Math.hypot(dx,dy);
      const step=ROOM.speed*(pxAt(this.y)/ROOM.pxFront)*dt/1000;
      if(Math.abs(dx)>2)this.face=dx>0?1:-1;
      if(dist<=step){this.x=this.tx;this.y=this.ty;this.tx=null;this.setState('idle');this.arrived(now);}
      else{this.x+=dx/dist*step;this.y+=dy/dist*step;}
    }
    // emote finished
    if(this.until&&now>=this.until){this.until=0;this.hop=0;
      if(this.then){const f=this.then;this.then=null;f();}          // chained step (e.g. Play: happy, then jump)
      else{this.setState('idle');this.lock=false;this.aiAt=now+rnd(1500,4000);}}
    // simple wandering for everyone except your pet
    if(this!==R.mine&&!this.lock&&!this.until&&this.tx===null&&now>=this.aiAt){
      if(Math.random()<.6){const p=randFloor();const nx=this.x+(p.x-this.x)*.6,ny=this.y+(p.y-this.y)*.6;this.walkTo(nx,ny);}
      this.aiAt=now+rnd(2500,7000);
    }
  }
  arrived(now){
    const t=this.task;this.task=null;if(!t)return;const o=t.target;
    if(!R.cats.includes(o)){o.lock=false;return;}
    this.face=o.x>this.x?1:-1;o.face=-this.face;const ms=ROOM.emoteMs;
    if(t.kind==='pet'){o.emote('love',ms,'💗');this.emote('idle',ms,'✋');}
    else if(t.kind==='play'){
      // 1) both play their happy animation once (wait for the longer one), 2) then both jump in their idle animation
      const happy=Math.max(1200,Math.min(5000,Math.max(this.cycleMs('love'),o.cycleMs('love'))));
      // then they take turns jumping: left, right, left, right (each jump 0.3 s, the other pet lands while one is up)
      const jump=()=>{const [L,Rt]=this.x<=o.x?[this,o]:[o,this];
        L.emote('idle',1200,null,{hop:true});Rt.emote('idle',1500,null,{hop:true});Rt.hopT0+=300;};
      o.emote('love',happy,'🎾',{then:jump});this.emote('love',happy,'💗',{then:()=>{}});}
    else if(t.kind==='bully'){this.emote('angry',ms,'💢');o.emote('sad',ms,'💧');}
  }
  box(){ // sprite rectangle in image coords, feet at (x,y)
    const P=pxAt(this.y),c=this.form.crop,A=this.anim(this.state);
    let dx=this.x-c.w*P/2+nudgeOf(this.form)*P,dy=this.y-(c.h-1-sinkOf(this.form))*P;let lift=0;
    if(A.hover){lift=HOVER_AMP*P*(.6+(Math.sin(this.clock/HOVER_MS*Math.PI*2)+1)/2);}
    if(this.hop){const t=performance.now()-this.hopT0;if(t>=0){const ph=(t/600)%1;if(ph<.5)lift+=Math.sin(ph*2*Math.PI)*8*P;}} // one 0.3 s jump every 0.6 s
    if(A.shake)dx+=Math.sin(this.clock/SHAKE_MS*Math.PI*2)*A.shakeAmt*P;
    if(A.ushake)dy+=Math.sin(this.clock/USHAKE_MS*Math.PI*2)*A.ushakeAmt*P;
    return {x:dx,y:dy-lift,w:c.w*P,h:c.h*P,P,lift,A};
  }
}

/* ---------- building the cast ---------- */
function roomRoster(count=R.count,guests=R.guests){
  if(LIVE)return (LV.room?LV.room.pets:[]).map(p=>{const r=regDocs.get(p.skinId);
    return r&&baseDocs.has(r.baseFormId)?{id:String(p._id),name:p.name,baseFormId:r.baseFormId,changes:r.changes||{},rarity:r.rarity||'common',guest:false,live:p}:null;}).filter(Boolean);
  const regs=[...regDocs.entries()].filter(([,r])=>baseDocs.has(r.baseFormId)).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
  const list=regs.slice(0,count).map(([id,r])=>({id,name:r.name,baseFormId:r.baseFormId,changes:r.changes||{},rarity:r.rarity||'common',guest:false}));
  const bases=[...baseDocs.keys()].filter(id=>{const d=baseDocs.get(id);return d.anims&&(d.anims.idle||Object.values(d.anims).some(Boolean));});
  let gi=0;
  while(list.length<count&&bases.length){
    if(!guests[gi]){const b=pick(bases),coat=pick(COATS.slice(1));guests[gi]={id:'guest-'+gi,name:GUEST_NAMES[gi%GUEST_NAMES.length],baseFormId:b,coat,guest:true};}
    if(!baseDocs.has(guests[gi].baseFormId))guests[gi].baseFormId=pick(bases);
    list.push(guests[gi]);gi++;
  }
  return list;
}
const pick=a=>a[Math.floor(Math.random()*a.length)];
async function roomSync(){
  const tok=++R.building;const roster=roomRoster();
  const forms=await Promise.all(roster.map(r=>getForm(r.baseFormId)));if(tok!==R.building)return;
  const next=[];
  roster.forEach((r,i)=>{const f=forms[i];if(!f||!f.firstState())return;
    const map=r.guest?coatMap(f,r.coat):mapFromChanges(f,r.changes);
    let c=R.cats.find(k=>k.id===r.id);
    if(c){c.name=r.name;c.rarity=r.rarity;if(c.form!==f||JSON.stringify(c.map)!==JSON.stringify(map)){c.form=f;c.map=map;c.cache={};}}
    else c=new RoomCat({id:r.id,name:r.name,form:f,map,guest:r.guest,rarity:r.rarity});
    c.liveAura=r.live?r.live.aura:null;c.owner=r.live?r.live.owner:null;c.friend=!!(r.live&&r.live.friend);c.low=lowMood(r.live&&r.live.meters);
    next.push(c);});
  R.cats.forEach(c=>{if(!next.includes(c))next.forEach(o=>{if(o.task&&o.task.target===c)o.task=null;});});
  R.cats=next;R.cats.forEach(c=>c.cache={}); // re-read animation settings (hover, shakes, RLF) after any change
  let mineId=R.mine&&R.mine.id;if(!mineId){try{mineId=localStorage.getItem('forge.roomMine');}catch(e){}}
  R.mine=LIVE?(R.cats.find(c=>c.id===PR.id)||null):(R.cats.find(c=>c.id===mineId)||R.cats.find(c=>!c.guest)||R.cats[0]||null);   // in the game, you're your own pet
  renderRoomBar();closeMenu();
  $('roomEmpty').hidden=!!R.cats.length;
}
function renderRoomBar(){
  if(LIVE&&!LV.room){$('roomNote').textContent='Looking for pets…';const pb=$('roomPlacesBtn');if(pb)pb.textContent=`${ROOMS[RM.room].icon} ${ROOMS[RM.room].name}`;return;}   // until the server says who's here
  if(LIVE){const pb=$('roomPlacesBtn');if(pb)pb.textContent=`${ROOMS[RM.room].icon} ${ROOMS[RM.room].name}`;}
  if(LIVE){const n=R.cats.length,f=R.cats.filter(c=>c.friend).length;
    $('roomNote').textContent=`${n} pet${n===1?'':'s'} here${f?`, ${f} of them your friends’`:''}. They change every time you come in. ${ROOMS[RM.room].indoor?'Indoors: no weather here.':'The weather changes every 4 hours.'}${R.mine?'':LV.room.away?' Your cat has no happiness left, so it only goes out to the Graveyard: cheer it up in the Pet tab.':' Hatch your egg in the Pet tab to join in.'}`;return;}
  const sel=$('mineSel');
  sel.innerHTML=R.cats.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}${c.guest?' (guest)':''}</option>`).join('');
  if(R.mine)sel.value=R.mine.id;
  $('roomN').textContent=R.count;$('roomMinus').disabled=R.count<=1;$('roomPlus').disabled=R.count>=ROOM.maxCats;
  const regN=[...regDocs.values()].filter(r=>baseDocs.has(r.baseFormId)).length;
  $('roomNote').textContent=regN<R.count?`${Math.min(regN,R.count)} registered form${regN===1?'':'s'} + ${R.count-Math.min(regN,R.count)} random guest${R.count-regN===1?'':'s'} (register more forms to replace guests).`:`Showing your first ${R.count} registered forms.`;
}
$('mineSel').onchange=e=>{const c=R.cats.find(k=>k.id===e.target.value);if(c){if(R.mine&&R.mine.task){R.mine.task.target.lock=false;R.mine.task=null;}R.mine=c;c.lock=false;c.tx=null;c.setState('idle');try{localStorage.setItem('forge.roomMine',c.id);}catch(_){}}};
function setCount(n){R.count=Math.max(1,Math.min(ROOM.maxCats,n));try{localStorage.setItem('forge.roomCount',R.count);}catch(e){}roomSync();}
$('roomMinus').onclick=()=>setCount(R.count-1);$('roomPlus').onclick=()=>setCount(R.count+1);
$('roomShuffle').onclick=()=>{R.cats.forEach(c=>{const p=randFloor();c.x=p.x;c.y=p.y;c.tx=null;c.task=null;c.lock=false;c.until=0;c.bubble=null;c.setState('idle');});closeMenu();};

/* ---------- drawing ---------- */
R.canvas=$('roomCanvas');R.ctx=R.canvas.getContext('2d');

function roomSize(){
  const wrap=$('roomWrap');const cssW=wrap.clientWidth;if(!cssW)return;const cssH=cssW*ROOM.view.h/ROOM.view.w;
  const dpr=Math.min(2,window.devicePixelRatio||1);R.canvas.style.height=cssH+'px';
  const w=Math.round(cssW*dpr),h=Math.round(cssH*dpr);if(R.canvas.width!==w||R.canvas.height!==h){R.canvas.width=w;R.canvas.height=h;}
  R.s=w/ROOM.view.w;R.cssScale=cssW/ROOM.view.w;
}
new ResizeObserver(roomSize).observe($('roomWrap'));
function roomDraw(now){
  const g=R.ctx,s=R.s,v=ROOM.view;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,R.canvas.width,R.canvas.height);
  g.setTransform(s,0,0,s,-v.x*s,-v.y*s);
  const key=RM.room+'|'+roomWeather();if(!RM.bgs[key])RM.bgs[key]=drawRoomMap(RM.room,roomWeather());RM.cur=RM.bgs[key];
  g.imageSmoothingEnabled=false;g.drawImage(RM.cur.canvas,0,0,RMAP.S*RMAP.K,RMAP.S*RMAP.K);
  roomFx(g,now,R.dt||16,'back');
  // floor click markers
  R.marks=R.marks.filter(m=>now-m.t<650);
  for(const m of R.marks){const t=(now-m.t)/650;g.save();g.globalAlpha=1-t;g.strokeStyle='#ffd27a';g.lineWidth=3;g.beginPath();g.ellipse(m.x,m.y,14+30*t,(14+30*t)*.35,0,0,Math.PI*2);g.stroke();g.restore();}
  const order=[...R.cats].sort((a,b)=>a.y-b.y);
  // shadows + your ring first so sprites sit on top
  for(const c of order){const b=c.box();g.save();g.globalAlpha=Math.max(.12,.32-b.lift/(60*b.P)*.2);g.fillStyle='#000';g.beginPath();g.ellipse(c.x,c.y+b.P*.5,b.w*.3,b.P*2,0,0,Math.PI*2);g.fill();g.restore();
    if(c===R.mine){g.save();g.strokeStyle='#ffb35c';g.globalAlpha=.85;g.lineWidth=2.5;g.beginPath();g.ellipse(c.x,c.y+b.P*.5,b.w*.36,b.P*2.6,0,0,Math.PI*2);g.stroke();g.restore();}}
  for(const c of order){const b=c.box(),A=b.A,f=A.frames[c.cur]||A.frames[0];const cr=c.form.crop;
    const ak=c.guest?'':auraForSkin(c.id);
    if(ak){if(!c._fx||c._fx.kind!==ak)c._fx=newAuraFx(ak);const M=c._fx.M,cv=auraRender(c._fx,f,cr,c.face!==c.artFaces(),now,R.dt||16,topPad(c));   // pet + aura, scaled like the sprite
      g.imageSmoothingEnabled=false;g.drawImage(cv,Math.round(b.x-M*b.P-(c.face!==c.artFaces()?2*nudgeOf(c.form)*b.P:0)),Math.round(b.y-M*b.P),Math.round(cv.width*b.P),Math.round(cv.height*b.P));c._box=b;continue;}
    g.save();g.imageSmoothingEnabled=false;
    if(c.face!==c.artFaces()){g.translate(c.x*2,0);g.scale(-1,1);}
    g.drawImage(f,cr.x,cr.y,cr.w,cr.h,Math.round(b.x),Math.round(b.y),Math.round(b.w),Math.round(b.h));g.restore();
    c._box=b;}
  if(RM.cur.meta.front){g.imageSmoothingEnabled=false;g.drawImage(RM.cur.meta.front,0,0,RMAP.S*RMAP.K,RMAP.S*RMAP.K);}   // foreground layer in front of the pets
  roomFx(g,now,R.dt||16,'weather');   // rain / lightning over the pets
  // names and emote bubbles on top of everything
  g.textAlign='center';g.textBaseline='middle';
  for(const c of order){const b=c._box;const top=b.y+topPad(c)*b.P;
    g.font='600 19px Inter, sans-serif';const label=(c===R.mine?'★ ':'')+c.name;const dot=c.rarity?18:0;const tw=g.measureText(label).width+16+dot;
    g.save();g.globalAlpha=.85;g.fillStyle=c===R.mine?'#ffb35c':'rgba(15,10,20,.72)';roundRect(g,c.x-tw/2,top-30,tw,24,8);g.fill();g.restore();
    if(dot){const rc=rarityOf(c.rarity).c;g.save();g.fillStyle=rc;g.shadowColor=rc;g.shadowBlur=6;g.beginPath();g.arc(c.x-tw/2+15,top-18,6,0,Math.PI*2);g.fill();
      g.shadowBlur=0;g.lineWidth=1.5;g.strokeStyle='rgba(0,0,0,.45)';g.stroke();g.restore();}
    g.fillStyle=c===R.mine?'#2a1700':'#f3eefc';g.fillText(label,c.x+dot/2,top-18);
    if(c.bubble){const t=(now-c.bubble.t0)/c.bubble.ms;if(t>=1)c.bubble=null;else{
      const a=t<.1?t/.1:t>.75?(1-t)/.25:1;const yb=top-62-t*18;g.save();g.globalAlpha=a;g.fillStyle='#fff';roundRect(g,c.x-24,yb-22,48,44,14);g.fill();
      g.beginPath();g.moveTo(c.x-7,yb+20);g.lineTo(c.x,yb+30);g.lineTo(c.x+7,yb+20);g.fill();g.font='28px serif';g.fillText(c.bubble.e,c.x,yb+1);g.restore();}}}
}
function topPad(c){ // first non-empty row of the crop, so labels sit right above the head
  if(c._topPad!==undefined&&c._topForm===c.form)return c._topPad;
  let best=c.form.crop.h;for(const a of Object.values(c.form.anims)){const t=a.box[1]-c.form.crop.y;if(t<best)best=t;}
  c._topForm=c.form;return c._topPad=Math.max(0,best);
}
function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function roomLoop(t){
  if(!R.running)return;const dt=Math.min(100,t-(R.last||t));R.last=t;R.dt=dt;
  for(const c of R.cats)c.update(dt,t);roomDraw(t);positionMenu();requestAnimationFrame(roomLoop);
}
function roomStart(){if(R.running)return;R.running=true;R.last=0;roomSize();requestAnimationFrame(roomLoop);}
function roomStop(){R.running=false;closeMenu();}

/* ===================================================================
   ROOM MAPS — pixel art drawn at 314×314 and shown at 4× (one map pixel =
   4 image pixels), so the walkable floor keeps the same size as before:
   back edge y≈229, front y≈309, x 12…302 in map pixels.
   =================================================================== */
const RMAP={S:314,K:4};
const ROOMS={theatre:{name:'Theatre',icon:'🎬',indoor:true},graveyard:{name:'Graveyard',icon:'🪦'},catpark:{name:'Cat park',icon:'🐈'},school:{name:'School',icon:'🏫'},cafeteria:{name:'Cafeteria',icon:'🍽️',indoor:true},christmas:{name:'Christmas',icon:'🎄',wx:['sunny','snow']}};
const RM={room:LIVE?'school':(()=>{try{let v=localStorage.getItem('forge.room');if(v==='dogpark')v='catpark';return ROOMS[v]?v:'theatre';}catch(e){return 'theatre';}})(),   // the game always opens at the School
  weather:(()=>{try{const v=localStorage.getItem('forge.roomWeather');return ['sunny','rain','thunder','snow'].includes(v)?v:'sunny';}catch(e){return 'sunny';}})(),
  bgs:{},drops:[],splashes:[],flash:null,nextFlash:0};
// each room lists the weathers it supports (default: clear / rain / thunder); unsupported picks fall back sensibly
const roomWxList=()=>ROOMS[RM.room].indoor?[]:(ROOMS[RM.room].wx||['sunny','rain','thunder']);
const roomWeather=()=>{const L=roomWxList();if(!L.length)return 'sunny';if(L.includes(RM.weather))return RM.weather;return L.includes('snow')&&RM.weather!=='sunny'?'snow':'sunny';};

function drawRoomMap(id,weather){
  const S=RMAP.S,W=WEATHER[weather]||WEATHER.sunny,dark=weather!=='sunny';
  const c=document.createElement('canvas');c.width=S;c.height=S;let g=c.getContext('2d');const rnd=seeded(id.length*97+13);
  const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const R=a=>a[Math.floor(rnd()*a.length)];const lights=[];const light=(x,y,w,h,col)=>lights.push([x,y,w,h,col]);
  const meta={bulbs:[],texts:[],skyBottom:0};
  // finish the far background now (weather tint + its lights), then keep painting on a fresh layer above it,
  // so nearer things (trees, fences…) cover lit windows instead of the windows glowing through them
  let top=null;
  const splitLayer=()=>{if(W.tint){g.globalCompositeOperation='multiply';g.fillStyle=W.tint;g.fillRect(0,0,S,S);g.globalCompositeOperation='source-over';}
    for(const [x,y,w,h,col] of lights)px(x,y,w,h,col);lights.length=0;top=document.createElement('canvas');top.width=S;top.height=S;g=top.getContext('2d');};
  const tintOwn=(cv,tint)=>{const x=cv.getContext('2d'),im=x.getImageData(0,0,S,S),d=im.data,[tr,tg,tb]=unhex(tint);
    for(let i=0;i<d.length;i+=4){d[i]=d[i]*tr/255;d[i+1]=d[i+1]*tg/255;d[i+2]=d[i+2]*tb/255;}x.putImageData(im,0,0);};
  const bands=(cols,y0,h)=>{cols.forEach((col,i)=>px(0,y0+i*h,S,h,col));for(let i=1;i<cols.length;i++)for(let x=0;x<S;x+=2){px(x,y0+i*h-1,1,1,cols[i-1]);px(x+1,y0+i*h,1,1,cols[i]);}};

  /* ================= THEATRE LOBBY (indoors) ================= */
  if(id==='theatre'){
    px(0,0,S,S,'#2a070c');
    // velvet banners hanging from the top
    for(let x=4;x<S;x+=26){px(x,40,16,74,'#9a1626');px(x,40,2,74,'#c42235');px(x+14,40,2,74,'#6a0e1a');
      for(let k=0;k<8;k++){px(x+k,114+k,1,1,'#9a1626');px(x+15-k,114+k,1,1,'#9a1626');}px(x+7,114,2,7,'#9a1626');
      for(let y=50;y<110;y+=12)px(x+4,y,8,1,'#b01d2f');}
    // gold cornice
    px(0,118,S,3,'#c99a3a');px(0,118,S,1,'#f2cf6e');px(0,121,S,1,'#6a4a16');px(0,124,S,2,'#a47a2a');
    // back wall with panelling
    px(0,126,S,104,'#4a0b14');for(let x=0;x<S;x+=38){px(x,130,34,92,'#560d18');px(x,130,34,1,'#6e1422');px(x+33,130,1,92,'#3a0810');}
    // pillars
    const pillar=x=>{px(x,126,16,104,'#8e1424');px(x,126,3,104,'#b82034');px(x+13,126,3,104,'#5e0b16');px(x-2,126,20,4,'#c99a3a');px(x-2,222,20,6,'#c99a3a');px(x-2,222,20,1,'#f2cf6e');
      for(let y=134;y<220;y+=10)px(x+3,y,10,1,'#7a1020');};
    pillar(26);pillar(272);pillar(120);pillar(178);
    // wall sconces (lit)
    const sconce=(x,y)=>{px(x,y+6,6,3,'#a47a2a');px(x+1,y,4,6,'#f6d98a');light(x+1,y+1,4,4,'#fff1c2');light(x-1,y-2,8,1,'#ffcf6b');light(x+2,y-3,2,1,'#ffe39a');};
    sconce(9,166);sconce(53,166);sconce(254,166);sconce(299,166);sconce(146,180);sconce(162,180);
    // marquee sign with a film-reel crest and bulbs (bulbs twinkle — drawn live)
    const mx0=74,mx1=240;px(mx0,148,mx1-mx0,22,'#1d0b10');px(mx0,148,mx1-mx0,2,'#f2cf6e');px(mx0,168,mx1-mx0,2,'#f2cf6e');px(mx0,148,2,22,'#f2cf6e');px(mx1-2,148,2,22,'#f2cf6e');
    px(mx0+4,142,mx1-mx0-8,6,'#c99a3a');px(mx0+4,142,mx1-mx0-8,1,'#f2cf6e');px(mx0+4,170,mx1-mx0-8,5,'#c99a3a');
    for(let x=mx0+6;x<mx1-6;x+=6){meta.bulbs.push([x,144]);meta.bulbs.push([x,172]);}
    for(let a=0;a<32;a++){const r=11;const t=a/32*Math.PI*2;px(157+Math.cos(t)*r,130+Math.sin(t)*r*.9,2,2,'#c99a3a');}
    for(let y=-9;y<=9;y++)for(let x=-10;x<=10;x++)if(x*x+y*y*1.2<=90)px(157+x,130+y,1,1,'#e0b54d');
    for(let k=0;k<6;k++){const t=k/6*Math.PI*2;px(156+Math.cos(t)*5,129+Math.sin(t)*5,3,3,'#3a2210');}px(156,129,3,3,'#3a2210');
    for(let k=0;k<14;k++){px(132-k*2,136+k,8,1,'#c99a3a');px(176+k*2,136+k,8,1,'#c99a3a');}             // wings
    meta.texts.push({t:'PREMIERE',x:157,y:159,size:15,col:'#ffd970',stroke:'#3a1a08'});
    // doors
    px(130,178,54,52,'#c99a3a');px(130,178,54,1,'#f2cf6e');px(134,182,22,48,'#9a1626');px(158,182,22,48,'#9a1626');
    px(134,182,22,1,'#c42235');px(158,182,22,1,'#c42235');px(150,196,2,14,'#f2cf6e');px(162,196,2,14,'#f2cf6e');
    for(let y=188;y<226;y+=10){px(137,y,16,1,'#7a1020');px(161,y,16,1,'#7a1020');}
    // posters (generic art in gold frames)
    const poster=(x,kind)=>{px(x,176,28,40,'#c99a3a');px(x,176,28,1,'#f2cf6e');px(x+2,178,24,36,'#000');const X=x+2,Y=178;
      if(kind===0){for(let y=0;y<36;y++)px(X,Y+y,24,1,['#ff7a3a','#e04838','#a52b45','#5e1b46'][Math.min(3,Math.floor(y/9))]);for(let y=-5;y<=5;y++)for(let k=-5;k<=5;k++)if(k*k+y*y<=25)px(X+12+k,Y+12+y,1,1,'#ffd36b');px(X+10,Y+16,4,14,'#1a0d1a');px(X+8,Y+18,8,3,'#1a0d1a');px(X,Y+30,24,6,'#1a0d1a');}
      if(kind===1){px(X,Y,24,36,'#1c1f4a');for(let k=0;k<18;k++)px(X+Math.floor(rnd()*24),Y+Math.floor(rnd()*30),1,1,'#ffffff');for(let y=-7;y<=7;y++)for(let k=-12;k<=12;k++)if(k*k+y*y*3<=150&&y<0)px(X+12+k,Y+34+y,1,1,'#3d6bd6');px(X+14,Y+10,3,9,'#e6e6f0');px(X+14,Y+9,3,1,'#e04848');px(X+13,Y+19,5,2,'#ff9a3a');}
      if(kind===2){px(X,Y,24,36,'#2a0f3a');for(let y=-6;y<=6;y++)for(let k=-6;k<=6;k++)if(k*k+y*y<=36)px(X+12+k,Y+14+y,1,1,'#c86ad8');px(X+2,Y+14,20,1,'#f2cf6e');px(X+4,Y+13,16,1,'#f2cf6e');for(let k=0;k<12;k++)px(X+Math.floor(rnd()*24),Y+Math.floor(rnd()*36),1,1,'#fff');}
      if(kind===3){for(let y=0;y<36;y++)px(X,Y+y,24,1,['#3a1a5a','#5a2a7a','#8a4a9a'][Math.min(2,Math.floor(y/12))]);for(let y=-4;y<=4;y++)for(let k=-4;k<=4;k++)if(k*k+y*y<=16)px(X+12+k,Y+8+y,1,1,'#f0c8f0');
        for(let k=0;k<24;k++){const h=Math.round(6+8*Math.abs(Math.sin(k/3))+(k>9&&k<15?8:0));px(X+k,Y+36-h,1,h,'#1d0d2a');}}};
    poster(62,0);poster(92,1);poster(194,2);poster(224,3);
    // floor: reflective tiles in perspective. The carpet's edges run to a vanishing point at (157, 198.5),
    // so the tile grid uses the same point: tile seams line up exactly with the carpet edges (3 tiles each side).
    const vx=157,vy=198.5,camH=S-vy,TW=29,F=120;      // TW = tile width at the front edge, F = focal length
    for(let y=229;y<S;y++){const sc=(y-vy)/camH,Z=F/sc,row=Math.floor((Z-F)/TW);
      for(let c=-45;c<45;c++){const xa=vx+c*TW*sc,xb=vx+(c+1)*TW*sc;if(xb<0||xa>S)continue;px(xa,y,xb-xa+1,1,(c+row)%2?'#43111a':'#27080d');}}
    px(0,226,S,3,'#1a0508');
    for(const sx of [12,56,149,165,257,302]){for(let y=230;y<296;y++){const a=(1-(y-230)/66)*.22;if(a>0&&(y%3))px(sx-1,y,4,1,`rgba(255,200,120,${a})`);}}  // soft light reflections on the tiles
    for(let y=229;y<S;y++){const sc=(y-vy)/camH,a=vx-3*TW*sc,b=vx+3*TW*sc;px(a,y,b-a,1,'#a8142a');px(a,y,2,1,'#e0303f');px(b-2,y,2,1,'#e0303f');
      if(y%6===0)for(let x=a+6;x<b-6;x+=10)px(x,y,2,1,'#c42235');}
    // velvet ropes on gold posts + potted palms
    const post=x=>{px(x,206,3,22,'#c99a3a');px(x,206,3,1,'#f2cf6e');px(x-1,204,5,3,'#e0b54d');px(x-2,226,7,3,'#a47a2a');};
    const rope=(x0,x1)=>{for(let x=x0;x<=x1;x++){const t=(x-x0)/(x1-x0);px(x,210+Math.round(Math.sin(t*Math.PI)*6),1,2,'#c42235');}};
    [[30,62],[62,94],[94,122]].forEach(([a,b])=>{post(a);post(b);rope(a+2,b);});
    [[190,220],[220,252],[252,284]].forEach(([a,b])=>{post(a);post(b);rope(a+2,b);});
    const palm=x=>{px(x,214,14,14,'#5a2a4a');px(x,214,14,2,'#c99a3a');for(let k=0;k<7;k++){const a=-Math.PI*.9+k*Math.PI*.13;for(let r=2;r<14;r++)px(x+7+Math.cos(a)*r,212+Math.sin(a)*r*.7,1,1,k%2?'#4f9a4a':'#3f8a3e');}};
    palm(4);palm(296);
  }

  /* ================= GRAVEYARD ================= */
  if(id==='graveyard'){
    const sky=weather==='sunny'?['#141230','#1c1940','#25204e','#2f285c','#3a3168','#453b72']:weather==='rain'?['#232633','#2a2e3d','#323747','#3a4051','#42495b','#4a5264']:['#14151e','#191b26','#1f222e','#252936','#2b303f','#323748'];
    bands(sky,0,28);px(0,168,S,40,sky[5]);
    if(weather==='sunny'){for(let k=0;k<70;k++){const x=Math.floor(rnd()*S),y=Math.floor(rnd()*140);light(x,y,1,1,R(['#ffffff','#d8d4ff','#fff3c4']));}
      for(let y=-15;y<=15;y++)for(let x=-15;x<=15;x++){const r=Math.hypot(x,y);if(r<=15)light(236+x,92+y,1,1,r<13?((x+4)*(x+4)+(y-3)*(y-3)<20||(x-6)*(x-6)+(y+5)*(y+5)<10?'#d8d2b0':'#f4eecf'):'#c9c2a0');}}
    else for(let k=0;k<9;k++){const x=Math.floor(rnd()*S),y=40+Math.floor(rnd()*80),w=30+Math.floor(rnd()*50);px(x,y,w,6,W.cloud[1]);px(x+6,y-4,w-12,5,W.cloud[0]);}
    px(0,176,S,56,'#1c2224');for(let x=0;x<S;x++){const h=Math.round(160+6*Math.sin(x/19)+4*Math.sin(x/7));px(x,h,1,60,'#1c2224');}
    // dead trees
    const tree=(tx,base,h)=>{px(tx,base-h,3,h,'#121618');const branch=(x,y,dx,len)=>{for(let k=0;k<len;k++){px(x,y,1,1,'#121618');x+=dx;y-=k%2;if(len>6&&k===Math.floor(len/2))branch(x,y,-dx,Math.floor(len/2));}};
      for(let k=0;k<5;k++)branch(tx+1,base-h+6+k*6,k%2?1:-1,10+Math.floor(rnd()*10));};
    tree(20,206,70);tree(286,206,62);tree(196,200,40);
    // mausoleum
    const mx=40;px(mx,160,70,62,'#6a6a72');px(mx,160,70,2,'#8a8a94');px(mx-4,154,78,6,'#7a7a84');for(let k=0;k<18;k++)px(mx+35-k*2,136+k,k*4+1,1,'#7a7a84');
    px(mx+3,158,72,2,'#55555c');for(let x=mx+6;x<mx+66;x+=14){px(x,162,6,58,'#7e7e88');px(x,162,1,58,'#9a9aa4');}
    px(mx+26,178,18,44,'#22232a');for(let y=180;y<222;y+=4)px(mx+26,y,18,1,'#33343c');px(mx+34,170,2,6,'#55555c');px(mx+31,172,8,2,'#55555c');
    for(let k=0;k<40;k++)px(mx+Math.floor(rnd()*70),160+Math.floor(rnd()*60),1+Math.floor(rnd()*2),1,'#4f6b3a');
    // iron fence with a gate
    px(0,196,S,2,'#141418');px(0,214,S,2,'#141418');
    for(let x=0;x<S;x+=6){if(x>140&&x<174)continue;px(x,188,2,40,'#141418');px(x,186,2,2,'#25252d');px(x+1,185,1,1,'#25252d');}
    for(let x=142;x<174;x+=4){px(x,180+Math.abs(x-157)/4,2,48-Math.abs(x-157)/4,'#141418');}px(141,178,34,2,'#141418');
    // headstones
    // headstones; P = which canvas to paint on, s = size (front-row stones are drawn bigger, being closer)
    const stone=(P,x,y,kind,tilt,s=1)=>{const col='#8a8a92',sh='#6a6a72',hi='#a8a8b2',q=(a,b,w,h,c)=>P(x+a*s,y+b*s,w*s,h*s,c);
      if(kind===0){for(let k=0;k<4;k++)q(2-k+tilt,-12+k,8+k*2,1,col);q(-1+tilt,-8,14,10,col);q(-1+tilt,-8,1,10,hi);q(12+tilt,-8,1,10,sh);q(3+tilt,-5,6,1,sh);q(3+tilt,-2,6,1,sh);}
      else if(kind===1){q(4,-16,4,18,col);q(0,-12,12,4,col);q(4,-16,1,18,hi);}
      else{q(0,-10,12,12,col);q(0,-10,12,1,hi);q(2,-6,8,1,sh);}
      q(-2,1,16,2,'#3a3f2a');for(let k=0;k<3;k++)q(Math.floor(rnd()*12),-Math.floor(rnd()*9),2,1,'#5f7a48');};
    for(let x=10;x<S-10;x+=30+Math.floor(rnd()*14))stone(px,x,226,Math.floor(rnd()*3),0);
    // the front row lives on its own layer that is drawn OVER the pets
    const fr=document.createElement('canvas');fr.width=S;fr.height=S;const fg2=fr.getContext('2d');
    const fpx=(x,y,w,h,col)=>{fg2.fillStyle=col;fg2.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    [[4,0,-1],[54,1,0],[96,2,1],[206,0,1],[250,2,0],[292,1,-1]].forEach(([x,k,t])=>stone(fpx,x,318,k,t,1.6));
    for(let x=0;x<S;x+=2)if(rnd()<.5)fpx(x,310+Math.floor(rnd()*4),1,4,rnd()<.5?'#2c3622':'#3b4a2c');                 // tall grass tufts in front
    meta.front=fr;
    // glowing lanterns + jack-o'-lanterns
    for(const lx of [126,188]){px(lx,186,2,42,'#141418');px(lx-3,180,8,7,'#25252d');light(lx-2,181,6,5,'#ffb347');light(lx-1,182,4,3,'#ffe39a');}
    const jack=(x,y)=>{px(x,y,10,8,'#d9661f');px(x,y,10,1,'#f08a3a');px(x+4,y-2,2,2,'#3f6b2a');light(x+2,y+2,2,2,'#ffe066');light(x+6,y+2,2,2,'#ffe066');light(x+2,y+5,6,1,'#ffe066');};
    jack(104,220);jack(214,222);jack(282,221);
    // crows on the fence
    for(const cx of [60,232,270]){px(cx,182,5,3,'#0b0b0f');px(cx+4,181,2,2,'#0b0b0f');px(cx+6,182,1,1,'#3a3a1a');px(cx+1,185,1,1,'#0b0b0f');}
    // ground: dead grass with a dirt path
    for(let y=229;y<S;y++)px(0,y,S,1,(y>>2)%2?'#3b4a2c':'#36442a');px(0,226,S,4,'#2c3622');
    for(let y=229;y<S;y++){const t=(y-229)/(S-229);const c0=150-t*40,c1=164+t*40;px(c0,y,c1-c0,1,'#5a4a35');if(y%3===0)px(c0+2+Math.floor(rnd()*(c1-c0-4)),y,2,1,'#6a5840');}
    for(let k=0;k<260;k++)px(Math.floor(rnd()*S),229+Math.floor(rnd()*85),1,2,R(['#4a5a34','#2c3622','#556a3a']));
    for(let k=0;k<50;k++)px(Math.floor(rnd()*S),229+Math.floor(rnd()*85),2,1,R(['#8a4a1f','#a65a24','#6a3a1a']));       // fallen leaves
    // low fog drifting at the back edge
    for(let y=214;y<240;y++)for(let x=(y%2);x<S;x+=2)if(rnd()<.35*(1-Math.abs(y-226)/14))px(x,y,1,1,'rgba(200,205,230,.35)');
    meta.skyBottom=160;
  }

  /* ================= CAT PARK IN THE CITY ================= */
  if(id==='catpark'){
    bands(W.sky,0,34);px(0,170,S,40,W.sky[4]);
    if(W.sun)for(let y=-11;y<=11;y++)for(let x=-11;x<=11;x++){const r=Math.hypot(x,y);if(r<=11)px(262+x,78+y,1,1,r<7?'#fff6b0':r<9.5?'#ffe066':'#ffcf3f');}
    const cloud=(cx,cy,s)=>{[[0,4,6*s,3*s],[2*s,1,5*s,4*s],[5*s,2,6*s,4*s],[9*s,4,5*s,3*s]].forEach(([x,y,w,h])=>px(cx+x,cy+y,w,h,W.cloud[0]));px(cx+1,cy+4+3*s-1,13*s,1,W.cloud[1]);};
    for(let x=4;x<S;x+=W.sun?90:40)cloud(x+Math.floor(rnd()*20),64+Math.floor(rnd()*30),W.sun?2:3);
    // skyline (same family as the Riverside race map)
    const skyline=(layer)=>{const base=190,col=layer?'#6a82a6':'#93a8c6',edge=layer?'#88a0c2':'#a9bbd4';
      for(let x=layer?0:-6;x<S;){const w=10+Math.floor(rnd()*20),top=layer?120+Math.floor(rnd()*40):96+Math.floor(rnd()*44);px(x,top,w,base-top,col);px(x,top,1,base-top,edge);
        if(rnd()<.2&&w>11)for(let k=0;k<5;k++)px(x+Math.floor(w/2)-k,top-5+k,k*2+1,1,col);
        for(let wy=top+3;wy<base-3;wy+=4)for(let wx=x+2;wx<x+w-1;wx+=3){if(dark){if(rnd()<.35)light(wx,wy,1,2,R(['#ffe39a','#ffd36b']));else px(wx,wy,1,2,layer?'#4f6585':'#7b90b0');}else if(rnd()<.4)px(wx,wy,1,2,layer?'#c4d6ee':'#b9cae0');}
        x+=w+(layer?Math.floor(rnd()*3):Math.floor(rnd()*6));}};
    skyline(0);skyline(1);
    splitLayer();
    px(0,188,S,42,'#4f9e46');for(let x=0;x<S;x+=3)px(x,188,2,1,'#5fae55');            // lawn behind the fence
    // trees behind the fence
    for(let tx=-6;tx<S;tx+=36+Math.floor(rnd()*14)){px(tx+9,176,3,24,'#6b4a2a');for(let y=0;y<26;y++){const w=Math.round(26*Math.sin(Math.PI*(y+1)/27));px(tx+10-w/2,152+y,w,1,y%5===0?'#5aa84e':'#4a9443');}
      for(let k=0;k<10;k++)px(tx+Math.floor(rnd()*20),154+Math.floor(rnd()*20),2,1,'#7cc46a');}
    // park fence + gate with sign (text drawn live)
    px(0,200,S,3,'#2f6b3a');px(0,214,S,3,'#2f6b3a');for(let x=0;x<S;x+=8)px(x,196,3,32,'#3f7f4a'),px(x,196,3,1,'#5fa56a');
    for(let y=203;y<214;y+=2)for(let x=(y%4?0:1);x<S;x+=3)px(x,y,1,1,'rgba(160,190,170,.6)');                        // chain-link
    px(126,170,62,20,'#2f6b3a');px(128,172,58,16,'#f4f1ea');px(128,172,58,1,'#ffffff');px(132,190,3,38,'#3f7f4a');px(179,190,3,38,'#3f7f4a');
    meta.texts.push({t:'CAT PARK',x:157,y:180.5,size:10.5,col:'#2f6b3a',stroke:null});
    // props along the back edge
    px(20,212,30,3,'#8a5a32');px(20,218,30,2,'#7a4a28');px(22,220,2,8,'#3a3236');px(46,220,2,8,'#3a3236');                    // bench
    px(270,212,30,3,'#8a5a32');px(270,218,30,2,'#7a4a28');px(272,220,2,8,'#3a3236');px(296,220,2,8,'#3a3236');
    px(70,214,8,14,'#d93a3a');px(69,212,10,3,'#b82a2a');px(67,218,14,3,'#d93a3a');px(73,211,2,2,'#b82a2a');                      // hydrant
    for(const hx of [204,238]){for(let y=206;y<228;y+=4){px(hx,y,2,2,'#e04848');px(hx,y+2,2,2,'#f4f1ea');}}px(204,214,36,2,'#ffcf3f');    // agility hurdle
    for(let k=0;k<20;k++){const a=Math.PI+k/19*Math.PI;px(100+Math.cos(a)*14+14,228+Math.sin(a)*16,4,3,k%4<2?'#3d7ee0':'#f2c230');}       // tunnel
    px(250,196,2,32,'#2f3440');px(246,194,10,3,'#2f3440');if(dark){light(247,197,8,2,'#ffe39a');}else px(247,197,8,2,'#f4f1ea');           // lamp
    px(58,206,7,10,'#3f7f4a');px(59,207,5,3,'#a6d6a0');                                                                       // bag station
    // grass with mowing stripes, a dirt patch and some toys
    // mowing stripes in perspective: same vanishing point as the theatre floor, so they fan out toward you
    {const vx=157,vy=198.5,camH=S-vy,TW=26;
     for(let y=229;y<S;y++){const sc=(y-vy)/camH;for(let c=-45;c<45;c++){const xa=vx+c*TW*sc,xb=vx+(c+1)*TW*sc;if(xb<0||xa>S)continue;px(xa,y,xb-xa+1,1,c%2?'#6fb85a':'#64ad50');}}}
    px(0,226,S,4,'#4f9e46');
    for(let k=0;k<5;k++){const cx=40+Math.floor(rnd()*230),cy=245+Math.floor(rnd()*55),w=18+Math.floor(rnd()*24);for(let y=-3;y<=3;y++)px(cx-w/2+Math.abs(y)*2,cy+y,w-Math.abs(y)*4,1,'#9c7a4a');}
    for(let k=0;k<160;k++)px(Math.floor(rnd()*S),229+Math.floor(rnd()*85),1,2,R(['#7cc46a','#57a046']));
    for(let k=0;k<14;k++)px(Math.floor(rnd()*S),231+Math.floor(rnd()*80),2,2,R(['#ffe066','#ffffff','#ff8fb1']));
    // cat toys: a yarn ball with a trailing thread, a fish skeleton and a cardboard box
    px(86,260,6,6,'#e0508a');px(87,259,4,8,'#e0508a');px(85,261,8,4,'#e0508a');px(87,261,4,1,'#ff8fb8');px(88,263,3,1,'#b83a6a');
    for(let k=0;k<16;k++)px(93+k,265+Math.round(Math.sin(k/2)*1.5),1,1,'#e0508a');
    px(222,284,12,1,'#f4f1ea');for(let k=0;k<4;k++){px(224+k*2,282,1,5,'#f4f1ea');}px(219,282,3,5,'#f4f1ea');px(234,282,3,1,'#f4f1ea');px(234,286,3,1,'#f4f1ea');px(235,283,2,3,'#f4f1ea');
    px(258,240,22,14,'#b8864a');px(258,240,22,2,'#d4a868');px(256,238,8,3,'#c4945a');px(274,238,8,3,'#c4945a');px(266,246,6,1,'#8a5f32');
    meta.skyBottom=170;
  }

  /* ================= SCHOOL (campus entrance) ================= */
  if(id==='school'){
    bands(W.sky,0,34);px(0,170,S,50,W.sky[4]);
    const cloud=(cx,cy,s)=>{[[0,4,6*s,3*s],[2*s,1,5*s,4*s],[5*s,2,6*s,4*s],[9*s,4,5*s,3*s]].forEach(([x,y,w,h])=>px(cx+x,cy+y,w,h,W.cloud[0]));px(cx+1,cy+4+3*s-1,13*s,1,W.cloud[1]);};
    for(let x=0;x<S;x+=W.sun?80:45)cloud(x+Math.floor(rnd()*20),62+Math.floor(rnd()*26),W.sun?2:3);
    // birch leaves peeking in at the top right
    for(let k=0;k<60;k++){const x=280+Math.floor(rnd()*34),y=60+Math.floor(rnd()*26);px(x,y,3,2,rnd()<.5?'#3f8a3e':'#5aa84e');}
    const BR='#d9c88a',BJ='#c2b072',BH='#e8dba6',GL='#3e5468',GH='#7f9ab0',FR='#c9c4b0';
    const brick=(x0,y0,w,h)=>{px(x0,y0,w,h,BR);for(let y=y0+2;y<y0+h;y+=3){px(x0,y,w,1,BJ);for(let x=x0+((y/3|0)%2?0:3);x<x0+w;x+=6)px(x,y-2,1,2,BJ);}};
    const win=(x,y,w,h)=>{px(x-1,y-1,w+2,h+2,FR);px(x,y,w,h,GL);for(let k=0;k<w;k+=4)px(x+k,y,1,h,'#2f4152');px(x,y,w,1,GH);};
    // left block with a round window and a tall glass column
    brick(0,140,104,76);px(0,136,104,4,'#e3dcc4');px(0,135,104,1,'#f2ecd6');
    for(let x=6;x<70;x+=16)win(x,166,12,8);
    for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const r=x*x+y*y;if(r<=36)px(52+x,150+y,1,1,r>=25?FR:r<9?'#9ab4c6':'#5f7a90');}
    px(76,146,18,66,'#6f8a9a');for(let y=146;y<212;y+=4)px(76,y,18,1,'#4f6a7a');for(let x=76;x<94;x+=4)px(x,146,1,66,'#4f6a7a');px(76,146,2,66,'#a8c0cc');
    // round tower behind with a band of windows, and the sloped glass roof
    for(let y=0;y<26;y++){const w=86-Math.max(0,6-y)*3;px(157-w/2,122+y,w,1,y<4?'#e8dba6':BR);if(y>2&&y%3===2)px(157-w/2,122+y,w,1,BJ);}
    for(let x=122;x<190;x+=10)win(x,130,6,6);
    for(let y=0;y<10;y++)px(110,146+y,92,1,y%3?'#9fd0cc':'#c4e6e2');                     // glass roof band with straight sides
    px(110,146,1,10,'#dff2ef');px(201,146,1,10,'#7fb0ac');
    // centre block + recessed entrance under the right block
    brick(104,156,110,60);for(let x=112;x<160;x+=14)win(x,168,9,16);
    px(176,186,58,30,'#4a4a48');px(178,190,24,26,'#2c3a40');for(let x=178;x<202;x+=6)px(x,190,1,26,'#506470');px(178,190,24,1,'#8aa4b0');
    px(206,190,24,26,'#3a4448');
    // right block on stilts
    brick(208,112,106,74);px(208,108,106,4,'#e3dcc4');px(208,107,106,1,'#f2ecd6');px(208,184,106,3,'#e3dcc4');
    win(234,124,14,34);win(296,124,14,34);for(let x=258;x<288;x+=12)win(x,130,7,10);
    for(const x of [212,256,300])px(x,187,7,29,'#d9d3bc'),px(x,187,2,29,'#ece6d0');
    // flagpoles with long white banners
    [[112,0],[120,1],[129,0],[138,1]].forEach(([x,v])=>{px(x,58,2,158,'#e6e6ea');px(x,58,2,1,'#ffffff');px(x+2,60,7,v?40:46,'#f4f4f6');px(x+2,60,1,v?40:46,'#d4d4da');
      for(let y=66;y<(v?96:102);y+=5)px(x+4,y,3,2,'#9a9aa6');px(x+3,v?100:106,5,1,'#d4d4da');});
    // spruce on the left
    for(let i=0;i<9;i++){const y=144+i*8,w=10+i*5;for(let k=0;k<8;k++)px(46-w/2+k*.3,y+k,w-k*.6,1,k%3?'#2f5a34':'#3d6e40');}px(45,212,4,6,'#5a3a24');
    // low concrete wall by the path, bushes, sign (generic campus sign)
    px(140,198,40,18,'#a8a49a');px(140,198,40,2,'#c8c4ba');px(178,198,2,18,'#8a867c');
    for(let k=0;k<26;k++){const x=262+Math.floor(rnd()*50),y=198+Math.floor(rnd()*26);px(x,y,5,4,rnd()<.5?'#3f7a3a':'#4f8f44');}
    for(let k=0;k<8;k++)px(266+Math.floor(rnd()*40),196+Math.floor(rnd()*10),2,2,'#d977a8');
    px(4,192,36,22,'#f4f2ee');px(4,192,36,1,'#ffffff');px(4,213,36,1,'#c8c4ba');px(38,212,2,14,'#3a3a3a');
    for(let k=0;k<10;k++)px(8+k,198-Math.round(Math.sin(k/9*Math.PI)*4),1,2,'#e07a2a');for(let y=204;y<212;y+=3)px(8,y,26,1,'#9a9aa6');
    // lawn + cobblestone path running to the entrance (same perspective as the other rooms)
    px(0,214,S,S-214,'#5aa84e');for(let k=0;k<300;k++)px(Math.floor(rnd()*S),216+Math.floor(rnd()*98),1,2,rnd()<.5?'#6dbb5c':'#4f9a44');
    const vx=196,vy=198.5,camH=S-vy;
    let prev=null;
    for(let y=214;y<S;y++){const sc=(y-vy)/camH,a=vx-118*sc,b=vx+92*sc,row=Math.floor(140/sc/6);px(a,y,b-a,1,'#9a968c');
      if(prev!==null&&row!==prev)px(a,y,b-a,1,'#7a766c');prev=row;                                                    // rows of cobbles
      for(let c=-20;c<16;c++){const xs=vx+(c*12+(row%2)*6)*sc;if(xs>a&&xs<b)px(xs,y,1,1,'#7a766c');}                   // staggered joints
      px(a-1,y,1,1,'#6a665e');px(b,y,1,1,'#6a665e');}
    for(let k=0;k<220;k++){const y=216+Math.floor(rnd()*96),sc=(y-vy)/camH,x=vx-118*sc+rnd()*(210*sc);px(x,y,1,1,rnd()<.5?'#aca89e':'#86827a');}
    meta.skyBottom=150;
  }

  /* ================= CAFETERIA (indoors) ================= */
  if(id==='cafeteria'){
    const vx=157,vy=198.5,camH=S-vy;
    // ceiling with rows of rectangular lights (in perspective toward the back)
    px(0,0,S,84,'#e4e4e0');for(let y=0;y<84;y+=12)px(0,y,S,1,'#d6d6d2');
    for(let r=0;r<4;r++){const y=8+r*18,sc=1-r*.18;for(let c=-3;c<=3;c++){const w=22*sc,x=vx+c*46*sc-w/2;px(x,y,w,4*sc+2,'#ffffff');px(x,y+4*sc+2,w,1,'#c8c8c4');light(x+1,y+1,w-2,1,'#ffffff');}}
    // upper floor: white balcony slab and dark glass behind it
    px(0,84,S,14,'#3a3e42');for(let x=0;x<S;x+=12)px(x,84,1,14,'#55595e');px(0,84,S,1,'#6a7076');
    px(0,98,S,12,'#f4f4f0');px(0,98,S,1,'#ffffff');px(0,109,S,2,'#c8c8c4');
    // back wall: big windows with green outside
    px(0,111,S,103,'#d8dcdc');
    for(let x=4;x<S;x+=36){px(x,116,32,84,'#a8bcc4');for(let k=0;k<24;k++){const gx=x+Math.floor(rnd()*30),gy=150+Math.floor(rnd()*48);px(gx,gy,4,3,rnd()<.5?'#6f9a5a':'#86ae6a');}
      px(x,116,32,1,'#dfe8ec');px(x+15,116,2,84,'#eef0f0');px(x,156,32,2,'#eef0f0');px(x,200,32,2,'#bfc4c4');}
    px(0,200,S,28,'#c4c8c8');px(0,200,S,1,'#d8dcdc');
    // concrete columns
    for(const x of [58,150,246])px(x,84,14,146,'#c9c9c4'),px(x,84,3,146,'#deded9'),px(x+11,84,3,146,'#aeaea8');
    // staircase on the left
    for(let i=0;i<16;i++){const y=226-i*8,x=0;px(x,y,44-i*2,3,'#e0e0dc');px(x,y+3,44-i*2,5,'#b4b4ae');}
    // solid concrete safety rail running down the open side of the stairs
    for(let x=-8;x<=54;x++){const ys=226-4*(44-x)+4,t=Math.max(84,ys-34),b=Math.min(229,ys);if(b<=t)continue;   // a chunky parapet, ~8 px thick
      px(x,t,1,b-t,'#c4c4be');px(x,t,1,3,'#e4e4de');px(x,t+3,1,1,'#b0b0aa');if(b-t>5)px(x,b-3,1,3,'#a6a6a0');}
    for(let y=100;y<229;y+=14){const x=44-(226-y)/4;px(x-3,y-20,1,10,'#b4b4ae');}                                // board marks in the concrete
    px(46,200,10,29,'#bcbcb6');px(46,200,10,3,'#e4e4de');px(55,200,1,29,'#9a9a94');px(46,226,10,3,'#a6a6a0');  // end post at the bottom
    // tables with red chairs along the back wall
    // red chair seen from the side-front: backrest (face>0 = back is behind the seat), seat, two legs
    // chairs alternate red and orange; [back, back highlight, seat, seat highlight]
    const CH=[['#b82632','#e04a55','#d8323e','#ee5a64'],['#cf6a1e','#f59a4a','#e8792a','#ffa45a']];let chairN=0;
    const chair=(P,x,y,s=1,face=1)=>{const q=(a,b,w,h,c)=>P(x+a*s,y+b*s,w*s,h*s,c);const C=CH[chairN++%2];
      if(face>0){q(1,-8,4,5,C[0]);q(1,-8,4,1,C[1]);q(0,-4,1,2,'#3a3a3a');q(5,-4,1,2,'#3a3a3a');}
      q(0,-3,6,2,C[2]);q(0,-3,6,1,C[3]);q(0,-1,1,4,'#3a3a3a');q(5,-1,1,4,'#3a3a3a');
      if(face<0){q(1,-8,4,5,C[0]);q(1,-8,4,1,C[3]);q(0,-4,1,2,'#3a3a3a');q(5,-4,1,2,'#3a3a3a');}};
    const table=(P,x,y,w,s=1)=>{const q=(a,b,ww,h,c)=>P(x+a*s,y+b*s,ww*s,h*s,c);q(0,-6,w,2,'#f2f2ee');q(0,-6,w,1,'#ffffff');q(0,-4,w,1,'#c8c8c4');q(2,-3,1,6,'#5a5a5a');q(w-3,-3,1,6,'#5a5a5a');};
    for(let x=74;x<S;x+=58){for(let k=0;k<3;k++)chair(px,x+3+k*11,219,1,1);table(px,x,224,36);for(let k=0;k<3;k++)chair(px,x+3+k*11,231,1,-1);}
    // polished floor tiles with soft reflections of the windows and lights
    for(let y=226;y<S;y++){const sc=(y-vy)/camH,Z=120/sc,row=Math.floor((Z-120)/26);
      for(let c=-45;c<45;c++){const xa=vx+c*26*sc,xb=vx+(c+1)*26*sc;if(xb<0||xa>S)continue;px(xa,y,xb-xa+1,1,(c+row)%2?'#bdbdb8':'#b2b2ad');}}
    for(let x=4;x<S;x+=36)for(let y=232;y<290;y++){const a=(1-(y-232)/58)*.25;if(a>0&&y%2)px(x+4,y,24,1,`rgba(235,245,250,${a})`);}
    // front row of chairs and a table edge on the top layer (pets walk behind them)
    const fr=document.createElement('canvas');fr.width=S;fr.height=S;const f2=fr.getContext('2d');const fpx=(x,y,w,h,col)=>{f2.fillStyle=col;f2.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    table(fpx,-6,306,40,1.8);chair(fpx,6,314,1.8,-1);chair(fpx,34,314,1.8,-1);
    table(fpx,236,306,48,1.8);chair(fpx,248,314,1.8,-1);chair(fpx,278,314,1.8,-1);
    meta.front=fr;
  }

  /* ================= CHRISTMAS (snowy town square at night) ================= */
  if(id==='christmas'){
    const snowy=weather==='snow';
    const sky=snowy?['#3a4560','#435070','#4c5a7a','#566484','#606e8e','#6a7898']:['#0e1430','#141c3e','#1b244c','#232d5a','#2c3768','#364276'];
    bands(sky,0,30);px(0,180,S,40,sky[5]);
    if(!snowy){for(let k=0;k<80;k++)light(Math.floor(rnd()*S),Math.floor(rnd()*150),1,1,R(['#ffffff','#dfe6ff','#fff3c4']));
      for(let x=0;x<S;x++){const y=Math.round(78+10*Math.sin(x/37)+5*Math.sin(x/13));for(let k=0;k<6;k++)if((x+k)%2===0)px(x,y+k,1,1,k<3?'rgba(110,240,170,.35)':'rgba(90,200,220,.25)');}  // faint aurora
      for(let y=-12;y<=12;y++)for(let x=-12;x<=12;x++){const r=x*x+y*y;if(r<=144)light(48+x,86+y,1,1,(x+4)*(x+4)+(y-3)*(y-3)<18?'#d8d6c4':'#f6f2dc');}}
    else for(let k=0;k<10;k++){const x=Math.floor(rnd()*S),y=60+Math.floor(rnd()*70),w=40+Math.floor(rnd()*50);px(x,y,w,7,'#7a86a2');px(x+6,y-4,w-12,5,'#8a96b0');}
    // snowy hills and snow-capped pines
    for(let x=0;x<S;x++){const h=Math.round(170+7*Math.sin(x/23)+4*Math.sin(x/9));px(x,h,1,70,'#dfe8f4');px(x,h,1,1,'#ffffff');}
    const pine=(x,base,h)=>{for(let i=0;i<h;i++){const w=Math.max(1,Math.round((i/h)*h*.55));px(x-w/2,base-h+i,w,1,i%4===0?'#2f6a4a':'#245a3e');if(i%6===1)px(x-w/2,base-h+i,w,1,'#eef4fb');}px(x-1,base,3,4,'#5a3a24');};
    for(let x=4;x<S;x+=18+Math.floor(rnd()*14))pine(x,186+Math.floor(rnd()*8),16+Math.floor(rnd()*16));
    // cosy cabins with lit windows, snowy roofs and chimney smoke
    const cabin=(x,y,w)=>{px(x,y,w,30,'#7a4a2c');for(let k=y+3;k<y+30;k+=4)px(x,k,w,1,'#5e3820');
      for(let k=0;k<12;k++)px(x-4+k,y-k,w+8-k*2,1,'#5e3820');for(let k=0;k<12;k++)px(x-4+k,y-k-1,w+8-k*2,1,'#f4f8fc');
      px(x+w-10,y-18,5,10,'#6a5a5a');px(x+w-11,y-19,7,2,'#f4f8fc');
      for(let k=0;k<4;k++)px(x+w-9+k,y-24-k*4,3,3,'rgba(220,225,235,.5)');
      light(x+5,y+8,8,8,'#ffcf6b');light(x+w-13,y+8,8,8,'#ffcf6b');px(x+8,y+8,2,8,'#5e3820');px(x+5,y+11,8,2,'#5e3820');px(x+w-10,y+8,2,8,'#5e3820');px(x+w-13,y+11,8,2,'#5e3820');
      px(x+w/2-4,y+14,8,16,'#4a2a18');light(x+w/2+2,y+21,1,1,'#ffd36b');
      for(let k=0;k<w+6;k+=3)px(x-3+k,y+30,3,2,'#f4f8fc');};
    cabin(14,192,46);cabin(252,190,48);
    // the big tree: layered branches, a glowing star, garlands and twinkling baubles (drawn live)
    const tx=157,tb=222,th=104;
    for(let i=0;i<th;i++){const y=tb-th+i,tier=(i%26)/26,base=(i/th)*44+10;const w=Math.round(base*(.55+tier*.45));
      px(tx-w/2,y,w,1,i%26<3?'#2f7a4e':'#1f6a40');if(i%26===25)px(tx-w/2-1,y,w+2,1,'#eef4fb');}
    px(tx-4,tb,8,8,'#5a3a24');
    for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++)if(Math.abs(x)+Math.abs(y)<=6&&(Math.abs(x)<=1||Math.abs(y)<=1||Math.abs(x)+Math.abs(y)<=3))light(tx+x,tb-th-4+y,1,1,Math.abs(x)+Math.abs(y)<=2?'#fff6c0':'#ffd33f');
    for(let g2=0;g2<5;g2++){const y0=tb-th+18+g2*18;for(let k=-1;k<=1;k+=.04){const yy=y0+Math.round(k*k*6+k*4);const w=((yy-(tb-th))/th)*44+10;px(tx+k*w*.45,yy,1,1,'#e0b54d');}}
    meta.twinkle=[];for(let k=0;k<44;k++){const y=tb-th+10+Math.floor(rnd()*(th-14)),w=((y-(tb-th))/th)*44+8;meta.twinkle.push([Math.round(tx-w*.45+rnd()*w*.9),y,R(['#ff3b3b','#ffd33f','#4ab0ff','#ff7ad9','#7dff8a'])]);}
    // presents, snowman, candy-cane lamps
    const gift=(x,y,w,h,c,rb)=>{px(x,y-h,w,h,c);px(x+Math.floor(w/2)-1,y-h,2,h,rb);px(x,y-h+Math.floor(h/2)-1,w,2,rb);px(x+w/2-3,y-h-2,3,2,rb);px(x+w/2,y-h-2,3,2,rb);px(x,y-h,w,1,'rgba(255,255,255,.35)');};
    gift(128,228,12,10,'#d93a3a','#ffd33f');gift(142,228,10,8,'#3d7ee0','#f4f1ea');gift(164,228,12,9,'#47b36b','#e04848');gift(178,228,9,12,'#a55ee0','#ffd33f');
    const snowman=(x,y)=>{for(const [r,cy] of [[9,y-8],[7,y-21],[5,y-31]])for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++)if(xx*xx+yy*yy<=r*r)px(x+xx,cy+yy,1,1,xx<-r*.4?'#ffffff':'#e8eef6');
      px(x-6,y-38,12,2,'#1b1b22');px(x-4,y-44,8,6,'#1b1b22');px(x-4,y-40,8,1,'#d93a3a');px(x-2,y-33,1,1,'#1b1b22');px(x+2,y-33,1,1,'#1b1b22');px(x,y-31,4,1,'#ff8a2a');
      px(x-5,y-26,10,2,'#d93a3a');px(x+3,y-26,2,6,'#d93a3a');for(const yy of [y-22,y-19,y-16])px(x,yy,1,1,'#1b1b22');for(let k=0;k<7;k++){px(x-7-k,y-22-Math.floor(k/2),1,1,'#5a3a24');px(x+7+k,y-22-Math.floor(k/2),1,1,'#5a3a24');}};
    snowman(84,228);
    const cane=(x)=>{for(let y=190;y<228;y++)px(x,y,3,1,((y>>2)%2)?'#d93a3a':'#f4f1ea');for(let k=0;k<6;k++)px(x+k,188-Math.round(Math.sin(k/5*Math.PI)*4),3,2,k%2?'#d93a3a':'#f4f1ea');light(x+5,190,3,3,'#fff1c2');};
    cane(110);cane(202);
    // string lights between the cabins and the tree (twinkle live)
    meta.strings=[];const strand=(x0,y0,x1,y1)=>{for(let k=0;k<=1;k+=.04){const x=x0+(x1-x0)*k,y=y0+(y1-y0)*k+Math.sin(k*Math.PI)*8;px(x,y,1,1,'#1b2a1f');
      if(Math.round(k*25)%2===0)meta.strings.push([Math.round(x),Math.round(y)+1,R(['#ff3b3b','#ffd33f','#4ab0ff','#7dff8a'])]);}};
    strand(60,174,tx-20,148);strand(tx+20,148,254,172);
    // snowy ground with gentle perspective drifts and sparkle
    const vx=157,vy=198.5,camH=S-vy;
    for(let y=226;y<S;y++){const sc=(y-vy)/camH;for(let c=-45;c<45;c++){const xa=vx+c*30*sc,xb=vx+(c+1)*30*sc;if(xb<0||xa>S)continue;px(xa,y,xb-xa+1,1,c%2?'#eef3fa':'#e4ebf5');}}
    px(0,224,S,3,'#d4dde9');
    for(let k=0;k<180;k++)px(Math.floor(rnd()*S),228+Math.floor(rnd()*86),1,1,R(['#ffffff','#cfdaea','#b9c8de']));
    for(let k=0;k<26;k++){const x=Math.floor(rnd()*S),y=232+Math.floor(rnd()*76);px(x,y,2,1,'#c6d2e4');px(x+3,y+2,2,1,'#c6d2e4');}       // little paw prints
    // front layer: snowy bushes with berries and two more presents (pets walk behind them)
    const fr=document.createElement('canvas');fr.width=S;fr.height=S;const f2=fr.getContext('2d');const fpx=(x,y,w,h,col)=>{f2.fillStyle=col;f2.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    const bush=(x,w)=>{for(let y=0;y<18;y++){const ww=Math.round(w*Math.sin(Math.PI*(y+2)/22));fpx(x-ww/2,298+y,ww,1,y<4?'#f4f8fc':y%3?'#245a3e':'#2f6a4a');}
      for(let k=0;k<6;k++)fpx(x-w/3+Math.floor(rnd()*w*.66),303+Math.floor(rnd()*8),2,2,'#d93a3a');};
    bush(14,44);bush(300,44);
    const fgift=(x,c,rb)=>{fpx(x,300,18,16,c);fpx(x+8,300,3,16,rb);fpx(x,307,18,3,rb);fpx(x+4,296,5,4,rb);fpx(x+10,296,5,4,rb);fpx(x,300,18,1,'rgba(255,255,255,.35)');};
    fgift(52,'#d93a3a','#ffd33f');fgift(246,'#3d7ee0','#f4f1ea');
    meta.front=fr;meta.skyBottom=170;
  }

  // puddles outdoors in bad weather
  if(!ROOMS[id].indoor&&W.puddles)for(let k=0;k<Math.round(W.puddles/3);k++){const x=Math.floor(rnd()*S),y=236+Math.floor(rnd()*70),w=10+Math.floor(rnd()*16);
    px(x,y,w,2,'#3d4a5a');px(x+2,y+2,w-4,1,'#3d4a5a');px(x+3,y,Math.max(1,w-8),1,'#9aa8b8');}
  if(W.tint&&!ROOMS[id].indoor){
    if(top)tintOwn(top,W.tint);                                                   // upper layer: tint only its own pixels
    else{g.globalCompositeOperation='multiply';g.fillStyle=W.tint;g.fillRect(0,0,S,S);g.globalCompositeOperation='source-over';}
    if(meta.front)tintOwn(meta.front,W.tint);}                                    // the front layer too
  for(const [x,y,w,h,col] of lights)px(x,y,w,h,col);
  if(top)c.getContext('2d').drawImage(top,0,0);
  return {canvas:c,meta};
}

/* live layer: twinkling bulbs, signs, rain and lightning — all on the 4× pixel grid */
function roomFx(g,now,dt,layer){
  const K=RMAP.K,M=RM.cur&&RM.cur.meta;if(!M)return;
  if(layer==='back'){
  if(M.twinkle)for(let i=0;i<M.twinkle.length;i++){const [x,y,c]=M.twinkle[i];const on=Math.sin(now/260+i*1.7)>-.2;g.fillStyle=on?c:'#2a4a32';g.fillRect(x*K,y*K,2*K,2*K);
    if(on){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x*K,y*K,K,K);}}
  if(M.strings){const ph=Math.floor(now/400)%3;for(let i=0;i<M.strings.length;i++){const [x,y,c]=M.strings[i];g.fillStyle=(i+ph)%3?c:'#3a3a40';g.fillRect(x*K,y*K,K*1.5,K*1.5);}}
  if(RM.room==='theatre'){const ph=Math.floor(now/320)%2;for(let i=0;i<M.bulbs.length;i++){const [x,y]=M.bulbs[i];g.fillStyle=(i+ph)%2?'#fff3b0':'#c9902a';g.fillRect(x*K,y*K,2*K,2*K);}}
  for(const t of M.texts){g.font=`700 ${t.size*K}px 'Pixelify Sans', monospace`;g.textAlign='center';g.textBaseline='middle';
    if(t.stroke){g.lineWidth=K;g.strokeStyle=t.stroke;g.strokeText(t.t,t.x*K,t.y*K);}g.fillStyle=t.col;g.fillText(t.t,t.x*K,t.y*K);
}
  return;}
  const w=roomWeather();
  // snowfall: soft flakes drifting down and swaying side to side
  const wantF=w==='snow'?190:0;RM.flakes=RM.flakes||[];
  while(RM.flakes.length<wantF)RM.flakes.push({x:Math.random()*RMAP.S,y:40+Math.random()*(RMAP.S-40),v:rnd(.012,.03),ph:Math.random()*6.28,big:Math.random()<.25});
  if(RM.flakes.length>wantF)RM.flakes.length=wantF;
  for(const f of RM.flakes){f.y+=f.v*dt*(f.big?1.2:1);f.ph+=dt*.002;const x=f.x+Math.sin(f.ph)*3;
    if(f.y>RMAP.S){f.y=40+Math.random()*20;f.x=Math.random()*RMAP.S;}
    g.fillStyle=f.big?'rgba(255,255,255,.95)':'rgba(240,246,255,.8)';const sz=f.big?2:1;g.fillRect(Math.round(x)*K,Math.round(f.y)*K,sz*K,sz*K);}
  const want=w==='rain'?140:w==='thunder'?260:0;
  while(RM.drops.length<want)RM.drops.push(rDrop(true));if(RM.drops.length>want)RM.drops.length=want;
  const fall=w==='thunder'?.16:.12,wind=w==='thunder'?.05:.03;                       // map px per ms
  g.fillStyle=w==='thunder'?'rgba(205,215,235,.7)':'rgba(200,214,236,.65)';
  for(const d of RM.drops){d.y+=fall*d.v*dt;d.x-=wind*d.v*dt;
    if(d.y>=d.gy){if(d.gy>229)RM.splashes.push({x:d.x,y:d.gy,t:now});Object.assign(d,rDrop(false));continue;}
    if(d.x<-2)d.x+=RMAP.S+4;for(let i=0;i<d.len;i++)g.fillRect(Math.round(d.x+i*wind/fall)*K,Math.round(d.y-i)*K,K,K);}
  RM.splashes=RM.splashes.filter(s=>now-s.t<170);g.fillStyle='rgba(220,230,245,.8)';
  for(const s of RM.splashes){const t=(now-s.t)/170,sx=Math.round(s.x),sy=Math.round(s.y);const o=t<.5?1:2;g.fillRect((sx-o)*K,(sy-o)*K,K,K);g.fillRect((sx+o)*K,(sy-o)*K,K,K);}
  if(w==='thunder'){if(!RM.nextFlash)RM.nextFlash=now+rnd(2500,6000);
    if(now>=RM.nextFlash){RM.flash={t:now,bolt:rBolt(M.skyBottom||150)};RM.nextFlash=now+rnd(4000,9000);}
    const f=RM.flash;if(f){const t=now-f.t;if(t<260){g.fillStyle='#fffbe6';for(const [x,y] of f.bolt)g.fillRect(x*K,y*K,K,K);}
      const a=t<60?.7:t<120?.1:t<200?.45:t<420?.45*(1-(t-200)/220):0;if(a>0){g.fillStyle=`rgba(235,240,255,${a})`;g.fillRect(0,0,ROOM.W,ROOM.H);}else if(t>420)RM.flash=null;}}
  else{RM.flash=null;RM.nextFlash=0;}
}
function rDrop(any){return {x:Math.random()*(RMAP.S+20),y:any?60+Math.random()*(RMAP.S-60):40+Math.random()*30,len:3+Math.floor(Math.random()*3),v:rnd(.8,1.25),gy:rnd(100,RMAP.S-4)};}
function rBolt(bottom){const pts=[];let x=Math.floor(rnd(40,RMAP.S-40)),y=62;const end=Math.floor(rnd(bottom-30,bottom));
  const bAt=Math.floor(rnd(80,110));let br=null;while(y<end){pts.push([x,y]);y++;if(Math.random()<.45)x+=Math.random()<.5?-1:1;if(y===bAt)br=[x,y];}
  if(br){let [bx,by]=br;const d=Math.random()<.5?-1:1;for(let i=0;i<14;i++){pts.push([bx,by]);by++;if(Math.random()<.6)bx+=d;}}return pts;}

[...$('roomSeg').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===RM.room));
[...$('roomWxSeg').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===RM.weather));
function syncRoomWx(){const indoor=!!ROOMS[RM.room].indoor,L=roomWxList(),cur=roomWeather();
  [...$('roomWxSeg').children].forEach(b=>{const v=b.dataset.v;b.hidden=!indoor&&!L.includes(v)||indoor&&v==='snow';b.disabled=indoor;b.setAttribute('aria-pressed',v===cur);});
  $('roomWxSeg').style.opacity=indoor?.4:1;$('roomWxSeg').title=indoor?'Indoors — no weather here':'';}
syncRoomWx();
seg('roomSeg',v=>{RM.room=v;RM.drops=[];RM.splashes=[];if(LIVE){RM.weather=(LV.room&&LV.room.weather[v])||'sunny';syncRoomWx();roomLive();return;}syncRoomWx();try{localStorage.setItem('forge.room',v);}catch(e){}});
seg('roomWxSeg',v=>{RM.weather=v;RM.drops=[];RM.splashes=[];syncRoomWx();try{localStorage.setItem('forge.roomWeather',v);}catch(e){}});

/* ---------- input ---------- */
function toWorld(e){const r=R.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*ROOM.view.w+ROOM.view.x,y:(e.clientY-r.top)/r.height*ROOM.view.h+ROOM.view.y};}
function catAt(p){ // pixel-accurate: topmost (front-most) pet whose visible pixels are under the pointer
  const order=[...R.cats].sort((a,b)=>b.y-a.y);
  for(const c of order){const b=c._box;if(!b||p.x<b.x||p.x>b.x+b.w||p.y<b.y||p.y>b.y+b.h)continue;
    const cr=c.form.crop;let u=(p.x-b.x)/b.P;if(c.face!==c.artFaces())u=cr.w-u;const v=(p.y-b.y)/b.P;
    const f=b.A.frames[c.cur]||b.A.frames[0];const g=f.getContext('2d');
    for(let oy=-2;oy<=2;oy++)for(let ox=-2;ox<=2;ox++){const px=Math.floor(cr.x+u+ox),py=Math.floor(cr.y+v+oy);
      if(px<0||py<0||px>=f.width||py>=f.height)continue;if(g.getImageData(px,py,1,1).data[3]>20)return c;}}
  return null;
}
R.canvas.addEventListener('pointerdown',e=>{
  if(!R.mine)return;const p=toWorld(e);const hit=catAt(p);
  if(hit&&hit!==R.mine){openMenu(hit);return;}
  closeMenu();if(hit===R.mine){R.mine.emote(R.mine.state==='walk'?'idle':R.mine.state,900,'✨');return;}
  if(p.y<ROOM.floor.back-60)return; // clicked the wall
  const me=R.mine;if(me.task){me.task.target.lock=false;me.task=null;}me.until=0;me.bubble=null;me.hop=0;me.then=null;
  const q=clampFloor(p.x,p.y);me.walkTo(q.x,q.y);R.marks.push({x:q.x,y:q.y,t:performance.now()});
});
function openMenu(c){
  R.menu=c;const m=$('roomMenu');m.hidden=false;$('menuName').textContent=c.name+(c.owner&&c.owner.username?` · ${c.owner.username}’s${c.friend?' ★':''}`:c.guest?' (guest)':'');positionMenu();
}
function closeMenu(){R.menu=null;$('roomMenu').hidden=true;}
function positionMenu(){
  if(!R.menu)return;const c=R.menu;if(!R.cats.includes(c)){closeMenu();return;}const b=c._box;if(!b)return;
  const r=R.canvas.getBoundingClientRect(),wr=$('roomWrap').getBoundingClientRect();
  const sx=(c.x-ROOM.view.x)*r.width/ROOM.view.w+(r.left-wr.left),sy=(b.y-ROOM.view.y)*r.height/ROOM.view.h+(r.top-wr.top);
  const m=$('roomMenu');const mw=m.offsetWidth,mh=m.offsetHeight;
  m.style.left=Math.max(6,Math.min(wr.width-mw-6,sx-mw/2))+'px';m.style.top=Math.max(6,sy-mh-8)+'px';
}
$('roomMenu').addEventListener('click',async e=>{const b=e.target.closest('button[data-act]');if(!b||!R.menu)return;
  if(!R.mine){closeMenu();toast(LIVE?'Hatch your egg first: it’s in the Pet tab':'Pick who you are first');return;}
  const target=R.menu,me=R.mine,kind=b.dataset.act;closeMenu();
  if(kind==='date'){startPlayDate(target);return;}
  // In the game the server decides first (once an hour each); the pets only act it out if it agrees.
  if(LIVE){const r=await liveCall('/room/act',{targetId:target.id,action:kind});if(!r)return;livePet(r.mine);livePet(r.theirs);
    me.low=lowMood(r.mine&&r.mine.meters);target.low=lowMood(r.theirs&&r.theirs.meters);
    toast(kind==='play'?`${me.name} and ${target.name} played: both happier`:kind==='pet'?`${target.name} loved that: happier, and a little braver`
      :r.outcome==='won'?`${me.name} stood tall: more confident (both a little sadder)`:`${target.name} wasn’t having it: both lose confidence and happiness`);}
  if(me.task)me.task.target.lock=false;
  target.lock=true;target.tx=null;target.task=null;target.until=0;target.then=null;target.hop=0;target.setState('idle');target.face=me.x<target.x?-1:1;
  const gap=(me.form.crop.w*pxAt(target.y)+target.form.crop.w*pxAt(target.y))*.36+6;
  let side=me.x<target.x?-1:1;let sx=target.x+side*gap;
  if(sx<ROOM.floor.left||sx>ROOM.floor.right){side=-side;sx=target.x+side*gap;}
  me.until=0;me.bubble=null;me.hop=0;me.then=null;me.task={kind,target};
  const q=clampFloor(sx,target.y);
  if(Math.hypot(q.x-me.x,q.y-me.y)<4){me.tx=null;me.arrived(performance.now());}else me.walkTo(q.x,q.y);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

/* ===================================================================
   RACE — 10 pets run left → right for about a minute.
   The finishing order is picked at random before the start, then the
   race is "scripted" around it: pets take turns surging to the front
   and fading back, and everyone still crosses the line in that order.
   The track is real pixel art (one map pixel = one art pixel), drawn
   on a small canvas, scrolled by a camera and scaled up crisply.
   =================================================================== */
const RACE={W:384,H:216,MW:1960,n:10,startX:44,finishX:1890,laneTop:121,laneH:8.6,
  winnerMs:60000,        // the winner crosses the line after one minute
  wireChance:.10,        // chance the winner leads from start to finish
  comebackChance:.30,    // chance the winner sits mid-pack, then rushes to the front in the last 5 s
  comebackMs:5000,
  angryUpTo:5,
  reactMs:250};          // each pet starts its happy / angry / sad animation this long after crossing the line
const raceReaction=r=>r.place===1?'love':r.place<=RACE.angryUpTo?'angry':'sad';          // places 2..angryUpTo get angry, the rest get sad
const RC={map:(()=>{try{const m=localStorage.getItem('forge.raceMap');return ['stadium','river','ruins','theatre'].includes(m)?m:'stadium';}catch(e){return 'stadium';}})(),weather:(()=>{try{const w=localStorage.getItem('forge.weather');return ['sunny','rain','thunder'].includes(w)?w:'sunny';}catch(e){return 'sunny';}})(),phase:'ready',racers:[],guests:[],t0:0,order:[],bg:null,canvas:null,ctx:null,lo:null,lctx:null,running:false,last:0,building:0,finishedAt:0,cam:0,wire:false,leader:null};

/* ---------- pixel-art map (drawn once, 1960 px long) ---------- */
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const WEATHER={ // sky bands, cloud colours, and a multiply tint that darkens the whole scene
  sunny:  {sky:['#4aa3f0','#62b3f5','#7cc3f8','#98d2fb','#b4e0fd'],cloud:['#ffffff','#d8ecfb'],tint:null,sun:true,umbrellas:0,puddles:0,clouds:[60,90]},
  rain:   {sky:['#7d8fa6','#8798ad','#91a1b5','#9baabd','#a5b3c5'],cloud:['#c3cbd6','#9ea8b6'],tint:'#c4cad4',sun:false,umbrellas:.35,puddles:22,clouds:[22,40]},
  thunder:{sky:['#3b4256','#434b60','#4b546a','#535d74','#5b667e'],cloud:['#6a7189','#50566c'],tint:'#8f95a6',sun:false,umbrellas:.45,puddles:34,clouds:[14,28]}};
const RACE_MAPS={
  stadium:{name:'Stadium',icon:'🏟️',banner:true,
    surface:{lanes:['#cf9659','#c48a52'],edge:'#a86f3e',line:'#eac394',speck:['#b07a45','#dba771'],puddle:'#8a5f3a',seam:null}},
  river:{name:'Riverside',icon:'🌉',
    surface:{lanes:['#bdb6a7','#b1aa9a'],edge:'#7d776b',line:'#f4f1e8',speck:['#a49d8e','#cbc4b5'],puddle:'#848d9a',seam:'#9e9788',seamW:12}},
  theatre:{name:'Theatre',icon:'🎬',indoor:true,
    surface:{lanes:['#8a1c2b','#7e1826'],edge:'#4a0c16',line:'#d9a441',speck:['#9b2434','#6d1420'],puddle:'#5a0f1a',seam:null}},
  ruins:{name:'Ruins',icon:'🛕',
    surface:{lanes:['#c4a97c','#b99e71'],edge:'#8a7450',line:'#dcc89e',speck:['#8f9a5c','#a88e62'],puddle:'#6f6248',seam:'#9a8058',seamW:14}}};

function drawRaceMap(mapId='stadium',weather='sunny'){
  const W=WEATHER[weather]||WEATHER.sunny,M=RACE_MAPS[mapId]||RACE_MAPS.stadium,dark=weather!=='sunny';
  const MW=RACE.MW;const c=document.createElement('canvas');c.width=MW;c.height=RACE.H;const g=c.getContext('2d');const rnd=seeded(7);
  const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x|0,y|0,w|0,h|0);};
  const R=a=>a[Math.floor(rnd()*a.length)];
  const lights=[];   // pixels that should stay bright after the weather tint (lit windows, lamps, torches)
  const light=(x,y,w,h,col)=>lights.push([x,y,w,h,col]);
  // ---- sky (outdoor maps only) ----
  if(!M.indoor){
  const sky=W.sky;sky.forEach((col,i)=>px(0,i*14,MW,14,col));
  for(let i=1;i<sky.length;i++)for(let x=0;x<MW;x++)for(let d=0;d<2;d++)if((x+d)%2===0)px(x,i*14-1+d,1,1,sky[i-1+d]);
  px(0,70,MW,12,sky[4]);
  if(W.sun)for(let y=-11;y<=11;y++)for(let x=-11;x<=11;x++){const r=Math.hypot(x,y);if(r<=11)px(330+x,22+y,1,1,r<7?'#fff6b0':r<9.5?'#ffe066':'#ffcf3f');}
  const cloud=(cx,cy,s)=>{[[0,4,6*s,3*s],[2*s,1,5*s,4*s],[5*s,2,6*s,4*s],[9*s,4,5*s,3*s]].forEach(([x,y,w,h])=>px(cx+x,cy+y,w,h,W.cloud[0]));px(cx+1,cy+4+3*s-1,13*s,1,W.cloud[1]);};
  for(let x=20;x<MW;x+=W.clouds[0]+Math.floor(rnd()*W.clouds[1]))cloud(x,(W.sun?6:0)+Math.floor(rnd()*(W.sun?30:26)),W.sun?(rnd()<.5?1:2):(rnd()<.35?2:3));
  }
  const person=(x,y)=>{px(x,y,3,2,R(['#f2c9a0','#d9a07a','#a8714f','#6e4630','#ffe0bd']));px(x,y+2,3,3,R(['#e04848','#3d7ee0','#f2c230','#47b36b','#a55ee0','#ff8f3d','#f4f1ea','#2d2d3a']));
    if(rnd()<W.umbrellas){const u=R(['#e04848','#3d7ee0','#f2c230','#47b36b','#a55ee0','#1b1b22']);px(x-1,y-3,5,1,u);px(x,y-4,3,1,u);px(x+1,y-2,1,2,'#3d3f52');}};

  /* ================= STADIUM ================= */
  if(mapId==='stadium'){
    for(let x=0;x<MW;x++){const y1=Math.round(64+7*Math.sin(x/23)+4*Math.sin(x/9+1));px(x,y1,1,40,'#8fd07f');px(x,y1,1,1,'#b2e39c');
      const y2=Math.round(76+5*Math.sin(x/31+2)+3*Math.sin(x/13));px(x,y2,1,40,'#62b25f');px(x,y2,1,1,'#7fc873');}
    const stands=[];for(let x=16;x<MW-16;){const w=280+Math.floor(rnd()*160);stands.push([x,Math.min(w,MW-16-x)]);x+=w+40;}
    const tree=(tx)=>{px(tx+7,92,3,20,'#7a4a2a');for(let y=0;y<26;y++){const w=Math.round(16*Math.sin(Math.PI*(y+2)/30));px(tx+8-w/2,70+y,w,1,y%5===0?'#4c9a48':'#3f8a3e');}};
    stands.forEach(([sx,sw],i)=>{
      px(sx,60,sw,52,'#6b6f86');px(sx,60,sw,2,'#8a8fa8');
      for(let x=sx;x<sx+sw;x+=16){px(x,60,Math.min(8,sx+sw-x),6,'#e04848');if(x+8<sx+sw)px(x+8,60,Math.min(8,sx+sw-x-8),6,'#f4f1ea');}
      px(sx,66,sw,1,'#3d3f52');for(let x=sx+8;x<sx+sw;x+=44)px(x,67,3,45,'#4d5066');
      for(let row=0;row<6;row++){const y=71+row*7;px(sx,y+5,sw,1,'#585c74');
        for(let x=sx+3+(row%2)*2;x<sx+sw-3;x+=5){if(rnd()<.18)continue;person(x,y);if(W.sun&&rnd()<.12)px(x+1,y-2,1,2,'#ffffff');}}
      for(let x=sx+4;x<sx+sw;x+=22){px(x,54,1,6,'#3d3f52');const col=['#e04848','#f2c230','#3d7ee0','#47b36b'][(x/22|0)%4];px(x+1,54,4,2,col);px(x+1,56,2,1,col);}
      if(dark)for(let x=sx+20;x<sx+sw-10;x+=60){px(x,56,1,4,'#3d3f52');light(x-2,54,5,2,'#fff3c4');}       // floodlights
      if(i<stands.length-1){tree(sx+sw+4);tree(sx+sw+20);}});
    px(134,46,116,15,'#3b1f4f');px(134,46,116,1,'#ffcf3f');px(134,60,116,1,'#ffcf3f');px(134,46,1,15,'#ffcf3f');px(249,46,1,15,'#ffcf3f');
    for(let x=136;x<249;x+=6)px(x,47,3,1,'#ffe066');
    px(0,112,MW,6,'#2f6b3a');px(0,113,MW,1,'#f4f1ea');px(0,116,MW,1,'#f4f1ea');for(let x=2;x<MW;x+=10)px(x,111,2,7,'#f4f1ea');
  }

  /* ================= RIVERSIDE CITY ================= */
  if(mapId==='river'){
    const water=['#4c8ac7','#4380bd','#3a74ae','#336aa0'];
    // skyline across the river: a hazy back row and a sharper front row, windows lit when it's dark out
    const skyline=(layer)=>{const base=80,col=layer?'#6a82a6':'#93a8c6',edge=layer?'#88a0c2':'#a9bbd4',win=layer?'#c4d6ee':'#b9cae0';
      for(let x=layer?0:-10;x<MW;){const w=8+Math.floor(rnd()*(layer?22:26)),top=layer?36+Math.floor(rnd()*36):24+Math.floor(rnd()*36);
        px(x,top,w,base-top,col);px(x,top,1,base-top,edge);
        const roof=rnd();if(roof<.15&&w>10){for(let k=0;k<6;k++)px(x+Math.floor(w/2)-k,top-6+k,k*2+1,1,col);}              // spire
        else if(roof<.25&&w>12){const r=Math.floor(w/2);for(let k=0;k<r;k++){const hw=Math.round(Math.sqrt(r*r-k*k));px(x+r-hw,top-k,hw*2,1,col);}} // dome
        else if(roof<.45){px(x+2,top-3,Math.max(2,w-4),3,col);px(x+Math.floor(w/2),top-8,1,5,'#3d4a63');}                  // stepped top + antenna
        for(let wy=top+3;wy<base-3;wy+=4)for(let wx=x+2;wx<x+w-1;wx+=3){
          if(dark){if(rnd()<.38)light(wx,wy,1,2,R(['#ffe39a','#ffd36b','#fff1c2']));else px(wx,wy,1,2,layer?'#4f6585':'#7b90b0');}
          else if(rnd()<.45)px(wx,wy,1,2,win);}
        x+=w+(layer?Math.floor(rnd()*3):Math.floor(rnd()*6));}};
    skyline(0);
    // a generic observation tower and an arched bridge for landmarks
    for(let tx=640;tx<MW;tx+=1100){px(tx,10,2,70,'#5a6f8f');px(tx-4,26,10,6,'#5a6f8f');px(tx-3,25,8,1,'#7d93b5');px(tx,4,1,6,'#3d4a63');if(dark)light(tx,3,1,1,'#ff5a5a');}
    skyline(1);
    // river
    water.forEach((col,i)=>px(0,80+i*7,MW,7,col));
    for(let k=0;k<MW*.9;k++){const y=81+Math.floor(rnd()*26);px(Math.floor(rnd()*MW),y,2+Math.floor(rnd()*4),1,y<92?'#7fb4e6':'#5f97cf');}
    for(let x=0;x<MW;x+=2)if(rnd()<.5)px(x,80,1,1,'#2f5f91');                                                           // waterline shadow
    if(dark)for(let k=0;k<MW*.35;k++){const x=Math.floor(rnd()*MW),y=82+Math.floor(rnd()*14);light(x,y,1+Math.floor(rnd()*2),1,'#d9bf6e');} // window reflections
    // bridge
    const bx0=980,bx1=1300;px(bx0,70,bx1-bx0,3,'#55607a');px(bx0,70,bx1-bx0,1,'#7c88a3');
    for(let ax=bx0;ax<bx1;ax+=40){for(let k=0;k<20;k++){const hgt=Math.round(9*Math.sin(Math.PI*k/20));px(ax+k*2,73,2,1,'#55607a');px(ax+k*2,80-Math.max(0,7-hgt),2,1,'#55607a');}px(ax,73,3,10,'#4a5470');}
    for(let ax=bx0;ax<bx1;ax+=16){px(ax,66,1,4,'#4a5470');if(dark)light(ax,65,1,1,'#ffe39a');}
    // boats
    for(let bx=200;bx<MW;bx+=420+Math.floor(rnd()*200)){const y=90+Math.floor(rnd()*10);px(bx,y,18,2,'#f4f1ea');px(bx+1,y+2,16,1,'#c9c4b8');px(bx+5,y-3,7,3,'#e04848');px(bx+6,y-2,2,1,'#bfe0ff');px(bx+9,y-2,2,1,'#bfe0ff');}
    // embankment wall + railing + lamps + people leaning on the rail
    px(0,106,MW,2,'#a39c90');px(0,108,MW,10,'#8a8378');
    for(let y=108;y<118;y+=3)for(let x=(y%6?0:5);x<MW;x+=10)px(x,y,1,3,'#756f65');
    for(let y=110;y<118;y+=3)px(0,y,MW,1,'#7b746a');
    px(0,99,MW,1,'#3c4250');for(let x=0;x<MW;x+=7)px(x,99,1,7,'#3c4250');
    for(let x=30;x<MW;x+=64){px(x,82,2,24,'#2f3440');px(x-2,80,6,2,'#2f3440');if(dark){light(x-1,82,4,2,'#ffe39a');light(x-3,84,8,1,'#a88a3d');}else px(x-1,82,4,2,'#f4f1ea');}
    for(let x=10;x<MW;x+=9+Math.floor(rnd()*40))if(rnd()<.55)person(x,100);
  }

  /* ================= ANGKOR-STYLE RUINS ================= */
  if(mapId==='ruins'){
    const ST={hi:'#d3c196',mid:'#b7a37c',sh:'#9a8662',dk:'#6f5f45',moss:'#7f9a58'};
    // jungle canopy behind everything
    for(let x=0;x<MW;x++){const y1=Math.round(58+6*Math.sin(x/17)+4*Math.sin(x/7+2)+3*Math.sin(x/41));px(x,y1,1,60,'#5e9150');if(rnd()<.5)px(x,y1,1,1,'#7cae62');
      const y2=Math.round(74+5*Math.sin(x/13+1)+3*Math.sin(x/5));px(x,y2,1,40,'#477a3f');if(rnd()<.4)px(x,y2,1,1,'#5f9a50');}
    // a "lotus bud" tower: tiers that narrow to a rounded tip, with dark gaps between tiers
    const tower=(cx,base,h,w)=>{
      for(let y=0;y<h;y++){const t=y/h;const hw=Math.max(1,Math.round(w/2*(t<.18?1:Math.cos((t-.18)/.82*Math.PI/2)**.7)));const yy=base-y;
        const tierLine=y%5===4;px(cx-hw,yy,hw*2,1,tierLine?ST.dk:ST.mid);if(!tierLine){px(cx-hw,yy,1,1,ST.hi);px(cx+hw-2,yy,2,1,ST.sh);}
        if(y%5===2&&hw>3){px(cx-hw-1,yy,1,1,ST.sh);px(cx+hw,yy,1,1,ST.sh);}}                                  // little notches
      px(cx,base-h-3,1,3,ST.sh);
      for(let k=0;k<Math.round(h*w/40);k++)if(rnd()<.6){const y=base-Math.floor(rnd()*h*.8);px(cx-w/3+Math.floor(rnd()*w*.66),y,1+Math.floor(rnd()*2),1,ST.moss);}};
    const stepped=(cx,base,w,tiers)=>{for(let i=0;i<tiers;i++){const tw=w-i*16,y=base-(i+1)*6;px(cx-tw/2,y,tw,6,ST.mid);px(cx-tw/2,y,tw,1,ST.hi);px(cx-tw/2,y+5,tw,1,ST.sh);
      for(let x=cx-tw/2+3;x<cx+tw/2-3;x+=6)px(x,y+2,2,3,ST.dk);}                                                      // small niches
      px(cx-4,base-tiers*6,8,tiers*6,ST.dk);for(let y=base-tiers*6;y<base;y+=2)px(cx-4,y,8,1,ST.sh);};               // central stair
    const gallery=(x0,x1)=>{px(x0,92,x1-x0,20,ST.mid);px(x0,92,x1-x0,1,ST.hi);px(x0,89,x1-x0,3,ST.sh);px(x0,88,x1-x0,1,ST.hi);
      for(let x=x0+4;x<x1-8;x+=12){px(x,96,7,11,ST.dk);for(let b=x+1;b<x+7;b+=2)px(b,96,1,11,ST.hi);}                 // balustered windows
      for(let k=0;k<(x1-x0)/3;k++)if(rnd()<.5)px(x0+Math.floor(rnd()*(x1-x0)),92+Math.floor(rnd()*20),1,1,ST.moss);};
    const kapok=(x)=>{px(x,70,4,22,'#8b7a66');for(let r=0;r<5;r++){let rx=x+1,ry=92;const dir=r%2?1:-1;for(let k=0;k<14;k++){px(rx,ry,1,1,'#8b7a66');ry++;if(rnd()<.6)rx+=dir;}}  // roots spilling over the wall
      for(let y=0;y<16;y++){const w=Math.round(22*Math.sin(Math.PI*(y+1)/17));px(x+2-w/2,56+y,w,1,y%4===0?'#5f9a50':'#4c8744');}};
    let last=0;
    for(let cx=230;cx<MW-120;cx+=520+Math.floor(rnd()*120)){
      gallery(last,cx-70);if(rnd()<.8)kapok(last+40+Math.floor(rnd()*Math.max(10,cx-170-last)));
      stepped(cx,112,140,3);tower(cx-52,94,34,18);tower(cx+52,94,34,18);tower(cx,94,58,30);
      if(dark){light(cx-60,84,2,2,'#ffb347');light(cx+59,84,2,2,'#ffb347');light(cx-60,83,1,1,'#fff1a6');light(cx+59,83,1,1,'#fff1a6');} // torches
      last=cx+70;}
    gallery(last,MW);
    // naga balustrade along the back of the track, with a fanned naga head at the start
    px(0,108,MW,4,ST.mid);px(0,108,MW,1,ST.hi);px(0,111,MW,1,ST.sh);for(let x=0;x<MW;x+=3)px(x,109,1,2,ST.sh);
    for(let x=0;x<MW;x+=24)px(x,104,3,14,ST.sh),px(x,104,3,1,ST.hi);
    px(0,112,MW,6,'#8a7450');for(let x=0;x<MW;x+=8)px(x,112,1,6,'#76623f');
    const naga=(nx)=>{for(let h=-3;h<=3;h++){const hx=nx+h*4,hy=92+Math.abs(h)*2;px(hx-2,hy,5,4,ST.mid);px(hx-2,hy,5,1,ST.hi);px(hx-1,hy+1,1,1,ST.dk);px(hx+1,hy+1,1,1,ST.dk);px(hx,hy+4,1,14-Math.abs(h)*2,ST.sh);}
      px(nx-14,104,29,8,ST.mid);px(nx-14,104,29,1,ST.hi);};
    naga(18);naga(RACE.finishX+30);
  }

  /* ================= MOVIE THEATRE (indoors, no weather) ================= */
  if(mapId==='theatre'){
    // starry ceiling + gold trim
    px(0,0,MW,26,'#140a12');for(let k=0;k<MW*.12;k++)px(Math.floor(rnd()*MW),Math.floor(rnd()*22),1,1,R(['#fff3c4','#ffe39a','#c9b8ff']));
    px(0,24,MW,2,'#c99a3a');px(0,26,MW,1,'#7a5a1e');
    // wall of red velvet curtain panels between gold pilasters, with sconces
    for(let x=0;x<MW;x++){const f=(x%10);px(x,27,1,60,f<2?'#5e101c':f<6?'#8e1b2b':f<8?'#a32235':'#74151f');}
    for(let x=0;x<MW;x+=20){for(let k=0;k<6;k++)px(x+k,27+Math.round(4*Math.sin(Math.PI*k/6)),1,2,'#b8892c');}       // swags
    const sx0=780,sx1=1260,sy0=8,sy1=74;const nearScreen=x=>x>sx0-40&&x<sx1+40;
    for(let x=60;x<MW;x+=120){if(nearScreen(x))continue;px(x,27,6,60,'#a8802f');px(x,27,1,60,'#e2bd63');px(x+5,27,1,60,'#7a5a1e');
      px(x-1,50,8,5,'#3a1a10');light(x,50,6,3,'#ffd36b');light(x+1,48,4,2,'#fff1c2');light(x-2,55,10,1,'#b8862b');}
    // the big screen with a glowing frame and a (generic) sunset scene playing on it
    for(let y=sy0-3;y<sy1+3;y++)px(sx0-3,y,sx1-sx0+6,1,'#2a2030');
    const bands=['#1d2b5a','#2f3a72','#5a4a8a','#9a5a8a','#d8707a','#f29a6a','#f7c46a'];
    for(let y=sy0;y<sy1;y++){const b=bands[Math.min(bands.length-1,Math.floor((y-sy0)/(sy1-sy0)*bands.length*1.05))];px(sx0,y,sx1-sx0,1,b);}
    for(let y=-12;y<=12;y++)for(let x=-12;x<=12;x++)if(x*x+y*y<=144)px(1020+x,58+y,1,1,y<-6?'#fff1a8':'#ffd36b');
    for(let x=sx0;x<sx1;x++){const h=Math.round(10+6*Math.sin(x/19)+4*Math.sin(x/7));px(x,sy1-h,1,h,'#2a1d3a');const h2=Math.round(5+3*Math.sin(x/11+1));px(x,sy1-h2,1,h2,'#1a1226');}
    for(let k=0;k<60;k++)px(sx0+Math.floor(rnd()*(sx1-sx0)),sy0+Math.floor(rnd()*14),1,1,'#e6e6ff');
    for(let i=1;i<=4;i++){px(sx0-3-i*2,sy0-3,2,sy1-sy0+6,`rgba(255,210,150,${.18/i})`);px(sx1+1+i*2,sy0-3,2,sy1-sy0+6,`rgba(255,210,150,${.18/i})`);}
    // big gathered curtains either side of the screen
    const drape=(x0,dir)=>{for(let i=0;i<28;i++){const x=x0+dir*i;const f=i%7;px(x,8,1,80,f<2?'#5e101c':f<5?'#a32235':'#7c1624');}
      for(let i=0;i<28;i+=2)px(x0+dir*i,60,1,3,'#e2bd63');};
    drape(sx0-6,-1);drape(sx1+5,1);
    // EXIT signs
    for(let x=300;x<MW;x+=620){if(nearScreen(x))x+=560;px(x,32,14,6,'#0f3d22');light(x+1,33,12,4,'#3cff8a');for(let k=0;k<4;k++)px(x+2+k*3,34,2,2,'#0f3d22');}
    // stadium seating with an audience (some with popcorn), lit by the screen in the middle
    for(let row=0;row<4;row++){const y=86+row*7,shade=row/3;
      px(0,y+5,MW,2,'#2a0c14');
      for(let x=(row%2)*4;x<MW;x+=8){
        const glow=Math.max(0,1-Math.abs(x-(sx0+sx1)/2)/420);
        px(x,y,7,5,glow>.3?'#9a2034':shade>.5?'#6a1422':'#7a1726');px(x,y,7,1,glow>.3?'#c33a4c':'#a32235');
        if(rnd()<.62){const hy=y-4;px(x+2,hy,3,4,R(['#2a1d1a','#4a2f22','#1a1a22','#6b4a2a','#c9a36a']));px(x+2,hy+2,3,2,R(['#f2c9a0','#d9a07a','#a8714f','#6e4630']));
          if(rnd()<.12){px(x+5,y-2,2,3,'#e04848');px(x+5,y-2,1,3,'#f4f1ea');px(x+5,y-3,2,1,'#ffe066');}}}}
    // brass rail between the seats and the aisle
    px(0,112,MW,6,'#3a0c16');px(0,112,MW,1,'#e2bd63');px(0,113,MW,1,'#c99a3a');for(let x=4;x<MW;x+=16)px(x,113,2,5,'#c99a3a');
  }

  // ================= track surface (shared layout, per-map look) =================
  const S=M.surface;const trackBot=Math.round(RACE.laneTop-3+RACE.n*RACE.laneH);
  for(let i=0;i<RACE.n;i++){const y=Math.round(RACE.laneTop-3+i*RACE.laneH),h=Math.round(RACE.laneTop-3+(i+1)*RACE.laneH)-y;px(0,y,MW,h,S.lanes[i%2]);
    if(S.seam)for(let x=(i%2)*Math.floor(S.seamW/2);x<MW;x+=S.seamW)px(x,y,1,h,S.seam);}   // paving / block joints
  px(0,118,MW,2,S.edge);
  for(let i=1;i<RACE.n;i++){const y=Math.round(RACE.laneTop-3+i*RACE.laneH);for(let x=0;x<MW;x+=6)px(x,y,3,1,S.line);}
  for(let k=0;k<4800;k++)px(Math.floor(rnd()*MW),120+Math.floor(rnd()*(trackBot-120)),1,1,R(S.speck));
  for(let k=0;k<Math.round(W.puddles*MW/384);k++){const x=Math.floor(rnd()*MW),y=120+Math.floor(rnd()*80),w=6+Math.floor(rnd()*10);
    px(x,y,w,2,S.puddle);px(x+1,y+2,w-2,1,S.puddle);px(x+2,y,Math.max(1,w-6),1,'#b9c4d3');}
  for(let x=RACE.startX+300;x<RACE.finishX-60;x+=300){px(x,100,2,19,'#f4f1ea');px(x-6,96,14,8,'#2b5fa8');px(x-6,96,14,1,'#6f9be0');}
  px(RACE.startX-1,118,2,trackBot-118,'#f4f1ea');
  for(let y=118;y<trackBot;y+=2)for(let x=0;x<8;x+=2)px(RACE.finishX+x,y,2,2,((x+y)/2)%2?'#1b1b22':'#f4f1ea');
  px(RACE.finishX-2,88,2,31,'#3d3f52');px(RACE.finishX+8,88,2,31,'#3d3f52');px(RACE.finishX-4,86,16,4,'#e04848');px(RACE.finishX-4,86,16,1,'#ff8a8a');
  for(let y=0;y<6;y+=2)for(let x=0;x<12;x+=2)px(RACE.finishX+10+x,92+y,2,2,((x+y)/2)%2?'#1b1b22':'#f4f1ea');px(RACE.finishX+10,91,1,14,'#3d3f52');

  // ================= foreground =================
  const fg=trackBot+2,fh=RACE.H-fg;
  if(mapId==='theatre'){   // aisle lights along the carpet, then the backs of the front-row seats
    for(let x=3;x<MW;x+=10){light(x,119,2,1,'#ffcf6b');light(x,trackBot-1,2,1,'#ffcf6b');}
    for(let i=0;i<RACE.n;i++){const y=Math.round(RACE.laneTop-3+i*RACE.laneH)+4;for(let x=(i%2)*12;x<MW;x+=24)px(x,y,1,1,'#b8862b');}   // carpet pattern
    px(0,trackBot,MW,2,'#c99a3a');px(0,fg,MW,fh,'#12070c');
    for(let x=-4;x<MW;x+=11){px(x+1,fg,9,fh,'#3a0c16');px(x+2,fg-1,7,1,'#3a0c16');px(x+2,fg,7,1,'#5e1424');if(rnd()<.15)px(x+3,fg+2,3,3,'#1b1b22');}}
  if(mapId==='stadium'){px(0,trackBot,MW,2,'#f4f1ea');px(0,fg,MW,fh,'#4f9e46');
    for(let x=0;x<MW;x+=3){if(rnd()<.6)px(x,fg+1+Math.floor(rnd()*6),1,2,'#6dbb5c');if(rnd()<.06)px(x,fg+2+Math.floor(rnd()*5),2,2,R(['#ffe066','#ff8fb1','#ffffff']));}}
  if(mapId==='river'){px(0,trackBot,MW,2,'#d9d4c8');px(0,fg,MW,fh,'#4f9e46');
    for(let x=0;x<MW;x+=3){if(rnd()<.55)px(x,fg+1+Math.floor(rnd()*6),1,2,'#6dbb5c');if(rnd()<.07)px(x,fg+2+Math.floor(rnd()*5),2,2,R(['#ff8fb1','#ffe066','#b38cff']));}
    for(let x=60;x<MW;x+=140){px(x,fg-1,12,2,'#7a4a2a');px(x,fg+1,1,3,'#2f3440');px(x+11,fg+1,1,3,'#2f3440');}}            // benches
  if(mapId==='ruins'){px(0,trackBot,MW,2,'#a8936c');px(0,fg,MW,fh,'#3f7f86');                                              // lotus moat
    for(let k=0;k<MW*.4;k++)px(Math.floor(rnd()*MW),fg+1+Math.floor(rnd()*(fh-1)),2+Math.floor(rnd()*3),1,'#5fa0a6');
    for(let x=0;x<MW;x+=5+Math.floor(rnd()*8)){const y=fg+1+Math.floor(rnd()*(fh-3));px(x,y,4,2,'#4f9a4a');px(x+1,y,1,1,'#3f7f86');
      if(rnd()<.25){px(x+1,y-2,2,2,'#ff9fc0');px(x+1,y-3,1,1,'#ffd1e1');}}}

  // weather tint, then lights on top so they stay bright in the gloom
  if(W.tint){g.globalCompositeOperation='multiply';g.fillStyle=W.tint;g.fillRect(0,0,MW,RACE.H);g.globalCompositeOperation='source-over';}
  for(const [x,y,w,h,col] of lights)px(x,y,w,h,col);
  return c;
}

/* ---------- weather effects drawn every frame ---------- */
const WX={drops:[],splashes:[],lastCam:0,flash:null,nextFlash:0};
const effWeather=()=>RACE_MAPS[RC.map]&&RACE_MAPS[RC.map].indoor?'sunny':RC.weather;   // indoor maps have no weather
function weatherStep(dt,now,g,cam){
  const w=effWeather();const want=w==='rain'?150:w==='thunder'?280:0;
  const camD=cam-WX.lastCam;WX.lastCam=cam;
  while(WX.drops.length<want)WX.drops.push(newDrop(true));if(WX.drops.length>want)WX.drops.length=want;
  const fall=w==='thunder'?.30:.22,wind=w==='thunder'?.09:.05;     // px per ms
  g.fillStyle=w==='thunder'?'rgba(205,215,235,.75)':'rgba(200,214,236,.7)';
  for(const d of WX.drops){d.y+=fall*d.v*dt;d.x-=wind*d.v*dt+camD;
    if(d.y>=d.gy){if(d.gy>118)WX.splashes.push({x:d.x,y:d.gy,t:now});Object.assign(d,newDrop(false));continue;}
    if(d.x<-4)d.x+=RACE.W+8;else if(d.x>RACE.W+4)d.x-=RACE.W+8;
    for(let i=0;i<d.len;i++)g.fillRect(Math.round(d.x+i*wind/fall),Math.round(d.y-i),1,1);}   // slanted 1-px streak
  g.fillStyle='rgba(220,230,245,.8)';
  WX.splashes=WX.splashes.filter(s=>now-s.t<160);
  for(const s of WX.splashes){s.x-=camD;const t=(now-s.t)/160;const sx=Math.round(s.x),sy=Math.round(s.y);
    if(t<.5){g.fillRect(sx-1,sy-1,1,1);g.fillRect(sx+1,sy-1,1,1);}else{g.fillRect(sx-2,sy-2,1,1);g.fillRect(sx+2,sy-2,1,1);}}
  // lightning: a jagged bolt in the sky + a quick double flash over everything
  if(w==='thunder'){
    if(!WX.nextFlash)WX.nextFlash=now+rnd(2500,6000);
    if(now>=WX.nextFlash){WX.flash={t:now,bolt:makeBolt()};WX.nextFlash=now+rnd(4000,9000);}
    const f=WX.flash;if(f){const t=now-f.t;
      if(t<260){g.fillStyle='#fffbe6';for(const [x,y] of f.bolt)g.fillRect(x,y,1,1);g.fillStyle='rgba(255,240,170,.55)';for(const [x,y] of f.bolt){g.fillRect(x-1,y,1,1);g.fillRect(x+1,y,1,1);}}
      const a=t<60?.75:t<120?.1:t<200?.5:t<420?.5*(1-(t-200)/220):0;
      if(a>0){g.fillStyle=`rgba(235,240,255,${a})`;g.fillRect(0,0,RACE.W,RACE.H);}else if(t>420)WX.flash=null;}}
  else{WX.flash=null;WX.nextFlash=0;}
}
function newDrop(anywhere){return {x:Math.random()*(RACE.W+20),y:anywhere?Math.random()*RACE.H:-Math.random()*40,len:3+Math.floor(Math.random()*3),v:rnd(.8,1.25),gy:rnd(40,RACE.H-2)};}
function makeBolt(){ // pixel bolt from the top of the sky down into the hills, with one branch
  const pts=[];let x=Math.floor(rnd(30,RACE.W-30)),y=0;const end=Math.floor(rnd(52,78));
  const branchAt=Math.floor(rnd(14,30));let branch=null;
  while(y<end){pts.push([x,y]);y++;if(Math.random()<.45)x+=Math.random()<.5?-1:1;if(y===branchAt)branch=[x,y];}
  if(branch){let [bx,by]=branch;const dir=Math.random()<.5?-1:1;for(let i=0;i<16;i++){pts.push([bx,by]);by++;if(Math.random()<.6)bx+=dir;}}
  return pts;
}

/* ---------- racers ---------- */
class Racer{
  constructor(o){Object.assign(this,o);this.cur=0;this.acc=0;this.clock=0;this.state='idle';this.cache={};this.x=RACE.startX-6;this.place=0;this.done=false;}
  artFaces(){const d=baseDocs.get(this.form.id);return d&&d.facing==='right'?1:-1;}
  anim(state){return RoomCat.prototype.anim.call(this,state);}
  setState(s){if(s!==this.state){this.state=s;this.cur=0;this.acc=0;}}
  step(dt){const A=this.anim(this.state);const n=A.frames.length;
    if(n>1){this.acc+=dt;let d=A.delays[this.cur]||100;while(this.acc>=d){this.acc-=d;this.cur=this.cur+1<n?this.cur+1:(A.rlf?Math.max(0,n-Math.min(n,A.rlfN)):0);d=A.delays[this.cur]||100;}}
    else this.cur=0;this.clock+=dt;}
  dotColor(){ // most-used visible colour of this pet, for the progress bar
    if(this._dot)return this._dot;const f=this.form;let best=null,bt=-1;
    f.colors.forEach((c,i)=>{const t=f.total(c);const [r,g,b]=this.map[i];const lum=(r+g+b)/3;if(t>bt&&lum>40&&lum<235){bt=t;best=this.map[i];}});
    return this._dot=best?hex(...best):'#ffffff';}
}
async function raceSync(){
  if(LIVE)return raceLiveLineup();   // the game's races are the server's
  const tok=++RC.building;const roster=roomRoster(RACE.n,RC.guests);
  const forms=await Promise.all(roster.map(r=>getForm(r.baseFormId)));if(tok!==RC.building)return;
  const keep=new Map(RC.racers.map(r=>[r.id,r]));const list=[];
  roster.forEach((r,i)=>{const f=forms[i];if(!f||!f.firstState())return;
    const map=r.guest?coatMap(f,r.coat):mapFromChanges(f,r.changes);
    let c=keep.get(r.id);if(c){c.form=f;c.map=map;c.cache={};c._dot=null;c.name=r.name;c.rarity=r.rarity;}else c=new Racer({id:r.id,name:r.name,form:f,map,guest:r.guest,rarity:r.rarity});
    list.push(c);});
  RC.racers=list;if(RC.phase!=='running'&&RC.phase!=='countdown')raceReset();
  $('raceEmpty').hidden=!!list.length;$('raceStart').disabled=!list.length;
}
// "(guest)" in Pet Forge's sandbox; in the game, whose cat it is, or a house cat.
function raceWho(r){if(!LIVE)return r.guest?' <small>(guest)</small>':'';return r.owner?` <small>${esc(r.owner)}’s</small>`:' <small title="A house cat" aria-label="house cat">🏠</small>';}
function raceReset(){
  RC.phase='ready';RC.order=[];RC.cam=0;RC.leader=null;
  RC.racers.forEach((r,i)=>{r.lane=i;r.x=RACE.startX-6;r.done=false;r.reacting=0;r.place=0;r.setState('idle');});
  $('raceResultsTitle').textContent='Line-up';
  $('raceResults').innerHTML=RC.racers.map(r=>`<li><b>Lane ${r.lane+1}</b> ${r.rarity?rarityDot(r.rarity):''}<span>${esc(r.name)}${raceWho(r)}</span></li>`).join('');
  $('raceStart').textContent='▶ Start race';$('raceStart').disabled=!RC.racers.length;
}

/* ---------- the race script ----------
   Each pet has a steady baseline pace that would make it finish at its own time T
   (winner 60 s, the rest a fraction of a second apart, in the chosen order).
   On top of that come "surges": a pet speeds up to take the lead, then eases off
   and drifts back. A surge always ends before the finish, so the final order holds. */
const RACE_START=()=>RACE.startX-6, RACE_LEN=()=>RACE.finishX+4-RACE_START();
const baseX=(r,t)=>RACE_START()+RACE_LEN()*Math.min(1,t/r.T);
function surgeAt(s,t){ // smooth hump: rise over rise ms, hold briefly, fall over fall ms
  if(t<=s.t0||t>=s.t1)return 0;
  if(t<s.tp)return s.A*Math.sin(Math.PI/2*(t-s.t0)/(s.tp-s.t0));
  if(t<s.th)return s.A;
  return s.A*Math.cos(Math.PI/2*(t-s.th)/(s.t1-s.th));
}
// Spread: each pet gets its own place in the pack early on (some up front, some trailing).
// It opens up over the first few seconds, holds through the middle, and fades away before the finish.
const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
function spreadAt(r,t){const e=r.spread;if(!e||t>=r.T)return 0;
  const up=smooth(t/e.rise),down=1-smooth((t-e.fadeFrom*r.T)/((e.fadeTo-e.fadeFrom)*r.T));return e.o*up*down;}
// comeback: the winner drifts back into the middle of the pack, then is released in the last 5 s
function holdAt(r,t){const h=r.hold;if(!h||t<=h.t0||t>=h.t3)return 0;
  if(t<h.t1)return h.D*smooth((t-h.t0)/(h.t1-h.t0));if(t<h.t2)return h.D;return h.D*(1-smooth((t-h.t2)/(h.t3-h.t2)));}
function rawX(r,t){let x=baseX(r,t)+spreadAt(r,t)-holdAt(r,t);for(const s of r.surges)x+=surgeAt(s,t);
  if(t<r.T)x+=r.nA*Math.sin(2*Math.PI*t/r.nP+r.nPh)*Math.sin(Math.PI*t/r.T);  // gentle jostling, zero at start and finish
  return Math.min(x,RACE.finishX+4);}
// `rand`: where the randomness comes from; `given`: the finishing order (winner first). In the game both come from
// the server (the race's seed and order), so every page watching plays exactly the same race.
function planRace(rand=Math.random,given=null){
  const R=rand,rnd=(a,b)=>a+R()*(b-a),pick=a=>a[Math.floor(R()*a.length)];
  const mix=a=>{const o=[...a];for(let i=o.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[o[i],o[j]]=[o[j],o[i]];}return o;};   // a fair shuffle, the same in every browser
  const order=given||mix(RC.racers);let T=RACE.winnerMs;
  // finish: some races are a photo finish, others string out more naturally
  const tight=R()<.4,gap=tight?[150,450]:[300,1600];
  order.forEach((r,i)=>{if(i)T+=rnd(gap[0],gap[1]);r.T=T;r.place=i+1;r.surges=[];r.nA=rnd(3,8);r.nP=rnd(5000,9000);r.nPh=rnd(0,6.28);});
  RC.order=order;RC.wire=R()<RACE.wireChance;
  // early spread, unrelated to who wins: evenly spaced slots across the pack, shuffled, with jitter
  const S=rnd(110,160),slots=mix(order),rise=rnd(4000,6500),fadeFrom=rnd(.5,.62),fadeTo=rnd(.88,.95);
  slots.forEach((r,k)=>{r.spread={o:(k/(slots.length-1||1)-.5)*S+rnd(-8,8),rise,fadeFrom,fadeTo};});
  if(RC.wire){const top=Math.max(...order.map(r=>r.spread.o));order[0].spread.o=top+14;}   // wire-to-wire: the winner breaks out in front
  RC.finishStyle=tight?'tight':'natural';
  const v=r=>RACE_LEN()/r.T;               // baseline speed (px per ms)
  let tp=rnd(5000,8000),prev=null;
  while(tp<RACE.winnerMs-15000){
    // who surges next: anyone but the last surger (in a wire-to-wire race, never past the winner — enforced below)
    const pool=order.filter(r=>r!==prev);const r=pick(pool);prev=r;
    // how far ahead it must get to lead at its peak: beat everyone's position at that moment
    const lead=Math.max(...order.filter(o=>o!==r).map(o=>rawX(o,tp)));
    const A=Math.max(10,lead-baseX(r,tp))+rnd(12,36);
    const rise=rnd(3500,6000),hold=rnd(1500,4000);
    // falling back must never mean running backwards: drift-back speed stays under 60% of its pace
    const fall=Math.max(rnd(6000,9000),A*Math.PI/2/(0.6*v(r)));
    const s={t0:tp-rise,tp,th:tp+hold,t1:tp+hold+fall,A};
    if(s.t1>r.T-2500){s.t1=r.T-2500;const f=s.t1-s.th;if(f<2000)break;s.A=Math.min(s.A,f*0.6*v(r)*2/Math.PI);}
    r.surges.push(s);
    tp+=rnd(7000,11000);
  }
  // 30%: a comeback finish (not in wire-to-wire races)
  RC.comeback=!RC.wire&&R()<RACE.comebackChance;order.forEach(r=>r.hold=null);
  if(RC.comeback){const w=order[0],tm=w.T-RACE.comebackMs;
    w.surges=w.surges.filter(s=>s.t1<tm-9000);                                   // no late surges of its own
    const xs=order.filter(o=>o!==w).map(o=>rawX(o,tm)).sort((a,b)=>a-b);
    const mid=xs[Math.floor(xs.length/2)];                                        // middle of the pack at that moment
    const D=Math.max(30,rawX(w,tm)-mid+rnd(0,8));
    const t1=tm-rnd(2500,4000),t0=t1-Math.max(6000,D*Math.PI/2/(0.4*v(w)));          // drift back gently (never backwards)
    w.hold={D,t0,t1,t2:tm,t3:w.T-200};}
}
function raceBegin(){
  if(!RC.racers.length)return;raceReset();planRace();
  RC.phase='countdown';RC.t0=performance.now();$('raceStart').disabled=true;$('raceStart').textContent='Racing…';
}
function raceUpdate(dt,now){
  if(RC.phase==='countdown'&&now-RC.t0>=3000){RC.phase='running';RC.t0+=3000;RC.racers.forEach(r=>r.setState('walk'));}
  if(RC.phase==='running'){const el=now-RC.t0;let all=true;
    const win=RC.order[0];
    for(const r of RC.order){                         // winner first so the wire-to-wire cap can use its position
      if(el<r.T){let x=rawX(r,el);
        if(RC.wire&&r!==win&&!win.done)x=Math.min(x,win.x-7);   // nobody gets past the winner
        r.x=Math.max(r.x,x);all=false;}                          // never step backwards
      else{const over=Math.min(1,(el-r.T)/RACE.reactMs);r.x=Math.max(r.x,RACE.finishX+4+Math.sin(over*Math.PI/2)*6);  // short coast past the line
        r.done=true;
        if(!r.reacting&&el-r.T>=RACE.reactMs){r.reacting=now;r.setState(raceReaction(r));}  // react 0.25 s after crossing, not when everyone is in
        if(!r.reacting)all=false;}}
    RC.leader=RC.racers.reduce((a,b)=>b.x>a.x?b:a,RC.racers[0]);
    if(all)raceFinish();}
  for(const r of RC.racers)r.step(dt);
  // camera follows the leader, keeping it about 60% across the screen
  const target=RC.phase==='running'||RC.phase==='results'?Math.max(...RC.racers.map(r=>r.x))-RACE.W*.62:0;
  const goal=Math.max(0,Math.min(RACE.MW-RACE.W,target));RC.cam+=(goal-RC.cam)*Math.min(1,dt/250);
}
function raceFinish(){
  RC.phase='results';RC.finishedAt=performance.now();
  $('raceResultsTitle').textContent=RC.wire?'Results — led from start to finish!':RC.comeback?'Results — a late charge from the pack!':'Results';
  $('raceResults').innerHTML=RC.order.map(r=>{const medal=['🥇','🥈','🥉'][r.place-1]||`<b>${r.place}.</b>`;
    const mood=r.place===1?'💗 happy':r.place<=RACE.angryUpTo?'💢 angry':'💧 sad';
    return `<li>${medal} ${r.rarity?rarityDot(r.rarity):''}<span>${esc(r.name)}${raceWho(r)}</span><em>${raceMoney(r)||(LIVE?`<span title="${mood.split(' ')[1]}" aria-label="${mood.split(' ')[1]}">${mood.split(' ')[0]}</span>`:mood)}</em></li>`;}).join('');   // in the game's pop-up: the mood's emoji, so names fit
  $('raceStart').disabled=false;$('raceStart').textContent='↻ Race again';
  if(LIVE)raceLiveDone();
}

/* ---------- drawing: pixel scene on a small canvas, text on the big one ---------- */
RC.canvas=$('raceCanvas');RC.ctx=RC.canvas.getContext('2d');
RC.lo=document.createElement('canvas');RC.lo.width=RACE.W;RC.lo.height=RACE.H;RC.lctx=RC.lo.getContext('2d');
function raceSize(){const w=$('raceWrap').clientWidth;if(!w)return;const dpr=Math.min(2,devicePixelRatio||1);
  const k=Math.max(1,Math.round(w*dpr/RACE.W));if(RC.canvas.width!==RACE.W*k){RC.canvas.width=RACE.W*k;RC.canvas.height=RACE.H*k;}RC.k=k;}
new ResizeObserver(raceSize).observe($('raceWrap'));
const laneFeet=i=>Math.round(RACE.laneTop+i*RACE.laneH+5);
const ordinal=n=>{const s=['TH','ST','ND','RD'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
function raceDraw(now){
  RC.bgs=RC.bgs||{};const key=RC.map+'|'+effWeather();if(!RC.bgs[key])RC.bgs[key]=drawRaceMap(RC.map,effWeather());
  const g=RC.lctx;g.imageSmoothingEnabled=false;const cam=Math.round(RC.cam);
  g.drawImage(RC.bgs[key],cam,0,RACE.W,RACE.H,0,0,RACE.W,RACE.H);
  const byLane=[...RC.racers].sort((a,b)=>a.lane-b.lane);
  for(const r of byLane){const A=r.anim(r.state),f=A.frames[r.cur]||A.frames[0],cr=r.form.crop;
    const sx=Math.round(r.x)-cam;const fy=laneFeet(r.lane);let dx=sx-Math.round(cr.w/2)+nudgeOf(r.form),dy=fy-(cr.h-1)+sinkOf(r.form);
    r._sx=sx;if(sx<-cr.w||sx>RACE.W+cr.w)continue;
    if(A.hover)dy-=Math.round(HOVER_AMP*(.6+(Math.sin(r.clock/HOVER_MS*Math.PI*2)+1)/2));
    if(A.shake)dx+=Math.round(Math.sin(r.clock/SHAKE_MS*Math.PI*2)*A.shakeAmt);
    if(A.ushake)dy+=Math.round(Math.sin(r.clock/USHAKE_MS*Math.PI*2)*A.ushakeAmt);
    if(r.reacting&&r.place===1)dy-=Math.round(Math.abs(Math.sin((now-r.reacting)/600*Math.PI))*5);
    g.fillStyle='rgba(60,30,10,.35)';g.fillRect(Math.round(sx-cr.w*.28),fy,Math.round(cr.w*.56),2);
    g.save();if(r.artFaces()!==1){g.translate(sx*2,0);g.scale(-1,1);}
    g.drawImage(f,cr.x,cr.y,cr.w,cr.h,dx,dy,cr.w,cr.h);g.restore();r._top=dy+topPad(r);}
  weatherStep(RC.dt||16,now,g,cam);   // rain, splashes, lightning on top of the pets
  // progress bar (pixel style): one dot per pet in its own colour, the leader's dot is bigger
  const bx=60,bw=264,by=6;g.fillStyle='rgba(20,10,5,.55)';g.fillRect(bx-3,by-3,bw+6,8);g.fillStyle='#e9dcc3';g.fillRect(bx,by,bw,2);
  for(let y=0;y<2;y++)for(let x=0;x<4;x++)g.fillStyle=((x+y)%2)?'#1b1b22':'#f4f1ea',g.fillRect(bx+bw+x-1,by-2+y*2,1,2);
  const L=RACE_LEN();for(const r of [...RC.racers].sort((a,b)=>a.x-b.x)){const p=Math.max(0,Math.min(1,(r.x-RACE_START())/L));
    const big=r===RC.leader&&RC.phase==='running';g.fillStyle='#1b1b22';g.fillRect(Math.round(bx+p*bw)-(big?2:1),by-(big?2:1),big?5:3,big?5:3);
    g.fillStyle=r.dotColor();g.fillRect(Math.round(bx+p*bw)-(big?1:0),by-(big?1:0),big?3:1,big?3:1);}
  const G=RC.ctx,k=RC.k;G.imageSmoothingEnabled=false;G.drawImage(RC.lo,0,0,RACE.W*k,RACE.H*k);
  // crisp pixel-font text at full resolution
  G.textBaseline='middle';
  if(cam<260&&RACE_MAPS[RC.map].banner){G.textAlign='center';G.font=`700 ${8*k}px 'Pixelify Sans', monospace`;G.fillStyle='#ffcf3f';G.fillText('PET DERBY',(192-cam)*k,54*k);}
  G.textAlign='center';G.font=`700 ${5*k}px 'Pixelify Sans', monospace`;G.fillStyle='#ffffff';
  for(let x=RACE.startX+300,m=1;x<RACE.finishX-60;x+=300,m++){const sx=x-cam;if(sx>-10&&sx<RACE.W+10)G.fillText(String(m*300),(sx+1)*k,100*k);}
  G.textAlign='left';G.font=`700 ${5*k}px 'Pixelify Sans', monospace`;
  RC.racers.forEach(r=>{const y=laneFeet(r.lane)-2;G.fillStyle='rgba(20,10,5,.55)';G.fillRect(1*k,(y-3)*k,10*k,6*k);G.fillStyle='#f4f1ea';G.fillText(String(r.lane+1),3*k,y*k);});
  // clock + leader
  if(RC.phase==='running'||RC.phase==='results'){const el=RC.phase==='running'?now-RC.t0:RC.order[0].T;const s=Math.floor(el/1000);
    G.font=`700 ${6*k}px 'Pixelify Sans', monospace`;G.fillStyle='rgba(20,10,5,.6)';G.fillRect(330*k,1*k,52*k,11*k);G.fillStyle='#ffe066';G.textAlign='center';
    G.fillText(`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`,356*k,6.5*k);
    if(RC.phase==='running'&&RC.leader){G.textAlign='left';G.font=`700 ${5*k}px 'Pixelify Sans', monospace`;const t='LEAD: '+RC.leader.name.toUpperCase();
      const w=G.measureText(t).width;G.fillStyle='rgba(20,10,5,.6)';G.fillRect(2*k,14*k,w+4*k,8*k);G.fillStyle='#ffffff';G.fillText(t,4*k,18*k);}}
  if(RC.phase==='countdown'){const left=3-Math.floor((now-RC.t0)/1000);bigText(left>0?String(left):'GO!',k);}
  else if(RC.phase==='running'&&now-RC.t0<700)bigText('GO!',k);
  if(RC.phase==='running'||RC.phase==='results'){G.textAlign='center';
    // each placing appears as that pet finishes
    for(const r of RC.order){if(!r.reacting)continue;const win=r.place===1;const lab=win?'1ST!':ordinal(r.place);G.font=`700 ${(win?7:5)*k}px 'Pixelify Sans', monospace`;
      const w=G.measureText(lab).width+4*k;const cw=r.form.crop.w;
      const cx=win?r._sx:r._sx-cw/2-2-w/k/2, y=win?r._top-6:laneFeet(r.lane)-2;
      G.fillStyle=win?'#ffcf3f':'rgba(20,10,5,.75)';G.fillRect(cx*k-w/2,(y-3.5)*k,w,7*k);
      G.fillStyle=win?'#3b1f4f':'#f4f1ea';G.fillText(lab,cx*k,y*k);}}
}
function bigText(t,k){const G=RC.ctx;G.textAlign='center';G.font=`700 ${28*k}px 'Pixelify Sans', monospace`;
  G.fillStyle='#1b1b22';G.fillText(t,192*k+2*k,150*k+2*k);G.fillStyle='#ffcf3f';G.fillText(t,192*k,150*k);}
function raceLoop(t){if(!RC.running)return;const dt=Math.min(100,t-(RC.last||t));RC.last=t;RC.dt=dt;raceUpdate(dt,t);raceDraw(t);requestAnimationFrame(raceLoop);}
function raceStartLoop(){if(RC.running)return;RC.running=true;RC.last=0;raceSize();requestAnimationFrame(raceLoop);}
function raceStopLoop(){RC.running=false;}
$('raceStart').onclick=()=>raceBegin();
[...$('mapSeg').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===RC.map));
function syncWeatherUI(){const indoor=!!RACE_MAPS[RC.map].indoor;[...$('weatherSeg').children].forEach(b=>b.disabled=indoor);
  $('weatherSeg').title=indoor?'Indoors — no weather on this map':'';$('weatherSeg').style.opacity=indoor?.4:1;}
seg('mapSeg',v=>{RC.map=v;WX.drops=[];WX.splashes=[];syncWeatherUI();try{localStorage.setItem('forge.raceMap',v);}catch(e){}});
[...$('weatherSeg').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===RC.weather));
syncWeatherUI();
seg('weatherSeg',v=>{RC.weather=v;WX.drops=[];WX.splashes=[];try{localStorage.setItem('forge.weather',v);}catch(e){}});
$('raceShuffle').onclick=()=>{if(RC.phase==='running'||RC.phase==='countdown')return;RC.guests.length=0;RC.racers=[];raceSync();};

/* ===================================================================
   RUN — side-scrolling 3-lane runner through a ruined city.
   Square 216×216 pixel canvas, scaled up crisply. 1 map pixel = 1 art pixel.
   Keys: ↑/W lane up, ↓/S lane down, Space jump.  Touch: tap a lane to move, double-tap to jump.
   =================================================================== */
// The run itself (speeds, obstacles, hits, everything that decides how far and how fast you get) is in
// ruin-engine.js, shared with the server, which plays every Catflix No Chill run again from the same seed and what
// the player did. This page draws it, and adds what's only for show (dust, sparks, lightning, the pets' moods).
const RE=RuinEngine,RUN=RE.RUN,OB=RE.OB;
const RN={state:'ready',pet:null,petId:null,guests:[],dist:0,mult:1,lane:1,laneF:1,obs:[],hp:RUN.maxHp,foodBags:0,storm:null,now:0,tick:0,jy:0,
  best:0,banner:null,over:null,overAt:0,lastTap:0,running:false,last:0,layers:null,smoke:[],fx:[],bolts:[],boltFlash:0,flash:0,acc:0,pending:[],inputs:[],enemyPool:[]};
try{RN.best=+localStorage.getItem('forge.runBest')||0;}catch(e){}

/* ---------- pixel art: parallax layers (each a tile that repeats) ---------- */
function runLayers(){
  const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};
  const rnd=seeded(41);const R=a=>a[Math.floor(rnd()*a.length)];
  // sky (static)
  const [sky,gs]=mk(RUN.S,RUN.S);const bands=['#2e2233','#43293a','#5e333c','#7d433d','#a0583c','#c47443','#d99355'];
  bands.forEach((c,i)=>{gs.fillStyle=c;gs.fillRect(0,i*16,RUN.S,16);});
  for(let i=1;i<bands.length;i++)for(let x=0;x<RUN.S;x++)if(x%2===0){gs.fillStyle=bands[i-1];gs.fillRect(x,i*16,1,1);gs.fillStyle=bands[i];gs.fillRect(x+1,i*16-1,1,1);}
  gs.fillStyle=bands[6];gs.fillRect(0,112,RUN.S,40);
  for(let y=-9;y<=9;y++)for(let x=-9;x<=9;x++)if(x*x+y*y<=81){gs.fillStyle=y>3?'#d99355':(x*x+y*y<40?'#ffe2a8':'#f4c27a');gs.fillRect(150+x,62+y,1,1);}  // hazy sun behind smog
  for(let k=0;k<5;k++){gs.fillStyle='rgba(60,35,40,.35)';gs.fillRect(120+k*9,56+k*3,40,2);}
  // far ruined skyline
  const [far,gf]=mk(512,140);
  for(let x=0;x<512;){const w=10+Math.floor(rnd()*22),top=40+Math.floor(rnd()*50);gf.fillStyle='#4a3340';gf.fillRect(x,top,w,140-top);
    for(let k=0;k<w;k++){const bite=Math.floor(rnd()*6*(rnd()<.5?1:0));gf.clearRect(x+k,top,1,bite);}            // broken, jagged tops
    gf.fillStyle='#3a2733';for(let wy=top+5;wy<130;wy+=5)for(let wx=x+2;wx<x+w-1;wx+=3)if(rnd()<.35)gf.fillRect(wx,wy,1,2);
    if(rnd()<.25){gf.fillStyle='#4a3340';gf.fillRect(x+Math.floor(w/2),top-10,1,10);}                               // bent antenna
    x+=w+Math.floor(rnd()*4);}
  // mid layer: closer wrecked towers with holes, vines and a broken overpass
  const [mid,gm]=mk(640,150);
  for(let x=0;x<640;){const w=18+Math.floor(rnd()*28),top=56+Math.floor(rnd()*44);
    gm.fillStyle='#35262e';gm.fillRect(x,top,w,150-top);gm.fillStyle='#43303a';gm.fillRect(x,top,1,150-top);
    for(let k=0;k<w;k+=2){const bite=Math.floor(rnd()*9*(k>w*.3&&k<w*.8?1:.3));gm.clearRect(x+k,top,2,bite);}
    for(let wy=top+6;wy<140;wy+=7)for(let wx=x+3;wx<x+w-3;wx+=5){gm.fillStyle=rnd()<.15?'#6b3a2c':'#1e151b';gm.fillRect(wx,wy,3,4);}
    if(rnd()<.5){gm.fillStyle='#4f6b3a';for(let v=0;v<10;v++){let vx=x+Math.floor(rnd()*w),vy=top+2;for(let k=0;k<14+rnd()*20;k++){gm.fillRect(vx,vy,1,1);vy++;if(rnd()<.3)vx+=rnd()<.5?-1:1;}}}
    if(rnd()<.3){gm.fillStyle='#d97a3a';gm.fillRect(x+4+Math.floor(rnd()*(w-8)),top+10+Math.floor(rnd()*20),2,2);}   // distant fire
    x+=w+6+Math.floor(rnd()*18);}
  gm.fillStyle='#2b1f26';gm.fillRect(380,96,200,7);gm.fillStyle='#3c2c34';gm.fillRect(380,96,200,1);
  for(let px=392;px<580;px+=46)gm.fillRect(px,103,6,47);
  gm.clearRect(470,96,26,7);gm.fillStyle='#7a5a4a';for(let k=0;k<5;k++)gm.fillRect(470+k*5,103,1,4+k%3*3);          // snapped deck + rebar
  // near roadside: bent street lamps, broken guardrail, signs, weeds
  const [near,gn]=mk(400,40);
  gn.fillStyle='#5a4e4a';gn.fillRect(0,30,400,3);for(let x=0;x<400;x+=10){gn.fillRect(x,26,2,8);}
  gn.clearRect(130,26,30,8);gn.clearRect(300,30,18,3);gn.fillStyle='#6b5d58';gn.fillRect(130,33,8,2);gn.fillRect(150,31,6,2);
  for(let x=40;x<400;x+=120){gn.fillStyle='#3a3236';gn.fillRect(x,4,2,30);for(let k=0;k<8;k++)gn.fillRect(x+2+k,4-Math.floor(k/3),1,2);}
  gn.fillStyle='#3d5a32';for(let x=0;x<400;x+=3)if(rnd()<.5)gn.fillRect(x,34+Math.floor(rnd()*4),1,3);
  gn.fillStyle='#8a6a2a';gn.fillRect(250,12,12,8);gn.fillStyle='#3a3236';gn.fillRect(255,20,2,14);gn.fillStyle='#5a4a20';gn.fillRect(252,15,8,1);
  // road: three cracked asphalt lanes with faded dashes
  const [road,gr]=mk(256,80);const lanes=['#4b4649','#454043','#4e494c'];
  for(let i=0;i<3;i++){gr.fillStyle=lanes[i];gr.fillRect(0,i*23,256,23);}
  gr.fillStyle='#3a3538';gr.fillRect(0,0,256,2);
  for(let i=1;i<3;i++)for(let x=0;x<256;x+=16){if(rnd()<.25)continue;gr.fillStyle='#9d8f68';gr.fillRect(x,i*23-1,8,1);}
  for(let k=0;k<700;k++){gr.fillStyle=R(['#3e393c','#575255','#5c5254']);gr.fillRect(Math.floor(rnd()*256),2+Math.floor(rnd()*66),1,1);}
  for(let c=0;c<9;c++){let x=Math.floor(rnd()*256),y=4+Math.floor(rnd()*60);gr.fillStyle='#2c282b';for(let k=0;k<10+rnd()*14;k++){gr.fillRect(x,y,1,1);x++;if(rnd()<.5)y+=rnd()<.5?-1:1;}}
  gr.fillStyle='#4f6b3a';for(let k=0;k<40;k++)gr.fillRect(Math.floor(rnd()*256),Math.floor(rnd()*68),1,2);
  gr.fillStyle='#6b6266';gr.fillRect(0,69,256,2);gr.fillStyle='#2a2427';gr.fillRect(0,71,256,9);
  for(let x=0;x<256;x+=5+Math.floor(rnd()*7)){gr.fillStyle=R(['#5a5254','#6b6266','#4a4245']);gr.fillRect(x,71+Math.floor(rnd()*5),2+Math.floor(rnd()*3),2);}
  // stormy night versions: a dark sky, darkened buildings, and the windows (and street lamps) lit up like a skyline
  const [skyN,gsn]=mk(RUN.S,RUN.S);const nb=['#0c0b18','#11101f','#161426','#1b182c','#211c31','#272036','#2c233a'];
  nb.forEach((c,i)=>{gsn.fillStyle=c;gsn.fillRect(0,i*16,RUN.S,16);});gsn.fillStyle=nb[6];gsn.fillRect(0,112,RUN.S,40);
  const rc=seeded(7);for(let k=0;k<9;k++){const cx=Math.floor(rc()*RUN.S),cy=6+Math.floor(rc()*60),w=24+Math.floor(rc()*40);
    for(let j=0;j<5;j++){gsn.fillStyle=j<2?'#2a2840':'#1f1d33';gsn.fillRect(cx-w/2+j*3,cy+j,w-j*6,1);}}                 // heavy cloud banks
  const dark=(c,col)=>{const [o,go]=mk(c.width,c.height);go.drawImage(c,0,0);go.globalCompositeOperation='multiply';go.fillStyle=col;go.fillRect(0,0,c.width,c.height);
    go.globalCompositeOperation='destination-in';go.drawImage(c,0,0);return o;};
  const farN=dark(far,'#5a5a90'),midN=dark(mid,'#55558a'),nearN=dark(near,'#6a6a9a');
  const rl=seeded(99);const [farL,gfl]=mk(512,140),[midL,gml]=mk(640,150),[nearL,gnl]=mk(400,40);
  // re-trace the window grids from the layers' own pixels so lights land exactly on the windows
  const fd=gf.getImageData(0,0,512,140).data,md=gm.getImageData(0,0,640,150).data;
  for(let y=0;y<140;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;if(fd[i]===0x3a&&fd[i+1]===0x27&&fd[i+2]===0x33&&fd[i+3]===255&&rl()<.62){gfl.fillStyle=rl()<.8?'#ffd98a':'#fff3c8';gfl.fillRect(x,y,1,1);}}
  const lit=new Map();for(let y=0;y<150;y++)for(let x=0;x<640;x++){const i=(y*640+x)*4;const win=(md[i]===0x1e&&md[i+1]===0x15&&md[i+2]===0x1b)||(md[i]===0x6b&&md[i+1]===0x3a&&md[i+2]===0x2c);
    if(win&&md[i+3]===255){const key=Math.floor(x/5)+','+Math.floor(y/7);if(!lit.has(key))lit.set(key,rl()<.5);       // each window is either on or off
      if(lit.get(key)){gml.fillStyle=(x+y)%5===0?'#fff1c0':'#ffcf6a';gml.fillRect(x,y,1,1);}}}
  for(let x=40;x<400;x+=120){gnl.fillStyle='#fff1b0';gnl.fillRect(x+7,4,3,2);gnl.fillStyle='rgba(255,220,140,.35)';gnl.fillRect(x+4,6,9,4);gnl.fillRect(x+6,10,5,6);}   // lamps flicker on
  return {sky,far,mid,near,road,skyN,farN,midN,nearN,farL,midL,nearL};
}

/* ---------- obstacle sprites ---------- */
function runSprites(){
  const mk=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');const p=(x,y,a,b,col)=>{g.fillStyle=col;g.fillRect(x,y,a,b);};fn(p,g);return c;};
  return {
    rubble:mk(18,10,p=>{p(1,5,7,5,'#7a7275');p(1,5,7,1,'#9a9295');p(7,3,8,7,'#6a6265');p(7,3,8,1,'#8a8285');p(12,6,6,4,'#857d80');p(4,2,1,4,'#8a5a3a');p(14,1,1,3,'#8a5a3a');p(0,9,18,1,'#2a2427');}),
    tires:mk(14,9,p=>{p(1,3,6,6,'#1e1b1d');p(3,5,2,2,'#4b4649');p(7,1,6,6,'#252124');p(9,3,2,2,'#4b4649');p(5,0,6,4,'#1e1b1d');p(7,1,2,2,'#4b4649');}),
    car:mk(38,33,p=>{  // a tall wrecked SUV with junk strapped to the roof — clearly not jumpable
      p(10,0,7,3,'#8a6a3a');p(10,0,7,1,'#a88a52');p(13,0,1,3,'#6a4a2a');p(20,1,8,2,'#1e1b1d');p(22,1,3,1,'#4b4649');p(7,3,24,1,'#3a2a22');p(8,3,1,2,'#3a2a22');p(29,3,1,2,'#3a2a22');
      p(5,5,28,13,'#6a3e2a');p(5,5,28,1,'#8a5a3e');p(4,6,1,12,'#5a3424');
      p(7,7,8,8,'#2a3a44');p(17,7,8,8,'#2a3a44');p(27,7,5,8,'#2a3a44');p(8,8,2,3,'#4a6a7a');p(18,8,2,2,'#4a6a7a');
      p(20,10,1,1,'#8aa0ac');p(21,11,1,1,'#8aa0ac');p(22,12,1,1,'#8aa0ac');p(21,9,1,1,'#8aa0ac');                       // cracked glass
      p(2,17,34,11,'#7a4a32');p(2,17,34,1,'#9a6a4a');p(16,18,1,9,'#5a3424');p(26,18,1,9,'#5a3424');p(12,21,3,1,'#4a2e22');p(22,21,3,1,'#4a2e22');
      for(let k=0;k<16;k++)p(3+Math.floor(k*2.1),18+(k%4),1,1,'#a3623a');p(30,14,4,4,'#5a3a2a');
      p(3,26,32,2,'#4a2e22');p(0,20,3,5,'#5a5254');p(35,19,3,4,'#d8c27a');p(35,19,3,1,'#f2e0a0');
      p(5,27,8,6,'#1a1719');p(25,27,8,6,'#1a1719');p(7,29,4,2,'#4b4649');p(27,29,4,2,'#4b4649');}),
    food:mk(11,13,p=>{p(1,2,9,11,'#c98a4a');p(1,2,9,1,'#e0a866');p(2,0,7,2,'#a86a34');p(3,0,5,1,'#c98a4a');p(9,3,1,10,'#a06630');
      p(2,5,7,5,'#f4ead8');p(3,7,4,2,'#e86a5a');p(7,7,1,1,'#e86a5a');p(6,6,1,1,'#e86a5a');p(6,9,1,1,'#e86a5a');p(4,7,1,1,'#2a1a1a');      // label with a little fish
      p(1,12,9,1,'#7a4a24');}),
    bolt:mk(11,14,p=>{const Y='#ffe14a',H='#fff8c8',D='#c98a10';
      p(5,0,4,1,D);p(4,1,4,2,Y);p(3,3,4,2,Y);p(2,5,7,2,Y);p(5,7,3,2,Y);p(4,9,3,2,Y);p(3,11,2,2,Y);p(2,13,2,1,D);
      p(5,1,2,1,H);p(4,3,2,1,H);p(3,5,3,1,H);p(5,7,1,1,H);p(8,6,1,2,D);p(6,9,1,1,D);}),
    slab:mk(16,28,p=>{p(2,2,12,26,'#8a8285');p(2,2,12,1,'#aaa2a5');p(13,2,1,26,'#6a6265');for(let y=6;y<26;y+=6)p(3,y,10,1,'#767073');
      p(5,0,1,4,'#8a5a3a');p(10,0,1,3,'#8a5a3a');p(0,24,16,4,'#6a6265');p(4,12,3,2,'#5a5255');}),
    boulder:mk(20,20,p=>{p(3,4,14,14,'#7a7275');p(3,4,14,2,'#9a9295');p(1,8,3,9,'#6a6265');p(16,7,3,10,'#6a6265');p(6,8,3,3,'#5a5255');p(11,12,4,2,'#5a5255');p(2,17,16,3,'#5a5255');p(9,2,1,4,'#8a5a3a');}),
  };
}
/* ---------- a run: started from a seed, stepped 60 times a second ---------- */
function runReset(){Object.assign(RN,{state:'ready',dist:0,mult:1,lane:1,laneF:1,obs:[],hp:RUN.maxHp,foodBags:0,storm:null,ko:null,jy:0,now:0,tick:0,
  petBack:0,stopUntil:0,over:null,overAt:0,ended:false,banner:null,fx:[],bolts:[],boltFlash:0,flash:0,acc:0,pending:[],inputs:[],wantLane:undefined});
  if(RN.pet)RN.pet.setState('idle');}
function runStart(seed){runReset();RE.reset(RN,seed??Math.floor(Math.random()*0x7fffffff));if(RN.pet)RN.pet.setState('walk');if(LIVE)runLiveRender();}
// What the player does is queued, and played at the start of the next tick (and recorded, for the server).
function runInput(code){if(RN.state==='running')RN.pending.push(code);}
const laneNow=()=>RN.wantLane??RN.lane;   // the lane they're heading for, with presses not played yet
function setLane(n){if(RN.state!=='running')return;n=Math.max(0,Math.min(2,n));RN.wantLane=n;runInput(n);}
function doJump(){runInput(RE.JUMP);}
function releaseJump(){runInput(RE.RELEASE);}
// The pets' moods follow the run: walking, angry when bumped or crashed, sad when knocked out or fallen.
function runPetState(){
  if(RN.state==='ready')return 'idle';
  if(RN.state==='over')return RN.over&&RN.over.why==='crash'?'angry':RN.over&&RN.over.why==='stopped'?'idle':'sad';
  if(RN.ko)return RN.now>=RN.ko.sadAt?'sad':'angry';
  if(RN.petBack&&RN.now<RN.petBack)return 'angry';
  return 'walk';}
// An enemy pet's looks: one of the other pets (the engine only says which, as a number).
function enemyPet(o){if(o.pet)return o.pet;const pool=RN.enemyPool.length?RN.enemyPool:(RN.pet?[RN.pet]:[]);const t=pool[o.look%pool.length];if(!t)return null;
  o.pet=new Racer({id:'enemy',name:t.name,form:t.form,map:t.map,guest:true});o.pet.cache=t.cache;o.pet.setState('walk');return o.pet;}
const POOF={dust:['#e8e2ea','#bdb4c0','#8f8794'],zap:['#fff6a8','#ffffff','#5a5060','#2a2430'],heart:['#ff5a7a','#ffd1dc','#ffffff'],food:['#c98a4a','#f4ead8','#e86a5a'],bolt:['#ffe14a','#fff8c8','#ffffff']};
function runEvent(ev,now){
  if(ev.type==='poof'){runPoof(ev.x,ev.y,now,POOF[ev.colors]||POOF.dust);if(ev.colors==='zap')runPoof(ev.x,ev.y+6,now,['#3a3440','#5a5060']);}
  else if(ev.type==='banner')RN.banner={t:now,txt:ev.text};
  else if(ev.type==='hit')RN.flash=now;
  else if(ev.type==='strike'){RN.boltFlash=now;RN.banner={t:now,txt:ev.text};
    const hits=ev.hits.length?ev.hits:[{x:RN.dist+RUN.S*(.45+Math.random()*.45),y:RUN.laneY[Math.floor(Math.random()*3)]-2}];   // the first strike with no pets about hits the road
    for(const h of hits)RN.bolts.push({x:h.x,y:h.y,seed:Math.random()*1e4,t:now});}
}
function runUpdate(dt,now){
  if(RN.state==='running'){
    RN.acc+=dt;
    while(RN.acc>=RE.TICK_MS&&RN.state==='running'){RN.acc-=RE.TICK_MS;
      const codes=RN.pending.length?RN.pending.splice(0):null;
      if(codes){for(const c of codes)RN.inputs.push(RN.tick*8+c);RN.wantLane=undefined;}
      for(const ev of RE.step(RN,codes))runEvent(ev,now);}
    if(RN.state==='over')runOver(now);}
  const pet=RN.pet;if(pet){pet.setState(runPetState());const stopped=RN.now<(RN.stopUntil||0);pet.step(dt*(RN.state==='running'&&!stopped?Math.min(1.8,RN.mult):1));}
  for(const o of RN.obs)if(o.kind==='enemy'){const p=enemyPet(o);if(p){p.setState(o.hitAt||o.zap?'angry':'walk');p.step(dt);}}
  if(RN.banner&&now-RN.banner.t>1400)RN.banner=null;
  if(RN.state==='over'&&RN.over&&RN.over.fall){RN.over.vy+=dt*.0009;RN.over.dy+=RN.over.vy*dt;}
}
function runPoof(x,y,now,cols){for(let i=0;i<14;i++){const a=Math.random()*Math.PI*2,sp=.02+Math.random()*.05;
  RN.fx.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.02,t:now,life:350+Math.random()*250,c:pick(cols)});}}
// The run's over (once): the best kept here, and in the game the server plays it again and scores it.
function runOver(now){if(RN.ended)return;RN.ended=true;RN.overAt=now;
  Object.assign(RN.over,{fall:RN.over.why==='fell',vy:0,dy:0});
  const score=RE.metres(RN);if(score>RN.best){RN.best=score;RN.newBest=true;try{localStorage.setItem('forge.runBest',score);}catch(e){}}else RN.newBest=false;
  $('runBest').textContent=RN.best+' m';
  if(LIVE)runLiveFinish();
}
// Stopping mid-run (leaving the tab): the run ends where it is. In the game it still counts.
function runStopHere(){if(RN.state!=='running')return;RN.state='over';RN.over={t:RN.now,why:'stopped'};runOver(performance.now());}

/* ---------- draw ---------- */
const RNc={canvas:null,ctx:null,lo:null,lctx:null,k:1};
RNc.canvas=$('runCanvas');RNc.ctx=RNc.canvas.getContext('2d');
RNc.lo=document.createElement('canvas');RNc.lo.width=RUN.S;RNc.lo.height=RUN.S;RNc.lctx=RNc.lo.getContext('2d');
function runSize(){const w=$('runWrap').clientWidth;if(!w)return;const dpr=Math.min(2,devicePixelRatio||1);const k=Math.max(1,Math.round(w*dpr/RUN.S));
  if(RNc.canvas.width!==RUN.S*k){RNc.canvas.width=RUN.S*k;RNc.canvas.height=RUN.S*k;}RNc.k=k;}
new ResizeObserver(runSize).observe($('runWrap'));
function tileX(g,img,off,y){const w=img.width;let x=-(((off%w)+w)%w);for(;x<RUN.S;x+=w)g.drawImage(img,Math.round(x),y);}
function runDraw(now){
  if(!RN.layers){RN.layers=runLayers();RN.sprites=runSprites();}
  const L=RN.layers,g=RNc.lctx,d=RN.dist;g.imageSmoothingEnabled=false;
  const I=stormLevel(RN.now);   // 0 = normal sunset, 1 = full storm
  g.drawImage(L.sky,0,0);if(I>0){g.globalAlpha=I;g.drawImage(L.skyN,0,0);g.globalAlpha=1;}
  tileX(g,L.far,d*.12,12);if(I>0){g.globalAlpha=I;tileX(g,L.farN,d*.12,12);tileX(g,L.farL,d*.12,12);g.globalAlpha=1;}
  // drifting smoke columns
  if(RN.smoke.length<7)RN.smoke.push({x:Math.random()*RUN.S*1.5,y:110,r:2+Math.random()*3,t:now});
  for(const s of RN.smoke){const age=(now-s.t)/1000;s.y=110-age*9;const sx=((s.x-d*.12)%(RUN.S*1.5)+RUN.S*1.5)%(RUN.S*1.5)-20;
    g.fillStyle=`rgba(40,30,35,${Math.max(0,.5-age*.06)})`;const r=Math.round(s.r+age*1.5);g.fillRect(Math.round(sx-r+Math.sin(age)*3),Math.round(s.y),r*2,r*2);if(s.y<10)Object.assign(s,{y:110,t:now,x:Math.random()*RUN.S*1.5});}
  tileX(g,L.mid,d*.35,0);if(I>0){g.globalAlpha=I;tileX(g,L.midN,d*.35,0);tileX(g,L.midL,d*.35,0);g.globalAlpha=1;}
  tileX(g,L.near,d*.7,104);if(I>0){g.globalAlpha=I;tileX(g,L.nearN,d*.7,104);tileX(g,L.nearL,d*.7,104);g.globalAlpha=1;}
  tileX(g,L.road,d,136);if(I>0){g.fillStyle=`rgba(14,12,34,${.38*I})`;g.fillRect(0,136,RUN.S,RUN.S-136);}
  // holes are part of the ground, so they go under everything else
  const sx=o=>Math.round(o.x-d);
  for(const o of RN.obs)if(o.kind==='hole'){const y=RUN.laneY[o.lane]-10,x=sx(o);
    g.fillStyle='#120e10';g.fillRect(x,y,o.w,12);g.fillStyle='#2a2427';g.fillRect(x,y+10,o.w,2);g.fillStyle='#6b6266';
    for(let k=0;k<o.w;k+=3)g.fillRect(x+k,y-(k%2),2,1);g.fillStyle='#1e181b';g.fillRect(x+2,y+2,o.w-4,3);
    if(o.k==='crack'){g.fillStyle='#4b4649';g.fillRect(x,y,2,12);g.fillRect(x+o.w-2,y,2,12);}}
  // sprites lane by lane (back to front), player slotted into its lane
  const pl=Math.round(RN.laneF),jy=RN.state==='running'?RN.jy:0;
  for(let lane=0;lane<3;lane++){
    for(const o of RN.obs){if(o.kind==='hole'||o.lane!==lane)continue;const fy=RUN.laneY[lane];
      if(o.kind==='enemy'){runDrawEnemy(g,o,fy,sx(o));continue;}
      if(o.kind==='pickup'){const hx=sx(o),bob=Math.round(Math.sin(now/180)*2);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(hx,fy,10,2);
        if(o.k==='heart')drawHeart(g,hx,fy-14+bob,true,true);
        else{const spr=RN.sprites[o.k];if(o.k==='bolt'){const pulse=.18+.12*Math.sin(now/120),ccx=hx+5,ccy=fy-9+bob;      // round pixel glow behind the bolt
          for(let yy=-9;yy<=9;yy++){const half=Math.round(Math.sqrt(Math.max(0,90-yy*yy)));g.fillStyle=`rgba(255,225,74,${pulse*.55})`;g.fillRect(ccx-half,ccy+yy,half*2+1,1);
            const inner=Math.round(Math.sqrt(Math.max(0,36-yy*yy)));if(inner){g.fillStyle=`rgba(255,235,120,${pulse})`;g.fillRect(ccx-inner,ccy+yy,inner*2+1,1);}}}g.drawImage(spr,hx,fy-spr.height-2+bob);}
        if(Math.floor(now/250)%2)g.fillStyle='#ffffff',g.fillRect(hx+9,fy-16+bob,1,1);continue;}
      const spr=RN.sprites[o.k];
      let y=fy-spr.height+2,x=sx(o)-Math.round((spr.width-o.w)/2);
      if(o.falling){if(o.fallAt===null){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+2,fy-1,spr.width-4,2);continue;}   // shadow warning only
        const u=Math.min(1,(RN.now-o.fallAt)/550);g.fillStyle=`rgba(0,0,0,${.2+.3*u})`;g.fillRect(x+2+(1-u)*4,fy-1,spr.width-4-(1-u)*8,2);
        y=Math.round(-spr.height+(y+spr.height)*u*u);if(u<1){g.fillStyle='rgba(120,100,100,.5)';g.fillRect(x+4,y-6,2,5);g.fillRect(x+12,y-9,2,7);}}
      g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+1,fy,spr.width-2,2);g.drawImage(spr,x,y);}
    if(lane===pl&&RN.pet)runDrawPet(g,now,jy);}
  runDrawBolts(g,now);
  // puffs + sparkles
  RN.fx=RN.fx.filter(p=>now-p.t<p.life);
  for(const p of RN.fx){const t=now-p.t;g.globalAlpha=1-t/p.life;g.fillStyle=p.c;g.fillRect(Math.round(p.x-d+p.vx*t),Math.round(p.y+p.vy*t+.00004*t*t),1+(t<150?1:0),1+(t<150?1:0));}
  g.globalAlpha=1;
  // hearts (health) in the corner, and pet-food bags collected this run
  for(let i=0;i<RUN.maxHp;i++)drawHeart(g,RUN.S-36+i*10,15,i<RN.hp,false);
  if(RN.foodBags){g.drawImage(RN.sprites.food,RUN.S-17,26);}
  if(RN.flash&&now-RN.flash<180){g.fillStyle=`rgba(255,40,60,${.28*(1-(now-RN.flash)/180)})`;g.fillRect(0,0,RUN.S,RUN.S);}
  // speed lines when fast
  if(RN.state==='running'&&RN.mult>1.3){g.fillStyle='rgba(255,240,220,.25)';for(let k=0;k<Math.min(40,Math.floor((RN.mult-1)*6));k++){const y=(k*37+Math.floor(now/40)*13)%80+120;g.fillRect((RUN.S-(now/2+k*61)%RUN.S),y,10,1);}}
  const G=RNc.ctx,k=RNc.k;G.imageSmoothingEnabled=false;G.drawImage(RNc.lo,0,0,RUN.S*k,RUN.S*k);
  // HUD (crisp pixel font at full resolution)
  const txt=(t,x,y,size,col,align='left',shadow=true)=>{G.font=`700 ${size*k}px 'Pixelify Sans', monospace`;G.textAlign=align;G.textBaseline='middle';
    if(shadow){G.fillStyle='rgba(15,8,12,.8)';G.fillText(t,(x+.7)*k,(y+.7)*k);}G.fillStyle=col;G.fillText(t,x*k,y*k);};
  const m=Math.floor(RN.dist/RUN.pxPerM);
  txt(m+' m',6,9,8,'#ffe9b8');txt('BEST '+RN.best+' m',6,19,5,'#d9c3a0');
  txt(RE.speedPercent(RN.mult)+'%',RUN.S-6,8,6.5,RN.mult>1?'#ffb35c':'#d9c3a0','right');
  if(LIVE&&RL.run&&!RL.run.free&&RN.state==='running')txt('WORTH '+ruinWorth(RL.run.bet,RE.speedPercent(RN.mult)).toLocaleString('en-US'),RUN.S-6,17,5,'#ffe9b8','right');
  if(RN.storm&&RN.state==='running'){const left=Math.max(0,Math.ceil((RUN.stormMs-(RN.now-RN.storm.t0))/1000));txt('⚡ '+left+'s',6,29,6,'#ffe14a');}
  if(RN.foodBags)txt((RN.foodBags>1?'×'+RN.foodBags+'  ':'')+Math.round(RE.enemyOdds(RN)*100)+'% pets',RUN.S-20,32.5,5,'#f4e0c0','right');
  if(RN.banner){const a=(now-RN.banner.t)/1400;txt(RN.banner.txt,RUN.S/2,60-a*6,14,`rgba(255,207,63,${1-a*a})`,'center');}
  if(RN.state==='ready'&&!LIVE){G.fillStyle='rgba(15,8,12,.45)';G.fillRect(0,0,RUN.S*k,RUN.S*k);
    txt('RUIN RUN',RUN.S/2,64,20,'#ffcf3f','center');txt('↑ ↓  change lane   ·   SPACE  jump',RUN.S/2,88,5.5,'#f4e9d8','center');
    txt(RN.ctl==='swipe'?'touch: swipe up/down to change lane · tap to jump':'touch: tap a lane · double-tap to jump',RUN.S/2,98,5,'#f4e9d8','center');
    txt('hold jump to go higher · hit pets = lose a ♥',RUN.S/2,106,5,'#f4e9d8','center');
    txt('pet food = more enemy pets · ⚡ = 30 s storm that zaps pets',RUN.S/2,113,5,'#ffe14a','center');
    txt('TAP or PRESS SPACE to start',RUN.S/2,122,7,'#ffe9b8','center');}
  if(RN.state==='over'&&now-RN.overAt>500&&!LIVE){G.fillStyle='rgba(15,8,12,.5)';G.fillRect(0,0,RUN.S*k,RUN.S*k);
    const why={crash:'CRASHED!',trip:'TRIPPED!',fell:'FELL IN!',brawl:'KNOCKED OUT!',stopped:'STOPPED'}[RN.over.why];
    txt(why,RUN.S/2,58,18,'#ff7a5c','center');txt(m+' m',RUN.S/2,82,14,'#ffe9b8','center');
    txt(RN.newBest?'NEW BEST!':'BEST '+RN.best+' m',RUN.S/2,100,7,RN.newBest?'#ffcf3f':'#d9c3a0','center');
    txt('TAP or PRESS SPACE to run again',RUN.S/2,122,6,'#f4e9d8','center');}
}
function stormLevel(now){const S=RN.storm;if(!S)return 0;const t=now-S.t0;
  return t<RUN.stormStrikeAt?(t/RUN.stormStrikeAt)**.7:t>RUN.stormMs-700?Math.max(0,(RUN.stormMs-t)/700):1;}
function runDrawBolts(g,now){
  const d=RN.dist;RN.bolts=RN.bolts.filter(b=>now-b.t<500);if(!RN.boltFlash)return;const ft=now-RN.boltFlash;
  if(ft<260){const a=ft<60?.85:ft<120?.2:ft<170?.6:.6*(1-(ft-170)/90);g.fillStyle=`rgba(235,240,255,${Math.max(0,a)})`;g.fillRect(0,0,RUN.S,RUN.S);}   // double flash
  for(const b of RN.bolts){const t=now-b.t;if(t>420)continue;const on=t<90||(t>140&&t<260)||(t>320&&t<380);if(!on)continue;
    const r=seeded(Math.floor(b.seed)+Math.floor(t/45));let x=Math.round(b.x-d)+Math.round((r()-.5)*30),y=0;const tx=Math.round(b.x-d),ty=b.y;
    const pts=[[x,0]];while(y<ty){y=Math.min(ty,y+6+Math.floor(r()*10));x+=Math.round((tx-x)*.35+(r()-.5)*10);if(y>=ty)x=tx;pts.push([x,y]);}
    for(let pass=0;pass<2;pass++){g.fillStyle=pass?'#ffffff':'rgba(150,190,255,.55)';const wdt=pass?1:3;
      for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];const n=Math.max(Math.abs(x1-x0),y1-y0);
        for(let k=0;k<=n;k++){const px=Math.round(x0+(x1-x0)*k/n),py=Math.round(y0+(y1-y0)*k/n);g.fillRect(px-(wdt>>1),py,wdt,1);}}
      if(r()<.6&&pts.length>3&&!pass){const [bx,by]=pts[2];let fx=bx,fy=by;g.fillStyle='rgba(200,220,255,.8)';for(let k=0;k<10;k++){fx+=r()<.5?-1:1;fy++;g.fillRect(fx,fy,1,1);}}}   // a little fork
    g.fillStyle='rgba(255,250,200,.9)';g.fillRect(tx-3,ty-1,7,2);}                                                                    // impact glow
}
function drawHeart(g,x,y,full,pickup){ // 9×8 pixel heart
  const rows=['.##...##.','####.####','#########','#########','.#######.','..#####..','...###...','....#....'];
  const fill=full?(pickup?'#ff4f6e':'#ff3b5c'):'#3a2a32',hi=full?'#ffc2cf':'#4a3842',edge=full?'#8f1530':'#1a1218';
  rows.forEach((r,j)=>{for(let i=0;i<9;i++)if(r[i]==='#'){const border=j===0||i===0||i===8||r[i-1]!=='#'||r[i+1]!=='#'||(rows[j+1]||'')[i]!=='#';
    g.fillStyle=border?edge:fill;g.fillRect(x+i,y+j,1,1);}});
  g.fillStyle=hi;g.fillRect(x+2,y+1,2,1);g.fillRect(x+1,y+2,1,1);
}
const SIL=document.createElement('canvas'),SILg=SIL.getContext('2d');
function whiteSil(f,cr){SIL.width=cr.w;SIL.height=cr.h;SILg.clearRect(0,0,cr.w,cr.h);SILg.drawImage(f,cr.x,cr.y,cr.w,cr.h,0,0,cr.w,cr.h);
  SILg.globalCompositeOperation='source-atop';SILg.fillStyle='#fffbe0';SILg.fillRect(0,0,cr.w,cr.h);SILg.globalCompositeOperation='source-over';return SIL;}
function runDrawEnemy(g,o,fy,x){
  const r=enemyPet(o);if(!r)return;const A=r.anim(r.state),f=A.frames[r.cur]||A.frames[0],cr=r.form.crop;
  const cx=x+Math.round(o.w/2);let dx=cx-Math.round(cr.w/2)+nudgeOf(r.form),dy=fy-(cr.h-1)+sinkOf(r.form);
  if(A.hover)dy-=Math.round(HOVER_AMP*(.6+(Math.sin(r.clock/HOVER_MS*Math.PI*2)+1)/2));
  if(o.hitAt)dx+=Math.round(Math.sin((RN.now-o.hitAt)/30)*1.5);            // angry shudder before vanishing
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(cx-Math.round(cr.w*.25),fy,Math.round(cr.w*.5),2);
  g.save();if(o.hitAt&&!o.won&&Math.floor((RN.now-o.hitAt)/90)%2===1)g.globalAlpha=.3;   // the enemy you bumped flickers until it vanishes
  if(o.zap&&Math.floor((RN.now-o.zap)/60)%2===0){const sil=whiteSil(f,cr);if(r.artFaces()!==-1){g.translate(cx*2,0);g.scale(-1,1);}g.drawImage(sil,dx,dy);g.restore();return;}   // zapped: flashes white
  if(r.artFaces()!==-1){g.translate(cx*2,0);g.scale(-1,1);}                // enemies face left, toward you
  g.drawImage(f,cr.x,cr.y,cr.w,cr.h,dx,dy,cr.w,cr.h);g.restore();
  if(!o.hitAt){g.fillStyle='#ff3b5c';g.fillRect(cx-1,dy+topPad(r)-6,3,3);g.fillStyle='#fff';g.fillRect(cx,dy+topPad(r)-6,1,2);}   // red "!" marker
}
function runDrawPet(g,now,jy){
  const r=RN.pet,A=r.anim(r.state),f=A.frames[r.cur]||A.frames[0],cr=r.form.crop;
  const fy=RUN.laneY[0]+(RUN.laneY[2]-RUN.laneY[0])*RN.laneF/2;
  let dx=RUN.px-Math.round(cr.w/2)+nudgeOf(r.form),dy=Math.round(fy-(cr.h-1)-jy+sinkOf(r.form));
  if(A.hover)dy-=Math.round(HOVER_AMP*(.6+(Math.sin(r.clock/HOVER_MS*Math.PI*2)+1)/2));
  if(A.shake)dx+=Math.round(Math.sin(r.clock/SHAKE_MS*Math.PI*2)*A.shakeAmt);
  if(A.ushake)dy+=Math.round(Math.sin(r.clock/USHAKE_MS*Math.PI*2)*A.ushakeAmt);
  if(RN.state==='over'&&RN.over.fall){dy+=Math.round(RN.over.dy);g.save();g.beginPath();g.rect(0,0,RUN.S,fy+2);g.clip();}   // sink into the hole
  const shw=Math.max(4,Math.round(cr.w*.5*(1-Math.min(1,jy/34)*.45)));g.fillStyle='rgba(0,0,0,.35)';g.fillRect(RUN.px-Math.round(shw/2),Math.round(fy),shw,2);
  const koFlicker=RN.ko&&RN.state==='running'&&Math.floor(now/90)%2===1;   // knocked out: your pet flickers
  g.save();if(koFlicker)g.globalAlpha=.3;if(r.artFaces()!==1){g.translate(RUN.px*2,0);g.scale(-1,1);}g.drawImage(f,cr.x,cr.y,cr.w,cr.h,dx,dy,cr.w,cr.h);g.restore();
  if(RN.state==='over'&&RN.over.fall)g.restore();
}
function runLoop(t){if(!RN.running)return;const dt=Math.min(50,t-(RN.last||t));RN.last=t;runUpdate(dt,t);runDraw(t);requestAnimationFrame(runLoop);}
function runStartLoop(){if(RN.running)return;RN.running=true;RN.last=0;runSize();requestAnimationFrame(runLoop);}
function runStopLoop(){RN.running=false;if(RN.state==='running'){if(LIVE)runStopHere();else runReset();}}

/* ---------- choosing a pet ---------- */
async function runSync(){
  if(LIVE){const mine=PR.id&&petDocs.get(PR.id),r=mine&&regDocs.get(mine.skinId);
    if(!r){RN.pet=null;RN.petKey=null;return;}
    const key=mine.skinId+'|'+mine.name+'|'+JSON.stringify(r.changes||{});if(RN.petKey===key&&RN.pet)return;
    const f=await getForm(r.baseFormId);if(!f||!f.firstState())return;
    RN.petKey=key;RN.petId=PR.id;RN.pet=new Racer({id:PR.id,name:mine.name,form:f,map:mapFromChanges(f,r.changes),guest:false,rarity:r.rarity});RN.pet.setState(runPetState());
    const pool=[];
    for(const [id,o] of [...regDocs.entries()].filter(([id,o])=>id!==mine.skinId&&baseDocs.has(o.baseFormId)).slice(0,12)){const ff=await getForm(o.baseFormId);if(!ff||!ff.firstState())continue;
      pool.push(new Racer({id,name:o.name,form:ff,map:mapFromChanges(ff,o.changes),guest:true}));}
    RN.enemyPool=pool;return;}
  const regN=[...regDocs.values()].filter(r=>baseDocs.has(r.baseFormId)).length;
  const roster=roomRoster(Math.max(3,regN),RN.guests);
  const sel=$('runPet');sel.innerHTML=roster.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}${r.guest?' (guest)':''}</option>`).join('');
  let id=RN.petId;if(!id){try{id=localStorage.getItem('forge.runPet');}catch(e){}}
  if(!roster.some(r=>r.id===id))id=roster[0]&&roster[0].id;sel.value=id||'';
  const r=roster.find(x=>x.id===id);if(!r){RN.pet=null;return;}
  const f=await getForm(r.baseFormId);if(!f||!f.firstState())return;
  const map=r.guest?coatMap(f,r.coat):mapFromChanges(f,r.changes);
  RN.petId=id;RN.pet=new Racer({id,name:r.name,form:f,map,guest:r.guest,rarity:r.rarity});RN.pet.setState(RN.state==='running'?'walk':'idle');
  // enemy pets: everyone else on the roster (guests fill in if you only have a few forms)
  const others=roomRoster(Math.max(6,regN+1),RN.guests).filter(x=>x.id!==id);const pool=[];
  for(const o of others){const ff=await getForm(o.baseFormId);if(!ff||!ff.firstState())continue;
    const t=new Racer({id:o.id,name:o.name,form:ff,map:o.guest?coatMap(ff,o.coat):mapFromChanges(ff,o.changes),guest:true});pool.push(t);}
  RN.enemyPool=pool;
}
$('runPet').onchange=e=>{RN.petId=e.target.value;try{localStorage.setItem('forge.runPet',RN.petId);}catch(_){}runSync();e.target.blur();};

/* ---------- input ---------- */
document.addEventListener('keydown',e=>{
  if($('run').hidden||e.target.closest('input,select,textarea'))return;
  if(LIVE&&RL.home)return;   // the start screen: the keys are the page's (scrolling, the buttons)
  const k=e.key;
  if([' ','ArrowUp','ArrowDown','w','s','W','S'].includes(k))e.preventDefault();
  if(e.repeat)return;
  if(RN.state!=='running'){if(k===' '||k==='Enter'){if(RN.state==='over'&&performance.now()-RN.overAt<500)return;runBegin();}return;}
  if(k==='ArrowUp'||k==='w'||k==='W')setLane(laneNow()-1);
  else if(k==='ArrowDown'||k==='s'||k==='S')setLane(laneNow()+1);
  else if(k===' ')doJump();
});
document.addEventListener('keyup',e=>{if(e.key===' ')releaseJump();});
/* Touch, two modes (picked above the game in Pet Forge; the game itself only has Swipe, and the buttons under it):
   • Swipe     — swipe up / down anywhere to change lane; tap (or swipe right) to jump (the default)
   • Tap lanes — tap a lane to move there (anywhere above the road = back lane); double-tap to jump
   In both, keeping the finger down after a jump makes it higher and longer. */
RN.ctl=LIVE?'swipe':(()=>{try{return localStorage.getItem('forge.runCtl')==='tap'?'tap':'swipe';}catch(e){return 'swipe';}})();
function runHelp(){$('runHelp').textContent='Keyboard: ↑ / ↓ change lane, Space jumps (hold it for a bigger jump). '+
  (RN.ctl==='swipe'?'Touch: swipe up / down to change lane, tap to jump — keep your finger down to jump higher.':'Touch: tap a lane to move there, double-tap to jump — keep your finger down on the second tap to jump higher.');}
[...$('runCtlSeg').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===RN.ctl));
seg('runCtlSeg',v=>{RN.ctl=v;try{localStorage.setItem('forge.runCtl',v);}catch(e){}runHelp();});runHelp();
const G_={id:null,x:0,y:0,t:0,swipe:false,done:false,timer:0};
const SWIPE=16;   // css px of movement that counts as a swipe
RNc.canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();const now=performance.now();
  if(RN.state!=='running'){if(RN.state==='over'&&now-RN.overAt<500)return;runBegin();RN.lastTap=0;return;}
  try{RNc.canvas.setPointerCapture(e.pointerId);}catch(_){}
  const r=RNc.canvas.getBoundingClientRect(),y=(e.clientY-r.top)/r.height*RUN.S;
  Object.assign(G_,{id:e.pointerId,x:e.clientX,y:e.clientY,t:now,swipe:RN.ctl==='swipe',done:false});
  clearTimeout(G_.timer);
  if(G_.swipe){ // wait a moment to see if this is a swipe; if the finger stays put, it's a jump
    G_.timer=setTimeout(()=>{if(G_.id===e.pointerId&&!G_.done){G_.done=true;doJump();}},70);return;}
  if(now-RN.lastTap<300){doJump();RN.lastTap=0;G_.done=true;return;}   // double-tap = jump
  RN.lastTap=now;G_.done=true;
  setLane(y<(RUN.laneY[0]+RUN.laneY[1])/2-8?0:y<(RUN.laneY[1]+RUN.laneY[2])/2-8?1:2);
});
RNc.canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==G_.id||!G_.swipe||G_.done||RN.state!=='running')return;
  const dx=e.clientX-G_.x,dy=e.clientY-G_.y;
  if(Math.abs(dy)>=SWIPE&&Math.abs(dy)>Math.abs(dx)){G_.done=true;clearTimeout(G_.timer);setLane(laneNow()+(dy<0?-1:1));releaseJump();}
  else if(dx>=SWIPE&&dx>Math.abs(dy)){G_.done=true;clearTimeout(G_.timer);doJump();}
});
const endTouch=e=>{if(e.pointerId!==G_.id)return;
  if(G_.swipe&&!G_.done&&RN.state==='running'){G_.done=true;clearTimeout(G_.timer);doJump();releaseJump();}   // very quick tap: plain jump
  else releaseJump();
  G_.id=null;};
RNc.canvas.addEventListener('pointerup',endTouch);RNc.canvas.addEventListener('pointercancel',endTouch);

/* ---------- Ruin Run, in the game: bets, cash-outs, and the server's replay (backend/utils/catflix/ruinRun.js) ----------
   Like Forrest Bounce: a menu over the game picks the bet (1, 10, 30, 50 or 100 PP, any amount up to 10,000, or free play
   once the day's 3 cash-outs are used) and starts the run; after it comes the server's result, to cash out or throw away.
   Every 1% of speed above 100% when the run ends pays back 2% of the bet, with no cap. The server plays every run again
   from its seed and what the player did, and pays what it got. The screen holds still while you play (html.fit).
   Before the game, each time the tab opens, its start screen (RL.home): Play, How to Play, and the site's best runs. */
const RL={status:null,run:null,result:null,best:null,busy:false,finishing:false,custom:false,message:'',error:false,loadError:'',home:true,
  bet:(()=>{try{const b=+localStorage.getItem('catflix.runBet');return Number.isInteger(b)&&b>0?b:10;}catch(e){return 10;}})()};
const fmt=n=>Number(n||0).toLocaleString('en-US');
const ruinWorth=(bet,speed)=>Math.floor(bet*((RL.status&&RL.status.rules.backPerPercent)||2)*Math.max(0,speed-100)/100);   // shared/catflix/rules.js ruinPayout
// The site's wallet in the nav bar catches up.
function liveWallet(){if(window.parent!==window)window.parent.postMessage({catflix:'wallet'},location.origin);}
const runFree=()=>!!RL.status&&RL.status.cashOutsLeft<=0;
function runLiveTake(d){if(!d)return;if(d.status)RL.status=d.status;if(d.points!==undefined)LV.points=d.points;runLiveRender();}
async function runLiveLoad(){try{RL.loadError='';runLiveTake(await cfx('/run'));}catch(e){RL.loadError=e.message;runLiveRender();}}
// What's over the game: loading, the menu, nothing (a run playing), the run being checked, or its result.
function runView(){if(!RL.status)return 'loading';if(RN.state==='running')return 'playing';if(RL.finishing)return 'sending';if(RL.result||RL.status.waiting)return 'result';return 'menu';}
const RUN_WHY={crash:'Crashed!',trip:'Tripped!',fell:'Fell in!',brawl:'Knocked out!',stopped:'Stopped'};

// The start screen (on) or the game (off). The game only runs while it's showing.
function runHome(on){RL.home=on;if(!LIVE)return;$('runHome').hidden=!on;$('runStage').hidden=on;
  if(!$('run').hidden){if(on)runStopLoop();else runStartLoop();}
  if(on){RL.message='';$('runHome').scrollTop=0;}
  runLiveRender();}
// A member's picture on the board: theirs, or the first letter of their name.
function runAvatar(u){const url=String(u.avatarUrl||'');
  return /^(https?:\/\/|\/)/.test(url)?`<img class="av" src="${esc(url)}" alt="">`:`<span class="av" aria-hidden="true">${esc((u.username||'?')[0].toUpperCase())}</span>`;}
function runHomeRender(){
  const el=$('runHome');if(!el)return;const st=RL.status,me=myUserId();
  const board=!st?`<p class="note">${esc(RL.loadError||'Loading…')}</p>`
    :!st.leaderboard.length?'<p class="note">Nobody’s run yet. The first run sets the record.</p>'
    :`<ol>${st.leaderboard.map((e,i)=>`<li class="${String(e.user._id)===me?'me':''}"><span class="rank">${i+1}</span>${runAvatar(e.user)}<span class="who">${esc(e.user.username)}</span><b class="spd">${e.speed}%</b><span class="m">${fmt(e.metres)} m</span></li>`).join('')}</ol>`;
  const pills=st?`<div class="pills"><span>💸 ${st.cashOutsLeft}/${st.rules.cashOutsPerDay} cash-outs</span><span>🏅 Best ${st.bestRun?`${st.bestRun.speed}% · ${fmt(st.bestRun.metres)} m`:'none yet'}</span><span>💰 ${fmt(LV.points)} points</span></div>`:'';
  const wait=st&&st.waiting?`<p class="wait">You’ve a run at <b>${st.waiting.speed}%</b> waiting: <button type="button" class="link" data-do="play">cash it out or throw it away</button>.</p>`:'';
  el.innerHTML=`<div class="in"><h2>Ruin Run</h2>
    <p class="sub">Your pet runs through a ruined city, faster and faster. Jump, dodge and change lanes: the faster it’s going when the run ends, the more your bet pays back.</p>
    ${pills}<div class="row"><button type="button" class="play" data-do="play">Play</button><button type="button" class="howbtn" data-do="how">How to Play</button></div>${wait}
    <section class="board" aria-labelledby="runBoardTitle"><h3 id="runBoardTitle">Best runs</h3>${board}
      <p class="note">Each member’s fastest run: the speed it ended at, and how far it got. Free runs count too.</p></section></div>`;}
// How to Play, in a pop-up window over the start screen.
function runHowOpen(){const R=(RL.status&&RL.status.rules)||{cashOutsPerDay:3,backPerPercent:2,maxBet:10000,confidence:1,bigWinTimes:5};
  const box=$('runHowPop').firstChild;
  box.innerHTML=`<div class="head"><h3>How to Play</h3><button class="btn" type="button" id="runHowClose" aria-label="Close">✕</button></div>
    <div class="howto"><p><b>Your pet runs</b> on its own through a ruined city, getting faster all the time. Keep it going for as long as you can.</p>
    <ul><li><b>Change lane:</b> swipe up or down on the game, the ▲ and ▼ buttons under it, or ↑ and ↓ on a keyboard.</li>
      <li><b>Jump:</b> tap the game, press JUMP, or Space. Hold it down to jump higher and further.</li>
      <li>Jump rubble, cracks and gaps, and dodge cars and falling debris (once debris has landed you can jump over it): hit one and the run’s over.</li>
      <li>An enemy pet costs a heart (you have 3); with none left, the next one knocks you out. Grab hearts on the road to heal.</li>
      <li>A bag of pet food makes enemy pets 50% more likely (it stacks). A lightning bolt brings a 30-second storm that zaps every pet on screen: each still gives you its speed boost, without stopping you or costing a heart.</li></ul>
    <p><b>Speed is your score.</b> It goes up by 2% a second, and by 25% for each enemy pet. When the run ends, every 1% above 100% pays back ${R.backPerPercent}% of your bet, with no cap: 150% gives your bet back, 200% twice it.</p>
    <p><b>Bets and cash-outs.</b> Bet 1 to ${fmt(R.maxBet)} PP (PP first, then P-PP). You can cash out ${R.cashOutsPerDay} runs a day (12:00 to 12:00); throw a run away to keep your cash-out for a better one. Once they’re used, it’s free play until 12:00. Every run gives your pet +${R.confidence} confidence.</p>
    <p><b>Best runs.</b> Your fastest run goes on the board. Everyone hears about a new best speed; your followers hear about your cash-outs, and everyone about one that pays ${R.bigWinTimes} times the bet or more.</p></div>`;
  box.parentElement.hidden=false;$('runHowClose').focus({preventScroll:true});}
function runHowClose(){const pop=$('runHowPop');if(!pop||pop.hidden)return;pop.hidden=true;const b=$('runHome').querySelector('[data-do=how]');if(b)b.focus({preventScroll:true});}

function runLiveRender(){
  if(!LIVE)return;runHomeRender();const el=$('runMenu'),v=runView();
  el.hidden=v==='playing';el.classList.toggle('light',v==='sending');
  if(v==='playing'){el.innerHTML='';return;}
  if(v==='loading'){el.innerHTML=`<p class="msg">${esc(RL.loadError||'Loading…')}</p>`;return;}
  if(v==='sending'){el.innerHTML='<p class="msg">Checking your run…</p>';return;}
  const st=RL.status,R=st.rules;
  const msg=RL.message?`<p class="msg${RL.error?' err':''}" role="${RL.error?'alert':'status'}">${esc(RL.message)}</p>`:'';
  // Back to the start screen (the best runs, How to Play): a run waiting stays waiting.
  const back='<button type="button" class="back" data-do="home">← Back</button>';
  if(v==='result'){const r=RL.result||st.waiting,net=r.worth-r.bet,best=RL.result&&RL.best;
    let html=`${back}<h2>${r.free?'Free run over':(RUN_WHY[r.endedBy]||'Run over')}</h2><p class="big">${r.speed}%</p>
      ${best&&(best.site||best.personal)?`<p class="best">🏅 ${best.site?'New site record!':'New personal best!'}</p>`:''}
      <p class="sub">speed · ${fmt(r.metres)} m${r.free?' · free play':` · ${fmt(r.bet)} PP bet`}</p>`;
    if(r.free)html+=`<p class="sub">Free play can’t be cashed out.</p><div class="row"><button class="pri" data-do="again">Run again</button><button class="sec" data-do="menu">Menu</button></div>`;
    else html+=`<p class="worth">Worth <b>${fmt(r.worth)} PP</b><br><span class="${net>=0?'up':'down'}">${net>=0?'+':'−'}${fmt(Math.abs(net))} PP vs. your bet</span></p>
      <div class="row"><button class="pri" data-do="cash" ${st.cashOutsLeft<=0||RL.busy?'disabled':''}>Cash out +${fmt(r.worth)} PP</button><button class="sec" data-do="toss" ${RL.busy?'disabled':''}>Throw away</button></div>
      <p class="note">Cash-outs left today: ${st.cashOutsLeft}/${R.cashOutsPerDay}. Throwing a run away keeps your cash-out for a better one.</p>`;
    el.innerHTML=html+msg;}
  else{const free=runFree(),pts=LV.points,noPet=!PR.id,off=noPet||RL.busy;
    const tiles=R.bets.map(b=>`<button data-bet="${b}" ${off||free||pts<b?'disabled':''}><b>${fmt(b)} PP</b><small>200% pays ${fmt(ruinWorth(b,200))}</small></button>`).join('')
      +`<button data-bet="custom" aria-pressed="${RL.custom}" ${off||free?'disabled':''}><b>Custom</b><small>up to ${fmt(R.maxBet)}</small></button>`
      +`<button data-bet="0" class="free" ${off||!free?'disabled':''}><b>Free</b><small>${free?'nothing paid':`after ${R.cashOutsPerDay} cash-outs`}</small></button>`;
    el.innerHTML=`${back}${msg}${noPet?'<p class="msg">Hatch your egg first (it’s in the Pet tab): your pet does the running.</p>':''}
      <p class="how">${RN.ctl==='swipe'?'Swipe up or down to change lane, tap to jump':'Tap a lane to move there, double-tap to jump'} (keys: ↑ ↓ and Space); hold the jump to go higher. The rest is in How to Play, on the start screen.</p>
      <p class="pay">Every 1% of speed above 100% pays back ${R.backPerPercent}% of your bet, with no cap: <b>150%</b> gives your bet back, <b>200%</b> twice it.</p>
      <div class="bets">${tiles}</div>
      ${RL.custom&&!free?`<div class="row"><input type="number" id="runCustom" min="1" max="${R.maxBet}" step="1" value="${RL.bet}" aria-label="Your bet, 1 to ${fmt(R.maxBet)} PP"><button class="pri" data-do="custom" ${off||pts<RL.bet?'disabled':''}>Run for <span id="runCustomN">${fmt(RL.bet)}</span> PP</button></div>`:''}
      <p class="note">${free?`All ${R.cashOutsPerDay} cash-outs used today: free play until 12:00.`:`Cash-outs left today: ${st.cashOutsLeft}/${R.cashOutsPerDay}`} · Best ${st.bestRun?`${st.bestRun.speed}%`:'none yet'} · You have ${fmt(pts)} points · Each run: +${R.confidence} confidence for your pet</p>`;}
  el.onclick=e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.bet==='custom'){RL.custom=!RL.custom;runLiveRender();const i=$('runCustom');if(i)i.focus({preventScroll:true});return;}
    if(b.dataset.bet!==undefined){RL.custom=false;runBegin(+b.dataset.bet);return;}
    const d=b.dataset.do;
    if(d==='custom')runBegin(RL.bet);else if(d==='cash')runLiveSettle('cashout');else if(d==='toss')runLiveSettle('discard');
    else if(d==='again')runBegin(0);else if(d==='menu'){RL.result=null;RL.best=null;RL.message='';runReset();runLiveRender();}
    else if(d==='home')runHome(true);};
  const inp=$('runCustom');
  if(inp){inp.oninput=()=>{RL.bet=Math.max(1,Math.min(R.maxBet,Math.floor(+inp.value)||1));$('runCustomN').textContent=fmt(RL.bet);try{localStorage.setItem('catflix.runBet',RL.bet);}catch(_){}};
    inp.onkeydown=e=>{if(e.key==='Enter')runBegin(RL.bet);};inp.onchange=()=>{inp.value=RL.bet;};}
}
async function runLiveSettle(how){const r=RL.result||(RL.status&&RL.status.waiting);if(RL.busy||!r)return;RL.busy=true;runLiveRender();
  try{const d=await cfx(`/run/${r.id}/${how}`,{method:'POST'});RL.result=null;RL.best=null;runLiveTake(d);liveWallet();RL.error=false;
    RL.message=how==='cashout'?(d.payout>0?`Cashed out +${fmt(d.payout)} PP.`:'Cashed out: nothing back this time.')+(d.status.cashOutsLeft===0?' That’s today’s cash-outs: free play’s open.':'')
      :'Run thrown away. Your cash-out is still there.';
    runReset();}
  catch(e){RL.error=true;RL.message=e.message;}finally{RL.busy=false;runLiveRender();}}
// A bet picked in the menu (0: free play): the server takes it and picks the run's seed, then it starts. Taps and Space
// on the game only start runs in Pet Forge's sandbox; in the game the menu does.
async function runBegin(bet){
  if(!LIVE){runStart();return;}
  if(bet===undefined||RL.busy||!RL.status)return;
  if(!RN.pet){RL.error=true;RL.message='Your pet is on its way: one moment.';runLiveRender();return;}
  RL.busy=true;RL.message='';runLiveRender();
  try{const d=await cfx('/run',{method:'POST',body:{bet}});RL.run=d.run;RL.result=null;RL.best=null;runLiveTake(d);if(bet)liveWallet();
    runStart(d.run.seed);document.activeElement?.blur?.();}
  catch(e){RL.error=true;RL.message=e.message;}finally{RL.busy=false;runLiveRender();}
}
// The run's over: a moment to see how, then the server plays it again from its seed and what the player did.
async function runLiveFinish(){const run=RL.run;if(!run)return;RL.run=null;RL.finishing=true;runLiveRender();
  await new Promise(done=>setTimeout(done,700));
  try{const d=await cfx(`/run/${run.id}/finish`,{method:'POST',body:{inputs:RN.inputs,endTick:RN.tick}});
    RL.result=d.run;RL.best=d.best||null;runLiveTake(d);if(d.pet){livePet(d.pet);RL.error=false;RL.message=`${d.pet.name}: +${RL.status.rules.confidence} confidence.`;}}
  catch(e){RL.error=true;RL.message=e.message;runLiveLoad();}finally{RL.finishing=false;runLiveRender();}}

/* ---------- Nekomusume: Kitty Race, in the game: races the server runs (backend/utils/catflix/kittyRace.js) ----------
   The server picks the field, the lanes, the winner (every cat the same chance) and the whole finishing order, and pays
   the winner as it starts. Every page then plays the same race: planRace from the race's seed, in that order, from its
   start time on the server's clock. */
const KR={races:null,rules:null,custom:false,busy:false,playing:null,timer:0,skew:0,lineKey:null,
  bet:(()=>{try{const b=+localStorage.getItem('catflix.raceBet');return Number.isInteger(b)&&b>0?b:100;}catch(e){return 100;}})()};
function myUserId(){try{return String(JSON.parse(localStorage.getItem('user')||'null')?._id||'')||null;}catch(_){return null;}}
const serverNow=()=>Date.now()+KR.skew;
const trackName=m=>(RACE_MAPS[m]&&RACE_MAPS[m].name)||m;
const hostName=r=>{const e=r.entries.find(x=>x.user===r.host);return e?e.username:'Someone';};
const myEntry=r=>r&&r.entries.find(e=>e.user===myUserId());
// In the results: what each member's cat won or lost.
function raceMoney(r){if(!LIVE||!RC.race||!r.ownerId)return '';const e=RC.race.entries.find(x=>x.user===r.ownerId);if(!e)return '';
  return e.payout>0?`+${fmt(e.payout)} PP`:`−${fmt(e.bet)} PP`;}
function raceLiveTake(d){if(!d)return;
  if(d.points!==undefined)LV.points=d.points;if(d.rules)KR.rules=d.rules;KR.races=d.races;
  const mine=d.races&&d.races.mine;if(mine&&mine.serverNow)KR.skew=Date.parse(mine.serverNow)-Date.now();
  if(mine&&mine.status==='started'&&KR.playing!==mine.id)raceLivePlay(mine);
  else if((mine&&mine.status==='open')||!KR.playing)raceLiveLineup();
  raceLiveRender();}
async function raceLiveLoad(){try{raceLiveTake(await cfx('/race'));}catch(e){toast(e.message);}}
// Every 3 s while the tab's open and no race is playing: friends' races come and go, and an open race fills up.
function raceLivePoll(){clearTimeout(KR.timer);if(!LIVE||$('race').hidden)return;
  KR.timer=setTimeout(async()=>{if(!$('race').hidden&&RC.phase!=='countdown'&&RC.phase!=='running')await raceLiveLoad();raceLivePoll();},3000);}
async function raceLiveAct(path,body,{wallet=true}={}){if(KR.busy)return;KR.busy=true;
  try{raceLiveTake(await cfx(path,{method:'POST',body}));if(wallet)liveWallet();}catch(e){toast(e.message);}finally{KR.busy=false;}}
function raceLiveRender(){
  if(!LIVE)return;const el=$('raceLive');el.hidden=false;const d=KR.races,R=KR.rules;
  const live=RC.phase==='countdown'||RC.phase==='running';$('racePop').hidden=live;$('raceResultsBox').hidden=RC.phase!=='results';
  if(!d||!R){el.innerHTML='<p class="note">Loading…</p>';return;}
  const me=myUserId(),mine=d.mine,racing=RC.phase==='countdown'||RC.phase==='running';let html='';
  if(mine&&mine.status==='open'){const host=mine.host===me,left=Math.max(0,Math.ceil((Date.parse(mine.autoStartAt)-serverNow())/1000));
    html+=`<p class="big">${host?'Your race':`${esc(hostName(mine))}’s race`} at the <b>${esc(trackName(mine.map))}</b>: ${mine.entries.length} of ${R.racers} cats in, house cats fill the rest.</p>
      <ul>${mine.entries.map(e=>`<li><span>${esc(e.name)} <em>${esc(e.username)}</em></span><b>${fmt(e.bet)} PP</b></li>`).join('')}</ul>
      <div class="row">${host?'<button class="btn acc" id="raceGo">🏁 Start now</button><button class="btn danger" id="raceLeave">Call it off (bets back)</button>':'<button class="btn" id="raceLeave">Leave (bet back)</button>'}</div>
      <p class="note">${host?'Your friends (members you follow who follow you back) can join from their Kitty Race tab. ':''}It starts by itself in ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}.</p>`;}
  else if(mine&&mine.status==='started'&&racing){const e=myEntry(mine);html+=`<p class="big">They’re off! Your cat <b>${esc(e?e.name:'')}</b> has ${fmt(e?e.bet:0)} PP on it.</p>`;}
  else{
    if(!PR.id)html+='<p class="big">Hatch your egg first (it’s in the Pet tab): your pet does the racing.</p>';
    html+=`<div class="row"><span class="lbl">Bet (PP)</span><div class="seg" id="raceBetSeg">${R.bets.map(b=>`<button data-bet="${b}" aria-pressed="${!KR.custom&&KR.bet===b}">${fmt(b)}</button>`).join('')}<button data-bet="custom" aria-pressed="${KR.custom}">Custom</button></div>
      ${KR.custom?`<input type="number" id="raceCustom" min="1" max="${R.maxBet}" step="1" value="${KR.bet}" aria-label="Your bet, 1 to ${fmt(R.maxBet)} PP">`:''}<span class="note">You have ${fmt(LV.points)} points.</span></div>
      <div class="row"><button class="btn acc" id="raceSolo">🏁 Race now, against house cats</button><button class="btn" id="raceOpen">👥 Open a race for friends</button></div>`;
    html+=d.open.length?`<h3 style="margin:4px 0 0">Friends’ races</h3><ul>${d.open.map(r=>`<li><span>${esc(hostName(r))}’s race <em>${esc(trackName(r.map))} · ${r.entries.length} of ${R.racers} in</em></span><button class="btn acc" data-join="${esc(r.id)}">Join: ${fmt(KR.bet)} PP</button></li>`).join('')}</ul>`
      :'<p class="note">No friends’ races open right now.</p>';}
  html+=`<p class="note">${R.racers} cats race for about a minute, on a track picked at random, and every cat has the same chance. Bet up to ${fmt(R.maxBet)} PP on yours: if it wins you get ${R.pays} times your bet (your bet back, the rest in P-PP). Most of what’s lost goes to the Box Office Scratch jackpots. After the finish, 1st is happy, 2nd to 5th are angry, 6th to 10th are sad.</p>`;
  el.innerHTML=html;
  const seg=$('raceBetSeg');if(seg)seg.onclick=e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.bet==='custom')KR.custom=true;else{KR.custom=false;KR.bet=+b.dataset.bet;try{localStorage.setItem('catflix.raceBet',KR.bet);}catch(_){}}raceLiveRender();};
  const inp=$('raceCustom');if(inp)inp.onchange=()=>{KR.bet=Math.max(1,Math.min(R.maxBet,Math.floor(+inp.value)||1));inp.value=KR.bet;try{localStorage.setItem('catflix.raceBet',KR.bet);}catch(_){}raceLiveRender();};
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn;};
  on('raceSolo',()=>raceLiveAct('/race',{bet:KR.bet,solo:true},{wallet:false}));   // the wallet hears at the finish: it would give the result away
  on('raceOpen',()=>raceLiveAct('/race',{bet:KR.bet,solo:false}));
  if(mine){on('raceGo',()=>raceLiveAct(`/race/${mine.id}/start`,undefined,{wallet:false}));on('raceLeave',()=>raceLiveAct(`/race/${mine.id}/leave`));}
  el.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>raceLiveAct(`/race/${b.dataset.join}/join`,{bet:KR.bet}));
}
// The cats on the line before a race: the open race's, or just yours.
async function raceLiveLineup(){
  if(RC.phase==='running'||RC.phase==='countdown')return;
  const mine=KR.races&&KR.races.mine&&KR.races.mine.status==='open'?KR.races.mine:null,me=PR.id&&petDocs.get(PR.id);
  const want=mine?mine.entries.map(e=>({name:e.name,skinId:e.skinId,owner:e.username})):me?[{name:me.name,skinId:me.skinId,owner:''}]:[];
  const key=JSON.stringify(want);if(KR.lineKey===key&&RC.phase!=='results')return;KR.lineKey=key;
  const list=[];
  for(const [i,x] of want.entries()){const reg=regDocs.get(x.skinId);if(!reg||!baseDocs.has(reg.baseFormId))continue;const f=await getForm(reg.baseFormId);if(!f||!f.firstState())continue;
    list.push(new Racer({id:'line'+i,name:x.name,form:f,map:mapFromChanges(f,reg.changes),guest:false,rarity:reg.rarity,owner:x.owner}));}
  if(RC.phase==='running'||RC.phase==='countdown'||KR.lineKey!==key)return;
  RC.racers=list;RC.race=null;raceReset();$('raceEmpty').hidden=true;
}
// A started race: its cats in their lanes, scripted from its seed in its order, joined wherever it's got to.
async function raceLivePlay(race){
  KR.playing=race.id;const me=myUserId(),list=[];
  const fallback=[...regDocs.values()].find(r=>baseDocs.has(r.baseFormId));
  for(const [lane,x] of race.racers.entries()){let reg=regDocs.get(x.skinId);if(!reg||!baseDocs.has(reg.baseFormId))reg=fallback;if(!reg)break;
    const f=await getForm(reg.baseFormId);if(!f||!f.firstState())break;
    list.push(new Racer({id:'lane'+lane,name:x.name,form:f,map:mapFromChanges(f,reg.changes),guest:!x.owner,rarity:reg.rarity,owner:x.username||'',ownerId:x.owner,mine:!!me&&x.owner===me}));}
  if(KR.playing!==race.id||list.length!==race.racers.length)return;
  RC.map=race.map;RC.weather=race.weather||'sunny';WX.drops=[];WX.splashes=[];
  [...$('mapSeg').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===RC.map));
  RC.racers=list;raceReset();planRace(RE.generator(race.seed),race.order.map(i=>list[i]));
  RC.race=race;RC.phase='countdown';RC.t0=performance.now()-(serverNow()-Date.parse(race.startAt));
  RC.map=race.map;
  $('raceResultsTitle').textContent='Line-up';raceLiveRender();
}
// Every cat's in: how it went for you, and the wallet in the nav bar catches up.
function raceLiveDone(){const race=RC.race;if(!race)return;const e=myEntry(race);
  if(e)toast(e.payout>0?`Your cat won! +${fmt(e.payout)} PP`:`Not this time: ${fmt(e.bet)} PP gone`);
  liveWallet();raceLiveLoad();}

/* ===================================================================
   PET ROOM — a pet is its own thing (name + stats) that WEARS a skin
   (a registered form). Tools: Hand / Brush / Food; buttons: Praise / Scold.
   For now: petting or brushing → happy animation 2 s later; scolding →
   sad if happiness is high, angry if it's low. Stats don't change yet.
   =================================================================== */
const PET={W:160,H:120,floorY:100,reactDelay:2000,happyHigh:50};
const STATS=[{k:'happiness',l:'Happiness',i:'😊',c:'#ffcf3f'},{k:'love',l:'Love',i:'💗',c:'#ff6f9a'},{k:'hunger',l:'Hunger',i:'🍖',c:'#ff9a4a'},{k:'confidence',l:'Confidence',i:'💪',c:'#5fb8ff'}];
const PR={id:null,actor:null,tool:'hand',pending:null,react:null,bubbles:[],fx:[],running:false,last:0,bg:null,k:1,bowl:0};

/* ---------- pet rooms: one layout (wall, window, shelf, picture, lamp, rug, bed, toy), five styles ---------- */
const PET_STYLES={cozy:'🏠 Cozy',cute:'🎀 Cute',gothic:'🦇 Gothic',punk:'🎸 Punk',scifi:'🚀 Sci-fi'};
function drawPetRoom(style='cozy'){
  const c=document.createElement('canvas');c.width=PET.W;c.height=PET.H;const g=c.getContext('2d');const rnd=seeded(5+style.length*31);
  const px=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const R=a=>a[Math.floor(rnd()*a.length)];const live=[],texts=[];
  const W=PET.W,H=PET.H;
  const floorTiles=(a,b,tw)=>{const vx=80,vy=56,camH=H-vy;for(let y=78;y<H;y++){const sc=(y-vy)/camH;for(let k=-30;k<30;k++){const xa=vx+k*tw*sc,xb=vx+(k+1)*tw*sc;if(xb<0||xa>W)continue;px(xa,y,xb-xa+1,1,k%2?a:b);}}};
  const checker=(a,b,tw)=>{const vx=80,vy=56,camH=H-vy;for(let y=78;y<H;y++){const sc=(y-vy)/camH,row=Math.floor(120/sc/10);for(let k=-30;k<30;k++){const xa=vx+k*tw*sc,xb=vx+(k+1)*tw*sc;if(xb<0||xa>W)continue;px(xa,y,xb-xa+1,1,(k+row)%2?a:b);}}};
  const rug=(o,m,i)=>{for(let y=-14;y<=14;y++){const w=Math.round(58*Math.sqrt(1-(y/14)**2));px(80-w,PET.floorY+y*.6,w*2,1,Math.abs(y)>11?o:Math.abs(y)>8?m:i);}};
  const dado=(a,hi,lo)=>{px(0,70,W,8,a);px(0,70,W,1,hi);px(0,77,W,1,lo);};

  if(style==='cozy'){
    px(0,0,W,78,'#f1d9c4');for(let x=0;x<W;x+=8)px(x,0,3,70,'#ead0b8');for(let y=6;y<70;y+=12)for(let x=4;x<W;x+=16)px(x+((y/12|0)%2)*8,y,1,1,'#e2c2a6');
    dado('#c98f6a','#e0a984','#9a6a4a');
    px(56,10,48,34,'#8a5a3a');px(58,12,44,30,'#9ad4f4');px(58,12,44,10,'#7cc3f0');px(79,12,2,30,'#8a5a3a');px(58,26,44,2,'#8a5a3a');
    px(64,30,10,4,'#ffffff');px(86,16,12,3,'#ffffff');px(60,36,40,6,'#7fc06a');px(58,42,44,3,'#c98f6a');
    for(let y=8;y<48;y++){px(50,y,8+Math.round(Math.sin(y/3)),1,y%4?'#e07a8a':'#c85a6a');px(102-Math.round(Math.sin(y/3)),y,8+Math.round(Math.sin(y/3)),1,y%4?'#e07a8a':'#c85a6a');}
    px(48,7,64,3,'#8a5a3a');
    px(116,20,34,3,'#8a5a3a');[['#e04848',8],['#3d7ee0',10],['#f2c230',7],['#47b36b',9]].forEach(([col,h],i)=>px(118+i*5,20-h,4,h,col));
    px(140,12,7,8,'#c46a3a');for(let k=0;k<8;k++)px(139+Math.floor(rnd()*9),5+Math.floor(rnd()*7),2,2,k%2?'#4f9a4a':'#3f8a3e');
    px(12,16,26,20,'#8a5a3a');px(14,18,22,16,'#fff1d6');for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)if(x*x+y*y<=16)px(25+x,26+y,1,1,'#ff8fb1');px(22,24,2,2,'#1b1b22');px(27,24,2,2,'#1b1b22');
    px(14,52,3,26,'#6a5a4a');px(9,44,13,9,'#ffd98a');px(9,44,13,1,'#ffe9b8');px(10,53,11,1,'#c9a04a');
    floorTiles('#b07a52','#a8714a',14);for(let y=80;y<H;y+=5)px(0,y,W,1,'rgba(90,50,30,.25)');
    rug('#c85a6a','#f4e2c8','#e07a8a');
    for(let y=0;y<10;y++){const w=Math.round(22*Math.sin(Math.PI*(y+1)/11));px(140-w/2,92+y,w,1,y<3?'#8a6ac4':'#7a5ab4');}px(132,94,16,4,'#b89ae4');
    px(20,106,6,6,'#e0508a');px(21,105,4,8,'#e0508a');px(22,107,2,1,'#ff8fb8');for(let k=0;k<8;k++)px(26+k,111+Math.round(Math.sin(k)),1,1,'#e0508a');
  }

  if(style==='cute'){
    px(0,0,W,78,'#ffe4ef');for(let y=4;y<68;y+=10)for(let x=4;x<W;x+=12){const ox=((y/10|0)%2)*6;px(x+ox,y,2,2,'#ffc9de');}
    for(let k=0;k<7;k++){const x=10+k*22,y=8+(k%2)*30;px(x,y,2,2,'#ff8fb8');px(x+3,y,2,2,'#ff8fb8');px(x,y+2,5,1,'#ff8fb8');px(x+1,y+3,3,1,'#ff8fb8');px(x+2,y+4,1,1,'#ff8fb8');}  // little hearts
    dado('#b8e8d4','#d8f6ea','#88c4ac');
    // bunting garland
    for(let x=0;x<W;x+=10){const col=['#ff8fb8','#b8e8d4','#fff1a8','#c9b8ff'][(x/10)%4];for(let k=0;k<5;k++)px(x+k,4+k,10-k*2,1,col);}
    for(let x=0;x<W;x++)px(x,3+Math.round(Math.sin(x/10*Math.PI)*1),1,1,'#e07aa0');
    // round cloud-framed window with a rainbow
    for(let y=-17;y<=17;y++)for(let x=-24;x<=24;x++){const r=(x/24)**2+(y/17)**2;if(r<=1)px(80+x,28+y,1,1,r>.82?'#ffffff':'#bfe8ff');}
    const rb=['#ff7a8a','#ffb36a','#fff17a','#8fe08a','#7ac8ff','#c49aff'];rb.forEach((col,i)=>{for(let a=0;a<=Math.PI;a+=.02){const r=15-i;px(80+Math.cos(a)*r*1.3,40-Math.sin(a)*r,1,1,col);}});
    px(62,38,10,4,'#ffffff');px(88,38,12,4,'#ffffff');
    // shelf with plushies, heart frame, star night-light
    px(116,22,34,3,'#ffffff');px(116,25,34,1,'#e8c8d8');
    px(119,13,8,9,'#c9b8ff');px(120,11,2,3,'#c9b8ff');px(124,11,2,3,'#c9b8ff');px(121,15,1,1,'#3a2a4a');px(124,15,1,1,'#3a2a4a');
    px(131,14,8,8,'#fff1a8');px(132,12,6,3,'#fff1a8');px(133,16,1,1,'#3a2a4a');px(136,16,1,1,'#3a2a4a');px(134,18,2,1,'#ff8fb8');
    px(142,15,6,7,'#b8e8d4');px(141,13,2,3,'#b8e8d4');px(147,13,2,3,'#b8e8d4');
    for(let y=-7;y<=7;y++)for(let x=-9;x<=9;x++){const hx=Math.abs(x)/9,hy=(y+3)/7;if((hx*hx+(hy-Math.sqrt(hx)*.6)**2)<=1.1)px(25+x,26+y,1,1,(hx*hx+(hy-Math.sqrt(hx)*.6)**2)>.8?'#ff8fb8':'#fff4f8');}
    px(23,25,2,2,'#3a2a4a');px(27,25,2,2,'#3a2a4a');
    px(14,52,3,26,'#ffffff');for(let k=0;k<5;k++){const a=k/5*Math.PI*2-Math.PI/2;px(15+Math.cos(a)*5,46+Math.sin(a)*5,3,3,'#fff17a');}px(13,44,5,5,'#fff17a');live.push({x:13,y:44,w:5,h:5,c:['#fff17a','#fffbd0'],ms:900});
    floorTiles('#ffd6e6','#ffe8f0',14);
    // heart-shaped rug
    for(let y=-16;y<=12;y++)for(let x=-40;x<=40;x++){const hx=Math.abs(x)/40,hy=-(y)/14;const v=(hx*hx+hy*hy-1)**3-hx*hx*hy*hy*hy;if(v<=0)px(80+x,PET.floorY+y*.55,1,1,v>-.02?'#ff8fb8':'#ffc2d8');}
    for(let y=0;y<10;y++){const w=Math.round(24*Math.sin(Math.PI*(y+1)/11));px(140-w/2,92+y,w,1,y<3?'#ff8fb8':'#ff6fa0');}px(132,94,16,4,'#ffd0e2');px(138,90,4,3,'#ffffff');
    px(18,104,8,8,'#c9b8ff');px(17,102,2,3,'#c9b8ff');px(25,102,2,3,'#c9b8ff');px(20,106,1,1,'#3a2a4a');px(23,106,1,1,'#3a2a4a');                                  // plush toy
  }

  if(style==='gothic'){
    px(0,0,W,78,'#2a1a2e');
    for(let y=0;y<70;y+=12)for(let x=((y/12|0)%2)*8;x<W;x+=16){px(x+3,y+2,2,8,'#3a2440');px(x+1,y+5,6,2,'#3a2440');px(x+2,y+3,4,1,'#3a2440');}     // damask motif
    dado('#3a1a1e','#5a2a30','#1a0a0e');
    // arched stained-glass window with a moon
    for(let y=6;y<46;y++){const w=y<18?Math.round(Math.sqrt(144-(18-y)**2)*1.6):19;px(80-w-2,y,w*2+4,1,'#5a4a4a');px(80-w,y,w*2,1,y<26?'#24304e':'#2e2448');}
    for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++)if(x*x+y*y<=25&&(x-2)**2+(y-1)**2>16)px(86+x,18+y,1,1,'#f4ecc8');
    px(79,10,2,36,'#5a4a4a');px(62,26,36,2,'#5a4a4a');px(65,30,12,14,'rgba(160,40,60,.55)');px(83,30,12,14,'rgba(60,60,160,.5)');
    for(let y=4;y<50;y++){const sw=Math.round(Math.sin(y/4));px(50+sw,y,9,1,y%5?'#6a0f1e':'#4a0a14');px(101-sw,y,9,1,y%5?'#6a0f1e':'#4a0a14');}px(48,3,64,3,'#1a0a0e');px(48,3,64,1,'#c9a04a');
    // cobwebs in the top corners
    for(let k=0;k<12;k++){px(k,0,1,12-k,'rgba(220,220,230,.18)');px(W-1-k,0,1,12-k,'rgba(220,220,230,.18)');}for(let r=4;r<12;r+=3)for(let a=0;a<1.6;a+=.15){px(Math.cos(a)*r,Math.sin(a)*r,1,1,'rgba(230,230,240,.35)');px(W-1-Math.cos(a)*r,Math.sin(a)*r,1,1,'rgba(230,230,240,.35)');}
    // ornate frame with a bat, shelf with a skull candle and old books, candelabra
    px(11,15,28,22,'#c9a04a');px(13,17,24,18,'#1e1424');px(11,15,28,1,'#f0cf7a');
    px(20,24,10,3,'#0a060c');px(16,22,4,3,'#0a060c');px(30,22,4,3,'#0a060c');px(24,23,2,1,'#ff3a4a');px(26,23,1,1,'#ff3a4a');
    px(116,22,34,3,'#3a1a1e');[['#4a1020',9],['#1e2a4a',11],['#2a3a20',8]].forEach(([col,h],i)=>px(118+i*5,22-h,4,h,col));
    px(137,15,8,7,'#e8e2d6');px(138,17,2,2,'#1a0a0e');px(142,17,2,2,'#1a0a0e');px(140,13,2,2,'#f2ead8');live.push({x:140,y:10,w:2,h:3,c:['#ffb347','#ffd36b','#ff8a2a'],ms:140});
    px(14,54,3,24,'#8a7a5a');px(8,52,15,2,'#c9a04a');for(const cx of [8,14,20]){px(cx,46,3,6,'#f2ead8');live.push({x:cx,y:42,w:3,h:4,c:['#ffb347','#ffd36b','#ff8a2a'],ms:120+cx*4});}
    floorTiles('#3a2420','#30201c',14);for(let y=80;y<H;y+=5)px(0,y,W,1,'rgba(10,0,0,.35)');
    rug('#4a0a14','#c9a04a','#6a0f1e');
    // coffin-shaped bed
    for(let y=0;y<12;y++){const w=Math.round(y<4?14+y*2:22-(y-4)*1.2);px(140-w/2,90+y,w,1,y<2?'#5a3a2a':'#3a2418');}px(134,93,12,3,'#6a0f1e');px(139,92,2,4,'#c9a04a');px(137,93,6,1,'#c9a04a');
    px(18,107,7,4,'#2a2a3a');px(16,105,3,3,'#2a2a3a');px(24,105,3,3,'#2a2a3a');px(20,108,1,1,'#ff3a4a');                                                           // little bat plush
  }

  const punkFloor=kind=>{const vx=80,vy=56,camH=H-vy,rowOf=y=>Math.floor(120/((y-vy)/camH)/10);
    const persp=(fn)=>{for(let y=78;y<H;y++){const sc=(y-vy)/camH;fn(y,sc,rowOf(y),rowOf(y)!==rowOf(y+1));}};
    if(kind==='concrete'){          // scuffed venue concrete: slabs, cracks, paint splatter, gaffer tape
      persp((y,sc,row,edge)=>{for(let k=-12;k<12;k++){const xa=vx+k*34*sc,xb=vx+(k+1)*34*sc;if(xb<0||xa>W)continue;px(xa,y,xb-xa+1,1,(k*7+row*3)%5===0?'#4a4a50':'#55555c');px(xa,y,1,1,'#3a3a40');}if(edge)px(0,y,W,1,'#3a3a40');});
      for(let k=0;k<260;k++)px(Math.floor(rnd()*W),78+Math.floor(rnd()*(H-78)),1,1,R(['#626269','#47474d','#5c5c63']));
      for(let k=0;k<4;k++){let x=10+rnd()*140,y=84+rnd()*30;for(let i=0;i<9;i++){px(x,y,1,1,'#2e2e33');x+=R([-1,1,1]);y+=R([0,1]);}}
      [['#ff3ad0',30,112],['#3dd6e0',118,84],['#ffe03a',104,116],['#3dff8a',8,90]].forEach(([col,x,y])=>{px(x,y,4,2,col);px(x+1,y-1,2,1,col);for(let k=0;k<5;k++)px(x-3+rnd()*10,y-2+rnd()*5,1,1,col);});
      px(56,108,8,2,'#d8d0a0');px(59,105,2,8,'#d8d0a0');px(100,82,9,2,'#d8d0a0');px(30,84,7,2,'#e8e6e0');}  // gaffer-tape X marks
    if(kind==='stage'){            // worn black stage boards
      persp((y,sc,row,edge)=>{for(let k=-40;k<40;k++){const xa=vx+k*8*sc,xb=vx+(k+1)*8*sc;if(xb<0||xa>W)continue;px(xa,y,xb-xa+1,1,(k*5+((row+k)%3))%4===0?'#26262c':'#2e2e35');px(xa,y,1,1,'#18181c');}if(edge&&row%3===0)px(0,y,W,1,'#18181c');});
      for(let k=0;k<160;k++)px(Math.floor(rnd()*W),78+Math.floor(rnd()*(H-78)),2,1,R(['#3a3a42','#232328']));
      px(56,108,8,2,'#e8e6e0');px(59,105,2,8,'#e8e6e0');px(100,82,9,2,'#ff3ad0');px(26,88,10,7,'#f4f1ea');for(let k=0;k<3;k++)px(27,89+k*2,7,1,'#1b1b22');}  // tape marks + setlist
    if(kind==='plate'){            // diamond-plate steel
      persp((y,sc,row,edge)=>{px(0,y,W,1,'#4a4e56');const st=Math.max(2,Math.round(9*sc));for(let x=(row%2)*Math.round(st/2);x<W;x+=st)px(x,y,1,1,(y+row)%2?'#7a7e88':'#363a40');if(edge&&row%4===0)px(0,y,W,1,'#2a2e34');});
      for(let x=0;x<W;x+=1)if(Math.sin(x/9)>.6)px(x,80+Math.floor(rnd()*40),1,1,'rgba(255,255,255,.12)');}
    if(kind==='hazard'){           // dark floor with a pink/black hazard stripe border
      floorTiles('#24242a','#2a2a30',14);
      for(let y=78;y<84;y++)for(let x=0;x<W;x++)px(x,y,1,1,Math.floor((x+y)/4)%2?'#ff3ad0':'#141418');
      for(let k=0;k<120;k++)px(Math.floor(rnd()*W),84+Math.floor(rnd()*(H-84)),1,1,'#34343c');}
  };
  if(style==='punk'){
    // brick wall with posters and tags
    px(0,0,W,78,'#6a3a34');for(let y=0;y<70;y+=5){px(0,y,W,1,'#4a2622');for(let x=((y/5)%2)*6;x<W;x+=12)px(x,y,1,5,'#4a2622');}
    for(let k=0;k<60;k++)px(Math.floor(rnd()*W),Math.floor(rnd()*70),2,1,R(['#7a463e','#5a302a']));
    dado('#1b1b22','#3a3a44','#000000');
    // torn posters
    [[6,8,'#f2c230'],[30,14,'#3dd6e0'],[120,10,'#ff4fa0']].forEach(([x,y,col])=>{px(x,y,20,26,'#f4f1ea');px(x+2,y+2,16,10,col);px(x+2,y+14,16,1,'#1b1b22');px(x+2,y+17,10,1,'#1b1b22');px(x+2,y+20,13,1,'#1b1b22');
      for(let k=0;k<4;k++)px(x+20-k,y+26-k*2,k+1,1,'#6a3a34');px(x+1,y+1,1,1,'#c0c0c0');px(x+18,y+1,1,1,'#c0c0c0');});
    // neon sign (flickers) + spray tags
    texts.push({t:'MEOW',x:80,y:22,size:11,col:'#ff3ad0',glow:'#ff3ad0',flicker:true});
    for(let k=0;k<3;k++){let x=58+k*14,y=50+k*3;for(let i=0;i<12;i++){px(x,y,2,1,R(['#3dff8a','#3dd6e0','#ffe03a']));x+=1;y+=Math.round(Math.sin(i*1.3)*1.5);}}
    // shelf of spray cans, guitar amp, studded bed
    px(116,44,34,3,'#2a2a30');[['#ff4fa0'],['#3dd6e0'],['#ffe03a'],['#3dff8a']].forEach(([col],i)=>{px(118+i*8,36,5,8,col);px(119+i*8,34,3,2,'#c0c0c0');});
    px(6,52,26,26,'#1b1b22');px(8,54,22,14,'#3a3a44');for(let y=56;y<66;y+=2)px(9,y,20,1,'#2a2a30');px(10,70,4,4,'#c0c0c0');px(18,70,4,4,'#c0c0c0');live.push({x:26,y:71,w:2,h:2,c:['#ff3a3a','#5a1010'],ms:700});
    punkFloor('stage');
    rug('#1b1b22','#ff3ad0','#2a2a30');
    for(let y=0;y<10;y++){const w=Math.round(24*Math.sin(Math.PI*(y+1)/11));px(140-w/2,92+y,w,1,y<3?'#2a2a30':'#1b1b22');}for(let x=130;x<151;x+=3)px(x,94,1,1,'#e0e0e0');
    px(18,107,9,3,'#1b1b22');for(let x=18;x<27;x+=2)px(x,106,1,1,'#e0e0e0');px(26,106,2,2,'#c0c0c0');                                                              // spiked collar toy
  }

  if(style==='scifi'){
    px(0,0,W,78,'#2a3444');for(let y=0;y<70;y+=14){px(0,y,W,1,'#1a2230');px(0,y+1,W,1,'#3a4658');for(let x=0;x<W;x+=20){px(x,y,1,14,'#1a2230');px(x+2,y+3,1,1,'#7a8aa0');px(x+17,y+3,1,1,'#7a8aa0');px(x+2,y+11,1,1,'#7a8aa0');px(x+17,y+11,1,1,'#7a8aa0');}}
    px(0,30,W,1,'#3dd6ff');live.push({x:0,y:30,w:W,h:1,c:['#3dd6ff','#1a8ab0'],ms:1300});
    dado('#1a2230','#3dd6ff','#0a1220');
    // porthole with stars and a ringed planet
    for(let y=-20;y<=20;y++)for(let x=-20;x<=20;x++){const r=x*x+y*y;if(r<=400)px(80+x,26+y,1,1,r>320?'#8a9ab0':r>290?'#4a5a70':'#0a0e22');}
    for(let k=0;k<20;k++){const a=rnd()*6.28,r=rnd()*16;px(80+Math.cos(a)*r,26+Math.sin(a)*r,1,1,'#ffffff');}
    for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++)if(x*x+y*y<=25)px(86+x,22+y,1,1,'#c86ad8');for(let x=-9;x<=9;x++)px(86+x,22+Math.round(x*.25),1,1,'#f2cf6e');
    for(let a=0;a<6.28;a+=.4)px(80+Math.cos(a)*19,26+Math.sin(a)*19,1,1,'#c8d4e4');
    // holo-display, shelf of gadgets, light pillar
    px(10,14,30,22,'rgba(61,214,255,.25)');px(10,14,30,1,'#3dd6ff');px(10,35,30,1,'#3dd6ff');for(let k=0;k<5;k++)px(13,18+k*3,8+((k*7)%14),1,'#3dd6ff');for(let k=0;k<6;k++)px(28+k*2,30-((k*5)%9),1,(k*5)%9+1,'#7dffb0');
    live.push({x:10,y:14,w:30,h:1,c:['#3dd6ff','#bff4ff'],ms:500});
    px(116,22,34,3,'#3a4658');px(116,22,34,1,'#5a6a80');px(119,14,6,8,'#5a6a80');live.push({x:121,y:16,w:2,h:2,c:['#3dff8a','#0a4020'],ms:600});
    px(131,16,6,6,'#c8d4e4');px(133,18,2,2,'#3dd6ff');px(142,12,6,10,'#3a4658');live.push({x:144,y:14,w:2,h:1,c:['#ff3a4a','#400a10'],ms:450});
    px(14,44,4,34,'#5a6a80');px(12,42,8,4,'#c8d4e4');px(15,46,2,30,'#3dd6ff');live.push({x:15,y:46,w:2,h:30,c:['#3dd6ff','#7fe6ff'],ms:800});
    // glowing floor grid
    const vx=80,vy=56,camH=H-vy;for(let y=78;y<H;y++){const sc=(y-vy)/camH,row=Math.floor(120/sc/10);
      for(let k=-30;k<30;k++){const xa=vx+k*16*sc,xb=vx+(k+1)*16*sc;if(xb<0||xa>W)continue;px(xa,y,xb-xa+1,1,'#1e2632');px(xa,y,1,1,'#2a6a8a');}
      if(row!==Math.floor(120/((y+1-vy)/camH)/10))px(0,y,W,1,'#2a6a8a');}
    // round holo-rug (rings) and a hover-pod bed
    for(let r=0;r<3;r++)for(let a=0;a<6.28;a+=.03)px(80+Math.cos(a)*(54-r*14),PET.floorY+Math.sin(a)*(9-r*2.4),1,1,'#3dd6ff');
    for(let y=0;y<8;y++){const w=Math.round(26*Math.sin(Math.PI*(y+1)/9));px(140-w/2,88+y,w,1,y<2?'#c8d4e4':'#8a9ab0');}px(130,96,20,1,'#3dd6ff');live.push({x:130,y:97,w:20,h:1,c:['#3dd6ff','#1a6a8a'],ms:400});
    px(18,106,8,6,'#c8d4e4');px(19,104,6,3,'#8a9ab0');px(20,105,1,1,'#3dff8a');px(23,105,1,1,'#3dff8a');                                                              // little robot toy
  }
  return {canvas:c,live,texts};
}

/* ---------- spell deck: registered forms are spell cards; casting one changes the pet's skin ---------- */
const CARD={W:64,H:112};
const RSTARS={common:1,uncommon:2,rare:3,epic:4,legendary:5};
const hexRGB=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixHex=(a,b,t)=>{const A=hexRGB(a),B=hexRGB(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');};
const GOLD={hi:'#fff0a8',lt:'#f6d36a',md:'#d9a63a',dk:'#9a6a1a'};
function cardCanvas(){const c=document.createElement('canvas');c.width=CARD.W;c.height=CARD.H;return c;}
function cardPx(g){return (x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};}
function roundedMask(px,inset,r,col){  // filled card shape with pixel-rounded corners
  for(let y=inset;y<CARD.H-inset;y++){const dy=Math.max(0,inset+r-y,y-(CARD.H-inset-1-r));const cut=dy?r-Math.round(Math.sqrt(Math.max(0,r*r-dy*dy))):0;px(inset+cut,y,CARD.W-2*inset-2*cut,1,col);}
}
function star4(px,x,y,col,hi){px(x,y-2,1,5,col);px(x-2,y,5,1,col);px(x,y,1,1,hi);}
function mottle(px,rnd,x0,y0,w,h,cols,n){for(let k=0;k<n;k++)px(x0+Math.floor(rnd()*w),y0+Math.floor(rnd()*h),1+(rnd()<.3),1,cols[Math.floor(rnd()*cols.length)]);}

// the back of every card (also the Spell Deck button)
function drawCardBack(){
  const c=cardCanvas(),g=c.getContext('2d'),px=cardPx(g),rnd=seeded(77),W=CARD.W,H=CARD.H;
  roundedMask(px,0,5,'#c9782a');roundedMask(px,1,4,'#f0a646');mottle(px,rnd,2,2,W-4,H-4,['#e8973a','#f6b65a','#eaa04a'],220);
  // crimson field with clipped corners
  for(let y=5;y<H-5;y++){const e=Math.min(y-5,H-6-y),cut=Math.max(0,5-e);px(5+cut,y,W-10-2*cut,1,'#a3142a');}
  mottle(px,rnd,7,7,W-14,H-14,['#8c0e22','#b81c34','#951026'],260);
  // double gold oval ring with rune dots between
  const cx=32,cy=56;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=((x-cx)/25)**2+((y-cy)/47)**2,i=((x-cx)/21)**2+((y-cy)/43)**2;
    if(o<=1&&o>.86)px(x,y,1,1,o>.94?GOLD.dk:GOLD.lt);else if(i<=1&&i>.88)px(x,y,1,1,i>.95?GOLD.md:GOLD.hi);else if(o<=1&&i>1)px(x,y,1,1,'#6e0a1a');}
  for(let a=0;a<Math.PI*2;a+=Math.PI/9){px(cx+Math.cos(a)*23-.5,cy+Math.sin(a)*45-.5,1,1,GOLD.lt);}
  // diamond with a cat's eye in the middle
  for(let t=0;t<=1;t+=.02){const L=(x0,y0,x1,y1)=>px(x0+(x1-x0)*t,y0+(y1-y0)*t,1,1,GOLD.md);L(cx,24,cx+16,cy);L(cx+16,cy,cx,88);L(cx,88,cx-16,cy);L(cx-16,cy,cx,24);}
  for(let y=-8;y<=8;y++){const w=Math.round(14*Math.cos(y/8.6*Math.PI/2));px(cx-w,cy+y,w*2,1,Math.abs(y)>6?GOLD.md:GOLD.lt);}
  for(let y=-7;y<=7;y++){const w=Math.abs(y)>5?0:Math.abs(y)>3?1:2;px(cx-w,cy+y,w*2||1,1,'#5a0614');}
  px(cx+4,cy-4,2,2,GOLD.hi);px(cx+6,cy-2,1,1,'#ffffff');
  for(const [x,y] of [[cx,21],[cx,91],[cx-19,cy],[cx+19,cy]])star4(px,x,y,GOLD.lt,'#ffffff');
  for(const [x,y] of [[6,6],[W-7,6],[6,H-7],[W-7,H-7]])star4(px,x,y,GOLD.md,GOLD.hi);
  return c;
}
let CARD_BACK=null;const cardBack=()=>CARD_BACK||(CARD_BACK=drawCardBack());

// the face of a card: rarity-coloured arch panel with the skin inside, a name ribbon and rarity stars
const cardCache=new Map();
async function cardFront(regId){
  const r=regDocs.get(regId);if(!r)return null;const key=regId+'|'+(r.rarity||'')+'|'+r.name+'|'+JSON.stringify(r.changes||{})+'|'+sinkOf(r.baseFormId)+'|'+nudgeOf(r.baseFormId);
  const hit=cardCache.get(regId);if(hit&&hit.key===key)return hit;
  const f=await getForm(r.baseFormId);if(!f)return null;
  const c=cardCanvas(),g=c.getContext('2d'),px=cardPx(g),rnd=seeded(regId.length*13+7),W=CARD.W,H=CARD.H,rc=rarityOf(r.rarity).c;
  roundedMask(px,0,5,'#c98a3a');roundedMask(px,1,4,'#f3dcab');mottle(px,rnd,2,2,W-4,H-4,['#ead0a0','#f8e8c4','#e6c894'],200);
  // arch panel
  const X0=8,X1=55,Y0=15,Y1=88;const inArch=(x,y)=>y>=Y0+12||((x-31.5)/23.5)**2+((y-(Y0+12))/12)**2<=1;
  for(let y=Y0-2;y<=Y1+2;y++)for(let x=X0-2;x<=X1+2;x++){
    const inner=x>=X0&&x<=X1&&y<=Y1&&inArch(x,y),ring1=x>=X0-1&&x<=X1+1&&y<=Y1+1&&(y>=Y0+12?true:((x-31.5)/24.5)**2+((y-(Y0+12))/13)**2<=1),ring2=x>=X0-2&&x<=X1+2&&y<=Y1+2&&(y>=Y0+12?true:((x-31.5)/25.5)**2+((y-(Y0+12))/14)**2<=1);
    if(inner){const t=(y-Y0)/(Y1-Y0),band=Math.floor(t*6)/6;const dither=((x+y)%2)&&((t*6)%1<.25);px(x,y,1,1,mixHex(mixHex(rc,'#1c1430',.62-.42*(dither?band-1/6:band)),'#ffffff',.06));}
    else if(ring1)px(x,y,1,1,GOLD.lt);else if(ring2)px(x,y,1,1,GOLD.dk);}
  for(let k=0;k<18;k++){const x=X0+2+Math.floor(rnd()*(X1-X0-4)),y=Y0+14+Math.floor(rnd()*(Y1-Y0-18));px(x,y,1,1,mixHex(rc,'#ffffff',.55));}   // soft sparkles in the panel
  // skin (idle, first frame) standing on a little glow
  const st=f.anims.idle?'idle':f.firstState(),A=f.anims[st],fr=bake(f,A,mapFromChanges(f,r.changes))[0],cr=f.crop;
  const s=Math.min(1,(X1-X0-2)/cr.w,(Y1-Y0-20)/cr.h),w=Math.round(cr.w*s),h=Math.round(cr.h*s),fx=Math.round(31.5-w/2+(baseDocs.get(f.id)&&baseDocs.get(f.id).facing==='right'?-1:1)*nudgeOf(f)*s),fy=Y1-5-h+Math.round(sinkOf(f)*s);
  for(let x=-14;x<=14;x++)px(31.5+x,Y1-5,1,1,mixHex(rc,'#ffffff',.35+.4*(1-Math.abs(x)/14)));
  g.imageSmoothingEnabled=false;g.save();if(baseDocs.get(f.id)&&baseDocs.get(f.id).facing==='right'){g.translate(W,0);g.scale(-1,1);g.drawImage(fr,cr.x,cr.y,cr.w,cr.h,W-fx-w,fy,w,h);}else g.drawImage(fr,cr.x,cr.y,cr.w,cr.h,fx,fy,w,h);g.restore();
  // crest: a gold cat head with a rarity gem
  px(24,4,3,6,GOLD.md);px(25,3,1,2,GOLD.md);px(37,4,3,6,GOLD.md);px(38,3,1,2,GOLD.md);px(25,5,1,3,GOLD.hi);px(38,5,1,3,GOLD.hi);
  for(let y=-6;y<=5;y++){const w=Math.round(8.5*Math.sqrt(1-(y/6.5)**2));px(32-w,12+y,w*2,1,y<-3?GOLD.lt:y>3?GOLD.dk:GOLD.md);}
  px(26,11,3,1,GOLD.dk);px(35,11,3,1,GOLD.dk);
  px(30,13,4,4,mixHex(rc,'#000000',.35));px(30,13,3,3,rc);px(30,13,1,1,'#ffffff');
  // side stars and a little paw at the panel foot
  star4(px,4,52,GOLD.md,GOLD.hi);star4(px,W-5,52,GOLD.md,GOLD.hi);
  px(30,Y1-1,4,3,GOLD.md);px(29,Y1-3,1,1,GOLD.md);px(31,Y1-4,1,1,GOLD.md);px(33,Y1-4,1,1,GOLD.md);px(35,Y1-3,1,1,GOLD.md);
  // name ribbon
  px(1,94,6,9,GOLD.dk);px(57,94,6,9,GOLD.dk);px(1,98,2,1,'#f3dcab');px(61,98,2,1,'#f3dcab');
  px(4,91,56,10,GOLD.lt);px(4,91,56,1,GOLD.hi);px(4,100,56,1,GOLD.md);px(4,101,56,1,GOLD.dk);px(4,91,1,11,GOLD.md);px(59,91,1,11,GOLD.md);
  // rarity stars
  const n=RSTARS[rarityOf(r.rarity).k]||1;for(let i=0;i<n;i++){const sx=32+(i-(n-1)/2)*7;star4(px,sx,106,GOLD.dk,GOLD.dk);px(sx-1,105,3,3,GOLD.dk);px(sx,106,1,1,rc);}
  const out={key,canvas:c,name:r.name,rarity:rarityOf(r.rarity)};cardCache.set(regId,out);return out;
}
// paint a card into a display canvas (pixels scaled up, then crisp name text on the ribbon)
function paintCard(cv,art,{back=false,k=4}={}){
  cv.width=CARD.W*k;cv.height=CARD.H*k;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.clearRect(0,0,cv.width,cv.height);
  if(back||!art){g.drawImage(cardBack(),0,0,cv.width,cv.height);return;}
  g.drawImage(art.canvas,0,0,cv.width,cv.height);
  let fs=6.2;g.textAlign='center';g.textBaseline='middle';
  do{g.font=`700 ${fs*k}px 'Pixelify Sans', monospace`;fs-=.3;}while(g.measureText(art.name).width>52*k&&fs>3);
  g.fillStyle='#5a3a0a';g.fillText(art.name,32*k,96*k);
}

/* deck panel (right column) */
function renderDeckPanel(){
  const p=PR.id&&petDocs.get(PR.id),cards=deckCards();
  paintCard($('deckBackCv'),null,{back:true,k:2});
  $('deckBtn').disabled=!p;
  $('deckInfo').innerHTML=!p?'Create a pet to use your deck.':`<b>${cards.length}</b> card${cards.length===1?'':'s'} in your deck`;
  const cur=p&&regDocs.get(p.skinId);
  if(cur){$('deckWearing').innerHTML=`${esc(p.name)} wears <span class="rlabel" style="--rc:${rarityOf(cur.rarity).c}">${rarityDot(cur.rarity,10)}${esc(cur.name)}</span>`;
    cardFront(p.skinId).then(a=>{if(a)paintCard($('deckCurCv'),a,{k:2});});$('deckCurCv').hidden=false;}
  else{$('deckWearing').textContent=p?'No card cast yet':'';$('deckCurCv').hidden=true;}
  if(!$('deckModal').hidden)renderDeckModal();
}
/* deck modal: chosen card on top (card · skin preview · name, rarity, Cast), every card below — or the Spell Forge */
const DK={sel:null,player:null,forge:{on:false,sel:[],busy:false,result:null,pickId:null}};
const RORDER=['common','uncommon','rare','epic','legendary'];
const rkOf=id=>rarityOf((regDocs.get(id)||{}).rarity).k;
function deckOpen(){const p=PR.id&&petDocs.get(PR.id);if(!p)return;DK.sel=regDocs.has(p.skinId)?p.skinId:(deckCards()[0]||[])[0]||null;
  if(!ME().pending){DK.forge.on=false;DK.forge.sel=[];DK.forge.result=null;}
  $('deckModal').hidden=false;renderDeckModal();$('deckClose').focus();}
function deckClose(){if(ME().pending){toast('Pick your Legendary first — a forge can’t be undone');return;}$('deckModal').hidden=true;$('deckBtn').focus();}
function cardTile(id,{badge='',onclick=null,pressed=false,dim=false,k=2}={}){
  const r=regDocs.get(id),b=document.createElement('button');b.className='dkcard'+(dim?' dim':'');b.type='button';b.style.setProperty('--rc',rarityOf(r&&r.rarity).c);
  b.setAttribute('aria-pressed',pressed);b.title=r?`${r.name} · ${rarityOf(r.rarity).l}`:'';b.innerHTML=`<canvas></canvas>${badge}`;if(dim)b.disabled=true;
  if(onclick)b.onclick=onclick;cardFront(id).then(a=>{if(a)paintCard(b.querySelector('canvas'),a,{k});});return b;}
async function renderDeckModal(){
  if(DK.forge.busy&&DK.forge.on)return;            // mid-forge: let the animation finish
  const p=PR.id&&petDocs.get(PR.id),me=ME(),F=DK.forge;if(!p){$('deckModal').hidden=true;return;}
  if(me.pending)F.on=true;
  const cards=deckCards().sort((a,b)=>(RSTARS[rarityOf(b[1].rarity).k]-RSTARS[rarityOf(a[1].rarity).k])||((a[1].createdAt||0)-(b[1].createdAt||0)));
  if(!DK.sel||!regDocs.has(DK.sel))DK.sel=cards[0]?cards[0][0]:null;
  $('deckTitle').textContent=F.on?'Spell Forge':'Spell Deck';
  $('deckCount').textContent=F.on?'':`${cards.length} card${cards.length===1?'':'s'}`;
  $('forgeBtn').textContent=F.on?'← Back to deck':'⚒ Spell Forge';$('forgeBtn').hidden=!!me.pending;$('forgeBtn').disabled=F.busy;
  $('deckClose').disabled=!!me.pending;
  $('forgePanel').hidden=!F.on;$('deckEmpty').hidden=!!cards.length||F.on;
  const grid=$('deckGrid');grid.innerHTML='';
  if(F.on){renderForge(cards);return;}
  for(const [id] of cards){const cnt=me.cards[id]||0;
    grid.appendChild(cardTile(id,{pressed:id===DK.sel,badge:`${id===p.skinId?'<span class="eq">Worn</span>':''}${cnt>1?`<span class="cnt">×${cnt}</span>`:''}`,onclick:()=>{DK.sel=id;renderDeckModal();}}));}
  const r=DK.sel&&regDocs.get(DK.sel);$('deckDetail').hidden=!r;
  if(!r)return;
  const rr=rarityOf(r.rarity);$('deckDetail').style.setProperty('--rc',rr.c);
  $('ddName').textContent=r.name;$('ddRarity').innerHTML=`${rarityDot(rr.k,12)}${rr.l} ${'★'.repeat(RSTARS[rr.k])}`;$('ddRarity').style.setProperty('--rc',rr.c);
  const worn=DK.sel===p.skinId;$('ddCast').disabled=worn;$('ddCast').textContent=worn?`${p.name} is wearing this`:'✨ Cast';
  const a=await cardFront(DK.sel);if(a&&DK.sel===a.key.split('|')[0])paintCard($('ddCard'),a,{k:3});
  const f=await getForm(r.baseFormId);if(!f)return;if(!DK.player)DK.player=player($('ddSkin'));
  feed(DK.player,f,f.anims.idle?'idle':f.firstState(),mapFromChanges(f,r.changes));
}

/* ---------- Spell Forge: 3 cards in → 1 card one rarity above the lowest of them (3 Legendaries → choose 1 of 10 Legendaries) ---------- */
function forgeTarget(sel){
  if(sel.length<3)return null;
  if(sel.every(id=>rkOf(id)==='legendary'))return {choose:true};
  const want=RORDER[Math.min(4,Math.min(...sel.map(id=>RORDER.indexOf(rkOf(id))))+1)],i=RORDER.indexOf(want);
  const pool=k=>petSkins().filter(([,r])=>rarityOf(r.rarity).k===k);
  for(let d=0;d<5;d++)for(const j of [i-d,i+d])if(j>=0&&j<5&&pool(RORDER[j]).length)return {want,got:RORDER[j],pool:pool(RORDER[j])};   // nearest rarity that has forms
  return null;
}
function renderForge(cards){
  const me=ME(),F=DK.forge,grid=$('deckGrid'),stage=$('fStage');
  $('deckDetail').hidden=true;
  // a Legendary choice in progress can't be backed out of
  if(me.pending){$('fSlots').hidden=true;$('fGo').hidden=true;$('fInfo').innerHTML='<b>Choose your Legendary.</b> Pick one of these skins — this can’t be undone, and the others are gone once you choose.';
    stage.hidden=false;stage.className='fstage choose';stage.innerHTML='';const opts=me.pending.options.filter(id=>regDocs.has(id));
    for(const id of opts)stage.appendChild(cardTile(id,{pressed:F.pickId===id,k:2,onclick:()=>{F.pickId=id;renderDeckModal();}}));
    const r=F.pickId&&regDocs.get(F.pickId);const go=document.createElement('div');go.className='fpick';
    go.innerHTML=r?`<span>Take <b>${esc(r.name)}</b>?</span><button class="btn acc" id="fTake">✨ Take this Legendary</button>`:'<span class="note" style="margin:0">Click a card to pick it.</span>';
    stage.appendChild(go);if(r)$('fTake').onclick=forgeTake;return;}
  $('fSlots').hidden=!!F.result;$('fGo').hidden=!!F.result;
  // the three slots
  const slots=$('fSlots');slots.innerHTML='';slots.classList.remove('merge');
  for(let i=0;i<3;i++){const id=F.sel[i];if(id){const t=cardTile(id,{k:2,onclick:()=>{if(F.busy)return;F.sel.splice(i,1);renderDeckModal();}});t.title+=' — click to take it out';slots.appendChild(t);}
    else{const e=document.createElement('div');e.className='fslot';e.textContent=i+1;slots.appendChild(e);}}
  const T=forgeTarget(F.sel);
  $('fInfo').innerHTML=F.result?'':F.sel.length<3?`Pick <b>${3-F.sel.length}</b> more card${3-F.sel.length>1?'s':''} from your deck below. You get one card a rarity above the lowest one you put in.`
    :T&&T.choose?`<b>3 Legendaries:</b> you’ll see 10 random Legendary skins and keep the one you choose. <b>Once you forge, there’s no undo.</b>`
    :T?`Result: a random <span class="rlabel" style="--rc:${rarityOf(T.got).c}">${rarityOf(T.got).l}</span> card${T.got!==T.want?` <span class="note">(no ${rarityOf(T.want).l} forms yet, so the closest rarity)</span>`:''}. The 3 cards are used up.`:'No forms to forge into.';
  $('fGo').disabled=F.busy||!T;
  stage.hidden=!F.result;
  // your cards: click to put a copy in a slot
  const used=id=>F.sel.filter(x=>x===id).length;
  for(const [id] of cards){const have=me.cards[id]||0,left=have-used(id);if(have<=0)continue;
    grid.appendChild(cardTile(id,{dim:left<=0||F.sel.length>=3||F.busy||!!F.result,badge:`<span class="cnt">×${left}</span>`,onclick:()=>{if(F.sel.length<3&&left>0&&!F.busy){F.sel.push(id);renderDeckModal();}}}));}
  if(!grid.children.length)grid.innerHTML='<p class="note">You have no cards to forge yet — open booster packs in the Shop.</p>';
}
async function forgeGo(){
  const F=DK.forge,me=ME(),T=forgeTarget(F.sel);if(!T||F.busy)return;
  const need={};for(const id of F.sel)need[id]=(need[id]||0)+1;
  if(Object.entries(need).some(([id,n])=>(me.cards[id]||0)<n)){toast('You don’t have those cards any more');F.sel=[];return renderDeckModal();}
  F.busy=true;const before={...me.cards};
  let out=null;
  if(LIVE){const r=await liveCall('/deck/forge',{ids:F.sel});if(!r){F.busy=false;F.sel=[];return renderDeckModal();}   // the server forges
    liveApply({player:r.player});if(r.card)out=r.card._id;}
  else{
  for(const [id,n] of Object.entries(need)){me.cards[id]-=n;if(me.cards[id]<=0)delete me.cards[id];}
  if(T.choose){const pool=petSkins().filter(([,r])=>rarityOf(r.rarity).k==='legendary').map(([id])=>id);
    const opts=pool.sort(()=>Math.random()-.5).slice(0,10);me.pending={options:opts,at:Date.now()};}      // up to 10 different Legendaries
  else{out=pick(T.pool)[0];me.cards[out]=(me.cards[out]||0)+1;}
  try{await savePlayer(me);}catch(_){F.busy=false;toast('Could not forge (do you have edit access?)');return renderDeckModal();}
  }
  // the three cards fly together and fuse
  $('fSlots').classList.add('merge');await new Promise(r=>setTimeout(r,750));
  F.sel=[];F.busy=false;F.pickId=null;
  if(T.choose){renderDeckModal();return;}
  F.result={id:out,isNew:!(before[out]>0)};renderDeckModal();
  const stage=$('fStage');stage.className='fstage';stage.innerHTML='';const r=regDocs.get(out),rr=rarityOf(r&&r.rarity);
  const el=document.createElement('button');el.type='button';el.className='gcard deal';el.style.setProperty('--rc',rr.c);el.setAttribute('aria-label','Forged card — click to reveal');
  el.innerHTML=`<div class="gin"><canvas class="gback"></canvas><canvas class="gfront"></canvas></div><div class="gcap"></div>`;
  paintCard(el.querySelector('.gback'),null,{back:true,k:3});cardFront(out).then(a=>{if(a)paintCard(el.querySelector('.gfront'),a,{k:3});});
  const again=document.createElement('button');again.className='btn';again.textContent='⚒ Forge again';again.hidden=true;
  again.onclick=()=>{F.result=null;renderDeckModal();};
  el.onclick=()=>{if(el.classList.contains('flipped'))return;el.classList.add('flipped');
    el.querySelector('.gcap').innerHTML=`${F.result.isNew?'<span class="gnew">NEW!</span>':''}<span class="rlabel" style="--rc:${rr.c}">${rarityDot(rr.k,10)}${rr.l}</span><b>${esc(r?r.name:'')}</b>`;
    if(['rare','epic','legendary'].includes(rr.k)){const fx=document.createElement('i');fx.className='gburst '+rr.k;el.appendChild(fx);}again.hidden=false;};
  const hint=document.createElement('div');hint.className='note';hint.style.margin='0';hint.textContent='Click the card to reveal it';
  el.addEventListener('click',()=>hint.remove(),{once:true});
  stage.append(el,hint,again);
}
async function forgeTake(){
  const F=DK.forge,me=ME(),id=F.pickId;if(!me.pending||!id||F.busy)return;F.busy=true;
  const isNew=!(me.cards[id]>0);
  if(LIVE){const r=await liveCall('/deck/legendary',{formId:id});if(!r){F.busy=false;return;}liveApply({player:r.player});}
  else{me.cards[id]=(me.cards[id]||0)+1;me.pending=null;
  try{await savePlayer(me);}catch(_){F.busy=false;return toast('Could not save (do you have edit access?)');}}
  F.busy=false;F.pickId=null;F.result={id,isNew};renderDeckModal();
  const r=regDocs.get(id),rr=rarityOf(r&&r.rarity),stage=$('fStage');stage.hidden=false;stage.className='fstage';stage.innerHTML='';
  const el=document.createElement('div');el.className='gcard flipped';el.style.setProperty('--rc',rr.c);
  el.innerHTML=`<div class="gin"><canvas class="gback"></canvas><canvas class="gfront"></canvas></div><div class="gcap">${isNew?'<span class="gnew">NEW!</span>':''}<span class="rlabel" style="--rc:${rr.c}">${rarityDot(rr.k,10)}${rr.l}</span><b>${esc(r?r.name:'')}</b></div><i class="gburst legendary"></i>`;
  paintCard(el.querySelector('.gback'),null,{back:true,k:3});cardFront(id).then(a=>{if(a)paintCard(el.querySelector('.gfront'),a,{k:3});});
  const again=document.createElement('button');again.className='btn';again.textContent='⚒ Forge again';again.onclick=()=>{F.result=null;renderDeckModal();};
  stage.append(el,again);$('deckModal').classList.add('quake');setTimeout(()=>$('deckModal').classList.remove('quake'),500);
}
$('forgeBtn').onclick=()=>{const F=DK.forge;if(F.busy||ME().pending)return;F.on=!F.on;F.sel=[];F.result=null;renderDeckModal();};
$('fGo').onclick=forgeGo;

$('deckBtn').onclick=deckOpen;$('deckClose').onclick=deckClose;
$('deckModal').addEventListener('click',e=>{if(e.target===$('deckModal'))deckClose();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('deckModal').hidden)deckClose();});
$('ddCast').onclick=()=>{const p=petDocs.get(PR.id),id=DK.sel;if(!p||!id||id===p.skinId)return;deckClose();petCast(id);};

/* casting: the card rises, spins and glows over the pet, a flash, and the new skin is on */
async function petCast(id){
  const art=await cardFront(id);if(!art||PR.cast)return;
  PR.cast={id,art,t0:performance.now(),swapped:false,col:art.rarity.c};PR.pending=null;PR.target=null;
}
function castStep(now){
  const C=PR.cast;if(!C)return;const t=now-C.t0;
  if(t>=1150&&!C.swapped){C.swapped=true;const p=petDocs.get(PR.id);
    if(p&&LIVE)liveCall('/deck/cast',{formId:C.id},`${p.name} is now ${C.art.name}!`).then(d=>{if(d)liveApply(d);});
    else if(p)writeDoc('pets',PR.id,{...p,skinId:C.id}).then(()=>{toast(`${p.name} is now ${C.art.name}!`);}).catch(()=>toast('Could not cast (do you have edit access?)'));
    const b=PR.box;if(b){const cols=[C.col,mixHex(C.col,'#ffffff',.6),'#ffffff'];for(let i=0;i<3;i++)petSparkle(b.cx+rnd(-10,10),b.top+rnd(4,b.h),cols);
      for(let i=0;i<5;i++)petPix(i%2?'sparkle':'sparkleS',b.cx+rnd(-16,16),b.top+rnd(-2,b.h-4),900+rnd(0,400),i*90);}
    petReact('love',500);}
  if(t>1900)PR.cast=null;
}
function castDrawLow(g,now){ // magic circle on the floor under the pet (low-res, before the pet is drawn)
  const C=PR.cast;if(!C)return;const t=now-C.t0;if(t<350||t>1600)return;const u=Math.min(1,(t-350)/500),fade=t>1250?1-(t-1250)/350:1;
  g.globalAlpha=Math.max(0,fade);const cx=Math.round(PR.pos.x),cy=Math.round(PR.pos.y)+1,R=24*u,spin=now/400;
  g.fillStyle=C.col;for(let a=0;a<Math.PI*2;a+=.05)g.fillRect(Math.round(cx+Math.cos(a)*R),Math.round(cy+Math.sin(a)*R*.3),1,1);
  g.fillStyle=mixHex(C.col,'#ffffff',.5);for(let a=0;a<Math.PI*2;a+=.07)g.fillRect(Math.round(cx+Math.cos(a)*R*.7),Math.round(cy+Math.sin(a)*R*.21),1,1);
  g.fillStyle='#ffffff';for(let i=0;i<6;i++){const a=spin+i*Math.PI/3;g.fillRect(Math.round(cx+Math.cos(a)*R*.85),Math.round(cy+Math.sin(a)*R*.255),1,1);}
  g.globalAlpha=1;
}
function castDrawHi(G,k,now){ // the card itself + the flash (full resolution)
  const C=PR.cast;if(!C)return;const t=now-C.t0,b=PR.box;
  const cx=(b?b.cx:PR.pos.x),topY=(b?b.top:PR.pos.y-30)-34;
  if(t<1250){const rise=Math.min(1,t/450),e=1-(1-rise)**3,sc=.35+.25*e,y=PET.H+10+(topY-PET.H-10)*e;
    const spin=t<450?1:Math.cos((t-450)/800*Math.PI*4),w=CARD.W*sc*k,h=CARD.H*sc*k,face=spin>=0;
    const glow=t<450?.3:.3+.7*Math.min(1,(t-450)/700);
    G.save();G.translate(cx*k,y*k);G.scale(Math.max(.04,Math.abs(spin)),1);G.shadowColor=C.col;G.shadowBlur=(8+14*glow)*k;G.imageSmoothingEnabled=false;
    G.drawImage(face?C.art.canvas:cardBack(),-w/2,-h/2,w,h);G.restore();}
  if(t>=1100&&t<1600){const a=t<1150?(t-1100)/50:1-(t-1150)/450;G.fillStyle=`rgba(255,255,255,${.75*Math.max(0,Math.min(1,a))})`;G.fillRect(0,0,PET.W*k,PET.H*k);}
}

/* ================= Gacha shop: buy booster packs, open them, flip cards to reveal ================= */
const GACHA={startPP:500000,testPP:100000,
  packs:{single:{l:'Single Pack',n:1,price:50000},triple:{l:'Triple Pack',n:3,price:100000},blackGold:{l:'Black & Gold Pack',n:7,price:200000}},
  odds:[['common',40],['uncommon',30],['rare',19],['epic',10],['legendary',1]]};   // % per card
const playerDocs=new Map();
const ME=()=>{const d=playerDocs.get('me')||{};return {pp:Number.isFinite(d.pp)?d.pp:GACHA.startPP,cards:{...(d.cards||{})},packs:{single:0,triple:0,blackGold:0,...(d.packs||{})},pending:d.pending||null,auras:{...(d.auras||{})},profile:{...(d.profile||{})},egg:d.egg||null,food:Number.isFinite(d.food)?d.food:0,balls:{...(d.balls||{})}};};
const fmtPP=n=>Math.round(n).toLocaleString('en-US');
function savePlayer(p){if(LIVE){LV.egg=p.egg||null;try{localStorage.setItem('catflix.egg',JSON.stringify(LV.egg));}catch(_){}return Promise.resolve();}return writeDoc('player','me',{pp:p.pp,cards:p.cards,packs:p.packs,pending:p.pending||null,auras:p.auras||{},profile:p.profile||{},egg:p.egg||null,food:p.food||0,balls:p.balls||{},updatedAt:Date.now()});}
function onPlayerChange(){renderShop();renderDeckPanel();renderProfile();renderPetAura();eggSync();renderToyPicker();const fb=$('petTools').querySelector('[data-v=food]');if(fb)fb.textContent=`🍖 Food ×${ME().food}`;}

// which cards are in your Spell Deck: every card you pulled, plus whatever your pet is already wearing
function deckCards(){const owned=ME().cards,p=PR.id&&petDocs.get(PR.id);
  return petSkins().filter(([id])=>(owned[id]||0)>0||(p&&p.skinId===id));}

/* ---------- rolling ---------- */
function rollRarity(){let r=Math.random()*100;for(const [k,w] of GACHA.odds){if(r<w)return k;r-=w;}return 'common';}
function rollCard(){
  const pool=k=>petSkins().filter(([,r])=>rarityOf(r.rarity).k===k);   // forms without a rarity count as common
  const want=rollRarity();let got=pool(want);
  if(!got.length)got=pool('common');                                     // that rarity isn't in the list yet → a common instead
  if(!got.length)got=petSkins();                                         // no commons either → anything
  if(!got.length)return null;const [id]=pick(got);return {id,rolled:want};
}

/* ---------- pixel booster pack ---------- */
const PACK={W:48,H:72};
function drawPack(kind){
  const c=document.createElement('canvas');c.width=PACK.W;c.height=PACK.H;const g=c.getContext('2d'),px=cardPx(g),rnd=seeded(kind==='triple'?31:kind==='blackGold'?53:17),W=PACK.W,H=PACK.H;
  // Single: red. Triple: purple. Black & Gold: black foil, the gold all the brighter on it.
  const pal=kind==='triple'?{a:'#3a1e6e',b:'#5a2fa0',c:'#7a4cd0',d:'#24124a'}:kind==='blackGold'?{a:'#0b0a0c',b:'#17151a',c:'#232027',d:'#000000'}:{a:'#7a0e20',b:'#a3142a',c:'#cc2a40',d:'#4e0814'};
  for(let y=5;y<H-5;y++){const t=(y-5)/(H-10);px(2,y,W-4,1,t<.15||t>.85?pal.a:t<.3||t>.7?pal.b:pal.c);}
  px(2,5,1,H-10,pal.d);px(W-3,5,1,H-10,pal.d);
  for(let k=0;k<7;k++){const x0=-10+k*12;for(let y=5;y<H-5;y++){const x=x0+Math.round((y-5)*.45);if(x>=3&&x<W-3)px(x,y,2,1,'rgba(255,255,255,.12)');}}   // foil shine
  // crimped ends
  for(const y0 of [0,H-6]){px(2,y0+1,W-4,5,'#c9a04a');px(2,y0+1,W-4,1,'#f0d27a');for(let x=2;x<W-2;x+=2)px(x,y0+(y0?5:0),1,1,'#8a6a1a');for(let x=3;x<W-3;x+=3)px(x,y0+2,1,3,'#a8822e');}
  // emblem: gold ring with the cat's eye from the card back
  const cx=24,cy=32;for(let y=-13;y<=13;y++)for(let x=-11;x<=11;x++){const r=(x/11)**2+(y/13)**2;if(r<=1&&r>.75)px(cx+x,cy+y,1,1,r>.9?GOLD.dk:GOLD.lt);}
  for(let y=-5;y<=5;y++){const w=Math.round(8*Math.cos(y/5.6*Math.PI/2));px(cx-w,cy+y,w*2,1,Math.abs(y)>3?GOLD.md:GOLD.lt);}
  for(let y=-4;y<=4;y++)px(cx-(Math.abs(y)>2?0:1),cy+y,Math.abs(y)>2?1:2,1,pal.d);px(cx+3,cy-3,1,1,'#ffffff');
  star4(px,cx,cy-17,GOLD.lt,'#ffffff');for(const [x,y] of [[8,14],[39,14],[8,50],[39,50]])px(x,y,1,1,GOLD.hi);
  // name strip (text is painted crisp on top)
  px(5,49,W-10,9,GOLD.lt);px(5,49,W-10,1,GOLD.hi);px(5,57,W-10,1,GOLD.dk);
  for(let k=0;k<30;k++)px(3+Math.floor(rnd()*(W-6)),7+Math.floor(rnd()*(H-14)),1,1,'rgba(255,240,200,.25)');
  return c;
}
const packArt={};const packCanvas=k=>packArt[k]||(packArt[k]=drawPack(k));
function paintPack(cv,kind,k=3){cv.width=PACK.W*k;cv.height=PACK.H*k;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(packCanvas(kind),0,0,cv.width,cv.height);
  g.textAlign='center';g.textBaseline='middle';g.font=`700 ${5.2*k}px 'Pixelify Sans', monospace`;g.fillStyle='#5a3a0a';g.fillText('SPELL PACK',24*k,53.5*k);
  if(kind==='triple'||kind==='blackGold'){const n=kind==='triple'?'×3':'×7';g.font=`700 ${7*k}px 'Pixelify Sans', monospace`;g.fillStyle='#ffe9a8';g.strokeStyle=kind==='triple'?'#24124a':'#000000';g.lineWidth=k;g.strokeText(n,38*k,12*k);g.fillText(n,38*k,12*k);}}

/* ---------- toys: balls (shared/catflix/rules.js toys; in the game the server counts the knocks: backend/utils/catflix/toys.js) ---------- */
// What each costs and how many knocks it lasts, the happiness a knock gives, and the love for you a knock by someone
// else's pet gives (a Play Date), as the server has them. `i`: its picker emoji.
const TOYS={happiness:5,loveForVisitor:1,balls:{beach:{l:'Beach ball',i:'🏐',price:1000,dur:10},soccer:{l:'Soccer ball',i:'⚽',price:2000,dur:20},
  basketball:{l:'Basketball',i:'🏀',price:3000,dur:30},yarn:{l:'Yarn ball',i:'🧶',price:10000,dur:100}}};
// Each ball as 7×7 pixel art, with a second frame for rolling.
const BALL_ART={
  beach:{pal:{r:'#e8453c',w:'#ffffff',b:'#3a7bd5',y:'#ffd23f',g:'#4cbb5e'},frames:[
    ['..rww..','.rrwwb.','yrrwwbb','yyrwbbb','yyygbbb','.yyggg.','..ggg..'],
    ['..wwb..','.rwwbb.','rrwwbbg','rrwbbgg','yrrbggg','.yyygg.','..yyy..']]},
  soccer:{pal:{w:'#f4f4f4',k:'#26262b',s:'#bdbdc4'},frames:[
    ['..www..','.wwkww.','wwkkkww','wkwwwkw','wwwkwws','.wkkks.','..wss..'],
    ['..wkw..','.wwwwk.','kwwkwwk','wwkkkww','kwwkwws','.wwwws.','..kss..']]},
  basketball:{pal:{o:'#e2702a',d:'#5a2a10',l:'#f39a54'},frames:[
    ['..odo..','.lodoo.','dlodood','ddddddd','doodood','.oodoo.','..odo..'],
    ['..ood..','.lodoo.','olodddo','ddddddd','oodddoo','.ooddo.','..ood..']]},
  yarn:{pal:{p:'#ff7ab6',d:'#c94f8a',l:'#ffc2dc'},frames:[
    ['..pdp..','.pldpd.','pldpldp','dpldpld','pdpldpd','.dpldp.','..pdp..'],
    ['..dpd..','.dpldp.','dpldpld','pldpldp','dpldpld','.pldpd.','..dpd..']]}};
// A ball's art on a canvas, `k` times its size (the shop).
function paintBall(cv,kind,k=6){const A=BALL_ART[kind];cv.width=cv.height=7*k;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  A.frames[0].forEach((r,j)=>{for(let i=0;i<7;i++){const c=A.pal[r[i]];if(c){g.fillStyle=c;g.fillRect(i*k,j*k,k,k);}}});}
// A ball in a pet room: on the floor at (x, y), `z` up in the air, its frame changing as it rolls.
function drawBall(g,b){const x=Math.round(b.x),y=Math.round(b.y),z=Math.round(b.z||0),A=BALL_ART[b.kind];if(!A)return;
  g.fillStyle=z>4?'rgba(60,30,20,.15)':'rgba(60,30,20,.3)';g.fillRect(x-(z>4?2:3),y,z>4?5:7,1);   // its shadow, smaller while it's in the air
  const rows=A.frames[Math.floor((b.roll||0)/3)%2],flip=(b.dir||1)<0;
  for(let j=0;j<7;j++)for(let i=0;i<7;i++){const c=A.pal[rows[j][flip?6-i:i]];if(c){g.fillStyle=c;g.fillRect(x-3+i,y-7-z+j,1,1);}}
  if(b.kind==='yarn'){const t=flip?1:-1;g.fillStyle=A.pal.d;g.fillRect(x+t*4,y-2-z,1,1);g.fillRect(x+t*5,y-1-z,1,1);g.fillRect(x+t*6,y-1-z,1,1);}}   // its loose end trails
// The shop's toys: each ball, its knocks, whether you have one (and its knocks left), and Buy (one of each at a time).
function renderToys(){const el=$('shopToys');if(!el)return;const me=ME();
  el.innerHTML=Object.entries(TOYS.balls).map(([k,t])=>{const left=me.balls[k]>0?me.balls[k]:0;
    return `<div class="supply"><canvas data-ball="${k}"></canvas><div><b>${t.l}</b><div class="note" style="margin:2px 0 0">${t.dur} knocks · ${left?`yours has <b>${left}</b> left`:'you don’t have one'}</div></div>
      <span class="sp"></span><button class="btn acc" data-ball-buy="${k}" ${left||me.pp<t.price?'disabled':''} ${left?'title="One at a time: wear it out first"':''}>${left?'You have it':`Buy · ${fmtPP(t.price)} PP`}</button></div>`;}).join('');
  el.querySelectorAll('canvas[data-ball]').forEach(cv=>paintBall(cv,cv.dataset.ball));}
$('shopToys').addEventListener('click',async e=>{const b=e.target.closest('[data-ball-buy]');if(!b||b.disabled)return;const k=b.dataset.ballBuy,T=TOYS.balls[k],me=ME();
  if(LIVE){if(await liveCall('/shop/buy',{item:'ball',kind:k},`${T.l} bought — drop it in a pet room with 🎾 Toy`))await liveRefresh();return;}
  if(me.balls[k]>0)return toast('One at a time: wear it out first');if(me.pp<T.price)return toast('Not enough PP');
  me.pp-=T.price;me.balls[k]=T.dur;try{await savePlayer(me);toast(`${T.l} bought — drop it in a pet room with 🎾 Toy`);}catch(_){toast('Could not buy (do you have edit access?)');}});

/* ---------- shop page ---------- */
function renderShop(){
  if(!$('shop'))return;const me=ME();renderCrystals();renderToys();
  $('foodHave').textContent=me.food;$('foodBuy').disabled=me.pp<100;
  if(!renderShop.icon){renderShop.icon=1;const cv=$('foodIcon'),spr=runSprites().food;cv.width=spr.width*4;cv.height=spr.height*4;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(spr,0,0,cv.width,cv.height);}
  $('ppBal').textContent=fmtPP(me.pp);
  $('shopOffers').innerHTML=Object.entries(GACHA.packs).map(([k,p])=>`<div class="offer"><button class="packbtn" data-buy="${k}" ${me.pp<p.price?'disabled':''} title="Buy a ${p.l}"><canvas data-pack="${k}"></canvas></button>
    <div class="ofname">${p.l}</div><div class="note" style="margin:0">${p.n} card${p.n>1?'s':''}</div><button class="btn acc" data-buy="${k}" ${me.pp<p.price?'disabled':''}>Buy · ${fmtPP(p.price)} PP</button></div>`).join('');
  $('shopOffers').querySelectorAll('canvas[data-pack]').forEach(cv=>paintPack(cv,cv.dataset.pack,3));
  const owned=[];for(const k of ['blackGold','triple','single'])for(let i=0;i<(me.packs[k]||0);i++)owned.push(k);
  $('myPacks').innerHTML=owned.length?owned.map(k=>`<button class="packbtn small" data-open="${k}" title="Open this ${GACHA.packs[k].l}"><canvas data-pack="${k}"></canvas></button>`).join(''):'<p class="note" style="margin:0">No packs yet — buy one on the left.</p>';
  $('myPacks').querySelectorAll('canvas[data-pack]').forEach(cv=>paintPack(cv,cv.dataset.pack,2));
  const total=Object.values(me.cards).reduce((a,b)=>a+b,0),kinds=Object.keys(me.cards).filter(id=>regDocs.has(id)&&me.cards[id]>0).length;
  $('shopColl').textContent=`${total} card${total===1?'':'s'} pulled · ${kinds} of ${petSkins().length} different skins`;
  const counts={};for(const [,r] of petSkins()){const k=rarityOf(r.rarity).k;counts[k]=(counts[k]||0)+1;}
  $('shopOdds').innerHTML=GACHA.odds.map(([k,w])=>{const r=rarityOf(k);return `<div class="oddrow" style="--rc:${r.c}"><span class="rlabel">${rarityDot(k,11)}${r.l}</span><span class="note" style="margin:0">${counts[k]||0} in pool${counts[k]?'':' → gives a Common'}</span><b>${w}%</b></div>`;}).join('');
}
$('shopOffers').addEventListener('click',async e=>{const b=e.target.closest('[data-buy]');if(!b||b.disabled)return;const k=b.dataset.buy,P=GACHA.packs[k],me=ME();
  if(LIVE){if(await liveCall('/shop/buy',{item:'pack',kind:k},`${P.l} added to your packs — click it to open`))await liveRefresh();return;}
  if(me.pp<P.price)return toast('Not enough PP');if(!petSkins().length)return toast('Register a form in the Studio first — packs are filled from registered forms');
  me.pp-=P.price;me.packs[k]++;try{await savePlayer(me);toast(`${P.l} added to your packs — click it to open`);}catch(_){toast('Could not buy (do you have edit access?)');}});
$('foodBuy').onclick=async()=>{const me=ME();
  if(LIVE){if(await liveCall('/shop/buy',{item:'food'},'+3 pet food'))await liveRefresh();return;}if(me.pp<100)return toast('Not enough PP');me.pp-=100;me.food+=3;try{await savePlayer(me);toast('+3 pet food');}catch(_){toast('Could not buy (do you have edit access?)');}};
$('ppAdd').onclick=async()=>{const me=ME();me.pp+=GACHA.testPP;try{await savePlayer(me);}catch(_){toast('Could not save');}};
$('myPacks').addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)packStage(b.dataset.open);});

/* ---------- opening: click the pack to tear it open, then click each card back to flip it ---------- */
const GO={kind:null,pulls:[],busy:false};
function packStage(kind){
  GO.kind=kind;GO.pulls=[];GO.busy=false;
  $('gachaModal').hidden=false;$('gachaCards').innerHTML='';$('gachaCards').hidden=true;$('gachaDone').hidden=true;$('gachaRevealAll').hidden=true;$('gachaSum').textContent='';
  const pb=$('gachaPack');pb.hidden=false;pb.className='bigpack';paintPack(pb.querySelector('canvas'),kind,5);
  $('gachaHint').textContent='Click the pack to open it';pb.focus();
}
$('gachaPack').onclick=async()=>{
  if(GO.busy||!GO.kind)return;const me=ME();if(me.packs[GO.kind]<=0){$('gachaModal').hidden=true;return;}
  GO.busy=true;const n=GACHA.packs[GO.kind].n,before={...me.cards};
  if(LIVE){const r=await liveCall('/packs/open',{kind:GO.kind});if(!r){GO.busy=false;return;}   // the server rolls every card
    GO.pulls=r.cards.map(c=>({id:c._id,isNew:c.isNew}));liveApply({player:r.player});}
  else{
  const pulls=[];for(let i=0;i<n;i++){const c=rollCard();if(c)pulls.push(c);}
  me.packs[GO.kind]--;for(const p of pulls)me.cards[p.id]=(me.cards[p.id]||0)+1;
  try{await savePlayer(me);}catch(_){GO.busy=false;return toast('Could not open (do you have edit access?)');}   // cards are saved the moment the pack is opened
  const seen=new Set();GO.pulls=pulls.map(p=>{const isNew=!(before[p.id]>0)&&!seen.has(p.id);seen.add(p.id);return {...p,isNew};});   // only the first copy is NEW
  }
  const pb=$('gachaPack');pb.classList.add('shake');$('gachaHint').textContent='';
  await new Promise(r=>setTimeout(r,650));pb.classList.add('burst');await new Promise(r=>setTimeout(r,260));pb.hidden=true;
  const box=$('gachaCards');box.hidden=false;box.innerHTML='';box.classList.toggle('many',GO.pulls.length>4);
  GO.pulls.forEach((p,i)=>{const r=regDocs.get(p.id),rr=rarityOf(r&&r.rarity);
    const el=document.createElement('button');el.type='button';el.className='gcard deal';el.style.setProperty('--rc',rr.c);el.style.animationDelay=(i*140)+'ms';el.dataset.r=rr.k;
    el.setAttribute('aria-label','Face-down card — click to reveal');
    el.innerHTML=`<div class="gin"><canvas class="gback"></canvas><canvas class="gfront"></canvas></div><div class="gcap"></div>`;
    paintCard(el.querySelector('.gback'),null,{back:true,k:3});cardFront(p.id).then(a=>{if(a)paintCard(el.querySelector('.gfront'),a,{k:3});});
    el.onclick=()=>gachaFlip(el,p);box.appendChild(el);});
  $('gachaHint').textContent=GO.pulls.length>1?'Click each card to reveal it':'Click the card to reveal it';$('gachaRevealAll').hidden=GO.pulls.length<2;GO.busy=false;
};
function gachaFlip(el,p){
  if(el.classList.contains('flipped'))return;el.classList.add('flipped');
  const r=regDocs.get(p.id),rr=rarityOf(r&&r.rarity);
  el.setAttribute('aria-label',`${r?r.name:'Card'} · ${rr.l}`);
  el.querySelector('.gcap').innerHTML=`${p.isNew?'<span class="gnew">NEW!</span>':''}<span class="rlabel" style="--rc:${rr.c}">${rarityDot(rr.k,10)}${rr.l}</span><b>${esc(r?r.name:'')}</b>`;
  if(['rare','epic','legendary'].includes(rr.k)){const fx=document.createElement('i');fx.className='gburst '+rr.k;el.appendChild(fx);}
  if(rr.k==='legendary')$('gachaModal').classList.add('quake'),setTimeout(()=>$('gachaModal').classList.remove('quake'),500);
  const left=[...$('gachaCards').children].filter(c=>!c.classList.contains('flipped')).length;
  if(!left){$('gachaHint').textContent='';$('gachaRevealAll').hidden=true;const best=GO.pulls.map(q=>rarityOf((regDocs.get(q.id)||{}).rarity)).sort((a,b)=>RSTARS[b.k]-RSTARS[a.k])[0];
    $('gachaSum').innerHTML=`Added to your Spell Deck${best?` · best pull: <span class="rlabel" style="--rc:${best.c}">${best.l}</span>`:''}`;
    $('gachaDone').hidden=false;const me=ME();$('gachaAgain').hidden=!(me.packs[GO.kind]>0);}
}
$('gachaClose').onclick=()=>{$('gachaModal').hidden=true;embedSay('closed');};
// Opened over the site's Notifications (#open=<kind>): "Go to Spell Deck" takes the whole site to the Pet room.
$('gachaToDeck').addEventListener('click',e=>{if(!EMBED)return;e.preventDefault();embedSay('goto',{to:'/games/catflix#pet'});});
$('gachaAgain').onclick=()=>packStage(GO.kind);
$('gachaRevealAll').onclick=()=>{[...$('gachaCards').children].forEach((el,i)=>setTimeout(()=>el.click(),i*220));};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('gachaModal').hidden&&!GO.busy){$('gachaModal').hidden=true;embedSay('closed');}});

/* ================= Auras: bought as crystals in the Shop, shown only on the profile ================= */
const AURAS={
  ember:    {l:'Ember',    c:'#ff7a1a',price:500000,gem:['#ffe2a0','#ff9a3a','#c2410c','#5a1406'],tip:'Rising embers and a heat glow'},
  frost:    {l:'Frost',    c:'#8fe0ff',price:500000,gem:['#f2fcff','#8fe0ff','#3a8ac8','#123a6a'],tip:'Drifting snow, ice sparkles, a frosted floor'},
  verdant:  {l:'Verdant',  c:'#6ee06a',price:500000,gem:['#e2ffd0','#6ee06a','#2a8a3a','#0e3a18'],tip:'Orbiting leaves, petals and sprouting grass'},
  void:     {l:'Void',     c:'#a35cff',price:500000,gem:['#e8d0ff','#a35cff','#5a1a9a','#1e0838'],tip:'Dark smoke and orbiting void motes'},
  storm:    {l:'Storm',    c:'#bfe6ff',price:500000,gem:['#ffffff','#bfe6ff','#4a8ad8','#14244a'],tip:'Crackling electric arcs'},
  celestial:{l:'Celestial',c:'#ffd86b',price:500000,gem:['#fffbe0','#ffd86b','#c9901a','#5a3a08'],tip:'A halo, orbiting stars and soft light beams'},
  sakura:   {l:'Sakura Storm',c:'#ff9ec8',price:500000,gem:['#fff0f6','#ff9ec8','#d0548a','#5a1430'],tip:'A whirlwind of cherry blossoms spiralling around your pet'},
  rain:     {l:'Rain Cloud',c:'#9ab4d8',price:800000,gem:['#f0f4ff','#a8b4d0','#5a6688','#22283e'],tip:'A little rain cloud that follows your pet around',noGlow:true}};

// pixel crystal (15×22)
function drawCrystal(key){const [L,M,D,X]=AURAS[key].gem;const c=document.createElement('canvas');c.width=15;c.height=22;const g=c.getContext('2d');
  for(let y=0;y<22;y++){const hw=y<=6?y:y>=15?21-y:6;for(let x=7-hw;x<=7+hw;x++){const edge=x===7-hw||x===7+hw||y===0||y===21;
    g.fillStyle=edge?X:y<6?L:x<7?M:x===7?L:D;g.fillRect(x,y,1,1);}}
  g.fillStyle='#ffffff';g.fillRect(4,8,1,2);g.fillRect(5,7,1,1);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(6,3,1,1);return c;}
const crystalArt={};const crystalCanvas=k=>crystalArt[k]||(crystalArt[k]=drawCrystal(k));
function paintCrystal(cv,key,k=4){cv.width=15*k;cv.height=22*k;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(crystalCanvas(key),0,0,cv.width,cv.height);}

/* ---------- shop: crystals ---------- */
const auraPriceNow=k=>LIVE&&LV.prices[k]!==undefined?LV.prices[k]:AURAS[k].price;
function renderCrystals(){const me=ME(),el=$('shopCrystals');if(!el)return;
  el.innerHTML=Object.entries(AURAS).map(([k,a])=>{const own=!!me.auras[k];return `<div class="crys" style="--ac:${a.c}"><canvas data-crys="${k}"></canvas><div class="ofname">${a.l}</div><div class="note" style="margin:0;text-align:center">${a.tip}</div>
    ${own?'<span class="owned">✓ Owned</span>':`<button class="btn acc" data-crysbuy="${k}" ${me.pp<auraPriceNow(k)?'disabled':''}>Buy · ${fmtPP(auraPriceNow(k))} PP${auraPriceNow(k)<a.price?' <s>'+fmtPP(a.price)+'</s>':''}</button>`}</div>`;}).join('');
  el.querySelectorAll('canvas[data-crys]').forEach(cv=>paintCrystal(cv,cv.dataset.crys,4));}
$('shopCrystals').addEventListener('click',async e=>{const b=e.target.closest('[data-crysbuy]');if(!b||b.disabled)return;const k=b.dataset.crysbuy,a=AURAS[k],me=ME();
  if(LIVE){if(await liveCall('/shop/buy',{item:'aura',aura:k},`${a.l} crystal unlocked — equip it in the Pet tab`))await liveRefresh();return;}
  if(me.auras[k])return;if(me.pp<a.price)return toast('Not enough PP');me.pp-=a.price;me.auras[k]=true;
  try{await savePlayer(me);toast(`${a.l} crystal unlocked — equip it in the Profile tab`);}catch(_){toast('Could not buy (do you have edit access?)');}});

/* ---------- profile stage ---------- */
const AU={W:112,H:96,cx:56,fy:80,k:4,actor:null,actorKey:null,aura:null,skin:null,parts:[],arcs:[],drops:[],running:false,last:0,spawnAcc:{}};
const PFc={canvas:$('profCanvas'),lo:document.createElement('canvas')};PFc.ctx=PFc.canvas.getContext('2d');PFc.lo.width=AU.W;PFc.lo.height=AU.H;PFc.lctx=PFc.lo.getContext('2d');
function profSize(){const w=$('profWrap').clientWidth;if(!w)return;const dpr=Math.min(2,devicePixelRatio||1);const k=Math.max(1,Math.round(w*dpr/AU.W));
  if(PFc.canvas.width!==AU.W*k){PFc.canvas.width=AU.W*k;PFc.canvas.height=AU.H*k;}AU.k=k;}
new ResizeObserver(profSize).observe($('profWrap'));
// background: night gradient, a few stars, a stone pedestal
let PROF_BG=null;
function profBg(){if(PROF_BG)return PROF_BG;const c=document.createElement('canvas');c.width=AU.W;c.height=AU.H;const g=c.getContext('2d'),rnd=seeded(5);
  const bands=['#141022','#18132a','#1c1631','#211a38','#261e3f','#2b2246'];for(let y=0;y<AU.H;y++){g.fillStyle=bands[Math.min(5,Math.floor(y/AU.H*6))];g.fillRect(0,y,AU.W,1);}
  for(let k=0;k<40;k++){g.fillStyle=rnd()<.3?'#8a80b0':'#4a4270';g.fillRect(Math.floor(rnd()*AU.W),Math.floor(rnd()*70),1,1);}
  for(let y=-6;y<=6;y++){const w=Math.round(30*Math.sqrt(1-(y/6.5)**2));g.fillStyle=y<-3?'#5a5270':y<0?'#4a4262':'#3a3452';g.fillRect(AU.cx-w,AU.fy+1+y,w*2,1);}
  g.fillStyle='#2a2442';g.fillRect(AU.cx-28,AU.fy+7,56,4);g.fillStyle='#6a6290';g.fillRect(AU.cx-18,AU.fy-4,36,1);
  return PROF_BG=c;}
async function profLoad(){
  const id=AU.skin;const r=id&&regDocs.get(id);if(!r){AU.actor=null;return;}
  const key=id+'|'+JSON.stringify(r.changes||{});if(AU.actor&&AU.actorKey===key)return;
  const f=await getForm(r.baseFormId);if(!f||!f.firstState())return;
  AU.actorKey=key;AU.actor=new Racer({id,name:r.name,form:f,map:mapFromChanges(f,r.changes),guest:false});AU.actor.setState('idle');
  // centre on the visible art of the idle pose (the crop box also covers the other animations)
  const A=AU.actor.anim('idle'),R=rings(A.frames[0],f.crop);let lo=1e9,hi=-1e9;for(const [x] of R.r1){lo=Math.min(lo,x);hi=Math.max(hi,x);}
  AU.actor.centerOff=hi>lo?Math.round(f.crop.w/2-(lo+hi)/2):0;
}
// outline rings around the current frame (cached per frame)
const ringCache=new WeakMap();
function rings(frame,cr){let R=ringCache.get(frame);if(R)return R;
  const d=frame.getContext('2d').getImageData(cr.x,cr.y,cr.w,cr.h).data,W=cr.w,H=cr.h,on=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&d[(y*W+x)*4+3]>40;
  const r1=[],r2=[];
  for(let y=-2;y<H+2;y++)for(let x=-2;x<W+2;x++){if(on(x,y))continue;let n1=false,n2=false;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(!on(x+dx,y+dy))continue;const m=Math.max(Math.abs(dx),Math.abs(dy));if(m===1)n1=true;else if(Math.abs(dx)+Math.abs(dy)<=3)n2=true;}
    if(n1)r1.push([x,y]);else if(n2)r2.push([x,y]);}
  R={r1,r2};ringCache.set(frame,R);return R;}
const hexA=(h,a)=>{const [r,g,b]=hexRGB(h);return `rgba(${r},${g},${b},${a})`;};
function auraSpawn(S,kind,ctx,dt,now){
  const P=S.parts,{bx,by,w,h,R}=ctx,rnd=Math.random,acc=(k,rate)=>{S.spawnAcc[k]=(S.spawnAcc[k]||0)+dt*rate/1000;const n=Math.floor(S.spawnAcc[k]);S.spawnAcc[k]-=n;return n;};
  const edge=()=>{const p=R.r1[Math.floor(rnd()*R.r1.length)];return p?[bx+p[0],by+p[1]]:[S.cx,S.fy-10];};
  if(kind==='ember'){
    for(let i=acc('e',28);i--;){const [x,y]=edge();P.push({x,y,vx:(rnd()-.5)*.006,vy:-(.012+rnd()*.022),t:now,life:600+rnd()*600,cols:['#fff2a0','#ffd04a','#ff8a2a','#d8441a','#6a1a10'],s:rnd()<.25?2:1,front:rnd()<.5,wob:rnd()*6});}
    for(let i=acc('ef',8.8);i--;)P.push({x:S.cx+(rnd()-.5)*w*.9,y:S.fy-1,vx:0,vy:-(.02+rnd()*.02),t:now,life:350+rnd()*300,cols:['#ffe08a','#ff9a3a','#e0501a'],s:2,front:rnd()<.6,wob:rnd()*6});}
  if(kind==='frost'){
    for(let i=acc('f',5);i--;)P.push({x:S.cx+(rnd()-.5)*84,y:by-14-rnd()*8,vx:0,vy:.008+rnd()*.006,t:now,life:2600+rnd()*1200,cols:['#f2fcff','#cfeeff','#9ad8ff'],shape:'flake',front:rnd()<.5,wob:rnd()*6});
    for(let i=acc('fs',14);i--;){const [x,y]=edge();P.push({x,y,vx:0,vy:0,t:now,life:350+rnd()*250,cols:['#ffffff','#bfeaff'],shape:'twinkle',front:true});}}
  if(kind==='verdant'){
    for(let i=acc('v',3);i--;)P.push({x:S.cx+(rnd()-.5)*80,y:by-12,vx:(rnd()-.5)*.004,vy:.01+rnd()*.006,t:now,life:2600,cols:['#ffb3cf','#ff8fb1','#f06a96'],shape:'petal',front:rnd()<.5,wob:rnd()*6});}
  if(kind==='void'){
    for(let i=acc('vd',30);i--;){const [x,y]=rnd()<.6?edge():[S.cx+(rnd()-.5)*w,S.fy-1];P.push({x,y,vx:(rnd()-.5)*.006,vy:-(.006+rnd()*.012),t:now,life:900+rnd()*800,cols:['#c08aff','#8a4ae0','#5a1a9a','#2a0c4a'],grow:true,front:rnd()<.3,wob:rnd()*6});}}
  if(kind==='storm'){
    if(acc('sa',9)){const [x,y]=edge();const pts=[[x,y]];let ax=x,ay=y;const dir=Math.atan2(y-(by+h/2),x-S.cx)+(rnd()-.5);
      for(let s=0;s<4+Math.floor(rnd()*4);s++){ax+=Math.cos(dir)*3+(rnd()-.5)*4;ay+=Math.sin(dir)*3+(rnd()-.5)*4;pts.push([ax,ay]);}
      S.arcs.push({pts,t:now,life:110+rnd()*90,front:rnd()<.6});}
    for(let i=acc('ss',10);i--;){const [x,y]=edge();const a=rnd()*6.28;P.push({x,y,vx:Math.cos(a)*.03,vy:Math.sin(a)*.03,t:now,life:180+rnd()*150,cols:['#ffffff','#bfe6ff','#4a8ad8'],front:true});}}
  if(kind==='rain'){
    const cl=rainCloud(S,ctx,now),top=ctx.top;
    for(let i=acc('r',42);i--;){const x=Math.round(cl.x0+2+rnd()*(cl.x1-cl.x0-4)),front=rnd()<.7;
      const stop=front&&top[x]!==undefined?top[x]:front?S.fy:S.fy-3;S.drops.push({x,y:cl.y1,vy:.085+rnd()*.03,stop,front});}}
  if(kind==='sakura'){const sw=S.swirl||(S.swirl=[]),gu=S.gusts||(S.gusts=[]),gr=S.ground||(S.ground=[]);
    for(let i=acc('sk',3.8);i--;)sw.push({a:rnd()*6.28,r0:w*.42+rnd()*w*.3,va:(.0015+rnd()*.001),up:.0035+rnd()*.003,t:now,life:6800+rnd()*4400,bloom:rnd()<.14,col:['#ffd6e7','#ffb3cf','#ff8fb8','#f06a9a'][Math.floor(rnd()*4)],ph:rnd()*9});
    for(let i=acc('sg',1);i--;)gu.push({a:rnd()*6.28,r:w*.55+rnd()*w*.3,y:S.fy-4-rnd()*h*.9,t:now,life:1040+rnd()*560});
    for(let i=acc('sf',1.6);i--;)gr.push({x:S.cx+(rnd()-.5)*w*1.3,y:S.fy-1+Math.floor(rnd()*4),t:now,life:2600+rnd()*1400,col:rnd()<.5?'#ffb3cf':'#ff8fb8'});}
  if(kind==='celestial'){
    for(let i=acc('c',6);i--;)P.push({x:S.cx+(rnd()-.5)*70,y:by+rnd()*h,vx:0,vy:-.004,t:now,life:900+rnd()*600,cols:['#ffffff','#fff1b0','#ffd86b'],shape:'twinkle',front:rnd()<.5});}
}
function drawParts(S,g,now,front){
  for(const p of S.parts){if(!!p.front!==front)continue;const t=now-p.t,u=t/p.life;if(u>=1)continue;
    const x=Math.round(p.x+p.vx*t+(p.wob!==undefined?Math.sin(t/220+p.wob)*1.2:0)),y=Math.round(p.y+p.vy*t);const col=p.cols[Math.min(p.cols.length-1,Math.floor(u*p.cols.length))];
    if(p.shape==='flake'){g.fillStyle=col;g.fillRect(x,y-1,1,3);g.fillRect(x-1,y,3,1);continue;}
    if(p.shape==='twinkle'){if(Math.floor(t/80)%2)continue;g.fillStyle=col;g.fillRect(x,y,1,1);if(u<.5){g.fillStyle=hexA('#ffffff',.5);g.fillRect(x-1,y,1,1);g.fillRect(x+1,y,1,1);g.fillRect(x,y-1,1,1);g.fillRect(x,y+1,1,1);}continue;}
    if(p.shape==='petal'){g.fillStyle=col;g.fillRect(x,y,2,1);g.fillRect(x+(Math.floor(t/300)%2),y+1,1,1);continue;}
    if(p.grow){const s=1+Math.floor(u*3);g.globalAlpha=1-u*.7;g.fillStyle=col;g.fillRect(x-(s>>1),y-(s>>1),s,s);g.globalAlpha=1;continue;}
    g.fillStyle=col;g.fillRect(x,y,p.s||1,p.s||1);}
}
function orbit(S,g,now,n,period,rx,ry,cy,front,drawOne){for(let i=0;i<n;i++){const a=now/period+i*Math.PI*2/n,dz=Math.sin(a);if((dz>=0)!==front)continue;drawOne(Math.round(S.cx+Math.cos(a)*rx),Math.round(cy+dz*ry),i,a);}}
// rain cloud: floats over the head, bobbing a little
function rainCloud(S,ctx,now){const cy=Math.round(ctx.by-10+Math.sin(now/900)),cx=(ctx.headX??S.cx)+Math.round(Math.sin(now/2300)*2);return {cx,cy,x0:cx-12,x1:cx+12,y1:cy+4};}
function drawRainCloud(g,c){const blobs=[[-7,0,5],[0,-2,6.5],[7,0,5],[-3,1,5],[4,1,5]];
  for(let y=-10;y<=5;y++)for(let x=-14;x<=14;x++){let inside=false,edge=true;for(const [bx2,by2,r] of blobs){const d=Math.hypot(x-bx2,y-by2);if(d<=r){inside=true;if(d<=r-1)edge=false;}}
    if(y>4)inside=false;if(!inside)continue;const col=y>=4?'#5a6280':edge?'#4a5068':y>=2?'#7a84a0':y>=-2?'#9aa2b8':y>=-5?'#b8c0d4':'#d6dcea';g.fillStyle=col;g.fillRect(c.cx+x,c.cy+y,1,1);}
  g.fillStyle='#eef2fa';g.fillRect(c.cx-3,c.cy-6,3,1);g.fillRect(c.cx+5,c.cy-3,2,1);}
function rainStep(S,g,now,dt,front){for(const d of S.drops){if(d.front!==front||d.hit)continue;d.y+=d.vy*dt;
    if(d.y>=d.stop){d.hit=true;for(let i=0;i<2;i++)S.parts.push({x:d.x,y:d.stop-1,vx:(i?1:-1)*(.012+Math.random()*.012),vy:-.02,t:now,life:160,cols:['#d8ecff','#9ad0ff'],front:d.front});continue;}
    const y=Math.round(d.y);g.fillStyle='rgba(154,208,255,.55)';g.fillRect(d.x,y-3,1,2);g.fillStyle='#cfe8ff';g.fillRect(d.x,y-1,1,2);}}
function auraExtras(S,kind,g,now,ctx,front){
  const {by,w,h}=ctx;
  if(kind==='sakura'){S.swirl=(S.swirl||[]).filter(p=>now-p.t<p.life);S.gusts=(S.gusts||[]).filter(q=>now-q.t<q.life);S.ground=(S.ground||[]).filter(q=>now-q.t<q.life);
    if(!front)for(const q of S.ground){const u=(now-q.t)/q.life;if(u>.8&&Math.floor(now/90)%2)continue;g.fillStyle=q.col;g.fillRect(Math.round(q.x),q.y,2,1);}   // petals settling on the floor
    for(const q of S.gusts){const u=(now-q.t)/q.life;for(let k=0;k<14;k++){const a=q.a+u*2.2-k*.07,dz=Math.sin(a);if((dz>=0)!==front)continue;   // a wind streak sweeping round
      g.fillStyle=`rgba(255,${225+k},${238},${(.85*(1-k/14)*(1-u)).toFixed(3)})`;g.fillRect(Math.round(S.cx+Math.cos(a)*q.r),Math.round(q.y+dz*q.r*.25),1,1);}}
    for(const p of S.swirl){const t=now-p.t,u=t/p.life,ang=p.a+p.va*t,dz=Math.sin(ang);if((dz>=0)!==front)continue;if(u>.85&&Math.floor(t/70)%2)continue;
      const r=p.r0*(.65+.6*u),x=Math.round(S.cx+Math.cos(ang)*r),y=Math.round(S.fy-2-p.up*t+dz*r*.28);   // rising, widening spiral
      if(p.bloom){g.fillStyle=p.col;g.fillRect(x-1,y,3,1);g.fillRect(x,y-1,1,3);g.fillStyle='#ffe08a';g.fillRect(x,y,1,1);continue;}
      const f=Math.floor(t/440+p.ph)%3;g.fillStyle=p.col;if(f===0)g.fillRect(x,y,2,1);else if(f===1)g.fillRect(x,y,1,2);else{g.fillRect(x,y,1,1);g.fillRect(x+1,y+1,1,1);}}}
  if(kind==='rain'){rainStep(S,g,now,ctx.dt,front);if(front)drawRainCloud(g,rainCloud(S,ctx,now));}
  if(kind==='verdant'){
    if(!front){for(let k=0;k<14;k++){const x=S.cx-26+k*4,sw=Math.round(Math.sin(now/500+k)*1);g.fillStyle=k%2?'#3a9a3a':'#5fc85a';g.fillRect(x+sw,S.fy-1,1,2);g.fillRect(x+sw+(k%3===0?1:-1),S.fy-2,1,1);}}
    orbit(S,g,now,5,1100,w*.62,6,by+h*.55,front,(x,y,i,a)=>{const flip=Math.floor(a*2)%2;g.fillStyle='#3a9a3a';g.fillRect(x,y,3,1);g.fillStyle='#7ee07a';g.fillRect(x+(flip?0:1),y-1,2,1);g.fillStyle='#2a6a2a';g.fillRect(x+(flip?2:0),y+1,1,1);});}
  if(kind==='void')orbit(S,g,now,3,520,w*.7,9,by+h*.5,front,(x,y,i,a)=>{for(let k=3;k>0;k--){const b=a-k*.12;g.fillStyle=hexA('#a35cff',.25*(4-k)/3);g.fillRect(Math.round(S.cx+Math.cos(b)*w*.7),Math.round(by+h*.5+Math.sin(b)*9),2,2);}g.fillStyle='#e8d0ff';g.fillRect(x,y,2,2);g.fillStyle='#ffffff';g.fillRect(x,y,1,1);});
  if(kind==='frost'&&!front){for(let a=0;a<Math.PI*2;a+=.045){const x=Math.round(S.cx+Math.cos(a)*30),y=Math.round(S.fy+1+Math.sin(a)*5);const sh=(Math.sin(a*5+now/400)+1)/2;g.fillStyle=sh>.7?'#ffffff':sh>.35?'#bfeaff':'#7ac8f0';g.fillRect(x,y,1,1);}
    g.fillStyle=hexA('#bfeaff',.25);g.fillRect(S.cx-26,S.fy-1,52,3);}
  if(kind==='celestial'){
    if(!front){for(const [x0,wd] of [[S.cx-22,5],[S.cx-3,6],[S.cx+17,4]]){const a=.06+.04*Math.sin(now/700+x0);g.fillStyle=`rgba(255,230,150,${a})`;g.fillRect(x0,0,wd,S.fy);}}
    const hy=by-5;for(let a=0;a<Math.PI*2;a+=.06){const dz=Math.sin(a);if((dz>=0)!==front)continue;const x=Math.round(S.cx+Math.cos(a)*9),y=Math.round(hy+dz*2.5);
      const hi=Math.abs(((a-now/600)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI)<.5;g.fillStyle=hi?'#ffffff':'#ffd86b';g.fillRect(x,y,1,1);}
    orbit(S,g,now,4,1600,w*.66,9,by+h*.55,front,(x,y,i)=>{const big=Math.floor(now/200+i)%3!==0;g.fillStyle='#fff1b0';g.fillRect(x,y-(big?2:1),1,big?5:3);g.fillRect(x-(big?2:1),y,big?5:3,1);g.fillStyle='#ffffff';g.fillRect(x,y,1,1);});}
  if(kind==='storm'){for(const A of S.arcs){if(!!A.front!==front||now-A.t>A.life)continue;
    for(let pass=0;pass<2;pass++){g.fillStyle=pass?'#ffffff':hexA('#7fc8ff',.7);for(let i=1;i<A.pts.length;i++){const [x0,y0]=A.pts[i-1],[x1,y1]=A.pts[i],n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));
      for(let s=0;s<=n;s++){const x=Math.round(x0+(x1-x0)*s/n),y=Math.round(y0+(y1-y0)*s/n);if(pass)g.fillRect(x,y,1,1);else g.fillRect(x-1,y-1,3,3);}}}}}
}
// the cloud's shadow: darkest at the top of the pet, fading out in 2-pixel bands (only on the pet's own pixels)
const SH=document.createElement('canvas'),SHg=SH.getContext('2d');
function cloudShade(g,f,cr,bx,pad,by,h,flip){SH.width=cr.w;SH.height=cr.h;SHg.clearRect(0,0,cr.w,cr.h);SHg.save();if(flip){SHg.translate(cr.w,0);SHg.scale(-1,1);}
  SHg.drawImage(f,cr.x,cr.y,cr.w,cr.h,0,0,cr.w,cr.h);SHg.restore();SHg.globalCompositeOperation='source-atop';
  const span=Math.max(6,Math.round(h*.65));for(let y=0;y<span;y+=2){SHg.fillStyle=`rgba(18,20,48,${(.62*(1-y/span)).toFixed(3)})`;SHg.fillRect(0,pad+y,cr.w,2);}
  SHg.globalCompositeOperation='source-over';g.drawImage(SH,bx,by);}
// one aura instance per pet: renders the pet plus its aura into a small canvas (art pixels, sprite at M,M)
function newAuraFx(kind){const c=document.createElement('canvas');return {kind,parts:[],arcs:[],drops:[],spawnAcc:{},cx:null,fy:0,M:26,c,g:c.getContext('2d')};}
const mirCache=new WeakMap();
function mirrored(R0,w){let m=mirCache.get(R0);if(!m){m={r1:R0.r1.map(([x,y])=>[w-1-x,y]),r2:R0.r2.map(([x,y])=>[w-1-x,y])};mirCache.set(R0,m);}return m;}
function auraRender(S,f,cr,flip,now,dt,pad){
  const M=S.M,W=cr.w+2*M,H=cr.h+2*M;if(S.c.width!==W||S.c.height!==H){S.c.width=W;S.c.height=H;}
  const g=S.g,kind=S.kind;g.clearRect(0,0,W,H);g.imageSmoothingEnabled=false;
  const bx=M,by=M,R0=rings(f,cr),R=flip?mirrored(R0,cr.w):R0;
  let lo=1e9,hi=-1e9;for(const [x] of R.r1){if(x<lo)lo=x;if(x>hi)hi=x;}const vc=hi>lo?M+(lo+hi)/2:M+cr.w/2;S.cx=S.cx===null?vc:S.cx+(vc-S.cx)*.15;S.fy=M+cr.h-1;
  const ctx={bx,by:by+pad,w:cr.w,h:cr.h-pad,R,dt};
  if(kind==='rain'){const top={};for(const [x,y] of R.r1){const X=bx+x;if(top[X]===undefined||by+y+1<top[X])top[X]=by+y+1;}ctx.top=top;   // where rain lands on the pet
    const mt=Math.min(...Object.values(top)),hx=Object.keys(top).filter(X=>top[X]<=mt+5).map(Number);ctx.headX=Math.round(hx.reduce((a,b)=>a+b,0)/hx.length);}   // cloud sits over the head
  if(kind){S.parts=S.parts.filter(p=>now-p.t<p.life);S.arcs=S.arcs.filter(x=>now-x.t<x.life);S.drops=S.drops.filter(d=>!d.hit);auraSpawn(S,kind,{...ctx,by},dt,now);
    auraExtras(S,kind,g,now,ctx,false);drawParts(S,g,now,false);}
  if(kind&&!AURAS[kind].noGlow){   // glow hugging the silhouette
    const col=AURAS[kind].c,pulse=.5+.5*Math.sin(now/420);
    const a2=kind==='storm'?(Math.random()<.3?.6:.15):.18+.17*pulse,a1=kind==='storm'?(Math.random()<.5?.95:.4):.55+.35*pulse;
    g.fillStyle=hexA(kind==='void'?'#3a0a6a':col,a2);for(const [x,y] of R.r2)g.fillRect(bx+x,by+y,1,1);
    g.fillStyle=hexA(col,a1);for(const [x,y] of R.r1)g.fillRect(bx+x,by+y,1,1);}
  g.save();if(flip){g.translate(W,0);g.scale(-1,1);}g.drawImage(f,cr.x,cr.y,cr.w,cr.h,bx,by,cr.w,cr.h);g.restore();
  if(kind==='rain')cloudShade(g,f,cr,bx,pad,by,ctx.h,flip);
  if(kind){drawParts(S,g,now,true);auraExtras(S,kind,g,now,ctx,true);}
  return S.c;
}
function profDraw(now,dt){
  const g=PFc.lctx;g.imageSmoothingEnabled=false;g.drawImage(profBg(),0,0);const a=AU.actor;
  if(a){a.step(dt);const A=a.anim(a.state),f=A.frames[a.cur]||A.frames[0],cr=a.form.crop;
    const flip=a.artFaces()!==-1;   // face left, toward the name plate
    const bx=AU.cx-Math.round(cr.w/2)+(flip?-1:1)*((a.centerOff||0)+nudgeOf(a.form)),by=AU.fy-(cr.h-1)+sinkOf(a.form)-(A.hover?Math.round(HOVER_AMP*(.6+(Math.sin(a.clock/HOVER_MS*Math.PI*2)+1)/2)):0);
    if(!AU.fx||AU.fx.kind!==(AU.aura||''))AU.fx=newAuraFx(AU.aura||'');
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(AU.cx-Math.round(cr.w*.3),AU.fy,Math.round(cr.w*.6),2);
    g.drawImage(auraRender(AU.fx,f,cr,flip,now,dt,topPad(a)),bx-AU.fx.M,by-AU.fx.M);}
  const G=PFc.ctx,k=AU.k;G.imageSmoothingEnabled=false;G.drawImage(PFc.lo,0,0,AU.W*k,AU.H*k);
}
/* ---------- auras on pets: equip in the Pet room, shown in the Pet room and the Room ---------- */
let AURA_ON=true;try{AURA_ON=localStorage.getItem('forge.auraOn')!=='0';}catch(_){}
function renderAuraToggles(){for(const id of ['roomAuraTog','petAuraTog']){const b=$(id);if(!b)continue;b.setAttribute('aria-pressed',AURA_ON);b.textContent=AURA_ON?'✨ Auras on':'✨ Auras off';}}
for(const id of ['roomAuraTog','petAuraTog'])$(id).onclick=()=>{AURA_ON=!AURA_ON;try{localStorage.setItem('forge.auraOn',AURA_ON?'1':'0');}catch(_){}renderAuraToggles();};
renderAuraToggles();
const petAura=p=>{const k=p&&p.aura;return k&&AURAS[k]&&(LIVE||ME().auras[k])?k:'';};   // in the game the server only lets owners wear their own   // only crystals you still own
function auraForSkin(regId){if(!AURA_ON)return '';
  if(LIVE){const c=R.cats.find(k=>k.id===regId);return c&&c.liveAura&&AURAS[c.liveAura]?c.liveAura:'';}   // the game's Room pets carry their own
  for(const p of petDocs.values())if(p.skinId===regId&&petAura(p))return petAura(p);return '';}
function renderPetAura(){
  const el=$('petAuraList');if(!el)return;const p=PR.id&&petDocs.get(PR.id),me=ME(),cur=petAura(p);
  const owned=Object.entries(AURAS).filter(([k])=>me.auras[k]);
  el.innerHTML=!p?'<p class="note" style="margin:0">Create a pet first.</p>':[['',{l:'No aura',c:'#9a93b3'}],...owned].map(([k,a])=>`<button class="aurachip" style="--ac:${a.c}" data-paura="${k}" aria-pressed="${cur===k}">${k?`<canvas data-crys="${k}"></canvas>`:'<i class="noaura"></i>'}<span><b>${a.l}</b><small>${cur===k?'Equipped':''}</small></span></button>`).join('')+(owned.length?'':'<p class="note" style="margin:0;grid-column:1/-1">No crystals yet — buy one in the Shop.</p>');
  el.querySelectorAll('canvas[data-crys]').forEach(cv=>paintCrystal(cv,cv.dataset.crys,2));}
$('petAuraList').addEventListener('click',async e=>{const b=e.target.closest('[data-paura]');if(!b)return;const p=petDocs.get(PR.id);if(!p)return;
  if(LIVE){const d=await liveCall('/pet/aura',{aura:b.dataset.paura||null});if(d)liveApply(d);return;}
  try{await writeDoc('pets',PR.id,{...p,aura:b.dataset.paura});}catch(_){toast('Could not save (do you have edit access?)');}});
function profLoop(t){if(!AU.running)return;const dt=Math.min(50,t-(AU.last||t));AU.last=t;profDraw(t,dt);requestAnimationFrame(profLoop);}
function profStart(){if(AU.running)return;AU.running=true;AU.last=0;profSize();requestAnimationFrame(profLoop);}
function profStop(){AU.running=false;}

/* ---------- profile page controls ---------- */
function renderProfile(){
  if(!$('profile'))return;const me=ME(),skins=petSkins();
  if(!AU.skin||!regDocs.has(AU.skin))AU.skin=(me.profile.skinId&&regDocs.has(me.profile.skinId))?me.profile.skinId:(skins[0]||[])[0]||null;
  if(AU.aura===null&&me.profile.aura)AU.aura=me.profile.aura;
  $('profSkinSel').innerHTML=skins.length?skins.map(([id,r])=>`<option value="${esc(id)}">${esc(r.name)} · ${rarityOf(r.rarity).l}</option>`).join(''):'<option value="">Register a form first</option>';
  if(AU.skin)$('profSkinSel').value=AU.skin;
  $('profNameIn').value=$('profNameIn').value||me.profile.name||'';
  const r=AU.skin&&regDocs.get(AU.skin);$('profName').textContent=($('profNameIn').value.trim()||'Player');
  $('profSub').innerHTML=r?`<span class="rlabel" style="--rc:${rarityOf(r.rarity).c}">${rarityDot(r.rarity,10)}${esc(r.name)}</span>${AU.aura?` · <span style="color:${AURAS[AU.aura].c}">${AURAS[AU.aura].l} aura</span>`:''}`:'';
  $('auraList').innerHTML=[['',{l:'No aura',c:'#9a93b3',tip:'Just your pet'}],...Object.entries(AURAS)].map(([k,a])=>{const own=!k||!!me.auras[k];
    return `<button class="aurachip" style="--ac:${a.c}" data-aura="${k}" aria-pressed="${(AU.aura||'')===k}">${k?`<canvas data-crys="${k}"></canvas>`:'<i class="noaura"></i>'}<span><b>${a.l}</b><small>${own?(k?'Owned':''):'Preview · buy in Shop'}</small></span></button>`;}).join('');
  $('auraList').querySelectorAll('canvas[data-crys]').forEach(cv=>paintCrystal(cv,cv.dataset.crys,2));
  const own=!AU.aura||!!me.auras[AU.aura],same=(me.profile.skinId===AU.skin)&&((me.profile.aura||'')===(AU.aura||''))&&((me.profile.name||'')===$('profNameIn').value.trim());
  $('profSave').disabled=!own||!AU.skin||same;$('profSave').textContent=same?'✓ This is your profile':'Set as my profile';
  $('profNote').textContent=own?'':`You’re previewing ${AURAS[AU.aura].l}. Buy its crystal in the Shop to use it on your profile.`;
  profLoad();
}
$('profSkinSel').onchange=e=>{AU.skin=e.target.value;AU.fx=null;renderProfile();};
$('auraList').addEventListener('click',e=>{const b=e.target.closest('[data-aura]');if(!b)return;AU.aura=b.dataset.aura||'';AU.fx=null;renderProfile();});
$('profNameIn').oninput=()=>renderProfile();
$('profSave').onclick=async()=>{const me=ME();if(AU.aura&&!me.auras[AU.aura])return;me.profile={name:$('profNameIn').value.trim().slice(0,24),skinId:AU.skin,aura:AU.aura||''};
  try{await savePlayer(me);toast('Profile saved');}catch(_){toast('Could not save (do you have edit access?)');}};

/* ---------- eggs: tap 100 times to hatch a random Common cat, then name it ---------- */
const EGG={taps:100,x:80,y:104};   // where the egg sits (bottom centre, map pixels)
const eggActive=()=>!!PR.egg&&!PR.visit;
function eggSync(auto=false){ // pick up the saved egg (progress survives reloads); auto: hand out a first egg
  const e=ME().egg;
  if(e&&!PR.egg)PR.egg={taps:e.taps||0,regId:e.regId||null,phase:e.regId?'named':'egg',wob:0,t0:0};
  else if(!e&&PR.egg&&!PR.egg.dirty&&PR.egg.phase!=='hatch')PR.egg=null;
  if(auto&&!PR.egg&&!(LIVE?PR.id:petDocs.size)&&regDocs.size)eggNew(true);         // no pets yet → you get an egg
  eggUi();
}
function eggSave(now=false){const E=PR.egg;clearTimeout(eggSave.t);const go=()=>{const me=ME();me.egg=E?{taps:E.taps,regId:E.regId||null,at:Date.now()}:null;if(E)E.dirty=false;savePlayer(me).catch(()=>{});};
  if(now)go();else{if(E)E.dirty=true;eggSave.t=setTimeout(go,700);}}
function eggNew(quiet){if(PR.egg){toast('Hatch the egg you have first');return;}PR.egg={taps:0,regId:null,phase:'egg',wob:0,t0:0};eggSave(true);if(!quiet)toast('A new egg! Tap it 100 times to hatch it');eggUi();}
function eggPick(){const commons=petSkins().filter(([,r])=>rarityOf(r.rarity).k==='common');const pool=commons.length?commons:petSkins();return pool.length?pick(pool)[0]:null;}
function eggTap(x,y){
  const E=PR.egg;if(!E||E.phase!=='egg')return;
  if(Math.abs(x-EGG.x)>14||y<EGG.y-30||y>EGG.y+4)return;          // has to hit the egg
  E.taps=Math.min(EGG.taps,E.taps+1);E.wob=performance.now();petSparkle(x,y,['#ffffff','#fff1b0','#ffd6e7']);
  if(LIVE&&E.taps>=EGG.taps){   // the server picks the cat it hatches into
    E.taps=EGG.taps-1;if(!E.cracking){E.cracking=true;
      cfx('/egg/crack',{method:'POST'}).then(r=>{E.cracking=false;E.taps=EGG.taps;E.regId=r.skinId;E.phase='hatch';E.t0=performance.now();eggSave(true);eggLoadActor();eggUi();})
        .catch(err=>{E.cracking=false;toast(err.message);});}
    eggUi();return;}
  if(E.taps>=EGG.taps){const id=eggPick();if(!id){E.taps=EGG.taps-1;toast('Register a form in the Studio first — that’s what hatches');return;}
    E.regId=id;E.phase='hatch';E.t0=performance.now();eggSave(true);eggLoadActor();}
  else eggSave();
  eggUi();
}
async function eggLoadActor(){const E=PR.egg,r=E&&E.regId&&regDocs.get(E.regId);if(!r)return;const f=await getForm(r.baseFormId);if(!f)return;
  E.actor=new Racer({id:'egg',name:'',form:f,map:mapFromChanges(f,r.changes),guest:false});E.actor.setState('love');}
function eggStep(dt,now){const E=PR.egg;if(!E)return;if(E.actor)E.actor.step(dt);
  if(E.phase==='hatch'&&now-E.t0>1500){E.phase='named';eggUi();}
  if(E.phase==='named'&&!E.actor&&E.regId)eggLoadActor();}
// pixel egg on a little nest, with cracks that grow as you tap
function drawEgg(g,now){
  const E=PR.egg,t=now-(E.t0||0),shaking=E.phase==='hatch'&&t<900,burst=E.phase!=='egg'&&!(E.phase==='hatch'&&t<900);
  // nest
  for(let y=0;y<5;y++){const w=Math.round(15-Math.abs(y-2)*1.5);for(let x=-w;x<=w;x++){g.fillStyle=(x*3+y*5)%7<3?'#a8803a':(x+y)%3?'#c9a05a':'#dcb874';g.fillRect(EGG.x+x,EGG.y-2+y,1,1);}}
  if(burst){ // the empty half-shells
    for(const [ox,flip] of [[-9,0],[6,1]])for(let y=0;y<5;y++){const w=4-Math.max(0,y-2);for(let x=0;x<w*2;x++){g.fillStyle=y===0&&x%2?'#8a6a4a':'#fff4e0';g.fillRect(EGG.x+ox+x,EGG.y-6+y,1,1);}}
    return;}
  const since=now-(E.wob||0),wob=since<220?(Math.floor(since/55)%2?1:-1):0,shake=shaking?Math.round(Math.sin(t/25)*(1+t/300)):0,ox=EGG.x+wob+shake;
  const top=EGG.y-22;
  for(let y=0;y<20;y++){const yy=y-11,hw=Math.round(8*Math.sqrt(Math.max(0,1-(yy/(yy<0?11.5:9))**2)));
    for(let x=-hw;x<=hw;x++){const edge=x===-hw||x===hw||y===0||y===19;let c=edge?'#8a6a4a':x>hw-3?'#ead6b8':(x<-2&&y<9&&y>3&&x>-hw+1)?'#ffffff':'#fff4e0';
      g.fillStyle=c;g.fillRect(ox+x,top+y,1,1);}}
  for(const [sx,sy,c] of [[-3,6,'#ffb3cf'],[3,10,'#9ad8ff'],[-4,13,'#b8e8b0'],[2,4,'#ffd98a'],[4,15,'#ffb3cf'],[-1,16,'#9ad8ff']]){g.fillStyle=c;g.fillRect(ox+sx,top+sy,2,2);}   // pastel spots
  // cracks appear at 20/40/60/80/95 taps
  const cracks=[[[0,3],[-2,5],[0,7],[-1,9]],[[3,8],[5,10],[4,12],[6,13]],[[-5,10],[-3,12],[-5,14],[-3,16]],[[1,12],[0,14],[2,16],[1,18]],[[-1,9],[2,9],[3,8],[-5,10]]];
  const n=[20,40,60,80,95].filter(v=>E.taps>=v).length+(E.phase==='hatch'?5:0);
  g.fillStyle='#5a3a1a';for(let i=0;i<Math.min(n,cracks.length);i++){const L=cracks[i];for(let j=1;j<L.length;j++){const [x0,y0]=L[j-1],[x1,y1]=L[j],m=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
    for(let s=0;s<=m;s++)g.fillRect(ox+Math.round(x0+(x1-x0)*s/m),top+Math.round(y0+(y1-y0)*s/m),1,1);}}
}
function drawEggHatched(g,now){ // the new cat, standing in the nest
  const E=PR.egg,a=E.actor;if(!a)return;const A=a.anim(a.state),f=A.frames[a.cur]||A.frames[0],cr=a.form.crop;
  const dx=EGG.x-Math.round(cr.w/2)+nudgeOf(a.form),dy=EGG.y-2-(cr.h-1)+sinkOf(a.form);
  g.fillStyle='rgba(60,30,20,.3)';g.fillRect(EGG.x-Math.round(cr.w*.3),EGG.y-2,Math.round(cr.w*.6),2);
  g.drawImage(f,cr.x,cr.y,cr.w,cr.h,dx,dy,cr.w,cr.h);E.box={cx:EGG.x,top:dy+topPad(a)};
}
function eggLow(g,now){const E=PR.egg;if(!E)return;
  const t=now-(E.t0||0);if(E.phase!=='egg'&&!(E.phase==='hatch'&&t<900))drawEggHatched(g,now);
  drawEgg(g,now);
  if(E.phase==='hatch'&&t>=900&&!E.burstDone){E.burstDone=true;   // shell pieces + sparkles
    for(let i=0;i<3;i++)petSparkle(EGG.x+rnd(-6,6),EGG.y-14+rnd(-6,6),['#fff4e0','#ead6b8','#ffb3cf','#9ad8ff']);
    for(let i=0;i<6;i++)petPix(i%2?'sparkle':'heart',EGG.x+rnd(-16,16),EGG.y-24+rnd(-6,10),1100+rnd(0,400),i*80);}}
function eggHud(G,k,now){const E=PR.egg;if(!E)return;const t=now-(E.t0||0);
  G.textAlign='center';G.textBaseline='middle';
  if(E.phase==='egg'){const u=E.taps/EGG.taps,bw=40,by=EGG.y-34;
    G.fillStyle='rgba(40,20,15,.7)';G.fillRect((EGG.x-bw/2-1)*k,(by-1)*k,(bw+2)*k,4*k);G.fillStyle='#ffd86b';G.fillRect((EGG.x-bw/2)*k,by*k,bw*u*k,2*k);
    G.font=`700 ${6*k}px 'Pixelify Sans', monospace`;G.fillStyle='#fff3e0';G.strokeStyle='rgba(40,20,15,.8)';G.lineWidth=k;
    const s=`${E.taps} / ${EGG.taps}`;G.strokeText(s,EGG.x*k,(by-6)*k);G.fillText(s,EGG.x*k,(by-6)*k);
    if(E.taps<3){G.font=`700 ${5*k}px 'Pixelify Sans', monospace`;const h='Tap the egg to hatch it!';G.strokeText(h,EGG.x*k,(EGG.y+10)*k);G.fillText(h,EGG.x*k,(EGG.y+10)*k);}}
  if(E.phase==='hatch'&&t>=900&&t<1250){G.fillStyle=`rgba(255,255,255,${.85*(1-(t-900)/350)})`;G.fillRect(0,0,PET.W*k,PET.H*k);}   // the pop
}
function eggUi(){
  const E=PR.egg,show=!!(E&&E.phase==='named');$('eggName').hidden=!show;
  $('petNew').textContent=E?'🥚 Egg in progress':'🥚 New egg';
  if(E)$('petEmpty').hidden=true;
  if(show){const r=regDocs.get(E.regId);if(r){const rr=rarityOf(r.rarity);$('eggWhat').innerHTML=`A <span class="rlabel" style="--rc:${rr.c}">${rarityDot(rr.k,10)}${rr.l}</span> <b>${esc(r.name)}</b> hatched!`;}
    if(document.activeElement!==$('eggNameIn'))setTimeout(()=>$('eggNameIn').focus(),50);}
}
async function eggFinish(){
  const E=PR.egg,name=$('eggNameIn').value.trim();if(!E||!E.regId)return;if(!name){$('eggNameIn').focus();return;}
  if(LIVE){const d=await liveCall('/egg/hatch',{name});if(!d)return;
    PR.egg=null;eggSave(true);$('eggNameIn').value='';PR.actor=null;PR.items=[];PR.pos={x:80,y:PET.floorY};liveApply(d);eggUi();toast(`Welcome home, ${name}!`);return;}
  const id=newId(),r=()=>Math.round(rnd(35,75));
  try{await writeDoc('pets',id,{name:name.slice(0,30),skinId:E.regId,stats:{happiness:r(),love:r(),hunger:r(),confidence:r()},roomStyle:'cozy',createdAt:Date.now()});}
  catch(_){return toast('Could not save (do you have edit access?)');}
  PR.egg=null;eggSave(true);$('eggNameIn').value='';
  PR.id=id;try{localStorage.setItem('forge.pet',id);}catch(_){}PR.actor=null;PR.items=[];PR.pos={x:80,y:PET.floorY};
  renderPetBar();renderDeckPanel();renderPetAura();petLoadActor();eggUi();toast(`Welcome home, ${name}!`);
}
$('eggNameGo').onclick=eggFinish;$('eggNameIn').addEventListener('keydown',e=>{if(e.key==='Enter')eggFinish();});

/* ---------- Play Date: visit another pet's room with your pet. Feeding them makes them love YOU (not their owner) ---------- */
const neighborDocs=new Map();   // stats for Room pets that have no pet record of their own (keyed by Room cat id)
const VISIT={loveFeed:6};
const visitHostDoc=v=>v.hostType==='pet'?petDocs.get(v.hostId):neighborDocs.get(v.hostId);
const loveForMe=v=>{const d=visitHostDoc(v);return Math.round((d&&d.loveBy&&d.loveBy.me)||0);};
async function startPlayDate(c){
  const mine=PR.id&&petDocs.get(PR.id);if(!mine){toast('You need a pet first — hatch an egg in the Pet tab');return;}
  if(LIVE){let v;try{v=await cfx('/visit/'+encodeURIComponent(c.id));}catch(e){toast(e.message);return;}   // their pet, as it is now
    petDocs.set(String(v.pet._id),toPetDoc(v.pet));
    PR.visit={hostType:'pet',hostId:String(v.pet._id),name:v.pet.name,style:v.pet.roomStyle||'cozy',catId:c.id};}
  else{
  const host=[...petDocs.entries()].find(([id,p])=>p.skinId===c.id&&id!==PR.id);       // a real pet wearing this skin?
  const styles=Object.keys(PET_STYLES),hash=[...c.id].reduce((a,ch)=>a+ch.charCodeAt(0),0);
  PR.visit=host?{hostType:'pet',hostId:host[0],name:host[1].name,style:host[1].roomStyle||'cozy',catId:c.id}
               :{hostType:'neighbor',hostId:c.id,name:c.name,style:styles[hash%styles.length],catId:c.id,form:c.form,map:c.map};
  if(!host&&!neighborDocs.has(c.id))await writeDoc('neighbors',c.id,{name:c.name,loveBy:{},createdAt:Date.now()}).catch(()=>{});
  }
  PR.items=[];PR.target=null;PR.eat=null;PR.pending=null;PR.react=null;PR.pos={x:104,y:PET.floorY};PR.face=-1;PR.actor=null;PR.actorKey=null;PR.afx=null;
  PR.buddy={actor:null,key:null,pos:{x:46,y:PET.floorY+4},face:1,target:null,wanderAt:0,fx:null};
  location.hash='pet';await visitLoad();visitUi();liveSyncPoop();toast(`Play date at ${PR.visit.name}’s room!`);
}
async function visitLoad(){ // host = main pet in the room, your pet = buddy
  const v=PR.visit;if(!v)return;
  if(!PR.actor){let f,map;
    if(v.hostType==='pet'){const p=petDocs.get(v.hostId),r=p&&regDocs.get(p.skinId);if(!r)return endPlayDate();f=await getForm(r.baseFormId);map=mapFromChanges(f,r.changes);}
    else{f=v.form;map=v.map;}
    if(!f)return;PR.actor=new Racer({id:v.hostId,name:v.name,form:f,map,guest:true});PR.actor.setState('idle');PR.actorKey='visit';}
  const mine=petDocs.get(PR.id),r=mine&&regDocs.get(mine.skinId),key=mine&&mine.skinId+'|'+JSON.stringify(r&&r.changes||{});
  if(r&&PR.buddy&&PR.buddy.key!==key){const f=await getForm(r.baseFormId);if(f){PR.buddy.actor=new Racer({id:PR.id,name:mine.name,form:f,map:mapFromChanges(f,r.changes),guest:false});PR.buddy.actor.setState('idle');PR.buddy.key=key;}}
}
function endPlayDate(){if(!PR.visit)return;if(LIVE)petDocs.delete(PR.visit.hostId);PR.visit=null;PR.buddy=null;PR.items=[];PR.target=null;PR.eat=null;PR.actor=null;PR.actorKey=null;PR.afx=null;PR.pos={x:80,y:PET.floorY};visitUi();petLoadActor();}
// (The toy picker too: a Play Date starting or ending clears the room's toys.)
function visitUi(){renderToyPicker();renderStats();const v=PR.visit;$('visitBar').hidden=!v;$('petBarMain').classList.toggle('visiting',!!v);if(!v)return;
  const love=loveForMe(v);$('visitWho').textContent=`Play date at ${v.name}’s room`;$('visitLove').style.width=love+'%';$('visitLoveN').textContent=love;
  $('visitLoveLbl').textContent=`${v.name} ♥ you`;}
async function visitFed(now){ // the host just finished food you put down
  const v=PR.visit;if(!v)return;
  if(LIVE){petBubble('love',1400);return;}   // the server counted the feed (and any love) when the food went down
  const col=v.hostType==='pet'?'pets':'neighbors',d=visitHostDoc(v)||{name:v.name};
  const love=Math.min(100,((d.loveBy&&d.loveBy.me)||0)+VISIT.loveFeed);
  try{await writeDoc(col,v.hostId,{...d,loveBy:{...(d.loveBy||{}),me:love}});}catch(_){}
  petBubble('love',1400);visitUi();toast(`${v.name} loves you a little more (♥ ${love})`);
}
function buddyStep(dt,now){const B=PR.buddy;if(!B||!B.actor)return;const a=B.actor;a.step(dt);
  const chasing=ballChase(B,now,a.form.crop.w,'buddy');   // your pet plays with the ball too
  if(B.target){const t=B.target,dx=t.x-B.pos.x,dy=t.y-B.pos.y,d=Math.hypot(dx,dy),step=.02*dt;if(Math.abs(dx)>.5)B.face=dx>0?1:-1;
    if(d<=step){B.pos.x=t.x;B.pos.y=t.y;B.target=null;a.setState('idle');}else{B.pos.x+=dx/d*step;B.pos.y+=dy/d*step;if(a.state!=='walk')a.setState('walk');}}
  else if(!chasing&&now>=B.wanderAt){B.wanderAt=now+rnd(4000,9000);if(Math.random()<.6){   // hang out near the host
    const hx=PR.pos.x+(Math.random()<.5?-1:1)*rnd(22,40);B.target={x:Math.max(FLOOR.x0+6,Math.min(FLOOR.x1-6,hx)),y:Math.max(FLOOR.y0,Math.min(FLOOR.y1,PR.pos.y+rnd(-8,8)))};}
    else{B.face=PR.pos.x>B.pos.x?1:-1;}}}
function buddyDraw(g,now){const B=PR.buddy,a=B&&B.actor;if(!a)return;const A=a.anim(a.state),f=A.frames[a.cur]||A.frames[0],cr=a.form.crop;
  const cx=Math.round(B.pos.x),fy=Math.round(B.pos.y);let dx=cx-Math.round(cr.w/2)+nudgeOf(a.form),dy=fy-(cr.h-1)+sinkOf(a.form);
  if(A.hover)dy-=Math.round(HOVER_AMP*(.6+(Math.sin(a.clock/HOVER_MS*Math.PI*2)+1)/2));
  g.fillStyle='rgba(60,30,20,.3)';g.fillRect(cx-Math.round(cr.w*.3),fy,Math.round(cr.w*.6),2);
  const flip=B.face!==a.artFaces(),ak=AURA_ON?petAura(petDocs.get(PR.id)):'';
  if(ak){if(!B.fx||B.fx.kind!==ak)B.fx=newAuraFx(ak);const dtA=Math.min(50,now-(B.fxT||now));B.fxT=now;g.drawImage(auraRender(B.fx,f,cr,flip,now,dtA,topPad(a)),dx-B.fx.M-(flip?2*nudgeOf(a.form):0),dy-B.fx.M);}
  else{g.save();if(flip){g.translate(cx*2,0);g.scale(-1,1);}g.drawImage(f,cr.x,cr.y,cr.w,cr.h,dx,dy,cr.w,cr.h);g.restore();}
  B.tag={cx,ty:Math.min(PET.H-9,fy+4),name:a.name};}
function buddyTag(G,k){const B=PR.buddy;if(!B||!B.tag)return;const {cx,ty,name}=B.tag;G.font=`700 ${6*k}px 'Pixelify Sans', monospace`;
  const t='★ '+name,w=G.measureText(t).width+6*k;G.fillStyle='rgba(255,179,92,.85)';G.fillRect(cx*k-w/2,ty*k,w,8*k);G.fillStyle='#2a1700';G.fillText(t,cx*k,(ty+4)*k);}
$('visitHome').onclick=endPlayDate;

/* ---------- data ---------- */
const petDocs=new Map();
function onPetsChange(){renderPetBar();renderDeckPanel();renderPetAura();petLoadActor();eggUi();visitUi();if(LIVE){runSync();raceSync();runLiveRender();raceLiveRender();}}   // the menus too: "hatch your egg first" goes
function petSkins(){return [...regDocs.entries()].filter(([,r])=>baseDocs.has(r.baseFormId)).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));}
function renderPetBar(){
  const sel=$('petSel');const ids=[...petDocs.keys()].sort((a,b)=>(petDocs.get(a).createdAt||0)-(petDocs.get(b).createdAt||0));
  if(!LIVE&&(!PR.id||!petDocs.has(PR.id))){let saved=null;try{saved=localStorage.getItem('forge.pet');}catch(e){}PR.id=petDocs.has(saved)?saved:(ids[0]||null);}
  sel.innerHTML=ids.length?ids.map(id=>`<option value="${esc(id)}">${esc(petDocs.get(id).name||'Pet')}</option>`).join(''):'<option value="">No pets yet</option>';
  if(PR.id)sel.value=PR.id;
  const skins=petSkins(),opts=skins.map(([id,r])=>`<option value="${esc(id)}">${esc(r.name)}</option>`).join('')||'<option value="">Register a form first</option>';
  $('petSkin').innerHTML=opts;$('newPetSkin').innerHTML=opts;
  const p=PR.id&&petDocs.get(PR.id);if(p&&p.skinId)$('petSkin').value=p.skinId;
  const ownStyles=LIVE?((LV.player&&LV.player.styles)||['cozy']):null;   // in the game: styles not bought yet show their price
  $('petStyle').innerHTML=Object.entries(PET_STYLES).map(([k,l])=>`<option value="${k}">${l}${ownStyles&&!ownStyles.includes(k)?' · 500 PP':''}</option>`).join('');$('petStyle').value=(p&&PET_STYLES[p.roomStyle])?p.roomStyle:'cozy';$('petStyle').disabled=!p;
  $('petSkin').disabled=!p;$('petDel').disabled=!p;$('petEmpty').hidden=!!p;
  renderStats();
}
async function petLoadActor(){
  if(PR.visit)return visitLoad();
  const p=PR.id&&petDocs.get(PR.id);if(!p){PR.actor=null;return;}
  const r=regDocs.get(p.skinId);if(!r){PR.actor=null;$('petEmpty').hidden=false;$('petEmpty').textContent='This pet’s skin card was deleted — cast another card from your Spell Deck.';return;}
  const key=PR.id+'|'+p.skinId+'|'+JSON.stringify(r.changes||{});if(PR.actor&&PR.actorKey===key)return;
  const f=await getForm(r.baseFormId);if(!f||!f.firstState())return;
  PR.actorKey=key;PR.actor=new Racer({id:PR.id,name:p.name,form:f,map:mapFromChanges(f,r.changes),guest:false});PR.actor.setState('idle');
}
// A stats box's bars. `edit`: with the sliders (your own pet, testing). `known`: only the stats it has (a sandbox
// neighbour cat only has its love), the rest shown as —. `labels`: other names for some (their cat's love is for you).
function statRows(st,{edit=false,known=false,labels={}}={}){
  return STATS.map(s=>{const miss=known&&st[s.k]==null,v=miss?0:Math.round(st[s.k]??50),l=labels[s.k]||s.l;
    return `<div class="stat"><div class="sth"><span>${s.i} ${esc(l)}</span><b>${miss?'—':v}</b></div>
    <div class="bar"><i style="width:${v}%;background:${s.c}"></i></div>
    ${edit!==null?`<input type="range" min="0" max="100" value="${v}" data-k="${s.k}" ${edit?'':'hidden'} aria-label="${esc(l)}">`:''}</div>`;}).join('');}
function renderStats(){
  const p=PR.id&&petDocs.get(PR.id);const st=(p&&p.stats)||{};
  // A Play Date: their cat's stats beside yours, each box headed with the cat's name.
  const v=PR.visit,host=v&&visitHostDoc(v);
  $('statPair').classList.toggle('two',!!v);$('visitStatsPanel').hidden=!v;
  $('petStatsTitle').innerHTML=v?`<span class="statname">${esc((p&&p.name)||'Your cat')}</span><span class="statwho">your cat</span>`:'Stats';
  if(v){$('visitStatsTitle').innerHTML=`<span class="statname">${esc(v.name)}</span><span class="statwho">their cat</span>`;
    const hst=host&&host.stats?host.stats:{love:loveForMe(v)};
    $('visitStats').innerHTML=statRows(hst,{edit:null,known:!(host&&host.stats),labels:{love:'Love for you'}});
    $('visitStatsNote').textContent=`How ${v.name} is doing. Its love here is how much it loves you: feed it, or give it a toy (+1 a knock), to raise it.`;}
  $('petStats').innerHTML=statRows(st,{edit:$('petEdit').checked});
  $('petStats').querySelectorAll('input[type=range]').forEach(inp=>{inp.oninput=()=>{inp.parentElement.querySelector('b').textContent=inp.value;inp.parentElement.querySelector('.bar i').style.width=inp.value+'%';};
    inp.onchange=()=>{const p2=petDocs.get(PR.id);if(!p2)return;const stats={...(p2.stats||{}),[inp.dataset.k]:+inp.value};writeDoc('pets',PR.id,{...p2,stats}).catch(()=>toast('Could not save'));};});
}
$('petEdit').onchange=()=>renderStats();
$('petSel').onchange=e=>{if(PR.visit){PR.visit=null;PR.buddy=null;visitUi();}PR.id=e.target.value||null;try{localStorage.setItem('forge.pet',PR.id);}catch(_){}PR.actor=null;PR.pending=null;PR.react=null;PR.items=[];PR.target=null;PR.eat=null;PR.pos={x:80,y:PET.floorY};renderPetBar();renderDeckPanel();renderPetAura();petLoadActor();};
$('petStyle').onchange=async e=>{const p=petDocs.get(PR.id);if(!p)return;
  if(LIVE){const k=e.target.value,owned=(LV.player&&LV.player.styles)||['cozy'];
    if(!owned.includes(k)){
      const ok=await askConfirm({title:`Buy the ${PET_STYLES[k]} room?`,text:'It costs 500 PP (PP first, then P-PP). Once it’s yours, you can switch to it any time.',yes:'Buy · 500 PP'});
      if(!ok||!(await liveCall('/shop/buy',{item:'style',style:k}))){e.target.value=p.roomStyle||'cozy';return;}}
    const d=await liveCall('/pet/style',{style:k});if(d)liveApply(d);await liveRefresh();return;}
  writeDoc('pets',PR.id,{...p,roomStyle:e.target.value}).catch(()=>toast('Could not save'));};
$('petSkin').onchange=e=>{const p=petDocs.get(PR.id);if(!p)return;writeDoc('pets',PR.id,{...p,skinId:e.target.value}).catch(()=>toast('Could not save'));};
$('petNew').onclick=()=>eggNew();
$('petNewCancel').onclick=()=>$('petNewRow').classList.remove('on');
$('petCreate').onclick=async()=>{const name=$('newPetName').value.trim(),skin=$('newPetSkin').value;
  if(!name){$('newPetName').focus();return;}if(!skin){toast('Register a form in the Studio first — it becomes the pet’s skin');return;}
  const id=newId(),r=()=>Math.round(rnd(35,75));
  try{await writeDoc('pets',id,{name:name.slice(0,30),skinId:skin,stats:{happiness:r(),love:r(),hunger:r(),confidence:r()},createdAt:Date.now()});
    PR.id=id;try{localStorage.setItem('forge.pet',id);}catch(_){}$('newPetName').value='';$('petNewRow').classList.remove('on');renderPetBar();renderDeckPanel();renderPetAura();petLoadActor();toast(`Say hi to ${name}!`);}
  catch(e){toast('Could not create (do you have edit access?)');}};
armButton($('petDel'),'Delete pet','Sure?',async()=>{const id=PR.id;if(!id)return;PR.id=null;PR.actor=null;await deleteDoc('pets',id);toast('Pet removed');});

/* ---------- interactions ---------- */
const TOOLS={hand:{i:'✋',fx:['heart','heartS'],col:['#ff6f9a','#ffc2d4']},brush:{i:'🪮',fx:['sparkle','sparkleS'],col:['#fff3b0','#ffffff']},
  food:{i:'🍖',fx:['😋'],col:['#c9874a','#f2c27a']},scoop:{i:'🪣',fx:['✨'],col:['#d9f0ff','#ffffff']},toy:{i:'🎾',fx:['sparkle'],col:['#fff3b0','#ffffff']}};
const FLOOR={x0:14,x1:146,y0:86,y1:116,wallY:80};     // where the pet can walk / food can sit (map pixels)
[...$('petTools').children].forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===PR.tool));
seg('petTools',v=>{PR.tool=v;renderToyPicker();});
// bubbles: default = big emoji above the head; with {x,y,size} = small icon at a spot (used for petting/brushing)
// pixel-art reaction icons that pop up above the pet
const FACE={o:'#b9780e',y:'#ffd84a',l:'#fff1a0',e:'#5a3410',p:'#ff8f8f',m:'#7a3410',t:'#ff5a7a'};
const ICONS={
  love:{rows:['.oo...oo.','ohho.oooo','ohooooooo','ooooooooo','.ooooooo.','..ooooo..','...ooo...','....o....'],pal:{o:'#ff4f7f',h:'#ffd0de'},spark:true},
  smile:{rows:['..ooooo..','.oyyyyyo.','oylyyyyyo','oyeyyyeyo','oeyeyeyeo','opyyyyypo','oymyyymyo','.oymmmyo.','..ooooo..'],pal:FACE},
  yum:{rows:['..ooooo..','.oyyyyyo.','oylyyyyyo','oyeyyyeyo','oeyeyeyeo','opyyyyypo','oymmmmmyo','.oyyttyo.','..ooott..'],pal:FACE},
  poop:{rows:['....d....','...dbd...','..dbbld..','..dbbbd..','.dbbbbbd.','dbwbbbwbd','dbbbbbbbd','.ddddddd.'],pal:{d:'#5a3418',b:'#8a5a2e',l:'#b07a48',w:'#ffffff'}},
  star:{rows:['....o....','...oyo...','...yyy...','ooyywyyoo','.oyywyyo.','..yyyyy..','.oyyoyyo.','.oyo.oyo.','oo.....oo'],pal:{o:'#c98a10',y:'#ffd84a',w:'#ffffff'}},
  anger:{rows:['.RR.....RR.','RrR.....RrR','.RrR...RrR.','..RR...RR..','...........','...........','..RR...RR..','.RrR...RrR.','RrR.....RrR','.RR.....RR.'],pal:{R:'#c8102e',r:'#ff6a7a'}}};
function drawIcon(g,key,cx,cy,now){const I=ICONS[key];if(!I)return;const w=I.rows[0].length,h=I.rows.length,x0=Math.round(cx-w/2),y0=Math.round(cy-h/2);
  I.rows.forEach((r,j)=>{for(let i=0;i<w;i++){const c=I.pal[r[i]];if(c){g.fillStyle=c;g.fillRect(x0+i,y0+j,1,1);}}});
  if(I.spark&&Math.floor(now/160)%2){g.fillStyle='#ffffff';g.fillRect(x0+w,y0-1,1,1);g.fillRect(x0-2,y0+3,1,1);}}
function petBubble(e,ms=1600,o={}){PR.bubbles.push({e,t:performance.now(),ms,...o});}
function petSparkle(x,y,cols){const now=performance.now();for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2;PR.fx.push({x,y,vx:Math.cos(a)*.02,vy:Math.sin(a)*.02-.02,t:now,life:500+Math.random()*300,c:pick(cols)});}}
// pixel-art particles (drawn on the low-res map canvas so they stay crisp and blocky)
const PIX={heart:{rows:['.ab.bb.','abbbbbb','bbbbbbb','.bbbbc.','..bcc..','...c...'],pal:{a:'#ffd0de',b:'#ff5a8a',c:'#d8346a'}},
  heartS:{rows:['b.b','bbb','.c.'],pal:{b:'#ff7aa2',c:'#d8346a'}},
  sparkle:{frames:[['...a...','...b...','..bwb..','abwwwba','..bwb..','...b...','...a...'],['.......','...a...','...b...','.abwba.','...b...','...a...','.......']],pal:{a:'#ffe27a',b:'#fff3b0',w:'#ffffff'}},
  sparkleS:{frames:[['..a..','..b..','abwba','..b..','..a..'],['.....','..b..','.bwb.','..b..','.....']],pal:{a:'#ffe27a',b:'#fff3b0',w:'#ffffff'}}};
function petPix(kind,x,y,ms,delay=0){PR.pix=PR.pix||[];PR.pix.push({kind,x,y,t:performance.now()+delay,ms});}
function drawPix(g,now){
  PR.pix=(PR.pix||[]).filter(p=>now-p.t<p.ms);
  for(const p of PR.pix){const el=now-p.t;if(el<0)continue;const u=el/p.ms;if(u>.75&&Math.floor(el/60)%2)continue;    // blink out at the end
    const S=PIX[p.kind],rows=S.frames?S.frames[Math.floor(el/140)%S.frames.length]:S.rows,ox=Math.round(p.x-rows[0].length/2),oy=Math.round(p.y-u*7-rows.length/2);
    rows.forEach((r,j)=>{for(let i=0;i<r.length;i++){const col=S.pal[r[i]];if(col){g.fillStyle=col;g.fillRect(ox+i,oy+j,1,1);}}});}
}
function petReact(state,delay){PR.pending={state,at:performance.now()+delay};}
PR.pos={x:80,y:PET.floorY};PR.face=1;PR.items=[];PR.target=null;PR.eat=null;PR.wanderAt=0;PR.nextPoop=0;
const petBusy=()=>!!(PR.react||PR.eat);
// petting / brushing is done by dragging across the pet (press, hold and stroke)
const STROKE={every:34.3,toLove:22};            // map px of stroking per particle, and per "that felt nice"
function petOnPet(x,y){const b=PR.box;return !!(b&&x>=b.x-3&&x<=b.x+b.w+3&&y>=b.y-3&&y<=b.y+b.h+3);}
function petStroke(x,y){
  const S=PR.stroke,now=performance.now(),d=Math.hypot(x-S.x,y-S.y);S.x=x;S.y=y;
  if(!petOnPet(x,y)||d>20)return;            // only strokes that move across the pet count
  S.lastOn=now;S.fx+=d;S.love+=d;
  const T=TOOLS[PR.tool];
  while(S.fx>=STROKE.every){S.fx-=STROKE.every;S.n++;
    petPix(T.fx[S.n%T.fx.length],x+rnd(-4,4),y+rnd(-4,1),850+rnd(0,250));
    if(PR.tool==='brush'||S.n%2)petSparkle(x,y,T.col);}
  if(S.love>=STROKE.toLove&&!PR.pending&&!(PR.react&&PR.actor&&PR.actor.state==='love')){S.love=0;petReact('love',PET.reactDelay);
    // In the game a good brushing counts with the server: yours every few seconds, a visit's once an hour.
    if(LIVE&&PR.tool==='brush'&&Date.now()>(LV.brushQuiet||0)){LV.brushQuiet=Date.now()+(PR.visit?60000:4000);liveCare('brush');}}
}
function placeFood(x,y){
  const me=ME();if(me.food<=0){toast('Out of pet food — buy more in the Shop (100 PP for 3)');return;}   // food is limited: one serving per drop
  if(LIVE){liveCare('feed').then(ok=>{if(ok)dropFood(x,y);});return;}   // the server feeds them (and uses your food) first
  me.food--;savePlayer(me).catch(()=>{});
  dropFood(x,y);
}
// The food going down: a snack from up high, or a bowl on the floor.
function dropFood(x,y){
  const clampX=v=>Math.max(FLOOR.x0,Math.min(FLOOR.x1,v));
  // keep things tidy: at most 4 food items; empty bowls are cleared first
  const foods=PR.items.filter(i=>i.type==='bowl'||i.type==='kibble');if(foods.length>=4){const old=foods.find(i=>i.type==='bowl'&&i.food<=0)||foods[0];PR.items.splice(PR.items.indexOf(old),1);}
  if(y<FLOOR.wallY){PR.items.push({type:'kibble',x:clampX(x),y,fallTo:Math.round(rnd(96,112)),vy:0,food:1,id:Math.random()});}   // clicked high: it drops to the floor
  else PR.items.push({type:'bowl',x:clampX(x),y:Math.max(FLOOR.y0,Math.min(FLOOR.y1,y)),food:1,id:Math.random()});              // clicked the floor: a filled bowl
  petBubble('yum',900);
}
function scoopAt(x,y){
  const p=PR.items.find(i=>i.type==='poop'&&Math.abs(i.x-x)<=7&&Math.abs(i.y-3-y)<=7);
  if(p){PR.items.splice(PR.items.indexOf(p),1);petSparkle(p.x,p.y-3,['#d9f0ff','#ffffff','#bfe6ff']);petPix('sparkle',p.x,p.y-7,700);
    if(LIVE)liveCare('scoop').then(ok=>{if(!ok)liveSyncPoop();});}   // the server's count decides: put back if it said no
}
// ---- Toys in the room: drop a ball, and the pets here knock it about ----
// The Toy tool's picker: the balls you have, each with its knocks left, and "in the room" on one that's out.
const ballOut=k=>PR.items.find(i=>i.type==='ball'&&i.kind===k);
function renderToyPicker(){const el=$('petToySel');if(!el)return;const me=ME(),owned=Object.keys(TOYS.balls).filter(k=>me.balls[k]>0);
  el.hidden=PR.tool!=='toy';if(!owned.includes(PR.toyKind))PR.toyKind=owned[0]||null;
  el.innerHTML=owned.length?owned.map(k=>{const out=!!ballOut(k);
    return `<button type="button" data-v="${k}" aria-pressed="${k===PR.toyKind}" class="${out?'out':''}" title="${out?'In the room: tap to take it back':'Pick it, then tap the floor to drop it'}">${TOYS.balls[k].i} ${TOYS.balls[k].l} · ${me.balls[k]}${out?' · in the room':''}</button>`;}).join('')
    :'<button type="button" disabled>No toys yet: buy a ball in the Shop</button>';}
// A ball's button: picks it to drop, or, while it's out in the room, takes it back (it keeps the knocks it has left).
$('petToySel').onclick=e=>{const b=e.target.closest('button[data-v]');if(!b)return;const k=b.dataset.v,out=ballOut(k);
  if(out)takeBackToy(out);PR.toyKind=k;renderToyPicker();};
function takeBackToy(b){const at=PR.items.indexOf(b);if(at<0)return;PR.items.splice(at,1);
  for(const S of [PR,PR.buddy])if(S&&S.target&&S.target.ball===b)S.target=null;   // nobody's after it any more
  petSparkle(b.x,b.y-4-(b.z||0),['#ffffff','#fff3b0']);}
// Drops the picked ball where they tapped: on the floor, or from up high onto it. You have one of each, so one
// already out moves here instead. The pets go for it a moment later.
function placeToy(x,y){
  const me=ME(),owned=Object.keys(TOYS.balls).filter(k=>me.balls[k]>0),kind=owned.includes(PR.toyKind)?PR.toyKind:owned[0];
  if(!kind){toast('No toys yet — buy a ball in the Shop');return;}
  const old=PR.items.find(i=>i.type==='ball'&&i.kind===kind);if(old)PR.items.splice(PR.items.indexOf(old),1);
  const high=y<FLOOR.wallY,fy=high?Math.round(rnd(96,112)):Math.max(FLOOR.y0+2,Math.min(FLOOR.y1,y));
  PR.items.push({type:'ball',kind,x:Math.max(FLOOR.x0,Math.min(FLOOR.x1,x)),y:fy,z:high?fy-y:8,vx:0,vy:0,vz:0,roll:0,dir:1,id:Math.random()});
  const now=performance.now();PR.ballAt=now+rnd(400,1200);if(PR.buddy)PR.buddy.ballAt=now+rnd(1500,3000);renderToyPicker();}
// A ball's step: it falls and bounces, rolls to a stop, and bounces off the room's edges.
function ballStep(b,dt){
  if(b.z>0||b.vz!==0){b.vz-=.00035*dt;b.z+=b.vz*dt;if(b.z<=0){b.z=0;b.vz=b.vz<-.025?-b.vz*.45:0;}}
  const f=Math.pow(b.z>0?.9995:.997,dt);b.vx*=f;b.vy*=f;if(Math.hypot(b.vx,b.vy)<.002){b.vx=0;b.vy=0;}
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.roll+=(Math.abs(b.vx)+Math.abs(b.vy))*dt;if(b.vx)b.dir=b.vx<0?-1:1;
  if(b.x<FLOOR.x0){b.x=FLOOR.x0;b.vx=Math.abs(b.vx)*.6;}else if(b.x>FLOOR.x1){b.x=FLOOR.x1;b.vx=-Math.abs(b.vx)*.6;}
  if(b.y<FLOOR.y0+2){b.y=FLOOR.y0+2;b.vy=Math.abs(b.vy)*.6;}else if(b.y>FLOOR.y1){b.y=FLOOR.y1;b.vy=-Math.abs(b.vy)*.6;}}
// A pet going for a ball (`S`: PR, the pet whose room it is, or PR.buddy, yours on a Play Date): when it's time, it sets
// off for the nearest, follows it as it rolls, and knocks it on reaching it, then rests a few seconds. Returns whether
// it's after one.
function ballChase(S,now,cw,who){
  const balls=PR.items.filter(i=>i.type==='ball');
  if(!balls.length||now<(S.ballAt||0)){if(S.target&&S.target.ball)S.target=null;return false;}
  const near=balls.reduce((m,i)=>Math.hypot(i.x-S.pos.x,i.y-S.pos.y)<Math.hypot(m.x-S.pos.x,m.y-S.pos.y)?i:m);
  const b=S.target&&S.target.ball&&balls.includes(S.target.ball)?S.target.ball:near,reach=cw*.42+2,dx=b.x-S.pos.x;
  if(Math.abs(dx)<=reach+1&&Math.abs(b.y-S.pos.y)<=5&&(b.z||0)<4){S.target=null;S.ballAt=now+rnd(2500,6500);kickBall(b,dx>=0?1:-1,S,who);return true;}
  S.target={x:Math.max(FLOOR.x0,Math.min(FLOOR.x1,b.x-(dx>=0?1:-1)*(reach-1))),y:b.y,ball:b};return true;}
// A knock: the ball flies off the way the pet faced, a heart over the pet, and it counts (knockCount). At most one a
// second (the server counts no more), so two pets after the same ball take turns.
function kickBall(b,dir,S,who){const now=performance.now();if(now<(PR.knockQuiet||0))return;PR.knockQuiet=now+1200;
  b.vx=dir*rnd(.035,.06);b.vy=rnd(-.02,.02);b.vz=rnd(.05,.075);b.z=Math.max(b.z||0,.5);b.dir=dir;
  S.face=dir;petPix('heart',S.pos.x,S.pos.y-20,800);petSparkle(b.x,b.y-4,['#ffffff','#fff3b0']);
  const petId=who==='buddy'?PR.id:(PR.visit?PR.visit.hostId:PR.id);if(petId)knockCount(b,petId);}
// A knock counted: +5 happiness for the pet that made it and a knock off the ball (the server decides, in the game).
// Worn out, the ball goes.
async function knockCount(b,petId){
  if(LIVE){try{const r=await cfx('/toy/knock',{method:'POST',body:{petId,ball:b.kind}});livePet(r.pet);liveApply({player:r.player});if(r.left<=0)ballWornOut(b);}
    catch(e){if(e.status===409)ballWornOut(b);}   // gone already (worn out elsewhere); too soon (429): just not counted
    return;}
  const me=ME(),left=(me.balls[b.kind]||0)-1;me.balls[b.kind]=left>0?left:null;savePlayer(me).catch(()=>{});
  // On a Play Date, the pet you're visiting knocking your ball loves you a little more.
  const p=petDocs.get(petId),v=PR.visit,visiting=!!v&&petId===v.hostId;
  const love=d=>visiting?{loveBy:{...(d.loveBy||{}),me:Math.min(100,((d.loveBy&&d.loveBy.me)||0)+TOYS.loveForVisitor)}}:{};
  if(p){const st=p.stats||{};writeDoc('pets',petId,{...p,stats:{...st,happiness:Math.min(100,(st.happiness??50)+TOYS.happiness)},...love(p)}).then(()=>{if(visiting)visitUi();}).catch(()=>{});}
  else if(visiting&&v.hostType==='neighbor'){const d=visitHostDoc(v)||{name:v.name};writeDoc('neighbors',v.hostId,{...d,...love(d)}).then(visitUi).catch(()=>{});}
  if(left<=0)ballWornOut(b);}
function ballWornOut(b){const at=PR.items.indexOf(b);if(at<0)return;PR.items.splice(at,1);
  petSparkle(b.x,b.y-4,Object.values(BALL_ART[b.kind].pal));petPix('sparkle',b.x,b.y-6,700);toast(`Your ${TOYS.balls[b.kind].l} wore out`);renderToyPicker();}
$('petPraise').onclick=async()=>{if(!PR.actor)return;if(LIVE&&!(await liveCare('praise')))return;petBubble('star',1400);const b=PR.box;if(b)petSparkle(b.cx,b.top,['#ffe066','#fff6c0']);};
$('petScold').onclick=async()=>{const p=petDocs.get(PR.id);if(!PR.actor||!p)return;if(LIVE&&!(await liveCare('scold')))return;petBubble('anger',1200);
  const hap=(p.stats&&p.stats.happiness)??50;PR.pending=null;petReact(hap>=PET.happyHigh?'sad':'angry',350);};
$('petCanvas').addEventListener('pointerdown',e=>{
  if(eggActive()){const r=$('petCanvas').getBoundingClientRect();eggTap((e.clientX-r.left)/r.width*PET.W,(e.clientY-r.top)/r.height*PET.H);return;}
  if(!PR.actor)return;const r=$('petCanvas').getBoundingClientRect(),x=(e.clientX-r.left)/r.width*PET.W,y=(e.clientY-r.top)/r.height*PET.H,b=PR.box;
  if(PR.tool==='hand'||PR.tool==='brush'){PR.stroke={id:e.pointerId,x,y,fx:STROKE.every/2,love:0,n:0,lastOn:petOnPet(x,y)?performance.now():0};try{$('petCanvas').setPointerCapture(e.pointerId);}catch(_){}}
  else if(PR.tool==='food')placeFood(x,y);
  else if(PR.tool==='scoop')scoopAt(x,y);
  else if(PR.tool==='toy')placeToy(x,y);
});
$('petCanvas').addEventListener('pointermove',e=>{const r=$('petCanvas').getBoundingClientRect();PR.cursor={x:(e.clientX-r.left)/r.width*PET.W,y:(e.clientY-r.top)/r.height*PET.H};
  if(PR.stroke&&PR.stroke.id===e.pointerId&&PR.actor)petStroke(PR.cursor.x,PR.cursor.y);});
const petStrokeEnd=e=>{if(PR.stroke&&PR.stroke.id===e.pointerId)PR.stroke=null;};
$('petCanvas').addEventListener('pointerup',petStrokeEnd);$('petCanvas').addEventListener('pointercancel',petStrokeEnd);
$('petCanvas').addEventListener('pointerleave',()=>{PR.cursor=null;});

/* ---------- loop ---------- */
const PC={canvas:$('petCanvas'),lo:null};PC.ctx=PC.canvas.getContext('2d');PC.lo=document.createElement('canvas');PC.lo.width=PET.W;PC.lo.height=PET.H;PC.lctx=PC.lo.getContext('2d');
function petSize(){const w=$('petWrap').clientWidth;if(!w)return;const dpr=Math.min(2,devicePixelRatio||1);const k=Math.max(1,Math.round(w*dpr/PET.W));if(PC.canvas.width!==PET.W*k){PC.canvas.width=PET.W*k;PC.canvas.height=PET.H*k;}PR.k=k;}
new ResizeObserver(petSize).observe($('petWrap'));
function petPoop(now){ // a little pile appears just behind the pet
  if(PR.items.filter(i=>i.type==='poop').length>=6)return;
  const cw=PR.actor?PR.actor.form.crop.w:30;const x=Math.max(FLOOR.x0,Math.min(FLOOR.x1,PR.pos.x-PR.face*cw*.35));
  PR.items.push({type:'poop',x:Math.round(x),y:Math.round(PR.pos.y-1),t:now,id:Math.random()});petBubble('poop',1100);
}
function petStep(dt,now){
  eggStep(dt,now);if(eggActive())return;
  // An unhappy cat idles sad: the one whose room it is, and yours tagging along on a Play Date.
  if(PR.actor)PR.actor.low=lowMood((petDocs.get(PR.visit?PR.visit.hostId:PR.id)||{}).stats);
  if(PR.buddy&&PR.buddy.actor)PR.buddy.actor.low=lowMood((petDocs.get(PR.id)||{}).stats);
  if(PR.visit)buddyStep(dt,now);
  const a=PR.actor;if(!a)return;a.step(dt);
  // falling kibble
  for(const it of PR.items)if(it.fallTo!==undefined&&it.y<it.fallTo){it.vy+=dt*.0006;it.y=Math.min(it.fallTo,it.y+it.vy*dt);if(it.y>=it.fallTo){delete it.fallTo;petSparkle(it.x,it.y,['#c9874a','#f2c27a']);}}
  for(const it of PR.items)if(it.type==='ball')ballStep(it,dt);   // toys rolling and bouncing
  // queued reactions (pet / brush → happy, scold → sad / angry) interrupt walking and eating
  if(PR.pending&&now>=PR.pending.at){const {state}=PR.pending;PR.pending=null;PR.target=null;PR.eat=null;a.setState(state);
    const cyc=a.anim(state).delays.reduce((x,y)=>x+y,0);PR.react={until:now+Math.max(1800,Math.min(4000,cyc))};if(state==='love')petBubble('love',1400);}
  if(PR.react&&now>=PR.react.until){PR.react=null;a.setState('idle');}
  // eating
  if(PR.eat){const it=PR.eat.item;it.food=Math.max(0,it.food-dt/2200);
    if(it.food<=0||!PR.items.includes(it)){PR.eat=null;a.setState('idle');if(it.type==='kibble')PR.items.splice(PR.items.indexOf(it),1);
      petBubble('smile',1000);if(Math.random()<.6)PR.nextPoop=now+rnd(6000,12000);if(PR.visit)visitFed(now);}}
  // casting a spell card: stand still for the show
  if(PR.cast){castStep(now);if(PR.cast){if(PR.target){PR.target=null;a.setState('idle');}return;}}
  // being stroked: hold still and enjoy it
  if(PR.stroke&&now-PR.stroke.lastOn<500){if(PR.target){PR.target=null;a.setState('idle');}PR.wanderAt=Math.max(PR.wanderAt,now+2500);return;}
  if(petBusy())return;
  // food first: walk to the nearest landed food and stand beside it
  const cw=a.form.crop.w;
  const foods=PR.items.filter(i=>i.type!=='poop'&&i.food>0&&i.fallTo===undefined);
  if(foods.length){const it=foods.reduce((m,i)=>Math.hypot(i.x-PR.pos.x,i.y-PR.pos.y)<Math.hypot(m.x-PR.pos.x,m.y-PR.pos.y)?i:m);
    const side=PR.pos.x<it.x?-1:1;let tx=it.x+side*(cw*.42+2);if(tx<FLOOR.x0||tx>FLOOR.x1)tx=it.x-side*(cw*.42+2);
    PR.target={x:Math.max(FLOOR.x0,Math.min(FLOOR.x1,tx)),y:it.y,food:it};}
  else if(ballChase(PR,now,cw,'host')){}   // a ball in the room: go and knock it about
  else if(!PR.target||PR.target.food||PR.target.ball){if(PR.target&&(PR.target.food||PR.target.ball))PR.target=null;
    if(now>=PR.wanderAt){PR.wanderAt=now+rnd(5000,11000);if(Math.random()<.55)PR.target={x:rnd(FLOOR.x0+10,FLOOR.x1-10),y:rnd(FLOOR.y0+2,FLOOR.y1-2)};}}
  if(PR.target){const t=PR.target,dx=t.x-PR.pos.x,dy=t.y-PR.pos.y,d=Math.hypot(dx,dy),step=.022*dt;
    if(Math.abs(dx)>.5)PR.face=dx>0?1:-1;
    if(d<=step){PR.pos.x=t.x;PR.pos.y=t.y;
      if(t.food){PR.face=t.food.x>PR.pos.x?1:-1;PR.eat={item:t.food};a.setState('idle');petBubble('yum',1200);}else a.setState('idle');PR.target=null;}
    else{PR.pos.x+=dx/d*step;PR.pos.y+=dy/d*step;if(a.state!=='walk')a.setState('walk');}}
  // now and then the pet needs to go
  if(!PR.nextPoop)PR.nextPoop=now+rnd(40000,80000);
  if(!LIVE&&now>=PR.nextPoop&&!PR.target){petPoop(now);PR.nextPoop=now+rnd(45000,90000);}
}
function drawItem(g,it,now){
  if(it.type==='ball')return drawBall(g,it);
  const x=Math.round(it.x),y=Math.round(it.y);
  g.fillStyle='rgba(60,30,20,.25)';g.fillRect(x-5,y,10,1);
  if(it.type==='bowl'){g.fillStyle='#c83a3a';g.fillRect(x-5,y-3,10,3);g.fillRect(x-4,y,8,1);g.fillStyle='#ff6a5a';g.fillRect(x-5,y-3,10,1);
    if(it.food>0){const h=Math.max(1,Math.round(it.food*2));g.fillStyle='#b8783e';g.fillRect(x-4,y-3-h,8,h);g.fillStyle='#e0a462';g.fillRect(x-3,y-3-h,2,1);g.fillRect(x+1,y-3-h,2,1);}}
  else if(it.type==='kibble'){const n=Math.max(1,Math.round(it.food*5));g.fillStyle='#b8783e';
    for(let i=0;i<n;i++)g.fillRect(x-3+(i*3)%7,y-1-((i*2)%3>0?1:0),2,2);g.fillStyle='#e0a462';g.fillRect(x-2,y-2,1,1);}
  else if(it.type==='poop'){g.fillStyle='#6b4226';g.fillRect(x-3,y-2,7,2);g.fillRect(x-2,y-4,5,2);g.fillRect(x-1,y-6,3,2);g.fillRect(x,y-7,1,1);
    g.fillStyle='#8a5a34';g.fillRect(x-2,y-2,2,1);g.fillRect(x-1,y-4,2,1);
    const ph=now/300;g.fillStyle='rgba(140,190,90,.8)';for(let k=0;k<2;k++){const sx=x-2+k*4;for(let j=0;j<4;j++)g.fillRect(sx+Math.round(Math.sin(ph+j+k*2)),y-9-j*2-(Math.floor(ph)%2),1,1);}}   // stink lines
}
function petDraw(now){
  const pd=PR.id&&petDocs.get(PR.id),style=PR.visit?PR.visit.style:(pd&&PET_STYLES[pd.roomStyle])?pd.roomStyle:'cozy';
  PR.bgs=PR.bgs||{};if(!PR.bgs[style])PR.bgs[style]=drawPetRoom(style);const RB=PR.bgs[style];
  const g=PC.lctx;g.imageSmoothingEnabled=false;g.drawImage(RB.canvas,0,0);
  for(const l of RB.live){g.fillStyle=l.c[Math.floor(now/l.ms)%l.c.length];g.fillRect(l.x,l.y,l.w,l.h);}       // candles, neon, blinking lights
  const a=eggActive()?null:PR.actor;PR.box=null;   // while an egg is out, the egg takes the room
  castDrawLow(g,now);
  // draw items and the pet back-to-front so depth looks right
  const things=(eggActive()?[]:PR.items).map(it=>({y:it.fallTo!==undefined?it.fallTo:it.y,it}));if(a)things.push({y:PR.pos.y+.5,pet:true});
  if(PR.visit&&PR.buddy)things.push({y:PR.buddy.pos.y+.4,buddy:true});things.sort((p,q)=>p.y-q.y);
  for(const t of things){
    if(t.buddy){buddyDraw(g,now);continue;}
    if(t.it){if(t.it.fallTo!==undefined){g.fillStyle='rgba(60,30,20,.25)';g.fillRect(Math.round(t.it.x)-3,t.it.fallTo,6,1);}drawItem(g,t.it,now);continue;}
    const A=a.anim(a.state),f=A.frames[a.cur]||A.frames[0],cr=a.form.crop;const cx=Math.round(PR.pos.x),fy=Math.round(PR.pos.y);
    let dx=cx-Math.round(cr.w/2)+nudgeOf(a.form),dy=fy-(cr.h-1)+sinkOf(a.form);
    if(A.hover)dy-=Math.round(HOVER_AMP*(.6+(Math.sin(a.clock/HOVER_MS*Math.PI*2)+1)/2));
    if(A.shake)dx+=Math.round(Math.sin(a.clock/SHAKE_MS*Math.PI*2)*A.shakeAmt);
    if(A.ushake)dy+=Math.round(Math.sin(a.clock/USHAKE_MS*Math.PI*2)*A.ushakeAmt);
    if(PR.eat)dy+=Math.round((Math.sin(now/120)+1)/2);                                         // munching bob
    g.fillStyle='rgba(60,30,20,.3)';g.fillRect(cx-Math.round(cr.w*.3),fy,Math.round(cr.w*.6),2);
    const ak=AURA_ON?petAura(PR.visit?(PR.visit.hostType==='pet'?petDocs.get(PR.visit.hostId):null):petDocs.get(PR.id)):'';
    if(ak){if(!PR.afx||PR.afx.kind!==ak)PR.afx=newAuraFx(ak);const dtA=Math.min(50,now-(PR.afxT||now));PR.afxT=now;
      g.drawImage(auraRender(PR.afx,f,cr,PR.face!==a.artFaces(),now,dtA,topPad(a)),dx-PR.afx.M-(PR.face!==a.artFaces()?2*nudgeOf(a.form):0),dy-PR.afx.M);}
    else{g.save();if(PR.face!==a.artFaces()){g.translate(cx*2,0);g.scale(-1,1);}g.drawImage(f,cr.x,cr.y,cr.w,cr.h,dx,dy,cr.w,cr.h);g.restore();}
    PR.box={x:dx,y:dy+topPad(a),w:cr.w,h:cr.h-topPad(a),cx,top:dy+topPad(a)};}
  if(eggActive())eggLow(g,now);
  // sparkles
  PR.fx=PR.fx.filter(p=>now-p.t<p.life);for(const p of PR.fx){const t=now-p.t;g.globalAlpha=1-t/p.life;g.fillStyle=p.c;g.fillRect(Math.round(p.x+p.vx*t),Math.round(p.y+p.vy*t),1,1);}g.globalAlpha=1;
  drawPix(g,now);
  // reaction icons above the head: pop in, float up, blink out
  PR.bubbles=PR.bubbles.filter(b=>now-b.t<b.ms+(b.delay||0));let bi=0;
  for(const b of PR.bubbles){const el=now-b.t-(b.delay||0);if(el<0)continue;const u=el/b.ms;if(u>.75&&Math.floor(el/70)%2)continue;
    const pop=el<120?Math.round((1-el/120)*3):0;
    if(b.x!==undefined)drawIcon(g,b.e,b.x,b.y-u*6,now);
    else if(PR.box)drawIcon(g,b.e,PR.box.cx+(bi++%2?10:-10),PR.box.top-17-u*10+pop,now);}
  const G=PC.ctx,k=PR.k;G.imageSmoothingEnabled=false;G.drawImage(PC.lo,0,0,PET.W*k,PET.H*k);
  for(const t of RB.texts){const on=!t.flicker||Math.sin(now/90)>-.85&&Math.floor(now/2300)%5!==0||Math.floor(now/70)%2;   // neon with the odd flicker
    G.font=`700 ${t.size*k}px 'Pixelify Sans', monospace`;G.textAlign='center';G.textBaseline='middle';
    if(on){G.save();G.shadowColor=t.glow;G.shadowBlur=6*k;G.fillStyle=t.col;G.fillText(t.t,t.x*k,t.y*k);G.restore();G.fillStyle='#ffd0f4';G.fillText(t.t,t.x*k,t.y*k-k*.3);}
    else{G.fillStyle='rgba(120,40,110,.7)';G.fillText(t.t,t.x*k,t.y*k);}}
  // name tag + emoji bubbles + tool cursor (crisp, full resolution)
  G.textAlign='center';G.textBaseline='middle';
  if(a&&PR.box){const p=petDocs.get(PR.id);G.font=`700 ${6*k}px 'Pixelify Sans', monospace`;
    const t=PR.visit?PR.visit.name:p?p.name:'';const w=G.measureText(t).width+6*k,ty=Math.min(PET.H-9,Math.round(PR.pos.y)+4);   // name tag under the feet
    if(a._vOff===undefined||a._vForm!==a.form){const A0=a.anim('idle'),R0=rings(A0.frames[0],a.form.crop);let lo=1e9,hi=-1e9;for(const [x] of R0.r1){lo=Math.min(lo,x);hi=Math.max(hi,x);}a._vOff=hi>lo?a.form.crop.w/2-(lo+hi)/2:0;a._vForm=a.form;}
    const nx=PR.box.cx+(PR.face!==a.artFaces()?a._vOff:-a._vOff);   // centred on the art, not the crop box
    G.fillStyle='rgba(40,20,15,.7)';G.fillRect(nx*k-w/2,ty*k,w,8*k);G.fillStyle='#fff3e0';G.fillText(t,nx*k,(ty+4)*k);}

  castDrawHi(G,k,now);eggHud(G,k,now);if(PR.visit)buddyTag(G,k);
  if(PR.cursor&&a){G.font=`${10*k}px serif`;G.fillText(TOOLS[PR.tool].i,PR.cursor.x*k+4*k,PR.cursor.y*k-4*k);}
}
function petLoop(t){if(!PR.running)return;const dt=Math.min(100,t-(PR.last||t));PR.last=t;petStep(dt,t);petDraw(t);requestAnimationFrame(petLoop);}
function petStart(){if(PR.running)return;PR.running=true;PR.last=0;petSize();requestAnimationFrame(petLoop);}
function petStop(){PR.running=false;}

/* ================= tabs (hash) ================= */
function route(){const tabs=LIVE?['room','pet','race','run','shop']:['studio','forms','room','race','run','pet','shop','profile'];
  let h=location.hash.slice(1)||(LIVE?'room':'studio');if(EMBED)h='shop';if(!tabs.includes(h))h=LIVE?'room':'studio';
  if(LIVE&&h==='room'&&route.last!=='room'&&store.mode==='online')roomLive();   // a new set of pets every time you come in
  const intoRace=LIVE&&h==='race'&&route.last!=='race',intoRun=LIVE&&h==='run'&&route.last!=='run';
  // Explore, Kitty Race and Ruin Run: no scrolling (it would move the game under your finger); the game fills the
  // screen under the tabs and everything else opens in a pop-up window over it.
  document.documentElement.classList.toggle('fit',LIVE&&['room','race','run'].includes(h));if(LIVE)window.scrollTo(0,0);
  route.last=h;
  $('shop').hidden=h!=='shop';$('tabShop').classList.toggle('on',h==='shop');if(h==='shop')renderShop();if(h!=='shop')$('gachaModal').hidden=true;
  $('profile').hidden=h!=='profile';$('tabProfile').classList.toggle('on',h==='profile');if(h==='profile'){renderProfile();profStart();}else profStop();
  $('studio').hidden=h!=='studio';$('forms').hidden=h!=='forms';$('room').hidden=h!=='room';$('race').hidden=h!=='race';$('run').hidden=h!=='run';$('pet').hidden=h!=='pet';
  $('tabPet').classList.toggle('on',h==='pet');if(h==='pet'){eggSync(true);petStart();}else petStop();
  // Ruin Run (the game): its start screen each time the tab opens; the game runs once Play's pressed.
  $('tabRun').classList.toggle('on',h==='run');if(h==='run'){if(LIVE&&intoRun)runHome(true);else if(!(LIVE&&RL.home))runStartLoop();$('runBest').textContent=RN.best+' m';}else runStopLoop();
  $('tabStudio').classList.toggle('on',h==='studio');$('tabForms').classList.toggle('on',h==='forms');$('tabRoom').classList.toggle('on',h==='room');$('tabRace').classList.toggle('on',h==='race');
  if(h==='race')raceStartLoop();else raceStopLoop();
  if(h==='forms')renderDetail();if(h==='studio')sizeBig();
  if(h==='room'){roomStart();}else roomStop();
  if(intoRace){raceLiveLoad();raceLivePoll();}   // once the tab's showing (the poll stops when it isn't)
  if(intoRun)runLiveLoad();}
addEventListener('hashchange',route);

// A window over the page asking them to confirm (in place of the browser's own confirm box): resolves to true for
// the yes button, false for Cancel, a tap outside it or Escape.
function askConfirm({title,text,yes='Confirm',no='Cancel'}){
  const m=$('askModal'),Y=$('askYes'),N=$('askNo');$('askTitle').textContent=title;$('askText').textContent=text;Y.textContent=yes;N.textContent=no;m.hidden=false;Y.focus();
  return new Promise(done=>{
    const onKey=e=>{if(e.key==='Escape')close(false);};
    const close=v=>{m.hidden=true;Y.onclick=N.onclick=m.onclick=null;document.removeEventListener('keydown',onKey);done(v);};
    document.addEventListener('keydown',onKey);Y.onclick=()=>close(true);N.onclick=()=>close(false);m.onclick=e=>{if(e.target===m)close(false);};});}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2400);}

// The game's own look: only its tabs, and none of Pet Forge's testing controls.
// A stage: what the game sits in, as big as the room left on the screen allows.
function liveStage(wrap){const st=document.createElement('div');st.className='gamestage';wrap.before(st);st.append(wrap);return st;}
// A pop-up window over a tab's game (inside the tab, so it never covers the tabs or runs off the bottom).
function livePop(section,id,title){const pop=document.createElement('div');pop.className='popwin';pop.id=id;
  pop.innerHTML=`<div class="box" role="dialog" aria-label="${esc(title)}"></div>`;section.append(pop);return pop.firstChild;}
function liveLayout(){
  // Explore: the game, then the auras switch and the place button under it. The places (and the note on who's
  // here, and how to play) open in a pop-up window.
  const room=$('room'),bar=room.querySelector('.roombar');liveStage($('roomWrap')).append(bar);
  const placesLbl=document.createElement('span');placesLbl.className='lbl';placesLbl.textContent='Explore:';
  const placesBtn=document.createElement('button');placesBtn.className='btn';placesBtn.id='roomPlacesBtn';placesBtn.type='button';bar.append(placesLbl,placesBtn);
  const lbl=$('roomSeg').previousElementSibling;if(lbl)lbl.hidden=true;
  const box=livePop(room,'roomPop','Places');const pop=box.parentElement;pop.hidden=true;
  box.innerHTML='<div class="head"><h3>Places</h3><button class="btn" type="button" id="roomPopClose" aria-label="Close">✕</button></div>';
  box.append($('roomSeg'),$('roomNote'));const help=room.querySelector(':scope > p.note');if(help)box.append(help);
  placesBtn.onclick=()=>{pop.hidden=false;};$('roomPopClose').onclick=()=>{pop.hidden=true;};
  pop.addEventListener('click',e=>{if(e.target===pop||e.target.closest('#roomSeg button'))pop.hidden=true;});   // a place picked, or a tap outside
  // Kitty Race: the game; its menu (bets, races, results) is a pop-up window over it, away while a race plays.
  const race=$('race');race.querySelector('.roombar').hidden=true;liveStage($('raceWrap'));
  const rbox=livePop(race,'racePop','Kitty Race');
  const res=document.createElement('div');res.id='raceResultsBox';res.hidden=true;const panel=$('raceResults').closest('.panel');
  res.append($('raceResultsTitle'),$('raceResults'));panel.remove();rbox.append(res);
  $('raceLive').classList.remove('panel');rbox.append($('raceLive'));
  // Ruin Run: nothing over the game (Swipe is the only touch control); the bets and results are the menu over the
  // game, and under it, buttons: lane up and lane down (two squares on the left) and JUMP on the right. JUMP held
  // down jumps higher, like holding Space.
  $('run').querySelector('.roombar').hidden=true;
  const pad=document.createElement('div');pad.className='runpad';
  pad.innerHTML='<div class="lanes"><button type="button" class="padbtn" id="runUp" tabindex="-1" aria-label="Lane up">▲</button>'+
    '<button type="button" class="padbtn" id="runDown" tabindex="-1" aria-label="Lane down">▼</button></div>'+
    '<button type="button" class="padbtn jump" id="runJump" tabindex="-1">JUMP</button>';
  $('runStage').append(pad);
  const press=(id,fn)=>$(id).addEventListener('pointerdown',e=>{e.preventDefault();fn();});
  press('runUp',()=>setLane(laneNow()-1));press('runDown',()=>setLane(laneNow()+1));
  const jump=$('runJump');
  jump.addEventListener('pointerdown',e=>{e.preventDefault();if(RN.state!=='running')return;try{jump.setPointerCapture(e.pointerId);}catch(_){}doJump();});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])jump.addEventListener(ev,()=>releaseJump());
  // Its start screen, before the game (runHomeRender): Play, How to Play (a pop-up window) and the site's best runs.
  const home=document.createElement('div');home.className='runhome';home.id='runHome';$('runStage').before(home);
  livePop($('run'),'runHowPop','How to Play').parentElement.hidden=true;
  home.addEventListener('click',e=>{const b=e.target.closest('button[data-do]');if(!b)return;if(b.dataset.do==='play')runHome(false);else if(b.dataset.do==='how')runHowOpen();});
  $('runHowPop').addEventListener('click',e=>{if(e.target===e.currentTarget||e.target.closest('#runHowClose'))runHowClose();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')runHowClose();});
}
function liveChrome(){
  if(!LIVE)return;document.title='Catflix No Chill';document.body.classList.add('live');
  document.querySelector('.top').hidden=true;   // no title over the game: the site's own bar above it names it
  // The Pet room: its room picker and auras switch in their box at the bottom of the page, under everything else.
  $('pet').querySelector('.petlayout').after($('petBarMain'));
  for(const id of ['tabStudio','tabForms','tabProfile','status','ppAdd','petSel','petNew','petDel','roomShuffle','mineSel','roomWxSeg','raceStart','raceShuffle','weatherSeg','runPet'])$(id).hidden=true;
  for(const sel of ['label[for=runPet]'])document.querySelectorAll(sel).forEach(el=>el.hidden=true);
  const wxr=$('weatherSeg');if(wxr.previousElementSibling)wxr.previousElementSibling.hidden=true;   // "Weather": the race's own
  $('tabRoom').textContent='Explore';$('tabRace').textContent='Kitty Race';$('tabRun').textContent='Ruin Run';
  liveLayout();
  for(const sel of ['label[for=mineSel]','label[for=petSel]'])document.querySelectorAll(sel).forEach(el=>el.hidden=true);
  const step=$('roomMinus').closest('.step');step.hidden=true;if(step.previousElementSibling)step.previousElementSibling.hidden=true;   // "Pets in room"
  const wx=$('roomWxSeg');if(wx.previousElementSibling)wx.previousElementSibling.hidden=true;   // "Weather"
  const edit=$('petEdit').closest('label');if(edit){edit.hidden=true;if(edit.nextElementSibling)edit.nextElementSibling.textContent='Care, play and time change them: hungry, lonely or messy pets get unhappy.';}
  const crysNote=$('shopCrystals').nextElementSibling;if(crysNote)crysNote.textContent='A crystal unlocks an aura for your pet: equip it in the Pet tab.';
}
liveChrome();route();setStatus();requestAnimationFrame(loop);initStore();
