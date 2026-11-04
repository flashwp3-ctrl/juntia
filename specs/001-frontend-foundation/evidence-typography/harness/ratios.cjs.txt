// Relación de anchos fuente/respaldo sobre las cadenas de src/lib/copy/es.ts, por peso (método de D-01).
const fs=require('node:fs');const root=process.cwd();const req=require('node:module').createRequire(root+'/package.json');const {chromium}=req('playwright');
const src=fs.readFileSync(root+'/src/lib/copy/es.ts','utf8');
const strings=[...src.matchAll(/"([^"]*)"|`([^`$]*)`/g)].map(m=>m[1]??m[2]).filter(s=>s&&/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(s)&&!/^[a-z-]+$/.test(s));
const media=root+'/.next/static/media/';const b64=f=>fs.readFileSync(media+fs.readdirSync(media).find(n=>n.startsWith(f))).toString('base64');
const css=`@font-face{font-family:B;font-style:normal;font-weight:400 700;src:url(data:font/woff2;base64,${b64('23538af397c3c9d4')})}
@font-face{font-family:B;font-style:italic;font-weight:400 700;src:url(data:font/woff2;base64,${b64('308e5095fef27824')})}
@font-face{font-family:O;font-weight:100 900;src:url(data:font/woff2;base64,${b64('c50b0495a1ff0f08')})}
@font-face{font-family:M;font-weight:500;src:url(data:font/woff2;base64,${b64('403ce420d25bb57e')})}
span{font-size:100px;white-space:pre;font-kerning:normal}`;
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.setContent(`<style>${css}</style><body></body>`);
const r=await p.evaluate(async({strings})=>{await Promise.all(['400 10px O','500 10px O','600 10px O','400 10px B','500 10px B','600 10px B','700 10px B','italic 400 10px B','italic 500 10px B','italic 600 10px B','italic 700 10px B','500 10px M'].map(f=>document.fonts.load(f,'a')));
 const s=document.createElement('span');document.body.append(s);const W=(fam,w,st,str)=>{s.style.fontFamily=fam;s.style.fontWeight=w;s.style.fontStyle=st;s.textContent=str;return s.getBoundingClientRect().width};
 const sum=(fam,w,st)=>strings.reduce((a,str)=>a+W(fam,w,st,str),0);const out={n:strings.length};
 for(const w of [400,500,600])out['onest/arial '+w]=sum('O',w,'normal')/sum('Arial',w,'normal');
 for(const st of ['normal','italic'])for(const w of [400,500,600,700])out[`brygada/georgia ${st} ${w}`]=sum('B',w,st)/sum('Georgia',w,st);
 for(const st of ['normal'])for(const w of [400,500,600,700])out[`brygada/times ${st} ${w}`]=sum('B',w,st)/sum('Times New Roman',w,st);
 out['spline/courier 500']=sum('M',500,'normal')/sum('Courier New',500,'normal');
 // AmountInput: ancho medio por carácter (em) de importes formateados, Onest 600 con tnum y tracking -0.03em.
 s.style.fontVariantNumeric='tabular-nums';s.style.letterSpacing='-0.03em';const am=['1.250.000','999.999.999','412.900','10.000'];
 for(const f of ['O']){out['amount em/char onest600 -0.03em']=am.reduce((a,x)=>a+W(f,600,'normal',x)/100/x.length,0)/am.length;}
 s.style.letterSpacing='0';out['digit tnum em onest600']=W('O',600,'normal','0123456789')/1000;
 return out;},{strings});
console.log(JSON.stringify(r,null,1));await b.close();})();
