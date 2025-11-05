import { createContext, useState, useEffect } from 'react';
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";
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
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  return <p>Loading RIDE...</p>;
}

export default function App() {
  const [impacts, setImpacts] = useState([]);

  useEffect(() => {
    fetch(`${API_HOST}/api/traffic-impacts`, {
      headers: { 'Accept': 'application/json' }
    })
      .then(res => res.json())
      .then(data => setImpacts(data))
      .catch(err => console.error("Failed to fetch impacts:", err));
  }, []);

  return (
    <DataContext.Provider value={{ impacts }}>
      <div className="container mx-auto p-4">
        <h1>RIDE — Traffic Impacts</h1>
        {impacts.length === 0 ? (
          <p>Loading impacts...</p>
        ) : (
          <ul>
            {impacts.map((impact, i) => (
              <li key={i}>{impact.description || JSON.stringify(impact)}</li>
            ))}
          </ul>
        )}
      </div>
    </DataContext.Provider>
  );
}

export function ErrorBoundary({ error }) {
  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{error?.status || "Oops!"}</h1>
      <p>{error?.statusText || error?.message || "An unexpected error occurred."}</p>
      {error?.stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{error.stack}</code>
        </pre>
      )}
    </main>
  );
}
