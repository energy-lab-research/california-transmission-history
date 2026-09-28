import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const datasetDir = path.resolve(projectDir, '..', 'outputs');
const sourcePath = path.join(datasetDir, 'california_transmission_project_dashboard_compact.html');
const distDir = path.join(projectDir, 'dist');
const html = await fs.readFile(sourcePath, 'utf8');
const match = html.match(/const S = (.*?);\n    const R = (.*?);\n    const DATA = .*?;\n    const \$ =/s);
if (!match) throw new Error('Could not extract the cited project history from the source dashboard.');

const sources = JSON.parse(match[1]);
const rows = JSON.parse(match[2]);
if (rows.length !== 12921 || sources.length === 0) throw new Error('Project history is incomplete.');
const sourcePages = {
  'PG&E': 'https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-costs/transmission-project-review-process/pge-transmission-project-review-process-supporting-documents-and-presentations',
  'SCE': 'https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-costs/transmission-project-review-process/sce-transmission-project-review-process-supporting-documents-and-presentations',
  'SDG&E': 'https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-costs/transmission-project-review-process/sdge-transmission-project-review-process-supporting-documents-and-presentations'
};
const planPage = 'https://www.caiso.com/library/transmission-plans-and-studies';
const forumPage = 'https://www.caiso.com/meetings-events/topics/transmission-development-forum';
function sourcePage(row) {
  if (row[3].startsWith('Utility TPR')) return sourcePages[row[2]] || '';
  if (row[3] === 'CAISO annual plan') return planPage;
  if (row[3] === 'CAISO TDF') return forumPage;
  return '';
}
// Name-only classifications are deliberately limited to visible engineering terms.
// A generic reliability or reinforcement title does not establish a construction type.
function categoryFromName(name) {
  const n = name.toLowerCase();
  if (/\b(hvdc|converter|dc terminal)\b/.test(n)) return 'HVDC / converter';
  if (/\b(reconduct\w*|recond\b|recon\b|recabl\w*|rebuild\w*|wood[- ]to[- ]steel|w2s\b|pole replacement\w*)\b/.test(n)) return 'Reconductor / rebuild';
  if (/\b(statcom|svc\b|static var|reactive (?:power )?support|voltage support|shunt reactor|series reactor|bus reactor|series compensat\w*|series caps?\b|capacitor bank)\b/.test(n)) return 'Reactive / voltage support';
  if (/\b(baah|breaker|switchrack|switchyard|switching station|bus (?:extension|sectionali\w*|conversion|reconfigur\w*|terminal\w*)|reconfigur\w*|rearrang\w*)\b/.test(n)) return 'Switching / bus configuration';
  if (/\b(transformer\w*|substation\w*|sub\b|bank \d|replace bank|install bk|inst bk|sw\. stat)\b/.test(n)) return 'Substation / transformer';
  if (/\b(protection|relay\w*|control building|scada|telecom\w*|opgw|remote end|control mod\w*)\b/.test(n)) return 'Protection / controls';
  if (/\b(loop[- ]?in|looping|transmission line|t\/?l\b|cable\w*|line extension)\b/.test(n)) return 'Line / cable project';
  if (/\b(capacity increase|capacity addition|upgrade|upgd|limiting components)\b/.test(n)) return 'Upgrade / capacity addition';
  if (/\b(reinforcement|reliability enhancement|method of service)\b/.test(n)) return 'Reinforcement (design unspecified)';
  return '';
}
const knownByName = new Map();
for (const row of rows) {
  if (row[16] === 'Other / unclassified') continue;
  const key = row[1].trim().toLowerCase();
  const set = knownByName.get(key) || new Set();
  set.add(row[16]);
  knownByName.set(key, set);
}
let newlyClassified = 0, linkedPages = 0;
const enrichedRows = rows.map(row => {
  const result = [...row];
  let basis = result[16] === 'Other / unclassified' ? 'Unclassified' : 'Existing workbook label';
  if (result[16] === 'Other / unclassified') {
    const known = knownByName.get(result[1].trim().toLowerCase());
    const fromTitle = categoryFromName(result[1]);
    const category = fromTitle || (known?.size === 1 ? [...known][0] : '');
    if (category) { result[16] = category; basis = fromTitle ? 'Project-title keyword' : 'Same-name project label'; newlyClassified++; }
  }
  const landing = sourcePage(result);
  if (landing) linkedPages++;
  result.push(landing, basis);
  return result;
});
const data = JSON.stringify({sources, rows:enrichedRows}).replace(/</g, '\\u003c');

let page = html.replace(match[0], 'let DATA = [];\n    const $ =');
page = page.replace(/    choose\('utility',\[\.\.\.new Set\(DATA\.map\(d=>d\.utility\)\)\]\); choose\('category',\[\.\.\.new Set\(DATA\.map\(d=>d\.category\)\)\]\); choose\('stream',\[\.\.\.new Set\(DATA\.map\(d=>d\.stream\)\)\]\); choose\('status',\[\.\.\.new Set\(DATA\.map\(d=>d\.status\)\)\]\);/, '');
page = page.replace("    ['search','utility','category','stream','status'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render)); render();", `    async function loadData() {
      try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error('Dataset could not be loaded.');
        const packed = await response.json();
        DATA = packed.rows.map(r => ({row:r[0],project:r[1],utility:r[2],stream:r[3],projectId:r[4],reportPeriod:r[5],observationDate:r[6],status:r[7],approvalCycle:r[8],reportedCostM:r[9],reportedCostYear:r[10],initialCostM:r[11],initialCostYear:r[12],originalIsd:r[13],currentIsd:r[14],crosswalk:r[15],category:r[16],cancellationFlag:r[17],sourceId:packed.sources[r[18]][0],sourceLocator:packed.sources[r[18]][1],sourceUrl:packed.sources[r[18]][2],sourceTitle:packed.sources[r[18]][3],sourcePage:r[19],categoryBasis:r[20]}));
        choose('utility',[...new Set(DATA.map(d=>d.utility))]);
        choose('category',[...new Set(DATA.map(d=>d.category))]);
        choose('stream',[...new Set(DATA.map(d=>d.stream))]);
        choose('status',[...new Set(DATA.map(d=>d.status))]);
        render();
      } catch (error) {
        $('count').textContent = 'The project dataset could not load. Please refresh the page.';
        console.error(error);
      }
    }
    ['search','utility','category','stream','status'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render)); loadData();`);
page = page.replace('<a href="california_transmission_project_timeline_simple.xlsx">Download workbook</a>', 'Every observation includes its public-source citation');
page = page.replace('The available records do not consistently support greenfield versus existing-ROW classification.', 'Name-based classification is provisional. Reinforcement without a stated design remains separate; the records do not consistently support greenfield versus existing-ROW classification.');
page = page.replace("const source=d.sourceUrl&&/^https?:/i.test(d.sourceUrl)?'<a href="+'"'+"'+esc(d.sourceUrl)+'"+'"'+" target=\"_blank\" rel=\"noopener\">Open source document</a>':'No direct URL recorded';", "const source=(d.sourcePage?'<a href=\"'+esc(d.sourcePage)+'\" target=\"_blank\" rel=\"noopener\">Open source web page</a> · ':'')+(d.sourceUrl&&/^https?:/i.test(d.sourceUrl)?'<a href=\"'+esc(d.sourceUrl)+'\" target=\"_blank\" rel=\"noopener\">Open exact cited file</a>':'No direct file URL recorded');");
page = page.replace("'Source title','Source URL'];", "'Source title','Source URL','Source web page'];");
page = page.replace("d.sourceTitle,d.sourceUrl])", "d.sourceTitle,d.sourceUrl,d.sourcePage])");
page = page.replace("'Source title','Source URL','Source web page'];", "'Source title','Source URL','Source web page','Category basis'];");
page = page.replace("d.sourceTitle,d.sourceUrl,d.sourcePage])", "d.sourceTitle,d.sourceUrl,d.sourcePage,d.categoryBasis])");
page = page.replace("['Category',d.category],", "['Category',d.category],['Category basis',d.categoryBasis],");
page = page.replace('Static HTML dashboard. Share this file together with the linked workbook, or upload both files to a static host to make the workbook link available online.', 'California transmission project history. Project records reflect their cited public sources and may include repeated observations across reporting cycles.');
page = page.replace('Dataset snapshot generated 2026-09-27', 'Dataset snapshot generated 2026-09-27');
page = page.replace(".join('\n'); const blob", ".join('\\n'); const blob");
page = page.replace('<meta name="description" content="California transmission project history: costs, schedules, cancellations, project categories, and citations.">', '<meta name="description" content="Explore cited California transmission project history, costs, schedules, and cancellations.">\n  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Crect width=\'64\' height=\'64\' rx=\'12\' fill=\'%23103b5d\'/%3E%3Cpath d=\'M8 40 22 24l12 14 21-23M8 51h48\' fill=\'none\' stroke=\'white\' stroke-width=\'5\'/%3E%3C/svg%3E">');

if (page.includes('const S = ') || !page.includes('loadData();')) throw new Error('The page did not convert to external data loading.');
await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(path.join(distDir, 'index.html'), page, 'utf8');
await fs.writeFile(path.join(distDir, 'data.json'), data, 'utf8');
for (const name of ['index.html','projects.html','analysis.html','style.css','app.js']) {
  await fs.copyFile(path.join(projectDir, 'src', name), path.join(distDir, name));
}
console.log(JSON.stringify({records:rows.length,sources:sources.length,newlyClassified,linkedPages,pages:3,dataBytes:Buffer.byteLength(data)}));
