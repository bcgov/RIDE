// DBC22-7324: email notification settings, mirroring DBC Components/data/emailSubscriptions.js
import { API_HOST } from '../../env.js';
import { get, patch, post } from "../helpers.js";

export function getEmailSubscriptions() {
  return get(`${API_HOST}/api/users/email-subscriptions`, {});
}

export function createEmailSubscription(body) {
  return post(`${API_HOST}/api/users/email-subscriptions`, body);
}

export function patchEmailSubscription(subscription, body) {
  return patch(`${API_HOST}/api/users/email-subscriptions/${subscription.id}`, body);
}
