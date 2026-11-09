// T022 / F64-6: una variable opt-in; sin valor se conservan todos los defaults.
export function measurementConfig(value) {
  if(value===undefined)return {};
  const match=/^(1|2|4):(true|false)$/.exec(value);
  if(!match)throw new Error('JUNTIA_PLAYWRIGHT_MEASURE requiere workers 1, 2 o 4 y fullyParallel true/false (ejemplo: 2:true)');
  return {workers:Number(match[1]),fullyParallel:match[2]==='true'};
}
export function measurementPlan(plan,value){
  measurementConfig(value);
  if(value===undefined)return plan;
  return plan.flatMap(step=>{
    // El parser F55-1 ya validó las opciones; combina grep sin perder la exclusión @mail.
    const args=[],patterns=[];
    for(let i=0;i<step.args.length;i++){
      const arg=step.args[i];
      if(arg==='--grep-invert'){i++;continue;}
      if(arg==='--grep'||arg==='-g'){patterns.push(step.args[++i]);continue;}
      if(arg.startsWith('--grep=')){patterns.push(arg.slice(7));continue;}
      if(arg.startsWith('-g')&&!arg.startsWith('--')){patterns.push(arg.slice(2));continue;}
      args.push(arg);
    }
    const filter=patterns.map(p=>'(?=.*(?:'+p+'))').join('');
    const parallel=[...args,'--grep-invert','@mail|@serial','--retries','0'];
    if(patterns.length)parallel.push('--grep',filter);
    return [
      {...step,label:step.label+' · parallel',args:parallel},
      {...step,label:step.label+' · @serial (1 worker)',args:[...args,'--grep-invert','@mail','--grep',filter+'(?=.*@serial)','--workers','1','--pass-with-no-tests','--retries','0']},
    ];
  });
}
