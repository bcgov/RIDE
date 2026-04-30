import { ROUTER_CLIENT_ID } from '../env.js';

export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
export const ONE_HOUR_MS = ONE_MINUTE_MS * 60;
export const ONE_DAY_MS = ONE_HOUR_MS * 24;


const SKIP_WORDS = [
  'a', 'an', 'the',
  'and', 'as', 'but', 'for', 'if', 'nor', 'or', 'so', 'yet',
  'as', 'at', 'by', 'for', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via',
]

function titleCaseWord(word) {
  word = word.toLowerCase();
  if (SKIP_WORDS.includes(word)) { return word; }
  return word.charAt(0).toUpperCase() + word.substr(1);
}

export function titleCase(text) {
  text = text.replace(/\w+/g, titleCaseWord);
  // ensure first letter of text is capitalized (e.g., if text starts with
  // a word in the SKIP_WORDS list)
  if (text.charAt(0) !== text.charAt(0).toUpperCase()) {
    text = text.charAt(0).toUpperCase() + text.substr(1);
  }
  return text;
}
globalThis.titleCase = titleCase;


const DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
const LONG_DIRECTIONS = ["South", "Southwest", "West", "Northwest", "North", "Northeast", "East", "Souteast"];

/* Returns the cardinal direction based on the angle of the vector from `pointA`
 * to `pointB`. `pointA` and `pointB` are two element arrays of lon/lat.
 */
export function getCardinalDirection(pointA, pointB, longform=false) {
  const lat1 = pointA[1] * Math.PI / 180;
  const lat2 = pointB[1] * Math.PI / 180;
  const dLon = (pointB[0] - pointA[0]) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  const normalized = (bearing + 360) % 360;
  const index = Math.round(normalized / 45) % 8;

  return longform ? LONG_DIRECTIONS[index] : DIRECTIONS[index];
}


export async function getRoute(pointA, pointB) {
  const pointString = `${pointA[0]},${pointA[1]},${pointB[0]},${pointB[1]}`;
  const baseUrl = "https://router.api.gov.bc.ca/directions.json";
  const apiKey = ROUTER_CLIENT_ID;
  const apiUrl = `${baseUrl}?points=${encodeURIComponent(pointString)}&criteria=shortest&apikey=${apiKey}&distanceUnit=km`;

  try {
    const response = await fetch(apiUrl, {mode: 'cors'});
    return response.json();
  } catch (error) {
    console.error("Failed to fetch route:", error);
    return null;
  }
}

/* Get the shortest road distance by getting routes in each direction and
 * returning the route with the shorter distance.
 */
export async function getNonDirectionalRoute(pointA, pointB) {
  const [route1, route2] = await Promise.all([
    getRoute(pointA, pointB),
    getRoute(pointB, pointA),
  ]);
  return route1.distance < route2.distance ? route1 : route2;
}
