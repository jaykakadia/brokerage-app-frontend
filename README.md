# TradeCall India — Frontend Application

Modern React + Vite frontend application re-engineering the **TradeCall India** real estate and property directory portal with full visual and workflow fidelity to the original platform.

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **HTTP Client**: Axios with automatic CSRF token interception and `withCredentials: true` for secure cookie-based sessions
- **Styling**: Modular CSS preserving original color tokens, gradients, cards, and responsive layouts
- **Typography & Icons**: `Plus Jakarta Sans` Google Font and `FontAwesome 6.5.0`

---

## Features & Modules

### 1. Public Portal & Property Search
- **Home Page (`#home`)**: Hero search bar (city, category, keyword), quick city chips (Palwal, Faridabad, Gurugram, Sonipat, Hodal, Delhi), budget range filtering, and responsive listing card grid.
- **Listing Details (`#listing/:id`)**: High-resolution image gallery, property specifications (BHK, carpet area, facing, floor, furnishings, amenities), owner contact card with Lead Reveal integration, and direct WhatsApp enquiry CTA.
- **Post Free Listing (`#post-listing`)**: Step-by-step submission wizard, photo uploader with drag-and-drop client thumbnails and instant removal, dynamic amenities checklist, and Field Associate reference code lookup.

### 2. Buyer Engagement & Monetization
- **Wishlist / Shortlist**: Interactive bookmarking with optimistic button updates, accessible from listing cards, detail pages, and the user Account dashboard.
- **Lead Reveal Engine**: Blurred seller contact information unlocked via paid lead credits with real-time balance updates.
- **Plans & Pricing (`#advertise`)**: Pricing tiers (Free, Boosted, Premium, Enterprise) with feature checklists, "Most Popular" highlight ribbon, and custom enterprise plan WhatsApp CTA.
- **Razorpay Checkout**: Integrated payment flow with server-side order generation and signature verification.

### 3. User Account Dashboard (`#account`)
- **Profile Overview**: In-place name, email, and phone number updates with OTP verification.
- **Password Security**: Current password validation and new password assignment.
- **My Listings**: Table of user-posted properties with live moderation status badges, edit listing modal, and delete actions.
- **Leads & Subscription**: Real-time display of remaining lead credits, consumed leads, and active plan expiry date.
- **Shortlisted Properties**: Fast grid view of all bookmarked listings.

### 4. Admin Management Center (`#admin`)
- **Listings Moderation**: Tabbed moderation queue (`Pending`, `Approved`, `Sold`, `Rented`, `Suspended`, `Deleted`) with instant status transitions.
- **Location & Category Controls**: Add and manage supported cities, localities, and property categories.
- **User Accounts & Role Limits**: Manage registered users and configure max listing allowances per role (`Owner`, `Agent`, `Builder`).
- **Plan Management**: Create, edit, and activate lead packages and membership durations.
- **Field Associates (`tracker`)**: Associate roster, real-time tracked listing counts, and Add/Edit Associate modal with automated 6-character reference code generator.
- **Blog Management (`blogs`)**: Article authoring with image uploads, draft/published status toggling, and slug permalinks.
- **System Settings (`settings`)**: Administrative credentials update, dynamic SMTP configuration (host, port, user, password, SSL/TLS) with password visibility toggle, Send Test Email trigger, and Razorpay API key management.

### 5. Content & Legal Pages
- **About Us (`#about`)**: Company background, impact statistics counters (500+ listings, 16 cities, 100% direct owners), and regional coverage cards.
- **Contact Us (`#contact`)**: Office location, direct contact emails, interactive enquiry form, and WhatsApp chat launcher.
- **Blog Feed & Reader (`#blog`, `#blog/:slug`)**: Multi-category article feed (All, Buy, Rent, Invest) with read-time indicators, tags, and full article view.
- **Terms of Use (`#terms`)**: Six-section legal agreement governing platform use.
- **Privacy Policy (`#privacy`)**: Data collection, cookie disclosures, and privacy policies.
- **Persistent WhatsApp CTA**: Floating button (`wa.me/919992292828`) available across all public views.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root of `brokerage-app-frontend`:
```ini
VITE_API_URL=http://localhost:8000
```
*(In development, requests to `/api` and `/uploads` are automatically proxied to `http://localhost:8000` via Vite configuration).*

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

### 4. Production Build
```bash
npm run build
```
Generates an optimized production bundle in the `dist/` directory.

### 5. Preview Production Build
```bash
npm run preview
```
