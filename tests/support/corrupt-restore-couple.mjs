// N10: solo modifica el respaldo sintético del drill, nunca un respaldo real.
import {readFileSync,writeFileSync} from 'node:fs';
if(process.env.GITHUB_ACTIONS!=='true')throw new Error('Runner only');
const [dump,state]=process.argv.slice(2);
const {negativeGroupId,negativeMemberId}=JSON.parse(readFileSync(state,'utf8'));
if(!/^[0-9a-f-]{36}$/.test(negativeGroupId)||!/^[0-9a-f-]{36}$/.test(negativeMemberId))throw new Error('Missing synthetic fixture');
let removed=0;
const changed=readFileSync(dump,'utf8').split('\n').filter(line=>{
  if(/^INSERT INTO juntia_data\.group_members\s/.test(line)&&line.includes(negativeGroupId)&&line.includes(negativeMemberId)){removed++;return false;}
  return true;
}).join('\n');
if(removed!==1)throw new Error('Expected exactly one synthetic membership');
writeFileSync(dump,changed,{mode:0o600});
