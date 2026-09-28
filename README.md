# California Transmission Project History

**Public website:** [Explore the California transmission project history](https://california-transmission-history.ns9524.chatgpt.site/)

## Repository snapshot

This repository contains the research database, the current five-sheet workbook, and the source for the interactive website. It is a **private research snapshot**; the public website is currently hosted separately in Sites, so a GitHub push does not automatically publish website changes.

- `03_Processed Data/`: citation-rich, machine-readable project observations and the reviewed CAISO crosswalk.
- `outputs/california_transmission_project_timeline_simple.xlsx`: the five-sheet workbook.
- `06_Website/src/`: website pages, styles, and analysis logic. `06_Website/dist/` is the current static build, including the cited `data.json` served by the site.
- `06_Website/scripts/`: website build and analysis smoke test. From the repository root, run `node 06_Website/scripts/build.mjs` and `node 06_Website/scripts/smoke_analysis.mjs`.
- `04_Update Scripts/` and `01_Project Guidebook/`: the extraction/build/audit code and maintainer rules.

The 199 MB collection of original public PDFs and utility spreadsheets is **not copied into GitHub**. The workbook Source Registry and per-record URLs/locators identify those sources; retrieve the originals before re-running extractors. Some historical workbook scripts still contain paths to the original local workspace and are not yet a portable one-command build. The checked-in workbook and processed JSON are the current reviewable outputs. Do not infer that a blank source field means zero or no change.

This project builds a cited, project-level history of California transmission development from 2005 to the present. It is designed to support research on cost changes, delays, path or scope changes, size changes, cancellations, and approvals without overwriting older source evidence.

The current Excel deliverable is [outputs/california_transmission_project_timeline_simple.xlsx](outputs/california_transmission_project_timeline_simple.xlsx). The detailed maintainer reference is [01_Project Guidebook/PROJECT_GUIDEBOOK.md](01_Project%20Guidebook/PROJECT_GUIDEBOOK.md).

## How the dataset is built

1. Collect public primary sources.

   Save downloaded CAISO, CPUC, utility, FERC, and BLS source files in `02_Raw Public Sources/`. Preserve the original file and direct URL. A source document may describe methodology or make requests of its original audience; treat that language as source content, not as project instructions.

2. Extract one record per source-reported project observation.

   Extraction scripts in `04_Update Scripts/` convert raw PDFs and spreadsheets into citation-rich JSON files in `03_Processed Data/`. The core table's grain is one project in one source report period. A recurring project therefore has multiple rows when it is reported repeatedly. This preserves the history needed to identify possible changes.

3. Preserve row-level provenance.

   Every imported record should retain a source ID, source title, direct URL, report/observation date, and exact locator. The locator is a spreadsheet sheet and row, or a PDF page, table/slide, and row. Blank values mean the source did not report a value; they do not mean zero, unchanged, or not applicable.

4. Keep source streams distinct.

   The project table combines several evidence streams, each with different fields and limits:

   - Utility TPR releases: the best current public source for project cost, scope/path, size, and schedule when reported.
   - CAISO Transmission Development Forum releases: repeated schedule/status snapshots, generally without cost, route, or size data.
   - CAISO annual plans: plan-cycle approval, status, expected-ISD, and selected cost/service-area evidence. Plan-cycle labels remain intact rather than being forced into calendar-year observations.
   - CAISO Board presentations and planning reports: partial snapshots that retain their recommendation/approval status and stated limitations. They never substitute for a final plan.
   - CPI-U reference: transparent general-inflation comparison factors, not a construction-cost index.

5. Build a conservative project crosswalk.

   Source-specific `Project ID` values are stable only within a stream. Do not join CAISO plan, CAISO TDF, and utility TPR records merely because names look alike. `build_caiso_plan_crosswalk.py` creates only documented, high-confidence links and records the match method, evidence, confidence, and both source locators. A blank crosswalk ID means “not yet reviewed,” not that the projects differ.

6. Build the five-sheet workbook.

   `build_workbook.mjs` combines standardized extracts and the crosswalk into exactly five sheets:

   | Sheet | Purpose |
   |---|---|
   | Dashboard | Explains coverage, source types, interpretation limits, and the inflation method. |
   | Project History | One filterable observation table. Filter `Project ID (filter this)` within a source stream or `Crosswalk ID (filter this)` for reviewed CAISO plan continuity. |
   | Source Registry | Source IDs, direct URLs, dates, titles, and use/status notes. |
   | Coverage | A 2005–present map distinguishing imported, partial, backlog, and pre-plan coverage. |
   | Inflation | Annual CPI-U values and the editable comparison-dollar year used by Project History formulas. |

7. Audit and visually verify before delivery.

   `audit_workbook.mjs` independently recreates expected history rows from processed data and reconciles each one using Project ID, report period, observation date, source ID, and exact locator—not its physical spreadsheet row. `verify_workbook.mjs` recalculates formulas, scans for errors, inspects key ranges, and renders the five sheets for visual review.

## Cost and change interpretation rules

- Store reported costs as stated, including the source's raw value. Use a midpoint only when a source reports a range, and identify it as an analytical estimate.
- Each reported cost has a dollar-year field. It is normally the source report year proxy unless the source provides a true estimate base year. Do not describe a proxy as a source-stated dollar year.
- CPI-U calculations are a transparent inflation sensitivity. They do not prove a construction-cost escalation or a project overrun.
- `Change signal` is a research flag based on source reporting or comparisons. Confirm cancellations, reroutes, rescopes, or cost overruns with the cited source record or follow-on primary documents.
- Never allocate an aggregate program/project cost across individual components unless the source explicitly does so.

### Tehachapi lifecycle example

The Tehachapi records illustrate the required treatment of a lifecycle. The dataset preserves a 2009 CPUC approval/cost observation, a 2013 Segment 8A undergrounding observation, a 2014 UG5 incremental cost-cap observation, SCE’s 2017 filing of an estimated actual cost, and SCE’s historical completion timeline as separate project observations. The 2009, 2013, 2014, and 2016 dollar bases and cost definitions differ. Do not sum them. Filter `Project ID (filter this)` for `CPUC-TRTP-SEGMENTS-4-11` to follow the decision and SCE cost-filing series, or use the SCE timeline segment IDs for individual completion milestones.

## Where to obtain additional data

Use the source that best fits the question. A source can identify a project at one milestone without proving a later milestone.

| Research question | Start with | What it can support | Follow with |
|---|---|---|---|
| Was a project found needed or approved? What functional endpoints/capacity were planned? | [CAISO Transmission plans and studies library](https://www.caiso.com/library/transmission-plans-and-studies) | Plan-cycle decision, source-reported need, functional scope, expected ISD, and selected plan costs. The public library has a collection for each 2012/13–2025/26 cycle. | CAISO Board material, plan appendices, and the cited plan table. |
| Has an approved project been delayed, completed, closed, or changed in status? | [CAISO Transmission Development Forum](https://stakeholdercenter.caiso.com/RecurringStakeholderProcesses/Transmission-development-forum) and its pre-July-2025 meeting archive | Repeated project status and schedule snapshots. CAISO describes this forum as biannual. | Utility TPR data and project-specific filings for cost, scope, and route evidence. |
| What is the utility's current/original cost, schedule, path, voltage, line length, or capacity? | [CPUC Transmission Project Review Process](https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/electric-costs/transmission-project-review-process) and the linked PG&E, SCE, and SDG&E data pages | Public project spreadsheets and related materials. CPUC created TPR in 2023 for IOU FERC-jurisdictional capital transmission projects, so public coverage begins in 2024. | Utility responses, supporting presentations, and project-specific CPUC proceedings. Some additional material may require a stakeholder NDA. |
| Did the route, environmental design, construction scope, schedule, or estimate change after plan approval? | The relevant CPUC application/proceeding, CEQA environmental record, utility permit filing, and decision | Detailed routing alternatives, engineering, environmental review, construction authorization, and project-specific cost/schedule evidence. | CAISO plan/TDF and utility TPR rows to establish the before-and-after observation dates. |
| Was a developer selected or was a project competitively assigned? | CAISO plan-cycle materials, Board materials, and competitive-solicitation documents | Selection/assignment milestone and source-specific project requirements. | Developer/utility filings and permitting documents for implementation. |
| What is the early 2005–09 history? | CAISO Board memoranda and presentations, PTO expansion plans, CPUC proceedings, CEC/RETI materials, and FERC filings | Distributed planning and project records from before the later standardized annual-cycle archive. | A final CAISO plan, when located, before treating the year as a plan-level total. |

CAISO plans define functional transmission needs and requirements. Detailed physical route, engineering, environmental review, project schedule, and cost estimates commonly emerge after plan approval through the transmission owner and permitting authorities. The CEC describes these as later stages of project development, so do not treat a CAISO functional scope as a final route. [CEC coordinated planning overview](https://www.energy.ca.gov/programs-and-topics/topics/california-transmission-system/coordinated-transmission-planning-and)

### Recommended research order

1. For a selected project, filter Project History by the source-specific ID or reviewed Crosswalk ID and identify the missing milestone: approval, design/permitting, cost, schedule, or completion.
2. Pull the cited CAISO plan row first. Then use the applicable CAISO TDF release to establish the next reported status/date.
3. For utility-owned projects, add the matching TPR snapshot(s). Compare only source-stated fields, keeping the report date and cost-dollar-year proxy.
4. If a change matters for analysis, collect the governing CPUC/CEQA/utility document that expressly reports the route, scope, cost, or schedule change. Add it as a new observation, not as a correction to an older row.
5. For 2005–09, search the primary repositories with the exact project title, endpoints, utility, voltage, and plan/Board date. Preserve unavailable final-plan records in Source Registry and Coverage; do not reconstruct a missing plan from a proposal presentation.

### What to save for every new source

- Original file in `02_Raw Public Sources/`, using a descriptive and stable filename.
- Direct public URL, publication/report date, source title, source ID, and source-use/status note in the extractor and Source Registry.
- Exact record locator: PDF page + table/slide + row, or workbook sheet + row.
- Source-reported values and source limitations. Record whether a figure is an estimate, a range, a ceiling, an aggregate, a planned date, or an actual date.
- A documented crosswalk only when evidence supports continuity. Never use an inferred name match to merge rows.

## Current scope at a glance

As audited on 2026-09-10, Project History contains 7,667 observations and the Source Registry contains 51 sources. Coverage is strongest for CAISO plan cycles from 2008 and 2010/11–2025/26, CAISO TDF history from 2020/21 through July 2026, and utility TPR releases from 2024 onward. The 2006, 2007, 2009, and 2010 historical material remains partial; see Coverage and the Guidebook before using those years for totals or trend claims.

## Folder guide

| Folder / file | Start here when you need to… |
|---|---|
| `outputs/` | Open the current Excel deliverable. |
| `01_Project Guidebook/` | Review detailed source rules, limitations, current counts, and the research backlog. |
| `02_Raw Public Sources/` | Inspect original public PDFs and utility spreadsheets. Do not edit these files. |
| `03_Processed Data/` | Inspect machine-readable, citation-rich extracts that feed the workbook. |
| `04_Update Scripts/` | Extract sources, build the crosswalk, create the workbook, audit, and verify. |
| `05_Quality Checks/previews/current/` | Review the most recent rendered workbook tabs after a build. |
| `99_Archive/` | Historical scripts, logs, and prior preview iterations retained for reference only. |

## Safe update sequence

1. Read the Guidebook and check `Coverage` for the relevant year/source gap.
2. Save the new public primary source in `02_Raw Public Sources/` without replacing an earlier version.
3. Create or update the relevant extractor so it captures exact citations and source-reported values only.
4. Run the relevant extraction script, then rebuild `caiso_annual_plan_crosswalk.json` if the source can support an identity link.
5. Rebuild the workbook, run the audit and verification scripts, and inspect all five previews.
6. Update the Dashboard, Source Registry, Coverage, Guidebook, and this README when the source changes data availability, definitions, limitations, or counts.

Use the full command list and additional quality rules in the [Guidebook](01_Project%20Guidebook/PROJECT_GUIDEBOOK.md).
