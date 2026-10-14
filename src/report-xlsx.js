/**
 * XLSX OOXML sem dependências de CDN: várias abas, dashboard inicial e cabeçalhos
 * formatados. Aceita relatório local ou exportação SQL da central.
 */
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const column=n=>{let x=n+1,s='';while(x){x--;s=String.fromCharCode(65+x%26)+s;x=Math.floor(x/26)}return s};
const enc=new TextEncoder();
function crc32(bytes){let c=-1;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^-1)>>>0;}
const u16=(n)=>[n&255,(n>>>8)&255],u32=(n)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
function zip(files){
 const locals=[],central=[];let offset=0;
 for(const [name,content] of Object.entries(files)){
  const path=enc.encode(name),bytes=enc.encode(content),crc=crc32(bytes);
  const h=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(path.length),...u16(0)]);
  locals.push(h,path,bytes);
  central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(path.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),path);
  offset+=h.length+path.length+bytes.length;
 }
 const centralSize=central.reduce((n,x)=>n+x.length,0),count=Object.keys(files).length;
 const footer=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(count),...u16(count),...u32(centralSize),...u32(offset),...u16(0)]);
 return new Blob([...locals,...central,footer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const safeCell=value=>{
 if(value==null)return '';
 if(typeof value==='object')return JSON.stringify(value);
 if(typeof value==='string'&&/^[=+\-@]/.test(value))return "'"+value; // impedir fórmula inserida pelo colaborador
 return value;
};
function sheet(rows,{dashboard=false}={}){
 const maximum=dashboard?8:Math.max(1,...rows.map(row=>row.length)),width=Math.min(50,Math.max(maximum,1));
 const cells=rows.map((values,index)=>{
  const r=index+1,items=values.map((raw,j)=>{
   const value=safeCell(raw),ref=column(j)+r,style=dashboard?(r<=2?1:r===4||r===9?2:r===5||r===10?3:0):r===1?2:0;
   if(value==='')return '';
   if(typeof value==='number'&&Number.isFinite(value))return '<c r="'+ref+'" s="'+style+'"><v>'+value+'</v></c>';
   return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+escape(String(value).slice(0,32767))+'</t></is></c>';
  }).join('');
  return '<row r="'+r+'"'+(dashboard&&r<=2?' ht="27" customHeight="1"':'')+'>'+items+'</row>';
 }).join('');
 const cols=Array.from({length:width},(_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+(dashboard?(i===0?32:19):(i===0?29:23))+'" customWidth="1"/>').join('');
 const merges=dashboard?'<mergeCells count="2"><mergeCell ref="A1:H2"/><mergeCell ref="A9:H9"/></mergeCells>':'';
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
  '<sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>'+
  '<sheetFormatPr defaultRowHeight="19"/><cols>'+cols+'</cols><sheetData>'+cells+'</sheetData>'+merges+
  (dashboard?'':'<autoFilter ref="A1:'+column(Math.max(0,width-1))+Math.max(rows.length,1)+'"/>')+'</worksheet>';
}
function normalizeRows(value){
 if(Array.isArray(value)){
  const objects=value.filter(x=>x!=null).map(x=>typeof x==='object'&&!Array.isArray(x)?x:{valor:x});
  const keys=[...new Set(objects.flatMap(x=>Object.keys(x)))].slice(0,35);
  return [keys.length?keys:['Sem registros'],...objects.map(o=>keys.map(k=>safeCell(o[k])))];
 }
 if(value&&typeof value==='object')return [['Indicador','Valor'],...Object.entries(value).map(([k,v])=>[k,safeCell(v)])];
 return [['Valor'],[safeCell(value)]];
}
const summary=report=>{
 const sessions=Array.isArray(report.rondas)?report.rondas:Array.isArray(report.events)?report.events.filter(e=>e.kind==='patrol_start'):[];
 const incidents=Array.isArray(report.ocorrencias)?report.ocorrencias:Array.isArray(report.events)?report.events.filter(e=>e.kind==='incident'):[];
 const alerts=Array.isArray(report.alertas)?report.alertas:Array.isArray(report.events)?report.events.filter(e=>e.kind==='alert'||e.kind==='panic'):[];
 const completed=sessions.filter(s=>s.status==='completed'||s.status==='concluida').length;
 const gps=Array.isArray(report.events)?report.events.filter(e=>e.kind==='gps'):[];
 const percent=sessions.length?Math.round(100*completed/sessions.length):null;
 return {sessions,incidents,alerts,gps,completed,percent};
};
export function createXlsxReport(report){
 const data=summary(report),generated=new Date(report.geradoEm||report.at||Date.now()).toLocaleString('pt-BR');
 const dashboard=[
  ['RONDAS PRO  |  DASHBOARD OPERACIONAL'],
  [],[],
  ['Rondas registradas','Concluídas','Conclusão (%)','Alertas','Ocorrências','Amostras GPS'],
  [data.sessions.length,data.completed,data.percent??'Sem base',data.alerts.length,data.incidents.length,data.gps.length],
  [],['Origem dos dados',report.source||report.ambiente||'Registros do navegador'],
  ['Gerado em',generated],
  ['ANÁLISE DE OPERAÇÃO'],
  ['Indicador','Resultado','Interpretação'],
  ['Rondas finalizadas',data.completed,'Somente sessões concluídas'],
  ['Pendentes',Math.max(0,data.sessions.length-data.completed),'Inclui em andamento, não presume atraso'],
  ['Eventos de alerta',data.alerts.length,'Pânico e ocorrências exigem acompanhamento humano'],
  ['Precisão GPS',data.gps.length?'Disponível nas amostras':'Sem amostras','Desvios dependem da qualidade das leituras'],
  [],['ATENÇÃO: Comparações não representam avaliação individual de desempenho.'],
  ['Faltas de sinal e permissões não comprovam desvio; não trate alerta como culpa.']
 ];
 const additional=Object.entries(report).filter(([k,v])=>!['titulo','title','geradoEm','at','source','ambiente','secoes','resumo'].includes(k)&&v&&typeof v==='object');
 const sheets=[['Dashboard',dashboard],...additional.map(([name,value])=>[name.slice(0,31).replace(/[\\/:*?[\]]/g,'_'),normalizeRows(value)])];
 if(report.resumo)sheets.splice(1,0,['Resumo',normalizeRows(report.resumo)]);
 const files={
  '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
  '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Aptos"/></font><font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF13334B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17678A"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf xfId="0" fontId="0" fillId="0" borderId="0"/><xf xfId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf xfId="0" fontId="2" fillId="3" borderId="0" applyFont="1" applyFill="1"/><xf xfId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>'
 };
 files['xl/workbook.xml']='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map(([name],i)=>'<sheet name="'+escape(name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';
 files['xl/_rels/workbook.xml.rels']='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
 sheets.forEach(([name,rows],i)=>{
  files['xl/worksheets/sheet'+(i+1)+'.xml']=sheet(rows,{dashboard:i===0});
  files['[Content_Types].xml']=files['[Content_Types].xml'].replace('</Types>','<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
 });
 return zip(files);
}
