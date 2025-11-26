// Values are injected at runtime into window.__ENV__ by nginx-served /env.js.
const runtimeEnv = (typeof window !== 'undefined' && window.__ENV__) || {};
const getEnv = (key, fallback = '') => runtimeEnv[key] ?? import.meta.env?.[`VITE_${key}`] ?? fallback;

export const API_HOST = `${getEnv('API_HOST')}`;
export const GEOCODER_HOST = `${getEnv('GEOCODER_HOST')}`;
export const GEOCODER_CLIENT_ID = `${getEnv('GEOCODER_CLIENT_ID')}`;
export const ROUTER_CLIENT_ID = `${getEnv('ROUTER_CLIENT_ID')}`;
export const DEBUG = `${getEnv('DEBUG')}`;
export const BASE_MAP_URL = `${getEnv('BASE_MAP_URL')}`;
export const MAP_STYLE_URL = `${getEnv('MAP_STYLE_URL')}`;
export const DEPLOYMENT_TAG = `${getEnv('DEPLOYMENT_TAG')}`;
export const BRANCH = `${getEnv('BRANCH')}`;
export const RELEASE = `${getEnv('RELEASE')}`;
export const ALLOW_LOCAL_ACCOUNTS = `${getEnv('ALLOW_LOCAL_ACCOUNTS')}`;
