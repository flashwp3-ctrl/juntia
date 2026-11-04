const req=require('node:module').createRequire(process.cwd()+'/package.json');const{chromium}=req('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();const fontReqs=[];p.on('response',r=>{if(r.url().endsWith('.woff2'))fontReqs.push({file:r.url().split('/').pop(),status:r.status()})});
await p.goto('http://localhost:3100/');await p.evaluate(()=>document.fonts.ready);const before=fontReqs.map(f=>f.file);
await p.evaluate(()=>{const e=document.createElement('em');e.id='probe';e.className='font-serif italic font-medium';e.textContent='Japón 2027';document.body.append(e)});
await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
const cdp=await p.context().newCDPSession(p);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#probe'});console.error('nodeId',nodeId);const plat=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
const info=await p.evaluate(()=>{const e=document.getElementById('probe');const cs=getComputedStyle(e);return {fontFamily:cs.fontFamily,fontStyle:cs.fontStyle,fontWeight:cs.fontWeight,fontSynthesis:cs.fontSynthesis,loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>`${f.family} ${f.style} ${f.weight}`)}});
console.log(JSON.stringify({preloadedOrInitial:before,afterProbe:fontReqs.map(f=>f.file).filter(f=>!before.includes(f)),probe:info,platformFonts:plat.fonts},null,1));await b.close()})();
