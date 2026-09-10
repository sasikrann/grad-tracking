# End-to-end tests

The three-container E2E stack is isolated from the development environment:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5433`, database `grad_tracking_e2e`

The PostgreSQL service stores its data in container `tmpfs`. It never uses the
development database or its volumes, and its data disappears when the test
container is removed.

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
