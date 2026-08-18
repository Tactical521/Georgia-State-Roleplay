# Georgia State Roleplay Staff Portal v2

## Features
- Locked staff sign-in page.
- Admin-only dashboard.
- Secure password hashing with bcrypt.
- Change admin username/password.
- Change site name.
- Upload/replace site logo.
- Edit the main text/content throughout the staff center.
- Discord webhook audit logging for sign-ins, sign-outs, content changes, branding changes, security changes, and failed logins.
- Webhook URL can be changed from the admin panel.
- Audit logs intentionally do not include passwords or session secrets.

## Run
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## First login
Username: `admin`
Password: `ChangeMe123!`

Immediately change the password from Admin Panel > Security.

## Production notes
For public hosting, set a strong `SESSION_SECRET` environment variable and use HTTPS.
For production, use a persistent session store instead of the default in-memory Express session store.
The Discord webhook should be treated as a secret and should not be committed to a public repository.
