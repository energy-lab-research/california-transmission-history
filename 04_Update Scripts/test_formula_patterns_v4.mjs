import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const a = wb.worksheets.getItem('Analysis');
const p = "'Project History'!";
const c = `${p}$C$5:$C$15150`;
const ab = `${p}$AB$5:$AB$15150`;
const i = `${p}$I$5:$I$15150`;
const l = `${p}$L$5:$L$15150`;
const ai = `${p}$AI$5:$AI$15150`;
const aj = `${p}$AJ$5:$AJ$15150`;
const cost = `--(${c}="Utility TPR actual final cost"),--(${i}>=-1E+99),--(${i}<=1E+99),--(${l}>=-1E+99),--(${l}<=1E+99)`;
const sched = `--(${c}="Utility TPR"),--(${ab}="Yes"),--(${ai}>=1),--(${aj}>=1)`;
a.getRange('Z1:AD2').formulas = [[
  `=SUMPRODUCT(${cost})`,
  `=SUMPRODUCT(${cost},--(${i}>${l}))`,
  `=SUMPRODUCT(${cost},--(${i}<${l}))`,
  `=SUMPRODUCT(${cost},--(${i}=${l}))`,
  `=SUMPRODUCT(${cost},${i}-${l})`,
], [
  `=SUMPRODUCT(${sched})`,
  `=SUMPRODUCT(${sched},--(${aj}-${ai}>90))`,
  `=SUMPRODUCT(${sched},--(${aj}-${ai}<-90))`,
  `=SUMPRODUCT(${sched},--(${aj}-${ai}>=-90),--(${aj}-${ai}<=90))`,
  `=SUMPRODUCT(${sched},${aj}-${ai})`,
]];
wb.recalculate();
const out = await wb.inspect({ kind: 'table', range: 'Analysis!Z1:AD2', include: 'values,formulas', tableMaxRows: 2, tableMaxCols: 5, maxChars: 3000 });
console.log(out.ndjson);
