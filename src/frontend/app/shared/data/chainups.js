import { API_HOST } from '../../env.js';
import { get } from "../helpers.js";

export function getChainUps() {
  return get(`${API_HOST}/api/chainups`, {});
}
