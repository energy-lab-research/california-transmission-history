from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "03_Processed Data" / "caiso_2009_request_window_proposals.json"

SOURCE = {
    "source_id": "SRC-CAISO-TPP-2009-PROPOSALS",
    "source_title": "Overview of the 2009 and 2010 ISO Transmission Plans",
    "source_url": "https://efiling.energy.ca.gov/GetDocument.aspx?DocumentContentId=8572&tn=51364",
    "presentation_date": "2009-05-04",
    "source_file": "caiso_2009_2010_iso_plans_presentation.pdf",
    "scope_note": "This May 2009 CAISO presentation lists 14 renewable-related 2008 Request Window proposals. It is not the unavailable final 2009 CAISO Transmission Plan. Slide 11 says its locations are high-level and approximate, do not depict actual routes or detailed configurations, and the proposals still require further ISO evaluation.",
}

ROWS = [
    (1, "Malin-Cottonwood - Table Mountain 500 kV Line", "Reduce congestion and aid import of new renewable resources into California.", "Summer 2016", 8),
    (2, "Midway-Antelope 500 kV Line", "Connect renewable generation, improve reliability and economic operation", "Summer 2014", 8),
    (3, "North Gila-Imperial Valley #2", "Connect renewable generation", "Summer 2014", 8),
    (4, "Imperial Valley-Blythe Area Renewable Transmission Integration", "Deliver solar, wind and geothermal resources to the load centers in Southern California.", "Summer 2014", 8),
    (5, "Mohave-San Bernardino - Devers Renewable Integration Transmission Project", "Deliver output of the proposed solar resources to the Southern California load center.", "Summer 2014", 8),
    (6, "Green Energy Express Transmission Line Project", "Economic project, connect renewable resources", "June 2013", 8),
    (7, "Drycreekwind Location Constrained Resource Interconnection Facility (LCRIF) Project", "Connecting location-constrained resource interconnection generators (LCRIGs), of which all are renewable generation, in the Tehachapi Wind Resources Area", "October 2013 or sooner", 9),
    (8, "Highwind Location Constrained Resource Interconnection Facility (LCRIF) Project", "Connecting location-constrained resource interconnection generators (LCRIGs), of which all are renewable generation, in the Tehachapi Wind Resources Area", "December 2010", 9),
    (9, "Eldorado - Ivanpah Transmission Project", "LGIP/SGIP Network upgrade", "July 2013", 9),
    (10, "New ECO 500/230/69kV Substation & New 69kV Transmission Line to Boulevard Substation", "LGIP/SGIP Network upgrade", "September 2011", 9),
    (11, "Morro Bay-Midway 230 kV Line Nos 1 and 2 Reconductor", "LGIP/SGIP Network upgrade", "May 2011", 9),
    (12, "San Luis Obispo Solar Switching Station #3", "LGIP/SGIP Network upgrade", "December 2010", 10),
    (13, "Vaca Dixon - Sobrante - Moraga 230 kV Reinforcement", "LGIP/SGIP Network upgrade", "May 2012 or later", 10),
    (14, "Table Mountain - Vaca Dixon 230 kV Reinforcement", "LGIP/SGIP Network upgrade", "May 2013 or later", 10),
]

records = []
for number, name, category, proposed_online_date, slide in ROWS:
    lcrif = number in {7, 8}
    status = "LCRIF proposal seeking ISO approval" if lcrif else "2008 Request Window proposal requiring further ISO study"
    records.append({
        "proposal_number": number,
        "project_name": name,
        "project_category": category,
        "proposed_online_date": proposed_online_date,
        "status": status,
        "source_id": SOURCE["source_id"],
        "source_title": SOURCE["source_title"],
        "source_url": SOURCE["source_url"],
        "source_locator": f"Slide {slide}; proposal row {number}",
    })

OUTPUT.write_text(json.dumps({"source": SOURCE, "records": records}, indent=2))
print(json.dumps({"records": len(records), "source_id": SOURCE["source_id"]}))
