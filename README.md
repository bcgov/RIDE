# RIDE – Route Information and Data Entry

RIDE is the internal data-entry application behind [DriveBC](https://www.drivebc.ca)
([bcgov/DriveBC.ca](https://github.com/bcgov/DriveBC.ca)). Ministry of
Transportation and Transit staff and highway maintenance contractors use it to
record incidents, construction, road conditions and chain-up requirements on
BC highways. Approved events are pushed to DriveBC's Open511 API, where they
appear on the public DriveBC map and feeds.

RIDE replaces the legacy DIT application. Reference data and user accounts
imported from DIT are still referred to by that name in a few management
commands and in the login adapter.

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

- **Event entry on a map.** Create and edit incidents, construction, special
  events and weather events with a start point, optional end point and a route
  geometry drawn from the BC Route Planner. Locations are described using
  landmarks and crossroads from the Landmark Kilometre Inventory (LKI).
- **Road conditions and chain-ups.** Highways are divided into named segments.
  Road conditions are entered per segment, individually or in bulk, and
  chain-up requirements are toggled per segment within a service area.
- **Versioning and approval.** Every save creates a new version of the event,
  so the full history and a field-level diff are available. Minor events are
  approved automatically; major events and closures submitted by users without
  the approver permission are held as pending until an approver accepts them.
- **Automatic clearing.** A background task deactivates events whose end time
  has passed.
- **Publishing to DriveBC.** When an approved event is saved it is created or
  patched in DriveBC's Open511 API in the same transaction; a failed sync rolls
  the save back and returns the validation error to the user.
- **Service areas and organizations.** Users belong to organizations, which are
  scoped to maintenance service areas. A user may only create or edit events
  whose start point falls inside one of their service areas.
- **Supporting data on the map.** DriveBC dynamic message sign (DMS) panels,
  district and service area boundaries, and route geometries are shown as map
  layers.
- **Email notifications.** Users choose under Notification settings, in the
  user menu, which service areas, event types, severities and statuses they
  are emailed about. Matching subscribers also get reminders when an event's
  next update is due soon or overdue.
- **Access requests.** Users who aren't in an organization are asked to
  request one. RIDE admins get an email with a Grant permission button that
  adds the user to that organization as a Submitter.
- **Single sign-on.** Login is through the BC Government Keycloak realm using
  IDIR or BCeID. Local Django accounts can be enabled for development.
- **Operational endpoints.** A public closures feed in the On Route API
  format, a timezone lookup for a coordinate, and Prometheus metrics.
- **Environment cue.** The header shows a badge reading `local`, `dev`,
  `test` or `uat`, so non-production sites are easy to tell apart.

## Architecture

```
                  ┌──────────────────────┐
  browser ──────► │ static (nginx)       │  React SPA, proxies /api, /session,
                  │ port 5173            │  /accounts, /static, /admin to webapp
                  └──────────┬───────────┘  and /drivebc-api/dms/ to DriveBC
                             │
                  ┌──────────▼───────────┐      ┌──────────────┐
                  │ webapp (gunicorn)    │ ───► │ PostGIS      │
                  │ Django + DRF         │      └──────────────┘
                  │ port 8000            │ ───► Keycloak (OIDC)
                  └──────────┬───────────┘ ───► DriveBC Open511 API
                             │                ───► BC Route Planner
                  ┌──────────▼───────────┐
                  │ tasks (huey)         │ ◄──► Redis
                  │ periodic jobs        │
                  └──────────────────────┘
```

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | React 19, React Router 7 (SPA mode), Vite 6, Redux Toolkit, OpenLayers 10, Tailwind CSS 4, Sass, Font Awesome Pro | Built to static files and served by nginx in deployed environments. Runtime configuration is injected into `index.html` at pod start. |
| Backend | Python 3.14, Django 5.2, Django REST Framework, GeoDjango, django-allauth (OpenID Connect), gunicorn, WhiteNoise, django-prometheus, django-email-log | Session-authenticated JSON API plus the Django admin. Sent emails are logged and kept for 7 days. |
| Task worker | Huey with a Redis broker | Runs the same image as the webapp with a different start script. Only one replica runs Huey at a time, chosen by a Kubernetes Lease. |
| Database | PostgreSQL with PostGIS | Crunchy Postgres operator in OpenShift, `postgis/postgis` image locally. |
| Cache / broker | Redis 8 | Custom image that labels the current primary pod using a Kubernetes Lease. |

External services the application talks to:

- **Keycloak** (BC Gov SSO) for IDIR and BCeID login.
- **DriveBC Open511 API** to publish approved events.
- **DriveBC DMS API** (proxied by nginx) for dynamic message sign panels.
- **BC Route Planner** for route geometries and network segment (TLID) lookups.
- **BC Geocoder** and a vector base map, called directly from the browser.
- **An SMTP server** for access request and notification emails.

## Repository layout

```
.
├── compose/                 Dockerfiles and start scripts for each image
│   ├── frontend/            Dev Dockerfile, production StaticBuild, nginx config,
│   │                        runtime config injection script
│   ├── redis/               Redis image with Lease-based primary labelling
│   ├── standbycheck/        Load-balancer health check used for DR failover
│   └── webapp/              Backend image, entrypoint and start scripts
├── docker-compose.yml       Local development stack (db, webapp, frontend)
├── Makefile                 Targets to run, test and clean the local stack
├── .env.example             Blank template for .env (copy with make env)
├── infrastructure/          Helm charts for OpenShift
│   ├── main/                Umbrella chart: webapp, static, tasks, redis
│   ├── crunchy-postgres/    Crunchy PostgreSQL cluster with backups and DR
│   └── standbycheck/        Standby check tool for Gold / GoldDR
├── src/
│   ├── diagrams/            draw.io diagrams of the data model and workflows
│   ├── frontend/            React application
│   └── webapp/              Django project
│       ├── apps/
│       │   ├── events/      Events, notes, traffic impacts, conditions,
│       │   │                Open511 sync, notification emails, background tasks
│       │   ├── lki/         Landmark Kilometre Inventory and crossroads
│       │   ├── organizations/ Organizations, districts, service areas
│       │   ├── segments/    Routes, road-condition segments, chain-up segments
│       │   ├── shared/      Versioned model base classes and custom fields
│       │   ├── users/       Custom user model, groups, access requests,
│       │   │                notification subscriptions
│       │   └── ride/        Static assets (fonts, admin styling), email log cleanup
│       ├── config/          Settings, URL routing, allauth adapters
│       ├── templates/       Admin overrides and the shared email layouts
│       └── release.py       Release helper that compares main with release
└── .github/workflows/       Build, deploy, test, scan and failover workflows
```

## Local development

### Prerequisites

- Docker with Docker Compose v2, and GNU Make (the version macOS ships works)
- A Font Awesome Pro package token (the frontend depends on the `pro-*` icon
  packages; `npm ci` fails without it)
- Access to a Keycloak client for the BC Gov SSO realm, or set
  `ALLOW_LOCAL_ACCOUNTS=True` and use Django accounts instead

### First run

1. Create a `.env` file in the repository root from the blank template:

   ```bash
   make env
   ```

   This copies `.env.example`, which lists every variable, and never
   overwrites an existing `.env`. Docker Compose passes the file to the
   webapp, database and frontend containers. See
   [Configuration](#configuration) for what each variable does. Typical local
   values are:

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
   ROUTE_PLANNER_API_URL=https://router.api.gov.bc.ca
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

   This creates the `ride_default` Docker network if it is missing, builds the
   images and starts PostGIS, the webapp and the frontend in the background.
   The webapp container waits for Postgres, runs migrations, collects static
   files and creates the superuser from the `DJANGO_SUPERUSER_*` variables
   before starting gunicorn with auto-reload. The frontend container runs the
   Vite dev server with hot module replacement. Follow the output with
   `make logs`.

3. Run `make` on its own to list the other targets. The common ones are:

   | Target | What it does |
   |--------|--------------|
   | `make stop`, `make restart`, `make status` | Stop, restart or list the containers |
   | `make backend` | Start only PostGIS and the webapp, without the frontend |
   | `make logs` | Follow the logs, or one service with `service=webapp` |
   | `make migrate`, `make makemigrations` | Apply or create migrations |
   | `make shell`, `make dbshell` | Django shell or psql |
   | `make manage cmd="..."` | Any management command |
   | `make seed args="..."` | Add sample organizations, users and events (see [Sample data](#sample-data)) |
   | `make tasks` | Run the Huey worker with a temporary Redis |
   | `make test`, `make coverage`, `make lint` | Backend tests, tests with coverage, ESLint |
   | `make build-static` | Build the production frontend image as CI does |
   | `make clean` | Remove containers and build output; the database stays |
   | `make clean-data` | Also delete the database, after asking |

   The Makefile pins the Compose project name to `ride`. The webapp joins the
   external `ride_default` network, which only matches the network the
   database and frontend use under that project name. If you call
   `docker compose` directly from a folder not named `RIDE`, such as a
   worktree, pass `-p ride`.

4. Open the application:

   | URL | What |
   |-----|------|
   | http://localhost:5173 | Frontend |
   | http://localhost:8000/admin/ | Django admin |
   | http://localhost:8000/accounts/login/ | Local account login (only when `DEBUG=True`) |
   | http://localhost:8000/metrics | Prometheus metrics |

Source directories are mounted into the containers, so edits to
`src/webapp` and `src/frontend` are picked up without a rebuild. Rebuild when
`requirements/base.txt` or `package.json` changes.

### Reference data

Data migrations load all the reference data into a fresh database. That
includes service areas, segments, chain-up segments, LKI landmarks, crossroads,
traffic impacts and conditions, and any users and organizations in
`RIDE_USERS_STRING` and `RIDE_ORGS_STRING`. No separate loading step is
needed.

The first `migrate` on an empty database calls the BC Route Planner to build
highway geometries, in the events app's migration 0016. It needs a valid
`ROUTE_PLANNER_API_URL` and `ROUTE_PLANNER_API_KEY`, or that migration fails
and later migrations do not run. The command appends `/directions.json` to the
URL, so set the base URL without a trailing path. Tests skip this call.

The `districts`, `service_areas`, `load_lki_data` and `load_dit_data` commands
rebuild those datasets from the original source files when fixtures need to be
regenerated. `update_area_routes` recalculates the route list on each service
area after segments change. Do not reload the segment fixtures over an existing
database, because segments are versioned and later migrations rename them.

Traffic impacts and conditions can be edited in the Django admin after they are
loaded.

### Sample data

A fresh database has reference data but no events. The `seed_data` command
fills it with random sample data for testing:

```bash
make seed args="--clear --seed 1"
```

By default it creates:

- 6 organizations. Each has its own run of neighbouring service areas, with one
  approver and two submitters.
- A superuser in no organization, standing in for ministry staff who can edit
  anywhere.
- 100 incidents and planned events in those areas. 10% are left awaiting
  approval: a quarter of those are updates, a quarter are clears and the rest
  are new events.
- 30 road conditions and 10 chain-ups, saved the way their pages save them.

Sample usernames start with `sample_` and use `@example.com` addresses. They
have no password, so nobody can sign in as them. Your own user (`--user`, the
first superuser by default) joins two of the organizations, so the area and
organization filters have something to show. The command prints each
organization's areas and members.

Notification emails and the Open511 sync are off while it runs. Pass
`--notify` or `--sync` to turn them on. Due-soon and overdue reminders for the
sample events still go out once the Huey worker runs.

| Option | What it does |
|--------|--------------|
| `-n`, `--count` | Number of events (default 100) |
| `--pending` | Number of events awaiting approval (default 10% of the count) |
| `--road-conditions`, `--chain-ups` | Number of each (default 30 and 10) |
| `--organizations` | Number of sample organizations (default 6). With 0, events go anywhere, created by `--user` and `--submitter` |
| `--user-orgs` | How many organizations `--user` joins (default 2) |
| `--user`, `--submitter` | Who joins the organizations, and the non-approver for pending events without them |
| `--seed` | Random seed, for repeatable data |
| `--clear` | Delete every event, every organization, requests to join one and the sample users first |
| `--email-scenarios` | Email `--user` one notification of each kind |
| `--scheduled-scenario [MINUTES]` | Test the timed emails, running the notification tasks for MINUTES (default 50) |

`--clear` deletes every organization, not only sample ones, so it also removes
any organizations loaded from `RIDE_ORGS_STRING`. Each run is a single
transaction, so a failed run leaves nothing behind.

`--email-scenarios` makes the changes in `--user`'s sample organizations that
send each kind of notification: new, updated, cleared, each approval step,
closures, planned events, road conditions, chain-ups and reminders. It then
sends the queue. `--user` needs an email address and approval permission. It
uses the existing sample data, or seeds it first with `--clear`.

`--scheduled-scenario` creates three incidents whose next updates or end times
come due in the next few minutes. It then runs the end time, notification and
reminder tasks every minute, as Huey would, and prints each email as it goes.
It only runs them for those incidents and anything saved while it runs, so
the other sample events don't send reminders. It doesn't need `make tasks`.
Ctrl-C stops it.

Both scenarios turn on `--user`'s notifications for everything in their areas.
With the console email backend, the emails print in the command's output.

### Background tasks

The compose file does not include Redis or the Huey worker, so automatic
event clearing and notification emails do not run by default. Saved events
still queue their notifications, and the worker sends them when it starts.
`make tasks` starts a temporary Redis container on the stack's network and
runs the worker in the webapp container until you press Ctrl-C. With the
console email backend, the emails print in the worker's output. `make stop`
removes the Redis container.

### Tests

Backend tests run with Django's test runner against the PostGIS database.
Open511 publishing and the Route Planner call are skipped under test.

```bash
make test
```

`make coverage` runs the same suite with coverage, as the
`Unit tests/Code Coverage` workflow does on every pull request. SonarCloud
analysis is configured in `sonar-project.properties`.

There are no frontend unit tests. `make lint` runs ESLint with the
configuration in `src/frontend/eslint.config.js`.

### Working outside Docker

The backend can run directly with Python 3.14 if GDAL, GEOS and PROJ are
installed. On Windows set `GEOS_LIBRARY_PATH`, `GDAL_LIBRARY_PATH` and
`PROJ_LIB` in `.env`. The frontend runs with `npm ci` followed by
`npm run dev` inside `src/frontend`; the `.npmrc` there reads
`FONTAWESOME_PACKAGE_TOKEN` from the environment.

## Configuration

All configuration is through environment variables. Locally they come from the
root `.env`; in OpenShift they are injected from Vault into
`/vault/secrets/secrets.env` and sourced before the start script runs.

### Backend

| Variable | Required | Purpose |
|----------|----------|---------|
| `SECRET_KEY` | yes | Django secret key |
| `DEBUG` | yes | `True` enables debug mode and the local login/signup pages |
| `DJANGO_ALLOWED_HOSTS` | yes | Comma-separated host list; the pod IP is appended automatically |
| `DJANGO_CORS_ORIGIN_WHITELIST` | yes | Comma-separated origins; also used as `CSRF_TRUSTED_ORIGINS` |
| `DJANGO_CSRF_COOKIE_SECURE`, `DJANGO_SESSION_COOKIE_SECURE`, `DJANGO_SECURE_SSL_REDIRECT` | yes | Cookie and TLS flags; `False` locally |
| `DJANGO_EMAIL_BACKEND`, `DJANGO_EMAIL_HOST`, `DJANGO_EMAIL_PORT` | yes | Outbound email for access requests and notifications |
| `DJANGO_EMAIL_TIMEOUT` | no | Seconds before an SMTP connection gives up, so an outage can't stall tasks. Default `30` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | yes | PostGIS connection |
| `REDIS_HOST`, `REDIS_PORT` | yes | Huey broker |
| `KEYCLOAK_URL`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_SECRET` | yes | OpenID Connect provider for IDIR and BCeID |
| `FRONTEND_BASE_URL` | no | Where to redirect after login/logout. Default `http://localhost:5173/` |
| `ALLOW_LOCAL_ACCOUNTS` | no | Allow Django username/password accounts. Default `False` |
| `SHOW_DEBUG_TOOLBAR` | no | Enable django-debug-toolbar. Default `False` |
| `ENABLE_DEBUG_LOGGING` | no | Write the `debug` logger to `debug.log` |
| `EVENT_PREFIX` | no | Prefix for generated event IDs. Default `RIDE` |
| `OPEN511_API_URL`, `OPEN511_API_KEY` | no | DriveBC Open511 endpoint. Sync is skipped with a warning when unset |
| `DISABLE_OPEN511_SYNC` | no | Skip publishing entirely. Default `False`; always skipped under test |
| `DISABLE_EVENT_NOTIFICATIONS` | no | Stop queuing and sending notification emails. Default `False`; always off under test |
| `ROUTE_PLANNER_API_URL`, `ROUTE_PLANNER_API_KEY` | no | BC Route Planner, used for TLIDs and route geometries |
| `RIDE_NOTIFICATION_FROM_EMAIL_DEFAULT` | no | Sender for notification and access request emails, shown as DriveBC RIDE. Default `DoNotReply_RIDE@gov.bc.ca` |
| `RIDE_NOTIFICATION_ADDRESS_BOOK_EMAIL` | no | Address that notification emails ask readers to add to their address book. Defaults to the sender |
| `RIDE_NOTIFICATION_SUBJECT_PREFIX` | no | Prefix for notification subjects, such as `[DEV] `. Default empty |
| `RIDE_SUPPORT_EMAIL` | no | Support contact shown in notification emails. Default `ride.support@gov.bc.ca` |
| `DRIVEBC_BASE_URL` | no | Public DriveBC site for View on DriveBC links. The links are left out when empty |
| `ACCESS_REQUEST_RECEIVERS` | no | Semicolon-separated recipients for access requests. Default `ride.support@gov.bc.ca` |
| `RIDE_USERS_STRING`, `RIDE_ORGS_STRING` | no | Pipe-delimited input for `import_dit_users` |
| `TASKS_BACKEND` | no | Django tasks backend. Default is the Huey backend |
| `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, `DJANGO_SUPERUSER_PASSWORD` | compose only | Superuser created by the start script |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | compose only | Initialise the local Postgres container |
| `POD_NAME`, `POD_NAMESPACE`, `LEASE_NAME`, `LEASE_DURATION`, `RENEW_INTERVAL`, `RETRY_INTERVAL` | OpenShift only | Leader election for the tasks and Redis pods |
| `TICKET_API_HOST` | release script only | Jira host used by `release.py` |

### Frontend

In development Vite exposes variables prefixed with `VITE_` from the root
`.env`. In deployed environments the same names without the prefix are
written into `window.__ENV__` by `compose/frontend/generate-config.sh` when the
pod starts, so the static image is built once and configured per environment.

| Variable | Purpose |
|----------|---------|
| `API_HOST` | Base URL of the backend |
| `GEOCODER_HOST`, `GEOCODER_CLIENT_ID` | BC Geocoder |
| `ROUTER_URL`, `ROUTER_CLIENT_ID` | BC Route Planner. Default URL `https://router.api.gov.bc.ca/route.json` |
| `ROUTABLE_LOCATIONS_HOST` | Routable locations service |
| `BASE_MAP_URL`, `MAP_STYLE_URL` | Vector tiles and style for the map |
| `DMS_API_URL` | DriveBC DMS endpoint. nginx exposes a same-origin proxy at `/drivebc-api/dms/` for deployed environments |
| `ALLOW_LOCAL_ACCOUNTS` | Show the local login form on the home page |
| `DEBUG`, `SHOW_DEBUG_CONTROL` | Debug output and the in-app debug control |
| `EVENT_POLLING_REFRESH` | Event list polling interval |
| `CLEARING_TIMEOUT` | Milliseconds before a cleared event drops off the list. Default 900000 |
| `ENVIRONMENT` | Header badge for `dev`, `test` and `uat`. On localhost the badge reads `local` |
| `DEPLOYMENT_TAG`, `RELEASE`, `BRANCH` | Shown in the UI; set by the deployment |

## Backend notes

### Versioned models

`apps/shared/models.py` defines `VersionedModel`. Saving an instance never
updates a row: it inserts a new row with the same `id`, an incremented
`version` and `latest=True`, and clears `latest` on the previous version.
Deletes are soft. `diff()` and `get_history()` produce field-level change logs,
and custom JSON fields (`LocationField`, `OrderedListField`) know how to diff
their own contents. Events, notes, segments and chain-ups are all versioned.

Saving an event also rounds its coordinates to five decimal places and
simplifies long lines, to keep the stored geometry and API responses small.

### Event approval

`Event` extends the versioning with an `approved` flag and a `latest_approved`
convenience column. Several managers expose different views of the table:

| Manager | Returns |
|---------|---------|
| `Event.objects` | Every version |
| `Event.current` | Latest approved version of each event |
| `Event.last` | Latest version, approved or not |
| `Event.pending` | Latest versions awaiting approval |
| `Event.relevant` | Active events and events inactivated in the last 7 days |

Users with the `users.approve_ride_events` permission are approvers. The event
serializer approves a save automatically when the severity is minor, no
traffic impact is a closure, and the event was not previously major or closed.
Anything else is approved immediately only if the submitter is an approver;
otherwise it becomes a pending version that approvers review through the
`/api/events/pending` endpoint. Saving an approved version triggers the
Open511 sync.

### Open511 sync

`apps/events/open511.py` builds the Open511 payload, including the generated
description and IVR (phone system) text, and POSTs new events or PATCHes
changed fields. Chain-up events are not published. Successes and failures are
counted in the `ride_open511_sync_successes` and `ride_open511_sync_failures`
Prometheus metrics.

### Background tasks

The Huey periodic tasks are in `apps/events/tasks.py` and `apps/ride/tasks.py`:

| Task | Schedule | What it does |
|------|----------|--------------|
| `check_end_time` | Every minute | Inactivates active events whose end time is within the next minute |
| `send_queued_event_notifications_task` | Every minute | Emails subscribers about each queued event version, oldest first |
| `send_event_reminder_notifications_task` | Every minute | Sends next-update reminders: once 15 minutes before it is due, then every 15 minutes while overdue |
| `purge_event_reminder_notifications_task` | Daily at 03:15 UTC | Removes week-old reminder records that no longer match a published event |
| `clean_email_logs` | Daily at midnight UTC | Deletes logged emails older than 7 days |

In OpenShift the tasks deployment wraps `run_huey` in
`compose/webapp/leader-election.py`, so multiple replicas can run for
availability while only the Lease holder processes tasks.

### Notifications

Each new event version is queued for notification in the same transaction as
the save, so a rolled-back save never sends email. The send task classifies
each version as new, updated, reconfirmed or cleared, or as an approval request
or its outcome, and emails each user whose subscription matches. Users
manage their subscription through the Notification settings page, which
reads and writes `/api/users/email-subscriptions`.

### Authentication

Login is handled by django-allauth with two OpenID Connect apps against the
same Keycloak client: `idir` (Azure IDIR) and `bceid`. `config/adapter.py`
links a first-time SSO login to a pre-imported user with a matching
`idir__username` or `bceid__username`, normalises BCeID display names, and
stores the ID token so logout can end the Keycloak session. Sessions last 12
hours. The Django admin is behind the same login and, in deployed
environments, restricted to government IP ranges by nginx.

### Management commands

| Command | Purpose |
|---------|---------|
| `event <id> [version]` | Inspect an event, its meta, source and user details |
| `verify_geometry <id> [--fix]` | Check and repair an event's geometry |
| `remove_open511_events <eid>...` | Remove events from Open511 by ID |
| `seed_data` | Random sample organizations, users, events, road conditions and chain-ups (see [Sample data](#sample-data)) |
| `reset_events`, `reset_rcs`, `create_rc`, `create_from_json` | Development helpers for seeding and clearing events |
| `build_route_geometries`, `update_tlids` | Populate route geometry and network segment IDs from the Route Planner |
| `test_auto_clearing`, `test_events`, `test_versions` | Manual checks for clearing and versioning behaviour |
| `load_references` | Load traffic impact and condition lookups |
| `load_lki_data`, `load_dit_data` | Rebuild LKI landmarks and crossroads from source files |
| `districts`, `service_areas`, `fix_area_names`, `update_area_routes` | Maintain districts and service areas |
| `update_segments`, `update_segment_names`, `populate_ls`, `purge_segments` | Maintain road-condition segments |
| `user <email> [--active] [--not-active] [--staff] [--not-staff]` | Toggle flags on a user |
| `import_dit_users` | Create users and organizations from `RIDE_USERS_STRING` and `RIDE_ORGS_STRING` |
| `clear_inactive_users_orgs` | Remove organization membership from inactive users |

## API overview

All endpoints under `/api/` use Django session authentication. Routers are
registered without trailing slashes. Django's login-required middleware does
not apply to these views, because Django REST Framework exempts them, so each
view sets its own permissions in its app's `views.py`. Reading events,
landmarks, crossroads, location search, the timezone lookup and the closures
feed needs no login. Most other endpoints need a signed-in user, and some need
an approver or an admin.

| Path | Description |
|------|-------------|
| `GET /session` | Current user, or `{"username": null}` plus a CSRF cookie |
| `/api/events` | Events CRUD, plus `GET /api/events/relevant`, `GET /api/events/<id>/history`, `GET /api/events/<id>/diffs` and `POST /api/events/description` (preview the generated description). `relevant` leaves out cleared bulk road conditions and chain-ups. Creating or editing needs a signed-in user whose service areas include the start point |
| `/api/events/pending` | Pending versions awaiting approval. Needs a signed-in user |
| `GET /api/events/closures` | Closed network segments in On Route API format, for incidents and for planned events that have started. Public |
| `/api/rcs` | Road conditions, plus `POST /api/rcs/clear`, `/api/rcs/confirm` and `/api/rcs/bulk_update` |
| `/api/chainup-events` | Chain-up events, plus `POST /api/chainup-events/toggle` and `/api/chainup-events/reconfirm` |
| `/api/notes` | Notes attached to events |
| `/api/traffic-impacts`, `/api/conditions` | Lookup tables |
| `GET /api/timezone?lat=&lng=` | IANA timezone for a coordinate |
| `/api/landmarks`, `/api/crossroads`, `GET /api/search` | LKI reference locations and location search |
| `/api/segments`, `/api/chainups`, `/api/routes` | Road-condition segments, chain-up segments and routes |
| `/api/districts`, `/api/service_areas`, `/api/organizations` | Organizational data |
| `/api/users`, `/api/groups` | User and group management. Needs an admin |
| `POST /api/users/request` | Ask to join an organization; emails RIDE admins. Needs a signed-in user |
| `/api/users/email-subscriptions` | The signed-in user's notification subscription |
| `/accounts/oidc/idir/login/`, `/accounts/oidc/bceid/login/`, `/accounts/logout/` | allauth login and logout |
| `GET /metrics` | Prometheus metrics (no login) |

## Deployment

RIDE runs on the BC Government OpenShift platform in an active/standby pair of
clusters (Gold and GoldDR). Each environment (`dev`, `test`, `uat`, `prod`) is
a Helm release of `infrastructure/main` installed in both clusters, with a
`values-<env>.yaml` file and a `values-<env>-dr.yaml` overlay for GoldDR.
Secrets come from Vault; images are published to `ghcr.io/bcgov/ride-webapp`,
`ride-static` and `ride-redis`.

### Images

| Image | Dockerfile | Contents |
|-------|-----------|----------|
| `ride-webapp` | `compose/webapp/Dockerfile` | Django application; also used for the tasks pod. Builds a patched tzdata so `America/Vancouver` and `America/Edmonton` report the `PCT` and `MDT` abbreviations. |
| `ride-static` | `compose/frontend/StaticBuild` | Production frontend build served by unprivileged nginx with gzip, security headers and the proxy rules in `compose/frontend/default.conf`. |
| `ride-redis` | `compose/redis/Dockerfile` | Redis with a sidecar script that keeps a `redis-primary` Lease and labels the holder. |
| `standbycheck` | `compose/standbycheck/Dockerfile` | Caddy health endpoint that returns 503 in Gold when GoldDR's database has become primary. |

### Workflows

See [`.github/workflows/README.md`](.github/workflows/README.md) for setup
details. In short:

1. **Build & Deploy to Dev** runs on every push to `main` and tags images
   `latest-dev`.
2. **Build & Deploy to Test** is manual, creates the next `b##` git tag and
   deploys it.
3. **Build & Deploy to UAT** is manual, run from a release branch, creates the
   next `rc##` tag and deploys it.
4. **Promote from UAT to Prod** runs when a GitHub release is published for an
   `rc##` tag.

Scheduled workflows run an OWASP ZAP baseline scan against dev and Trivy
scans of the images every Sunday. Separate manual workflows upgrade the Crunchy
Postgres chart, deploy the standby check tool, and perform database and
application failover between Gold and GoldDR.

`src/webapp/release.py` lists commits on `main` that are not yet on the
`release` branch and checks whether their Jira tickets are resolved, to help
assemble a release.

### Infrastructure documentation

- [`infrastructure/main/README.md`](infrastructure/main/README.md) – initial
  install and RBAC for the application chart
- [`infrastructure/crunchy-postgres/README.md`](infrastructure/crunchy-postgres/README.md)
  – database install, backups, standby clusters and failover
- [`infrastructure/standbycheck/README.md`](infrastructure/standbycheck/README.md)
  – load-balancer health check for DR

## Contributing and licence

This project is under active development and is not accepting external pull
requests at this time; see [CONTRIBUTING.md](CONTRIBUTING.md). Work is tracked
in Jira under the `DBC22` project, and commit messages are prefixed with the
ticket number.

Licensed under the [Apache License 2.0](LICENSE).
