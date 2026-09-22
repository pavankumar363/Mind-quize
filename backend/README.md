# Mind Quiz API

This backend provides role-based authentication for the Mind Quiz frontend.

## Start locally

```bash
cd backend
npm install
npm start
```

API: http://localhost:4000

Seeded development accounts are created automatically on first run:

- Admin: admin / admin123
- Faculty: faculty1 / faculty123
- Student: student1 / student123

Change these before any public deployment.

The current server keeps active sessions in memory and stores user records locally. Before public production use, replace the local user store/session layer with a managed database and persistent authentication/session storage.
