const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => Number(v || 0).toLocaleString();
const money = v => Number.isFinite(v) ? '$' + Number(v).toLocaleString(undefined,{maximumFractionDigits:1}) + 'M' : '—';
const validUrl = v => /^https?:\/\//i.test(v || '') ? v : '';
const dateValue = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? Date.parse(v + 'T00:00:00Z') : NaN;
const year = v => /^\d{4}/.test(v || '') ? v.slice(0,4) : '';
const projectKey = d => d.projectId === 'SCE|MULTIPLE WORKORDERS' ? d.projectId + '|' + d.project.toLowerCase().trim() : d.projectId;
const sourceLinks = d => {
  const page = validUrl(d.sourcePage), file = validUrl(d.sourceUrl);
  return (page ? `<a href="${esc(page)}" target="_blank" rel="noopener noreferrer">Source web page</a>` : '') +
    (file ? `<a href="${esc(file)}" target="_blank" rel="noopener noreferrer">Exact cited file</a>` : '');
};
function rowObject(r,sources){const s=sources[r[18]] || [];return {row:r[0],project:r[1],utility:r[2],stream:r[3],projectId:r[4],reportPeriod:r[5],observationDate:r[6],status:r[7],approvalCycle:r[8],reportedCostM:r[9],reportedCostYear:r[10],initialCostM:r[11],initialCostYear:r[12],originalIsd:r[13],currentIsd:r[14],crosswalk:r[15],category:r[16],cancellationFlag:r[17],sourceId:s[0],sourceLocator:s[1],sourceUrl:s[2],sourceTitle:s[3],sourcePage:r[19],categoryBasis:r[20]};}
function metric(label,value,note=''){return `<div class="metric"><div class="metric-value">${esc(value)}</div><div class="metric-label">${esc(label)}</div>${note?`<div class="metric-note">${esc(note)}</div>`:''}</div>`;}
function options(el,values){el.innerHTML='<option value="">All</option>'+[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)).map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');}
function bars(el,entries,{percent=false,color=''}={}){if(!entries.length){el.innerHTML='<p class="empty">No matching records.</p>';return;}const max=percent?100:Math.max(1,...entries.map(x=>x[1]));el.innerHTML=entries.map(([label,value,denom])=>`<div class="bar-row"><span class="bar-label">${esc(label)}</span><div class="track"><div class="bar ${color}" style="width:${100*value/max}%"></div></div><span class="bar-value">${percent?`${Math.round(value)}%`:num(value)}${denom===undefined?'':` / ${num(denom)}`}</span></div>`).join('');}
function latestRows(rows){const map=new Map();for(const d of rows){const key=projectKey(d),old=map.get(key);if(!old||(d.observationDate||'')>(old.observationDate||'')||((d.observationDate||'')===(old.observationDate||'')&&d.row>old.row))map.set(key,d);}return [...map.values()];}
function groupProjects(rows){const map=new Map();for(const d of rows){const key=projectKey(d),group=map.get(key)||{key,rows:[]};group.rows.push(d);map.set(key,group);}for(const group of map.values()){group.rows.sort((a,b)=>(b.observationDate||'').localeCompare(a.observationDate||'')||b.row-a.row);group.latest=group.rows[0];group.first=group.rows[group.rows.length-1];}return [...map.values()];}
function summary(rows){const projects=groupProjects(rows),withPage=rows.filter(d=>validUrl(d.sourcePage)).length,withLocator=rows.filter(d=>d.sourceLocator).length;
  $('summary-metrics').innerHTML=metric('Source observations',num(rows.length),'A project can appear in many reports')+metric('Project keys',num(projects.length),'Source IDs; some cross-source links unresolved')+metric('Source web pages',num(withPage),'Exact cited files also retained')+metric('Cited locators',num(withLocator),'Table, row, page, or worksheet reference');
  const streams=new Map();for(const d of rows)streams.set(d.stream,(streams.get(d.stream)||0)+1);bars($('stream-bars'),[...streams].sort((a,b)=>b[1]-a[1]));
  const years=new Map();for(const d of rows){const y=year(d.observationDate);if(y)years.set(y,(years.get(y)||0)+1);}const ordered=[...years].sort((a,b)=>a[0].localeCompare(b[0])),max=Math.max(...ordered.map(x=>x[1]));$('year-bars').innerHTML=ordered.map(([y,n])=>`<div class="year-col" title="${esc(y)}: ${num(n)} observations"><div class="track"><div class="bar" style="height:${Math.max(3,100*n/max)}%"></div></div><span class="year-label">${esc(y)}</span></div>`).join('');
  const coverage=[...streams].sort((a,b)=>b[1]-a[1]).map(([stream,count])=>{const subset=rows.filter(d=>d.stream===stream),pct=f=>Math.round(100*subset.filter(f).length/count)+'%';return `<tr><td>${esc(stream)}</td><td class="numeric">${num(count)}</td><td class="numeric">${pct(d=>Number.isFinite(d.reportedCostM))}</td><td class="numeric">${pct(d=>!!d.originalIsd)}</td><td class="numeric">${pct(d=>!!d.currentIsd)}</td><td class="numeric">${pct(d=>!!d.sourceLocator)}</td><td class="numeric">${pct(d=>!!validUrl(d.sourcePage))}</td></tr>`;});$('coverage-table').querySelector('tbody').innerHTML=coverage.join('');
  const basis=new Map();for(const d of rows)basis.set(d.categoryBasis,(basis.get(d.categoryBasis)||0)+1);bars($('category-basis'),[...basis].sort((a,b)=>b[1]-a[1]),{color:'teal'});
}
function observation(d){return `<div class="observation"><div class="obs-top"><div><div class="obs-title">${esc(d.reportPeriod||d.stream||'Observation')}</div><span class="subline">${esc(d.stream)} · ${esc(d.status||'Status not recorded')}</span></div><span class="obs-date">${esc(d.observationDate||'Date not recorded')}</span></div><dl class="obs-grid"><div><dt>Reported cost</dt><dd>${money(d.reportedCostM)}${d.reportedCostYear?` · ${esc(d.reportedCostYear)} dollars`:''}</dd></div><div><dt>Initial cost</dt><dd>${money(d.initialCostM)}${d.initialCostYear?` · ${esc(d.initialCostYear)} dollars`:''}</dd></div><div><dt>Original in-service</dt><dd>${esc(d.originalIsd||'—')}</dd></div><div><dt>Current in-service</dt><dd>${esc(d.currentIsd||'—')}</dd></div></dl><div class="cite"><strong>${esc(d.sourceId||'Source not indexed')}</strong>${d.sourceTitle?` · ${esc(d.sourceTitle)}`:''}${d.sourceLocator?`<br>${esc(d.sourceLocator)}`:''}<br>${sourceLinks(d)}</div></div>`;}
function projects(rows){const groups=groupProjects(rows).sort((a,b)=>a.latest.project.localeCompare(b.latest.project));let filtered=groups;let selected=null;const search=$('search'),utility=$('utility'),category=$('category');options(utility,rows.map(d=>d.utility));options(category,rows.map(d=>d.category));
  function show(group){selected=group.key;history.replaceState(null,'','?id='+encodeURIComponent(group.key));const d=group.latest;$('project-detail').hidden=false;$('project-detail').innerHTML=`<div class="detail-header"><div><h2>${esc(d.project)}</h2><span class="subline">${esc(d.projectId)} · ${esc(d.utility)}</span></div><button type="button" class="secondary" id="close-detail">Close</button></div><div class="detail-meta"><span class="tag">${num(group.rows.length)} observations</span><span class="tag">${esc(d.category)}</span><span class="tag">${esc(d.categoryBasis||'Category basis not recorded')}</span>${d.crosswalk?`<span class="tag">Crosswalk: ${esc(d.crosswalk)}</span>`:''}</div>${group.rows.map(observation).join('')}`;$('close-detail').onclick=()=>{$('project-detail').hidden=true;selected=null;history.replaceState(null,'','./projects.html');};$('project-detail').scrollIntoView({behavior:'smooth',block:'start'});}
  function render(){const q=search.value.trim().toLowerCase();filtered=groups.filter(g=>(!q||g.rows.some(d=>(d.project+' '+d.projectId+' '+(d.crosswalk||'')).toLowerCase().includes(q)))&&(!utility.value||g.rows.some(d=>d.utility===utility.value))&&(!category.value||g.rows.some(d=>d.category===category.value)));$('project-count').textContent=`${num(filtered.length)} project keys match · ${num(filtered.reduce((n,g)=>n+g.rows.length,0))} observations`;$('project-foot').textContent=`Showing ${num(Math.min(100,filtered.length))} of ${num(filtered.length)} matching project keys. Narrow the filters to find a specific project.`;$('project-rows').innerHTML=filtered.slice(0,100).map(g=>{const d=g.latest;return `<tr tabindex="0" data-key="${esc(g.key)}"><td><span class="project-title">${esc(d.project)}</span><span class="subline">${esc(d.projectId)}</span></td><td>${esc(d.utility)}</td><td>${esc(d.category)}</td><td class="numeric">${num(g.rows.length)}</td><td>${esc(g.first.observationDate||'—')} – ${esc(d.observationDate||'—')}</td><td>${esc(d.status||'—')}</td></tr>`;}).join('');$('project-rows').querySelectorAll('tr[data-key]').forEach(tr=>{const open=()=>show(filtered.find(g=>g.key===tr.dataset.key));tr.addEventListener('click',open);tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});});}
  [search,utility,category].forEach(el=>el.addEventListener(el===search?'input':'change',render));$('download-projects').onclick=()=>download(filtered.flatMap(g=>g.rows));render();const param=new URLSearchParams(location.search).get('id');if(param){const found=groups.find(g=>g.key===param);if(found)show(found);}
}
function download(rows){const headers=['Project','Project ID','Utility','Category','Category basis','Source stream','Report period','Observation date','Status','Reported cost ($M)','Reported cost dollar year','Initial cost ($M)','Initial cost dollar year','Original in-service date','Current in-service date','Crosswalk ID','Source ID','Source locator','Source title','Source web page','Exact source file'];const cells=rows.map(d=>[d.project,d.projectId,d.utility,d.category,d.categoryBasis,d.stream,d.reportPeriod,d.observationDate,d.status,d.reportedCostM,d.reportedCostYear,d.initialCostM,d.initialCostYear,d.originalIsd,d.currentIsd,d.crosswalk,d.sourceId,d.sourceLocator,d.sourceTitle,d.sourcePage,d.sourceUrl]);const csv=[headers,...cells].map(row=>row.map(v=>{let s=String(v??'');if(/^[=+@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='california-transmission-project-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function analysis(rows){
  // Annual-average CPI-U (2013=100), matching the workbook Inflation sheet.
  const cpi={2002:77.214,2003:78.967,2004:81.081,2005:83.832,2006:86.536,2007:89.004,2008:92.422,2009:92.093,2010:93.603,2011:96.558,2012:98.556,2013:100,2014:101.622,2015:101.743,2016:103.027,2017:105.221,2018:107.791,2019:109.745,2020:111.098,2021:116.318,2022:125.626,2023:130.797,2024:134.655,2025:138.289};
  $('dollar-year').insertAdjacentHTML('beforeend',Object.keys(cpi).reverse().map(y=>`<option value="${y}">${y} dollars (CPI-U)</option>`).join(''));
  const comparableCost=d=>{const target=$('dollar-year').value;if(target==='nominal')return [d.reportedCostM,d.initialCostM];const reported=cpi[d.reportedCostYear],initial=cpi[d.initialCostYear];return reported&&initial?[d.reportedCostM*cpi[target]/reported,d.initialCostM*cpi[target]/initial]:null;};
  const selectedUtilities=new Set(),selectedTypes=new Set(),selectedPeriods=new Set();
  const utilities=['PG&E','SCE','SDG&E','Other / mixed'],categories=[...new Set(rows.map(d=>d.category))].sort();
  const utilityGroup=d=>utilities.includes(d.utility)?d.utility:'Other / mixed';
  const periodLabels=['Before 2010','2010–2014','2015–2019','2020–2024','2025–2029','2030 or later'];
  const periodOf=d=>{const y=Number(year(d.originalIsd));return y<2010?periodLabels[0]:y<2015?periodLabels[1]:y<2020?periodLabels[2]:y<2025?periodLabels[3]:y<2030?periodLabels[4]:periodLabels[5];};
  const bucketLabels=['>1 year early','91–365 days early','Within ±90 days','91–180 days late','181–365 days late','1–2 years late','>2 years late'];
  const colors=['#376a97','#6a9dbf','#c4d3df','#dac585','#d49c51','#c77546','#ae4b4f'];
  const shiftDays=d=>(dateValue(d.currentIsd)-dateValue(d.originalIsd))/86400000;
  const bucket=d=>{const n=shiftDays(d);return n < -365?0:n < -90?1:n <= 90?2:n <= 180?3:n <= 365?4:n <= 730?5:6;};
  const counts=data=>{const result=Array(7).fill(0);data.forEach(d=>result[bucket(d)]++);return result;};
  let mode='share',currentSchedules=[];
  function chips(id,values,selected,resetId){
    $(id).innerHTML=values.map(v=>`<label class="type-choice"><input type="checkbox" value="${esc(v)}"><span>${esc(v)}</span></label>`).join('');
    $(id).querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{if(input.checked)selected.add(input.value);else selected.delete(input.value);render();}));
    $(resetId).onclick=()=>{selected.clear();$(id).querySelectorAll('input').forEach(input=>{input.checked=false;});render();};
  }
  chips('utility-options',utilities,selectedUtilities,'clear-utilities');
  chips('category-options',categories,selectedTypes,'clear-types');
  chips('period-options',periodLabels,selectedPeriods,'clear-periods');
  $('dollar-year').onchange=()=>render();
  $('share-mode').onclick=()=>{mode='share';render();};$('count-mode').onclick=()=>{mode='count';render();};
  $('delay-legend').innerHTML=bucketLabels.map((label,i)=>`<span class="legend-item"><span class="legend-swatch" style="background:${colors[i]}"></span>${esc(label)}</span>`).join('');
  function isolateType(category){
    selectedTypes.clear();selectedTypes.add(category);
    $('category-options').querySelectorAll('input').forEach(input=>{input.checked=input.value===category;});render();
    $('analysis-metrics').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function drilldown(title,data){
    const panel=$('delay-drilldown');panel.hidden=false;
    panel.innerHTML=`<h3>${esc(title)} · ${num(data.length)} project keys</h3>${data.length?`<ol class="drill-list">${data.slice(0,30).map(d=>`<li><a href="./projects.html?id=${encodeURIComponent(projectKey(d))}">${esc(d.project)}</a> <span class="muted">(${Math.round(shiftDays(d))>0?'+':''}${Math.round(shiftDays(d))} days)</span></li>`).join('')}</ol>${data.length>30?`<p class="fine">Showing the first 30 of ${num(data.length)}. Narrow the filters for the rest.</p>`:''}`:'<p class="empty">No matching project keys.</p>'}`;
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clickableBars(id,entries,{percent=false,color=''}={}){
    const el=$(id);if(!entries.length){el.innerHTML='<p class="empty">No matching project types.</p>';return;}
    const max=percent?100:Math.max(1,...entries.map(x=>x[1]));
    el.innerHTML=entries.map(([label,value,denom])=>`<button type="button" class="interactive-chart-row" data-type="${esc(label)}" title="Select ${esc(label)} in the project-type filter"><span class="bar-label">${esc(label)}</span><span class="track"><span class="bar ${color}" style="display:block;width:${100*value/max}%"></span></span><span class="bar-value">${percent?`${Math.round(value)}%`:num(value)}${denom===undefined?'':` / ${num(denom)}`}</span></button>`).join('');
    el.querySelectorAll('button[data-type]').forEach(button=>button.onclick=()=>isolateType(button.dataset.type));
  }
  function render(){
    $('filter-status').textContent=`Utilities: ${selectedUtilities.size?selectedUtilities.size+' selected':'all'} · Types: ${selectedTypes.size?selectedTypes.size+' selected':'all'} · Original in-service periods: ${selectedPeriods.size?selectedPeriods.size+' selected':'all'} (delay charts only)`;
    $('share-mode').classList.toggle('current',mode==='share');$('share-mode').setAttribute('aria-pressed',mode==='share');
    $('count-mode').classList.toggle('current',mode==='count');$('count-mode').setAttribute('aria-pressed',mode==='count');
    const scoped=rows.filter(d=>(!selectedUtilities.size||selectedUtilities.has(utilityGroup(d)))&&(!selectedTypes.size||selectedTypes.has(d.category)));
    const allCosts=latestRows(scoped.filter(d=>d.stream==='Utility TPR actual final cost'&&d.reportedCostM>0&&d.initialCostM>0));
    const costs=allCosts.filter(d=>comparableCost(d));
    const higher=costs.filter(d=>{const [final,initial]=comparableCost(d);return final>initial;});
    currentSchedules=latestRows(scoped.filter(d=>(d.stream==='Utility TPR'||d.stream==='Utility TPR actual final cost')&&Number.isFinite(dateValue(d.originalIsd))&&Number.isFinite(dateValue(d.currentIsd)))).filter(d=>!selectedPeriods.size||selectedPeriods.has(periodOf(d)));
    const schedules=currentSchedules,late=schedules.filter(d=>shiftDays(d)>90);
    const fixed=$('dollar-year').value!=='nominal';
    $('analysis-metrics').innerHTML=metric('Comparable final-cost records',num(costs.length),'One latest eligible row per project key')+metric(fixed?'Higher inflation-adjusted cost':'Higher nominal cost',costs.length?`${num(higher.length)} / ${num(costs.length)}`:'—','Reported final versus initial estimate')+metric('Schedule-date pairs',num(schedules.length),'One latest utility row per project key')+metric('Shifted >90 days later',schedules.length?`${num(late.length)} / ${num(schedules.length)}`:'—','Current versus original in-service date');
    $('distribution-definition').textContent=`${num(schedules.length)} utility TPR project keys with original and latest reported in-service dates. Negative shifts are earlier; positive shifts are later.`;
    const total=counts(schedules);
    $('delay-distribution').innerHTML=schedules.length?bucketLabels.map((label,i)=>`<button type="button" class="distribution-row dist-click" data-bin="${i}" title="Show projects shifted ${esc(label)}"><span>${esc(label)}</span><span class="track"><span class="bar" style="display:block;width:${100*total[i]/schedules.length}%"></span></span><span class="distribution-value">${Math.round(100*total[i]/schedules.length)}% · ${num(total[i])}</span></button>`).join(''):'<p class="empty">No projects with both dates match these filters.</p>';
    $('delay-distribution').querySelectorAll('button[data-bin]').forEach(button=>button.onclick=()=>drilldown(bucketLabels[Number(button.dataset.bin)],schedules.filter(d=>bucket(d)===Number(button.dataset.bin))));
    const visibleTypes=(selectedTypes.size?[...selectedTypes]:categories).filter(c=>schedules.some(d=>d.category===c));
    const maxCount=Math.max(1,...visibleTypes.map(c=>schedules.filter(d=>d.category===c).length));
    $('delay-stack').innerHTML=visibleTypes.length?visibleTypes.map(c=>{const subset=schedules.filter(d=>d.category===c),bins=counts(subset);return `<div class="stack-row"><div class="stack-label">${esc(c)}<span>n=${num(subset.length)}</span></div><div class="stack-track" role="group" aria-label="${esc(c)} delay distribution">${bins.map((n,i)=>n?`<button type="button" class="stack-segment" data-type="${esc(c)}" data-bin="${i}" style="width:${100*n/(mode==='share'?subset.length:maxCount)}%;background:${colors[i]}" title="${esc(c)} · ${esc(bucketLabels[i])}: ${num(n)} of ${num(subset.length)} (${Math.round(100*n/subset.length)}%)" aria-label="${esc(c)}, ${esc(bucketLabels[i])}, ${num(n)} of ${num(subset.length)} project keys"></button>`:'').join('')}</div><div class="stack-total">${num(subset.length)} keys</div></div>`;}).join(''):'<p class="empty">No eligible project types match these filters.</p>';
    $('delay-stack').querySelectorAll('button[data-bin]').forEach(button=>button.onclick=()=>drilldown(`${button.dataset.type} · ${bucketLabels[Number(button.dataset.bin)]}`,schedules.filter(d=>d.category===button.dataset.type&&bucket(d)===Number(button.dataset.bin))));
    $('delay-drilldown').hidden=true;
    $('cost-definition').textContent=`${num(costs.length)} operational utility TPR project keys with positive actual-final and initial costs${fixed?' and both cost-dollar years covered by CPI-U':''}.`;
    $('cost-year-note').textContent=fixed?`${num(allCosts.length-costs.length)} of ${num(allCosts.length)} eligible cost records excluded because a cost-dollar year is missing or outside the 2002–2025 annual CPI-U series (including 2026). Both costs are converted separately to ${$('dollar-year').value} dollars before comparison.`:'Nominal mode compares source-reported values without changing their dollar years; a higher number can reflect inflation alone. Select a year for a like-dollar comparison.';
    const activeTypes=categories.filter(c=>!selectedTypes.size||selectedTypes.has(c));
    const costBars=activeTypes.map(c=>{const subset=costs.filter(d=>d.category===c);return [c,subset.length?100*subset.filter(d=>{const [final,initial]=comparableCost(d);return final>initial;}).length/subset.length:0,subset.length];}).filter(x=>x[2]>=3).sort((a,b)=>b[1]-a[1]);
    clickableBars('cost-bars',costBars,{percent:true,color:'amber'});$('cost-bars').insertAdjacentHTML('beforeend','<p class="fine">Types with fewer than 3 comparable keys are omitted.</p>');
  }
  render();
}
async function main(){try{const response=await fetch('./data.json');if(!response.ok)throw Error('Could not load project data');const packed=await response.json();if(!Array.isArray(packed.rows)||!Array.isArray(packed.sources))throw Error('Dataset format is invalid');const rows=packed.rows.map(r=>rowObject(r,packed.sources));const page=document.body.dataset.page;if(page==='summary')summary(rows);else if(page==='projects')projects(rows);else if(page==='analysis')analysis(rows);$('loading').hidden=true;$('content').hidden=false;}catch(error){$('loading').hidden=true;$('error').hidden=false;$('error').textContent='The project dataset could not load. Please refresh this page.';console.error(error);}}
main();
