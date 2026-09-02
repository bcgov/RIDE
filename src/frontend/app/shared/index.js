import { ROUTER_URL, ROUTER_CLIENT_ID } from '../env.js';
import { get } from "./helpers";

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


const DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
const LONG_DIRECTIONS = ["South", "Southwest", "West", "Northwest", "North", "Northeast", "East", "Southeast"];

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

  const payload = {
    points: pointString,
    criteria: 'fastest',
    distanceUnit: 'km',
    gdf: 'resource:2.0,',
    enable: 'tl',
  }

  return get(ROUTER_URL, payload, {
    'apiKey': ROUTER_CLIENT_ID
  }).then((data) => data);
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

/* A sleep function for use in testing */
export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const STATUS_CODES = {
  100: '100 Continue',
  101: '101 Switching Protocols',
  102: '102 Processing',
  103: '103 Early Hints',
  200: '200 OK',
  201: '201 Created',
  202: '202 Accepted',
  203: '203 Non-Authoritative Information',
  204: '204 No Content',
  205: '205 Reset Content',
  206: '206 Partial Content',
  207: '207 Multi-Status',
  208: '208 Already Reported',
  226: '226 IM Used',
  300: '300 Multiple Choices',
  301: '301 Moved Permanently',
  302: '302 Found',
  303: '303 See Other',
  304: '304 Not Modified',
  307: '307 Temporary Redirect',
  308: '308 Permanent Redirect',
  400: '400 Bad Request',
  401: '401 Unauthorized',
  402: '402 Payment Required',
  403: '403 Forbidden',
  404: '404 Not Found',
  405: '405 Method Not Allowed',
  406: '406 Not Acceptable',
  407: '407 Proxy Authentication Required',
  408: '408 Request Timeout',
  409: '409 Conflict',
  410: '410 Gone',
  411: '411 Length Required',
  412: '412 Precondition Failed',
  413: '413 Content Too Large',
  414: '414 URI Too Long',
  415: '415 Unsupported Media Type',
  416: '416 Range Not Satisfiable',
  417: '417 Expectation Failed',
  418: '418 I\'m a teapot',
  421: '421 Misdirected Request',
  422: '422 Unprocessable Content',
  423: '423 Locked',
  424: '424 Failed Dependency',
  425: '425 Too Early',
  426: '426 Upgrade Required',
  428: '428 Precondition Required',
  429: '429 Too Many Requests',
  431: '431 Request Header Fields Too Large',
  451: '451 Unavailable For Legal Reasons',
  500: '500 Internal Server Error',
  501: '501 Not Implemented',
  502: '502 Bad Gateway',
  503: '503 Service Unavailable',
  504: '504 Gateway Timeout',
  505: '505 HTTP Version Not Supported',
  506: '506 Variant Also Negotiates',
  507: '507 Insufficient Storage',
  508: '508 Loop Detected',
  510: '510 Not Extended',
  511: '511 Network Authentication Required',
}

export function statusCode(code) {
  return STATUS_CODES[code];
}