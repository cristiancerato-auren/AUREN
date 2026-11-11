# AUREN mobile app

AUREN's customer-facing web experience is prepared for packaging with Capacitor 8.
The native app is kept separate from the public GitHub Pages deployment.

## Requirements

- Node.js 22 or newer
- Xcode 26 or newer for iOS builds (macOS required)
- Android Studio 2025.2.1 or newer for Android builds

## Prepare the web bundle

```bash
npm install
npm run build:mobile
npm run check:mobile
```

The build script copies the customer-facing pages, shared assets, account pages,
legal draft pages and app icons into `www/`. The folder is generated and ignored
by Git; it is not the public website deployment directory.

## Create native projects (first setup only)

```bash
npx cap add ios
npx cap add android
```

## Sync after web changes

```bash
npm run cap:sync
```

Open the native projects:

```bash
npm run cap:open:ios
npm run cap:open:android
```

## Before any store submission

Complete device testing for navigation, authentication redirects, deep links,
image upload, external links and Stripe checkout. Review privacy disclosures,
account deletion requirements, app icons, splash screens and store metadata.
The privacy and sale terms in this repository are drafts and must be completed
and reviewed before enabling public commerce. No database migration, store
submission, deployment, or paid developer account is authorized by this setup.

## App identity

- Display name: AUREN
- Bundle/package ID: `it.aurenliving.app`
- Web assets directory: `www`
- Brand background: `#F4EEE5`
