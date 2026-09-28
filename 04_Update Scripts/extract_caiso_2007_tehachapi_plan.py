"""Capture the cited Tehachapi plan-of-service baseline in CAISO's 2007 report.

This is not a complete 2007 CAISO Transmission Plan inventory.  It preserves
one project-level aggregate and the fourteen scheduled facilities explicitly
listed in Appendix G, Table 1.  The $1.8B source amount is kept only on the
aggregate record and is never allocated to component facilities.
"""

import json
from pathlib import Path


ROOT = Path("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w")
OUT = ROOT / "03_Processed Data/caiso_2007_tehachapi_plan_project_history.json"

SOURCE = {
    "source_id": "SRC-CAISO-RENEW-2007-TEHACHAPI",
    "source_title": "Draft Integration of Renewable Resources Report — Appendix G, Tehachapi Transmission Plan",
    "source_url": "https://www.caiso.com/documents/draftrenewablesintegrationplanandreportnovember2007.pdf",
    "source_file": "caiso_draft_renewables_integration_report_2007.pdf",
    "report_date": "2007-09-01",
    "scope": (
        "A partial 2007 project baseline: one Tehachapi aggregate and fourteen "
        "Appendix G Table 1 planned facilities. The report says the CAISO Board "
        "approved the plan in January 2007. It is not a complete 2007 annual-plan inventory."
    ),
}


def component(name, planned_isd, scope, length=None, voltage=None):
    return {
        "project_name": name,
        "utility": "SCE",
        "table": "Appendix G, Table 1",
        "table_row": str(len(RECORDS) + 1),
        "status": "2007 Tehachapi plan of service — planned facility (not actual completion)",
        "approval": "CAISO Board approved January 2007 (reported in Appendix G)",
        "target_isd": planned_isd,
        "path_scope": scope,
        "length_miles": length,
        "voltage_kv": voltage,
        "capacity": "",
        "cost_value_k": None,
        "cost_method": "not reported for individual facility",
        "source_locator": (
            f"{SOURCE['source_file']}; Appendix G, Table 1; PDF p. 145; "
            f"row {len(RECORDS) + 1}; source cost: not reported"
        ),
    }


RECORDS = [
    {
        "project_name": "Tehachapi Transmission Project",
        "utility": "SCE",
        "table": "Executive Summary / Appendix G",
        "table_row": "1",
        "status": "2007 Tehachapi plan baseline — Board-approved aggregate project",
        "approval": "CAISO Board approved January 2007 (reported retrospectively)",
        "target_isd": "Full build-out planned in 2013; component schedule spans 2008–2013",
        "path_scope": "Board-approved Tehachapi plan; Appendix G describes a phased transmission expansion for renewable interconnection and reliability.",
        "length_miles": None,
        "voltage_kv": None,
        "capacity": "Board-approved plan: 4,350 MW planned generation. Report summary: planned $1.8B upgrades sufficient for up to 5,000 MW.",
        "cost_value_k": 1800000,
        "cost_method": "Report's $1.8B Tehachapi-area upgrade aggregate; not allocated to component facilities",
        "source_locator": (
            f"{SOURCE['source_file']}; PDF p. 10, Summary item 1 ($1.8B upgrades / 5,000 MW); "
            "Appendix G PDF pp. 140–145 (January 2007 Board approval, 4,350 MW plan, and Table 1 schedule)"
        ),
    },
]

RECORDS.extend([
    component("Antelope – Pardee 230 kV Line (500 kV Specifications) & Antelope Substation Expansion", "Dec 2008", "New 25.6-mile Antelope–Pardee line, constructed to 500 kV specifications and initially operated at 230 kV; includes Antelope substation expansion.", 25.6, 500),
    component("Antelope – Vincent 230 kV Line #1 (500 kV Specifications)", "Mar 2009", "First new Antelope–Vincent line, approximately 21.0 miles on new right-of-way, built to 500 kV specifications and initially operated at 230 kV.", 21.0, 500),
    component("WindHub Substation", "Mar 2009", "New WindHub 500/230/66 kV collector substation with transformer banks, bus positions, and static/dynamic voltage support as needed.", None, 500),
    component("Antelope – WindHub (also known as Substation 1) 230 kV Line (500 kV Specifications)", "Mar 2009", "New 25.6-mile WindHub–Antelope line, built to 500 kV specifications and initially operated at 230 kV.", 25.6, 500),
    component("Antelope – Vincent 230 kV Line #2 (500 kV Specifications)", "Mar 2011", "Second Antelope–Vincent line, approximately 18.0 miles on existing right-of-way replacing existing Antelope–Vincent and Antelope–Mesa 230 kV lines; initially operated at 230 kV.", 18.0, 500),
    component("LowWind 500/230 kV Substation (also known as Substation 5) with Loop in of Midway – Vincent #3 500 kV line", "Aug 2011", "Table 1 uses LowWind; Appendix G narrative describes the new Whirl Wind 500/230 kV collector substation with loop-in of Midway–Vincent #3.", None, 500),
    component("Antelope – LowWind 500 kV Line", "Aug 2011", "Table 1 uses LowWind; Appendix G narrative describes a new 14-mile 500 kV line between proposed WhirlWind and upgraded Antelope substations.", 14.0, 500),
    component("WindHub Substation 500 kV Upgrade", "Mar 2011", "Planned 500 kV upgrade to WindHub Substation.", None, 500),
    component("Antelope Substation 500 kV Upgrade", "Mar 2011", "Planned 500 kV upgrade to Antelope Substation.", None, 500),
    component("Vincent Substation 500 kV & 220 kV Upgrade", "Sep 2011", "Planned expansion of Vincent substation with additional 500/230 kV line positions, voltage support, and bank capacity.", None, 500),
    component("LowWind – WindHub 500 kV Line", "Oct 2011", "Planned 500 kV line between LowWind and WindHub substations.", None, 500),
    component("Replacement of Vincent – Rio Hondo No. 2 230 kV Line", "Nov 2011", "New 32.5-mile Vincent–Rio Hondo 500/230 kV line replacing Vincent–Rio Hondo No. 2; built to 500 kV specifications for a future upgrade.", 32.5, 500),
    component("Vincent – Mira Loma 500 kV Line", "Apr 2012", "New 75-mile 500 kV Vincent–Mira Loma line planned to address South of Lugo constraints and LA Basin reliability; uses existing and new route segments.", 75.0, 500),
    component("Vincent – Mesa 500/220 kV Line and Mesa Substation Work", "Nov 2013", "New 42-mile Vincent–Mesa 500/230 kV line and Mesa substation work; portions built to 500 kV specifications for a future upgrade.", 42.0, 500),
])

for row_number, record in enumerate(RECORDS[1:], start=1):
    record["table_row"] = str(row_number)
    record["source_locator"] = (
        f"{SOURCE['source_file']}; Appendix G, Table 1; PDF p. 145; "
        f"row {row_number}; source cost: not reported"
    )

for record in RECORDS:
    record.update({
        "source_id": SOURCE["source_id"],
        "source_url": SOURCE["source_url"],
        "source_title": SOURCE["source_title"],
    })

OUT.write_text(json.dumps({"source": SOURCE, "records": RECORDS}, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "records": len(RECORDS)}))
