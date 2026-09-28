import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const rows = wb.worksheets.getItem('Project History').getRange('A5:AN15150').values;
const picks = rows.filter(r => r[2] === 'Utility TPR actual final cost');
const type = (v) => v === null ? 'null' : v === undefined ? 'undefined' : v instanceof Date ? 'date' : typeof v;
const stats = {};
for (const row of picks) {
  const key = `${type(row[8])}/${type(row[11])}`;
  stats[key] = (stats[key] ?? 0) + 1;
}
const numeric = picks.filter(r => typeof r[8] === 'number' && typeof r[11] === 'number');
console.log(JSON.stringify({ total: picks.length, types: stats, numeric: numeric.length, zeroI: numeric.filter(r=>r[8]===0).length, zeroL: numeric.filter(r=>r[11]===0).length, negatives: numeric.filter(r=>r[8]<0 || r[11]<0).length, samples: numeric.filter(r=>r[8]===0 || r[11]===0).slice(0,8).map(r=>[r[0],r[3],r[8],r[11]]) }, null, 2));
