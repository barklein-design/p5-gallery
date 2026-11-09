'use strict';
// --- Gallery adapter (added for the course gallery; the original sketch starts below) ---
// The gallery runs only sketch.js, without this folder's index.html and style.css.
// If the page has no controls yet, add the same markup and styles from those files.
if(!document.getElementById('canvas-holder')){
 const style=document.createElement('style');
 style.textContent="*{box-sizing:border-box}body{margin:0;background:#fff;color:#282828;font-family:Arial,Helvetica,sans-serif;font-size:16px}main{width:min(940px,96vw);margin:15px auto 35px}header{color:#999;text-align:center;margin:5px 0 19px;font-size:16px}.frame{border:1px solid #dedede;background:#fff;width:100%;aspect-ratio: 940/650;position:relative;overflow:hidden}.frame canvas{display:block!important;width:100%!important;height:100%!important}.controls{display:flex;flex-direction:column;align-items:center;gap:9px;padding:18px 4px 0}.control{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}.control label{min-width:103px;text-align:right}.control input{width:205px;accent-color:#0075ff}.number{min-width:35px;font-variant-numeric:tabular-nums}.buttons{display:flex;justify-content:center;gap:3px;flex-wrap:wrap;margin-top:4px}button{font:inherit;color:#111;background:#f2f2f2;border:1px solid #888;border-radius:3px;padding:6px 14px;cursor:pointer;min-height:34px}button:hover{background:#e4e4e4}.osc{font-size:14px;min-width:110px}.note{text-align:center;color:#888;font-size:13px;margin-top:10px;line-height:1.45}@media(max-width:600px){main{width:96vw}.controls{font-size:14px}.control input{width:135px}.control label{min-width:83px}.osc{min-width:80px;font-size:12px;padding:6px}.frame{aspect-ratio: 1/1}}";
 document.head.appendChild(style);
 document.body.insertAdjacentHTML('afterbegin',"<main>\n<header>Starling murmuration \u00b7 1 / 1</header>\n<div class=\"frame\" id=\"canvas-holder\"></div>\n<div class=\"controls\">\n<div class=\"control\"><label for=\"count\">Bird Count:</label><input id=\"count\" type=\"range\" min=\"40\" max=\"1000\" step=\"20\" value=\"180\"><span class=\"number\" id=\"count-value\">180</span><button class=\"osc\" data-control=\"count\">Oscillator OFF</button></div>\n<div class=\"control\"><label for=\"size\">Bird Size:</label><input id=\"size\" type=\"range\" min=\"2\" max=\"22\" step=\"1\" value=\"6\"><span class=\"number\" id=\"size-value\">6</span><button class=\"osc\" data-control=\"size\">Oscillator OFF</button></div>\n<div class=\"control\"><label for=\"cohesion\">Cohesion:</label><input id=\"cohesion\" type=\"range\" min=\"0\" max=\"100\" value=\"65\"><span class=\"number\" id=\"cohesion-value\">65</span><button class=\"osc\" data-control=\"cohesion\">Oscillator OFF</button></div>\n<div class=\"control\"><label for=\"tone\">Bird Tone:</label><input id=\"tone\" type=\"range\" min=\"0\" max=\"100\" value=\"18\"><span class=\"number\" id=\"tone-value\">18</span><button class=\"osc\" data-control=\"tone\">Oscillator OFF</button></div>\n<div class=\"control\"><label for=\"trail\">Trail Opacity:</label><input id=\"trail\" type=\"range\" min=\"0\" max=\"100\" value=\"0\"><span class=\"number\" id=\"trail-value\">0</span></div>\n<div class=\"buttons\"><button id=\"pause\">Pause</button><button id=\"clear\">Clear / Restart</button></div>\n</div>\n<div class=\"note\">Move the mouse through the flock to scatter it. Trail Opacity starts at 0. Trails fade gradually without slowing down the flock. Bird Tone shifts the whole flock between dark blue and dark brown.</div>\n</main>");
}
// --- End of gallery adapter ---
let flock=[], canvas, trailLayer, startedAt=0;
const settings={count:180,size:6,cohesion:65,tone:18,trail:0};
const osc={count:false,size:false,cohesion:false,tone:false};
const ranges={count:[40,1000],size:[2,22],cohesion:[0,100],tone:[0,100]};
const controls={};
const darkBlue={r:20,g:38,b:88};
const darkBrown={r:82,g:56,b:34};

function setup(){
 const holder=document.getElementById('canvas-holder');
 canvas=createCanvas(holder.clientWidth,holder.clientHeight);canvas.parent(holder);
 pixelDensity(1);frameRate(60);noFill();strokeCap(ROUND);strokeJoin(ROUND);
 trailLayer=createGraphics(width,height);trailLayer.pixelDensity(1);trailLayer.background(255);
 for(const key of Object.keys(settings)){
  controls[key]=document.getElementById(key);
  controls[key].addEventListener('input',()=>{settings[key]=Number(controls[key].value);showVal(key);syncBirds()});
 }
 document.querySelectorAll('[data-control]').forEach(button=>{
  button.addEventListener('click',()=>{const key=button.dataset.control;osc[key]=!osc[key];button.textContent='Oscillator '+(osc[key]?'ON':'OFF')});
 });
 document.getElementById('pause').addEventListener('click',()=>{if(isLooping()){noLoop();document.getElementById('pause').textContent='Resume';}else{loop();document.getElementById('pause').textContent='Pause';}});
 document.getElementById('clear').addEventListener('click',()=>restart());
 restart();
}

function restart(){
 flock=[];
 let cx=width*.49,cy=height*.49;
 for(let i=0;i<settings.count;i++)flock.push(new Bird(cx+randomGaussian()*width*.095,cy+randomGaussian()*height*.12));
 background(255);
 trailLayer.background(255);
 startedAt=millis();
}

function syncBirds(){
 while(flock.length<settings.count){
  let seed=random(flock);
  flock.push(new Bird(seed?seed.pos.x+random(-22,22):width/2,seed?seed.pos.y+random(-22,22):height/2));
 }
 if(flock.length>settings.count)flock.length=settings.count;
}

function showVal(key){document.getElementById(key+'-value').textContent=String(Math.round(settings[key]))}

function updateOscillators(){
 let t=(millis()-startedAt)/1000;
 for(const key of Object.keys(osc)){
  if(!osc[key])continue;
  let [lo,hi]=ranges[key];
  let speed= key==='count' ? .18 : key==='size' ? .36 : key==='tone' ? .28 : .44;
  let next=lo+(hi-lo)*(.5+.5*Math.sin(t*speed));
  settings[key]=key==='count'?Math.round(next/10)*10:Math.round(next);
  controls[key].value=settings[key];
  showVal(key);
 }
 syncBirds();
}

function flockColor(alpha=255){
 const amt=constrain(settings.tone/100,0,1);
 const r=lerp(darkBlue.r,darkBrown.r,amt);
 const g=lerp(darkBlue.g,darkBrown.g,amt);
 const b=lerp(darkBlue.b,darkBrown.b,amt);
 return [r,g,b,alpha];
}

function draw(){
 background(255);
 updateOscillators();
 const positions=flock.map(b=>({x:b.pos.x,y:b.pos.y,vx:b.vel.x,vy:b.vel.y}));
 const cellSize=80, buckets=new Map();
 for(let i=0;i<positions.length;i++){
  const p=positions[i],cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize),key=cx+','+cy;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(i);
 }
 for(let i=0;i<flock.length;i++)flock[i].step(i,positions,buckets,cellSize);
 // Persistent offscreen canvas: only ONE short line per bird per frame.
 // Fading the layer avoids redrawing thousands of historical line segments.
 if(settings.trail>0){
  const ctx=trailLayer.drawingContext;
  const fade=lerp(.26,.018,settings.trail/100);
  ctx.fillStyle=`rgba(255,255,255,${fade})`;
  ctx.fillRect(0,0,width,height);
  const c=flockColor();
  ctx.strokeStyle=`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${lerp(.24,.52,settings.trail/100)})`;
  ctx.lineWidth=Math.max(.55,settings.size*.12);
  ctx.lineCap='round';
  ctx.beginPath();
  for(const bird of flock){
   ctx.moveTo(bird.prev.x,bird.prev.y);
   ctx.lineTo(bird.pos.x,bird.pos.y);
  }
  ctx.stroke();
  image(trailLayer,0,0);
 }else{
  // Switching trails off immediately returns to a clean white canvas.
  trailLayer.background(255);
 }
 for(const bird of flock)bird.render();
}

class Bird{
 constructor(x,y){
  this.pos=createVector(x,y);
  this.vel=p5.Vector.random2D().mult(random(1.4,2.2));
  this.scale=random(.72,1.2);
  this.ink=random(.55,.98);
  this.phase=random(TWO_PI);
  this.prev={x:x,y:y};
 }
 step(index,all,buckets,cellSize){
  let sepX=0,sepY=0,aliX=0,aliY=0,cohX=0,cohY=0,ns=0,n=0;
  let sight=76, collision=19;
  const cellX=Math.floor(this.pos.x/cellSize),cellY=Math.floor(this.pos.y/cellSize);
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){
   const neighbors=buckets.get((cellX+ox)+','+(cellY+oy));
   if(!neighbors)continue;
   for(const j of neighbors){
    if(index===j)continue;
    const o=all[j];
    let dx=o.x-this.pos.x,dy=o.y-this.pos.y,d2=dx*dx+dy*dy;
    if(d2<sight*sight&&d2>0.001){
      n++; aliX+=o.vx; aliY+=o.vy; cohX+=o.x; cohY+=o.y;
      if(d2<collision*collision){sepX-=dx/(d2+6);sepY-=dy/(d2+6);ns++;}
    }
   }
  }
  let force=createVector(0,0);
  if(n){
   let align=createVector(aliX/n,aliY/n); align.setMag(2.25); align.sub(this.vel); align.limit(.065); force.add(align.mult(1.25));
   let center=createVector(cohX/n-this.pos.x,cohY/n-this.pos.y); center.setMag(2.25); center.sub(this.vel); center.limit(.065); force.add(center.mult(settings.cohesion/60));
  }
  if(ns){
   let separate=createVector(sepX,sepY); separate.setMag(2.3); separate.sub(this.vel); separate.limit(.14); force.add(separate.mult(2.6));
  }
  const margin=width*.13,vert=height*.16;
  if(this.pos.x<margin)force.x+=.085;
  if(this.pos.x>width-margin)force.x-=.085;
  if(this.pos.y<vert)force.y+=.085;
  if(this.pos.y>height-vert)force.y-=.085;
  if(this.pos.x<0||this.pos.x>width||this.pos.y<0||this.pos.y>height){
   let home=createVector(width/2-this.pos.x,height/2-this.pos.y);home.setMag(.22);force.add(home);
  }
  let a=noise(this.phase,frameCount*.007)*TWO_PI*2;
  force.add(cos(a)*.018,sin(a)*.018);
  if(mouseX>=0&&mouseX<width&&mouseY>=0&&mouseY<height){
   let dx=this.pos.x-mouseX,dy=this.pos.y-mouseY,d2=dx*dx+dy*dy,r=110;
   if(d2<r*r&&d2>1){let rep=createVector(dx,dy);rep.setMag(.38*(1-Math.sqrt(d2)/r));force.add(rep);}
  }
  this.vel.add(force);
  this.vel.limit(2.8);
  if(this.vel.mag()<1.4)this.vel.setMag(1.4);
  this.prev.x=this.pos.x; this.prev.y=this.pos.y;
  this.pos.add(this.vel);
 }
 render(){
  let a=this.vel.heading()+HALF_PI;
  const c=flockColor(220*this.ink+20);
  push();
  translate(this.pos.x,this.pos.y);
  rotate(a);
  stroke(c[0],c[1],c[2],c[3]);
  // Larger birds also have thicker strokes, without making small birds disappear.
  strokeWeight(Math.max(.75,settings.size*.21));
  noFill();
  beginShape();
  let r=settings.size*this.scale;
  vertex(-r,-r*.48);
  vertex(0,r*.58);
  vertex(r,-r*.48);
  endShape();
  pop();
 }
}

function windowResized(){const h=document.getElementById('canvas-holder');resizeCanvas(h.clientWidth,h.clientHeight);trailLayer.remove();trailLayer=createGraphics(width,height);trailLayer.pixelDensity(1);trailLayer.background(255);restart()}