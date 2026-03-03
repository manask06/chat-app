# Chat App (Strongly Typed)

This repository provides a strict TypeScript foundation for a real-time chat app.

## Tech Stack

- Node.js 20+
- Express
- TypeScript (`strict` mode)

## Prerequisites

- Node.js `>=20`
- npm

## Install

```bash
npm install
```

## Development

Run the typed server in watch mode:

```bash
npm run dev
```

App URL: `http://localhost:3000`  
Health URL: `http://localhost:3000/health`

## Type Check

```bash
npm run typecheck
```

## Build

Compile TypeScript to `dist/`:

```bash
npm run build
```

## Verify All Checks Locally

Run typecheck + tests + build in one command:

```bash
npm run check
```

## Start (Production Build)

```bash
npm start
```

## CI

GitHub Actions runs the same validation pipeline on push and pull requests:

- `npm run typecheck`
- `npm test`
- `npm run build`
