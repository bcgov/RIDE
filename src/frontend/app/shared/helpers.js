export function getCookie(key) {
  const cookies = document.cookie.split('; ')
  const cookie = cookies.filter(c => c.startsWith(key + '='))
  if (cookie[0]) { return cookie[0].split('=')[1]; }
  return '';
}

class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name; // Set the name of the error to the class name
    this.message = message; // Set the error message
    this.stack = (new Error()).stack; // Generate stack trace
  }
}

export class HasUserError extends CustomError {
  constructor() {
    super("Organization must be empty before deletion");
  }
}

export class UniqueNameError extends CustomError {
  constructor() {
    super("Organization name must be unique");
  }
}

export class NetworkError extends CustomError {
  constructor() {
    super("Network error");
  }
}

export class NotFoundError extends CustomError {
  constructor() {
    super("Not found error");
  }
}

export class ServerError extends CustomError {
  constructor() {
    super("Server error");
  }
}

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

const request = (url, params={}, headers={}, include_credentials=true, method="GET") => {
  // Check if this is an external API call
  const isExternalAPI = url.startsWith('http') && !url.includes(window.location.hostname);
  
  // For external APIs, use minimal headers
  if (isExternalAPI) {
    headers = {
      'Accept': 'application/json',
      ...(headers || {})  // This will include your apiKey
    };
  } else {
    // For internal APIs, use default headers
    headers = {
      ...DEFAULT_HEADERS,
      ...(headers || {})
    };
  }

  // Remove Content-Type for GET requests (not needed and causes CORS issues)
  if (method === "GET") {
    delete headers['Content-Type'];
  }

  // Only add CSRF token for same-origin requests
  if (!isExternalAPI) {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      if (parsedUrl.hostname === window.location.hostname) {
        headers['X-CSRFToken'] = getCookie('csrftoken');
      }
    } catch (e) {
      headers['X-CSRFToken'] = getCookie('csrftoken');
    }
  }

  const options = { headers, method };

  // Don't send credentials to external APIs
  if (include_credentials && !isExternalAPI) {
    options.credentials = 'include';
  }

  if ("GET" === method) {
    url += "?" + new URLSearchParams(params).toString();
  } else {
    options.body = JSON.stringify(params);
  }

  const result = fetch(url, options).then(async (response) => {
    const statusCode = response.status.toString();

    // Raise error for 4xx-5xx status codes
    if (statusCode === '404') {
      throw new NotFoundError();
    } else if (statusCode.startsWith('4')) {
      const responseData = await response.json();
      switch (responseData.error) {
        case 'unique_name':
          throw new UniqueNameError();
        case 'has_users':
          throw new HasUserError();
      }

      throw new NetworkError();
    } else if (statusCode.startsWith('5')) {
      throw new ServerError();
    }

    // Read the response body as text
    return response.text().then((text) => {
      // Check if the response body is empty
      if (!text) {
        return {}; // Return an empty object or suitable default value
      }

      return JSON.parse(text);
    });

  }).catch((error) => {
    // throw network error on failed fetches
    if (error instanceof TypeError && (
      error.message.includes("Failed to fetch") ||  // Chrome
      error.message.includes("Load failed") ||  // Safari
      error.message.includes("NetworkError") // Firefox
    )) {
      throw new NetworkError();

    // Propagate the error
    } else {
      throw error;
    }
  });

  return result;
};

export const get = (url, params, headers, include_credentials=true) => request(url, params, headers, include_credentials, "GET");
export const post = (url, params, headers, include_credentials=true) => request(url, params, headers, include_credentials, "POST");
export const patch = (url, params, headers, include_credentials=true) => request(url, params, headers, include_credentials, "PATCH");
export const deleteRequest = (url, params, headers, include_credentials=true) => request(url, params, headers, include_credentials, "DELETE");
