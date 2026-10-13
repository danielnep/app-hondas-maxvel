import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const extra=readFileSync(new URL('../src/operations-upgrade.js',import.meta.url),'utf8');
const range=(source,start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+1);
 assert.ok(a>=0&&b>a,'seção do código não encontrada: '+start);
 return source.slice(a,b);
};

test('apenas Administração e Operação de Ronda são opções de login',()=>{
 const nav=range(app,'const allNav=','\nconst roleName=');
 assert.match(nav,/ronda:/);
 assert.match(nav,/admin:/);
 for(const oldRole of ['supervisor','gestor','cliente'])assert.doesNotMatch(nav,new RegExp(oldRole+':'));
 const chooser=range(app,'function loginDialog(){','function startDialog(){');
 assert.match(chooser,/\['ronda','Operação de Ronda'/);
 assert.match(chooser,/\['admin','Administração'/);
 assert.doesNotMatch(chooser,/\['(supervisor|gestor|cliente)'/);
 const picker=range(app,"if(act==='sim-role-picker'){","if(act==='schedule-tab')");
 assert.doesNotMatch(picker,/\['(supervisor|gestor|cliente)'/);
 assert.match(picker,/\['ronda','Operação de Ronda'/);
 assert.match(picker,/\['admin','Administração'/);
});

test('vigia somente executa ronda e não recebe relatório ou painel azul',()=>{
 const nav=range(app,'const allNav=','\nconst roleName=');
 assert.match(nav,/ronda:\[\['minha-ronda','Minha ronda','compass'\]\]/);
 assert.doesNotMatch(nav,/ronda:[\s\S]*?\['relatorios'/);
 const panel=range(extra,'function decorate(){','function mediaFields(){');
 const vigia=range(panel,"if(user?.role==='ronda'){","if(user?.role==='admin'){");
 assert.doesNotMatch(vigia,/reportSmart|adminQuick|statusBanner|relatorios|view-client/);
 assert.match(vigia,/panicButton/);
 assert.match(vigia,/gpsQrRow/);
 assert.doesNotMatch(app,/data-action="my-records".*primary full/);
 const guards=range(app,"if(act==='session-detail')","if(act==='map-help')");
 assert.match(guards,/user\?\.role!=='admin'/);
});

test('relatório inteligente aparece só na rota Relatórios do administrador',()=>{
 const panel=range(extra,"if(user?.role==='admin'){","if(view==='notificacoes'){");
 assert.match(panel,/if\(view==='relatorios'\)/);
 assert.match(panel,/reportSmart\(\)/);
 assert.doesNotMatch(panel,/if\(view==='overview'\)/);
 assert.doesNotMatch(panel,/view-client/);
 assert.match(extra,/if\(cmd==='export'\)\{if\(current\(\)\.user\?\.role!=='admin'\)/);
});
