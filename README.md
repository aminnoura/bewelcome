# BeWelcome — Mobile & Web App + Backend API

Modern cross-platform BeWelcome client (React Native for iOS, Android, and Web) backed by the BeWelcome Symfony API (`backend/`).

## Repository Structure

- `backend/` — Symfony 8.2 / PHP 8.5 API backend (extracted from `BeWelcome/rox` with legacy Twig/Webpack frontend removed; email templates retained in `backend/templates/emails/`).
- `design/brand/` — Official BeWelcome 2025 SVG logo assets.

## Running the Backend Locally

```bash
cd backend
cp docker-compose.override.yml.dist docker-compose.override.yml
docker compose up -d --build
```

- API / Backend: `http://localhost`
- MailPit (local email viewer): `http://localhost:1080`
- Seeded test users: `bwadmin`, `admin`, `member-3`, `member-6` (password: `password`)
