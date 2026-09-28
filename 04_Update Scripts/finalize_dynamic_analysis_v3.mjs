import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const history = wb.worksheets.getItem('Project History');
const analysis = wb.worksheets.getItem('Analysis');
const firstDataRow = 5;
const lastDataRow = 15150;
const pr = `'Project History'!`;
const r = (col) => `${pr}$${col}$${firstDataRow}:$${col}$${lastDataRow}`;
const stream = r('C');
const category = r('AO');
const latest = r('AB');
const currentCost = r('I');
const selectedCurrentCost = r('K');
const initialCost = r('L');
const selectedInitialCost = r('N');
const originalIsd = r('AI');
const currentIsd = r('AJ');

function classify(name) {
  const x = String(name ?? '').toUpperCase();
  if (!x) return '';
  if (x.includes('HVDC') || x.includes('CONVERTER')) return 'HVDC / converter';
  if (x.includes('RECONDUCT') || x.includes('REBUILD')) return 'Reconductor / rebuild';
  if (x.includes('SUBSTATION') || x.includes('TRANSFORMER')) return 'Substation / transformer';
  if (x.includes('UPGRADE') || x.includes('UPRAT') || x.includes('CAPACITOR')) return 'Upgrade / capacity addition';
  if (x.includes('LINE') || x.includes('CABLE') || x.includes('CIRCUIT')) return 'Line / cable project';
  return 'Other / unclassified';
}
const names = history.getRange(`A${firstDataRow}:A${lastDataRow}`).values;
const categories = names.map(([name]) => [classify(name)]);
history.getRange('AO4').copyFrom(history.getRange('AN4'), 'all');
history.getRange('AO4').values = [['Name-based project category']];
history.getRange(`AO${firstDataRow}:AO${lastDataRow}`).values = categories;
history.getRange('AO:AO').format.columnWidth = 28;

const sumProduct = (parts) => `=SUMPRODUCT(${parts})`;
function catCostCondition(categoryRef) {
  return `--(${stream}="Utility TPR actual final cost"),--(${category}=${categoryRef}),--ISNUMBER(${currentCost}),--ISNUMBER(${initialCost})`;
}
function catSelectedCostCondition(categoryRef) {
  return `--(${stream}="Utility TPR actual final cost"),--(${category}=${categoryRef}),--ISNUMBER(${selectedCurrentCost}),--ISNUMBER(${selectedInitialCost})`;
}
function catScheduleCondition(categoryRef) {
  return `--(${stream}="Utility TPR"),--(${latest}="Yes"),--(${category}=${categoryRef}),--ISNUMBER(${originalIsd}),--ISNUMBER(${currentIsd})`;
}

for (let row = 18; row <= 23; row++) {
  const cc = catCostCondition(`$A${row}`);
  const sc = catSelectedCostCondition(`$A${row}`);
  analysis.getRange(`B${row}`).formulas = [[sumProduct(cc)]];
  analysis.getRange(`C${row}`).formulas = [[sumProduct(`${cc},--(${currentCost}>${initialCost})`)]];
  analysis.getRange(`D${row}`).formulas = [[sumProduct(`${cc},--(${currentCost}<${initialCost})`)]];
  analysis.getRange(`E${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${cc},${currentCost}-${initialCost})/B${row})`]];
  analysis.getRange(`F${row}`).formulas = [[sumProduct(sc)]];
  analysis.getRange(`G${row}`).formulas = [[`=IF(F${row}=0,"n.a.",SUMPRODUCT(${sc},IF(${selectedInitialCost}>0,${selectedCurrentCost}/${selectedInitialCost}-1,0))/F${row})`]];
}
for (let row = 42; row <= 47; row++) {
  const ss = catScheduleCondition(`$A${row}`);
  analysis.getRange(`B${row}`).formulas = [[sumProduct(ss)]];
  analysis.getRange(`C${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>90)`)]];
  analysis.getRange(`D${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}<-90)`)]];
  analysis.getRange(`E${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>=-90),--(${currentIsd}-${originalIsd}<=90)`)]];
  analysis.getRange(`F${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${ss},${currentIsd}-${originalIsd})/365.25/B${row})`]];
}
analysis.getRange('A2').values = [['Formula-linked summary of Project History. Overall cost, schedule, and cancellation measures recalculate with history changes. Category summaries recalculate from the Project History category field.']];
analysis.getRange('G25').values = [['Categories are mutually exclusive name-based screens stored in Project History column AO. Copy or assign a category for each newly added project row. The data do not reliably distinguish new ROW/greenfield from existing-ROW/brownfield work.']];

wb.recalculate();
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(path);
console.log('Dynamic analysis and category field finalized.');
