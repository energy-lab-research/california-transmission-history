"""Extract cited project records from the final 2011/12 CAISO plan.

The imported tables are Chapter 7's project list: two status tables for
previously approved projects and the 30 reliability projects the ISO found
needed in the 2011/12 planning cycle.  Each observation preserves table,
PDF page, printed page, and table-row provenance.
"""

import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path("/Users/nicoleshi/Documents/Codex/2026-09-01/i-w")
PDF = ROOT / "02_Raw Public Sources/caiso_2011_2012_transmission_plan.pdf"
OUT = ROOT / "03_Processed Data/caiso_2011_2012_plan_project_history.json"
SOURCE_ID = "SRC-CAISO-TPP-2011-2012"
SOURCE_URL = "https://www.caiso.com/Documents/Decision_2011-12TransmissionPlan-Plan-MAR2012.pdf"
SOURCE_TITLE = "2011/2012 ISO Transmission Plan"


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
    for index, (y, number) in enumerate(items):
        prior = items[index - 1][0] if index else None
        following = items[index + 1][0] if index + 1 < len(items) else None
        # within_bbox requires a word to be wholly inside the crop.  Leave a
        # small allowance around each midpoint so wrapped continuation lines
        # remain attached to their table row without reaching the next row.
        y0 = (prior + y) / 2 - 4 if prior is not None else y - 18
        y1 = (y + following) / 2 + 8 if following is not None else y + 28
        yield y0, y1, number


def cost_value_thousand(cost_text):
    normalized = clean(cost_text).replace("–", "-").replace("—", "-").replace(" ", "")
    if normalized == "$0":
        return 0, "stated amount"
    match = re.fullmatch(r"\$(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)M?", normalized, re.I)
    if match:
        low, high = map(float, match.groups())
        return (low + high) * 500, "range midpoint"
    match = re.fullmatch(r"\$(\d+(?:\.\d+)?)M?", normalized, re.I)
    if match:
        return float(match.group(1)) * 1000, "stated amount"
    return None, "unparsed source text"


def locator(table, pdf_page, printed_page, row, cost=""):
    detail = f"; source cost: {cost}" if cost else "; source cost: not reported"
    return f"{table}; PDF p. {pdf_page} (printed p. {printed_page}); row {row}{detail}"


records = []
with pdfplumber.open(PDF) as pdf:
    # Table 7.1-1 runs PDF pp. 429-434 / printed pp. 419-424.  Its 125 rows
    # provide a source-cited expected-ISD/status snapshot, not new approval.
    for pdf_page, printed_page, start_y in [
        (429, 419, 320), (430, 420, 105), (431, 421, 105),
        (432, 422, 105), (433, 423, 105), (434, 424, 105),
    ]:
        page = pdf.pages[pdf_page - 1]
        for y0, y1, row in windows(anchors(page, start_y, 95, 130)):
            name = cell(page, y0, y1, 125, 390)
            utility = cell(page, y0, y1, 390, 470)
            target_isd = cell(page, y0, y1, 470, 555)
            if not name or utility not in {"PG&E", "SCE", "SDG&E"}:
                continue
            reported_status = "Previously approved — expected in-service date update (under $50M)"
            if target_isd.lower() == "cancelled":
                reported_status = "Previously approved — cancelled (reported in expected in-service date field)"
            elif target_isd.lower() == "replaced":
                reported_status = "Previously approved — replaced (reported in expected in-service date field)"
            records.append({
                "project_name": name,
                "utility": utility,
                "table": "Table 7.1-1",
                "table_row": row,
                "pdf_page": pdf_page,
                "printed_page": printed_page,
                "status": reported_status,
                "target_isd": target_isd,
                "cost_raw": "",
                "cost_value_k": None,
                "cost_method": "not reported in Table 7.1-1",
                "source_id": SOURCE_ID,
                "source_url": SOURCE_URL,
                "source_title": SOURCE_TITLE,
                "source_locator": locator("Table 7.1-1", pdf_page, printed_page, row),
            })

    # Table 7.1-2 is PDF p. 435 / printed p. 425 and completes the existing
    # project schedule snapshot for projects costing $50M or more.
    page = pdf.pages[434]
    for y0, y1, row in windows(anchors(page, 120, 105, 140)):
        name = cell(page, y0, y1, 130, 380)
        utility = cell(page, y0, y1, 380, 470)
        target_isd = cell(page, y0, y1, 470, 555)
        if not name or utility not in {"PG&E", "SCE", "SDG&E"}:
            continue
        records.append({
            "project_name": name,
            "utility": utility,
            "table": "Table 7.1-2",
            "table_row": row,
            "pdf_page": 435,
            "printed_page": 425,
            "status": "Previously approved — expected in-service date update ($50M or more)",
            "target_isd": target_isd,
            "cost_raw": "",
            "cost_value_k": None,
            "cost_method": "not reported in Table 7.1-2",
            "source_id": SOURCE_ID,
            "source_url": SOURCE_URL,
            "source_title": SOURCE_TITLE,
            "source_locator": locator("Table 7.1-2", 435, 425, row),
        })

    # Table 7.2-1 runs PDF pp. 436-438 / printed pp. 426-428.  It contains
    # all 30 new reliability projects the ISO found needed in this cycle.
    for pdf_page, printed_page, start_y in [(436, 426, 270), (437, 427, 110), (438, 428, 110)]:
        page = pdf.pages[pdf_page - 1]
        for y0, y1, row in windows(anchors(page, start_y, 75, 105)):
            name = cell(page, y0, y1, 105, 240)
            utility = cell(page, y0, y1, 240, 300)
            service_area = cell(page, y0, y1, 295, 385)
            submission_type = cell(page, y0, y1, 385, 440)
            target_isd = cell(page, y0, y1, 440, 505)
            cost_raw = cell(page, y0, y1, 505, 575)
            cost_value_k, cost_method = cost_value_thousand(cost_raw)
            if not name or utility not in {"PG&E", "SCE", "SDG&E"} or cost_value_k is None:
                continue
            records.append({
                "project_name": name,
                "utility": utility,
                "table": "Table 7.2-1",
                "table_row": row,
                "pdf_page": pdf_page,
                "printed_page": printed_page,
                "status": "Found to be needed — new reliability project",
                "target_isd": target_isd,
                "service_area": service_area,
                "submission_type": submission_type,
                "cost_raw": cost_raw,
                "cost_value_k": cost_value_k,
                "cost_method": cost_method,
                "source_id": SOURCE_ID,
                "source_url": SOURCE_URL,
                "source_title": SOURCE_TITLE,
                "source_locator": locator("Table 7.2-1", pdf_page, printed_page, row, cost_raw),
            })

NAME_OVERRIDES = {
    ("Table 7.1-2", "1"): "Cottonwood-Red Bluff No. 2 60 kV Line Project and Red Bluff Area 230/60 kV Substation Project",
    ("Table 7.1-2", "8"): "Southern Orange County Reliability Upgrade Project - Alternative 3 (Rebuild Capistrano Substation, construct a new SONGS-Capistrano 230 kV line and a new 230 kV tap line to Capistrano)",
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
        "scope": "Tables 7.1-1, 7.1-2, and 7.2-1 only",
        "extraction_note": "Tables 7.1-1/2 are status and expected-ISD updates for previously approved projects. Table 7.2-1 contains the 30 new reliability projects found needed in the 2011/12 planning cycle.",
    },
    "records": records,
}, indent=2) + "\n")

print(json.dumps({"output": str(OUT), "records": len(records), "by_table": counts}, indent=2))
