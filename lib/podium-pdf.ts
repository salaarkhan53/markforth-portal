// Draws the top-3 podium onto a 300 dpi A4-landscape canvas and saves it as a PDF.
// No libraries: the canvas is embedded as one JPEG inside a minimal PDF file.

export type PodiumAgent = {name:string;sales:number;cpa:number;cpl:number;photoUrl?:string};

const W = 3508, H = 2480;            // A4 landscape at 300 dpi
const PAGE_W = 841.89, PAGE_H = 595.28; // A4 landscape in PDF points
const DISPLAY = "'Cabinet Grotesk','General Sans',system-ui,sans-serif";
const BODY = "'General Sans',system-ui,sans-serif";
const TROPHY = ['M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978','M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978','M18 9h1.5a1 1 0 0 0 0-5H18','M4 22h16','M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z','M6 9H4.5a1 1 0 0 1 0-5H6'];
const PLACES = [
  {ord:'st', title:'THE STANDARD SETTER', ring:'#f0c35a', top:'#ff4b2b'},
  {ord:'nd', title:'RAISING THE BAR',     ring:'rgba(255,255,255,.28)', top:'#c9d1dc'},
  {ord:'rd', title:'MAKING AN IMPACT',    ring:'#d39a72', top:'#d39a72'},
];

function loadImage(src:string):Promise<HTMLImageElement|null>{
  return new Promise(res=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>res(null);img.src=src;});
}

function initials(name:string){return name.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();}

function fitText(ctx:CanvasRenderingContext2D,text:string,max:number){
  if(ctx.measureText(text).width<=max) return text;
  let t=text;while(t.length>1&&ctx.measureText(t+'…').width>max) t=t.slice(0,-1);
  return t+'…';
}

function trophy(ctx:CanvasRenderingContext2D,cx:number,cy:number,size:number,color:string){
  ctx.save();ctx.translate(cx-size/2,cy-size/2);ctx.scale(size/24,size/24);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  for(const d of TROPHY) ctx.stroke(new Path2D(d));
  ctx.restore();
}

function roundTop(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h);ctx.closePath();
}

async function drawPodium(agents:PodiumAgent[],subtitle:string){
  await Promise.all([`800 100px ${DISPLAY}`,`700 100px ${DISPLAY}`,`400 40px ${BODY}`,`600 40px ${BODY}`].map(f=>document.fonts.load(f).catch(()=>null)));
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d')!;
  ctx.textBaseline='alphabetic';

  // Background, red glow and faint grid
  ctx.fillStyle='#07080b';ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W/2,-200,0,W/2,-200,1700);
  glow.addColorStop(0,'rgba(223,47,24,.55)');glow.addColorStop(1,'rgba(223,47,24,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=3;
  for(let x=0;x<=W;x+=180){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<=H;y+=180){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();

  // Heading
  ctx.textAlign='center';
  ctx.fillStyle='#ff8a73';ctx.font=`600 46px ${BODY}`;ctx.letterSpacing='10px';
  ctx.fillText('THE MARKFORTH PODIUM',W/2,250);
  ctx.letterSpacing='0px';
  ctx.fillStyle='#fff';ctx.font=`800 130px ${DISPLAY}`;
  ctx.fillText('Excellence takes the stage.',W/2,410);
  ctx.fillStyle='rgba(245,246,248,.7)';ctx.font=`400 54px ${BODY}`;
  ctx.fillText(subtitle,W/2,500);

  // Podium columns in the same order as the site: 3rd, 1st, 2nd
  const colW=820,gap=40,baseY=2110;
  const left=(W-(colW*3+gap*2))/2;
  const plinthH=[640,500,410];
  const avatar=[330,260,260];
  const photos=await Promise.all(agents.slice(0,3).map(a=>a.photoUrl?loadImage(a.photoUrl):Promise.resolve(null)));
  [2,0,1].forEach((i,col)=>{
    const p=PLACES[i],a=agents[i],x=left+col*(colW+gap),cx=x+colW/2;
    const top=baseY-plinthH[i];

    // Plinth
    roundTop(ctx,x,top,colW,plinthH[i],40);
    const fill=ctx.createLinearGradient(0,top,0,baseY);
    if(i===0){fill.addColorStop(0,'rgba(223,47,24,.62)');fill.addColorStop(1,'rgba(223,47,24,.12)');}
    else{fill.addColorStop(0,'rgba(255,255,255,.11)');fill.addColorStop(1,'rgba(255,255,255,.03)');}
    ctx.fillStyle=fill;ctx.fill();
    ctx.save();ctx.clip();ctx.fillStyle=p.top;ctx.fillRect(x,top,colW,10);ctx.restore();

    // Rank number with ordinal
    const num=String(i+1),numSize=i===0?250:190;
    ctx.font=`800 ${numSize}px ${DISPLAY}`;const nw=ctx.measureText(num).width;
    ctx.font=`700 ${Math.round(numSize*.26)}px ${DISPLAY}`;const ow=ctx.measureText(p.ord).width;
    const nx=cx-(nw+ow+8)/2,ny=top+numSize*.95;
    ctx.textAlign='left';ctx.fillStyle='#fff';
    ctx.font=`800 ${numSize}px ${DISPLAY}`;ctx.fillText(num,nx,ny);
    ctx.font=`700 ${Math.round(numSize*.26)}px ${DISPLAY}`;ctx.fillText(p.ord,nx+nw+8,ny-numSize*.5);
    ctx.textAlign='center';
    ctx.fillStyle='rgba(245,246,248,.82)';ctx.font=`600 42px ${BODY}`;ctx.letterSpacing='6px';
    ctx.fillText(a?p.title:'THE NEXT TOP PERFORMER',cx,ny+100);ctx.letterSpacing='0px';
    if(a){ctx.fillStyle='rgba(245,246,248,.68)';ctx.font=`400 46px ${BODY}`;ctx.fillText(`${a.cpa} CPA · ${a.cpl} CPL`,cx,ny+180);}

    // Name and sales above the plinth
    const salesY=top-60,nameY=salesY-90;
    if(a){
      ctx.font=`400 50px ${BODY}`;const label='confirmed sales';const lw=ctx.measureText(label).width;
      ctx.font=`700 70px ${DISPLAY}`;const sw=ctx.measureText(String(a.sales)).width;
      const sx=cx-(sw+18+lw)/2;ctx.textAlign='left';
      ctx.fillStyle='#fff';ctx.fillText(String(a.sales),sx,salesY);
      ctx.fillStyle='rgba(245,246,248,.7)';ctx.font=`400 50px ${BODY}`;ctx.fillText(label,sx+sw+18,salesY);
      ctx.textAlign='center';
      ctx.fillStyle='#fff';ctx.font=`700 68px ${DISPLAY}`;ctx.fillText(fitText(ctx,a.name,colW-40),cx,nameY);
    }else{
      ctx.fillStyle='rgba(245,246,248,.7)';ctx.font=`400 50px ${BODY}`;ctx.fillText('Record your next result',cx,salesY);
      ctx.fillStyle='#fff';ctx.font=`700 68px ${DISPLAY}`;ctx.fillText('Your place awaits',cx,nameY);
    }

    // Avatar
    const r=avatar[i]/2,ay=nameY-80-r;
    if(i===0){ctx.save();ctx.shadowColor='rgba(240,195,90,.35)';ctx.shadowBlur=120;ctx.beginPath();ctx.arc(cx,ay,r,0,Math.PI*2);ctx.fillStyle='#151821';ctx.fill();ctx.restore();}
    ctx.beginPath();ctx.arc(cx,ay,r,0,Math.PI*2);ctx.fillStyle='#151821';ctx.fill();
    const img=a?photos[i]:null;
    if(img){
      ctx.save();ctx.beginPath();ctx.arc(cx,ay,r,0,Math.PI*2);ctx.clip();
      const s=Math.max(r*2/img.width,r*2/img.height);ctx.drawImage(img,cx-img.width*s/2,ay-img.height*s/2,img.width*s,img.height*s);
      ctx.restore();
    }else if(a){
      ctx.fillStyle='#fff';ctx.font=`700 ${Math.round(r*.62)}px ${DISPLAY}`;ctx.textBaseline='middle';ctx.fillText(initials(a.name),cx,ay+4);ctx.textBaseline='alphabetic';
    }else trophy(ctx,cx,ay,r*.8,'rgba(255,255,255,.5)');
    ctx.beginPath();ctx.arc(cx,ay,r,0,Math.PI*2);ctx.lineWidth=12;ctx.strokeStyle=p.ring;ctx.stroke();

    // Trophy above
    trophy(ctx,cx,ay-r-110,i===0?140:110,i===0?'#f0c35a':i===2?'#d39a72':'#c9d1dc');
  });

  // Footer: white logo, tagline
  ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(0,baseY,W,3);
  const logo=await loadImage('/brand/markforth-logo.png');
  if(logo){
    const lw=560,lh=logo.height*lw/logo.width;
    const off=document.createElement('canvas');off.width=Math.ceil(lw);off.height=Math.ceil(lh);
    const o=off.getContext('2d')!;o.drawImage(logo,0,0,lw,lh);o.globalCompositeOperation='source-in';o.fillStyle='#fff';o.fillRect(0,0,lw,lh);
    ctx.drawImage(off,180,baseY+(H-baseY-lh)/2);
  }
  ctx.textAlign='right';ctx.fillStyle='rgba(245,246,248,.68)';ctx.font=`600 44px ${BODY}`;ctx.letterSpacing='9px';
  ctx.fillText('BUILT TO MOVE BUSINESS FORWARD.',W-180,baseY+(H-baseY)/2+16);ctx.letterSpacing='0px';
  return canvas;
}

function jpegToPdf(jpeg:Uint8Array,imgW:number,imgH:number,title:string):Blob{
  const enc=new TextEncoder();
  const parts:(Uint8Array)[]=[];const offsets:number[]=[];let len=0;
  const push=(b:Uint8Array)=>{parts.push(b);len+=b.length;};
  const str=(s:string)=>push(enc.encode(s));
  const safeTitle=title.replace(/[\\()]/g,'\\$&').replace(/[^\x20-\x7e]/g,'');
  const content=`q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`;
  str('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  const obj=(n:number,body:()=>void)=>{offsets[n]=len;str(`${n} 0 obj\n`);body();str('\nendobj\n');};
  obj(1,()=>str('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2,()=>str('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3,()=>str(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4,()=>{str(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);str('\nendstream');});
  obj(5,()=>str(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  obj(6,()=>str(`<< /Title (${safeTitle}) /Producer (Markforth Agent Portal) >>`));
  const xref=len;
  str(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}`);
  str(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[],{type:'application/pdf'});
}

export async function downloadPodiumPdf(agents:PodiumAgent[],subtitle:string,fileName:string){
  const canvas=await drawPodium(agents,subtitle);
  const blob:Blob=await new Promise((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('Could not render the podium.')),'image/jpeg',0.95));
  const pdf=jpegToPdf(new Uint8Array(await blob.arrayBuffer()),W,H,'Markforth Podium');
  const url=URL.createObjectURL(pdf);const link=document.createElement('a');
  link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
