"""Build a deliberately conservative CAISO annual-plan project crosswalk.

The first set links reviewed 2008-to-2010/11 title variants. The subsequent
links connect each adjacent planning cycle only when the normalized source
title is unique on both sides and the PTO label is identical (or a clearly
source-visible successor label). Each link preserves both table locators so it
can be independently reviewed before trend analysis.
"""

import json
from pathlib import Path


ROOT = Path("/Users/nicoleshi/Documents/Codex/CA Transmission Data/i-w")
PLAN_2008 = ROOT / "03_Processed Data/caiso_2008_plan_previously_approved.json"
PLAN_2009_PROPOSALS = ROOT / "03_Processed Data/caiso_2009_request_window_proposals.json"
PLAN_2007_TEHACHAPI = ROOT / "03_Processed Data/caiso_2007_tehachapi_plan_project_history.json"
PLAN_2007_TEHACHAPI_BOARD = ROOT / "03_Processed Data/caiso_csrtp_2006_tehachapi_board_presentation_project_history.json"
PLAN_2010_BRIEFING = ROOT / "03_Processed Data/caiso_2010_plan_briefing_project_history.json"
PLAN_2011 = ROOT / "03_Processed Data/caiso_2010_2011_plan_project_history.json"
PLAN_2012 = ROOT / "03_Processed Data/caiso_2011_2012_plan_project_history.json"
OUT = ROOT / "03_Processed Data/caiso_annual_plan_crosswalk.json"


# (2008 table, row, 2010/11 table, row, match description).  This is an
# auditable review list, not a fuzzy-match output.  It intentionally contains
# only high-confidence recurring project links.
LINKS = [
    ("Table 3-1", "21", "Table 8.1-1", "15", "Exact title and PG&E."),
    ("Table 3-1", "24", "Table 8.1-1", "1", "Same PG&E route; 2010/11 adds '#2'."),
    ("Table 3-1", "25", "Table 8.1-1", "29", "Exact title and PG&E."),
    ("Table 3-1", "28", "Table 8.1-1", "9", "Exact title and PG&E."),
    ("Table 3-1", "29", "Table 8.1-1", "10", "Exact title and PG&E."),
    ("Table 3-1", "30", "Table 8.1-1", "14", "Exact title and PG&E."),
    ("Table 3-1", "31", "Table 8.1-1", "4", "Exact title and PG&E."),
    ("Table 3-1", "32", "Table 8.1-1", "17", "Exact title and PG&E."),
    ("Table 3-1", "34", "Table 8.1-1", "6", "Exact title and PG&E."),
    ("Table 3-1", "35", "Table 8.1-1", "12", "Exact title and PG&E."),
    ("Table 3-1", "36", "Table 8.1-1", "28", "Exact title and PG&E."),
    ("Table 3-1", "37", "Table 8.1-1", "18", "Exact title and PG&E."),
    ("Table 3-1", "38", "Table 8.1-1", "19", "Exact title and PG&E."),
    ("Table 3-1", "39", "Table 8.1-1", "20", "Exact title and PG&E."),
    ("Table 3-1", "40", "Table 8.1-1", "22", "Same PG&E route; 2010/11 adds 'Path Upgrade'."),
    ("Table 3-1", "41", "Table 8.1-1", "26", "Exact title and PG&E."),
    ("Table 3-1", "42", "Table 8.1-1", "27", "Exact title and PG&E."),
    ("Table 3-1", "43", "Table 8.1-1", "30", "Same PG&E paired routes; 2010/11 expands the parenthetical scope."),
    ("Table 3-1", "44", "Table 8.1-1", "32", "Exact title and PG&E."),
    ("Table 3-1", "45", "Table 8.1-1", "33", "Same PG&E equipment; 2010/11 adds 'Replacement'."),
    ("Table 3-1", "46", "Table 8.1-1", "34", "Exact title and PG&E."),
    ("Table 3-3", "P01141", "Table 8.1-1", "81", "Same SDG&E project code P01141 and route."),
    ("Table 3-3", "P04138", "Table 8.1-2", "3", "Same SDG&E project; 2008 title adds 'New 500 kV line'."),
]


plan_2008 = json.loads(PLAN_2008.read_text())["records"]
plan_2009_proposals = json.loads(PLAN_2009_PROPOSALS.read_text())["records"]
plan_2007_tehachapi = json.loads(PLAN_2007_TEHACHAPI.read_text())["records"]
plan_2007_tehachapi_board = json.loads(PLAN_2007_TEHACHAPI_BOARD.read_text())["records"]
plan_2010_briefing = json.loads(PLAN_2010_BRIEFING.read_text())["records"]
plan_2011 = json.loads(PLAN_2011.read_text())["records"]
plan_2012 = json.loads(PLAN_2012.read_text())["records"]
by_2008 = {(r["table"], str(r["table_row"])): r for r in plan_2008}
by_2009_proposal = {str(r["proposal_number"]): r for r in plan_2009_proposals}
by_2007_tehachapi = {(r["table"], str(r["table_row"])): r for r in plan_2007_tehachapi}
by_2007_tehachapi_board = {(r["table"], str(r["table_row"])): r for r in plan_2007_tehachapi_board}
by_2010_briefing = {(r["table"], str(r["table_row"])): r for r in plan_2010_briefing}
by_2011 = {(r["table"], str(r["table_row"])): r for r in plan_2011}

records = []
def add_link(left, right, left_key, right_key, left_period, right_period, rationale, method):
    if left["utility"] != right["utility"]:
        raise ValueError(f"PTO mismatch for {left_key} and {right_key}")
    records.append({
        "confidence": "High",
        "match_method": method,
        "match_rationale": rationale,
        "project_keys": [left_key, right_key],
        "left_period": left_period,
        "right_period": right_period,
        "left_project_name": left["project_name"],
        "right_project_name": right["project_name"],
        "utility": left["utility"],
        "evidence": f"{left_period}: {left['source_locator']} | {right_period}: {right['source_locator']}",
    })

for number, (table_08, row_08, table_11, row_11, rationale) in enumerate(LINKS, start=1):
    left = by_2008[(table_08, row_08)]
    right = by_2011[(table_11, row_11)]
    add_link(
        left, right,
        f"CAISO-TPP-2008|{table_08}|{row_08}",
        f"CAISO-TPP-2010-2011|{table_11}|{row_11}",
        "2008", "2010/11", rationale,
        "Manual source-title review; same PTO; exact or source-visible title variant",
    )

# The 2009 presentation is a proposal snapshot, not a final plan.  Only
# Highwind is linked: its distinctive title is visible in the later final-plan
# status tables.  Do not infer continuity for the other proposals from shared
# endpoints, geography, or technology alone.
highwind_proposal = by_2009_proposal["8"]
highwind_2011 = by_2011[("Table 8.1-2", "1")]
records.append({
    "confidence": "High",
    "match_method": "Manual source-title review; exact distinctive title; proposal snapshot to final-plan status row",
    "match_rationale": "'Highwind Location Constrained Resource Interconnection Facility' is the distinctive project title in both sources; the 2009 source is a proposal snapshot and the 2010/11 source is a later final-plan status row.",
    "project_keys": [
        "CAISO-TPP-2009-PROP|8",
        "CAISO-TPP-2010-2011|Table 8.1-2|1",
    ],
    "left_period": "2009 request-window proposal snapshot",
    "right_period": "2010/11",
    "left_project_name": highwind_proposal["project_name"],
    "right_project_name": highwind_2011["project_name"],
    "utility": "CAISO proposal snapshot → SCE",
    "evidence": (
        f"2009 proposal: {highwind_proposal['source_locator']} | "
        f"2010/11 final plan: {highwind_2011['source_locator']}"
    ),
})

proposal_dispositions = []
for proposal in plan_2009_proposals:
    if proposal["proposal_number"] == 8:
        disposition = "Linked"
        note = "High-confidence link to the 2010/11 Highwind final-plan status row; that row already bridges to the 2011/12 Highwind row."
    else:
        disposition = "Unresolved"
        note = "No high-confidence identity link in the imported 2010/11–2025/26 final-plan tables. Shared endpoint, region, voltage, or generic technology terms are not sufficient identity evidence."
    proposal_dispositions.append({
        "proposal_number": proposal["proposal_number"],
        "project_key": f"CAISO-TPP-2009-PROP|{proposal['proposal_number']}",
        "project_name": proposal["project_name"],
        "disposition": disposition,
        "note": note,
        "source_evidence": proposal["source_locator"],
    })

def normalize(title):
    # Remove a source footnote suffix only; retain voltage and circuit numbers.
    title = title.strip()
    title = __import__("re").sub(r"(?:\)|\])\d{1,3}$", "", title)
    return "".join(character.lower() for character in title if character.isalnum())

def unique_by_title(records):
    groups = {}
    for record in records:
        groups.setdefault((record["utility"], normalize(record["project_name"])), []).append(record)
    return {key: values[0] for key, values in groups.items() if len(values) == 1}

unique_2011 = unique_by_title(plan_2011)
unique_2012 = unique_by_title(plan_2012)
def project_key(period, record):
    return f"CAISO-TPP-{period.replace('/', '-')}|{record['table']}|{record['table_row']}"

def link_adjacent(left_records, right_records, left_period, right_period):
    """Link one pair of cycles conservatively, without fuzzy-name inference."""
    left_unique = unique_by_title(left_records)
    right_unique = unique_by_title(right_records)
    for utility_title in sorted(set(left_unique) & set(right_unique)):
        left, right = left_unique[utility_title], right_unique[utility_title]
        add_link(
            left, right, project_key(left_period, left), project_key(right_period, right),
            left_period, right_period,
            "Exact normalized project title and same PTO; unique on both plan sides.",
            "Exact normalized source title; same PTO; unique on both plan sides",
        )
    # PTO labels sometimes visibly change as project ownership changes. The
    # exact unique title still provides a reviewable project-continuity link;
    # it is recorded separately rather than silently treating PTOs as equal.
    left_by_title = {}
    right_by_title = {}
    for record in left_records:
        left_by_title.setdefault(normalize(record["project_name"]), []).append(record)
    for record in right_records:
        right_by_title.setdefault(normalize(record["project_name"]), []).append(record)
    for title in sorted(set(left_by_title) & set(right_by_title)):
        left_group, right_group = left_by_title[title], right_by_title[title]
        if len(left_group) != 1 or len(right_group) != 1:
            continue
        left, right = left_group[0], right_group[0]
        if left["utility"] == right["utility"]:
            continue
        records.append({
            "confidence": "High", "match_method": "Exact normalized source title; unique on both plan sides; source-visible PTO label change",
            "match_rationale": "Exact normalized project title is unique on both plan sides; PTO label differs in the source and is preserved for review.",
            "project_keys": [project_key(left_period, left), project_key(right_period, right)],
            "left_period": left_period, "right_period": right_period,
            "left_project_name": left["project_name"], "right_project_name": right["project_name"],
            "utility": f"{left['utility']} → {right['utility']}",
            "evidence": f"{left_period}: {left['source_locator']} | {right_period}: {right['source_locator']}",
        })

plans = [
    ("2010/2011", plan_2011), ("2011/2012", plan_2012),
    *[(f"{year}/{year + 1}", json.loads((ROOT / "03_Processed Data" / f"caiso_{year}_{year + 1}_plan_project_history.json").read_text())["records"]) for year in range(2012, 2026)],
]
for (left_period, left_records), (right_period, right_records) in zip(plans, plans[1:]):
    link_adjacent(left_records, right_records, left_period, right_period)

# The partial March 2010 briefing has only one unambiguous continuation in the
# imported final plan: exactly the same Bayfront title and SDG&E PTO appear in
# the 2010/11 status table.  Alberhill's differently named final-plan record
# is intentionally left unlinked rather than inferred from its shared place
# name.
add_link(
    by_2010_briefing[("Slide 7", "2")],
    by_2011[("Table 8.1-2", "5")],
    "CAISO-TPP-2010-BRIEFING|Slide 7|2",
    "CAISO-TPP-2010-2011|Table 8.1-2|5",
    "2010 Board briefing",
    "2010/11",
    "Exact project title and SDG&E PTO; the briefing reports Board approval and the final plan reports a later expected-ISD update.",
    "Manual source-title review; exact title and same PTO",
)

# The January presentation is explicitly a management recommendation, not an
# approval. Its Tehachapi aggregate nonetheless has the same exact title and
# SCE PTO as the later 2010/11 final-plan status row, so the continuity is
# documented without upgrading its January approval status.
add_link(
    by_2007_tehachapi_board[("Slides 6, 10, and 11", "1")],
    by_2011[("Table 8.1-2", "2")],
    "CAISO-CSRTP-2006-TEHACHAPI-BOARD-2007-01-24|Slides 6, 10, and 11|1",
    "CAISO-TPP-2010-2011|Table 8.1-2|2",
    "January 2007 CSRTP-2006 Board presentation",
    "2010/11",
    "Exact project title and SCE PTO; the January source records a management recommendation conditioned on FERC consent, while the final plan reports a later expected-ISD update.",
    "Manual source-title review; exact title and same PTO",
)

# The report's aggregate Tehachapi baseline and the later 2010/11 plan use the
# same unique title and SCE PTO. The 2007 source is a planned baseline, while
# the later record provides an updated expected in-service date.
add_link(
    by_2007_tehachapi[("Executive Summary / Appendix G", "1")],
    by_2011[("Table 8.1-2", "2")],
    "CAISO-RENEW-2007-TEHACHAPI|Executive Summary / Appendix G|1",
    "CAISO-TPP-2010-2011|Table 8.1-2|2",
    "2007 Tehachapi planning report",
    "2010/11",
    "Exact project title and SCE PTO; the 2007 source is a Board-approved planned baseline and the final plan reports a later expected-ISD update.",
    "Manual source-title review; exact title and same PTO",
)

for number, record in enumerate(records, start=1):
    record["crosswalk_id"] = f"CW-CAISO-{number:03d}"

OUT.write_text(json.dumps({
    "scope": "High-confidence CAISO annual-plan links: reviewed 2008-to-2010/11 links, one reviewed partial-2010-briefing-to-final-plan continuation, one reviewed January 2007 Tehachapi management-recommendation-to-final-plan continuation, one reviewed September 2007 Tehachapi baseline-to-final-plan continuation, adjacent cycle links through 2025/26, and one reviewed 2009 proposal-snapshot continuation",
    "method": "2008-to-2010/11: manual review of exact or source-visible title variants and same PTO. The partial 2010 briefing, January 2007 Tehachapi management recommendation, and September 2007 Tehachapi baseline are linked only where the title and PTO exactly match a 2010/11 final-plan status row. 2009 proposal snapshot: only an exact distinctive title is linked to a later final-plan row; unresolved proposals remain unlinked. Adjacent cycles: exact normalized title, unique on both sides, with same PTO; a distinct method records exact title continuity when a source-visible PTO label differs. Similar names without a direct match are intentionally omitted.",
    "records": records,
    "proposal_snapshot_review": {
        "source_id": "SRC-CAISO-TPP-2009-PROPOSALS",
        "reviewed_proposals": len(proposal_dispositions),
        "linked": sum(item["disposition"] == "Linked" for item in proposal_dispositions),
        "unresolved": sum(item["disposition"] == "Unresolved" for item in proposal_dispositions),
        "dispositions": proposal_dispositions,
    },
}, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "links": len(records)}, indent=2))
