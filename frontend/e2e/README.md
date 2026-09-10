# End-to-end tests

The E2E stack is isolated from the development environment:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5433`, database `grad_tracking_e2e`

The PostgreSQL service uses the dedicated `e2e_db_data` named volume. It never
uses the development database or its volumes. Test data remains available after
the E2E containers are stopped, while the seed service safely resets only the
`grad_tracking_e2e` database before a fresh test-stack startup.

Import fixtures are stored under `fixtures/imports`. The seed script creates the
baseline administrator and a dedicated student login. Additional advisor and
student records are imported through the real browser UI and API.

Run the tests from the repository root:

```sh
npm run test:e2e
```

Open the latest HTML report from the repository root:

```sh
npm run test:e2e:report
```

Stop and remove only the isolated E2E containers:

```sh
npm run test:e2e:down
```

`dev-login.spec.ts` exercises the real development-login endpoint against the
isolated backend and database. `google-login-ui.spec.ts` mocks the external
Google Identity script; it verifies the application integration without storing
Google credentials or automating a real Google account.

`notifications/admin-to-student-notification.spec.ts` verifies that an admin can
create a persisted notification and that the seeded student can sign in, see
the notification, and open its details.
