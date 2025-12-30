import { API_HOST } from '../../env.js';
import {get, post} from "../helpers.js";


export function getRcs() {
  return get(`${API_HOST}/api/rcs`, {});
}

export function clearRcs(segPks) {
  const payload = {
    segPks: segPks
  }

  return post(`${API_HOST}/api/rcs/clear`, payload);
}

export function confirmRcs(segPks) {
  const payload = {
    segPks: segPks
  }

  return post(`${API_HOST}/api/rcs/confirm`, payload);
}

export function bulkUpdateRcs(segPks, event) {
  const payload = {
    eventData: event,
    segPks: segPks
  }

  return post(`${API_HOST}/api/rcs/bulk_update`, payload);
}
