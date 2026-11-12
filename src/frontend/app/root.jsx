import { useState } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import store from './store';
globalThis.store = store;
import { Provider } from 'react-redux';

import {
  refreshConditions,
  refreshDistricts,
  refreshDistrictBoundaries,
  refreshDms,
  refreshOrganizations,
  refreshRoutes,
  refreshSegments,
  refreshServiceAreas,
  refreshServiceAreaBoundaries,
  refreshSituations,
  refreshTrafficImpacts,
} from './slices';

import "./app.scss";

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Fonts: declared once here, not in the app's stylesheets, and the two weights the
            app uses are fetched right away so text does not start in a fallback font */}
        <link rel="preload" href="/fonts/bc-sans/BCSans-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/bc-sans/BCSans-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <p>Loading RIDE...</p>;
}

// only do client side
if (typeof window !== 'undefined') {
  store.dispatch(refreshConditions());
  store.dispatch(refreshDistricts());
  store.dispatch(refreshDms());
  store.dispatch(refreshOrganizations());
  store.dispatch(refreshRoutes());
  store.dispatch(refreshServiceAreas());
  store.dispatch(refreshSegments());
  store.dispatch(refreshTrafficImpacts());
  // store.dispatch(refreshSituations());
  store.dispatch(refreshServiceAreaBoundaries());
  store.dispatch(refreshDistrictBoundaries());
  store.dispatch(refreshDms());
}

export default function App() {
  return (
    <Provider store={store}>
      <Outlet />
    </Provider>
  )
}

export function ErrorBoundary({ error }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
