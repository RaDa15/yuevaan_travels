# Yuevaan Bhutan Travels — Agent Guide

Read `docs/PROJECT-SPEC.md`, starting with **Rules — Yuevaan Bhutan Travels React Rebuild** and **Memory — Yuevaan Bhutan Travels React Rebuild**, before modifying code or data.

## Core Commands

- `npm run dev` — Run Next.js dev server on `http://localhost:3000`
- `npm run check:data` — Validate all tours, regions, experiences, reviews, and treks (BR-18) and regenerate `public/tour-catalogue.json`
- `npm run lint` — Run ESLint (`eslint .`)
- `npm test` — Run all unit, acceptance, and server integration tests (`node --test`)
- `npm run build` — Run `check:data` and build the static export into `out/`
- `npm start` — Run the dependency-free production server (`node server.js` on `http://localhost:8080`)

## Source-of-Truth Constraints

- All tour data lives in `data/tours.js`, regions in `data/regions.js`, experiences in `data/experiences.js`, reviews in `data/reviews.js`, trek map metadata in `data/treks.js`, and contact/fee/licence/navigation config in `data/site.js`.
- Keep `.js`/`.jsx` only (no TypeScript), `output: 'export'`, plain `<img>`, CSS tokens from `app/globals.css` (3-colour rule `#FAF8F5` base, `#0F172A` neutral, `#0067B1` accent; no saffron in UI), and dependency-free `server.js`.
