import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
wb.recalculate();
const analysis = await wb.inspect({
  kind: 'table',
  range: 'Analysis!A1:G54',
  include: 'values,formulas',
  tableMaxRows: 54,
  tableMaxCols: 7,
  maxChars: 24000,
});
const categoryHeader = await wb.inspect({
  kind: 'table',
  range: 'Project History!AN1:AO8',
  include: 'values,formulas',
  tableMaxRows: 8,
  tableMaxCols: 2,
  maxChars: 2500,
});
const errors = await wb.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 300 },
  summary: 'dynamic analysis formula error scan',
});
const image = await wb.render({ sheetName: 'Analysis', range: 'A1:G54', scale: 1, format: 'png' });
await fs.writeFile('/private/tmp/ca_transmission_cohort/dynamic_analysis_v4.png', new Uint8Array(await image.arrayBuffer()));
console.log(JSON.stringify({ analysis: analysis.ndjson, categoryHeader: categoryHeader.ndjson, errors: errors.ndjson }, null, 2));
