import { API_HOST } from '../../env.js';
import { deleteRequest, get, patch, post } from "../helpers.js";


export function getOrganizations() {
  return get(`${API_HOST}/api/organizations`, {});
}

export function createOrganization(payload) {
  return post(`${API_HOST}/api/organizations`, payload);
}

export function updateOrganization(orgId, payload) {
  return patch(`${API_HOST}/api/organizations/${orgId}`, payload);
}

export function deleteOrganization(orgId) {
  return deleteRequest(`${API_HOST}/api/organizations/${orgId}`, {});
}

export function getServiceAreas() {
  return get(`${API_HOST}/api/service_areas`, {});
}