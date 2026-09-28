import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const a = wb.worksheets.getItem('Analysis');
const p = "'Project History'!";
const c = `${p}$C$5:$C$15150`;
const i = `${p}$I$5:$I$15150`;
const l = `${p}$L$5:$L$15150`;
a.getRange('Z1:AD1').formulas = [[
  `=COUNTIFS(${c},"Utility TPR actual final cost",${i},">=0",${l},">=0")`,
  `=SUMPRODUCT(--(${c}="Utility TPR actual final cost"),--(${i}<>""),--(${l}<>""))`,
  `=COUNTIFS(${c},"Utility TPR actual final cost",${i},">0",${l},">0")`,
  `=SUMPRODUCT(--(${c}="Utility TPR actual final cost"),--(${i}>0),--(${l}>0))`,
  `=COUNTIF(${c},"Utility TPR actual final cost")`,
]];
wb.recalculate();
const out = await wb.inspect({ kind: 'table', range: 'Analysis!Z1:AD1', include: 'values,formulas', tableMaxRows: 1, tableMaxCols: 5, maxChars: 3000 });
console.log(out.ndjson);
