import { API_HOST } from '../../env.js';
import { deleteRequest, get, getCookie, patch, post } from "../helpers.js";
import { getInitialEvent } from "../../events/forms";

const postChainUpEvents = (path, body) =>
  fetch(`${API_HOST}/api/chainup-events/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(response => response.json().then(data => ({ ok: response.ok, data })));

export function getChainUps() {
  return get(`${API_HOST}/api/chainups`, {});
}

export function getChainUpRoute([lng, lat]) {
  return get(`${API_HOST}/api/chainups/route`, { lat, lng });
}

export function createChainUp(data) {
  return post(`${API_HOST}/api/chainups`, data);
}

export function updateChainUp(uuid, data) {
  return patch(`${API_HOST}/api/chainups/${uuid}`, data);
}

export function deleteChainUp(uuid) {
  return deleteRequest(`${API_HOST}/api/chainups/${uuid}`, {});
}

export function restoreChainUp(uuid) {
  return post(`${API_HOST}/api/chainups/${uuid}/restore`, {});
}

export function getInitialChainUp() {
  const cu = getInitialEvent();
  cu.type = 'CHAIN_UP'
  cu.from_bulk = true;

  return cu;
}

export function getChainUpEvents() {
  return get(`${API_HOST}/api/chainup-events`, {});
}

export function toggleChainUps(chainupPks, event) {
  return postChainUpEvents('toggle', { chainupPks, eventData: event });
}

export function reconfirmChainUps(chainupPks) {
  return postChainUpEvents('reconfirm', { chainupPks });
}
