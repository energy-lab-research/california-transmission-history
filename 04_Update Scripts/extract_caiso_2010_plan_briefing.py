"""Capture the project-level detail available in the March 2010 plan briefing.

The briefing names only two individual projects. Its other figures are cycle-level
aggregates, so they are preserved in the source description but deliberately not
allocated to individual Project History rows.
"""

import json
from pathlib import Path


ROOT = Path("/Users/nicoleshi/Documents/Codex/2026-09-01/i-w")
OUT = ROOT / "03_Processed Data/caiso_2010_plan_briefing_project_history.json"

SOURCE = {
    "source_id": "SRC-CAISO-TPP-2010-BRIEFING",
    "source_title": "Briefing on ISO 2010 Transmission Plan",
    "source_url": "",
    "source_file": "2010transmissionplan-briefing.pdf",
    "presentation_date": "2010-03-25",
    "scope": (
        "Slide 7 names two Board-approved reliability projects and reports 29 "
        "approved 2010-cycle reliability projects totaling $573M. Individual "
        "cost, route, and schedule values are not supplied."
    ),
}

RECORDS = [
    {
        "project_name": "Alberhill Substation Project",
        "utility": "SCE",
        "table": "Slide 7",
        "table_row": "1",
        "status": "2010 plan briefing — Board-approved reliability project",
        "approval": "Board-approved Dec. 2009 (reported in briefing)",
    },
    {
        "project_name": "Bayfront Substation Project",
        "utility": "SDG&E",
        "table": "Slide 7",
        "table_row": "2",
        "status": "2010 plan briefing — Board-approved reliability project",
        "approval": "Board-approved Feb. 2010 (reported in briefing)",
    },
]

for record in RECORDS:
    record.update({
        "source_id": SOURCE["source_id"],
        "source_url": SOURCE["source_url"],
        "source_title": SOURCE["source_title"],
        "source_locator": (
            f"{SOURCE['source_file']}; Slide 7; project {record['table_row']}; "
            "individual cost not reported (Slide 7 reports the 29-project 2010-cycle aggregate)"
        ),
        "cost_value_k": None,
        "cost_method": "not reported; aggregate-only briefing",
    })

OUT.write_text(json.dumps({"source": SOURCE, "records": RECORDS}, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "records": len(RECORDS)}))
