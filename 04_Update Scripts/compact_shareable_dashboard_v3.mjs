import fs from 'node:fs/promises';

const outputPath = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_dashboard.html';
const html = await fs.readFile(outputPath, 'utf8');
const match = html.match(/const DATA = (.*?);\n    const \$ =/s);
if (!match) throw new Error('Embedded project data block was not found.');
const data = JSON.parse(match[1]);
const sourceIndex = new Map();
const sources = [];
function sourceId(record) {
  const source = [record.sourceId, record.sourceLocator, record.sourceUrl, record.sourceTitle];
  const key = JSON.stringify(source);
  if (!sourceIndex.has(key)) { sourceIndex.set(key, sources.length); sources.push(source); }
  return sourceIndex.get(key);
}
const rows = data.map(record => [
  record.row, record.project, record.utility, record.stream, record.projectId,
  record.reportPeriod, record.observationDate, record.status, record.approvalCycle,
  record.reportedCostM, record.reportedCostYear, record.initialCostM, record.initialCostYear,
  record.originalIsd, record.currentIsd, record.crosswalk, record.category,
  record.cancellationFlag, sourceId(record),
]);
const safe = value => JSON.stringify(value).replace(/</g, '\\u003c');
const compactBlock = `const S = ${safe(sources)};\n    const R = ${safe(rows)};\n    const DATA = R.map(r => ({row:r[0],project:r[1],utility:r[2],stream:r[3],projectId:r[4],reportPeriod:r[5],observationDate:r[6],status:r[7],approvalCycle:r[8],reportedCostM:r[9],reportedCostYear:r[10],initialCostM:r[11],initialCostYear:r[12],originalIsd:r[13],currentIsd:r[14],crosswalk:r[15],category:r[16],cancellationFlag:r[17],sourceId:S[r[18]][0],sourceLocator:S[r[18]][1],sourceUrl:S[r[18]][2],sourceTitle:S[r[18]][3]}));\n    const $ =`;
const updated = html.replace(match[0], compactBlock);
await fs.writeFile(outputPath, updated, 'utf8');
console.log(JSON.stringify({ records: data.length, uniqueSources: sources.length, beforeBytes: Buffer.byteLength(html), afterBytes: Buffer.byteLength(updated) }, null, 2));
