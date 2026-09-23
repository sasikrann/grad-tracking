# Docker deployment

Production runs as four services:

1. `gateway` — public Nginx entry point on port 80; routes the SPA, API, and authorized media.
2. `frontend` — builds Vue with Vite and serves the generated static SPA with Nginx.
3. `backend` — runs the Node.js API, database migrations, admin bootstrap, and schedulers.
4. `db` — PostgreSQL with a persistent Docker volume.

Uploaded evidence and notification attachments use a second persistent volume. The backend checks authorization first, then asks Nginx to transfer the file through an internal-only location. PostgreSQL, Node, and Vite do not need to run on the host.

## 1. Run checks before UAT

From the repository root on Windows:

```powershell
npm.cmd --prefix frontend run type-check
npm.cmd --prefix frontend run test:unit -- --run
npm.cmd --prefix frontend run build
npm.cmd --prefix backend test
```

Run E2E separately because it starts its own isolated Docker stack:

```powershell
npm.cmd run test:e2e
npm.cmd run test:e2e:down
```

## 2. Create the deployment environment file

```powershell
Copy-Item .env.docker.example .env.docker
```

Edit `.env.docker`. At minimum, replace:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `BOOTSTRAP_ADMIN_EMAIL`
- SMTP credentials when email sending is required

For local UAT, keep:

```dotenv
APP_ORIGIN=http://localhost
HTTP_PORT=80
EMAIL_TEST_MODE=true
```

For a server with HTTPS, use the final public origin, for example:

```dotenv
APP_ORIGIN=https://grad.example.ac.th
HTTP_PORT=80
AUTH_COOKIE_SAME_SITE=lax
```

Do not enable development login in production. The production Compose file forces it off.

## 3. Validate and build the Compose stack

```powershell
docker compose --env-file .env.docker config
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
```

Wait until all services show `healthy`, then open:

```text
http://localhost
```

Useful checks:

```powershell
Invoke-WebRequest http://localhost/api/auth/me -UseBasicParsing
docker compose --env-file .env.docker logs --tail=200 backend
docker compose --env-file .env.docker logs --tail=200 gateway
docker compose --env-file .env.docker exec backend npm run db:audit
```

`/api/auth/me` should return `401` before login; that confirms routing is working. A `502` means the gateway cannot reach the frontend or backend.

## 4. Local Docker UAT checklist

- Stop locally installed PostgreSQL, the manually started Node backend, and Vite.
- Confirm the application still opens through `http://localhost`.
- Sign in with Google using an authorized account.
- Test Admin, Advisor, and Student pages.
- Import a small advisor and student file.
- Upload and open evidence and notification attachments.
- Restart the stack and confirm data and uploaded files remain:

```powershell
docker compose --env-file .env.docker restart
```

- Stop and start it again:

```powershell
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d
```

Do **not** add `--volumes` to `down` in a real environment; that removes the PostgreSQL and uploads volumes.

## 5. Deploy to the server

1. Point the domain's DNS record to the server IP.
2. Copy the repository to the server.
3. Create `.env.docker` with production secrets and the HTTPS `APP_ORIGIN`.
4. Run the same `config`, `build`, and `up -d` commands.
5. Configure HTTPS on the server's public reverse proxy or load balancer and forward traffic to this Compose gateway on port 80.
6. Add the production domain to the authorized JavaScript origins in Google Cloud OAuth settings.
7. Run `db:audit`, then complete production smoke testing.

## Operations

View logs:

```powershell
docker compose --env-file .env.docker logs -f --tail=200
```

Deploy a new version without deleting persistent data:

```powershell
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

Back up PostgreSQL before deployment or migration:

```powershell
docker compose --env-file .env.docker exec -T db pg_dump -U grad_tracking grad_tracking > grad_tracking_backup.sql
```

Adjust the database user and database name in that command if `.env.docker` uses different values.
