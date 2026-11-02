SHELL := /bin/bash

.PHONY: help up up-mock down infra-up infra-down logs

help:
	@echo "Available commands:"
	@echo "  make up         - Start infra + backend + frontend"
	@echo "  make up-mock    - Start infra + app + mock traffic"
	@echo "  make down       - Stop local app processes + infra"
	@echo "  make infra-up   - Start infra only"
	@echo "  make infra-down - Stop infra only"
	@echo "  make logs       - Tail docker compose logs"

up:
	@bash scripts/dev-up.sh

up-mock:
	@bash scripts/dev-up.sh --with-mock

down:
	@bash scripts/dev-down.sh

infra-up:
	@docker compose up -d kafka kafka-setup redis postgres clickhouse

infra-down:
	@docker compose down

logs:
	@docker compose logs -f
