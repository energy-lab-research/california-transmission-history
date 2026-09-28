import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
const analysis = wb.worksheets.getItem('Analysis');
const firstDataRow = 5;
const lastFormulaRow = 15150;
const pr = `'Project History'!`;
const r = (col) => `${pr}$${col}$${firstDataRow}:$${col}$${lastFormulaRow}`;
const stream = r('C');
const latest = r('AB');
const projectName = r('A');
const currentCost = r('I');
const selectedCurrentCost = r('K');
const initialCost = r('L');
const selectedInitialCost = r('N');
const originalIsd = r('AI');
const currentIsd = r('AJ');

// Multiplication, rather than AND(), preserves row-by-row evaluation inside SUMPRODUCT.
const isHvdc = `(ISNUMBER(SEARCH("HVDC",${projectName}))+ISNUMBER(SEARCH("CONVERTER",${projectName}))>0)`;
const isReconductor = `(ISNUMBER(SEARCH("RECONDUCT",${projectName}))+ISNUMBER(SEARCH("REBUILD",${projectName}))>0)`;
const isSubstation = `(ISNUMBER(SEARCH("SUBSTATION",${projectName}))+ISNUMBER(SEARCH("TRANSFORMER",${projectName}))>0)`;
const isUpgrade = `(ISNUMBER(SEARCH("UPGRADE",${projectName}))+ISNUMBER(SEARCH("UPRAT",${projectName}))+ISNUMBER(SEARCH("CAPACITOR",${projectName}))>0)`;
const isLine = `(ISNUMBER(SEARCH("LINE",${projectName}))+ISNUMBER(SEARCH("CABLE",${projectName}))+ISNUMBER(SEARCH("CIRCUIT",${projectName}))>0)`;
function categoryCondition(key) {
  const noHvdc = `(${isHvdc}=FALSE)`;
  const noReconductor = `(${isReconductor}=FALSE)`;
  const noSubstation = `(${isSubstation}=FALSE)`;
  const noUpgrade = `(${isUpgrade}=FALSE)`;
  const noLine = `(${isLine}=FALSE)`;
  switch (key) {
    case 'hvdc': return isHvdc;
    case 'reconductor': return `${noHvdc}*${isReconductor}`;
    case 'substation': return `${noHvdc}*${noReconductor}*${isSubstation}`;
    case 'upgrade': return `${noHvdc}*${noReconductor}*${noSubstation}*${isUpgrade}`;
    case 'line': return `${noHvdc}*${noReconductor}*${noSubstation}*${noUpgrade}*${isLine}`;
    default: return `${noHvdc}*${noReconductor}*${noSubstation}*${noUpgrade}*${noLine}`;
  }
}
const sumProduct = (parts) => `=SUMPRODUCT(${parts})`;
function catCostCondition(key) {
  return `--(${stream}="Utility TPR actual final cost"),--(${categoryCondition(key)}),--ISNUMBER(${currentCost}),--ISNUMBER(${initialCost})`;
}
function catSelectedCostCondition(key) {
  return `--(${stream}="Utility TPR actual final cost"),--(${categoryCondition(key)}),--ISNUMBER(${selectedCurrentCost}),--ISNUMBER(${selectedInitialCost})`;
}
function catScheduleCondition(key) {
  return `--(${stream}="Utility TPR"),--(${latest}="Yes"),--(${categoryCondition(key)}),--ISNUMBER(${originalIsd}),--ISNUMBER(${currentIsd})`;
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
for (const [row, key] of [[42, 'hvdc'], [43, 'reconductor'], [44, 'substation'], [45, 'upgrade'], [46, 'line'], [47, 'other']]) {
  const ss = catScheduleCondition(key);
  analysis.getRange(`B${row}`).formulas = [[sumProduct(ss)]];
  analysis.getRange(`C${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>90)`)]];
  analysis.getRange(`D${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}<-90)`)]];
  analysis.getRange(`E${row}`).formulas = [[sumProduct(`${ss},--(${currentIsd}-${originalIsd}>=-90),--(${currentIsd}-${originalIsd}<=90)`)]];
  analysis.getRange(`F${row}`).formulas = [[`=IF(B${row}=0,"n.a.",SUMPRODUCT(${ss},${currentIsd}-${originalIsd})/365.25/B${row})`]];
}
wb.recalculate();
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(path);
console.log('Category formulas updated.');
