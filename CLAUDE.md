# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeFlowConnect is a modern attendance management system (勤怠管理システム) built as a serverless application on AWS.

## Tech Stack

- **Backend**: FastAPI (Python 3.11), SQLAlchemy, PostgreSQL, JWT authentication
- **Frontend**: React 18, TypeScript, Material-UI, Vite, React Query, Zustand
- **Infrastructure**: AWS CDK, Lambda, RDS, IoT Core, LocalStack for local development
- **Development**: Docker Compose, OpenAPI code generation

## Key Commands

### Development Environment

```bash
# Start all services (frontend, backend, PostgreSQL, LocalStack)
docker-compose up

# Start specific service
docker-compose up backend
docker-compose up frontend

# View logs
docker-compose logs -f backend
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev      # Start development server (port 5173)
npm run build    # Build for production
npm run lint     # Run ESLint

# Generate TypeScript types from OpenAPI
# Method 1: Using Docker Compose (recommended)
./scripts/generate-api-docker.sh

# Method 2: Inside frontend container
docker-compose exec frontend npm run generate:api

# Method 3: From host machine (requires Node.js)
cd frontend && npm run generate:api
```

### Backend Development

```bash
# Inside backend container
docker-compose exec backend bash

# Run database migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Export OpenAPI schema
docker-compose exec backend python export_openapi.py
```

### Testing

```bash
# Backend tests (when implemented)
docker-compose exec backend pytest

# Frontend tests (when implemented)
cd frontend && npm test
```

## Architecture Overview

### Backend Structure
- `/backend/src/routers/` - API endpoints organized by feature (auth, attendance, shift, etc.)
- `/backend/src/models/` - SQLAlchemy database models
- `/backend/src/schemas/` - Pydantic schemas for request/response validation
- `/backend/src/auth/` - JWT authentication and authorization logic

### Frontend Structure
- `/frontend/src/pages/` - Page components mapped to routes
- `/frontend/src/components/` - Reusable UI components
- `/frontend/src/services/` - API client services
- `/frontend/src/contexts/` - React contexts (AuthContext for authentication)
- `/frontend/src/api/generated/` - Auto-generated TypeScript types from OpenAPI

### API Integration
The project uses OpenAPI code generation to maintain type safety between backend and frontend:
1. FastAPI automatically generates OpenAPI schema
2. `npm run generate:api` fetches the schema and generates TypeScript types
3. Generated types are used in frontend services for type-safe API calls

### Database Schema
Key models include:
- User (employees with authentication)
- Attendance (clock in/out records)
- Shift (work schedules)
- Leave (leave requests)
- Department (organizational structure)

### Authentication Flow
1. User logs in with email/password
2. Backend validates credentials and returns JWT token
3. Frontend stores token and includes in API requests
4. Protected routes check authentication state via AuthContext

## Development Workflow

1. Make backend API changes
2. Restart backend: `docker-compose restart backend`
3. Generate new types: `cd frontend && npm run generate:api`
4. Update frontend code to use new types
5. Test the integration

## Environment Variables

### Backend (in docker-compose.yml)
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `AWS_*` - AWS credentials (dummy values for LocalStack)

### Frontend (in .env files)
- `VITE_API_URL` - Backend API URL (default: http://localhost:8000)