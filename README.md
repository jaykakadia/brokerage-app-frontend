# TradeCall Rebuild — Frontend (Phase 1)

Modern React + Vite frontend maintaining exact visual aesthetics, style fidelity, and workflows of the TradeCall India real estate platform.

## Features Implemented (Phase 1)
- **Home Page**: Hero search bar (city, type, keyword), city quick-filters, budget sliders, category tabs, and responsive property cards.
- **Listing Details**: Property photo carousel, detailed specifications grid, owner/associate badge, direct WhatsApp/phone contact, and owner/admin moderation controls.
- **Post Free Listing**: 5-step property wizard matching original fields, multi-file image uploader with preview thumbnails and client-side validation.
- **User Account**: Profile editing, secure password update, and personal listing status management.
- **Admin Dashboard**: Moderation for Listings (pending, approved, sold, rented, suspended, deleted), Location management, Category management, and User role control.
- **Authentication**: Modal supporting Sign-In, Registration, and OTP validation backed by HTTP-only secure cookie JWT and CSRF protection.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The app will run at `http://localhost:5173` and proxy `/api` and `/uploads` requests directly to `http://localhost:8000`.

### 3. Production Build
```bash
npm run build
```
The built assets are compiled into the `dist/` directory.
