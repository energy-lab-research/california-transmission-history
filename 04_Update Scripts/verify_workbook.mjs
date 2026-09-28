import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
const path="/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx";
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path));
wb.recalculate();
const errors=await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",options:{useRegex:true,maxResults:100},summary:"formula error scan"});console.log(errors.ndjson);
for(const range of ["Dashboard!A1:H35","Project History!A4:AN10","Project History!A15:AN24","Project History!AJ4:AN10","Source Registry!A1:G32","Coverage!A1:E26","Inflation!A1:H37"]){const check=await wb.inspect({kind:"table",range,include:"values,formulas",tableMaxRows:12,tableMaxCols:40,maxChars:6500});console.log(check.ndjson);}
const costLabels=await wb.inspect({kind:"table",range:"Project History!I3:P5",include:"values,formulas",tableMaxRows:3,tableMaxCols:8,maxChars:2500});console.log(costLabels.ndjson);
for(const [sheetName,range,file] of [["Dashboard","A1:H35","dashboard.png"],["Project History","A1:AN12","project_history.png"],["Project History","A13:AN24","project_history_2008.png"],["Project History","AJ1:AN12","project_history_crosswalk.png"],["Source Registry","A1:G32","source_registry.png"],["Coverage","A1:E26","coverage.png"],["Inflation","A1:H37","inflation.png"]]){const p=await wb.render({sheetName,range,scale:1,format:"png"});await fs.writeFile(`/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/05_Quality Checks/previews/current/${file}`,new Uint8Array(await p.arrayBuffer()));}
