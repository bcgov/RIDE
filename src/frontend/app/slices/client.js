import { getCookie } from "../shared/helpers";

export default async function client( endpoint, { body, ...customConfig } = {}) {

  const isInternalAPI = endpoint.startsWith('http') && endpoint.includes(globalThis.location?.hostname);
  const method = customConfig.method || 'GET';
  const headers = { };

  if (body) {
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
  }

  if ((body || method === 'DELETE') && isInternalAPI) {
    const parsedUrl = new URL(endpoint, globalThis.location.origin);
    if (parsedUrl.hostname === globalThis.location.hostname) {
      headers['X-CSRFToken'] = getCookie('csrftoken');
    }
  }

  const config = {
    method,
    mode: 'cors',
    credentials: "include",
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await globalThis.fetch(endpoint, config);
  let data = await response.text();
  try {
    data = JSON.parse(data);
  } catch {
    // plaintext response is returned
  }

  data = {
    status: response.status,
    data,
    headers: response.headers,
    url: response.url,
  };

  if (response.ok) {
    return data;
  }

  return Promise.reject(data);
}

client.get = function (endpoint, customConfig = {}) {
  return client(endpoint, { ...customConfig, body: null });
}

client.post = function (endpoint, body, customConfig = {}) {
  return client(endpoint, { ...customConfig, method: 'POST', body });
}

client.put = function (endpoint, body, customConfig = {}) {
  return client(endpoint, { ...customConfig, method: 'PUT', body });
}

client.patch = function (endpoint, body, customConfig = {}) {
  return client(endpoint, { ...customConfig, method: 'PATCH', body });
}

client.delete = function (endpoint, body, customConfig = {}) {
  return client(endpoint, { ...customConfig, method: 'DELETE', body: null });
}
