"""Extract cited status and newly-needed project rows from the 2010/11 CAISO plan.

The two imported source tables are intentionally limited to rows that the plan
labels either (1) previously approved, with an updated expected in-service date,
or (2) found to be needed/recommended for approval in this planning cycle.
Table 8.3's category-2 candidates are not imported: the plan says they are to
be evaluated in a subsequent cycle, so treating them as approved would overstate
the history.
"""

import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path("/Users/nicoleshi/Documents/Codex/2026-09-01/i-w")
PDF = ROOT / "02_Raw Public Sources/caiso_2010_2011_transmission_plan.pdf"
OUT = ROOT / "03_Processed Data/caiso_2010_2011_plan_project_history.json"
SOURCE_ID = "SRC-CAISO-TPP-2010-2011"
SOURCE_URL = "https://www.caiso.com/documents/110518decision_transmissionplan-reviseddraftplan.pdf"
SOURCE_TITLE = "Final ISO 2010/2011 Transmission Plan"


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def cell(page, y0, y1, x0, x1):
    return clean(page.within_bbox((x0, max(0, y0), x1, min(page.height, y1))).extract_text())


def anchors(page, start_y, x0, x1):
    found = []
    for word in page.extract_words(x_tolerance=2, y_tolerance=2):
        if word["top"] >= start_y and x0 <= word["x0"] < x1 and re.fullmatch(r"\d+", word["text"]):
            found.append((word["top"], word["text"]))
    return sorted(found)


def windows(items):
    for i, (y, number) in enumerate(items):
        prior = items[i - 1][0] if i else None
        following = items[i + 1][0] if i + 1 < len(items) else None
        y0 = (prior + y) / 2 + 2.5 if prior is not None else y - 18
        y1 = (y + following) / 2 + 2.5 if following is not None else y + 38
        yield y0, y1, number


def cost_value_thousand(cost_text):
    normalized = clean(cost_text).replace("–", "-").replace("—", "-").replace(" ", "")
    if not normalized:
        return None, "not reported"
    between = re.fullmatch(r"\$(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)M", normalized, re.I)
    if between:
        low, high = map(float, between.groups())
        return (low + high) * 500, "range midpoint"
    exact = re.fullmatch(r"\$(\d+(?:\.\d+)?)M", normalized, re.I)
    if exact:
        return float(exact.group(1)) * 1000, "stated amount"
    return None, "unparsed source text"


def locator(table, page, row, cost=""):
    detail = f"; source cost: {cost}" if cost else "; source cost: not reported"
    return f"{table}; PDF/printed p. {page}; row {row}{detail}"


records = []
with pdfplumber.open(PDF) as pdf:
    # Table 8.1-1 spans PDF/printed pages 517–521.  It has 81 rows, with no
    # cost field; it supplies a cited schedule/status observation.
    for page_number, start_y in [(517, 280), (518, 105), (519, 105), (520, 105), (521, 105)]:
        page = pdf.pages[page_number - 1]
        for y0, y1, row in windows(anchors(page, start_y, 70, 95)):
            if page_number == 521 and int(row) != 81:
                # The second table on this page restarts its row numbering.
                continue
            name = cell(page, y0, y1, 100, 425)
            utility = cell(page, y0, y1, 425, 490)
            target_isd = cell(page, y0, y1, 490, 610)
            if not name or utility not in {"PG&E", "SCE", "SDG&E"}:
                continue
            records.append({
                "project_name": name,
                "utility": utility,
                "table": "Table 8.1-1",
                "table_row": row,
                "pdf_page": page_number,
                "printed_page": page_number,
                "status": "Previously approved — expected in-service date update",
                "target_isd": target_isd,
                "cost_raw": "",
                "cost_value_k": None,
                "cost_method": "not reported in Table 8.1-1",
                "source_id": SOURCE_ID,
                "source_url": SOURCE_URL,
                "source_title": SOURCE_TITLE,
                "source_locator": locator("Table 8.1-1", page_number, row),
            })

    # Table 8.1-2 is on page 521 and completes the existing-project snapshot.
    page = pdf.pages[520]
    # Every row in this short table is one line.  A narrow fixed-height crop
    # avoids lower glyphs being clipped at the midpoint between adjacent rows.
    for y, row in anchors(page, 215, 70, 95):
        y0, y1 = y - 4, y + 15
        name = cell(page, y0, y1, 100, 425)
        utility = cell(page, y0, y1, 425, 490)
        target_isd = cell(page, y0, y1, 490, 610)
        if not name or utility not in {"PG&E", "SCE", "SDG&E"}:
            continue
        records.append({
            "project_name": name,
            "utility": utility,
            "table": "Table 8.1-2",
            "table_row": row,
            "pdf_page": 521,
            "printed_page": 521,
            "status": "Previously approved — expected in-service date update",
            "target_isd": target_isd,
            "cost_raw": "",
            "cost_value_k": None,
            "cost_method": "not reported in Table 8.1-2",
            "source_id": SOURCE_ID,
            "source_url": SOURCE_URL,
            "source_title": SOURCE_TITLE,
            "source_locator": locator("Table 8.1-2", 521, row),
        })

    # Table 8.2-1: 32 new reliability projects found needed.  Keep the exact
    # range in the locator and use only its midpoint as the calculation value.
    for page_number, start_y in [(522, 275), (523, 115), (524, 125)]:
        page = pdf.pages[page_number - 1]
        for y0, y1, row in windows(anchors(page, start_y, 25, 45)):
            name = cell(page, y0, y1, 55, 220)
            utility = cell(page, y0, y1, 220, 290)
            cost_raw = cell(page, y0, y1, 290, 365)
            service_area = cell(page, y0, y1, 365, 441)
            target_isd = cell(page, y0, y1, 527, 610)
            cost_value_k, cost_method = cost_value_thousand(cost_raw)
            if not name or utility not in {"PG&E", "SCE", "SDG&E"} or cost_value_k is None:
                continue
            records.append({
                "project_name": name,
                "utility": utility,
                "table": "Table 8.2-1",
                "table_row": row,
                "pdf_page": page_number,
                "printed_page": page_number,
                "status": "Found to be needed — new reliability project",
                "target_isd": target_isd,
                "service_area": service_area,
                "cost_raw": cost_raw,
                "cost_value_k": cost_value_k,
                "cost_method": cost_method,
                "source_id": SOURCE_ID,
                "source_url": SOURCE_URL,
                "source_title": SOURCE_TITLE,
                "source_locator": locator("Table 8.2-1", page_number, row, cost_raw),
            })

    # Table 8.2-2: one category-1 project recommended for Board approval.
    page = pdf.pages[523]
    table_text = page.extract_text() or ""
    description_match = re.search(r"Path 42 and Devers – Mirage 230 kV Upgrades\s+(.*?)\s+8\.3", table_text, re.S)
    records.append({
        "project_name": "Path 42 and Devers – Mirage 230 kV Upgrades",
        "utility": "IID/SCE",
        "table": "Table 8.2-2",
        "table_row": "1",
        "pdf_page": 524,
        "printed_page": 524,
        "status": "Found needed — category 1 policy-driven; recommended for Board approval",
        "target_isd": "",
        "path_scope": clean(description_match.group(1)) if description_match else "Joint Path 42 and Devers–Mirage 230 kV upgrade; considered path rating 1,440 MW.",
        "capacity": "1,440 MW (considered upgraded path rating; subject to WECC review)",
        "cost_raw": "",
        "cost_value_k": None,
        "cost_method": "not reported in Table 8.2-2",
        "source_id": SOURCE_ID,
        "source_url": SOURCE_URL,
        "source_title": SOURCE_TITLE,
        "source_locator": locator("Table 8.2-2", 524, "1"),
    })

# The untagged source moves a handful of multi-line titles independently of
# their row number.  These are transcribed from the rendered table so neither
# a continuation line nor an adjacent row becomes part of the project name.
NAME_OVERRIDES = {
    ("Table 8.2-1", "2"): "Reconductor TL670, Mission-Clairemont",
    ("Table 8.2-1", "3"): "Reconductor TL676, Mission-Mesa Heights",
    ("Table 8.2-1", "5"): "TL626 Santa Ysabel – Descanso mitigation (TL625B loop-in, Loveland - Barrett Tap loop-in)",
    ("Table 8.2-1", "8"): "Southern Orange County Reliability Upgrade Project - Alternative 3 (Rebuild Capistrano Substation, construct a new SONGS-Capistrano 230 kV line and a new 230 kV tap line to Capistrano)",
    ("Table 8.2-1", "9"): "New Sycamore - Bernardo 69 kV line",
    ("Table 8.2-1", "10"): "Midway-Kern PP Nos. 1,3 and 4 230 kV Lines Capacity Increase",
    ("Table 8.2-1", "15"): "Table Mountain – Sycamore 115 kV Line",
    ("Table 8.2-1", "18"): "Cottonwood-Red Bluff No. 2 60 kV Line Project and Red Bluff Area 230/60 kV Substation Project",
    ("Table 8.2-1", "20"): "Oro Loma - Mendota 115 kV Conversion Project",
    ("Table 8.2-1", "23"): "Kerchhoff PH #2 - Oakhurst 115 kV Line",
    ("Table 8.2-1", "24"): "Lemoore 70 kV Disconnect Switches Replacement",
    ("Table 8.2-1", "27"): "Gill Ranch Gas Storage 115 kV Interconnection",
    ("Table 8.2-1", "28"): "Fulton 230/115 kV Transformer Project",
    ("Table 8.2-1", "31"): "Cascade 115/60 kV No.2 Transformer Project and Cascade - Benton 60 kV Line Project",
}
for record in records:
    record["project_name"] = NAME_OVERRIDES.get((record["table"], record["table_row"]), record["project_name"])

records.sort(key=lambda r: (r["table"], r["pdf_page"], int(r["table_row"])))
counts = {}
for record in records:
    counts[record["table"]] = counts.get(record["table"], 0) + 1

OUT.write_text(json.dumps({
    "source": {
        "source_id": SOURCE_ID,
        "source_title": SOURCE_TITLE,
        "source_url": SOURCE_URL,
        "scope": "Tables 8.1-1, 8.1-2, 8.2-1 and 8.2-2 only",
        "extraction_note": "PDF page and printed page are the same in this report. Table 8.3 candidates are intentionally excluded because they were not found needed in this cycle.",
    },
    "records": records,
}, indent=2) + "\n")

print(json.dumps({"output": str(OUT), "records": len(records), "by_table": counts}, indent=2))
