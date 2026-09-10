# AksharaSetu

Read Old Kannada palm-leaf manuscripts in modern Kannada (Hosa Kannada) and English.

AksharaSetu is a final-year academic project built as a TanStack Start web app. It takes a photograph of a Hale Kannada manuscript leaf, runs OCR and multi-pass image reading, matches the text against a Hale → Hosa Kannada lexicon, and returns the original reading, modern Kannada reconstruction, English translation, glossary, audio, and a downloadable PDF.

## What you need installed

- **Node.js** 20 or newer (LTS recommended)
- **npm** or **bun** package manager
  - This repo ships with a `bun.lock` file, so `bun` is preferred and fastest.

## Required environment variables

Create a `.env` file in the project root and add the variables below. Values starting with `VITE_` are bundled for the browser; the others are read only on the server.

```env
# Supabase / Lovable Cloud project credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=your-project-id

# Server-side Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Optional: enables the admin CSV upload page
ADMIN_PASSPHRASE=a-strong-admin-passphrase

# Optional: enables the service-role admin features (CSV reindexing)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL used by the browser client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key used by the browser client. |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID used by the browser client. |
| `SUPABASE_URL` | Same Supabase URL, read server-side. |
| `SUPABASE_PUBLISHABLE_KEY` | Same publishable key, read server-side. |
| `ADMIN_PASSPHRASE` | Passphrase required to open `/admin` and upload a new Hale → Hosa CSV. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used only for the admin CSV reindex path. |

## Run the app locally

1. **Clone the repository**

   ```sh
   git clone <this-repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**

   With bun (recommended because the repo uses `bun.lock`):

   ```sh
   bun install
   ```

   Or with npm:

   ```sh
   npm install
   ```

3. **Add your environment variables**

   Copy the `.env` file from the repo root (or create one from the table above) and fill in your own Supabase credentials.

4. **Start the development server**

   ```sh
   bun dev
   ```

   or

   ```sh
   npm run dev
   ```

5. **Open the app**

   The dev server prints a local URL, usually:

   ```
   http://localhost:8080
   ```

   Open that URL in your browser. You should see the AksharaSetu home page with **Start Translation** and **Learn more** buttons.

## Try a translation

1. Go to **Start Translation** (`/translate`).
2. Upload a photograph of a Kannada palm-leaf manuscript.
3. Wait for the pipeline to finish: OCR, lexicon matching, modern Kannada reconstruction, and English translation.
4. View the result, listen to audio, and download a PDF.

## Admin: upload a custom Hale → Hosa CSV

The admin page lets you replace the bundled lexicon with your own CSV.

1. Set `ADMIN_PASSPHRASE` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
2. Visit `/admin`.
3. Enter the passphrase and select a CSV with the expected columns:
   - `halegannada` — the Old Kannada word
   - `hosakannada_gloss` — the modern Kannada / Hosa Kannada equivalent
4. Click **Upload and reindex**. The app will replace the stored lexicon and rebuild the in-memory matching index.

If the CSV has no header row, the app falls back to the first two columns.

## Available scripts

| Command | What it does |
| --- | --- |
| `bun dev` / `npm run dev` | Starts the local dev server on `localhost:8080`. |
| `bun run build` / `npm run build` | Creates an optimized production build. |
| `bun run build:dev` / `npm run build:dev` | Creates a development-mode build. |
| `bun run preview` / `npm run preview` | Previews the production build locally. |
| `bun run lint` / `npm run lint` | Runs ESLint across the project. |
| `bun run format` / `npm run format` | Formats the project with Prettier. |

## Project structure

- `src/routes/` — TanStack Start routes (`/`, `/translate`, `/history`, `/about`, `/admin`).
- `src/services/` — OCR, preprocessing, lexicon matching, reconstruction, translation pipeline, and caching.
- `src/components/` — React components, including `UploadPanel` and `ResultView`.
- `src/lib/` — Client helpers, history, PDF export, and server functions.
- `src/data/hale-hosa.csv` — Bundled fallback lexicon.

## Built with

- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [React](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Supabase](https://supabase.com) (via Lovable Cloud)
- [Tesseract.js](https://github.com/naptha/tesseract.js) (browser-side OCR)

## Troubleshooting

- **`Missing Supabase environment variable(s)`** — Make sure every variable listed in the table above is set in `.env` and that the dev server was restarted after editing it.
- **OCR returns no Kannada text** — Use a clearer, evenly-lit photograph. The pipeline works best with high-contrast manuscript images.
- **Admin CSV upload fails** — Confirm both `ADMIN_PASSPHRASE` and `SUPABASE_SERVICE_ROLE_KEY` are set, the CSV has at least 10 valid rows, and the Supabase `lexicon_entries` table exists.
