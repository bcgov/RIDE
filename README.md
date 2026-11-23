# RIDE (Route Information and Data Entry)

RIDE is the data entry application behind [DriveBC](https://www.drivebc.ca)
([bcgov/DriveBC.ca](https://github.com/bcgov/DriveBC.ca)). Ministry of
Transportation and Transit staff and highway maintenance contractors use it to
record incidents, construction, road conditions and chain-up requirements on
BC highways. Once an event is approved it shows up on the public DriveBC map,
which reads events straight from RIDE's API. RIDE also publishes approved
events to the province's Open511 API.

RIDE replaces the old DIT application. Some management commands and the login
adapter still say DIT when they mean data or user accounts imported from it.

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Backend notes](#backend-notes)
- [API overview](#api-overview)
- [Deployment](#deployment)
- [Contributing and licence](#contributing-and-licence)

## Features

- Incidents, construction, special events and weather events are entered on a
  map, with a start point, an optional end point and a route drawn by the BC
  Route Planner. Locations are described with landmarks and crossroads from
  the Landmark Kilometre Inventory (LKI).
- Highways are split into named segments. Road conditions are entered per
  segment, one at a time or in bulk, and chain-ups are switched on and off per
  segment within a service area.
- Every save creates a new version of the event, so the whole history and a
  field-by-field diff are always there. Minor events are approved
  automatically. Major events and closures from users without the approver
  permission wait as pending until an approver accepts them.
- A background task clears events when their end time passes.
- Saving an approved event creates or updates it in the Open511 API in the
  same transaction. If the sync fails, the save is rolled back and the user
  sees the validation error.
- Users belong to organizations, and organizations cover maintenance service
  areas. A user can only create or edit events that start inside one of their
  service areas.
- The map can show DriveBC dynamic message signs (DMS), district and service
  area boundaries, and route geometries as layers.
- Approvers in an organization get a Map setup page that shows chain-up
  segments and their direction, filtered by road and service area. Its road
  segment and avalanche area layers are empty for now.
- Users who aren't in an organization are asked to request one. The request
  is emailed to `ACCESS_REQUEST_RECEIVERS` with a link to the user in the
  Django admin, where an admin adds them.
- Sign-in goes through the BC Government Keycloak realm with IDIR or BCeID.
  Local Django accounts can be turned on for development.
- There's a public closures feed in the On Route API format, a timezone lookup
  for a coordinate, and Prometheus metrics.
- The header shows a `local`, `dev`, `test` or `uat` badge, so you can tell
  you're not on prod.

## Architecture

```
                  ┌──────────────────────┐
  browser ──────► │ static (nginx)       │  React SPA, proxies /api, /session,
                  │ port 5173            │  /accounts, /static, /admin to webapp
                  └──────────┬───────────┘  and /drivebc-api/dms/ to DriveBC
                             │
                  ┌──────────▼───────────┐      ┌──────────────┐
  DriveBC ──────► │ webapp (gunicorn)    │ ───► │ PostGIS      │
  (reads events)  │ Django + DRF         │      └──────────────┘
                  │ port 8000            │ ───► Keycloak (OIDC)
                  └──────────┬───────────┘ ───► Open511 API
                             │                ───► BC Route Planner
                  ┌──────────▼───────────┐
                  │ tasks (huey)         │ ◄──► Redis
                  │ periodic jobs        │
                  └──────────────────────┘
```

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | React 19, React Router 7 (SPA mode), Vite 8, Redux Toolkit, OpenLayers 10, Tailwind CSS 4, Sass, Font Awesome Pro | Built to static files and served by nginx when deployed. Runtime settings are written into `index.html` when the pod starts. |
| Backend | Python 3.14, Django 5.2, Django REST Framework, GeoDjango, django-allauth (OpenID Connect), gunicorn, WhiteNoise, django-prometheus | A JSON API using session auth, plus the Django admin. |
| Task worker | Huey with a Redis broker | Same image as the webapp, started with a different script. Only one replica runs Huey at a time, picked by a Kubernetes Lease. |
| Database | PostgreSQL with PostGIS | The Crunchy Postgres operator in OpenShift, the `postgis/postgis` image locally. |
| Cache and broker | Redis 8 | A custom image that labels the current primary pod using a Kubernetes Lease. |

Outside services RIDE talks to:

- Keycloak (BC Gov SSO), for IDIR and BCeID sign-in
- the Open511 API, to publish approved events
- the DriveBC DMS API, through nginx, for dynamic message sign panels
- the BC Route Planner, for route geometries and network segment (TLID) lookups
- the BC Geocoder and a vector base map, which the browser calls directly
- an SMTP server, for access request emails

DriveBC goes the other way. Its backend fetches events from RIDE's
`GET /api/events/relevant`, so that endpoint has to stay public.

## Repository layout

```
.
├── compose/                 Dockerfiles and start scripts for each image
│   ├── frontend/            Dev Dockerfile, production StaticBuild, nginx config,
│   │                        runtime config script
│   ├── redis/               Redis image with Lease-based primary labelling
│   ├── standbycheck/        Load balancer health check used for DR failover
│   └── webapp/              Backend image, entrypoint and start scripts
├── docker-compose.yml       Local stack (db, webapp, frontend)
├── Makefile                 Targets to run, test and clean the local stack
├── .env.example             Blank template for .env (copy it with make env)
├── infrastructure/          Helm charts for OpenShift
│   ├── main/                Umbrella chart: webapp, static, tasks, redis
│   ├── crunchy-postgres/    Crunchy PostgreSQL cluster with backups and DR
│   └── standbycheck/        Standby check tool for Gold and GoldDR
├── src/
│   ├── diagrams/            draw.io diagrams of the data model and workflows
│   ├── frontend/            React application
│   └── webapp/              Django project
│       ├── apps/
│       │   ├── events/      Events, notes, traffic impacts, conditions,
│       │   │                Open511 sync, background tasks
│       │   ├── lki/         Landmark Kilometre Inventory and crossroads
│       │   ├── organizations/ Organizations, districts, service areas
│       │   ├── segments/    Routes, road condition segments, chain-up segments
│       │   ├── shared/      Versioned model base classes and custom fields
│       │   ├── users/       Custom user model, groups, access requests
│       │   └── ride/        Static assets (fonts, admin styling)
│       ├── config/          Settings, URL routing, allauth adapters
│       ├── templates/       Django admin overrides
│       └── release.py       Release helper that compares main with release
└── .github/workflows/       Build, deploy, test, scan and failover workflows
```

## Local development

### Prerequisites

- Docker with Docker Compose v2, and GNU Make (the one macOS ships is fine)
- A Font Awesome Pro package token. The frontend uses the `pro-*` icon
  packages, and `npm ci` fails without one.
- A Keycloak client for the BC Gov SSO realm. Or set
  `ALLOW_LOCAL_ACCOUNTS=True` and use Django accounts.

### First run

1. Make a `.env` file in the repository root from the blank template:

   ```bash
   make env
   ```

   That copies `.env.example`, which lists every variable. It won't
   overwrite a `.env` you already have. Docker Compose hands the file to the
   webapp, database and frontend containers, and
   [Configuration](#configuration) says what each variable does. These values
   work locally:

   ```dotenv
   # Postgres container
   POSTGRES_DB=ride
   POSTGRES_USER=ride
   POSTGRES_PASSWORD=change-me

   # Django
   SECRET_KEY=change-me
   DEBUG=True
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
   DJANGO_CORS_ORIGIN_WHITELIST=http://localhost:5173,http://localhost:8000
   DJANGO_CSRF_COOKIE_SECURE=False
   DJANGO_SECURE_SSL_REDIRECT=False
   DJANGO_SESSION_COOKIE_SECURE=False
   DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   DJANGO_EMAIL_HOST=localhost
   DJANGO_EMAIL_PORT=25
   DJANGO_SUPERUSER_USERNAME=admin
   DJANGO_SUPERUSER_EMAIL=admin@example.com
   DJANGO_SUPERUSER_PASSWORD=change-me
   FRONTEND_BASE_URL=http://localhost:5173/
   ALLOW_LOCAL_ACCOUNTS=True
   SHOW_DEBUG_TOOLBAR=True
   DISABLE_OPEN511_SYNC=True

   DB_NAME=ride
   DB_USER=ride
   DB_PASSWORD=change-me
   DB_HOST=db
   DB_PORT=5432

   REDIS_HOST=redis
   REDIS_PORT=6379

   KEYCLOAK_URL=https://<keycloak-host>/auth/realms/<realm>
   KEYCLOAK_CLIENT_ID=
   KEYCLOAK_SECRET=

   # Needed by the first migrate; see Reference data below
   ROUTE_PLANNER_API_URL=https://router.api.gov.bc.ca/
   ROUTE_PLANNER_API_KEY=

   # Frontend (Vite)
   FONTAWESOME_PACKAGE_TOKEN=
   VITE_API_HOST=http://localhost:8000
   VITE_ALLOW_LOCAL_ACCOUNTS=True
   VITE_GEOCODER_HOST=https://geocoder.api.gov.bc.ca
   VITE_GEOCODER_CLIENT_ID=
   VITE_ROUTER_CLIENT_ID=
   VITE_BASE_MAP_URL=
   VITE_MAP_STYLE_URL=
   VITE_DMS_API_URL=
   ```

2. Start the stack:

   ```bash
   make start
   ```

   It creates the `ride_default` Docker network if it's missing, builds the
   images, and starts PostGIS, the webapp and the frontend in the background.
   The webapp waits for Postgres, runs migrations, collects static files and
   creates the superuser from the `DJANGO_SUPERUSER_*` variables, then starts
   gunicorn with auto-reload. The frontend runs the Vite dev server with hot
   reloading. `make logs` follows the output.

3. Run `make` on its own to list the other targets. The ones you'll use most:

   | Target | What it does |
   |--------|--------------|
   | `make stop`, `make restart`, `make status` | Stop, restart or list the containers |
   | `make backend` | Start only PostGIS and the webapp |
   | `make logs` | Follow the logs, or one service's with `service=webapp` |
   | `make migrate`, `make makemigrations` | Apply or create migrations |
   | `make shell`, `make dbshell` | Django shell or psql |
   | `make manage cmd="..."` | Any management command |
   | `make seed args="..."` | Add sample organizations, users and events (see [Sample data](#sample-data)) |
   | `make tasks` | Run the Huey worker with a throwaway Redis |
   | `make test`, `make coverage`, `make lint` | Backend tests, tests with coverage, ESLint |
   | `make build-static` | Build the production frontend image the way CI does |
   | `make clean` | Remove the containers and build output, but keep the database |
   | `make clean-data` | Delete the database too, after asking |

   The Makefile pins the Compose project name to `ride`. The webapp joins the
   external `ride_default` network, and that only matches the network the
   database and frontend are on under that project name. So if you run
   `docker compose` yourself from a folder that isn't called `RIDE`, like a
   worktree, add `-p ride`.

4. Open the application:

   | URL | What |
   |-----|------|
   | http://localhost:5173 | Frontend |
   | http://localhost:8000/admin/ | Django admin |
   | http://localhost:8000/accounts/login/ | Local account login (only with `DEBUG=True`) |
   | http://localhost:8000/metrics | Prometheus metrics |

`src/webapp` and `src/frontend` are mounted into the containers, so code
changes show up without a rebuild. You do need to rebuild after
`requirements/base.txt` or `package.json` changes.

### Reference data

You don't need a separate step to load reference data, because data
migrations do it on a fresh database: service areas, segments, chain-up
segments, LKI landmarks, crossroads, traffic impacts and conditions, plus any
users and organizations in `RIDE_USERS_STRING` and `RIDE_ORGS_STRING`.

The first `migrate` on an empty database also calls the BC Route Planner to
build highway geometries (the events app's migration 0016). That needs a
working `ROUTE_PLANNER_API_URL` and `ROUTE_PLANNER_API_KEY`. Otherwise the
migration fails and the ones after it don't run. Use the base URL with a
trailing slash, like `https://router.api.gov.bc.ca/`, and nothing after it.
The TLID lookup in `events/models.py` adds `route.json` straight onto the end,
so without the slash it asks for `https://router.api.gov.bc.caroute.json`.
Tests skip this call.

To rebuild those datasets from their source files, when the fixtures need
regenerating, use the `districts`, `service_areas`, `load_lki_data` and
`load_dit_data` commands. `update_area_routes` recalculates each service
area's list of routes after segments change. Don't reload the segment fixtures
over an existing database. Segments are versioned, and later migrations rename
them.

Traffic impacts and conditions can be edited in the Django admin once they're
loaded.

### Sample data

A fresh database has reference data and no events. `seed_data` fills it with
random sample data to test with:

```bash
make seed args="--clear --seed 1"
```

With the defaults you get:

- 6 organizations, each with its own run of neighbouring service areas, one
  approver and two submitters
- a superuser in no organization, standing in for ministry staff who can edit
  anywhere
- 100 incidents and planned events in those areas, with 10% left awaiting
  approval (a quarter of those are updates, a quarter are clears and the rest
  are new)
- 30 road conditions and 10 chain-ups, saved the same way their pages save
  them

Sample usernames start with `sample_` and have `@example.com` addresses. They
have no password, so nobody can sign in as them. Your own user (`--user`, which
defaults to the first superuser) joins two of the organizations, so the area
and organization filters have something to show. The command prints each
organization's areas and members as it goes.

The Open511 sync is off while it runs. Pass `--sync` if you want the events
published.

| Option | What it does |
|--------|--------------|
| `-n`, `--count` | Number of events (default 100) |
| `--pending` | Number of events awaiting approval (default 10% of the count) |
| `--road-conditions`, `--chain-ups` | How many of each (default 30 and 10) |
| `--organizations` | Number of sample organizations (default 6). With 0, events can go anywhere and are created by `--user` and `--submitter` |
| `--user-orgs` | How many organizations `--user` joins (default 2) |
| `--user`, `--submitter` | Who joins the organizations, and, with `--organizations 0`, the non-approver who submits the pending events |
| `--seed` | Random seed, for repeatable data |
| `--clear` | First delete every event, every organization, requests to join one and the sample users |
| `--sync` | Publish the new events to Open511 |

Each sample organization needs service areas that no other organization has.
If `RIDE_ORGS_STRING` already took most of them, the run stops and says how
many are free. Pass fewer `--organizations`, or `--clear`. Be careful with
`--clear`, though. It deletes every organization, not only the sample ones, so
the ones from `RIDE_ORGS_STRING` go too. Each run is a single transaction, and
a run that fails leaves nothing behind.

Testers can be admins under their own IDIRs: list them in `RIDE_ADMIN_IDIRS`,
comma-separated, for example `JSMITH,ABROWN`, and each run makes them
superusers. An IDIR that has signed in before keeps its user. One that hasn't
gets an `idir__` user with no password, and `config/adapter.py` links that user
to the IDIR the first time the person signs in, so nobody else can use it. The
admins join the same sample organizations as `--user`, as approvers. Only set
this for PR previews and local stacks. When it's empty, nothing happens.

The command only exists in images built with `INCLUDE_SEED_DATA=true`. The
local stack and dev builds pass it. Test and UAT builds don't, and prod
deploys the UAT image, so prod never has `seed_data` at all.

### Background tasks

The compose file doesn't include Redis or the Huey worker, so events don't
clear themselves at their end time unless you start it. `make tasks` runs a
throwaway Redis container on the stack's network and runs the worker in the
webapp container until you press Ctrl-C. `make stop` removes the Redis
container.

### Tests

Backend tests use Django's test runner against the PostGIS database. Open511
publishing and the Route Planner call are skipped under test.

```bash
make test
```

`make coverage` runs the same suite with coverage, the way the
`Unit tests/Code Coverage` workflow does on every pull request. SonarCloud is
set up in `sonar-project.properties`.

There are no frontend unit tests. `make lint` runs ESLint with
`src/frontend/eslint.config.js`.

### Working outside Docker

The backend runs directly on Python 3.14 if GDAL, GEOS and PROJ are installed.
On Windows, set `GEOS_LIBRARY_PATH`, `GDAL_LIBRARY_PATH` and `PROJ_LIB` in
`.env`. For the frontend, run `npm ci` and then `npm run dev` in
`src/frontend`. The `.npmrc` there reads `FONTAWESOME_PACKAGE_TOKEN` from the
environment.

## Configuration

Everything is configured with environment variables. Locally they come from
the root `.env`. In OpenShift, Vault writes them to
`/vault/secrets/secrets.env`, and the container sources that file before the
start script runs.

### Backend

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | yes | Django secret key |
| `DEBUG` | yes | `True` turns on debug mode and the local login and signup pages |
| `DJANGO_ALLOWED_HOSTS` | yes | Comma-separated hosts. The pod IP is added automatically |
| `DJANGO_CORS_ORIGIN_WHITELIST` | yes | Comma-separated origins, also used as `CSRF_TRUSTED_ORIGINS` |
| `DJANGO_CSRF_COOKIE_SECURE`, `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_SECURE_SSL_REDIRECT` | yes | Cookie and TLS flags. `False` locally |
| `DJANGO_EMAIL_BACKEND`, `DJANGO_EMAIL_HOST`, `DJANGO_EMAIL_PORT` | yes | Outgoing email, for access requests |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | yes | PostGIS connection |
| `REDIS_HOST`, `REDIS_PORT` | yes | Huey broker |
| `KEYCLOAK_URL`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_SECRET` | yes | OpenID Connect provider for IDIR and BCeID |
| `FRONTEND_BASE_URL` | no | Where to go after login and logout. Default `http://localhost:5173/` |
| `ALLOW_LOCAL_ACCOUNTS` | no | Allow Django username and password accounts. Default `False` |
| `SHOW_DEBUG_TOOLBAR` | no | Turn on django-debug-toolbar. Default `False` |
| `ENABLE_DEBUG_LOGGING` | no | Write the `debug` logger to `debug.log` |
| `EVENT_PREFIX` | no | Prefix for generated event IDs. Default `RIDE` |
| `OPEN511_API_URL`, `OPEN511_API_KEY` | no | Open511 events endpoint that approved events are published to. The sync is skipped, with a warning, when they're unset |
| `DISABLE_OPEN511_SYNC` | no | Skip publishing altogether. Default `False`, and always skipped under test |
| `ROUTE_PLANNER_API_URL`, `ROUTE_PLANNER_API_KEY` | no | BC Route Planner, for TLIDs and route geometries. The URL needs a trailing slash |
| `RIDE_FROM_EMAIL_DEFAULT` | no | Sender for access request emails. Default `DoNotReply@gov.bc.ca` |
| `ACCESS_REQUEST_RECEIVERS` | no | Semicolon-separated recipients for access requests. Default `ride.support@gov.bc.ca` |
| `RIDE_USERS_STRING`, `RIDE_ORGS_STRING` | no | Pipe-delimited input for `import_dit_users` |
| `RIDE_ADMIN_IDIRS` | no | Comma-separated IDIRs that `seed_data` makes superusers (see [Sample data](#sample-data)). PR previews and local stacks only |
| `TASKS_BACKEND` | no | Django tasks backend. Default is the Huey backend |
| `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD` | compose only | Superuser the start script creates |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | compose only | Set up the local Postgres container |
| `POD_NAME`, `POD_NAMESPACE`, `LEASE_NAME`, `LEASE_DURATION`, `RENEW_INTERVAL`, `RETRY_INTERVAL` | OpenShift only | Leader election for the tasks and Redis pods |
| `TICKET_API_HOST` | release script only | Jira host for `release.py` |

### Frontend

In development, Vite picks up the `VITE_` variables from the root `.env`.
Deployed, `compose/frontend/generate-config.sh` writes the same settings into
`window.__ENV__` when the pod starts, without the prefix. That way the static
image is built once and configured per environment.

| Variable | Purpose |
|----------|---------|
| `API_HOST` | Base URL of the backend |
| `GEOCODER_HOST`, `GEOCODER_CLIENT_ID` | BC Geocoder |
| `ROUTER_URL`, `ROUTER_CLIENT_ID` | BC Route Planner. Default URL `https://router.api.gov.bc.ca/route.json` |
| `ROUTABLE_LOCATIONS_HOST` | Routable locations service |
| `BASE_MAP_URL`, `MAP_STYLE_URL` | Vector tiles and style for the map |
| `DMS_API_URL` | DriveBC DMS endpoint. Deployed, nginx proxies it on the same origin at `/drivebc-api/dms/` |
| `ALLOW_LOCAL_ACCOUNTS` | Show the local login form on the home page |
| `DEBUG`, `SHOW_DEBUG_CONTROL` | Debug output and the in-app debug control |
| `EVENT_POLLING_REFRESH` | How often the event list polls |
| `CLEARING_TIMEOUT` | Milliseconds before a cleared event drops off the list. Default 900000 (15 minutes) |
| `ENVIRONMENT` | Header badge for `dev`, `test` and `uat`. On localhost it says `local` |
| `DEPLOYMENT_TAG`, `RELEASE`, `BRANCH` | Shown in the UI and set by the deployment |

## Backend notes

### Versioned models

`apps/shared/models.py` defines `VersionedModel`. Saving one never updates a
row. It inserts a new row with the same `id`, the next `version` and
`latest=True`, and clears `latest` on the version before. Deletes are soft.
`diff()` and `get_history()` build field-level change logs, and the custom JSON
fields (`LocationField`, `OrderedListField`) know how to diff what's inside
them. Events, notes, segments and chain-ups are all versioned.

Saving an event also rounds its coordinates to five decimal places and
simplifies long lines, which keeps the stored geometry and the API responses
small.

### Event approval

`Event` adds an `approved` flag to the versioning, plus a `latest_approved`
column for convenience. Each manager gives a different view of the table:

| Manager | Returns |
|---------|---------|
| `Event.objects` | Every version |
| `Event.current` | Latest approved version of each event |
| `Event.last` | Latest version, approved or not |
| `Event.pending` | Latest versions awaiting approval |
| `Event.relevant` | Active events, and events cleared in the last 7 days |

Users with the `users.approve_ride_events` permission are approvers. The event
serializer approves a save automatically when the severity is minor, no
traffic impact is a closure and the event wasn't major or closed before.
Anything else is only approved right away if an approver submitted it.
Otherwise it becomes a pending version, which approvers review through
`/api/events/pending`. Saving an approved version triggers the Open511 sync.

### Open511 sync

`apps/events/open511.py` builds the Open511 payload, including the generated
description and the IVR (phone line) text, then POSTs new events or PATCHes
the fields that changed. Chain-up events aren't published. The
`ride_open511_sync_successes` and `ride_open511_sync_failures` Prometheus
counters track how it's going.

DriveBC doesn't read Open511 anymore. Since DBC22-7577 it takes every event,
chain-ups included, from `/api/events/relevant`. A failed Open511 sync still
rolls the save back, though, so the sync has to keep working.

### Background tasks

There's one periodic Huey task, in `apps/events/tasks.py`:

| Task | Schedule | What it does |
|------|----------|--------------|
| `check_end_time` | Every minute | Clears active events whose end time falls within the next minute |

In OpenShift the tasks deployment wraps `run_huey` in
`compose/webapp/leader-election.py`. Several replicas can run for
availability, but only the one holding the Lease works through the tasks.

### Authentication

django-allauth handles sign-in with two OpenID Connect apps on the same
Keycloak client, `idir` (Azure IDIR) and `bceid`. On someone's first SSO
sign-in, `config/adapter.py` links them to a pre-imported user with a matching
`idir__username` or `bceid__username`. It also tidies BCeID display names and
keeps the ID token so logging out ends the Keycloak session too. Sessions last
12 hours. The Django admin uses the same sign-in, and when deployed, nginx only
lets government IP ranges reach it.

### Management commands

| Command | Purpose |
|---------|---------|
| `event <id> [version]` | Show an event with its meta, source and user details |
| `verify_geometry <id> [--fix]` | Check an event's geometry and repair it |
| `remove_open511_events <eid>...` | Remove events from Open511 by ID |
| `seed_data` | Random sample organizations, users, events, road conditions and chain-ups (see [Sample data](#sample-data)) |
| `reset_events`, `reset_rcs`, `create_rc`, `create_from_json`, `sandbox` | Development helpers for creating, clearing and timing events |
| `build_route_geometries`, `update_tlids` | Fill in route geometries and network segment IDs from the Route Planner |
| `test_auto_clearing`, `test_events`, `test_versions` | Manual checks of clearing and versioning |
| `load_references` | Load the traffic impact and condition lookups |
| `load_lki_data`, `load_dit_data` | Rebuild LKI landmarks and crossroads from the source files |
| `districts`, `service_areas`, `fix_area_names`, `update_area_routes` | Maintain districts and service areas |
| `update_segments`, `update_segment_names`, `populate_ls`, `purge_segments` | Maintain road condition segments |
| `update_chainup_directions` | Set each chain-up's direction from its name |
| `user <email>` | Show a user (`--details`), switch them active, staff or superuser on or off, or clear their requests or organizations |
| `import_dit_users` | Create users and organizations from `RIDE_USERS_STRING` and `RIDE_ORGS_STRING` |
| `clear_inactive_users_orgs` | Take inactive users out of their organizations |

## API overview

Everything under `/api/` uses Django session auth, and the routers are
registered without trailing slashes. Django's login-required middleware skips
these views because Django REST Framework exempts them, so each view sets its
own permissions in its app's `views.py`. Reading events, landmarks and
crossroads, location search, the timezone lookup and the closures feed don't
need a login. Most other endpoints need a signed-in user, and a few need an
approver or an admin.

| Path | Description |
|------|-------------|
| `GET /session` | The current user, or `{"username": null}` plus a CSRF cookie |
| `/api/events` | Events CRUD, plus `GET /api/events/relevant`, `GET /api/events/<id>/history`, `GET /api/events/<id>/diffs` and `POST /api/events/description` (previews the generated description). `relevant` leaves out cleared bulk road conditions and chain-ups, and it's what DriveBC reads. Creating or editing needs a signed-in user whose service areas include the start point |
| `/api/events/pending` | Pending versions awaiting approval. Needs a signed-in user |
| `GET /api/events/closures` | Closed network segments in On Route API format, for incidents and for planned events that have started. Public |
| `/api/rcs` | Road conditions, plus `POST /api/rcs/clear`, `/api/rcs/confirm` and `/api/rcs/bulk_update` |
| `/api/chainup-events` | Chain-up events, plus `POST /api/chainup-events/toggle` and `/api/chainup-events/reconfirm` |
| `/api/notes` | Notes on events |
| `/api/traffic-impacts`, `/api/conditions` | Lookup tables |
| `GET /api/timezone?lat=&lng=` | IANA timezone for a coordinate |
| `/api/landmarks`, `/api/crossroads`, `GET /api/search` | LKI reference locations and location search |
| `/api/segments`, `/api/chainups`, `/api/routes` | Road condition segments, chain-up segments and routes |
| `/api/districts`, `/api/service_areas`, `/api/organizations` | Organization data |
| `/api/users`, `/api/groups` | User and group management. Needs an admin |
| `POST /api/users/request` | Ask to join an organization, which emails `ACCESS_REQUEST_RECEIVERS`. Needs a signed-in user |
| `/accounts/oidc/idir/login/`, `/accounts/oidc/bceid/login/`, `/accounts/logout/` | allauth login and logout |
| `GET /metrics` | Prometheus metrics (no login) |

## Deployment

RIDE runs on the BC Government's OpenShift platform, as an active and standby
pair of clusters, Gold and GoldDR. Each environment (`dev`, `test`, `uat`,
`prod`) is a Helm release of `infrastructure/main` installed in both clusters,
using a `values-<env>.yaml` file plus a `values-<env>-dr.yaml` overlay for
GoldDR. Secrets come from Vault. Images go to `ghcr.io/bcgov/ride-webapp`,
`ride-static` and `ride-redis`.

### Images

| Image | Dockerfile | Contents |
|-------|-----------|----------|
| `ride-webapp` | `compose/webapp/Dockerfile` | The Django application, also used for the tasks pod. It builds patched tzdata so `America/Vancouver` and `America/Edmonton` show `PCT` and `MDT`. `seed_data` is only included with `INCLUDE_SEED_DATA=true`. |
| `ride-static` | `compose/frontend/StaticBuild` | The production frontend build, served by unprivileged nginx with gzip, security headers and the proxy rules in `compose/frontend/default.conf`. |
| `ride-redis` | `compose/redis/Dockerfile` | Redis with a sidecar script that holds a `redis-primary` Lease and labels whoever has it. |
| `standbycheck` | `compose/standbycheck/Dockerfile` | A Caddy health endpoint that returns 503 in Gold once GoldDR's database has become primary. |

### Workflows

[`.github/workflows/README.md`](.github/workflows/README.md) has the setup
details. Briefly:

1. Build & Deploy to Dev runs on every push to `main`, tags the images
   `latest-dev`, and builds the webapp with `INCLUDE_SEED_DATA=true`.
2. Build & Deploy to Test is manual. It creates the next `b##` git tag and
   deploys it.
3. Build & Deploy to UAT is manual and runs from a release branch. It creates
   the next `rc##` tag and deploys it.
4. Promote from UAT to Prod runs when a GitHub release is published for an
   `rc##` tag. It doesn't build anything. It retags the UAT image and deploys
   that.

Every Sunday, scheduled workflows run an OWASP ZAP baseline scan against dev
and Trivy scans of the images. Other manual workflows upgrade the Crunchy
Postgres chart, deploy the standby check tool, and fail the database and the
application over between Gold and GoldDR.

`src/webapp/release.py` lists the commits on `main` that aren't on the
`release` branch yet and checks whether their Jira tickets are resolved, which
helps when putting a release together.

### Infrastructure documentation

- [`infrastructure/main/README.md`](infrastructure/main/README.md): first
  install and RBAC for the application chart
- [`infrastructure/crunchy-postgres/README.md`](infrastructure/crunchy-postgres/README.md):
  database install, backups, standby clusters and failover
- [`infrastructure/standbycheck/README.md`](infrastructure/standbycheck/README.md):
  the load balancer health check for DR

## Contributing and licence

RIDE is in active development and isn't taking outside pull requests right
now (see [CONTRIBUTING.md](CONTRIBUTING.md)). Work is tracked in Jira under the
`DBC22` project, and commit messages start with the ticket number.

Licensed under the [Apache License 2.0](LICENSE).
