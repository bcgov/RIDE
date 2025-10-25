import { API_HOST } from '../../env.js';
import { get, patch } from "../helpers.js";

export function getUsers() {
  return get(`${API_HOST}/api/users`, {}).then((data) => data);
}

export function getOrganizations() {
  return get(`${API_HOST}/api/groups`, {}).then((data) => data);
}

export function updateUser(userId, payload) {
  return patch(`${API_HOST}/api/users/${userId}`, payload).then((data) => data);
}
