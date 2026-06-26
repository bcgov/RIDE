import re

ROAD_ABBREVIATIONS = {
    r"\bHwy\b": "Highway",
    r"\bAve\b": "Avenue",
    r"\bRd\.(?=\s|$)": "Road",
    r"\bRd\b(?!\.)": "Road",
    r"\bPl\b": "Place",
    r"\bCrt\b": "Court",
    r"\bBlvd\b": "Boulevard",
    r"\bDr\b": "Drive",
    r"\bPky\b": "Parkway",
    r"\bPkwy\.(?=\s|$)": "Parkway",
    r"\bPkwy\b(?!\.)": "Parkway",
    r"\bCres\b": "Crescent",
    r"\bCir\b": "Circle",
    r"\bTerr\b": "Terrace",
    r"\bSt\.(?=\s|$)": "Street",
    r"\bSt\b(?!\.)": "Street",
    r"\bLn\b": "Lane",
    r"\bFSR\b": "Forest Service Road",
    r"\bRte\.(?=\s|$)": "Route",
    r"\bRte\b(?!\.)": "Route",
    r"\bJunc\.(?=\s|$)": "Junction",
    r"\bJunc\b(?!\.)": "Junction",
    r"\bS/B\b": "Southbound",
    r"\bN/B\b": "Northbound",
    r"\bW/B\b": "Westbound",
    r"\bE/B\b": "Eastbound",
    r"\bO/P\b": "Overpass",
    r"\bU/P\b": "Underpass",
    r"\bO/H\b": "Overhead",
    r"\bkmhr\b": "km/hr",
    r"\bkm/h\b": "km/hr",
    r"\bNo\.(?=\s|$)": "Number",
    r"\bNo\b(?!\.)": "Number",
}


def transform_road_abbreviations(input):
    if not isinstance(input, str):
        return input

    s = input
    for pattern, full_name in ROAD_ABBREVIATIONS.items():
        s = re.sub(pattern, full_name, s)

    return s
