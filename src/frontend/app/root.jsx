import { createContext, useState } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { API_HOST } from './env.js';
import { DataContext } from './contexts';

import "./app.scss";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <script src="/env.js"></script>
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <p>Loading RIDE...</p>;
}

let fetching = false;

export default function App() {

  const [impacts, setImpacts] = useState(getImpacts);

  function getImpacts() {
    if (fetching) { return; }
    fetching = true;

    const response = fetch(`${API_HOST}/api/traffic-impacts`, {
      headers: { 'Accept': 'application/json' }
    }).then((response) => response.json())
      .then((data) => {
        setImpacts(data);
      })
      .finally(() => {
        fetching = false;
      });
    return [];
  }

  return (
    <DataContext.Provider value={{ impacts }}>
      <Outlet />
    </DataContext.Provider>
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
