import fs from 'node:fs/promises';

const outputPath = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_dashboard.html';
const html = await fs.readFile(outputPath, 'utf8');
const match = html.match(/const DATA = (.*?);\n    const \$ =/s);
if (!match) throw new Error('Embedded dashboard data block was not found.');
const records = JSON.parse(match[1]);
const filtered = records.filter(record => record.project !== 'Unnamed project' || record.projectId !== 'No project ID');
const updated = html.replace(match[0], `const DATA = ${JSON.stringify(filtered).replace(/</g, '\\u003c')};\n    const $ =`);
await fs.writeFile(outputPath, updated, 'utf8');
console.log(JSON.stringify({ before: records.length, after: filtered.length, bytes: Buffer.byteLength(updated) }, null, 2));
