import { API_HOST } from '../../env.js';
import { get, post } from "../helpers.js";

export function getChainUps() {
  return get(`${API_HOST}/api/chainups`, {});
}

export function toggleChainUps(uuids) {
  return post(`${API_HOST}/api/chainups/toggle`, { uuids });
}

export function reconfirmChainUps(uuids) {
  return post(`${API_HOST}/api/chainups/reconfirm`, { uuids });
}
