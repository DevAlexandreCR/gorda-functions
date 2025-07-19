# Gorda Functions

A collection of Firebase Cloud Functions written in TypeScript for the Gorda platform. The functions manage driver services, metrics collection and WhatsApp notifications for clients and drivers.

## Project Overview

This project acts as the backend service for the Gorda application. It provides HTTP endpoints through Express as well as background triggers that react to changes in Firebase Realtime Database. The main responsibilities include:

- Assigning drivers to ride/service requests and updating statuses.
- Sending WhatsApp notifications based on service events.
- Tracking driver connections and balances.
- Persisting aggregated service metrics to Firestore.

## Tech Stack

- **Node.js 18** with **TypeScript**
- **Firebase Functions** (HTTP and Realtime Database triggers)
- **Firebase Admin SDK** (Auth, Firestore and Realtime Database)
- **Express** for API routing
- **dayjs** for date/time utilities

## Installation and Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create a `.env` file** based on `.env.example` and configure Firebase emulator/credentials.
3. **Build the project**
   ```bash
   npm run build
   ```
4. **Start the Firebase emulator** (Functions only)
   ```bash
   npm run serve
   ```
   This compiles the TypeScript code and starts the local emulator so the functions can be tested.

## Deployment to Production

Make sure the Firebase CLI is authenticated with your project and run:

```bash
npm run deploy
```

This command builds the functions and deploys them to the configured Firebase project defined in `.firebaserc`.

## API Usage

The Express application exposes endpoints under the `api` export. Notable routes include:

- `POST /auth/create-user` – create a Firebase Auth user.
- `POST /auth/enable-user` – enable or disable a user.
- `POST /auth/update-email` – update a user's email.
- `POST /auth/update-password` – change a user's password.
- `POST /metrics/populate` – compute service metrics for a date range.
- `GET  /metrics/global` – retrieve stored metrics.

All endpoints validate input using `express-validator` before performing Firebase operations.

## Components

- **Backend (this repository):** Firebase Functions written in TypeScript.
- **Mobile app/Frontend:** Not included in this repository but expected to consume these functions.

## WhatsApp Integration Flow

The service triggers in `src/routes/services/controller.ts` listen to changes in the Realtime Database. When a service is assigned, canceled, completed or a driver arrives, a WhatsApp notification object is written to the `wp_notifications` path. An external WhatsApp bot or service can watch this path and deliver messages to the users.

## Contribution Guidelines

1. Fork the repository and create a feature branch.
2. Ensure `npm run lint` passes before committing.
3. Submit a pull request describing your changes.

## License

No license file has been provided. All rights reserved to the original authors.
