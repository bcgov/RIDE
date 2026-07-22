import { API_HOST } from '../../env.js';
import {get, getCookie, post} from "../helpers.js";


export function getRcs() {
  return get(`${API_HOST}/api/rcs`, {});
}

export function clearRcs(eventPks) {
  const payload = {
    eventPks: eventPks
  }

  return post(`${API_HOST}/api/rcs/clear`, payload);
}

export function confirmRcs(eventPks) {
  const payload = {
    eventPks: eventPks
  }

  return post(`${API_HOST}/api/rcs/confirm`, payload);
}

export function bulkUpdateRcs(segPks, event) {
  const payload = {
    eventData: event,
    segPks: segPks
  }

  return fetch(`${API_HOST}/api/rcs/bulk_update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  }).then(response => response.json().then(data => ({ ok: response.ok, data })));
}
