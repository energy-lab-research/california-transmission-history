"""Extract the cited operating-guide excerpt in CAISO's 2006 plan presentation.

The official January 24, 2007 Board presentation labels slide 10 an "Excerpt
From the 2006 Operating Guide." It is not the complete 160-project plan, so
this extraction intentionally retains only the 12 displayed project rows and
labels that limitation in every downstream source description.
"""

import json
import re
from pathlib import Path


ROOT = Path("/Users/nicoleshi/Documents/Codex/2026-09-01/i-w")
OUT = ROOT / "03_Processed Data/caiso_2006_operating_guide_excerpt.json"
SOURCE_ID = "SRC-CAISO-TPP-2006-OPERATING-GUIDE-EXCERPT"
SOURCE_URL = "https://www.caiso.com/documents/2006caisotransmissionplan-presentation.pdf"
SOURCE_TITLE = "2006 CAISO Transmission Plan — Board presentation, Operating Guide excerpt"


ROWS = [
    ("1", "Ignacio 115/60kV Transformer", "PG&E – North West", "Replace the 115/60kV transformers with a larger unit (200 MVA)", "Reduces T-1 concern and increases reliability to 60kV customers. Removes the Ignacio #1 or #3 Bank SPS.", "05/01/2007"),
    ("2", "Lakeville-Sonoma 115kV line", "PG&E – North West", "Construct one new 115kV line from Lakeville to Sonoma Sub.", "Improves L-1 voltage performance at Sonoma and Pueblo substations.", "05/01/2007"),
    ("3", "Tulucay 230/60kV Transformer", "PG&E – North West", "Install a new 230/60kV transformer (200 MVA)", "Increases transformer capacity", "05/01/2007"),
    ("4", "Fulton-Lakeville 230kV line", "PG&E – North West", "Reconfigure transmission to create a Fulton-Lakeville 230kV line.", "Increases import capacity into South Geysers, reduces RMR requirement.", "11/30/2006"),
    ("5", "Reliability Project: Rio Dell Jct CB 42 & 22 Relay Replcmnt", "PG&E – North West", "Replace Relays to increase the rating from 400A to 4/0 AL ratings of 297, 345, 443, 473 Amps", "Increases import/export capability under some clearance conditions at Humboldt Bay PP.", "10/16/2006"),
    ("6", "Reliability Project: Maple Creek CB 42 Relay Replacement", "PG&E – North West", "Replace Relays to increase the rating from 300A to 4/0 ACSR ratings of 297, 345, 443, 473 Amps", "Increases 60kV line capacity.", "08/31/2006"),
    ("7", "W. Sacramento-Davis Transmission", "PG&E – North East", "Reconductor the West Sacramento-Davis 115kV line (215 MVA)", "Increases import capacity into Woodland and Davis 115kV system. Reduces L-1 concerns under clearance conditions.", "10/01/2006"),
    ("8", "Colgate-Rio Oso 230kV Line Re-Rate", "PG&E – North East", "Rerate 230kV transmission lines for 3fps (429 MVA)", "Increase 230kV line capacity.", "12/01/2006"),
    ("9", "Davis-UC Davis 60kV to 115kV conversion", "PG&E – North East", "Convert two 60kV lines between Davis and UC Davis to 115kV (252 MVA)", "Increases voltage performance and thermal capacity to UC Davis.", "12/01/2006"),
    ("10", "Colgate 230/60kV Capacity Increase", "PG&E – North East", "Replace 230/60kV transformer at Colgate Powerhouse with a larger unit and install a spare phase (135 MVA)", "Part of plan to radialize 60kV system. Once radial, the Colgate T-1 concern will be eliminated.", "03/01/2007"),
    ("11", "Pease-Marysville 60kV line", "PG&E – North East", "Construct new 60kV transmission line (117 MVA)", "Part of plan to radialize 60kV system. Once radial, the Colgate T-1 concern will be eliminated.", "05/01/2007"),
    ("12", "Mtn Quarries 60kV Tap Reconductor", "PG&E – North East", "Reconductor Mountain Quarries 60kV Tap (46 MVA)", "Increase 60kV line capacity.", "05/01/2007"),
]


records = []
for row, name, region, scope, impact, isd in ROWS:
    capacity = re.search(r"\((\d+(?:\.\d+)?)\s*MVA\)", scope, re.I)
    records.append({
        "project_name": name,
        "utility": "PG&E",
        "region": region,
        "table": "Operating Guide excerpt (slide 10)",
        "table_row": row,
        "pdf_page": 10,
        "printed_page": 10,
        "status": "2006 plan operating-guide excerpt — targeted in-service date",
        "target_isd": isd,
        "scope": scope,
        "system_impact": impact,
        "capacity": f"{capacity.group(1)} MVA" if capacity else "",
        "cost_raw": "",
        "cost_value_k": None,
        "cost_method": "not reported in operating-guide excerpt",
        "source_id": SOURCE_ID,
        "source_url": SOURCE_URL,
        "source_title": SOURCE_TITLE,
        "source_locator": f"Operating Guide excerpt; PDF p. 10 (slide 10); row {row}; source cost: not reported",
    })

OUT.write_text(json.dumps({
    "source": {
        "source_id": SOURCE_ID,
        "source_title": SOURCE_TITLE,
        "source_url": SOURCE_URL,
        "scope": "Twelve displayed rows from the slide-10 excerpt only; not the complete 2006 plan project list",
        "presentation_date": "2007-01-24",
    },
    "records": records,
}, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "records": len(records)}, indent=2))
