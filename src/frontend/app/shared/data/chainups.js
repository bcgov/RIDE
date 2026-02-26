import { API_HOST } from '../../env.js';
import { get, post } from "../helpers.js";
import { getInitialEvent } from "../../events/forms.jsx";

export function getChainUps() {
  return get(`${API_HOST}/api/chainups`, {});
}

export function getInitialChainUp() {
  const cu = getInitialEvent();
  cu.type = 'CHAIN_UP'

  return cu;
}

export function getChainUpEvents() {
  return get(`${API_HOST}/api/chainup-events`, {});
}

export function toggleChainUps(chainupPks, event) {
  return post(`${API_HOST}/api/chainup-events/toggle`, { chainupPks, eventData: event });
}

export function reconfirmChainUps(chainupPks) {
  return post(`${API_HOST}/api/chainup-events/reconfirm`, { chainupPks });
}
