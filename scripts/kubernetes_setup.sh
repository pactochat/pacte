#!/bin/bash
kubectl apply -f infra/gitea/gitea-deployment.yaml
psql -c "CREATE DATABASE agentic;"
