from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
RAW_SOURCES = ROOT / "02_Raw Public Sources"
PROCESSED_DATA = ROOT / "03_Processed Data"
SOURCES = [
    {
        "id": "SRC-TPR-PGE-2024-05", "title": "PUBLIC-PGE May 2024 Transmission Project Review Process Project Spreadsheet", "file": "pge_tpr_2024-05.xlsx", "utility": "PG&E", "snapshot_date": "2024-05-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/pge/publicpge-may-2024-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-PGE-2024-11", "title": "PUBLIC-PGE November 2024 Transmission Project Review Process Project Spreadsheet", "file": "pge_tpr_2024-11.xlsx", "utility": "PG&E", "snapshot_date": "2024-11-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/pge/publicpge-november-2024-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-PGE-2025-05", "title": "PUBLIC-PGE May 2025 Transmission Project Review Process Project Spreadsheet", "file": "pge_tpr_2025-05.xlsx", "utility": "PG&E", "snapshot_date": "2025-05-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/pge/publicpge-may-2025-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-PGE-2025-11", "title": "PUBLIC-PGE November 2025 Transmission Project Review Process Project Spreadsheet", "file": "pge_tpr_2025-11.xlsx", "utility": "PG&E", "snapshot_date": "2025-11-03",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/pge/transmissionprojectreviewtpr-process_other-doc_pge_20251103_849972atch09_849981.xlsx",
    },
    {
        "id": "SRC-TPR-PGE-2026-05", "title": "PUBLIC-PGE May 2026 Transmission Project Review Process Project Spreadsheet", "file": "pge_tpr_2026-05.xlsx", "utility": "PG&E", "snapshot_date": "2026-05-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/pge/public-pge-may-2026-tpr-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SCE-2024-06", "title": "PUBLIC-SCE June 2024 Transmission Project Review Process Project Spreadsheet", "file": "sce_tpr_2024-06.xlsx", "utility": "SCE", "snapshot_date": "2024-06-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sce/public-sce-june-2024-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SCE-2024-12", "title": "PUBLIC-SCE Amended December 2024 Transmission Project Review Process Project Spreadsheet", "file": "sce_tpr_2024-12.xlsx", "utility": "SCE", "snapshot_date": "2024-12-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sce/public-sce-amended-december-2024-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SCE-2025-06", "title": "PUBLIC-SCE June 2025 Transmission Project Review Process Project Spreadsheet", "file": "sce_tpr_2025-06.xlsx", "utility": "SCE", "snapshot_date": "2025-06-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sce/public-sce-june-2025-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SCE-2025-12", "title": "PUBLIC-SCE December 2025 Transmission Project Review Process Project Spreadsheet", "file": "sce_tpr_2025-12.xlsx", "utility": "SCE", "snapshot_date": "2025-12-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sce/01-publicpublic-sce-tpr-processdec-2025.xlsx",
    },
    {
        "id": "SRC-TPR-SCE-2026-06", "title": "PUBLIC-SCE June 2026 Transmission Project Review Process Project Spreadsheet", "file": "sce_tpr_2026-06.xlsx", "utility": "SCE", "snapshot_date": "2026-06-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sce/public-sce-june-2026-tpr-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SDGE-2024-01", "title": "PUBLIC-SDGE Amended January 2024 Transmission Project Review Process Project Spreadsheet", "file": "sdge_tpr_2024-01.xlsx", "utility": "SDG&E", "snapshot_date": "2024-01-02",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sdge/publicsdge-amended-january-2024-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SDGE-2024-07", "title": "PUBLIC-SDGE Amended July 2024 Transmission Project Review Process Project Spreadsheet", "file": "sdge_tpr_2024-07.xlsx", "utility": "SDG&E", "snapshot_date": "2024-07-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sdge/publicsdge-amended-september-2024-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SDGE-2025-01", "title": "PUBLIC-SDGE January 2025 Transmission Project Review Process Project Spreadsheet", "file": "sdge_tpr_2025-01.xlsx", "utility": "SDG&E", "snapshot_date": "2025-01-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sdge/publicsdge-january-2025-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SDGE-2025-07", "title": "PUBLIC-SDGE Amended July 2025 Transmission Project Review Process Project Spreadsheet", "file": "sdge_tpr_2025-07.xlsx", "utility": "SDG&E", "snapshot_date": "2025-07-01",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sdge/publicsdge-amended-july-2025-transmission-project-review-process-project-spreadsheet.xlsx",
    },
    {
        "id": "SRC-TPR-SDGE-2026-01", "title": "PUBLIC-SDGE January 2026 Transmission Project Review Process Project Spreadsheet", "file": "sdge_tpr_2026-01.xlsx", "utility": "SDG&E", "snapshot_date": "2026-01-02",
        "url": "https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/energy-division/documents/transmission-project-review-process/sdge/jan26sdgepublic--resolution-e5252-tpr-process-data.xlsx",
    },
    {
        "id": "SRC-TPR-SDGE-2026-07", "title": "PUBLIC-SDG&E July 2026 Resolution E-5252 TPR Process Data", "file": "sdge_tpr_2026-07.xlsx", "utility": "SDG&E", "snapshot_date": "2026-07-01",
        "url": "https://www.sdge.com/sites/default/files/JULY26-SDG%26E-Public%20-%20Resolution%20E-5252%20TPR%20Process%20Data.xlsx",
    },
]

USEFUL = {
    "Row/Line No.", "Row |Line No.", "Row No", "Project Name", "Project Name(s)", "Location", "Location2",
    "Project Description", "Project Description - What", "Project Description - Action Taken",
    "Project Description - Action Taken (2)", "Primary Purpose", "Secondary Purpose",
    "Transmission Project Size", "Transmission Project Size (length in miles)", "Transmission Voltage", "Transmission Voltage Level (kV)",
    "Substation or Transformer Capacity (MVA and/or kV)", "Utility Unique ID #1 (Most Specific)", "Work Order (Utility Unique ID #1)",
    "Utility Unique ID #1(Most Specific)", "Utility Unique ID #2 (Less Specific)", "Project ID (Utility Unique ID #2)", "CAISO Year",
    "TPP Phase 3", "Year(s) when considered in CAISO TPP",
    "Link to TPP where project has been considered, approved, and/or expected to be considered",
    "GIDAP-Related", "CEQA Status", "CEQA Document Type", "CEQA Lead Agency", "CPUC Filing Type",
    "CPUC Status", "Project Status", "Construction Start Date", "Original Planned In-Service Date",
    "Current Projected or Actual In-Service Date", "Reason for Change in In-Service Date",
    "Reason for Change in In-Service Date (2)", "Original Projected Cost or Cost Range ($000)",
    "Original Projected Cost or", "Current Projected Total or Actual Final Cost ($000)", "Changes in Unique IDs",
}


def clean(value):
    if value is None:
        return None
    if isinstance(value, (dt.date, dt.datetime)):
        return value.date().isoformat()
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        v = value.strip().replace("\n", " ")
        return None if v in {"", "NA", "N/A", "OAI", "TBD"} else v
    return value


def money_midpoint(value):
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    nums = [float(x.replace(",", "")) for x in re.findall(r"\$?([0-9][0-9,]*(?:\.[0-9]+)?)", value)]
    if not nums:
        return None
    return sum(nums) / len(nums)


def select_sheet(workbook):
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows(min_row=1, max_row=min(sheet.max_row, 12), values_only=True):
            normalized = {re.sub(r"\s+", " ", str(value or "")).strip() for value in row}
            if normalized.intersection({"Project Name", "Project Name(s)"}) and "CAISO Year" in normalized:
                return sheet
    raise ValueError("No TPR project sheet found")


def norm_key(value):
    if value is None:
        return None
    return re.sub(r"\s+", " ", str(value).strip()).upper()


def get(data, *names):
    for name in names:
        if name in data:
            return clean(data[name])
    return None


def parse_source(spec):
    workbook = load_workbook(RAW_SOURCES / spec["file"], read_only=True, data_only=True)
    sheet = select_sheet(workbook)
    header_row = None
    headers = None
    for num, row in enumerate(sheet.iter_rows(min_row=1, max_row=12, values_only=True), 1):
        normalized = [re.sub(r"\s+", " ", str(value or "")).strip() for value in row]
        if any(value in {"Project Name", "Project Name(s)"} for value in normalized) and "CAISO Year" in normalized:
            header_row, headers = num, normalized
            break
    rows = []
    for source_row, values in enumerate(sheet.iter_rows(min_row=header_row + 1, values_only=True), header_row + 1):
        data = {headers[i]: values[i] if i < len(values) else None for i in range(len(headers)) if headers[i] in USEFUL}
        caiso_year = get(data, "CAISO Year")
        if not isinstance(caiso_year, (int, float)) or not (1900 < caiso_year < 2100):
            continue
        line_id = get(data, "Row/Line No.", "Row |Line No.", "Row No")
        uid1 = get(data, "Utility Unique ID #1 (Most Specific)", "Utility Unique ID #1(Most Specific)", "Work Order (Utility Unique ID #1)")
        uid2 = get(data, "Utility Unique ID #2 (Less Specific)", "Project ID (Utility Unique ID #2)")
        project_key = f"{spec['utility']}|{norm_key(uid1)}" if uid1 is not None else f"{spec['utility']}|LINE|{norm_key(line_id)}"
        original_cost_raw = get(data, "Original Projected Cost or Cost Range ($000)", "Original Projected Cost or")
        current_cost = get(data, "Current Projected Total or Actual Final Cost ($000)")
        rows.append({
            "snapshot_id": f"{spec['utility'].replace('&', 'AND').replace(' ', '')}-{spec['snapshot_date']}",
            "snapshot_date": spec["snapshot_date"],
            "utility": spec["utility"],
            "project_key": project_key,
            "line_item_id": line_id,
            "utility_id": uid1,
            "parent_id": uid2,
            "project_name": get(data, "Project Name(s)", "Project Name"),
            "location": get(data, "Location", "Location2"),
            "project_description": get(data, "Project Description"),
            "asset_type": get(data, "Project Description - What"),
            "action_1": get(data, "Project Description - Action Taken"),
            "action_2": get(data, "Project Description - Action Taken (2)"),
            "primary_purpose": get(data, "Primary Purpose"),
            "secondary_purpose": get(data, "Secondary Purpose"),
            "caiso_approval_year": int(caiso_year),
            "tpp_phase": get(data, "TPP Phase 3"),
            "tpp_years": get(data, "Year(s) when considered in CAISO TPP"),
            "tpp_link": get(data, "Link to TPP where project has been considered, approved, and/or expected to be considered"),
            "gidap_related": get(data, "GIDAP-Related"),
            "ceqa_status": get(data, "CEQA Status"),
            "ceqa_doc_type": get(data, "CEQA Document Type"),
            "ceqa_lead": get(data, "CEQA Lead Agency"),
            "cpuc_filing_type": get(data, "CPUC Filing Type"),
            "cpuc_status": get(data, "CPUC Status"),
            "project_status": get(data, "Project Status"),
            "construction_start": get(data, "Construction Start Date"),
            "original_isd": get(data, "Original Planned In-Service Date"),
            "current_isd": get(data, "Current Projected or Actual In-Service Date"),
            "delay_reason_1": get(data, "Reason for Change in In-Service Date"),
            "delay_reason_2": get(data, "Reason for Change in In-Service Date (2)"),
            "length_miles": get(data, "Transmission Project Size (length in miles)", "Transmission Project Size"),
            "voltage_kv": get(data, "Transmission Voltage Level (kV)", "Transmission Voltage"),
            "capacity": get(data, "Substation or Transformer Capacity (MVA and/or kV)"),
            "original_cost_raw_k": original_cost_raw,
            "original_cost_midpoint_k": money_midpoint(original_cost_raw),
            "current_total_cost_k": current_cost if isinstance(current_cost, (int, float)) else money_midpoint(current_cost),
            "id_changes": get(data, "Changes in Unique IDs"),
            "source_id": spec["id"],
            "source_title": spec["title"],
            "source_sheet": sheet.title,
            "source_row": source_row,
            "source_locator": f"{sheet.title}; row {source_row}",
            "source_url": spec["url"],
            "source_file": spec["file"],
        })
    return rows


def record_changes(rows):
    groups = defaultdict(list)
    for r in rows:
        groups[r["project_key"]].append(r)
    fields = [
        ("current_isd", "Schedule change", "Schedule"),
        ("current_total_cost_k", "Cost estimate change", "Cost"),
        ("length_miles", "Potential size/route change", "Physical"),
        ("voltage_kv", "Potential voltage/size change", "Physical"),
        ("project_description", "Potential scope/reroute change", "Scope"),
        ("project_status", "Status change", "Status"),
    ]
    events = []
    for key, group in groups.items():
        group.sort(key=lambda x: x["snapshot_date"])
        for previous, current in zip(group, group[1:]):
            for field, label, category in fields:
                before, after = previous[field], current[field]
                if before is None or after is None or before == after:
                    continue
                event_type = label
                review = "Review" if category in {"Physical", "Scope"} else "Derived"
                events.append({
                    "event_id": f"EVT-{len(events)+1:05d}", "project_key": key,
                    "utility": current["utility"], "project_name": current["project_name"],
                    "event_date": current["snapshot_date"], "event_category": category,
                    "event_type": event_type, "field_changed": field,
                    "before_value": before, "after_value": after,
                    "review_status": review,
                    "evidence_source_id": current["source_id"],
                    "evidence_url": current["source_url"],
                    "evidence_locator": current["source_locator"],
                    "evidence_note": f"Same utility project identifier in {previous['snapshot_id']} and {current['snapshot_id']}; verify interpretation against the linked source before treating as a confirmed reroute/rescope.",
                })
    return events


NEW_SOURCE_IDS = {
    "SRC-TPR-PGE-2024-05", "SRC-TPR-SCE-2024-06", "SRC-TPR-SDGE-2024-01",
    "SRC-TPR-SDGE-2024-07", "SRC-TPR-SDGE-2026-01",
}


def build_payload(source_specs, retained_rows=None):
    rows = list(retained_rows or [])
    for source in source_specs:
        rows.extend(parse_source(source))
    project_index = {}
    for row in sorted(rows, key=lambda x: x["snapshot_date"]):
        project_index[row["project_key"]] = row
    return {
        "sources": SOURCES,
        "snapshots": rows,
        "latest_projects": list(project_index.values()),
        "events": record_changes(rows),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-new", action="store_true", help="Parse newly added release files and retain already audited prior snapshots.")
    args = parser.parse_args()
    if args.only_new:
        existing = json.loads((PROCESSED_DATA / "tpr_standardized.json").read_text())
        retained = [row for row in existing["snapshots"] if row["source_id"] not in NEW_SOURCE_IDS]
        selected_sources = [source for source in SOURCES if source["id"] in NEW_SOURCE_IDS]
        payload = build_payload(selected_sources, retained)
    else:
        payload = build_payload(SOURCES)
    PROCESSED_DATA.mkdir(parents=True, exist_ok=True)
    (PROCESSED_DATA / "tpr_standardized.json").write_text(json.dumps(payload, indent=2, default=str))
    print(json.dumps({"snapshots": len(payload["snapshots"]), "latest_projects": len(payload["latest_projects"]), "events": len(payload["events"])}, indent=2))
