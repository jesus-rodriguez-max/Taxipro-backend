# TaxiPro Backend

This directory contains the backend code for the TaxiPro application, built with Firebase Cloud Functions (Node.js 20) and TypeScript.

## Prerequisites

- Node.js 20
- Firebase CLI

## Installation

1. Navigate to the `functions` directory:
   ```bash
   cd backend/functions
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env` file in the `functions` directory and add the following variables:

```
FIREBASE_PROJECT_ID=your-firebase-project-id
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
GEOFENCE_RADIUS_M=150
```

## Emulators

To start the Firebase emulators, run the following command from the `backend` directory:

```bash
firebase emulators:start --only functions,firestore
```

## Testing

To run the tests, navigate to the `functions` directory and run:

```bash
npm test
```

## Security Notes

- Never expose API keys or other secrets in your code.
- Use environment variables to store sensitive information.
- Restrict API keys by SHA-1 certificate fingerprint (for Android) and by package name.
