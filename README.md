# M-Pesa Withdraw Engine

A NestJS payout service for processing withdrawal requests, managing account balance and ledger state, and orchestrating asynchronous M-Pesa B2C payouts.

## Overview

This service supports:

- account creation and balance management
- withdrawal initiation with idempotency
- ledger entry recording for debit/credit reconciliation
- reliable outbox event dispatch to BullMQ
- asynchronous M-Pesa B2C payout orchestration
- callback processing and transaction reconciliation
- protected routes via API key authentication

## Project setup

```bash
npm install
```

## Development

```bash
npm run start:dev
```

## Production

```bash
npm run build
npm run start:prod
```

## Docker

This repository uses a multi-stage Docker build:

- `builder` installs dependencies, generates Prisma client, and compiles the app
- `production` installs production dependencies and copies the generated Prisma client and app output from the builder stage

## Health checks

- `GET /api/v1/healthz` — liveness check
- `GET /api/v1/readyz` — readiness check for database and queue connectivity

## Environment variables

Required:

- `DATABASE_URL`
- `REDIS_URL`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_TOKEN_URL`
- `MPESA_B2C_URL`
- `MPESA_INITIATOR_NAME`
- `MPESA_SECURITY_CREDENTIAL`
- `MPESA_SHORTCODE`
- `MPESA_CALLBACK_URL`
- `API_KEY_SECRET`

Optional:

- `MPESA_CALLBACK_SECRET` — if set, callbacks must include `x-callback-token` header with this secret

## Testing

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## Notes

- Outbox events are retried with backoff and eventually marked as failed after repeated publish attempts.
- BullMQ jobs are configured to clean up completed and failed jobs after retention windows.
- The production Docker build copies the generated Prisma client from the builder stage.

## License

UNLICENSED
