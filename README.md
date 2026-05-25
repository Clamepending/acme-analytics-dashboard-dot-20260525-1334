# Hoglet Analytics

Compact PostHog-style analytics dashboard served from `docs/index.html`. It uses mock product telemetry for event volume, live events, funnels, retention cohorts, saved cohorts, feature flags, and experiment impact. There is no build step; the app is plain HTML, CSS, and JavaScript.

## Local Run

```bash
npm run serve
```

Open `http://127.0.0.1:8080/docs/`.

You can also open `docs/index.html` directly in a browser. The dashboard has no runtime dependency on a CDN or API.

## Test

```bash
npm install
npx playwright install firefox
npm test
```

`npm test` runs `PLAYWRIGHT_BROWSER=firefox node test-smoke.mjs`. The smoke test starts a local static server on an ephemeral `127.0.0.1` port, checks the dashboard sections, event schema and filter, live stream updates, preset funnels, cohort fields, feature flag cohort access, dark mode, date range, refresh button, canvas charts, and mobile overflow, then writes screenshots to `output/playwright/`.

## Free Static Hosting

### GitHub Pages

1. Push this repository to GitHub.
2. In GitHub, open the repository.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
5. Select the target branch, usually `main`.
6. Set the folder to `/docs`.
7. Click `Save`.
8. After GitHub finishes publishing, open `https://<user-or-org>.github.io/<repo>/`.

### Netlify Drop

1. Go to `https://app.netlify.com/drop`.
2. Sign in or create a free Netlify account if prompted.
3. Drag the local `docs/` folder onto the drop target.
4. Netlify serves `docs/index.html` as the site root and provides a generated public URL.

### Cloudflare Pages

1. Push this repository to GitHub or GitLab.
2. Go to `https://dash.cloudflare.com/` and choose `Workers & Pages`.
3. Click `Create application` -> `Pages` -> `Connect to Git`.
4. Select the repository and click `Begin setup`.
5. Set `Framework preset` to `None`.
6. Leave `Build command` empty.
7. Set `Build output directory` to `docs`.
8. Click `Save and Deploy`.
9. After the free Pages build finishes, open the generated `*.pages.dev` URL.

### Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Go to `https://vercel.com/new`.
3. Import the repository on the free Hobby plan.
4. Set `Framework Preset` to `Other`.
5. Leave `Build Command` empty.
6. Set `Output Directory` to `docs`.
7. Click `Deploy`.
8. After Vercel finishes, open the generated `*.vercel.app` URL.
