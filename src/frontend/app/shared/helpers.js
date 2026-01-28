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
  const isExternalAPI = url.startsWith('http') && !url.includes(globalThis.location.hostname);

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
      const parsedUrl = new URL(url, globalThis.location.origin);
      if (parsedUrl.hostname === globalThis.location.hostname) {
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

const HOURS = [5, 7, 16]; // 5:00, 7:00, 16:00
const ONE_DAY = 86400000; // milliseconds
const HALF_HOUR = 1800000; // milliseconds

/* This function calculates next update time for road conditions.  The default
 * is one day out, which applies outside the winter season.  During the winter
 * season, the next update time is the next available time of 5:00, 7:00 or
 * 16:00 hours, with a half hour buffer preceding (so if it's 6:15, the next
 * time is 7:00; if it's 6:45, the next available time is 16:00).
 *
 * Winter season is from October 1st to midnight, April 30.
 *
 * Two edge cases to consider:
 *  1. If the 'now' time is before the spring cutoff, but the next update time
 *     is after the spring cutoff, the default is the result.
 *     E.g., Apr. 30, 9PM, results in May 1, 9PM, rather than May 1, 5AM.
 *  2. If the 'now' time is before the fall cutoff, but the next update time is
 *     after the fall cutoff:
 *      a. If the next update time is earlier than the scheduled time after
 *         fall cutoff, the default is used.
 *         E.g., Sep. 30, 2AM results in Oct. 1, 2AM, rather than Oct. 1, 5AM.
 *      b. if the next update time is at or after the scheduled time after fall
 *         cutoff, the result is the scheduled time
 *         E.g., Sep 30, 9PM results in Oct. 1, 5AM, rather than Oct. 1, 9PM.
 */
export function getNextUpdate(timeToCheck) {
  const now = timeToCheck || new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const springCutoff = new Date(year, 4, 1); // midnight April 30th
  const fallCutoff = new Date(year, 9); // October 1st

  let nextUpdate = new Date(now.getTime() + ONE_DAY); // default one day later
  const candidates = HOURS.map((hour) => new Date(year, month, date, hour));
  candidates.push(new Date(year, month, date + 1, HOURS[0]));

  if (now < springCutoff || now >= fallCutoff) { // in winter season
    let next = candidates.find((hour) => (hour - HALF_HOUR) > now);

    if (next < springCutoff || next > fallCutoff) {
      nextUpdate = next;
    }
  } else if (nextUpdate > fallCutoff && nextUpdate > candidates[3]) {
    nextUpdate = candidates[3];
  }

  return nextUpdate;
}

/* This function returns the next possible update time based on the event's
 * current next update time.  It returns undefined if the pending update time
 * would be more than 1 scheduled period out, in order to prevent stacking
 * the confirmations (i.e., if reconfirming just got the following update time
 * without limit, you could reconfirm ten times in a row and be confirmed for
 * the next three days).
 *
 * If the user has changed the next update time to something other than what
 * the schedule would produce, the next scheduled update time is returned
 * (i.e., we make no attempt to infer whether their custom time is supposed to
 * correlate to the previous or the upcoming scheduled confirmation time).
 */
export function getPendingNextUpdate(event) {
  const now = new Date();
  const eventNextUpdate = new Date(event.timing.nextUpdate);
  const nextUpdate = getNextUpdate();
  const followingUpdate = getNextUpdate(nextUpdate);
  if (eventNextUpdate >= followingUpdate) {
    return;
  }
  return now < eventNextUpdate ? getNextUpdate(eventNextUpdate) : nextUpdate;
}