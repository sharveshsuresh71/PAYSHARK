# Deployment and project-root notes

This archive is laid out as a single Next.js project. The project root is the directory containing `package.json`, `next.config.ts`, and `src/app`.

## Local setup

Use Node.js 20.9 or newer.

```bash
pnpm install
pnpm dev
```

Before deploying, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

If there is no lockfile, `pnpm install` creates `pnpm-lock.yaml`. Commit the generated lockfile with the project.

## Vercel

Import the repository and set **Root Directory** to `.` when these files are at the repository top level. Use `pnpm install` as the install command and `pnpm build` as the build command. Leave the output directory at its default and use the Next.js framework preset.

If the app remains inside a nested folder named `PAYSHARK`, set Vercel's Root Directory to `PAYSHARK` instead. The selected directory must contain both `package.json` and `src/app`.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Add the same required production values under Vercel **Project → Settings → Environment Variables**. Never upload `.env.local` or commit real credentials.

The source references: `DATABASE_URL`, `NEON_DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYSHARK_AGENT_KEY`, `ENCRYPTION_KEY`, and `SECURITY_WEBHOOK_URL`.

Keep PayPal in sandbox mode until the integration has been tested. Use a unique production encryption key and rotate credentials that may have been exposed in logs or public repositories.
