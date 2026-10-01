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
if (rows.length === 0 || sources.length === 0 || rows.some(r => r.length !== 19)) throw new Error('Project history is incomplete.');
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
// The CAISO annual-plan extraction sometimes puts a project name, planning area, or
// project-type label in the utility column. Those are not sponsors, so label them
// explicitly instead of letting them appear as utilities.
const notASponsor = /\b(kv|reactor|reconductor\w*|transformer|voltage support|phasor|line upgrade|reinforcement|t\/l)\b|\barea\b|-\s*driven project|^undergoing solicitation|^(fresno|kern|humboldt|central valley|north valley|metro area|gba|great bay area|greater bay area|central california|central coast and los padres|north coast and north bay area)\b/i;
const areaOfPge = /^PG&E\s*[–-]\s*/;
const majorArea = /^(PG&E|SCE|SDG&E) Area$/;
let utilitiesRelabeled = 0;
function normalizeUtility(name) {
  const area = name.match(majorArea);
  if (area) { utilitiesRelabeled++; return area[1]; }
  if (areaOfPge.test(name)) { utilitiesRelabeled++; return 'PG&E'; }
  if (notASponsor.test(name) && !/^(PG&E|SCE|SDG&E)\b/.test(name)) { utilitiesRelabeled++; return 'Unspecified (plan entry)'; }
  return name;
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
  result[2] = normalizeUtility(result[2]);
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

await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(path.join(distDir, 'data.json'), data, 'utf8');
for (const name of ['index.html','projects.html','analysis.html','style.css','app.js']) {
  await fs.copyFile(path.join(projectDir, 'src', name), path.join(distDir, name));
}
console.log(JSON.stringify({records:rows.length,sources:sources.length,newlyClassified,utilitiesRelabeled,linkedPages,pages:3,dataBytes:Buffer.byteLength(data)}));
