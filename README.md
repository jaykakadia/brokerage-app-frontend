# TradeCall India — Frontend Application

# TradeCall India | Frontend

<div align="center">

### Find a place. Make your next move.

React application for browsing, publishing, and managing property listings on TradeCall India.

![React 18](https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

## Contents

- [Overview](#overview)
- [Features](#features)
- [Technology](#technology)
- [Requirements](#requirements)
- [Run Locally](#run-locally)
- [Configuration](#configuration)
- [Routes](#routes)
- [Validation](#validation)
- [Production](#production)
- [Related Project](#related-project)

## Overview

TradeCall India is a responsive real-estate directory experience backed by the TradeCall API. The frontend supports public property discovery, authenticated customer workflows, and administrative tools. It uses clean path-based URLs and retains compatibility with selected legacy hash routes.

## Features

- Browse and filter approved listings by location, category, keyword, and budget; view listing photos and property details.
- Submit property or business listings through a multi-step form with photo selection and Field Associate reference-code lookup.
- Register and sign in, manage account details and listings, save properties to a wishlist, and review plan and lead balances.
- Reveal seller contact details using lead credits and purchase plans through the Razorpay checkout integration.
- Administer listing moderation, users, categories, locations, role limits, plans, Field Associates, and blog content.
- Configure SMTP and Razorpay settings in the admin interface and send a test email.
- Read public blogs and company/legal pages, contact TradeCall, or open the WhatsApp contact link.

## Technology

| Area    | Tools                                               |
| ------- | --------------------------------------------------- |
| UI      | React 18, TypeScript, Vite 6                        |
| HTTP    | Axios; cookie credentials and CSRF header handling  |
| Styling | Project CSS in `src/css/`                           |
| Routing | History API and route helpers in `src/utils/url.ts` |

## Requirements

- Node.js and npm (a current Node.js LTS release is recommended)
- A running TradeCall backend (see the [backend README](../brokerage-app-backend/README.md))

## Run Locally

From this directory:

```bash
npm install
```

Create a local `.env` file and set the backend URL:

```dotenv
VITE_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Configure the backend's `ALLOWED_ORIGINS` to include `http://localhost:5173`; the API client sends requests directly to `VITE_API_URL` and uses credentialed cookies.

## Configuration

| Variable        | Purpose                                     | Default                 |
| --------------- | ------------------------------------------- | ----------------------- |
| `VITE_API_URL`  | Base URL for API calls and uploaded media   | `http://localhost:8000` |
| `VITE_APP_NAME` | Application name for frontend configuration | `TradeCall India`       |

Vite environment variables are embedded into the client bundle at build time. Do not put secrets in `VITE_*` variables. For production, set `VITE_API_URL` to the reachable HTTPS API origin and configure backend CORS and cookie settings for the deployed site.

## Routes

| Path                             | View                                |
| -------------------------------- | ----------------------------------- |
| `/home`                          | Property search and listings        |
| `/listing/:id`                   | Listing details                     |
| `/post-listing`                  | Listing submission                  |
| `/login`, `/register`            | Sign in and registration            |
| `/account`                       | Customer account                    |
| `/admin-login`, `/admin`         | Admin sign-in and dashboard         |
| `/advertise`                     | Plans and pricing                   |
| `/blog`, `/blog/:slug`           | Blog feed and article               |
| `/about`, `/contact`, `/privacy` | Company, contact, and privacy pages |
| `/Terms-of-use-tradecall-India`  | Terms of use                        |

## Validation

```bash
npm run typecheck
npm run build
```

The build script type-checks the application and creates the optimized static bundle in `dist/`. There is currently no frontend test or lint script in `package.json`.

## Production

Build with `npm run build` and deploy the `dist/` directory to a static host. The included Vercel rewrite sends application paths to `index.html`, which is required for direct visits to client-side routes. Set `VITE_API_URL` at build time and ensure the backend allows the deployed origin.

## Related Project

- [TradeCall Backend API](../brokerage-app-backend/README.md)
