// Only access window if we are in the browser. Without this the build will fail.
const RUNTIME = (typeof window !== 'undefined') ? (window.__ENV__ || {}) : {};

// During the build (Node.js), RUNTIME is {}, so it falls back to import.meta.env (which Vite replaces).
// In the browser, RUNTIME is populated, so it takes precedence.

export const API_HOST = RUNTIME.API_HOST || import.meta.env.VITE_API_HOST;
export const GEOCODER_HOST = RUNTIME.GEOCODER_HOST || import.meta.env.VITE_GEOCODER_HOST;
export const GEOCODER_CLIENT_ID = RUNTIME.GEOCODER_CLIENT_ID || import.meta.env.VITE_GEOCODER_CLIENT_ID;
export const ROUTER_CLIENT_ID = RUNTIME.ROUTER_CLIENT_ID || import.meta.env.VITE_ROUTER_CLIENT_ID;
export const DEBUG = RUNTIME.DEBUG || import.meta.env.VITE_DEBUG;
export const BASE_MAP_URL = RUNTIME.BASE_MAP_URL || import.meta.env.VITE_BASE_MAP_URL;
export const MAP_STYLE_URL = RUNTIME.MAP_STYLE_URL || import.meta.env.VITE_MAP_STYLE_URL;
export const DEPLOYMENT_TAG = RUNTIME.DEPLOYMENT_TAG || import.meta.env.VITE_DEPLOYMENT_TAG || '';
export const BRANCH = RUNTIME.BRANCH || import.meta.env.VITE_BRANCH || '';
export const RELEASE = RUNTIME.RELEASE || import.meta.env.VITE_RELEASE || '';
export const ALLOW_LOCAL_ACCOUNTS = RUNTIME.ALLOW_LOCAL_ACCOUNTS || import.meta.env.VITE_ALLOW_LOCAL_ACCOUNTS || '';