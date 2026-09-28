"""Extract cited project observations from final CAISO plans, 2012/13–2019/20.

The source documents use planning-cycle labels, which this extractor preserves.  It
imports two kinds of evidence only: (1) the status/expected in-service-date tables
for previously approved projects and (2) tables of projects the ISO found needed in
the cycle.  Each output record retains its source table, PDF page, printed-page
number, and row number.
"""

import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path("/Users/nicoleshi/Documents/Codex/2026-09-01/i-w")
RAW = ROOT / "02_Raw Public Sources"
OUT = ROOT / "03_Processed Data"


# Page ranges are PDF-page numbers. The printed-page offset is derived from the
# footer on the first Chapter 7/8 project-list page in each final plan.
CYCLES = [
    {
        "slug": "2012_2013", "period": "2012/2013", "date": "2013-03-20",
        "url": "https://www.caiso.com/Documents/BoardApproved2012-2013TransmissionPlan.pdf",
        "offset": 2, "status": [("Table 7.1-1", range(365, 372), "under $50M"), ("Table 7.1-2", range(372, 373), "$50M or more")],
        "needed": [("Table 7.2-1", range(373, 376), "reliability"), ("Table 7.2-2", range(376, 377), "policy-driven")],
    },
    {
        "slug": "2013_2014", "period": "2013/2014", "date": "2014-03-25",
        "url": "https://www.caiso.com/Documents/Board-Approved2013-2014TransmissionPlan.pdf",
        "offset": 6, "status": [("Table 7.1-1", range(283, 292), "under $50M"), ("Table 7.1-2", range(292, 294), "$50M or more")],
        "needed": [("Table 7.2-1", range(294, 297), "reliability", 0), ("Table 7.2-2", range(296, 297), "policy-driven", 1), ("Table 7.2-3", range(297, 298), "economic", 0)],
    },
    {
        "slug": "2014_2015", "period": "2014/2015", "date": "2015-03-27",
        "url": "https://www.caiso.com/Documents/Board-Approved2014-2015TransmissionPlan.pdf",
        "offset": 10, "status": [("Table 7.1-1", range(261, 271), "under $50M"), ("Table 7.1-2", range(271, 274), "$50M or more")],
        "needed": [("Table 7.2-1", range(274, 275), "reliability", 0), ("Table 7.2-3", range(275, 276), "economic", 0)],
    },
    {
        "slug": "2015_2016", "period": "2015/2016", "date": "2016-03-28",
        "url": "https://www.caiso.com/Documents/Board-Approved2015-2016TransmissionPlan.pdf",
        "offset": 6, "status": [("Table 7.1-1", range(325, 335), "under $50M"), ("Table 7.1-2", range(335, 338), "$50M or more")],
        "needed": [("Table 7.2-1", range(338, 340), "reliability", 0)],
    },
    {
        "slug": "2016_2017", "period": "2016/2017", "date": "2017-03-17",
        "url": "https://www.caiso.com/Documents/Board-Approved_2016-2017TransmissionPlan.pdf",
        "offset": 6, "status": [("Table 7.1-1", range(374, 382), "under $50M"), ("Table 7.1-2", range(382, 385), "$50M or more")],
        "needed": [("Table 7.2-1", range(385, 386), "reliability", 0)],
    },
    {
        "slug": "2017_2018", "period": "2017/2018", "date": "2018-03-22",
        "url": "https://www.caiso.com/Documents/BoardApproved-2017-2018_Transmission_Plan.pdf",
        "offset": 8, "status": [("Table 7.1-1", range(333, 340), "under $50M"), ("Table 7.1-2", range(340, 342), "$50M or more")],
        "needed": [("Table 7.2-1", range(342, 343), "reliability", 0), ("Table 7.2-3", range(343, 344), "economic", 1)],
    },
    {
        "slug": "2018_2019", "period": "2018/2019", "date": "2019-03-29",
        "url": "https://www.caiso.com/Documents/ISO_BoardApproved-2018-2019_Transmission_Plan.pdf",
        "offset": 8, "status": [("Table 8.1-1", range(477, 482), "under $50M"), ("Table 8.1-2", range(482, 484), "$50M or more")],
        "needed": [("Table 8.2-1", range(484, 485), "reliability", 0), ("Table 8.2-3", range(485, 486), "economic", 1)],
    },
    {
        "slug": "2019_2020", "period": "2019/2020", "date": "2020-03-25",
        "url": "https://www.caiso.com/Documents/ISOBoardApproved-2019-2020TransmissionPlan.pdf",
        "offset": 8, "status": [("Table 8.1-1", range(399, 404), "under $50M"), ("Table 8.1-2", range(404, 405), "$50M or more")],
        "needed": [("Table 8.2-1", range(405, 406), "reliability", 0)],
    },
    {
        "slug": "2020_2021", "period": "2020/2021", "date": "2021-03-24",
        "url": "https://www.caiso.com/documents/boardapproved2020-2021transmissionplan.pdf",
        "offset": 8, "status": [("Table 8.1-1", range(443, 447), "under $50M"), ("Table 8.1-2", range(447, 448), "$50M or more")],
        "needed": [("Table 8.2-1", range(448, 449), "reliability", 0), ("Table 8.2-2", range(448, 449), "policy-driven", 1), ("Table 8.2-3", range(448, 449), "economic", 2)],
    },
    {
        "slug": "2021_2022", "period": "2021/2022", "date": "2022-03-17",
        "url": "https://www.caiso.com/documents/isoboardapproved-2021-2022transmissionplan.pdf",
        "offset": 8, "status": [("Table 8.1-1", range(381, 384), "under $50M"), ("Table 8.1-1", range(384, 385), "under $50M", 0), ("Table 8.1-2", range(384, 385), "$50M or more", 1)],
        "needed": [("Table 8.2-1", range(385, 386), "reliability", 0), ("Table 8.2-2", range(386, 387), "policy-driven", 0), ("Table 8.2-3", range(386, 387), "economic", 1)],
    },
    {
        "slug": "2022_2023", "period": "2022/2023", "date": "2023-05-18",
        "url": "https://www.caiso.com/documents/iso-board-approved-2022-2023-transmission-plan.pdf",
        "offset": 7, "status": [("Table 8.1-1", range(167, 172), "under $50M"), ("Table 8.1-2", range(172, 173), "$50M or more")],
        "needed": [("Table 8.2-1", range(173, 174), "reliability", 0), ("Table 8.2-2", range(174, 175), "policy-driven", 0)],
    },
    {
        "slug": "2023_2024", "period": "2023/2024", "date": "2024-05-23",
        "url": "https://www.caiso.com/documents/iso-board-approved-2023-2024-transmission-plan.pdf",
        "offset": 6, "status": [("Table 8.1-1", range(159, 165), "under $50M"), ("Table 8.1-2", range(165, 166), "$50M or more")],
        "needed": [("Table 8.2-1", range(166, 167), "reliability", 0), ("Table 8.2-2", range(167, 168), "policy-driven", 0)],
    },
    {
        "slug": "2024_2025", "period": "2024/2025", "date": "2025-05-22",
        "url": "https://www.caiso.com/documents/iso-board-approved-2024-2025-transmission-plan.pdf",
        "offset": 2, "status": [("Table 8.1-1", range(185, 192), "under $50M"), ("Table 8.1-2", range(192, 195), "$50M or more")],
        "needed": [("Table 8.2-1", range(195, 197), "reliability", 0), ("Table 8.2-2", range(196, 197), "policy-driven", 1)],
    },
    {
        "slug": "2025_2026", "period": "2025/2026", "date": "2026-05-19",
        "url": "https://www.caiso.com/documents/board-approved-2025-2026-transmission-plan.pdf",
        "offset": 7,
        "status": [
            ("Table 8-1", range(173, 174), "closed out", 0),
            ("Table 8-2", range(173, 174), "under $50M", 1),
            ("Table 8-2", range(174, 176), "under $50M", 0),
            ("Table 8-3", range(176, 178), "$50M or more", 0),
        ],
        "needed": [],
        # The 2025/26 final plan places its 38 recommendations in the
        # Executive Summary rather than Chapter 8.  Each tuple is (table,
        # PDF page, project ID, name, PTO, area, cost in $M, category,
        # scope-change flag).  The table’s $M header supplies the cost unit.
        "recommendations": [
            ("Table ES-1", 7, "1011-R-16", "Oro Loma 70 kV Area Reinforcement (Re-scope)", "PG&E", "GFA", 38, "reliability", True),
            ("Table ES-1", 7, "2526-R-01", "Walnut 230 kV CB Upgrade", "SCE", "Metro", 15, "reliability", False),
            ("Table ES-1", 7, "2526-R-02", "Ames 115 kV Short Circuit Mitigation", "PG&E", "GBA", 5, "reliability", False),
            ("Table ES-1", 7, "2526-R-03", "DeAnza 115 kV Substation", "PG&E", "GBA", 260, "reliability", False),
            ("Table ES-1", 7, "2526-R-04", "Lincoln - Pleasant Grove Line Reconductoring", "PG&E", "CVLY", 120, "reliability", False),
            ("Table ES-1", 7, "2526-R-05", "Los Esteros 230 kV Short Circuit Mitigation", "PG&E", "GBA", 20, "reliability", False),
            ("Table ES-1", 7, "2526-R-06", "Mariposa 70 kV Voltage Support", "PG&E", "GFA", 63, "reliability", False),
            ("Table ES-1", 7, "2526-R-07", "Metcalf 230 kV Short Circuit Mitigation", "PG&E", "GBA", 405, "reliability", False),
            ("Table ES-1", 7, "2526-R-08", "Midway 115 kV Bus Upgrade", "PG&E", "Kern", 89, "reliability", False),
            ("Table ES-1", 7, "2526-R-09", "Monta Vista – Loyola – Los Altos 60 kV Line Reconductoring", "PG&E", "GBA", 64, "reliability", False),
            ("Table ES-1", 7, "2526-R-10", "Monta Vista 230/115 kV Transformer Bank Addition", "PG&E", "GBA", 104, "reliability", False),
            ("Table ES-1", 7, "2526-R-11", "Newark 115 kV Short Circuit Mitigation", "PG&E", "GBA", 60, "reliability", False),
            ("Table ES-1", 7, "2526-R-12", "Newark 230/115 kV Bank Upgrade", "PG&E", "GBA", 63, "reliability", False),
            ("Table ES-1", 7, "2526-R-13", "Nortech 115 kV Short Circuit Mitigation", "PG&E", "GBA", 5, "reliability", False),
            ("Table ES-1", 7, "2526-R-14", "San Jose B 230/115 kV Transformer Bank Addition", "PG&E", "GBA", 69, "reliability", False),
            ("Table ES-1", 7, "2526-R-15", "Saratoga-Vasona 230 kV Line Reconductoring", "PG&E", "GBA", 178, "reliability", False),
            ("Table ES-1", 7, "2526-R-16", "South Oakland Reinforcement (Phase 2)", "PG&E", "GBA", 86, "reliability", False),
            ("Table ES-1", 7, "2526-R-17", "Tesla – Trimble – Metcalf 230 kV Corridor Expansion", "PG&E", "GBA", 1424, "reliability", False),
            ("Table ES-1", 7, "2526-R-18", "Trimble 115 kV Short Circuit Mitigation", "PG&E", "GBA", 16, "reliability", False),
            ("Table ES-1", 7, "2526-R-19", "Lugo 230 kV CB Upgrade", "SCE", "NOL", 5, "reliability", False),
            ("Table ES-1", 7, "2526-R-20", "Devers 230 kV SCD Upgrade", "SCE", "Eastern", 186, "reliability", False),
            ("Table ES-1", 7, "2526-R-21", "Lugo 500 kV Reactive Power Reinforcement", "SCE", "Bulk", 450, "reliability", False),
            ("Table ES-1", 7, "2526-R-22", "Mesa - Laguna Bell 230 kV #2 Upgrade", "SCE", "Metro", 56, "reliability", False),
            ("Table ES-1", 7, "2526-R-23", "Etiwanda and Mira Loma 230 kV SCD Upgrade", "SCE", "Metro", 55, "reliability", False),
            ("Table ES-1", 7, "2526-R-24", "Penasquitos- Mira Sorrento 69 KV #2 line", "SDG&E", "SDG&E", 115, "reliability", False),
            ("Table ES-1", 8, "2526-R-25", "TL600B Reconductor", "SDG&E", "SDG&E", 8, "reliability", False),
            ("Table ES-1", 8, "2526-R-26", "TL623C Reconductor", "SDG&E", "SDG&E", 5, "reliability", False),
            ("Table ES-1", 8, "2526-R-27", "TL690B & TL 697 Reconductor", "SDG&E", "SDG&E", 33, "reliability", False),
            ("Table ES-1", 8, "2425-R-02", "Ames Distribution – Palo Alto 115 kV line (Re-scope)", "PG&E", "GBA", 52, "reliability", True),
            ("Table ES-1", 8, "1314-R-17", "Morgan Hill Area Reinforcement project (Re-scope)", "PG&E", "GBA", 28, "reliability", True),
            ("Table ES-1", 8, "2425-R-25", "South Bay Reinforcement Project (Re-scope)", "PG&E", "GBA", 0, "reliability", True),
            ("Table ES-1", 8, "1819-E-01", "East Marysville 115/60 kV Project (Re-scope)", "PG&E", "CVLY", 69, "reliability", True),
            ("Table ES-1", 8, "2324-R-20", "Short Circuit Mitigation for Imperial Valley 230 kV Circuit Breakers (Re-scope)", "SDG&E", "SDG&E", 33, "reliability", True),
            ("Table ES-2", 9, "2526-P-01", "Drum - Higgins 115 kV Line Reconductoring", "PG&E", "CVLY", 308, "policy-driven", False),
            ("Table ES-2", 9, "2526-P-02", "East Shore 230 kV Area Reinforcement", "PG&E", "GBA", 257, "policy-driven", False),
            ("Table ES-2", 9, "2526-P-03", "Oleum Area Reinforcement", "PG&E", "GBA", 144, "policy-driven", False),
            ("Table ES-2", 9, "2526-P-04", "Trout Canyon - Lugo 500 kV Line", "SCE", "EOP", 1685, "policy-driven", False),
            ("Table ES-3", 9, "2026-E-01", "Gates – Los Banos #3 500 kV Line Series Compensation", "WAPA", "Fresno", 150, "economic-driven", False),
        ],
    },
]


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def dollars_k(raw):
    """Return thousands of nominal dollars, retaining the original source text."""
    text = clean(raw).replace(",", "").replace("–", "-").replace("—", "-")
    compact_range = re.fullmatch(r"\$?\s*(\d+(?:\.\d+)?)\s*-\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:million|m)\b", text, re.I)
    if compact_range:
        return (float(compact_range.group(1)) + float(compact_range.group(2))) * 500, "range midpoint"
    # The newer Chapter 8 project tables label the column "Project Cost (in
    # millions of dollars)" and therefore render their cells as bare numbers
    # (for example, "84" or "11 - 22").  Preserve the text in cost_raw, but
    # apply the table header's unit when standardizing the numeric value.
    header_unit_range = re.fullmatch(r"\$?\s*(\d+(?:\.\d+)?)\s*-\s*\$?\s*(\d+(?:\.\d+)?)", text)
    if header_unit_range:
        return (float(header_unit_range.group(1)) + float(header_unit_range.group(2))) * 500, "range midpoint (millions per table header)"
    header_unit_amount = re.fullmatch(r"\$?\s*(\d+(?:\.\d+)?)", text)
    if header_unit_amount:
        return float(header_unit_amount.group(1)) * 1000, "stated amount (millions per table header)"
    numbers = re.findall(r"\$?\s*(\d+(?:\.\d+)?)\s*(?:million|m)\b", text, re.I)
    thousands = re.fullmatch(r"\$\s*(\d+(?:\.\d+)?)\s*k", text, re.I)
    if thousands:
        return float(thousands.group(1)), "stated amount (thousands)"
    if len(numbers) == 1:
        return float(numbers[0]) * 1000, "stated amount"
    if len(numbers) == 2:
        return (float(numbers[0]) + float(numbers[1])) * 500, "range midpoint"
    return None, "unparsed source text" if text else "not reported"


def nonempty(values):
    return [clean(value) for value in values if clean(value)]


def status_row(row):
    """Read both the older 12-column and newer compact status-table layouts."""
    values = [clean(value) for value in row]
    parts = nonempty(values)
    if not parts or not (re.fullmatch(r"\d+", parts[0]) or re.fullmatch(r"\d{2,4}-[RPE]-\d{2}", parts[0])):
        return None
    if len(parts) < 4:
        return None
    return parts[0], parts[1], parts[2], parts[3]


def needed_row(row):
    values = [clean(value) for value in row]
    if not values or not re.fullmatch(r"\d+", values[0] or ""):
        return None
    parts = nonempty(values[1:])
    if len(parts) < 4:
        return None
    return values[0], parts[0], parts[1], parts[2], parts[3]


def append_status(records, table, page_no, offset, size, row):
    parsed = status_row(row)
    if not parsed:
        return
    number, name, utility, isd = parsed
    if not name or not utility or not isd:
        return
    change = "Previously approved — expected in-service date update"
    lower = isd.lower()
    if size == "closed out":
        change = "Previously approved — closed out (final ISD or cancellation)"
    elif "cancel" in lower:
        change = "Previously approved — cancelled (reported in expected in-service date field)"
    elif "replac" in lower or "rescop" in lower:
        change = "Previously approved — replaced or re-scoped (reported in expected in-service date field)"
    records.append({
        "project_name": name, "utility": utility, "table": table, "table_row": number,
        "pdf_page": page_no, "printed_page": page_no - offset, "status": f"{change} ({size})",
        "target_isd": isd, "cost_raw": "", "cost_value_k": None,
        "cost_method": f"not reported in {table}",
    })


def append_needed(records, table, page_no, offset, kind, row):
    parsed = needed_row(row)
    if not parsed:
        return
    number, name, area, isd, raw_cost = parsed
    if name == "New Delaney-Colorado River 500 kV line 58":
        name = "New Delaney-Colorado River 500 kV line"
    value_k, method = dollars_k(raw_cost)
    records.append({
        "project_name": name, "utility": area, "service_area": area, "table": table,
        "table_row": number, "pdf_page": page_no, "printed_page": page_no - offset,
        "status": f"Found to be needed — new {kind} project", "target_isd": isd,
        "cost_raw": raw_cost, "cost_value_k": value_k, "cost_method": method,
    })


def append_recommendation(records, table, page_no, project_id, name, utility, area, cost_m, kind, is_rescope):
    status = (
        f"Previously approved — re-scope recommended for approval ({kind}; incremental cost)"
        if is_rescope else f"Found to be needed — new {kind} project recommended for approval"
    )
    records.append({
        "project_name": name, "utility": utility, "service_area": area, "table": table,
        "table_row": project_id, "pdf_page": page_no, "printed_page": page_no,
        "status": status, "target_isd": "", "cost_raw": str(cost_m),
        "cost_value_k": float(cost_m) * 1000, "cost_method": "stated amount (millions per table header)",
        "approval": "Re-scope recommended in Board-approved plan" if is_rescope else "Found needed in Board-approved plan",
    })


for cycle in CYCLES:
    source_id = f"SRC-CAISO-TPP-{cycle['period'].replace('/', '-') }"
    title = f"Board-Approved {cycle['period']} ISO Transmission Plan"
    records = []
    pdf_path = RAW / f"caiso_{cycle['slug']}_transmission_plan.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        for status_spec in cycle["status"]:
            table, pages, size = status_spec[:3]
            table_index = status_spec[3] if len(status_spec) > 3 else None
            for page_no in pages:
                tables = pdf.pages[page_no - 1].extract_tables()
                extracted_tables = [tables[table_index]] if table_index is not None and table_index < len(tables) else tables if table_index is None else []
                for extracted in extracted_tables:
                    for row in extracted:
                        append_status(records, table, page_no, cycle["offset"], size, row)
        for needed_spec in cycle["needed"]:
            table, pages, kind = needed_spec[:3]
            table_index = needed_spec[3] if len(needed_spec) > 3 else 0
            for page_no in pages:
                tables = pdf.pages[page_no - 1].extract_tables()
                if table_index < len(tables):
                    for row in tables[table_index]:
                        append_needed(records, table, page_no, cycle["offset"], kind, row)
        for recommendation in cycle.get("recommendations", []):
            append_recommendation(records, *recommendation)

    # Header/layout recognition can surface the same row in overlapping tables.
    deduped = {
        ((r["table"], r["table_row"], r["pdf_page"], r["project_name"], r["target_isd"])
         if cycle["period"] == "2025/2026" else
         (r["table"], r["table_row"], r["pdf_page"], r["project_name"])
         if cycle["period"] == "2021/2022" else (r["table"], r["table_row"], r["pdf_page"])): r
        for r in records
    }
    records = list(deduped.values())
    # The 2021/22 Table 8.1-1 source repeats row numbers 87 and 88 for five
    # distinct projects. Keep each source row and make its otherwise-ambiguous
    # row locator and source-specific Project ID unique.
    if cycle["period"] in {"2021/2022", "2025/2026"}:
        repeated = {}
        for record in records:
            repeated.setdefault((record["table"], record["pdf_page"], record["table_row"]), []).append(record)
        for group in repeated.values():
            if len(group) > 1:
                for record in group:
                    suffix = record["project_name"] if cycle["period"] == "2021/2022" else f"{record['project_name']}; {record['target_isd']}"
                    record["table_row"] = f"{record['table_row']} — {suffix}"
    for record in records:
        cost = record["cost_raw"] or "not reported"
        locator_label = "project ID" if cycle["period"] == "2025/2026" else "row"
        record.update({
            "source_id": source_id, "source_url": cycle["url"], "source_title": title,
            "source_locator": f"{record['table']}; PDF p. {record['pdf_page']} (printed p. {record['printed_page']}); {locator_label} {record['table_row']}; source cost: {cost}",
        })
    records.sort(key=lambda r: (r["table"], r["pdf_page"], r["table_row"]))
    counts = {}
    for record in records:
        counts[record["table"]] = counts.get(record["table"], 0) + 1
    destination = OUT / f"caiso_{cycle['slug']}_plan_project_history.json"
    destination.write_text(json.dumps({
        "source": {"source_id": source_id, "source_title": title, "source_url": cycle["url"],
                   "plan_cycle": cycle["period"], "board_approval_date": cycle["date"],
                   "scope": "Previously-approved status tables plus project tables found needed in the cycle"},
        "records": records,
    }, indent=2) + "\n")
    print(json.dumps({"cycle": cycle["period"], "records": len(records), "by_table": counts}))
