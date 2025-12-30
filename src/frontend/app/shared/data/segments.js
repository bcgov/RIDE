import { API_HOST } from '../../env.js';
import { get } from "../helpers.js";

export function getSegments() {
  return get(`${API_HOST}/api/segments`, {});
}


export function getRoutes() {
  return get(`${API_HOST}/api/routes`, {});
}
