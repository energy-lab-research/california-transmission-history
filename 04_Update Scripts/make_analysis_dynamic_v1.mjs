import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const analysis = wb.worksheets.getItem('Analysis');

const firstDataRow = 5;
const lastFormulaRow = 15150;
const pr = `'Project History'!`;
const r = (col) => `${pr}$${col}$${firstDataRow}:$${col}$${lastFormulaRow}`;
const stream = r('C');
const utility = r('B');
const status = r('G');
const latest = r('AB');
const projectName = r('A');
const currentCost = r('I');
const selectedCurrentCost = r('K');
const initialCost = r('L');
const selectedInitialCost = r('N');
const originalIsd = r('AI');
const currentIsd = r('AJ');

function utilityCondition(headingRef, allHeading) {
  return headingRef === allHeading ? '' : `,--(${utility}=${headingRef})`;
}
function costCondition(headingRef) {
  return `--(${stream}="Utility TPR actual final cost"),--ISNUMBER(${currentCost}),--ISNUMBER(${initialCost})${utilityCondition(headingRef, 'B$5')}`;
}
function selectedCostCondition(headingRef) {
  return `--(${stream}="Utility TPR actual final cost"),--ISNUMBER(${selectedCurrentCost}),--ISNUMBER(${selectedInitialCost})${utilityCondition(headingRef, 'B$5')}`;
}
function scheduleCondition(headingRef) {
  return `--(${stream}="Utility TPR"),--(${latest}="Yes"),--ISNUMBER(${originalIsd}),--ISNUMBER(${currentIsd})${utilityCondition(headingRef, 'B$31')}`;
}

// The following hierarchy makes categories mutually exclusive and intentionally uses only the project name.
const isHvdc = `(ISNUMBER(SEARCH("HVDC",${projectName}))+ISNUMBER(SEARCH("CONVERTER",${projectName}))>0)`;
const isReconductor = `(ISNUMBER(SEARCH("RECONDUCT",${projectName}))+ISNUMBER(SEARCH("REBUILD",${projectName}))>0)`;
const isSubstation = `(ISNUMBER(SEARCH("SUBSTATION",${projectName}))+ISNUMBER(SEARCH("TRANSFORMER",${projectName}))>0)`;
const isUpgrade = `(ISNUMBER(SEARCH("UPGRADE",${projectName}))+ISNUMBER(SEARCH("UPRAT",${projectName}))+ISNUMBER(SEARCH("CAPACITOR",${projectName}))>0)`;
const isLine = `(ISNUMBER(SEARCH("LINE",${projectName}))+ISNUMBER(SEARCH("CABLE",${projectName}))+ISNUMBER(SEARCH("CIRCUIT",${projectName}))>0)`;
function categoryCondition(key) {
  const noHvdc = `NOT(${isHvdc})`;
  const noReconductor = `NOT(${isReconductor})`;
  const noSubstation = `NOT(${isSubstation})`;
  const noUpgrade = `NOT(${isUpgrade})`;
  switch (key) {
    case 'hvdc': return isHvdc;
    case 'reconductor': return `AND(${noHvdc},${isReconductor})`;
    case 'substation': return `AND(${noHvdc},${noReconductor},${isSubstation})`;
    case 'upgrade': return `AND(${noHvdc},${noReconductor},${noSubstation},${isUpgrade})`;
    case 'line': return `AND(${noHvdc},${noReconductor},${noSubstation},${noUpgrade},${isLine})`;
    default: return `AND(${noHvdc},${noReconductor},${noSubstation},${noUpgrade},NOT(${isLine}))`;
  }
}
function catCostCondition(key) {
  return `--(${stream}="Utility TPR actual final cost"),--(${categoryCondition(key)}),--ISNUMBER(${currentCost}),--ISNUMBER(${initialCost})`;
}
function catSelectedCostCondition(key) {
  return `--(${stream}="Utility TPR actual final cost"),--(${categoryCondition(key)}),--ISNUMBER(${selectedCurrentCost}),--ISNUMBER(${selectedInitialCost})`;
}
function catScheduleCondition(key) {
  return `--(${stream}="Utility TPR"),--(${latest}="Yes"),--(${categoryCondition(key)}),--ISNUMBER(${originalIsd}),--ISNUMBER(${currentIsd})`;
}
const sumProduct = (parts) => `=SUMPRODUCT(${parts})`;

analysis.getRange('A1:G80').clear({ applyTo: 'all' });
analysis.showGridLines = false;
const labels = [
  ['California transmission project analysis'],
  ['Formula-linked summary of Project History. Metrics update when history data changes. Cost and schedule screens use latest / final utility records only.'],
  [''],
  ['Cost-change screen — operational actual-final records'],
  ['Metric', 'All utilities', 'PG&E', 'SCE', 'SDG&E', 'Interpretation'],
  ['Comparable records: actual final cost and original estimate'],
  ['Increased in nominal source dollars'],
  ['Decreased in nominal source dollars'],
  ['Unchanged in nominal source dollars'],
  ['Average nominal cost change ($M)'],
  ['Average nominal cost change (%)'],
  ['Comparable selected-dollar records'],
  ['Average selected-dollar cost change (%)'],
  ['Method note', '', '', '', '', 'Both source amounts must be numeric in the same operational actual-final-cost TPR row. Selected-dollar comparisons require both CPI-adjusted amounts.'],
  [''],
  ['Cost changes by name-based project category'],
  ['Category', 'Comparable records', 'Increased', 'Decreased', 'Average nominal change ($M)', 'Selected-dollar records', 'Average selected-dollar change (%)'],
  ['HVDC / converter'],
  ['Reconductor / rebuild'],
  ['Substation / transformer'],
  ['Upgrade / capacity addition'],
  ['Line / cable project'],
  ['Other / unclassified'],
  ['Category total check'],
  ['Method note', '', '', '', '', '', 'Categories are mutually exclusive name-based screens. The data do not reliably distinguish new ROW/greenfield from existing-ROW/brownfield work.'],
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
analysis.getRange(`A1:G${labels.length}`).write(labels);

for (const [col, headingRef] of [['B', 'B$5'], ['C', 'C$5'], ['D', 'D$5'], ['E', 'E$5']]) {
  const cc = costCondition(headingRef);
  const sc = selectedCostCondition(headingRef);
  analysis.getRange(`${col}6`).formulas = [[sumProduct(cc)]];
  analysis.getRange(`${col}7`).formulas = [[sumProduct(`${cc},--(${currentCost}>${initialCost})`)]];
  analysis.getRange(`${col}8`).formulas = [[sumProduct(`${cc},--(${currentCost}<${initialCost})`)]];
  analysis.getRange(`${col}9`).formulas = [[sumProduct(`${cc},--(${currentCost}=${initialCost})`)]];
  analysis.getRange(`${col}10`).formulas = [[`=IF(${col}6=0,"n.a.",SUMPRODUCT(${cc},${currentCost}-${initialCost})/${col}6)`]];
  analysis.getRange(`${col}11`).formulas = [[`=IF(${col}6=0,"n.a.",SUMPRODUCT(${cc},IF(${initialCost}>0,${currentCost}/${initialCost}-1,0))/${col}6)`]];
  analysis.getRange(`${col}12`).formulas = [[sumProduct(sc)]];
  analysis.getRange(`${col}13`).formulas = [[`=IF(${col}12=0,"n.a.",SUMPRODUCT(${sc},IF(${selectedInitialCost}>0,${selectedCurrentCost}/${selectedInitialCost}-1,0))/${col}12)`]];
}

for (const [row, key] of [[18, 'hvdc'], [19, 'reconductor'], [20, 'substation'], [21, 'upgrade'], [22, 'line'], [23, 'other']]) {
  const cc = catCostCondition(key);
  const sc = catSelectedCostCondition(key);
  analysis.getRange(`B${row}`).formulas = [[sumProduct(cc)]];
  analysis.getRange(`C${row}`).formulas = [[sumProduct(`${cc},--(${currentCost}>${initialCost})`)]];
  analysis.getRange(`D${row}`).formulas = [[sumProduct(`${cc},--(${currentCost}<${initialCost})`)]];
  analysis.getRange(`E${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${cc},${currentCost}-${initialCost})/B${row})`]];
  analysis.getRange(`F${row}`).formulas = [[sumProduct(sc)]];
  analysis.getRange(`G${row}`).formulas = [[`=IF(F${row}=0,"n.a.",SUMPRODUCT(${sc},IF(${selectedInitialCost}>0,${selectedCurrentCost}/${selectedInitialCost}-1,0))/F${row})`]];
}
analysis.getRange('B24').formulas = [['=SUM(B18:B23)']];
analysis.getRange('C24').formulas = [['=SUM(C18:C23)']];
analysis.getRange('D24').formulas = [['=SUM(D18:D23)']];
analysis.getRange('F24').formulas = [['=SUM(F18:F23)']];
analysis.getRange('G24').formulas = [['=IF(B24=$B$6,"Matches overall count","Check category formulas")']];

for (const [col, headingRef] of [['B', 'B$31'], ['C', 'C$31'], ['D', 'D$31'], ['E', 'E$31']]) {
  const ss = scheduleCondition(headingRef);
  analysis.getRange(`${col}32`).formulas = [[sumProduct(ss)]];
  analysis.getRange(`${col}33`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>90)`)]];
  analysis.getRange(`${col}34`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}<-90)`)]];
  analysis.getRange(`${col}35`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>=-90),--(${currentIsd}-${originalIsd}<=90)`)]];
  analysis.getRange(`${col}36`).formulas = [[`=IF(${col}32=0,"n.a.",SUMPRODUCT(${ss},${currentIsd}-${originalIsd})/365.25/${col}32)`]];
  analysis.getRange(`${col}37`).formulas = [[`=IF(${col}33=0,"n.a.",SUMPRODUCT(${ss},--(${currentIsd}-${originalIsd}>90),${currentIsd}-${originalIsd})/365.25/${col}33)`]];
}

for (const [row, key] of [[42, 'hvdc'], [43, 'reconductor'], [44, 'substation'], [45, 'upgrade'], [46, 'line'], [47, 'other']]) {
  const ss = catScheduleCondition(key);
  analysis.getRange(`B${row}`).formulas = [[sumProduct(ss)]];
  analysis.getRange(`C${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>90)`)]];
  analysis.getRange(`D${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}<-90)`)]];
  analysis.getRange(`E${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>=-90),--(${currentIsd}-${originalIsd}<=90)`)]];
  analysis.getRange(`F${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${ss},${currentIsd}-${originalIsd})/365.25/B${row})`]];
}
analysis.getRange('B48').formulas = [['=SUM(B42:B47)']];
analysis.getRange('C48').formulas = [['=SUM(C42:C47)']];
analysis.getRange('D48').formulas = [['=SUM(D42:D47)']];
analysis.getRange('E48').formulas = [['=SUM(E42:E47)']];
analysis.getRange('F48').formulas = [['=IF(B48=$B$32,"Matches overall count","Check category formulas")']];

const cancellationTest = `(ISNUMBER(SEARCH("cancel",${status}))+ISNUMBER(SEARCH("abandon",${status}))+ISNUMBER(SEARCH("withdraw",${status}))>0)`;
analysis.getRange('B52').formulas = [[`=SUMPRODUCT(--(${stream}="Utility TPR"),--(${latest}="Yes"),--${cancellationTest})`]];
analysis.getRange('B53').formulas = [[`=SUMPRODUCT(--(${stream}="CAISO annual plan"),--${cancellationTest})`]];

analysis.getRange('A1:G1').format.fill = '#1F4E78';
analysis.getRange('A1:G1').format.font = { bold: true, color: '#FFFFFF', size: 16 };
analysis.getRange('A2:G2').format.font = { italic: true, color: '#44546A' };
for (const row of [4, 16, 30, 40, 50]) {
  analysis.getRange(`A${row}:G${row}`).format.fill = '#D9EAF7';
  analysis.getRange(`A${row}:G${row}`).format.font = { bold: true, color: '#1F1F1F' };
}
for (const row of [5, 17, 31, 41, 51]) {
  analysis.getRange(`A${row}:G${row}`).format.fill = '#5B9BD5';
  analysis.getRange(`A${row}:G${row}`).format.font = { bold: true, color: '#FFFFFF' };
}
for (const row of [14, 25, 38, 49, 54]) analysis.getRange(`A${row}:G${row}`).format.font = { italic: true, color: '#44546A' };
analysis.getRange('A1:G54').format.wrapText = true;
analysis.getRange('A1:G54').format.verticalAlignment = 'top';
analysis.getRange('A:A').format.columnWidth = 40;
analysis.getRange('B:E').format.columnWidth = 16;
analysis.getRange('F:F').format.columnWidth = 20;
analysis.getRange('G:G').format.columnWidth = 52;
analysis.getRange('B10:E10').format.numberFormat = '$#,##0.0;[Red]-$#,##0.0';
analysis.getRange('B11:E11').format.numberFormat = '0.0%;[Red]-0.0%';
analysis.getRange('B13:E13').format.numberFormat = '0.0%;[Red]-0.0%';
analysis.getRange('E18:E23').format.numberFormat = '$#,##0.0;[Red]-$#,##0.0';
analysis.getRange('G18:G23').format.numberFormat = '0.0%;[Red]-0.0%';
analysis.getRange('B36:E37').format.numberFormat = '0.0';
analysis.getRange('F42:F47').format.numberFormat = '0.0';
analysis.getRange('A2:G2').format.rowHeight = 32;
analysis.getRange('A14:G14').format.rowHeight = 38;
analysis.getRange('A25:G25').format.rowHeight = 38;
analysis.getRange('A38:G38').format.rowHeight = 34;
analysis.getRange('A54:G54').format.rowHeight = 34;
analysis.freezePanes.freezeRows(5);

wb.recalculate();
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(path);
console.log(JSON.stringify({ output: path, analysisRange: 'Analysis!A1:G54' }, null, 2));
