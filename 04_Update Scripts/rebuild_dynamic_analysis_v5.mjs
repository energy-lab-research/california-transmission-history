import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const a = wb.worksheets.getItem('Analysis');
const first = 5;
const last = 15150;
const pr = "'Project History'!";
const r = (col) => `${pr}$${col}$${first}:$${col}$${last}`;
const utility = r('B');
const stream = r('C');
const status = r('G');
const currentCost = r('I');
const selectedCurrent = r('K');
const initialCost = r('L');
const selectedInitial = r('N');
const latest = r('AB');
const originalIsd = r('AI');
const currentIsd = r('AJ');
const category = r('AO');
const sumProduct = (parts) => `=SUMPRODUCT(${parts})`;

function costCriteria(utilityCell) {
  const base = `${stream},"Utility TPR actual final cost",${currentCost},">0",${initialCost},">0"`;
  return utilityCell ? `${base},${utility},${utilityCell}` : base;
}
function costProduct(utilityCell) {
  return `--(${stream}="Utility TPR actual final cost"),--(${currentCost}>0),--(${initialCost}>0)${utilityCell ? `,--(${utility}=${utilityCell})` : ''}`;
}
function scheduleCriteria(utilityCell) {
  const base = `${stream},"Utility TPR",${latest},"Yes",${originalIsd},">0",${currentIsd},">0"`;
  return utilityCell ? `${base},${utility},${utilityCell}` : base;
}
function scheduleProduct(utilityCell) {
  return `--(${stream}="Utility TPR"),--(${latest}="Yes"),--(${originalIsd}>0),--(${currentIsd}>0)${utilityCell ? `,--(${utility}=${utilityCell})` : ''}`;
}
function catCostCriteria(row) {
  return `${stream},"Utility TPR actual final cost",${category},$A${row},${currentCost},">0",${initialCost},">0"`;
}
function catCostProduct(row) {
  return `--(${stream}="Utility TPR actual final cost"),--(${category}=$A${row}),--(${currentCost}>0),--(${initialCost}>0)`;
}
function catScheduleCriteria(row) {
  return `${stream},"Utility TPR",${latest},"Yes",${category},$A${row},${originalIsd},">0",${currentIsd},">0"`;
}
function catScheduleProduct(row) {
  return `--(${stream}="Utility TPR"),--(${latest}="Yes"),--(${category}=$A${row}),--(${originalIsd}>0),--(${currentIsd}>0)`;
}

a.getRange('A1:G80').clear({ applyTo: 'all' });
a.showGridLines = false;
const rows = [
  ['California transmission project analysis'],
  ['Formula-linked summary of Project History. Overall cost, schedule, and cancellation measures recalculate with history changes. Category summaries recalculate from the Project History category field.'],
  [''],
  ['Cost-change screen — operational actual-final records'],
  ['Metric', 'All utilities', 'PG&E', 'SCE', 'SDG&E', 'Interpretation'],
  ['Positive reported final cost and original estimate'],
  ['Increased in nominal source dollars'],
  ['Decreased in nominal source dollars'],
  ['Unchanged in nominal source dollars'],
  ['Average nominal cost change ($M)'],
  ['Share with increased nominal cost'],
  ['Positive selected-dollar records'],
  ['Method note', '', '', '', '', 'Cost screen requires a positive reported final cost and positive original estimate. This intentionally excludes zero, blank, and negative source values.'],
  [''],
  ['Cost changes by name-based project category'],
  ['Category', 'Positive cost records', 'Increased', 'Decreased', 'Average nominal change ($M)', 'Selected-dollar records', 'Interpretation'],
  ['HVDC / converter'],
  ['Reconductor / rebuild'],
  ['Substation / transformer'],
  ['Upgrade / capacity addition'],
  ['Line / cable project'],
  ['Other / unclassified'],
  ['Category total check'],
  ['Method note', '', '', '', '', '', 'Categories are mutually exclusive name-based screens stored in Project History column AO. Assign a category for each newly added project row. The data do not reliably distinguish new ROW/greenfield from existing-ROW/brownfield work.'],
  [''],
  ['Schedule-shift screen — latest utility TPR records'],
  ['Metric', 'All utilities', 'PG&E', 'SCE', 'SDG&E', 'Interpretation'],
  ['Records with original and current in-service dates'],
  ['Later by more than 90 days'],
  ['Earlier by more than 90 days'],
  ['Within ±90 days'],
  ['Average schedule shift (years)'],
  ['Average shift among delayed records (years)'],
  ['Method note', '', '', '', '', 'Positive values are later than the originally reported in-service date. This reflects utility reporting, not a systemwide forecast.'],
  [''],
  ['Schedule shifts by name-based project category'],
  ['Category', 'Comparable schedule records', 'Later >90 days', 'Earlier >90 days', 'Within ±90 days', 'Average shift (years)'],
  ['HVDC / converter'],
  ['Reconductor / rebuild'],
  ['Substation / transformer'],
  ['Upgrade / capacity addition'],
  ['Line / cable project'],
  ['Other / unclassified'],
  ['Category total check'],
  [''],
  ['Cancellation review'],
  ['Metric', 'Count', 'Interpretation'],
  ['Current utility cancellation observations'],
  ['Historical CAISO annual-plan cancellation observations'],
  ['Method note', '', 'Status search: cancel/cancelled, abandoned, or withdrawn. Counts are observations; project-identity reconciliation requires the crosswalk.'],
];
a.getRange(`A1:G${rows.length}`).write(rows);

for (const [col, utilityCell] of [['B', null], ['C', 'C$5'], ['D', 'D$5'], ['E', 'E$5']]) {
  const cp = costProduct(utilityCell);
  const cc = costCriteria(utilityCell);
  a.getRange(`${col}6`).formulas = [[`=COUNTIFS(${cc})`]];
  a.getRange(`${col}7`).formulas = [[sumProduct(`${cp},--(${currentCost}>${initialCost})`)]];
  a.getRange(`${col}8`).formulas = [[sumProduct(`${cp},--(${currentCost}<${initialCost})`)]];
  a.getRange(`${col}9`).formulas = [[sumProduct(`${cp},--(${currentCost}=${initialCost})`)]];
  a.getRange(`${col}10`).formulas = [[`=IF(${col}6=0,"n.a.",SUMPRODUCT(${cp},${currentCost}-${initialCost})/${col}6)`]];
  a.getRange(`${col}11`).formulas = [[`=IF(${col}6=0,"n.a.",${col}7/${col}6)`]];
  const selectedBase = `${stream},"Utility TPR actual final cost",${selectedCurrent},">0",${selectedInitial},">0"${utilityCell ? `,${utility},${utilityCell}` : ''}`;
  a.getRange(`${col}12`).formulas = [[`=COUNTIFS(${selectedBase})`]];
}

for (let row = 17; row <= 22; row++) {
  const cp = catCostProduct(row);
  a.getRange(`B${row}`).formulas = [[`=COUNTIFS(${catCostCriteria(row)})`]];
  a.getRange(`C${row}`).formulas = [[sumProduct(`${cp},--(${currentCost}>${initialCost})`)]];
  a.getRange(`D${row}`).formulas = [[sumProduct(`${cp},--(${currentCost}<${initialCost})`)]];
  a.getRange(`E${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${cp},${currentCost}-${initialCost})/B${row})`]];
  a.getRange(`F${row}`).formulas = [[`=COUNTIFS(${stream},"Utility TPR actual final cost",${category},$A${row},${selectedCurrent},">0",${selectedInitial},">0")`]];
}
a.getRange('B23').formulas = [['=SUM(B17:B22)']];
a.getRange('C23').formulas = [['=SUM(C17:C22)']];
a.getRange('D23').formulas = [['=SUM(D17:D22)']];
a.getRange('F23').formulas = [['=SUM(F17:F22)']];
a.getRange('G23').formulas = [['=IF(B23=$B$6,"Matches overall count","Check category labels")']];

for (const [col, utilityCell] of [['B', null], ['C', 'C$27'], ['D', 'D$27'], ['E', 'E$27']]) {
  const sp = scheduleProduct(utilityCell);
  const sc = scheduleCriteria(utilityCell);
  a.getRange(`${col}28`).formulas = [[`=COUNTIFS(${sc})`]];
  a.getRange(`${col}29`).formulas = [[sumProduct(`${sp},--(${currentIsd}-${originalIsd}>90)`)]];
  a.getRange(`${col}30`).formulas = [[sumProduct(`${sp},--(${currentIsd}-${originalIsd}<-90)`)]];
  a.getRange(`${col}31`).formulas = [[sumProduct(`${sp},--(${currentIsd}-${originalIsd}>=-90),--(${currentIsd}-${originalIsd}<=90)`)]];
  a.getRange(`${col}32`).formulas = [[`=IF(${col}28=0,"n.a.",SUMPRODUCT(${sp},${currentIsd}-${originalIsd})/365.25/${col}28)`]];
  a.getRange(`${col}33`).formulas = [[`=IF(${col}29=0,"n.a.",SUMPRODUCT(${sp},--(${currentIsd}-${originalIsd}>90),${currentIsd}-${originalIsd})/365.25/${col}29)`]];
}

for (let row = 38; row <= 43; row++) {
  const sp = catScheduleProduct(row);
  a.getRange(`B${row}`).formulas = [[`=COUNTIFS(${catScheduleCriteria(row)})`]];
  a.getRange(`C${row}`).formulas = [[sumProduct(`${sp},--(${currentIsd}-${originalIsd}>90)`)]];
  a.getRange(`D${row}`).formulas = [[sumProduct(`${sp},--(${currentIsd}-${originalIsd}<-90)`)]];
  a.getRange(`E${row}`).formulas = [[sumProduct(`${sp},--(${currentIsd}-${originalIsd}>=-90),--(${currentIsd}-${originalIsd}<=90)`)]];
  a.getRange(`F${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${sp},${currentIsd}-${originalIsd})/365.25/B${row})`]];
}
a.getRange('B44').formulas = [['=SUM(B38:B43)']];
a.getRange('C44').formulas = [['=SUM(C38:C43)']];
a.getRange('D44').formulas = [['=SUM(D38:D43)']];
a.getRange('E44').formulas = [['=SUM(E38:E43)']];
a.getRange('F44').formulas = [['=IF(B44=$B$28,"Matches overall count","Check category labels")']];

a.getRange('B48').formulas = [[`=COUNTIFS(${stream},"Utility TPR",${latest},"Yes",${status},"*cancel*")+COUNTIFS(${stream},"Utility TPR",${latest},"Yes",${status},"*abandon*")+COUNTIFS(${stream},"Utility TPR",${latest},"Yes",${status},"*withdraw*")`]];
a.getRange('B49').formulas = [[`=COUNTIFS(${stream},"CAISO annual plan",${status},"*cancel*")+COUNTIFS(${stream},"CAISO annual plan",${status},"*abandon*")+COUNTIFS(${stream},"CAISO annual plan",${status},"*withdraw*")`]];

a.getRange('A1:G1').format.fill = '#1F4E78';
a.getRange('A1:G1').format.font = { bold: true, color: '#FFFFFF', size: 16 };
a.getRange('A2:G2').format.font = { italic: true, color: '#44546A' };
for (const row of [4, 15, 26, 36, 46]) { a.getRange(`A${row}:G${row}`).format.fill = '#D9EAF7'; a.getRange(`A${row}:G${row}`).format.font = { bold: true, color: '#1F1F1F' }; }
for (const row of [5, 16, 27, 37, 47]) { a.getRange(`A${row}:G${row}`).format.fill = '#5B9BD5'; a.getRange(`A${row}:G${row}`).format.font = { bold: true, color: '#FFFFFF' }; }
for (const row of [13, 24, 34, 50]) a.getRange(`A${row}:G${row}`).format.font = { italic: true, color: '#44546A' };
a.getRange('A1:G50').format.wrapText = true;
a.getRange('A1:G50').format.verticalAlignment = 'top';
a.getRange('A:A').format.columnWidth = 40;
a.getRange('B:E').format.columnWidth = 16;
a.getRange('F:F').format.columnWidth = 20;
a.getRange('G:G').format.columnWidth = 54;
a.getRange('B10:E10').format.numberFormat = '$#,##0.0;[Red]-$#,##0.0';
a.getRange('B11:E11').format.numberFormat = '0.0%';
a.getRange('E17:E22').format.numberFormat = '$#,##0.0;[Red]-$#,##0.0';
a.getRange('B32:E33').format.numberFormat = '0.0';
a.getRange('F38:F43').format.numberFormat = '0.0';
a.getRange('A2:G2').format.rowHeight = 34;
a.getRange('A13:G13').format.rowHeight = 36;
a.getRange('A24:G24').format.rowHeight = 42;
a.getRange('A34:G34').format.rowHeight = 34;
a.getRange('A50:G50').format.rowHeight = 36;
a.freezePanes.freezeRows(5);

wb.recalculate();
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(path);
console.log('Dynamic analysis rebuilt with verified formula patterns.');
