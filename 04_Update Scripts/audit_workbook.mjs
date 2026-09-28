import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath="/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/outputs/california_transmission_project_timeline_simple.xlsx";
const tpr=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/tpr_standardized.json","utf8"));
const tdf=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/tdf_historical.json","utf8"));
const plan2008=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2008_plan_previously_approved.json","utf8"));
const plan2009Proposals=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2009_request_window_proposals.json","utf8"));
const plan2006=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2006_operating_guide_excerpt.json","utf8"));
const plan2007Tehachapi=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2007_tehachapi_plan_project_history.json","utf8"));
const plan2007TehachapiBoard=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_csrtp_2006_tehachapi_board_presentation_project_history.json","utf8"));
const tehachapiLifecycle=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/tehachapi_lifecycle_primary_records.json","utf8"));
const plan2010Briefing=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2010_plan_briefing_project_history.json","utf8"));
const plan2010_2011=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2010_2011_plan_project_history.json","utf8"));
const plan2011_2012=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_2011_2012_plan_project_history.json","utf8"));
const laterPlanSpecs=[...Array.from({length:8},(_,index)=>{const start=2012+index;return {start,date:`${start+1}-03-${[20,25,27,28,17,22,29,25][index]}`};}),{start:2020,date:"2021-03-24"},{start:2021,date:"2022-03-17"},{start:2022,date:"2023-05-18"},{start:2023,date:"2024-05-23"},{start:2024,date:"2025-05-22"},{start:2025,date:"2026-05-19"}];
const laterPlans=await Promise.all(laterPlanSpecs.map(async({start,date})=>({period:`${start}/${start+1}`,date,data:JSON.parse(await fs.readFile(`/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_${start}_${start+1}_plan_project_history.json`,`utf8`))})));
const crosswalk=JSON.parse(await fs.readFile("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w/03_Processed Data/caiso_annual_plan_crosswalk.json","utf8"));
const cpi=new Map([[2002,77.214],[2003,78.967],[2004,81.081],[2005,83.832],[2006,86.536],[2007,89.004],[2008,92.422],[2009,92.093],[2010,93.603],[2011,96.558],[2012,98.556],[2013,100],[2014,101.622],[2015,101.743],[2016,103.027],[2017,105.221],[2018,107.791],[2019,109.745],[2020,111.098],[2021,116.318],[2022,125.626],[2023,130.797],[2024,134.655],[2025,138.289]]);
const blank=v=>v??"";
const asDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v??"")?new Date(`${v}T00:00:00Z`):null;
const grain=r=>/\b(program|blanket|bucket|placeholder|capital tools|misc\. contracts)\b/i.test(`${r.project_name??""} ${r.project_description??""}`)?"Review — program/bucket":"Project line item";
const excelDate=v=>v instanceof Date?v.toISOString().slice(0,10):typeof v==="number"?new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10):v??"";
const plain=v=>v instanceof Date?v.toISOString().slice(0,10):v??"";
const near=(a,b)=>a===""&&b===""?true:typeof a==="number"&&typeof b==="number"?Math.abs(a-b)<1e-8:String(a)===String(b);
const eventsByDate=new Map();
for(const e of tpr.events){const k=`${e.project_key}|${e.event_date}`;eventsByDate.set(k,[...(eventsByDate.get(k)??[]),e]);}
const signal=(key,date)=>{const e=eventsByDate.get(`${key}|${date}`)??[];return e.length?[...new Set(e.map(x=>`${x.event_category}: ${x.event_type}`))].join("; "):"No change signal in this report";};
const latest=new Map(tpr.latest_projects.map(r=>[r.project_key,`${r.snapshot_date}|${r.source_locator}`]));
const annualPlanRows=(plan,period,date)=>plan.records.map(r=>({project_name:blank(r.project_name),utility:blank(r.utility),stream:"CAISO annual plan",key:`CAISO-TPP-${period.replace("/","-")}|${r.table}|${r.table_row}`,period:`${period} CAISO Plan`,observation_date:date,status:r.status,approval:blank(r.approval)||(r.status.startsWith("Found to be needed")?"Found needed in Board-approved plan":""),initial_isd:"",reported_isd:blank(r.target_isd),location:blank(r.service_area),path:"",length:null,voltage:null,capacity:"",signal:r.status,available:`${period} final plan: previously-approved rows report status/expected ISD; projects found needed report cost, service area, and expected ISD where stated. Cost handling: ${r.cost_method}; exact source cost is in Source locator.`,eligibility:"CAISO annual-plan project row",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const annualPlanExcerptRows=plan2006.records.map(r=>({project_name:blank(r.project_name),utility:blank(r.utility),stream:"CAISO annual plan",key:`CAISO-TPP-2006|${r.table}|${r.table_row}`,period:"2006 CAISO Plan — Operating Guide excerpt",observation_date:plan2006.source.presentation_date,status:r.status,approval:"",initial_isd:"",reported_isd:blank(r.target_isd),location:blank(r.region),path:[r.scope&&`Scope: ${r.scope}`,r.system_impact&&`System impact: ${r.system_impact}`].filter(Boolean).join(" | "),length:null,voltage:null,capacity:blank(r.capacity),signal:r.status,available:"2006 plan Board-presentation excerpt: scope, system impact, target ISD, and MVA capacity where stated. It displays 12 rows, not the complete 2006 plan; cost is not reported.",eligibility:"CAISO annual-plan excerpt row",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const plan2007TehachapiRows=plan2007Tehachapi.records.map(r=>({project_name:blank(r.project_name),utility:blank(r.utility),stream:"CAISO planning report",key:`CAISO-RENEW-2007-TEHACHAPI|${r.table}|${r.table_row}`,period:"2007 Renewables Integration Report — Tehachapi plan of service (partial)",observation_date:plan2007Tehachapi.source.report_date,status:r.status,approval:r.approval,initial_isd:"",reported_isd:blank(r.target_isd),location:"Tehachapi Wind Resource Area / SCE",path:blank(r.path_scope),length:r.length_miles??null,voltage:r.voltage_kv??null,capacity:blank(r.capacity),signal:r.status,available:`2007 CAISO planning report: one Tehachapi aggregate and 14 planned facilities from Appendix G, Table 1. Planned dates are not actual completion. Cost handling: ${r.cost_method}; exact source cost is in Source locator.`,eligibility:"CAISO planning-report project row — partial Tehachapi baseline",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const plan2007TehachapiBoardRows=plan2007TehachapiBoard.records.map(r=>({project_name:blank(r.project_name),utility:blank(r.utility),stream:"CAISO Board presentation",key:`CAISO-CSRTP-2006-TEHACHAPI-BOARD-2007-01-24|${r.table}|${r.table_row}`,period:"2007 CSRTP-2006 Board presentation — Tehachapi recommendation (partial)",observation_date:plan2007TehachapiBoard.source.report_date,status:r.status,approval:r.approval,initial_isd:"",reported_isd:blank(r.target_isd),location:"Tehachapi Wind Resource Area / SCE",path:blank(r.path_scope),length:r.length_miles??null,voltage:r.voltage_kv??null,capacity:blank(r.capacity),signal:r.status,available:"January 2007 CAISO Board presentation: one Tehachapi management recommendation and 14 planned facilities from Slide 8. Planned ISDs are not actual completion. The presentation reports no project-level costs and does not establish Board approval.",eligibility:"CAISO Board-presentation project row — pre-approval plan snapshot",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const tehachapiLifecycleRows=tehachapiLifecycle.records.map(r=>({project_name:blank(r.project_name),utility:blank(r.utility),stream:tehachapiLifecycle.sources.find(s=>s.source_id===r.source_id)?.source_stream??"Primary project source",key:r.project_key,period:r.period,observation_date:r.observation_date,status:r.status,approval:blank(r.approval),initial_isd:"",reported_isd:blank(r.reported_isd),location:blank(r.location),path:blank(r.path_scope),length:r.length_miles??null,voltage:r.voltage_kv??null,capacity:blank(r.capacity),signal:r.status,available:`Primary Tehachapi lifecycle source. ${r.cost_method} Exact source evidence is retained in Source locator.`,eligibility:"Project-level lifecycle observation",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,reported_cost_year:r.cost_year??null,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const plan2010BriefingRows=plan2010Briefing.records.map(r=>({project_name:blank(r.project_name),utility:blank(r.utility),stream:"CAISO annual plan",key:`CAISO-TPP-2010-BRIEFING|${r.table}|${r.table_row}`,period:"2010 CAISO Plan — Board briefing (partial)",observation_date:plan2010Briefing.source.presentation_date,status:r.status,approval:r.approval,initial_isd:"",reported_isd:"",location:"",path:"",length:null,voltage:null,capacity:"",signal:r.status,available:"2010 plan Board briefing: names two Board-approved reliability projects. Slide 7 reports only 29-project and utility-level aggregates; it does not supply individual project cost, route, scope, or schedule values.",eligibility:"CAISO annual-plan briefing row",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const plan2008Row=r=>{const decision=blank(r.decision_status)||"Previously approved project status";const shortTerm=decision==="CAISO short-term-plan recommendation (not an approval)";const approval=decision==="CAISO management approved proposal"?"CAISO management approved":decision==="Proposal requiring CAISO Board approval"?"Requires CAISO Board approval":decision==="Not approved by CAISO management"?"Not approved":decision==="CAISO review in progress"?"Review in progress":"";const eligibility=shortTerm?"CAISO annual-plan short-term recommendation (not approval)":decision==="Not approved by CAISO management"||decision==="CAISO review in progress"?"CAISO annual-plan proposal row (not approved / in review)":"CAISO annual-plan project row";const available=shortTerm?"2008 short-term-plan recommendation: source-reported need, recommendation, and status where stated; no source cost or route/configuration detail.":`2008 plan: ${decision}. Cost handling: ${r.cost_method}; exact source cost is in Source locator.`;return {project_name:blank(r.project_name),utility:r.utility,stream:"CAISO annual plan",key:`CAISO-TPP-2008|${r.table.replace(/\\s+/g,"")}|${r.table_row}`,period:"2008 CAISO Plan",observation_date:"2008-01-28",status:r.note?`${decision} — ${r.note}`:decision,approval,initial_isd:"",reported_isd:blank(r.target_isd),location:blank(r.location),path:[r.path_scope&&`Scope: ${r.path_scope}`,r.purpose&&`Purpose / benefit: ${r.purpose}`].filter(Boolean).join(" | "),length:null,voltage:null,capacity:"",signal:r.note?`Status note: ${r.note}`:decision,available,eligibility,latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null};};
const plan2009ProposalRows=plan2009Proposals.records.map(r=>({project_name:r.project_name,utility:"CAISO",stream:"CAISO proposal snapshot",key:`CAISO-TPP-2009-PROP|${r.proposal_number}`,period:"2009 Request Window proposal snapshot",observation_date:plan2009Proposals.source.presentation_date,status:r.status,approval:"Proposal only — no final approval inferred",initial_isd:"",reported_isd:r.proposed_online_date,location:"",path:r.project_category,length:null,voltage:null,capacity:"",signal:r.status,available:"Project name, category/purpose, and proposed online date only; no cost or actual route/configuration.",eligibility:"CAISO 2009 request-window proposal (not a final plan approval)",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:null,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null}));
const sourceRows=[
  ...tpr.snapshots.map(r=>({project_name:blank(r.project_name),utility:r.utility,stream:"Utility TPR",key:r.project_key,period:r.snapshot_date,observation_date:r.snapshot_date,status:blank(r.project_status),approval:r.caiso_approval_year??"",initial_isd:blank(r.original_isd),reported_isd:blank(r.current_isd),location:blank(r.location),path:blank(r.project_description),length:r.length_miles,voltage:r.voltage_kv,capacity:blank(r.capacity),signal:signal(r.project_key,r.snapshot_date),available:"Cost, schedule, path and size fields when reported",eligibility:grain(r),latest:latest.get(r.project_key)===`${r.snapshot_date}|${r.source_locator}`?"Yes":"No",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.current_total_cost_k,initial_cost_k:r.original_cost_midpoint_k,initial_isd_date:r.original_isd,reported_isd_date:r.current_isd})),
  ...tdf.observations.map(r=>({project_name:blank(r.project_name),utility:r.utility,stream:"CAISO TDF",key:r.project_key,period:r.period_label,observation_date:r.observation_date,status:blank(r.project_status??r.project_status_2023q2),approval:blank(r.approval_cycle),initial_isd:blank(r.original_isd),reported_isd:blank(r.observed_isd),location:"",path:"",length:null,voltage:null,capacity:"",signal:r.note==="In-Service"?"Status: in service":"Schedule/status observation",available:"Schedule and status only in this report; no cost/path/size field",eligibility:"CAISO TDF project row",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:null,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null})),
  ...annualPlanExcerptRows,
  ...plan2007TehachapiBoardRows,
  ...plan2007TehachapiRows,
  ...tehachapiLifecycleRows,
  ...plan2010BriefingRows,
  ...plan2008.records.map(plan2008Row),
  ...plan2009ProposalRows,
  ...plan2010_2011.records.map(r=>({project_name:blank(r.project_name),utility:r.utility,stream:"CAISO annual plan",key:`CAISO-TPP-2010-2011|${r.table.replace(/\\s+/g,"")}|${r.table_row}`,period:"2010/2011 CAISO Plan",observation_date:"2011-05-18",status:r.status,approval:r.table==="Table 8.2-2"?"Recommended for Board approval":"",initial_isd:"",reported_isd:blank(r.target_isd),location:blank(r.service_area),path:[r.path_scope&&`Scope: ${r.path_scope}`].filter(Boolean).join(" | "),length:null,voltage:null,capacity:blank(r.capacity),signal:r.status,available:`2010/11 plan: status and target ISD for previously approved rows; cost, service area, and target ISD for new reliability rows where reported. Cost handling: ${r.cost_method}; exact source cost is in Source locator.`,eligibility:"CAISO annual-plan project row",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null})),
  ...plan2011_2012.records.map(r=>({project_name:blank(r.project_name),utility:r.utility,stream:"CAISO annual plan",key:`CAISO-TPP-2011-2012|${r.table.replace(/\\s+/g,"")}|${r.table_row}`,period:"2011/2012 CAISO Plan",observation_date:"2012-03-14",status:r.status,approval:"",initial_isd:"",reported_isd:blank(r.target_isd),location:blank(r.service_area),path:[r.submission_type&&`Submission type: ${r.submission_type}`].filter(Boolean).join(" | "),length:null,voltage:null,capacity:"",signal:r.status,available:`2011/12 plan: status and expected ISD for previously approved rows; cost, service area, and in-service date for new reliability rows where reported. Cost handling: ${r.cost_method}; exact source cost is in Source locator.`,eligibility:"CAISO annual-plan project row",latest:"n.a.",source_id:r.source_id,locator:r.source_locator,url:r.source_url,title:r.source_title,current_cost_k:r.cost_value_k,initial_cost_k:null,initial_isd_date:null,reported_isd_date:null})),
  ...laterPlans.flatMap(plan=>annualPlanRows(plan.data,plan.period,plan.date))
].sort((a,b)=>`${a.observation_date}|${a.project_name}`.localeCompare(`${b.observation_date}|${b.project_name}`));
const crosswalksByProjectKey=new Map();
for(const link of crosswalk.records){for(const key of link.project_keys??[])crosswalksByProjectKey.set(key,[...(crosswalksByProjectKey.get(key)??[]),link]);}
for(const row of sourceRows){const links=crosswalksByProjectKey.get(row.key)??[];row.crosswalk_id=links.map(link=>link.crosswalk_id).join(" | ");row.crosswalk_method=[...new Set(links.map(link=>link.match_method))].join(" | ");row.crosswalk_confidence=[...new Set(links.map(link=>link.confidence))].join(" | ");row.crosswalk_evidence=links.map(link=>`${link.crosswalk_id}: ${link.match_rationale} ${link.evidence}`).join(" || ");}
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
wb.recalculate();
const history=wb.worksheets.getItem("Project History");
const actual=history.getRange(`A5:AN${sourceRows.length+4}`).values;
const selected=Number(wb.worksheets.getItem("Inflation").getRange("G4").values[0][0]);
const failures=[];
// Project History is intentionally sortable/filterable.  Project ID identifies a
// project and therefore repeats across report periods. Reconcile each historical
// observation by Project ID + period + observation date + source + exact locator,
// never by row order.
const auditKey=(projectId,period,observationDate,sourceId,locator)=>[projectId,period,excelDate(observationDate),sourceId,locator].map(v=>String(v??"")).join("\u001F");
const actualByKey=new Map();
const duplicateWorkbookAuditKeys=[];
for(const row of actual){
  const key=auditKey(row[3],row[4],row[5],row[28],row[29]);
  if(actualByKey.has(key))duplicateWorkbookAuditKeys.push(key);
  actualByKey.set(key,row);
}
const expectedKeys=new Set();
const duplicateExpectedAuditKeys=[];
for(const row of sourceRows){
  const key=auditKey(row.key,row.period,row.observation_date,row.source_id,row.locator);
  if(expectedKeys.has(key))duplicateExpectedAuditKeys.push(key);
  expectedKeys.add(key);
}
const missingRecordKeys=sourceRows.filter(row=>!actualByKey.has(auditKey(row.key,row.period,row.observation_date,row.source_id,row.locator))).map(row=>row.key);
const unexpectedRecordKeys=[...actualByKey.keys()].filter(key=>!expectedKeys.has(key));
const add=(projectId,column,expected,actualValue)=>{if(!near(expected,actualValue))failures.push({project_id:projectId,column,expected,actual:actualValue});};
for(let i=0;i<sourceRows.length;i++){
  const r=sourceRows[i],a=actualByKey.get(auditKey(r.key,r.period,r.observation_date,r.source_id,r.locator));
  if(!a){
    failures.push({project_id:r.key,column:"Project ID",expected:r.key,actual:"Missing from workbook"});
    continue;
  }
  const current=typeof r.current_cost_k==="number"?r.current_cost_k/1000:"";
  const reportYear=current!==""?(Number.isInteger(r.reported_cost_year)?r.reported_cost_year:["Utility TPR","CAISO annual plan","CAISO planning report","CAISO Board presentation"].includes(r.stream)?Number(r.observation_date.slice(0,4)):""):"";
  const reportedSelected=current!==""&&cpi.has(reportYear)?current*cpi.get(selected)/cpi.get(reportYear):current!==""?"n.a.":"";
  const initial=typeof r.initial_cost_k==="number"?r.initial_cost_k/1000:"";
  const approvalYear=initial!==""&&typeof r.approval==="number"?r.approval:"";
  const initialSelected=initial!==""&&cpi.has(approvalYear)?initial*cpi.get(selected)/cpi.get(approvalYear):initial!==""?"n.a.":"";
  const nominal=current!==""&&initial!==""?current-initial:"";
  const adjusted=typeof reportedSelected==="number"&&typeof initialSelected==="number"?reportedSelected-initialSelected:"";
  const initialDate=asDate(r.initial_isd_date),reportedDate=asDate(r.reported_isd_date);
  const shift=initialDate&&reportedDate?(reportedDate-initialDate)/86400000/365.25:"";
  const expected=[r.project_name,r.utility,r.stream,r.key,r.period,r.observation_date,r.status,r.approval,current,reportYear,reportedSelected,initial,approvalYear,initialSelected,nominal,adjusted,r.initial_isd,r.reported_isd,shift,r.location,r.path,r.length??"",r.voltage??"",r.capacity,r.signal,r.available,r.eligibility,r.latest,r.source_id,r.locator,r.url,r.title,r.current_cost_k??"",r.initial_cost_k??"",initialDate?plain(initialDate):"",reportedDate?plain(reportedDate):"",r.crosswalk_id,r.crosswalk_method,r.crosswalk_confidence,r.crosswalk_evidence];
  for(let c=0;c<expected.length;c++){
    const actualValue=[5,34,35].includes(c)?excelDate(a[c]):a[c]??"";
    add(r.key,c<26?String.fromCharCode(65+c):`A${String.fromCharCode(65+c-26)}`,expected[c]??"",actualValue);
  }
}
const summary={
  sourceRows:sourceRows.length,
  workbookRows:actual.length,
  utilityTprRows:tpr.snapshots.length,
  caisoTdfRows:tdf.observations.length,
  caisoAnnualPlanRows:plan2006.records.length+plan2010Briefing.records.length+plan2008.records.length+plan2010_2011.records.length+plan2011_2012.records.length+laterPlans.reduce((total,plan)=>total+plan.data.records.length,0),
  caisoBoardPresentationRows:plan2007TehachapiBoard.records.length,
  caisoPlanningReportRows:plan2007Tehachapi.records.length,
  caisoProposalSnapshotRows:plan2009Proposals.records.length,
  caiso2006OperatingGuideExcerptRows:plan2006.records.length,
  caiso2010BriefingRows:plan2010Briefing.records.length,
  caiso2008AnnualPlanRows:plan2008.records.length,
  caiso2010_2011AnnualPlanRows:plan2010_2011.records.length,
  caiso2011_2012AnnualPlanRows:plan2011_2012.records.length,
  caiso2012_2025AnnualPlanRows:laterPlans.reduce((total,plan)=>total+plan.data.records.length,0),
  highConfidenceCrosswalkLinks:crosswalk.records.length,
  selectedDollarYear:selected,
  latestUtilityRows:[...latest].length,
  duplicateWorkbookAuditKeyCount:duplicateWorkbookAuditKeys.length,
  duplicateExpectedAuditKeyCount:duplicateExpectedAuditKeys.length,
  missingRecordCount:missingRecordKeys.length,
  unexpectedRecordCount:unexpectedRecordKeys.length,
  duplicateWorkbookAuditKeyExamples:duplicateWorkbookAuditKeys.slice(0,5),
  duplicateExpectedAuditKeyExamples:duplicateExpectedAuditKeys.slice(0,5),
  missingRecordExamples:missingRecordKeys.slice(0,5),
  unexpectedRecordExamples:unexpectedRecordKeys.slice(0,5),
  failures:failures.length,
  examples:failures.slice(0,20),
};
console.log(JSON.stringify(summary,null,2));
