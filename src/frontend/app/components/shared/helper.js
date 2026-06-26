const ROAD_ABBREVIATIONS = {
  '\\bHwy\\b': 'Highway',
  '\\bAve\\b': 'Avenue',
  '\\bRd\\.(?=\\s|$)': 'Road',
  '\\bRd\\b(?!\\.)': 'Road',
  '\\bPl\\b': 'Place',
  '\\bCrt\\b': 'Court',
  '\\bBlvd\\b': 'Boulevard',
  '\\bDr\\b': 'Drive',
  '\\bPky\\b': 'Parkway',
  '\\bPkwy\\.(?=\\s|$)': 'Parkway',
  '\\bPkwy\\b(?!\\.)': 'Parkway',
  '\\bCres\\b': 'Crescent',
  '\\bCir\\b': 'Circle',
  '\\bTerr\\b': 'Terrace',
  '\\bSt\\.(?=\\s|$)': 'Street',
  '\\bSt\\b(?!\\.)': 'Street',
  '\\bLn\\b': 'Lane',
  '\\bFSR\\b': 'Forest Service Road',
  '\\bRte\\.(?=\\s|$)': 'Route',
  '\\bRte\\b(?!\\.)': 'Route',
  '\\bJunc\\.(?=\\s|$)': 'Junction',
  '\\bJunc\\b(?!\\.)': 'Junction',
  '\\bS/B\\b': 'Southbound',
  '\\bN/B\\b': 'Northbound',
  '\\bW/B\\b': 'Westbound',
  '\\bE/B\\b': 'Eastbound',
  '\\bO/P\\b': 'Overpass',
  '\\bU/P\\b': 'Underpass',
  '\\bO/H\\b': 'Overhead',
  '\\bkmhr\\b': 'km/hr',
  '\\bkm/h\\b': 'km/hr',
  '\\bNo\\.(?=\\s|$)': 'Number',
  '\\bNo\\b(?!\\.)': 'Number',
};

export const transform_road_abbreviations = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  let s = input;
  for (const [pattern, fullName] of Object.entries(ROAD_ABBREVIATIONS)) {
    s = s.replace(new RegExp(pattern, 'g'), fullName);
  }
  return s;
};
