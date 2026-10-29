# AksharaSetu

Read Old Kannada palm-leaf manuscripts in modern Kannada (Hosa Kannada) and English.

AksharaSetu is a final-year academic project built as a TanStack Start web app. It takes a photograph of a Hale Kannada manuscript leaf, runs OCR and multi-pass image reading, matches the text against a Hale → Hosa Kannada lexicon, and returns the original reading, modern Kannada reconstruction, English translation, glossary, audio, and a downloadable PDF.

## Quick start in VS Code (5 steps)

1. Unzip the project and open the folder in VS Code (**File → Open Folder**).
2. Open a terminal in VS Code (**Terminal → New Terminal**) and run:

   ```sh
   npm install
   ```

3. Add a free Gemini API key to the `.env` file so AI reconstruction and English translation work locally (the `.env` shipped with this project already has the database settings filled in — this is the only line to add):

   ```env
   GEMINI_API_KEY=your-key-here
   ```

   Get a free key at <https://aistudio.google.com/apikey>, then save the file.

4. Start the app:

   ```sh
   npm run dev
   ```

5. Open the printed URL (usually <http://localhost:8080>) and upload a manuscript photo on **Translate**.

Everything else works exactly as in Lovable: the database, saved results cache and the 19,975-word lexicon are the same remote services, and `.vscode/` gives you ESLint + Prettier + Tailwind extension suggestions and an F5 debug configuration.

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
| `GEMINI_API_KEY` | Needed only when running **outside Lovable** (VS Code / your own machine): a free Google Gemini API key so AI reconstruction and English translation work. Inside Lovable this is automatic. |
| `GEMINI_MODEL` | Optional. Gemini model used when running locally (default `gemini-2.5-flash`). |
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
- **Translation shows only OCR text with a note that AI was unavailable** — When running locally, the AI stage needs `GEMINI_API_KEY` in `.env` (free key at <https://aistudio.google.com/apikey>). Add it and restart `npm run dev`. Inside Lovable no key is needed.
- **`Port 8080 is already in use`** — Another program is using port 8080. Start on a different port with `npm run dev -- --port 3000` and open <http://localhost:3000>.
- **OCR returns no Kannada text** — Use a clearer, evenly-lit photograph. The pipeline works best with high-contrast manuscript images.
- **Admin CSV upload fails** — Confirm both `ADMIN_PASSPHRASE` and `SUPABASE_SERVICE_ROLE_KEY` are set, the CSV has at least 10 valid rows, and the Supabase `lexicon_entries` table exists.
