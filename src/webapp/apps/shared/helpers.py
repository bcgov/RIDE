import re


def transform_road_abbreviations(input):
    if not isinstance(input, str):
        return input

    s = input
    s = re.sub(r"\bHwy\b", "Highway", s)
    s = re.sub(r"\bAve\b", "Avenue", s)
    s = re.sub(r"\bRd\b", "Road", s)
    s = re.sub(r"\bPl\b", "Place", s)
    s = re.sub(r"\bCrt\b", "Court", s)
    s = re.sub(r"\bBlvd\b", "Boulevard", s)
    s = re.sub(r"\bDr\b", "Drive", s)
    s = re.sub(r"\bPky\b", "Parkway", s)
    s = re.sub(r"\bCres\b", "Crescent", s)
    s = re.sub(r"\bCir\b", "Circle", s)
    s = re.sub(r"\bTerr\b", "Terrace", s)
    s = re.sub(r"\bSt\b", "Street", s)
    s = re.sub(r"\bLn\b", "Lane", s)
    return s
