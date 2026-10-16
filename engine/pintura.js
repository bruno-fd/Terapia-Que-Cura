/* ---------- pintura a óleo: cena + pinceladas (sem imagens externas) ---------- */
const PALETAS={
 "turquesa e ocre":{ceu:["#2F7F92","#79BDBE"],astro:"#F2C14E",chao:"#2F5D62",vestido:"#1E2633",xale:"#3B7C84",flores:["#D9824B","#E9C46A","#B5523B"],parede:"#3E6F73"},
 "rosa antigo":{ceu:["#B9787E","#E9C6B4"],astro:"#F7E6B8",chao:"#7A5C61",vestido:"#4E2F3D",xale:"#9E5560",flores:["#F1D3B3","#D98E73","#6F8F72"],parede:"#9C6A6E"},
 "azul da noite":{ceu:["#17213B","#3D5A80"],astro:"#F1E4B3",chao:"#16233A",vestido:"#22324A",xale:"#6F86A6",flores:["#E8D6A0","#9FB4C7","#C98E6B"],parede:"#24324D"},
 "verde musgo":{ceu:["#6E8C5E","#CFCB9A"],astro:"#F6D98E",chao:"#4E6340",vestido:"#34402A",xale:"#A6874A",flores:["#E6B655","#C5603F","#F2E2B6"],parede:"#55694A"},
 "terracota":{ceu:["#B9583B","#EDB27C"],astro:"#FCE4A2",chao:"#7B3F2C",vestido:"#40231F",xale:"#8B4A37",flores:["#F3C677","#7C8F5E","#E58E5A"],parede:"#8A4A35"},
 "lavanda":{ceu:["#7E78AE","#D3BEDD"],astro:"#F8E9C4",chao:"#5B5180",vestido:"#352D4E",xale:"#946A9B",flores:["#F2D5A9","#C78FB4","#8FB3A0"],parede:"#6D6496"}};
const CENAS=["perfil olhando o céu","de costas para o mar","à janela","caminhando no campo","recolhimento"];
const PELES=["#EDC3A5","#E2B08E","#CF9874","#B57D58","#94603F","#764A31"],CABELOS=["#2A1912","#4A2A1C","#6E3D22","#8C5A33","#B07A44","#1C1412"];
const _PCACHE=new Map();
function hx(h){h=h.replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function rgbS(c,a){return `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a==null?1:a})`}
function mix(a,b,t){const A=typeof a==="string"?hx(a):a,B=typeof b==="string"?hx(b):b;return [A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t]}
function tom(h,k){const c=typeof h==="string"?hx(h):h;return k>0?mix(c,[255,248,235],k):mix(c,[10,8,12],-k)}
/* curva suave por pontos (Catmull-Rom) */
function curva(c,pts,fechar){const n=pts.length;c.moveTo(pts[0][0],pts[0][1]);const P=i=>pts[fechar?(i+n)%n:Math.max(0,Math.min(n-1,i))];
 for(let i=0;i<(fechar?n:n-1);i++){const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2);c.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1])}if(fechar)c.closePath()}
function forma(c,pts,fill,fechar=true){c.beginPath();curva(c,pts,fechar);c.fillStyle=fill;c.fill()}
function bolha(c,x,y,r,cor,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgbS(cor,a));g.addColorStop(1,rgbS(cor,0));c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}

function fundoCeu(c,P,R,W,H,yh){const g=c.createLinearGradient(0,0,0,yh||H);g.addColorStop(0,P.ceu[0]);g.addColorStop(1,P.ceu[1]);c.fillStyle=g;c.fillRect(0,0,W,yh||H);
 for(let i=0;i<14;i++)bolha(c,R()*W,R()*(yh||H),120+R()*260,tom(mix(P.ceu[0],P.ceu[1],R()),(R()-.5)*.5),.35)}
function astro(c,P,x,y,r,R){bolha(c,x,y,r*2.6,hx(P.astro),.28);c.fillStyle=P.astro;c.beginPath();c.arc(x,y,r,0,7);c.fill();
 for(let i=0;i<40;i++){const a=R()*7,d=R()*r*.85;bolha(c,x+Math.cos(a)*d,y+Math.sin(a)*d,r*.35,tom(P.astro,(R()-.4)*.35),.5)}}
function mar(c,P,W,H,yh,sx,R){const g=c.createLinearGradient(0,yh,0,H);g.addColorStop(0,rgbS(tom(P.ceu[1],-.15)));g.addColorStop(1,rgbS(tom(P.chao,-.25)));c.fillStyle=g;c.fillRect(0,yh,W,H-yh);
 for(let i=0;i<70;i++){const y=yh+Math.pow(R(),1.6)*(H-yh),w=40+R()*220;c.fillStyle=rgbS(tom(P.ceu[1],(R()-.3)*.5),.35);c.fillRect(R()*W-w/2,y,w,3+R()*6)}
 for(let i=0;i<40;i++){const y=yh+R()*(H-yh)*.8,w=20+R()*90;c.fillStyle=rgbS(hx(P.astro),.25+R()*.3);c.fillRect(sx-w/2+(R()-.5)*120,y,w,3+R()*5)}}
function campo(c,P,W,H,yh,R){const g=c.createLinearGradient(0,yh,0,H);g.addColorStop(0,rgbS(tom(P.chao,.25)));g.addColorStop(1,rgbS(tom(P.chao,-.2)));c.fillStyle=g;c.fillRect(0,yh,W,H-yh);
 for(let i=0;i<900;i++){const t=Math.pow(R(),.8),y=yh+t*(H-yh),s=2+t*16;c.fillStyle=rgbS(tom(P.flores[i%P.flores.length],(R()-.5)*.3),.8);c.beginPath();c.arc(R()*W,y,s*(.5+R()*.6),0,7);c.fill()}
 for(let i=0;i<500;i++){const t=R(),y=yh+t*(H-yh);c.strokeStyle=rgbS(tom(P.chao,(R()-.2)*.5),.6);c.lineWidth=1+t*4;const x=R()*W;c.beginPath();c.moveTo(x,y);c.lineTo(x+(R()-.5)*20,y-10-t*50);c.stroke()}}

/* figura feminina de perfil, voltada para a direita; (x,y) = centro da cabeça; s = escala; ang = inclinação */
function cabecaPerfil(c,F,x,y,s,ang,olhosFechados){c.save();c.translate(x,y);c.rotate(ang);c.scale(s,s);
 const pele=F.pele,cab=F.cabelo;
 const rosto=[[0,-125],[55,-108],[78,-62],[80,-40],[76,-27],[92,-4],[103,14],[100,22],[86,30],[86,40],[94,50],[85,57],[91,65],[80,79],[85,99],[70,117],[30,124],[22,150],[20,250],[-42,250],[-52,140],[-96,88],[-118,0],[-100,-92],[-50,-125]];
 const gp=c.createLinearGradient(100,0,-80,0);gp.addColorStop(0,rgbS(tom(pele,.18)));gp.addColorStop(.55,pele);gp.addColorStop(1,rgbS(tom(pele,-.28)));forma(c,rosto,gp);
 bolha(c,40,40,46,[230,120,110],.22);bolha(c,30,170,70,tom(pele,-.45),.35);
 c.save();c.beginPath();curva(c,rosto.slice(1,18),false);c.strokeStyle=rgbS(tom(pele,-.35),.55);c.lineWidth=2.4;c.lineJoin="round";c.stroke();c.restore();
 c.fillStyle=F.labio;c.beginPath();c.moveTo(86,46);c.quadraticCurveTo(96,50,93,53);c.quadraticCurveTo(88,58,84,57);c.quadraticCurveTo(92,62,89,67);c.quadraticCurveTo(84,68,80,62);c.closePath();c.fill();
 c.strokeStyle=rgbS(tom(cab,-.2),.9);c.lineWidth=4;c.lineCap="round";c.beginPath();c.moveTo(38,-50);c.quadraticCurveTo(58,-58,74,-46);c.stroke();
 c.lineWidth=3.2;c.strokeStyle="rgba(40,22,18,.9)";c.beginPath();if(olhosFechados){c.moveTo(40,-24);c.quadraticCurveTo(54,-16,66,-24)}else{c.moveTo(42,-26);c.quadraticCurveTo(56,-32,67,-24);c.moveTo(50,-22);c.lineTo(62,-22)}c.stroke();
 const gc=c.createLinearGradient(-130,-120,60,80);gc.addColorStop(0,rgbS(tom(cab,.12)));gc.addColorStop(1,rgbS(tom(cab,-.25)));
 forma(c,[[42,-112],[10,-140],[-70,-135],[-128,-60],[-128,40],[-92,110],[-52,128],[-34,70],[-12,10],[8,-30],[30,-62]],gc);
 c.fillStyle=gc;c.beginPath();c.arc(-122,-78,56,0,7);c.fill();
 c.strokeStyle=rgbS(tom(cab,.22),.3);c.lineWidth=3;for(let i=0;i<9;i++){c.beginPath();c.moveTo(30-i*14,-110+i*4);c.quadraticCurveTo(-40-i*6,-90+i*12,-90+i*3,-20+i*14);c.stroke()}
 c.strokeStyle=rgbS(tom(cab,.25),.32);c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.arc(-122,-78,14+i*9,i,i+3.6);c.stroke()}
 c.restore()}
function torsoPerfil(c,F,x,y,s,H,maos){/* x,y = base do pescoço */c.save();c.translate(x,y);c.scale(s,s);const hh=(H-y)/s+60;
 const gv=c.createLinearGradient(-230,0,220,0);gv.addColorStop(0,rgbS(tom(F.vestido,-.28)));gv.addColorStop(.65,F.vestido);gv.addColorStop(1,rgbS(tom(F.vestido,.14)));
 forma(c,[[-40,-8],[-120,36],[-188,110],[-206,250],[-214,hh*.6],[-230,hh],[260,hh],[250,hh*.75],[205,520],[150,420],[165,260],[150,150],[95,40],[40,-6]],gv);
 const gb=c.createLinearGradient(-210,300,120,640);gb.addColorStop(0,rgbS(tom(F.vestido,-.04)));gb.addColorStop(1,rgbS(tom(F.vestido,.1)));
 forma(c,[[-206,300],[-196,430],[-150,520],[-40,585],[90,612],[110,560],[0,520],[-110,450],[-140,320]],gb);
 const gx=c.createLinearGradient(-230,40,160,300);gx.addColorStop(0,rgbS(tom(F.xale,-.18)));gx.addColorStop(1,rgbS(tom(F.xale,.2)));
 forma(c,[[-45,-4],[-125,38],[-195,118],[-214,250],[-200,350],[-120,330],[-20,300],[90,260],[150,170],[100,50],[45,0]],gx);
 const R=rng(hash(F.vestido+F.xale));for(let i=0;i<190;i++){const px=-210+R()*360,py=10+R()*330;const dentro=c.isPointInPath?true:true;
  const lim=py<60?(px>-120+py*-.5&&px<90):(px>-205&&px<150-(py-170)*.3&&py<350-(px+210)*.12);if(!lim)continue;
  c.fillStyle=rgbS(tom(F.flores[i%F.flores.length],(R()-.5)*.3),.92);c.beginPath();c.arc(px,py,4+R()*8,0,7);c.fill()}
 c.strokeStyle=rgbS(tom(F.xale,-.35),.8);c.lineWidth=3;for(let i=0;i<26;i++){const t=i/25,px=-200+t*300,py=350-t*95;c.beginPath();c.moveTo(px,py);c.lineTo(px-4,py+22+R()*10);c.stroke()}
 forma(c,[[-30,-10],[0,26],[48,34],[78,6]],rgbS(tom(F.pele,-.12)));
 if(maos){const gm=c.createLinearGradient(40,560,180,640);gm.addColorStop(0,rgbS(tom(F.pele,-.22)));gm.addColorStop(1,rgbS(tom(F.pele,.12)));
  forma(c,[[60,575],[110,548],[170,552],[205,580],[190,615],[130,632],[75,618]],gm);c.strokeStyle=rgbS(tom(F.pele,-.35),.6);c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(120+i*22,560);c.quadraticCurveTo(135+i*22,590,128+i*22,620);c.stroke()}}
 c.restore()}
function figuraCostas(c,F,x,y,s,H,chapeu){/* x,y = centro da cabeça */c.save();c.translate(x,y);c.scale(s,s);const hh=(H-y)/s+60;
 const gv=c.createLinearGradient(-280,0,280,0);gv.addColorStop(0,rgbS(tom(F.vestido,-.32)));gv.addColorStop(.5,F.vestido);gv.addColorStop(1,rgbS(tom(F.vestido,-.18)));
 forma(c,[[-44,118],[-120,150],[-205,190],[-245,250],[-258,400],[-262,hh*.6],[-300,hh],[300,hh],[262,hh*.6],[258,400],[245,250],[205,190],[120,150],[44,118]],gv);
 const gx=c.createLinearGradient(-260,160,260,460);gx.addColorStop(0,rgbS(tom(F.xale,-.22)));gx.addColorStop(1,rgbS(tom(F.xale,.16)));
 forma(c,[[-56,122],[-130,152],[-212,196],[-250,262],[-246,340],[-150,390],[0,470],[150,390],[246,340],[250,262],[212,196],[130,152],[56,122]],gx);
 const R=rng(hash(F.xale+F.cabelo));for(let i=0;i<170;i++){const px=(R()-.5)*490,py=150+R()*300;const fundo=340+(245-Math.abs(px))*.5;if(py>Math.min(fundo,470-Math.abs(px)*.55)||Math.abs(px)>240)continue;c.fillStyle=rgbS(tom(F.flores[i%F.flores.length],(R()-.5)*.3),.92);c.beginPath();c.arc(px,py,4+R()*8,0,7);c.fill()}
 c.strokeStyle=rgbS(tom(F.xale,-.35),.8);c.lineWidth=3;for(let i=0;i<34;i++){const t=i/33,px=-246+t*492,py=Math.abs(px)<150?470-Math.abs(px)*.53:340+(246-Math.abs(px))*.5;c.beginPath();c.moveTo(px,py);c.lineTo(px+(R()-.5)*6,py+22+R()*12);c.stroke()}
 const gn=c.createLinearGradient(0,60,0,150);gn.addColorStop(0,rgbS(tom(F.pele,-.38)));gn.addColorStop(1,rgbS(tom(F.pele,-.05)));forma(c,[[-38,60],[-46,132],[46,132],[38,60]],gn);
 c.fillStyle=rgbS(tom(F.pele,-.15));c.beginPath();c.ellipse(-90,4,13,25,.12,0,7);c.ellipse(90,4,13,25,-.12,0,7);c.fill();
 const gc=c.createRadialGradient(-30,-60,10,0,0,140);gc.addColorStop(0,rgbS(tom(F.cabelo,.2)));gc.addColorStop(1,rgbS(tom(F.cabelo,-.24)));c.fillStyle=gc;c.beginPath();c.ellipse(0,-6,92,114,0,0,7);c.fill();
 forma(c,[[-66,56],[-36,92],[0,98],[36,92],[66,56]],gc);c.beginPath();c.arc(0,-92,58,0,7);c.fill();
 c.strokeStyle=rgbS(tom(F.cabelo,.32),.5);c.lineWidth=5;for(let i=0;i<8;i++){c.beginPath();c.moveTo(-78+i*22,-62);c.quadraticCurveTo(-58+i*17,26,-28+i*8,86);c.stroke()}
 c.strokeStyle=rgbS(tom(F.cabelo,.35),.5);c.lineWidth=4;for(let i=0;i<5;i++){c.beginPath();c.arc(0,-92,12+i*9,i,i+3.8);c.stroke()}
 if(chapeu){c.fillStyle=rgbS(tom(F.xale,.15));c.beginPath();c.ellipse(0,-64,185,44,0,0,7);c.fill();c.fillStyle=rgbS(tom(F.xale,-.05));c.beginPath();c.ellipse(0,-92,98,62,0,Math.PI,0);c.fill();c.fillStyle=rgbS(hx(F.flores[0]));c.fillRect(-98,-80,196,15)}
 c.restore()}
function cenaBase(cena,P,seed,W,H){const cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d"),R=rng(seed);
 const F={pele:PELES[Math.floor(R()*PELES.length)],cabelo:CABELOS[Math.floor(R()*CABELOS.length)],vestido:P.vestido,xale:P.xale,flores:P.flores};
 const lum=h=>{const c=hx(h);return .3*c[0]+.59*c[1]+.11*c[2]};if(Math.abs(lum(F.pele)-lum(F.cabelo))<55||lum(F.cabelo)>lum(F.pele))F.cabelo=lum(F.pele)>130?CABELOS[Math.floor(R()*3)]:"#120C0A";F.labio=rgbS(mix(tom(F.pele,-.25),[170,60,60],.35));
 const dx=(R()-.5)*90,ladoSol=R()<.5?-1:1;
 if(cena==="de costas para o mar"||cena==="caminhando no campo")F.cabelo=[CABELOS[0],CABELOS[1],CABELOS[2],CABELOS[5]][Math.floor(R()*4)];
 if(cena==="de costas para o mar"){const yh=700+R()*80;fundoCeu(c,P,R,W,H,yh);astro(c,P,540+ladoSol*(170+R()*120),yh-220-R()*200,60+R()*40,R);mar(c,P,W,H,yh,540+ladoSol*200,R);figuraCostas(c,F,540+dx,yh-60+R()*40,1.05,H,false)}
 else if(cena==="caminhando no campo"){const yh=560+R()*120;fundoCeu(c,P,R,W,H,yh);astro(c,P,540+ladoSol*(200+R()*120),180+R()*180,55+R()*35,R);campo(c,P,W,H,yh,R);figuraCostas(c,F,560+dx,yh+300,.78,H,false)}
 else if(cena==="à janela"){c.fillStyle=P.parede;c.fillRect(0,0,W,H);for(let i=0;i<10;i++)bolha(c,R()*W,R()*H,200+R()*200,tom(P.parede,(R()-.5)*.4),.4);
  const wx=600,wy=170,ww=400,wh=720;c.save();c.beginPath();c.rect(wx,wy,ww,wh);c.clip();fundoCeu(c,P,R,W,H,wy+wh);astro(c,P,wx+ww*.6,wy+wh*.35,55,R);c.restore();
  c.strokeStyle=rgbS(tom(P.parede,.35));c.lineWidth=26;c.strokeRect(wx,wy,ww,wh);c.lineWidth=14;c.beginPath();c.moveTo(wx+ww/2,wy);c.lineTo(wx+ww/2,wy+wh);c.moveTo(wx,wy+wh*.45);c.lineTo(wx+ww,wy+wh*.45);c.stroke();
  const gcort=c.createLinearGradient(980,0,1080,0);gcort.addColorStop(0,rgbS(tom(P.xale,-.1)));gcort.addColorStop(1,rgbS(tom(P.xale,-.35)));c.fillStyle=gcort;c.fillRect(960,0,120,H);
  c.fillStyle=rgbS(tom(P.parede,-.3));c.fillRect(0,wy+wh,W,H);bolha(c,wx+ww/2,wy+wh*.5,520,hx(P.astro),.18);
  torsoPerfil(c,F,330+dx,660,1,H,false);cabecaPerfil(c,F,320+dx,520,1,-.05,false);cv.detalhe=[320+dx-150,520-160,290,330]}
 else{const recolh=cena==="recolhimento";fundoCeu(c,P,R,W,H,H);if(!recolh)astro(c,P,ladoSol>0?820+R()*80:200+R()*60,170+R()*130,70+R()*40,R);else bolha(c,700,300,500,hx(P.astro),.25);
  const hx0=430+dx,hy0=330+R()*40;torsoPerfil(c,F,hx0+10,hy0+250,1.05,H,false);cabecaPerfil(c,F,hx0,hy0,1.2,recolh?.2:-.24,recolh);cv.detalhe=[hx0-170,hy0-190,340,390];
}
 return cv}

/* pinceladas: transforma qualquer imagem (cena ou foto) em pintura a óleo */
function pinceladas(base,seed,W,H){const out=document.createElement("canvas");out.width=W;out.height=H;const c=out.getContext("2d"),R=rng(seed^0x9e37);
 const amostra=d=>{const w=Math.max(2,Math.round(W/d)),h=Math.max(2,Math.round(H/d)),cv=document.createElement("canvas");cv.width=w;cv.height=h;const x=cv.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(base,0,0,w,h);return {w,h,cv,d:x.getImageData(0,0,w,h).data}};
 const fundo=amostra(24);c.imageSmoothingQuality="high";c.drawImage(fundo.cv,0,0,W,H);
 const G=amostra(5),gw=G.w,gh=G.h,lum=new Float32Array(gw*gh);for(let i=0;i<gw*gh;i++)lum[i]=.3*G.d[i*4]+.59*G.d[i*4+1]+.11*G.d[i*4+2];
 const gx=new Float32Array(gw*gh),gy=new Float32Array(gw*gh);for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){const i=y*gw+x,L=k=>lum[k];
  gx[i]=(L(i-gw+1)+2*L(i+1)+L(i+gw+1))-(L(i-gw-1)+2*L(i-1)+L(i+gw-1));gy[i]=(L(i+gw-1)+2*L(i+gw)+L(i+gw+1))-(L(i-gw-1)+2*L(i-gw)+L(i-gw+1))}
 const ph=R()*6.28,base0=R()*6.28,campoAng=(x,y)=>base0+Math.sin(x*.003+ph)*.55+Math.cos(y*.0028+ph*1.7)*.45+Math.sin((x-y)*.006)*.25;
 const camadas=[{d:30,len:[1,2],min:0},{d:17,len:[1.1,2.2],min:0},{d:10,len:[1.2,2.6],min:10},{d:6,len:[1.2,2.6],min:28},{d:3.5,len:[1.1,2.2],min:60}];
 c.lineCap="round";
 for(const L of camadas){const S=amostra(L.d),pts=[];for(let y=0;y<H;y+=L.d*.8)for(let x=0;x<W;x+=L.d*.8)pts.push([x+(R()-.5)*L.d,y+(R()-.5)*L.d]);
  for(let i=pts.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]]}
  const atual=L.d<30?c.getImageData(0,0,W,H).data:null,REF=G.d;
  for(const [x,y] of pts){if(x<0||y<0||x>=W||y>=H)continue;const gi=Math.min(gh-2,Math.max(1,Math.floor(y/5)))*gw+Math.min(gw-2,Math.max(1,Math.floor(x/5)));const mag=Math.hypot(gx[gi],gy[gi]);if(mag<L.min)continue;
   const si=(Math.min(S.h-1,Math.floor(y/L.d))*S.w+Math.min(S.w-1,Math.floor(x/L.d)))*4;let col=[S.d[si],S.d[si+1],S.d[si+2]];
   if(atual){const ai=((y|0)*W+(x|0))*4,ri=gi*4;const err=Math.abs(atual[ai]-REF[ri])+Math.abs(atual[ai+1]-REF[ri+1])+Math.abs(atual[ai+2]-REF[ri+2]);if(err<(L.d>=17?36:L.d>=10?42:48)&&R()>.25)continue;if(L.d<10)col=[REF[ri],REF[ri+1],REF[ri+2]]}
   const ang=mag>18?Math.atan2(gy[gi],gx[gi])+Math.PI/2:campoAng(x,y);const a2=ang+(R()-.5)*.5,len=L.d*(L.len[0]+R()*(L.len[1]-L.len[0])),wd=L.d*(.55+R()*.45);
   const j=(R()-.5)*16;col=[col[0]+j+(R()-.5)*14,col[1]+j+(R()-.5)*12,col[2]+j+(R()-.5)*14];
   const x1=x+Math.cos(a2)*len,y1=y+Math.sin(a2)*len,cx=(x+x1)/2+Math.cos(a2+1.57)*len*(R()-.5)*.35,cy=(y+y1)/2+Math.sin(a2+1.57)*len*(R()-.5)*.35;
   c.strokeStyle=rgbS(col,L.d>=17?.82:.9);c.lineWidth=wd;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(cx,cy,x1,y1);c.stroke();
   if(L.d>=9){const o=wd*.22;c.lineWidth=wd*.22;c.strokeStyle=rgbS(tom(col,.12),.35);c.beginPath();c.moveTo(x+o,y-o);c.quadraticCurveTo(cx+o,cy-o,x1+o,y1-o);c.stroke();c.strokeStyle=rgbS(tom(col,-.12),.3);c.beginPath();c.moveTo(x-o,y+o);c.quadraticCurveTo(cx-o,cy+o,x1-o,y1+o);c.stroke()}}}
 if(base.detalhe){const [rx,ry,rw,rh]=base.detalhe.map(Math.round),bx=Math.max(0,rx),by=Math.max(0,ry),bw=Math.min(W-bx,rw),bh=Math.min(H-by,rh);
  if(bw>4&&bh>4){const ref=base.getContext("2d").getImageData(bx,by,bw,bh).data,cur=c.getImageData(bx,by,bw,bh).data;
   for(let k=0;k<1;k++){const dd=3;for(let y=0;y<bh;y+=dd*.8)for(let x=0;x<bw;x+=dd*.8){const xx=Math.max(0,Math.min(bw-1,(x+(R()-.5)*dd)|0)),yy=Math.max(0,Math.min(bh-1,(y+(R()-.5)*dd)|0)),i=(yy*bw+xx)*4;
     const err=Math.abs(cur[i]-ref[i])+Math.abs(cur[i+1]-ref[i+1])+Math.abs(cur[i+2]-ref[i+2]);if(err<44)continue;const col=[ref[i]+(R()-.5)*8,ref[i+1]+(R()-.5)*8,ref[i+2]+(R()-.5)*8];
     const gi=Math.min(gh-2,Math.max(1,Math.floor((by+yy)/5)))*gw+Math.min(gw-2,Math.max(1,Math.floor((bx+xx)/5)));const ang=Math.atan2(gy[gi],gx[gi])+Math.PI/2+(R()-.5)*.4,len=dd*(1+R());
     c.strokeStyle=rgbS(col,.9);c.lineWidth=dd*.9;c.beginPath();c.moveTo(bx+xx,by+yy);c.lineTo(bx+xx+Math.cos(ang)*len,by+yy+Math.sin(ang)*len);c.stroke()}}}}
 /* empaste: relevo de luz pela luminância */
 const im=c.getImageData(0,0,W,H),p=im.data,l2=new Float32Array(W*H);for(let i=0;i<W*H;i++)l2[i]=.3*p[i*4]+.59*p[i*4+1]+.11*p[i*4+2];
 for(let y=2;y<H;y++)for(let x=2;x<W;x++){const i=y*W+x,e=Math.max(-9,Math.min(9,l2[i]-l2[i-2*W-2]))*.55;p[i*4]+=e;p[i*4+1]+=e;p[i*4+2]+=e}
 c.putImageData(im,0,0);
 /* tela, verniz e vinheta */
 const t=document.createElement("canvas");t.width=6;t.height=6;const tx=t.getContext("2d");tx.fillStyle="rgba(255,255,255,.5)";tx.fillRect(0,0,6,1);tx.fillRect(0,0,1,6);tx.fillStyle="rgba(0,0,0,.35)";tx.fillRect(0,3,6,1);tx.fillRect(3,0,1,6);
 c.save();c.globalAlpha=.10;c.fillStyle=c.createPattern(t,"repeat");c.fillRect(0,0,W,H);c.restore();
 c.save();c.globalCompositeOperation="multiply";c.fillStyle="rgba(232,205,160,.30)";c.fillRect(0,0,W,H);c.restore();
 const v=c.createRadialGradient(W/2,H*.48,W*.3,W/2,H/2,W*.85);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(20,12,6,.45)");c.fillStyle=v;c.fillRect(0,0,W,H);
 for(let i=0;i<14000;i++){c.fillStyle=`rgba(${R()<.5?0:255},${R()<.5?0:240},${R()<.5?0:220},${R()*.06})`;c.fillRect(R()*W,R()*H,1.5,1.5)}
 return out}
function pinturaDe(f,W,H){const P=PALETAS[f.paleta]||PALETAS[Object.keys(PALETAS)[(f.__semente||0)%6]];const cena=CENAS.includes(f.cena)?f.cena:CENAS[(f.__semente||0)%CENAS.length];
 const im=f.foto?imgDe(f.foto):null;const key=[f.foto&&im?f.foto:cena,f.paleta||"",f.semente||0,W].join("|");if(_PCACHE.has(key))return _PCACHE.get(key);
 let base;if(im){base=document.createElement("canvas");base.width=W;base.height=H;const k=Math.max(W/im.naturalWidth,H/im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;base.getContext("2d").drawImage(im,(W-w)/2,(H-h)/2,w,h)}
 else base=cenaBase(cena,P,hash(cena+"|"+(f.paleta||"")+"|"+(f.semente||0)),W,H);
 const out=pinceladas(base,hash(key),W,H);if(_PCACHE.size>12)_PCACHE.delete(_PCACHE.keys().next().value);_PCACHE.set(key,out);return out}
