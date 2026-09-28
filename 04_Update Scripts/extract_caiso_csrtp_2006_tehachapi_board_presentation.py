"""Capture the January 2007 CSRTP-2006 Tehachapi Board-presentation snapshot.

The presentation reports CAISO Management's recommendation to approve the
Tehachapi project, subject to FERC consent.  It is a pre-approval snapshot,
not a final plan or evidence that facilities entered service.  Slide 8 lists
fourteen planned plan-of-service facilities and their planned ISDs, but it
does not report project-level costs.
"""

import json
from pathlib import Path


ROOT = Path("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w")
BASE = ROOT / "03_Processed Data/caiso_2007_tehachapi_plan_project_history.json"
OUT = ROOT / "03_Processed Data/caiso_csrtp_2006_tehachapi_board_presentation_project_history.json"

SOURCE = {
    "source_id": "SRC-CAISO-CSRTP-2006-TEHACHAPI-BOARD-2007-01-24",
    "source_title": "CSRTP-2006 Status Report for the Board on Tehachapi Project — Presentation",
    "source_url": "https://www.caiso.com/documents/csrtp-2006statusreport_theboardontehachapiproject-presentation.pdf",
    "source_file": "caiso_csrtp_2006_tehachapi_board_presentation_2007-01-24.pdf",
    "report_date": "2007-01-24",
    "scope": (
        "A partial pre-approval Tehachapi snapshot: one aggregate management recommendation "
        "and fourteen Slide 8 plan-of-service facilities. It is not a complete 2006 or 2007 "
        "annual-plan inventory, reports no project-level costs, and its planned dates are not "
        "actual completion."
    ),
}


base_records = json.loads(BASE.read_text())["records"]

records = [
    {
        "project_name": "Tehachapi Transmission Project",
        "utility": "SCE",
        "table": "Slides 6, 10, and 11",
        "table_row": "1",
        "status": "January 2007 Board presentation — CAISO Management recommendation pending Board action",
        "approval": "CAISO Management recommends Board approval, conditioned on FERC consent",
        "target_isd": "Slide 8 planned component schedule spans Dec 2008–Nov 2013",
        "path_scope": "CSRTP-2006 plan of service for the Tehachapi Area Generation Queue; all plan lines are built to 500 kV specifications.",
        "length_miles": None,
        "voltage_kv": None,
        "capacity": "4,350 MW planned generation in the Tehachapi Area Generation Queue",
        "cost_value_k": None,
        "cost_method": "not reported",
        "source_locator": (
            f"{SOURCE['source_file']}; PDF pp. 6, 10, and 11 (slides 6, 10, and 11); "
            "plan context, 4,350 MW finding, and recommendation/FERC condition; source cost: not reported"
        ),
    }
]

for row_number, base in enumerate(base_records[1:], start=1):
    records.append({
        "project_name": base["project_name"],
        "utility": "SCE",
        "table": "Slide 8",
        "table_row": str(row_number),
        "status": "January 2007 Board presentation — plan-of-service facility; management recommendation pending Board action",
        "approval": "CAISO Management recommends Board approval, conditioned on FERC consent",
        "target_isd": base["target_isd"],
        "path_scope": "Source table provides planned facility title and planned ISD. Slide 7 maps the plan of service; planned date is not actual completion.",
        "length_miles": None,
        "voltage_kv": None,
        "capacity": "",
        "cost_value_k": None,
        "cost_method": "not reported",
        "source_locator": (
            f"{SOURCE['source_file']}; PDF p. 8 (slide 8); plan-of-service table row {row_number}; "
            "source cost: not reported"
        ),
    })

for record in records:
    record.update({
        "source_id": SOURCE["source_id"],
        "source_url": SOURCE["source_url"],
        "source_title": SOURCE["source_title"],
    })

OUT.write_text(json.dumps({"source": SOURCE, "records": records}, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "records": len(records)}))
