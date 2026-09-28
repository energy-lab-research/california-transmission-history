import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const workbookPath = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx';
const outputPath = '/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_dashboard.html';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const history = wb.worksheets.getItem('Project History');
const values = history.getRange('A5:AP15150').values;

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}
function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function dateOrNull(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 10_000) {
    const date = new Date(Math.round((value - 25569) * 86400000));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  const text = clean(value);
  return text && /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

const records = values
  .filter(row => row.some(value => value !== null && value !== undefined && value !== ''))
  .map((row, index) => ({
    row: index + 5,
    project: clean(row[0]) || 'Unnamed project',
    utility: clean(row[1]) || 'Unspecified',
    stream: clean(row[2]) || 'Unspecified',
    projectId: clean(row[3]) || 'No project ID',
    reportPeriod: clean(row[4]),
    observationDate: dateOrNull(row[5]),
    status: clean(row[6]) || 'Unspecified',
    approvalCycle: clean(row[7]),
    reportedCostM: numberOrNull(row[8]),
    reportedCostYear: clean(row[9]),
    selectedCostM: numberOrNull(row[10]),
    initialCostM: numberOrNull(row[11]),
    initialCostYear: clean(row[12]),
    selectedInitialCostM: numberOrNull(row[13]),
    originalIsd: dateOrNull(row[34]),
    currentIsd: dateOrNull(row[35]),
    crosswalk: clean(row[36]),
    category: clean(row[40]) || 'Other / unclassified',
    cancellationFlag: clean(row[41]) || 'No',
    sourceId: clean(row[28]),
    sourceLocator: clean(row[29]),
    sourceUrl: clean(row[30]),
    sourceTitle: clean(row[31]),
    rawCurrent: clean(row[32]),
    rawInitial: clean(row[33]),
  }))
  .sort((a, b) => String(b.observationDate || b.reportPeriod || '').localeCompare(String(a.observationDate || a.reportPeriod || '')));

const embedded = JSON.stringify(records).replace(/</g, '\\u003c');
const generatedOn = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="California transmission project history: costs, schedules, cancellations, project categories, and citations.">
  <title>California transmission project history</title>
  <style>
    :root { --navy:#103b5d; --navy2:#0c2f4a; --blue:#2b6f99; --ink:#182430; --muted:#617080; --line:#dbe3ea; --pale:#f4f7f9; --amber:#d9a441; --green:#31815b; --red:#ba4a49; }
    * { box-sizing:border-box; } body { margin:0; font:14px/1.45 Arial, Helvetica, sans-serif; color:var(--ink); background:var(--pale); }
    a { color:#0b5e91; } button,select,input { font:inherit; } .top { color:#fff; background:linear-gradient(115deg,var(--navy2),var(--navy)); padding:32px max(24px, calc((100% - 1240px)/2)); }
    .top h1 { margin:0 0 8px; font-size:30px; line-height:1.1; letter-spacing:-.4px; } .top p { margin:0; max-width:780px; color:#dbe8f0; }
    .frame { max-width:1240px; margin:0 auto; padding:22px 24px 52px; } .notice { margin:0 0 18px; padding:12px 14px; background:#fff8e8; border-left:4px solid var(--amber); color:#58441e; }
    .controls { display:grid; grid-template-columns:2fr repeat(4,1fr) auto; gap:10px; align-items:end; background:#fff; border:1px solid var(--line); padding:14px; border-radius:8px; box-shadow:0 1px 3px #103b5d10; }
    label { display:grid; gap:4px; color:#405364; font-size:12px; font-weight:bold; } input,select { width:100%; min-width:0; padding:8px 9px; border:1px solid #b9c8d4; border-radius:4px; background:#fff; color:var(--ink); }
    button { padding:9px 12px; border:0; border-radius:4px; background:var(--navy); color:#fff; cursor:pointer; white-space:nowrap; } button:hover { background:#0b2c45; }
    .meta { display:flex; justify-content:space-between; align-items:center; gap:10px; color:var(--muted); margin:14px 1px; font-size:12px; }
    .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin:0 0 20px; } .kpi { background:#fff; border:1px solid var(--line); border-radius:8px; padding:14px; min-height:96px; }
    .kpi .num { font-size:25px; font-weight:bold; color:var(--navy); line-height:1.15; } .kpi .label { margin-top:6px; color:var(--muted); font-size:12px; }
    .grid { display:grid; grid-template-columns:1.05fr .95fr; gap:16px; margin-bottom:18px; } .panel { background:#fff; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    .panel h2 { font-size:16px; margin:0; padding:13px 15px; background:#eaf1f6; color:var(--navy2); } .panel .inside { padding:12px 15px; }
    .bar-row { display:grid; grid-template-columns:minmax(135px,1.1fr) 2fr 56px; gap:8px; align-items:center; margin:8px 0; font-size:12px; } .track { height:10px; background:#e8eef2; border-radius:8px; overflow:hidden; } .bar { height:100%; background:var(--blue); border-radius:8px; }
    .definition { color:#4c5c6b; font-size:12px; margin:0; } .definition strong { color:var(--ink); }
    .history-head { display:flex; justify-content:space-between; gap:15px; align-items:end; padding:0 0 10px; } .history-head h2 { margin:0; font-size:18px; color:var(--navy2); }
    .table-wrap { overflow:auto; background:#fff; border:1px solid var(--line); border-radius:8px; max-height:610px; } table { width:100%; min-width:1080px; border-collapse:collapse; } th { position:sticky; top:0; background:var(--navy); color:#fff; text-align:left; padding:9px; font-size:12px; z-index:1; } td { padding:9px; border-bottom:1px solid #e7edf1; vertical-align:top; font-size:12px; } tr.data-row { cursor:pointer; } tr.data-row:hover { background:#f1f7fb; } .project { font-weight:bold; color:#173e5a; } .small { display:block; color:var(--muted); font-size:11px; margin-top:2px; } .tag { display:inline-block; padding:2px 6px; border-radius:999px; background:#edf2f5; color:#415361; font-size:11px; white-space:nowrap; } .cancel { background:#fdeaea; color:#8f2f2e; } .positive { color:var(--green); font-weight:bold; } .negative { color:var(--red); font-weight:bold; }
    .detail { margin-top:16px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; } .detail[hidden] { display:none; } .detail h2 { margin:0 0 5px; color:var(--navy2); } .detail-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px 20px; margin-top:14px; } .detail-grid div { min-width:0; } .detail-grid dt { color:var(--muted); font-size:11px; font-weight:bold; } .detail-grid dd { margin:2px 0 0; overflow-wrap:anywhere; } .cite { padding:12px; border-radius:5px; background:#f4f8fa; margin-top:15px; }
    footer { color:var(--muted); font-size:12px; margin-top:20px; } @media (max-width:900px) { .controls { grid-template-columns:repeat(2,1fr); } .kpis { grid-template-columns:repeat(2,1fr); } .grid { grid-template-columns:1fr; } .detail-grid { grid-template-columns:1fr 1fr; } } @media (max-width:560px) { .top h1 { font-size:25px; } .frame { padding:16px; } .controls { grid-template-columns:1fr; } .kpis,.detail-grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <header class="top"><h1>California transmission project history</h1><p>Project-level public evidence on costs, schedules, cancellations, path and scope history. Use the filters to trace a project across plan cycles, utility reports, and cited public records.</p></header>
  <main class="frame">
    <p class="notice"><strong>How to read this page:</strong> each row is an observation from a cited public source, not a unique project. Filter by <strong>Project ID</strong> or project name to view a project’s change history. Cost values are in the source-reported dollar year unless otherwise shown.</p>
    <section class="controls" aria-label="Dataset filters">
      <label>Search project or ID<input id="search" type="search" placeholder="e.g., Tehachapi or PG&E|5541486"></label>
      <label>Utility<select id="utility"></select></label>
      <label>Project category<select id="category"></select></label>
      <label>Source stream<select id="stream"></select></label>
      <label>Status<select id="status"></select></label>
      <button id="download">Download filtered CSV</button>
    </section>
    <div class="meta"><span id="count"></span><span>Dataset snapshot generated ${generatedOn} · <a href="california_transmission_project_timeline_simple.xlsx">Download workbook</a></span></div>
    <section class="kpis" id="kpis"></section>
    <section class="grid">
      <article class="panel"><h2>Project categories</h2><div class="inside" id="categories"></div></article>
      <article class="panel"><h2>Definitions and limits</h2><div class="inside"><p class="definition"><strong>Cost comparison:</strong> positive reported final cost and positive original estimate in the same operational actual-final-cost utility record.</p><p class="definition"><strong>Schedule shift:</strong> latest utility report with both original and current in-service dates. A delay is more than 90 days later.</p><p class="definition"><strong>Categories:</strong> title-based screens for HVDC/converter, reconductor/rebuild, substation/transformer, upgrade/capacity addition, line/cable, and other. The available records do not consistently support greenfield versus existing-ROW classification.</p><p class="definition"><strong>Citations:</strong> click an observation to see the source ID, locator, source title, and original URL.</p></div></article>
    </section>
    <section class="history-head"><div><h2>Project-history observations</h2><span class="small" id="showing"></span></div></section>
    <div class="table-wrap"><table><thead><tr><th>Project</th><th>Utility</th><th>Category</th><th>Report / status</th><th>Cost ($M)</th><th>In-service date</th><th>Source citation</th></tr></thead><tbody id="rows"></tbody></table></div>
    <section class="detail" id="detail" hidden></section>
    <footer>Static HTML dashboard. Share this file together with the linked workbook, or upload both files to a static host to make the workbook link available online.</footer>
  </main>
  <script>
    const DATA = ${embedded};
    const $ = id => document.getElementById(id);
    const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
    const money = value => value === null || value === undefined ? '—' : '$' + Number(value).toLocaleString(undefined,{maximumFractionDigits:1}) + 'M';
    const choose = (id, values) => { const el=$(id); el.innerHTML='<option value="">All</option>'+values.sort((a,b)=>a.localeCompare(b)).map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join(''); };
    choose('utility',[...new Set(DATA.map(d=>d.utility))]); choose('category',[...new Set(DATA.map(d=>d.category))]); choose('stream',[...new Set(DATA.map(d=>d.stream))]); choose('status',[...new Set(DATA.map(d=>d.status))]);
    const active = () => { const search=$('search').value.trim().toLowerCase(); const fields=['utility','category','stream','status']; return DATA.filter(d => (!search || [d.project,d.projectId,d.crosswalk].join(' ').toLowerCase().includes(search)) && fields.every(field => !$(field).value || d[field] === $(field).value)); };
    const sources = rows => new Set(rows.map(d=>d.sourceId).filter(Boolean)).size;
    const comparable = rows => rows.filter(d=>d.stream==='Utility TPR actual final cost' && d.reportedCostM>0 && d.initialCostM>0);
    const delayDays = d => d.currentIsd && d.originalIsd ? (new Date(d.currentIsd)-new Date(d.originalIsd))/86400000 : null;
    const render = () => {
      const rows=active(), ids=new Set(rows.map(d=>d.projectId).filter(id=>id!=='No project ID')), comp=comparable(rows), costUp=comp.filter(d=>d.reportedCostM>d.initialCostM), dates=rows.filter(d=>delayDays(d)!==null), delayed=dates.filter(d=>delayDays(d)>90), cancels=rows.filter(d=>d.cancellationFlag==='Yes');
      $('count').textContent=rows.length.toLocaleString()+' observations after filters · '+ids.size.toLocaleString()+' project IDs';
      const cards=[['Project IDs',ids.size],['Observations',rows.length],['Cited sources',sources(rows)],['Cost increases',costUp.length+' / '+comp.length],['Delays >90 days',delayed.length+' / '+dates.length]];
      $('kpis').innerHTML=cards.map(([label,value])=>'<div class="kpi"><div class="num">'+esc(value)+'</div><div class="label">'+esc(label)+'</div></div>').join('');
      const cats=[...new Set(DATA.map(d=>d.category))].map(category=>[category,rows.filter(d=>d.category===category).length]).filter(([,n])=>n).sort((a,b)=>b[1]-a[1]); const max=Math.max(...cats.map(([,n])=>n),1);
      $('categories').innerHTML=cats.length?cats.map(([label,n])=>'<div class="bar-row"><span>'+esc(label)+'</span><div class="track"><div class="bar" style="width:'+(100*n/max)+'%"></div></div><strong>'+n.toLocaleString()+'</strong></div>').join(''):'<p class="definition">No matching observations.</p>';
      const shown=rows.slice(0,200); $('showing').textContent='Showing '+shown.length.toLocaleString()+' of '+rows.length.toLocaleString()+' matching observations. Select a row for the cited evidence.';
      $('rows').innerHTML=shown.map((d,i)=>{ const diff=d.reportedCostM!==null&&d.initialCostM!==null?d.reportedCostM-d.initialCostM:null; const cost=diff===null?money(d.reportedCostM):money(d.reportedCostM)+'<span class="small '+(diff>0?'positive':diff<0?'negative':'')+'">'+(diff>0?'+':'')+money(diff)+' vs. initial</span>'; const isd=d.currentIsd?esc(d.currentIsd)+(d.originalIsd&&d.originalIsd!==d.currentIsd?'<span class="small">original '+esc(d.originalIsd)+'</span>':''):'—'; const cite=d.sourceId?'<span class="tag">'+esc(d.sourceId)+'</span><span class="small">'+esc(d.sourceLocator||d.sourceTitle||'Citation available')+'</span>':'—'; return '<tr class="data-row" data-index="'+DATA.indexOf(d)+'"><td><span class="project">'+esc(d.project)+'</span><span class="small">'+esc(d.projectId)+'</span></td><td>'+esc(d.utility)+'</td><td><span class="tag">'+esc(d.category)+'</span></td><td>'+esc(d.reportPeriod||d.observationDate||'—')+'<span class="small">'+esc(d.status)+'</span></td><td>'+cost+'</td><td>'+isd+'</td><td>'+cite+'</td></tr>'; }).join('');
      document.querySelectorAll('.data-row').forEach(row=>row.addEventListener('click',()=>showDetail(DATA[Number(row.dataset.index)])));
      $('download').onclick=()=>download(rows); window.__cancelCount=cancels.length;
    };
    function showDetail(d) { const source=d.sourceUrl&&/^https?:/i.test(d.sourceUrl)?'<a href="'+esc(d.sourceUrl)+'" target="_blank" rel="noopener">Open source document</a>':'No direct URL recorded'; const detail=[['Project ID',d.projectId],['Utility',d.utility],['Category',d.category],['Source stream',d.stream],['Report period',d.reportPeriod],['Observation date',d.observationDate],['Status',d.status],['Approval cycle',d.approvalCycle],['Reported cost',money(d.reportedCostM)],['Reported cost year',d.reportedCostYear],['Initial cost',money(d.initialCostM)],['Initial cost year',d.initialCostYear],['Original in-service date',d.originalIsd],['Current in-service date',d.currentIsd],['Crosswalk',d.crosswalk]].map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value||'—')+'</dd></div>').join(''); $('detail').hidden=false; $('detail').innerHTML='<h2>'+esc(d.project)+'</h2><span class="small">Project History row '+d.row+'</span><dl class="detail-grid">'+detail+'</dl><div class="cite"><strong>Source citation</strong><br>'+esc(d.sourceId||'No source ID')+(d.sourceTitle?'<br>'+esc(d.sourceTitle):'')+(d.sourceLocator?'<br><em>'+esc(d.sourceLocator)+'</em>':'')+'<br>'+source+'</div>'; $('detail').scrollIntoView({behavior:'smooth',block:'nearest'}); }
    function download(rows) { const headers=['Project','Project ID','Utility','Category','Stream','Report period','Observation date','Status','Reported cost ($M)','Cost year','Initial cost ($M)','Initial cost year','Original ISD','Current ISD','Source ID','Source locator','Source title','Source URL']; const csv=[headers,...rows.map(d=>[d.project,d.projectId,d.utility,d.category,d.stream,d.reportPeriod,d.observationDate,d.status,d.reportedCostM,d.reportedCostYear,d.initialCostM,d.initialCostYear,d.originalIsd,d.currentIsd,d.sourceId,d.sourceLocator,d.sourceTitle,d.sourceUrl])].map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='california-transmission-filtered-history.csv'; a.click(); URL.revokeObjectURL(a.href); }
    ['search','utility','category','stream','status'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render)); render();
  </script>
</body>
</html>`;

await fs.writeFile(outputPath, html, 'utf8');
console.log(JSON.stringify({ outputPath, records: records.length, bytes: Buffer.byteLength(html), generatedOn }, null, 2));
