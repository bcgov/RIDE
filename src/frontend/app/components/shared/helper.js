// Replace all abbreviations in road names
export const transform_road_abbreviations = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/\bHwy\b/g, 'Highway')
    .replace(/\bAve\b/g, 'Avenue')
    .replace(/\bRd\b/g, 'Road')
    .replace(/\bPl\b/g, 'Place')
    .replace(/\bCrt\b/g, 'Court')
    .replace(/\bBlvd\b/g, 'Boulevard')
    .replace(/\bDr\b/g, 'Drive')
    .replace(/\bPky\b/g, 'Parkway')
    .replace(/\bCres\b/g, 'Crescent')
    .replace(/\bCir\b/g, 'Circle')
    .replace(/\bTerr\b/g, 'Terrace')
    .replace(/\bSt\b/g, 'Street')
    .replace(/\bLn\b/g, 'Lane');
};