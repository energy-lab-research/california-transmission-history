"""Extract the 2008 CAISO Plan's Tables 3-1 to 3-13 with row-level citations.

This intentionally keeps the source's cost text as well as a calculation-ready
numeric value. Ranges use their midpoint; '< $X M' entries use the stated upper
bound and are labelled as such in the output.  The workbook preserves the exact
source cost string in its Source locator field.
"""

import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path("/Users/nicoleshi/Documents/Codex/2026-09-01/i-w")
PDF = ROOT / "02_Raw Public Sources/caiso_2008_transmission_plan.pdf"
OUT = ROOT / "03_Processed Data/caiso_2008_plan_previously_approved.json"
SOURCE_URL = "https://www.caiso.com/documents/080128briefingon2008transmissionplan-2008plan.pdf"
SOURCE_ID = "SRC-CAISO-TPP-2008"


def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def cell(page, y0, y1, x0, x1):
    # `within_bbox`, rather than `crop`, prevents a word from an adjacent table
    # row bleeding into the cell when its glyph box touches the row boundary.
    return clean(page.within_bbox((x0, max(0, y0), x1, min(page.height, y1))).extract_text())


def anchors(page, start_y, pattern, x0, x1):
    found = []
    for word in page.extract_words(x_tolerance=2, y_tolerance=2):
        if word["top"] >= start_y and x0 <= word["x0"] < x1 and re.fullmatch(pattern, word["text"]):
            found.append((word["top"], word["text"]))
    # A few text-rendering layers repeat the same token at an identical y point.
    unique = []
    for y, value in sorted(found):
        if not unique or abs(y - unique[-1][0]) > 2:
            unique.append((y, value))
    return unique


def row_windows(row_anchors):
    for i, (y, row_number) in enumerate(row_anchors):
        previous = row_anchors[i - 1][0] if i else None
        following = row_anchors[i + 1][0] if i + 1 < len(row_anchors) else None
        # Use the midpoint between adjacent row numbers. A small downward offset
        # captures letters that cross a baseline without pulling in the next row.
        y0 = (previous + y) / 2 + 2.5 if previous is not None else y - 17
        y1 = (y + following) / 2 + 2.5 if following is not None else y + 45
        yield y0, y1, row_number


def cost_value_thousand(cost_text):
    """Return a numeric $000 value plus the method used, without losing source text."""
    normalized = cost_text.replace("–", "-").replace("—", "-").replace(" ", "")
    if not normalized or normalized.upper() in {"N/A", "TBD"}:
        return None, "not reported"
    upper = re.fullmatch(r"<(\d+(?:\.\d+)?)M", normalized, re.I)
    if upper:
        return float(upper.group(1)) * 1000, "upper bound; source states less than this amount"
    lower = re.fullmatch(r">(\d+(?:\.\d+)?)M", normalized, re.I)
    if lower:
        return float(lower.group(1)) * 1000, "lower bound; source states greater than this amount"
    between = re.fullmatch(r"(\d+(?:\.\d+)?)M?-(\d+(?:\.\d+)?)M", normalized, re.I)
    if between:
        low, high = map(float, between.groups())
        return (low + high) * 500, "range midpoint"
    exact = re.fullmatch(r"(\d+(?:\.\d+)?)M", normalized, re.I)
    if exact:
        return float(exact.group(1)) * 1000, "stated amount"
    return None, "unparsed source text"


def locator(table, pdf_page, printed_page, row, cost_text):
    return (
        f"{table}; PDF p. {pdf_page} (printed p. {printed_page}); row {row}; "
        f"source cost: {cost_text or 'not reported'}"
    )


def project_record(*, project_name, utility, table, table_row, pdf_page, purpose="", location="", path_scope="", cost_raw="", target_isd="", decision_status, note=""):
    """Create one cited observation without converting a proposal into an approval."""
    cost_k, cost_method = cost_value_thousand(cost_raw)
    printed_page = pdf_page - 2
    record = {
        "project_name": project_name,
        "utility": utility,
        "table": table,
        "table_row": str(table_row),
        "pdf_page": pdf_page,
        "printed_page": printed_page,
        "purpose": purpose,
        "location": location,
        "path_scope": path_scope,
        "cost_raw": cost_raw,
        "cost_value_k": cost_k,
        "cost_method": cost_method,
        "target_isd": target_isd,
        "decision_status": decision_status,
        "source_id": SOURCE_ID,
        "source_url": SOURCE_URL,
        "source_title": "2008 CAISO Transmission Plan",
        "source_locator": locator(table, pdf_page, printed_page, table_row, cost_raw),
    }
    if note:
        record["note"] = note
    return record


records = []
with pdfplumber.open(PDF) as pdf:
    # Table 3-1: PG&E. The first printed page has introductory text before the table.
    for pdf_page in range(53, 57):
        page = pdf.pages[pdf_page - 1]
        start_y = 510 if pdf_page == 53 else 130
        for y0, y1, row in row_windows(anchors(page, start_y, r"\d+", 70, 90)):
            name = cell(page, y0, y1, 90, 195)
            if not name:
                continue
            cost_text = cell(page, y0, y1, 410, 470)
            cost_k, cost_method = cost_value_thousand(cost_text)
            # Footnote digits can appear in the narrow number column on the
            # first/last pages. Every actual Table 3-1 project has a readable
            # cost entry, whereas these footnotes do not.
            if cost_k is None:
                continue
            printed_page = pdf_page - 2
            records.append({
                "project_name": name,
                "utility": "PG&E",
                "table": "Table 3-1",
                "table_row": row,
                "pdf_page": pdf_page,
                "printed_page": printed_page,
                "purpose": cell(page, y0, y1, 190, 265),
                "location": cell(page, y0, y1, 265, 325),
                "path_scope": cell(page, y0, y1, 325, 410),
                "cost_raw": cost_text,
                "cost_value_k": cost_k,
                "cost_method": cost_method,
                "target_isd": re.sub(r"^Date\s+", "", cell(page, y0, y1, 470, 530)),
                "source_id": SOURCE_ID,
                "source_url": SOURCE_URL,
                "source_title": "2008 CAISO Transmission Plan",
                "source_locator": locator("Table 3-1", pdf_page, printed_page, row, cost_text),
            })

    # Table 3-2: SCE.
    for pdf_page in range(57, 59):
        page = pdf.pages[pdf_page - 1]
        for y0, y1, row in row_windows(anchors(page, 130, r"\d+", 70, 95)):
            name = cell(page, y0, y1, 95, 242)
            if not name:
                continue
            cost_text = cell(page, y0, y1, 405, 455)
            cost_k, cost_method = cost_value_thousand(cost_text)
            printed_page = pdf_page - 2
            records.append({
                "project_name": name,
                "utility": "SCE",
                "table": "Table 3-2",
                "table_row": row,
                "pdf_page": pdf_page,
                "printed_page": printed_page,
                "purpose": cell(page, y0, y1, 235, 405),
                "location": "",
                "path_scope": "",
                "cost_raw": cost_text,
                "cost_value_k": cost_k,
                "cost_method": cost_method,
                "target_isd": cell(page, y0, y1, 455, 530),
                "source_id": SOURCE_ID,
                "source_url": SOURCE_URL,
                "source_title": "2008 CAISO Transmission Plan",
                "source_locator": locator("Table 3-2", pdf_page, printed_page, row, cost_text),
            })

    # Table 3-3: SDG&E. The source table has no cost column.
    page = pdf.pages[58]
    for y0, y1, row in row_windows(anchors(page, 120, r"P\w+", 65, 115)):
        name = cell(page, y0, y1, 115, 325)
        if not name:
            continue
        pdf_page = 59
        printed_page = 57
        records.append({
            "project_name": name,
            "utility": "SDG&E",
            "table": "Table 3-3",
            "table_row": row,
            "pdf_page": pdf_page,
            "printed_page": printed_page,
            "purpose": "",
            "location": "",
            "path_scope": "",
            "cost_raw": "",
            "cost_value_k": None,
            "cost_method": "not reported in Table 3-3",
            "target_isd": cell(page, y0, y1, 335, 410),
            "note": cell(page, y0, y1, 410, 525),
            "source_id": SOURCE_ID,
            "source_url": SOURCE_URL,
            "source_title": "2008 CAISO Transmission Plan",
            "source_locator": locator("Table 3-3", pdf_page, printed_page, row, "not reported"),
        })

    # Tables 3-4 through 3-6: project proposals with CAISO Management approval.
    # Table 3-4 spans three PDF pages; the last page also begins Table 3-5.
    for pdf_page, start_y, end_y in [(60, 240, None), (61, 130, None), (62, 130, 270)]:
        page = pdf.pages[pdf_page - 1]
        for y0, y1, row in row_windows(anchors(page, start_y, r"\d+", 70, 90)):
            if end_y is not None and y0 >= end_y:
                continue
            name = cell(page, y0, y1, 90, 195)
            if not name:
                continue
            records.append(project_record(
                project_name=name,
                utility="PG&E",
                table="Table 3-4",
                table_row=row,
                pdf_page=pdf_page,
                purpose=cell(page, y0, y1, 195, 265),
                location=cell(page, y0, y1, 265, 325),
                path_scope=cell(page, y0, y1, 325, 410),
                cost_raw=cell(page, y0, y1, 410, 470),
                target_isd=cell(page, y0, y1, 470, 530),
                decision_status="CAISO management approved proposal",
            ))

    page = pdf.pages[61]
    for y0, y1, row in row_windows(anchors(page, 330, r"\d+", 65, 90)):
        name = cell(page, y0, y1, 95, 242)
        if not name:
            continue
        records.append(project_record(
            project_name=name,
            utility="SCE",
            table="Table 3-5",
            table_row=row,
            pdf_page=62,
            purpose=cell(page, y0, y1, 235, 405),
            cost_raw=cell(page, y0, y1, 405, 455),
            target_isd=cell(page, y0, y1, 455, 530),
            decision_status="CAISO management approved proposal",
        ))

    page = pdf.pages[62]
    for y0, y1, row in row_windows(anchors(page, 130, r"P\w+", 65, 115)):
        name = cell(page, y0, y1, 115, 325)
        if not name:
            continue
        records.append(project_record(
            project_name=name,
            utility="SDG&E",
            table="Table 3-6",
            table_row=row,
            pdf_page=63,
            purpose=cell(page, y0, y1, 325, 420),
            cost_raw=cell(page, y0, y1, 420, 470),
            target_isd=cell(page, y0, y1, 470, 530),
            decision_status="CAISO management approved proposal",
        ))

    # Table 3-7: proposals that require CAISO Board of Governors approval.
    page = pdf.pages[63]
    for y0, y1, row in row_windows(anchors(page, 240, r"\d+", 70, 90)):
        name = cell(page, y0, y1, 90, 195)
        if not name:
            continue
        records.append(project_record(
            project_name=name,
            utility="PG&E",
            table="Table 3-7",
            table_row=row,
            pdf_page=64,
            purpose=cell(page, y0, y1, 195, 265),
            location=cell(page, y0, y1, 265, 325),
            path_scope=cell(page, y0, y1, 325, 410),
            cost_raw=cell(page, y0, y1, 410, 470),
            target_isd=cell(page, y0, y1, 470, 530),
            decision_status="Proposal requiring CAISO Board approval",
        ))

    # Table 3-8 uses merged row numbers. The source has multiple project lines
    # under rows 4, 6, and 8, so suffixes make each displayed line filterable.
    table_3_8 = [
        ("1", "West of Devers 230kV Rebuild", "Reliability - Mitigate line overloads west of Devers under contingencies", ">50M", "6/1/2010"),
        ("2", "66kV Antelope-Bailey-WinHub System Reconfiguration", "Reliability - Provide needed bank capacity to relieve base case overload", ">50M", "6/1/2010 - 2012"),
        ("3", "Alberhill 500/115 kV Substation", "Reliability - Provide needed transformer bank capacity to serve load growth in western Riverside County", ">50M", "6/1/2012"),
        ("4a", "Devers-Mirage #3 230 kV Line", "Reliability - Mitigate potential line overloads and voltage criteria violations in the Mirage area", ">50M", "6/1/2011"),
        ("4b", "Magunden-Rector 230 kV T/Ls", "Reliability - Mitigate reliability problems (transient and post transient) in the San Joaquin Valley area under contingency conditions", ">50M", "6/1/2013"),
        ("5", "Antelope Valley (Valyermo) New 230/66 kV Substation and related T/L", "Reliability - Provide needed transformer bank capacity to serve load growth in Palmdale/Lancaster area", ">50M", "6/1/2013"),
        ("6a", "Method of Service for San Joaquin 230/66 kV Sub", "Reliability - Provide needed transformer bank capacity to serve load growth in Rector area", "TBD", "6/1/2016"),
        ("6b", "Upgrade Barre - Ellis 230kV T/L", "Reliability - to meet N-1, N-2 NERC Reliability Criteria", "TBD", "6/1/2012"),
        ("7", "Upgrade Barre - Lewis 230kV T/L", "Reliability - to meet N-1, N-2 NERC Reliability Criteria", "TBD", "6/1/2012"),
        ("8a", "Auld 500/115 kV Substation and Transmission Lines", "Reliability - Provide needed transformer bank capacity to serve load growth in western Riverside County", ">50M", "6/1/2017"),
        ("8b", "San Joaquin Valley Master Plan", "Load service, reliability - mitigate reliability criteria violations for N-0, N-1, N-2", ">50M", "6/1/2013-2016"),
    ]
    for row, name, purpose, cost_raw, target_isd in table_3_8:
        records.append(project_record(project_name=name, utility="SCE", table="Table 3-8", table_row=row, pdf_page=65, purpose=purpose, cost_raw=cost_raw, target_isd=target_isd, decision_status="Proposal requiring CAISO Board approval"))

    for row, name, purpose, cost_raw, target_isd in [
        ("P06130", "Construct 2nd 230 kV line: Encina-Penasquitos", "Maintaining of the South-of-SONGs path rating, possible economics", "50-100M", "June-09"),
        ("P06132", "Relocate South Bay Substation", "Aging infrastructure, South Bay generation retirement", ">100M", "Dec-10"),
    ]:
        records.append(project_record(project_name=name, utility="SDG&E", table="Table 3-9", table_row=row, pdf_page=66, purpose=purpose, cost_raw=cost_raw, target_isd=target_isd, decision_status="Proposal requiring CAISO Board approval"))

    for row, name, utility, target_isd, decision_status in [
        ("1", "Valley Springs 60 kV Line No. 1 Reconductor", "PG&E", "2011", "Not approved by CAISO management"),
        ("P00154", "Reconductor TL13802B, Shadowridge- Calavera Tap", "SDG&E", "Jun-09", "CAISO review in progress"),
        ("P07XXY", "New 230,138 kV Reactive Support: Mission, Sycamore, Telegraph Canyon", "SDG&E", "Jun-10", "CAISO review in progress"),
    ]:
        records.append(project_record(project_name=name, utility=utility, table="Table 3-10", table_row=row, pdf_page=66, target_isd=target_isd, decision_status=decision_status))

    # Tables 3-11 through 3-13 are not approval or project-status tables.
    # They summarize CAISO's short-term-plan recommendations.  Preserve their
    # recommendation and reported status as source evidence while keeping them
    # analytically distinct from final approvals and project proposals.
    short_term_tables = {
        "Table 3-11": [
            ("1", "Woodland Davis Voltage Support", "PG&E – North East", "Reliability concerns", "Long Term: Consider new project to install a shunt capacitor at Woodland or Davis Substation. Short Term: Install UVLS relays at Woodland Substation", "Maintained: May 2012 | Implemented: July 2007", 68),
            ("2", "Atlantic 230/60kV Bank", "PG&E – North East", "Reliability concerns", "Long Term: Convert the 60kV to 115kV. Maintain the in-service date; slipped 1 year since last year's plan. Short Term: Complete necessary bus work to operate with both N.O. Bank 1 and Bank 2 in-service; they can be in parallel or split on the 60kV bus.", "Implemented: Piggy-Back Banks 1 & 2 May 2007", 68),
            ("3", "Table Mt-Rio Oso 230kV Upgrade and Tower Raise", "PG&E – North East", "Congestion concerns", "Long Term: Reconductor the line, current schedule is May 2009. Short Term: Complete any interim upgrades available.", "Maintained: May 2009", 68),
            ("4", "McCall Bank #1 Upgrade", "PG&E – South", "Congestion concern", "Long Term: Maintain or expedite the McCall 230/115kV Transformer Replacement May 2008", "Maintained: May 2008", 68),
            ("5", "Palermo Bank Addition", "PG&E – North East", "Congestion concerns", "Long Term: Maintain current schedule or expedite. Do not let the current schedule of May 2008 slip. Short Term: Apply Short Term Emergency rating on the Palermo Bank", "Maintained: May 2008 | Implemented into T-165 June 2007", 68),
            ("6", "Panoche-Kearney 230kV line Upgrade", "PG&E – South", "Congestion concerns", "Long Term: Consider new project to reconductor the Panoche-Kearney 230kV line or build another source into Gregg. Short Term: Apply Short Term Emergency Rating across peak and Temperature Adjust when pumping at Helms.", "Implemented: July 2007", 69),
            ("7", "Gates-McCall, Panoche-Helm, and Helm-McCall 230kV lines", "PG&E – South", "Congestion concerns", "Long Term: Consider new project to reconductor the Panoche-Helm, Helm-McCall, and Gates-McCall 230kV lines or build another source into Gregg or McCall. Short Term: Apply Short Term Emergency Rating to the Panoche-Helm, Helm-McCall, and Gates-McCall 230kV lines across peak and Temperature Adjust when pumping at Helms.", "", 69),
            ("8", "New Pease-Marysville 60kV line; Palermo-Rio Oso 115kV Reconductor", "PG&E – North East", "Congestion concerns", "Long Term: Maintain current schedule or expedite. Do not let the current schedules slip. Pease-Marysville 60kV line slipped since last year's plan.", "Slipped to: Dec 2009 (From 2007)", 69),
            ("9", "Rio Oso 230/115kV Banks 1 & 2 Upgrade", "PG&E – North East", "Congestion concerns", "Long Term: Maintain current schedule of May 2009. Short Term: Apply Short Term Emergency rating on the Rio Oso Banks", "Maintained: May 2009 | Implemented: July 2007", 69),
            ("10", "Kasson-Lammers 115kV Reconductor", "PG&E – North East", "Congestion concerns", "Long Term: Maintain current schedule. Do not let the current schedule of May 2008 slip.", "Maintained: May 2008", 69),
            ("11", "Third Oakland 115kV Cable", "PG&E – Bay Area", "Congestion concerns", "Long Term: Maintain May 2010 date for new Oakland C-X #2 cable.", "Maintained: May 2010", 70),
            ("12", "Larkin Breaker Upgrade", "PG&E – Bay Area", "Congestion concerns", "Short Term: Determine upgrades required at Larkin to permanently close CB 192.", "", 70),
            ("13", "South of San Mateo Capacity Increase", "PG&E – Bay Area", "Congestion concerns", "Long Term: Maintain May 2009 schedule to reconductor the Ravenswood-San Mateo 115kV line", "Slipped to: May 2011 (From 2009)", 70),
            ("14", "Placer-Gold Hill #1 & #2 115kV lines", "PG&E – North East", "Congestion concerns", "Long Term: Maintain May 2008 schedule to reconductor the two lines.", "Slipped to: May 2009 (From 2008)", 70),
            ("15", "Brighton 230/115kV Bank 9", "PG&E – North East", "Reliability concerns", "Long Term: Maintain current schedule to replace Bank 9.", "Slipped to Nov 2009 (was 5/2009)", 70),
            ("16", "West Sacramento-Brighton 115kV line", "PG&E – North East", "Reliability concerns", "Long Term: Maintain May 2009 schedule to reconductor the line. Short Term: Undo the 4fps re-rate back to the standard emergency rating.", "Maintained: May 2009", 70),
            ("17", "Drum-Rio Oso #1 and #2 115kV line Reconductor or Drum Generation SPS.", "PG&E – North East", "Congestion concerns", "Long Term: Consider new project to reconductor the Drum-Rio Oso #1 and #2 115kV lines. Short Term: Install an SPS that drops Drum Area generation post-contingency.", "", 70),
            ("18", "Bellota-Gregg 230kV Reconductor", "PG&E – South", "Congestion concerns", "Long Term: Consider new project to reconductor the Warnerville-Wilson, Wilson-Gregg, Gregg-Borden, and Wilson-Borden 230kV lines. Short Term: Temperature adjust the lines only when pumping at Helms.", "Implemented into T-129", 70),
            ("19", "Dairyland-Le Grand and Le Grand-Chowchilla 115kV Protection Upgrade", "PG&E – South", "Congestion concerns", "Long Term: Replace the over-current relays with impedance relays. Short Term: De-rate the line in the winter season", "Implemented into T-129 Feb 2007", 71),
            ("20", "Long Term Planning Observations", "PG&E", "Reliability Concerns", "Long Term: Propose projects that protect against drought or low hydro conditions. Consider hydro generation sensitivities under peak load conditions. Re-analyze all re-rates implemented on the system for 10am to 7pm violations.", "", 71),
            ("21", "Fresno 70kV system plan", "PG&E – South", "Reliability Concerns", "Long Term: Add more banks to account for Helm and Mendota on radial or make 70kV upgrades to allow for looped operation. Short Term: Radial the Helm and Mendota 70kV systems", "Implemented into T-129 June 2007", 71),
            ("22", "West Fresno Shunt Capacitor", "PG&E – South", "Reliability Concerns", "Long Term: Consider new project to install shunt capacitor at West Fresno.", "Maintained: 2010", 71),
        ],
        "Table 3-12": [
            ("1", "Victorville-Lugo 500kV Terminal Equipment Upgrade", "SCE", "Congestion Concerns", "Short Term: Upgrade the terminal equipment to at least 3,300 Amps on the LADWP side.", "", 72),
            ("2", "Barre Lewis 220kV Upgrade", "SCE", "Congestion concerns", "Short Term: Upgrade terminal equipment at Barre and Lewis to allow for a higher rating.", "", 72),
            ("3", "Magunden-Vestal #1 and #2 220kV line upgrade", "SCE", "Congestion concerns", "Long Term: Consider a new project to reconductor the 220kV lines to cover the N-1. Short Term: Resolve Clearance issue to allow for higher Short Term Emergency rating.", "", 72),
            ("4", "New Antelope-Pardee 220 kV line to relieve overloads on Antelope-Vincent 220 kV", "SCE", "Congestion concerns", "Long Term: Advance the new Antelope-Pardee 220 kV line to 6/2008 instead of 12/2008", "", 72),
            ("5", "AA Bank Double Breaker Position Upgrades", "SCE", "Reliability Concerns", "Long Term: Upgrade 9 500 kV AA Banks at Eldorado, Lugo, Mira Loma, Valley and Vincent to a double-breaker or breaker-and-a-half configuration.", "", 72),
            ("6", "Julian Hinds-Mirage 220 kV Line Upgrades", "SCE", "Reliability Concerns", "Short Term: Resolve ground clearance issues to get a higher rating for Julian Hinds-Mirage line", "", 72),
        ],
        "Table 3-13": [
            ("1", "Imperial Valley Banks 80&81", "SDG&E", "Congestion concerns", "Long Term: Add a third bank at IV", "", 73),
            ("2", "Miguel Banks 80 & 81", "SDG&E", "Congestion concerns", "Short Term: Reconfigure SPS for loss of one Miguel Bank", "", 73),
            ("3", "New Division-Naval Station Metering 69kV #2 line", "SDG&E", "Reliability Concerns", "Short Term: Expedite project to build a second Division-Naval Station 69kV #2 line to June 2008", "", 73),
            ("4", "Reconductor TL 13812 Talega-San Mateo", "SDG&E", "Reliability Concerns", "Short Term: Expedite the Reconductor project depending on load forecast", "", 73),
            ("5", "Upgrade Miguel 69kV feeders to be double breaker double bus configuration", "SDG&E", "Reliability Concerns", "Short Term: Consider upgrading the feeders at Miguel 69kV bus to be double breaker double bus arrangement.", "", 73),
            ("6", "Escondido 230kV Bank Breaker", "SDG&E", "Reliability Concerns", "Short Term: Replace Bank 70 & 71 230kV disconnects with Circuit Breakers.", "", 73),
            ("7", "New Escondido-Ash 69kV line", "SDG&E", "Reliability Concerns", "Short Term: Consider providing operation instructions in operating procedures to avoid load shedding for N-1-1 contingencies", "", 73),
            ("8", "Add a third source to big load centers (>100 MW)", "SDG&E", "Reliability Concerns", "Long Term: Consider building a third source to Margarita, Granite Hills, Laguna Miguel, and Mesa Rim.", "", 73),
        ],
    }
    for table, records_for_table in short_term_tables.items():
        for row, name, utility, need, recommendation, status_note, pdf_page in records_for_table:
            records.append(project_record(
                project_name=name,
                utility=utility,
                table=table,
                table_row=row,
                pdf_page=pdf_page,
                purpose=need,
                path_scope=recommendation,
                decision_status="CAISO short-term-plan recommendation (not an approval)",
                note=status_note,
            ))

# Remove page-footnote artifacts from the coordinate-based extraction, then
# replace Table 3-6 with the six visually verified source rows. Its legacy PDF
# layout interleaves text columns and does not yield reliable cell crops.
records = [
    record for record in records
    if not (
        (record["table"] == "Table 3-4" and record["project_name"] == "st reflects only capacit")
        or (record["table"] == "Table 3-5" and record["project_name"] == "s project was formerly called the")
        or record["table"] == "Table 3-6"
    )
]
for row, name, purpose, cost_raw, target_isd, note in [
    ("P03183", "Reconductor TL678, Los Coches-Alpine", "Reliability, N-1 thermal violations, existing project, needed advancement", "5-10M", "June 2010", ""),
    ("P061XY", "Reconductor TL13812, Talega-San Mateo", "Reliability, N-1 thermal violations, existing project, needed advancement", "1-5M", "June 2009; ISO recommended earlier", ""),
    ("P02161", "New 69 kV Line: TL6942, Miramar-Sycamore", "Reliability, N-1 thermal violations; was replaced by other projects", "N/A", "Cancelled", "Cancelled; source says it was replaced by other projects"),
    ("P07XXX", "Reconductor TL6915, TL6924: Pomerado-Sycamore", "Reliability, N-1 thermal violations", "1-5M", "June-09", ""),
    ("P06133", "New 230/138 kV transformer: Miguel Substation", "Reliability, South Bay generation retirement", "20-50M", "Jan-10", ""),
    ("P06131", "Loop-in TL13825: Shadowridge 138 kV Switchyard", "Load service, reliability - mitigate thermal violations, serve new distribution", "20-50M", "June-09", ""),
]:
    records.append(project_record(project_name=name, utility="SDG&E", table="Table 3-6", table_row=row, pdf_page=63, purpose=purpose, cost_raw=cost_raw, target_isd=target_isd, decision_status="CAISO management approved proposal", note=note))

def row_sort_value(value):
    return (0, int(value)) if str(value).isdigit() else (1, str(value))


MANUAL_NAME_OVERRIDES = {
    # These seven titles span column/row boundaries in the untagged legacy PDF.
    # They were transcribed against the rendered source table, not inferred.
    ("Table 3-1", "18"): "Glass – Madera 70 kV Reconfiguration (Scope change)",
    ("Table 3-1", "23"): "North Coast Breaker and Switch Upgrades",
    ("Table 3-1", "26"): "West Point – Valley Springs 60 kV Line",
    ("Table 3-1", "40"): "Tesla-Newark 230 kV Path Upgrade",
    ("Table 3-1", "41"): "Metcalf-Evergreen 115 kV",
    ("Table 3-1", "43"): "Ignacio-San Rafael and Ignacio - Las Gallinas 115 kV Reconductoring",
    ("Table 3-1", "45"): "San Mateo and Moraga Synchronous Condenser Replacement",
    ("Table 3-4", "23"): "Placer - Horseshoe 115 kV Reinforcement Project",
}
MANUAL_COST_OVERRIDES = {
    # Superscript footnote markers and one leading glyph are not part of source costs.
    ("Table 3-4", "8"): "1M - 5M",
    ("Table 3-4", "17"): "1M - 5M",
}
MANUAL_FIELD_OVERRIDES = {
    ("Table 3-4", "1"): {"purpose": "Reliability - Meet Customer Demand"},
    ("Table 3-4", "5"): {"purpose": "Reliability - Interconnect Customer"},
    ("Table 3-4", "8"): {"path_scope": "Add a second parallel breaker"},
    ("Table 3-4", "15"): {"path_scope": "Reconductor the Contra Costa - Las Positas and Contra Costa - Lone Tree 230 kV Lines"},
    ("Table 3-4", "16"): {"path_scope": "Replace Cooley Landing 115/60 kV Transformer No. 1 by 2010 and No. 2 by 2011"},
    ("Table 3-4", "18"): {"purpose": "Reliability - Meet Customer Demand and Reduce LCR", "path_scope": "Increase Transmission Capacity"},
    ("Table 3-4", "20"): {"path_scope": "Add a Second 230/70 kV bank"},
    ("Table 3-4", "23"): {"path_scope": "Reconductor Placer to Horseshoe of Placer-Gold Hill Nos. 1 and 2 115 kV Lines"},
    ("Table 3-5", "3"): {"purpose": "Reliability - to meet SCE substation reliability criteria and provide operational flexibility"},
    ("Table 3-7", "4"): {"path_scope": "Reconductor Rio Oso - Gold Hill and Rio Oso - Atlantic 230 kV lines"},
}
for record in records:
    record["project_name"] = MANUAL_NAME_OVERRIDES.get(
        (record["table"], str(record["table_row"])), record["project_name"]
    )
    manual_cost = MANUAL_COST_OVERRIDES.get((record["table"], str(record["table_row"])))
    if manual_cost is not None:
        record["cost_raw"] = manual_cost
        record["cost_value_k"], record["cost_method"] = cost_value_thousand(manual_cost)
        record["source_locator"] = locator(record["table"], record["pdf_page"], record["printed_page"], record["table_row"], manual_cost)
    record.update(MANUAL_FIELD_OVERRIDES.get((record["table"], str(record["table_row"])), {}))
    record.setdefault("decision_status", "Previously approved project status")

records.sort(key=lambda r: (r["table"], r["pdf_page"], row_sort_value(r["table_row"])))
payload = {
    "source": {
        "source_id": SOURCE_ID,
        "source_title": "2008 CAISO Transmission Plan",
        "source_url": SOURCE_URL,
        "scope": "Tables 3-1 through 3-10: previously approved projects, CAISO management-approved proposals, Board-required proposals, and proposals not approved or still under review. Tables 3-11 through 3-13: short-term-plan recommendations, not approvals.",
        "extraction_note": "PDF pages are viewer pages; printed pages are the report's Chapter 3 page numbers.",
    },
    "records": records,
}
OUT.write_text(json.dumps(payload, indent=2) + "\n")

counts = {}
for record in records:
    counts[record["table"]] = counts.get(record["table"], 0) + 1
missing_names = [record for record in records if not record["project_name"]]
print(json.dumps({"output": str(OUT), "records": len(records), "by_table": counts, "missing_names": len(missing_names)}, indent=2))
