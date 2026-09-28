from __future__ import annotations

import json
import re
import datetime as dt
from pathlib import Path

import pdfplumber
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "02_Raw Public Sources" / "caiso_tdf_approved_projects_may2023.pdf"
PROCESSED_DATA = ROOT / "03_Processed Data"
SOURCE = {
    "source_id": "SRC-CAISO-TDF-2023-05",
    "source_title": "Transmission Development Forum - Attachment 1 - Approved Projects - Transmission Planning Process - May 2023",
    "source_url": "https://www.caiso.com/documents/transmissiondevelopmentforum-attachment1_approvedprojects-transmissionplanningprocess-may2023.pdf",
    "report_date": "2023-05-01",
    "retrieval_date": "2026-09-01",
}

TDF_RELEASES = [
    {
        "source_id": "SRC-CAISO-TDF-2023-10", "file": "caiso_tdf_2023-10_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — October 2023",
        "source_url": "https://www.caiso.com/documents/approvedprojects-transmissionplanningprocess-october2023.xlsx",
        "period_label": "October 2023 TDF", "observation_date": "2023-10-25", "period_token": r"oct(?:ober)?\s*2023",
    },
    {
        "source_id": "SRC-CAISO-TDF-2024-01", "file": "caiso_tdf_2024-01_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — January 2024",
        "source_url": "https://www.caiso.com/documents/approvedprojects-transmissionplanningprocess-january2024.xlsx",
        "period_label": "January 2024 TDF", "observation_date": "2024-01-31", "period_token": r"jan(?:uary)?\s*2024",
    },
    {
        "source_id": "SRC-CAISO-TDF-2024-07", "file": "caiso_tdf_2024-07_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — July 2024",
        "source_url": "https://www.caiso.com/documents/approved-projects-transmission-planning-process-jul-31-2024.xlsx",
        "period_label": "July 2024 TDF", "observation_date": "2024-07-31", "period_token": r"jul(?:y)?\s*2024",
    },
    {
        "source_id": "SRC-CAISO-TDF-2025-01", "file": "caiso_tdf_2025-01_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — January 2025",
        "source_url": "https://www.caiso.com/documents/approved-projects-transmission-planning-process-jan-2025.xlsx",
        "period_label": "January 2025 TDF", "observation_date": "2025-01-29", "period_token": r"jan(?:uary)?\s*2025",
    },
    {
        "source_id": "SRC-CAISO-TDF-2025-07", "file": "caiso_tdf_2025-07_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — July 2025",
        "source_url": "https://www.caiso.com/documents/approved-projects-transmission-planning-process-jul-2025.xlsx",
        "period_label": "July 2025 TDF", "observation_date": "2025-07-30", "period_token": r"jul(?:y)?\s*2025",
    },
    {
        "source_id": "SRC-CAISO-TDF-2026-01", "file": "caiso_tdf_2026-01_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — January 2026",
        "source_url": "https://www.caiso.com/documents/approved-projects-transmission-planning-process-january-2026.xlsx",
        "period_label": "January 2026 TDF", "observation_date": "2026-01-28", "period_token": r"jan(?:uary)?\s*2026",
    },
    {
        "source_id": "SRC-CAISO-TDF-2026-07", "file": "caiso_tdf_2026-07_approved_projects.xlsx",
        "source_title": "Approved Projects — Transmission Planning Process — July 2026",
        "source_url": "https://www.caiso.com/documents/approved-projects-transmission-planning-process-jul-2026.xlsx",
        "period_label": "July 2026 TDF", "observation_date": "2026-07-29", "period_token": r"jul(?:y)?\s*2026",
    },
]


def clean(value):
    if value is None:
        return None
    value = re.sub(r"\s+", " ", value).strip()
    return None if value in {"", "N/A", "TBD"} else value


def key_part(value):
    return re.sub(r"[^A-Z0-9]+", "", (value or "").upper())


def excel_value(value):
    if isinstance(value, (dt.date, dt.datetime)):
        return value.date().isoformat()
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, (int, float)):
        return value
    return clean(value)


def header_index(headers, predicate):
    for index, header in enumerate(headers):
        text = re.sub(r"\s+", " ", str(header or "")).strip()
        if predicate(text):
            return index
    return None


def current_column(headers, period_token):
    return header_index(headers, lambda text: "TDF" in text.upper() and re.search(period_token, text, re.I))


def append_release_observations(observations):
    for release in TDF_RELEASES:
        workbook = load_workbook(ROOT / "02_Raw Public Sources" / release["file"], read_only=True, data_only=True)
        for sheet in workbook.worksheets:
            header_row = None
            headers = None
            for row_number, values in enumerate(sheet.iter_rows(min_row=1, max_row=5, values_only=True), 1):
                if any(re.sub(r"\s+", " ", str(value or "")).strip() == "Project" for value in values) and any(re.sub(r"\s+", " ", str(value or "")).strip() == "PTO" for value in values):
                    header_row, headers = row_number, list(values)
                    break
            if not headers:
                continue
            project_idx = header_index(headers, lambda text: text == "Project")
            pto_idx = header_index(headers, lambda text: text == "PTO")
            approval_idx = header_index(headers, lambda text: "TRANSMISSION PLAN APPROVED" in text.upper())
            initial_idx = header_index(headers, lambda text: "APPROVAL" in text.upper() and "SERVICE" in text.upper() and "TDF" not in text.upper())
            status_idx = header_index(headers, lambda text: text.strip().upper() == "PROJECT STATUS")
            notes_idx = header_index(headers, lambda text: text.strip().upper() == "NOTES")
            observed_idx = current_column(headers, release["period_token"])
            if project_idx is None or pto_idx is None or observed_idx is None:
                continue
            for row_number, values in enumerate(sheet.iter_rows(min_row=header_row + 1, values_only=True), header_row + 1):
                project_name = excel_value(values[project_idx] if project_idx < len(values) else None)
                utility = excel_value(values[pto_idx] if pto_idx < len(values) else None)
                observed_isd = excel_value(values[observed_idx] if observed_idx < len(values) else None)
                if not project_name or not utility or observed_isd is None:
                    continue
                approval_cycle = excel_value(values[approval_idx] if approval_idx is not None and approval_idx < len(values) else None)
                original_isd = excel_value(values[initial_idx] if initial_idx is not None and initial_idx < len(values) else None)
                status = excel_value(values[status_idx] if status_idx is not None and status_idx < len(values) else None)
                note = excel_value(values[notes_idx] if notes_idx is not None and notes_idx < len(values) else None)
                observations.append({
                    "observation_id": f"TDF-{len(observations)+1:05d}",
                    "project_key": f"CAISO-TDF|{key_part(str(utility))}|{key_part(str(project_name))}",
                    "project_name": project_name,
                    "utility": utility,
                    "approval_cycle": approval_cycle,
                    "original_isd": original_isd,
                    "project_status": status,
                    "project_status_2023q2": status,
                    "period_label": release["period_label"],
                    "observation_date": release["observation_date"],
                    "report_frequency": "TDF release",
                    "observed_isd": observed_isd,
                    "note": note,
                    "source_id": release["source_id"],
                    "source_title": release["source_title"],
                    "source_url": release["source_url"],
                    "source_locator": f"{sheet.title}; row {row_number}",
                })


periods = [
    ("2020-2021 Plan", "2020-12-31", "Annual TPP plan", 4),
    ("2022-Q1", "2022-01-31", "Quarterly TDF", 5),
    ("2022-Q2", "2022-04-30", "Quarterly TDF", 6),
    ("2022-Q3", "2022-07-31", "Quarterly TDF", 7),
    ("2022-Q4", "2022-10-31", "Quarterly TDF", 8),
    ("2023-Q1", "2023-01-31", "Quarterly TDF", 9),
    ("2023-Q2", "2023-04-30", "Quarterly TDF", 10),
]

projects = []
observations = []
with pdfplumber.open(PDF) as pdf:
    for page_num, page in enumerate(pdf.pages, 1):
        table = page.extract_tables()[0]
        for table_row, row in enumerate(table[1:], 2):
            fields = [clean(cell) for cell in row]
            project_name, pto, approval_cycle, original_isd = fields[0:4]
            if not project_name or not pto:
                continue
            project_key = f"CAISO-TDF|{key_part(pto)}|{key_part(project_name)}"
            locator = f"page {page_num}; table row {table_row}"
            base = {
                "project_key": project_key,
                "project_name": project_name,
                "utility": pto,
                "approval_cycle": approval_cycle,
                "original_isd": original_isd,
                "project_status_2023q2": fields[11],
                "permit_filing": fields[12],
                "construction_start": fields[13],
                "source_id": SOURCE["source_id"],
                "source_title": SOURCE["source_title"],
                "source_url": SOURCE["source_url"],
                "source_locator": locator,
            }
            projects.append(base)
            for label, observation_date, frequency, field_index in periods:
                observed_isd = fields[field_index]
                if observed_isd is None:
                    continue
                observations.append({
                    **base,
                    "observation_id": f"TDF-{len(observations)+1:05d}",
                    "period_label": label,
                    "observation_date": observation_date,
                    "report_frequency": frequency,
                    "observed_isd": observed_isd,
                    "note": fields[14],
                })

append_release_observations(observations)
payload = {"source": SOURCE, "sources": [SOURCE, *TDF_RELEASES], "projects": projects, "observations": observations}
PROCESSED_DATA.mkdir(parents=True, exist_ok=True)
(PROCESSED_DATA / "tdf_historical.json").write_text(json.dumps(payload, indent=2))
print(json.dumps({"projects": len(projects), "observations": len(observations)}))
