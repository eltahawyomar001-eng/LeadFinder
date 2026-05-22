# LeadFinder.de

A Next.js lead generation tool for finding local German businesses with weak online presence and generating personalized WhatsApp outreach messages.

## What it does

- Searches real businesses across 50+ German cities via **Google Places API**
- Scores each business by "weakness" (no website, few reviews, low rating)
- Sorts results by **priority** (High / Medium / Low)
- Generates a personalized **German-language WhatsApp message** per lead
- Shows phone numbers formatted for one-click WhatsApp contact
- Exports all leads to **CSV** (name, phone, WhatsApp link, address, website, score, message)

## Tech stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Google Places API** (Text Search + Place Details)
- No emojis — all SVG icons

## Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/eltahawyomar001-eng/LeadFinder
cd LeadFinder
npm install
```

2. Copy the environment file and add your Google Places API key:

```bash
cp .env.local.example .env.local
```

Get a free key at [Google Cloud Console](https://console.cloud.google.com/apis/library/places-backend.googleapis.com).
Enable **Places API** — the free tier gives $200/month credit (~11,000 searches, more than enough for daily use).

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to use

1. Select a **business category** (Restaurant, Friseur, Zahnarzt, etc.)
2. Select a **German city** from 50+ options
3. Set the **search radius** (1–50 km)
4. Click **Find Leads**
5. Results appear ranked by priority — click the message icon to view/copy the WhatsApp pitch
6. Click **Export CSV** to download all leads

## Scoring logic

| Signal | Points |
|---|---|
| No website | +5 |
| Fewer than 5 reviews | +3 |
| 5–19 reviews | +2 |
| Rating below 3.5 | +2 |
| Rating 3.5–4.0 | +1 |

Score 6+: High Priority — Score 3–5: Medium — Score 0–2: Low

## Deploy

Deploy instantly to Vercel. Add `GOOGLE_PLACES_API_KEY` as an environment variable in the Vercel dashboard.
