import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const history = wb.worksheets.getItem('Project History');
const analysis = wb.worksheets.getItem('Analysis');
const first = 5;
const last = 15150;
const statusValues = history.getRange(`G${first}:G${last}`).values;
const flagValues = statusValues.map(([status]) => [/(cancel+ed|cancell?ed|abandoned|withdrawn)/i.test(String(status ?? '')) ? 'Yes' : 'No']);
history.getRange('AP4').copyFrom(history.getRange('AO4'), 'all');
history.getRange('AP4').values = [['Cancellation-status flag']];
history.getRange(`AP${first}:AP${last}`).values = flagValues;
history.getRange('AP:AP').format.columnWidth = 21;

const p = "'Project History'!";
const stream = `${p}$C$5:$C$15150`;
const latest = `${p}$AB$5:$AB$15150`;
const flag = `${p}$AP$5:$AP$15150`;
analysis.getRange('B48').formulas = [[`=COUNTIFS(${stream},"Utility TPR",${latest},"Yes",${flag},"Yes")`]];
analysis.getRange('B49').formulas = [[`=COUNTIFS(${stream},"CAISO annual plan",${flag},"Yes")`]];
analysis.getRange('C50').values = [['Cancellation flag searches status for canceled/cancelled, abandoned, or withdrawn. Counts are observations; project-identity reconciliation requires the crosswalk.']];

wb.recalculate();
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(path);
console.log('Cancellation flag and live count formulas added.');
