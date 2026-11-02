# The stack: PostGIS, the Django webapp and the Vite dev server, all in Docker
# (docker-compose.yml). Configuration comes from .env; README.md lists the
# variables. `make` lists the targets.

# Pinned to the project name `ride`: the webapp joins the external network
# ride_default, which only matches Compose's own default network (where db and
# frontend are) under that name. It also keeps worktrees on the same stack, which
# they would share anyway because the container names are fixed.
COMPOSE := docker compose -p ride
WEBAPP := $(COMPOSE) exec -T webapp
NETWORK := ride_default

# Stamp for the frontend's packages (see below)
FRONTEND_PACKAGES := .make/frontend-packages

.DEFAULT_GOAL := help
.PHONY: help env start backend stop restart status logs build migrate makemigrations \
	shell dbshell superuser manage seed tasks test coverage lint build-static \
	clean clean-data network

help: ## List the targets
	@awk 'BEGIN {FS = ":.*## "} /^[a-z-]+:.*## / {printf "  make %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

env: ## Create .env from .env.example (never overwrites an existing .env)
	@if [ -f .env ]; then echo ".env already exists; leaving it as it is."; \
	else cp .env.example .env && echo "Created .env from .env.example. Fill in the values: README.md lists them."; fi

start: .env network $(FRONTEND_PACKAGES) ## Start the whole stack in the background
	@# --build: the images follow requirements/base.txt and package.json (a
	@# branch may add a package); Docker's cache makes it quick when they haven't changed
	$(COMPOSE) up -d --build --remove-orphans
	@echo
	@echo "  Frontend      http://localhost:5173"
	@echo "  Django admin  http://localhost:8000/admin/"
	@echo "  Logs          make logs"

backend: .env network ## Start only PostGIS and the webapp (no Font Awesome token needed)
	$(COMPOSE) up -d --build db webapp

stop: ## Stop the stack (the database's data stays)
	$(COMPOSE) stop
	@docker rm -f ride-redis >/dev/null 2>&1 || true

restart: stop start ## Stop, then start

status: ## Show the stack's containers
	$(COMPOSE) ps --all

logs: ## Follow the logs (all services, or one: make logs service=webapp)
	$(COMPOSE) logs -f --tail=200 $(service)

build: .env ## Rebuild the images without starting anything
	$(COMPOSE) build

migrate: backend ## Apply the database migrations
	$(WEBAPP) python manage.py migrate

makemigrations: backend ## Create migrations for model changes
	$(WEBAPP) python manage.py makemigrations

shell: backend ## Open a Django shell
	$(COMPOSE) exec webapp python manage.py shell

dbshell: backend ## Open psql on the database
	$(COMPOSE) exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

superuser: backend ## Create another Django superuser (start already creates DJANGO_SUPERUSER_USERNAME)
	$(COMPOSE) exec webapp python manage.py createsuperuser

manage: backend ## Run any management command: make manage cmd="event RIDE-123 -d"
	$(COMPOSE) exec webapp python manage.py $(cmd)

seed: backend ## Add sample organizations, users and events: make seed args="--clear --seed 1"
	$(COMPOSE) exec webapp python manage.py seed_data $(args)

tasks: backend ## Run the Huey worker: auto-clearing and notification emails (starts Redis; Ctrl-C stops the worker)
	@# docker-compose.yml has no Redis, so run one on the stack's network as `redis`
	@docker container inspect ride-redis >/dev/null 2>&1 || \
		docker run -d --rm --name ride-redis --network $(NETWORK) --network-alias redis redis:8-alpine
	$(COMPOSE) exec -e REDIS_HOST=redis -e REDIS_PORT=6379 webapp python manage.py run_huey

test: backend ## Run the backend's tests
	$(WEBAPP) python manage.py test --noinput

coverage: backend ## Run the backend's tests with coverage, as the Unit tests workflow does
	@# coverage isn't in requirements/base.txt; CI installs it the same way. It lasts
	@# until the container is recreated
	$(WEBAPP) sh -c 'pip install -q --root-user-action=ignore coverage && coverage run manage.py test --noinput && coverage report'

lint: .env $(FRONTEND_PACKAGES) ## Lint the frontend with ESLint
	$(COMPOSE) up -d --build frontend
	$(COMPOSE) exec -T frontend npx eslint app

build-static: .env ## Build the production frontend image (ride-static:local), as the deploy workflows do
	@# StaticBuild takes the token as a BuildKit secret, not a build argument
	FONTAWESOME_PACKAGE_TOKEN="$$(sed -n 's/^FONTAWESOME_PACKAGE_TOKEN=//p' .env | tr -d "\"'")" \
		docker build -f compose/frontend/StaticBuild \
		--secret id=FONTAWESOME_PACKAGE_TOKEN,env=FONTAWESOME_PACKAGE_TOKEN \
		--build-arg SOURCEMAP=true -t ride-static:local .

clean: ## Remove the containers, the frontend's packages volume and local build output (the database stays)
	@# rm -v removes only anonymous volumes (the frontend's node_modules and
	@# .react-router), never the named database volume
	$(COMPOSE) rm -fsv
	$(COMPOSE) down --remove-orphans
	@docker rm -f ride-redis >/dev/null 2>&1 || true
	rm -rf .make src/frontend/build src/frontend/.react-router \
		src/webapp/debug.log src/webapp/.coverage src/webapp/coverage.xml
	find src/webapp -name __pycache__ -type d -prune -exec rm -rf {} +

clean-data: ## Remove the containers AND the database's data (asks first)
	@read -p "Delete the local RIDE database and all its data? [y/N] " answer && [ "$$answer" = y ]
	$(COMPOSE) down --remove-orphans --volumes
	@docker rm -f ride-redis >/dev/null 2>&1 || true
	rm -rf .make

.env:
	@echo "No .env here. Run make env to copy .env.example, then fill in the values (README.md lists them)." >&2
	@exit 1

network:
	@docker network inspect $(NETWORK) >/dev/null 2>&1 || docker network create $(NETWORK)

# The frontend's node_modules is an anonymous volume, which outlives the
# container and so hides packages a rebuilt image installs. When the lockfile
# changes, drop the container and that volume so the next `up` copies them fresh.
$(FRONTEND_PACKAGES): src/frontend/package-lock.json
	$(COMPOSE) rm -fsv frontend
	@mkdir -p $(@D) && touch $@
