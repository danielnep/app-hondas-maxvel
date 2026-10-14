import test from 'node:test';
import assert from 'node:assert/strict';
import {createXlsxReport} from '../src/report-xlsx.js';
test('XLSX gera ZIP OOXML com Dashboard na primeira aba e planilhas adicionais',async()=>{
 const blob=createXlsxReport({source:'teste',at:Date.now(),rondas:[{responsavel:'A',status:'completed'}],events:[{kind:'panic',description:'Teste'}],mensagens:[{body:'=HYPERLINK("https://example.org")'}]});
 assert.equal(blob.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 const b=Buffer.from(await blob.arrayBuffer());
 assert.equal(b.subarray(0,4).toString('hex'),'504b0304');
 assert.ok(b.includes(Buffer.from('xl/workbook.xml')));
 assert.ok(b.includes(Buffer.from('xl/worksheets/sheet1.xml')));
 assert.ok(b.includes(Buffer.from('Dashboard')));
 assert.ok(b.includes(Buffer.from('=HYPERLINK'))); // cell content must be inline text, not a spreadsheet formula
 assert.ok(b.includes(Buffer.from('t="inlineStr"')));
 assert.ok(b.length>2800);
});
