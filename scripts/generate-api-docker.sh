#!/bin/bash

# Docker Composeを使用してOpenAPI型生成を実行するスクリプト

echo "Starting backend service..."
docker-compose up -d backend db

echo "Waiting for backend to be ready..."
sleep 5

echo "Generating OpenAPI types..."
docker-compose exec frontend npm run generate:api

echo "Done! Types have been generated in frontend/src/api/generated/"