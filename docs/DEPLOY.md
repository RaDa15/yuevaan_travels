# Deploying Yuevaan Bhutan Travels

Yuevaan Bhutan Travels runs as a full-stack **Node.js + Next.js 16 SSR** server (`server.js`) with live booking/inquiry APIs (`/api/inquiries`), the 4-role staff console (`/admin`, `/owner`, `/manager`, `/reservation`, `/finance`), and PostgreSQL persistence (`lib/db/postgres-store.js`).

Because it requires a Node.js runtime and database, deploy it on a Node.js host such as **Render** or **Railway** rather than GitHub Pages.

---

## Option A — 1-Click Deploy on Render (Includes PostgreSQL)

This repository includes a ready-to-use `render.yaml` Blueprint that provisions both the Node.js web service and a managed PostgreSQL database automatically:

1. Open Render Blueprint deploy:
   - Go to **https://render.com/deploy?repo=https://github.com/RaDa15/yuevaan_travels** (or in Render Dashboard click **New -> Blueprint** and select `RaDa15/yuevaan_travels`).
2. Render reads `render.yaml` and asks for your environment values:
   - **`ADMIN_PASSWORD`** *(required)*: Choose a strong initial Owner login password.
   - **`ADMIN_NOTIFICATION_EMAIL`** *(recommended)*: Email address that receives booking alerts (also becomes the initial Owner login email).
   - **`RESEND_API_KEY`** *(optional)*: Paste your Resend API key for automatic guest & admin emails (or configure `SMTP_*` variables instead).
   - **`NEXT_PUBLIC_SITE_URL`** *(optional)*: Set to your Render URL (e.g. `https://yuevaan-bhutan-travels.onrender.com`) or custom domain.
   - **`NEXT_PUBLIC_FILM_URL`** *(optional)*: Direct HTTPS `.mp4` URL if you host the 4K hero/map films on Cloudflare R2, S3, or CDN (otherwise the built-in bundled loops play automatically).
3. Click **Apply**. Render automatically:
   - Creates `yuevaan-travels-db` (PostgreSQL) and binds `DATABASE_URL`
   - Generates a random 256-bit `ADMIN_SESSION_SECRET`
   - Sets `TRUST_PROXY=1` for reverse-proxy IP rate limiting and `Secure` cookies
   - Builds with `npm ci && npm run build` and starts with `npm start`
   - Verifies health at `/api/public/settings`

Once live, your site and staff portals are available on your HTTPS domain:
- Public site: `https://<your-domain>/`
- Staff portals: `/admin`, `/owner`, `/manager`, `/reservation`, `/finance`

---

## Option B — Deploy on Railway

This repository includes `railway.json` for zero-config Nixpacks builds:

1. Go to **https://railway.app/new** -> **Deploy from GitHub repo** -> select `RaDa15/yuevaan_travels`.
2. In your Railway project, click **+ New -> Database -> Add PostgreSQL**.
3. On the web service **Variables** tab, add:
   - `DATABASE_URL` -> reference `${{Postgres.DATABASE_URL}}`
   - `TRUST_PROXY=1`
   - `ADMIN_PASSWORD=<strong-password>`
   - `ADMIN_SESSION_SECRET=<random-32+-char-hex>`
   - `ADMIN_NOTIFICATION_EMAIL=<your-email>`
   - Optional: `RESEND_API_KEY` (or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) and `NEXT_PUBLIC_FILM_URL`
   - Leave `ADMIN_PORT` unset so both public routes and staff portals share Railway's HTTPS port.
4. Click **Settings -> Networking -> Generate Domain** to get your live HTTPS URL.

---

## Clean Up GitHub Pages (Optional)

To stop GitHub from showing an empty Pages 404 URL on your repository:
1. Open `https://github.com/RaDa15/yuevaan_travels/settings/pages`
2. Under **Build and deployment**, set **Source** to **None** (or click **Unpublish site** if shown).
