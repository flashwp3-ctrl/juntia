// Controles P0-3: solo el respaldo sintético del drill, con hash recalculado por este.
import {readFileSync,writeFileSync} from 'node:fs';
import {planningCorruptions,corruptPlanningDump} from './restore-planning.mjs';
if(process.env.GITHUB_ACTIONS!=='true'||new URL(process.env.DB_URL).hostname!=='127.0.0.1')throw new Error('Runner only');
const [dump,state,kind]=process.argv.slice(2);
if(dump==='--list')for(const [rule,marker] of Object.entries(planningCorruptions))console.log(rule+'|'+(marker??'constraint'));
else {
 const {planningFixture}=JSON.parse(readFileSync(state,'utf8'));
 if(!planningFixture)throw new Error('Missing synthetic planning fixture');
 writeFileSync(dump,corruptPlanningDump(readFileSync(dump,'utf8'),planningFixture,kind),{mode:0o600});
}
