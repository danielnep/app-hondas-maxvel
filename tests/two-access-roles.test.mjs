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

test('as áreas de avaliação incluem vigia, monitoramento, COI, cliente, vistoriador e administração',()=>{
 const nav=range(app,'const allNav=','\nconst roleName=');
 for(const role of ['ronda','operador','coi','cliente','vistoriador','admin'])assert.match(nav,new RegExp(role+':'));
 for(const obsolete of ['supervisor','gestor'])assert.doesNotMatch(nav,new RegExp(obsolete+':'));
 assert.doesNotMatch(app,/function loginDialog\(\)/,'A demonstração não deve exibir formulário de acesso');
 assert.doesNotMatch(app,/id="login-form"/,'Sem tela de login/seleção obrigatória na demo');
 assert.match(app,/if\(act==='login'\)\{beginSimulation\(/,'O primeiro acesso abre a demonstração diretamente');
 const picker=range(app,"if(act==='sim-role-picker'){","if(act==='schedule-tab')");
 for(const role of ['ronda','operador','coi','cliente','vistoriador','admin'])
  assert.ok(picker.includes("['"+role+"',"),'perfil '+role+' disponível no seletor');
 assert.match(picker,/não representa autenticação/);
});

test('vigia executa ronda e consulta o próprio histórico, sem acessar relatórios administrativos',()=>{
 const nav=range(app,'const allNav=','\nconst roleName=');
 assert.match(nav,/ronda:\[\['minha-ronda','Minha ronda','compass'\],\['historico','Meu histórico','clipboard'\]\]/);
 assert.doesNotMatch(nav,/ronda:\[\['relatorios'/);
 assert.match(app,/function myPatrolHistory\(\)/);
 assert.match(app,/sessionList\(\)\.filter\(x=>x.name===name\)/);
 assert.match(nav,/operador:\[\['overview','Monitoramento','map'\]/);
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
