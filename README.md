# Hoglet Analytics

Static PostHog-style product analytics dashboard served from `docs/index.html`. It uses mock telemetry for event volume, live events, funnels, retention cohorts, saved cohorts, feature flags, and experiment impact. There is no build step; the page is plain HTML, CSS, and JavaScript.

## Run locally

```bash
npm run serve
```

Open `http://127.0.0.1:8080/docs/`.

You can also open `docs/index.html` directly in a browser. The dashboard has no runtime dependency on a CDN or API.

## Browser smoke test

```bash
npm install
npx playwright install firefox
npm test
```

`npm test` runs `PLAYWRIGHT_BROWSER=firefox node test-smoke.mjs`. The script starts a local static server at `http://127.0.0.1:4173/docs/`, checks the dashboard sections, canvas chart, search, navigation, date range, refresh button, and feature flag toggle, then writes `output/playwright/dashboard-smoke.png`.

## Free static hosting

### Netlify Drop

1. Go to `https://app.netlify.com/drop`.
2. Drag the `docs/` folder onto the drop target.
3. Netlify publishes `docs/index.html` as the site root and gives you a public URL.

### GitHub Pages from `/docs`

1. Push this repository to GitHub.
2. Open the repository `Settings -> Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select your branch and set the folder to `/docs`.
5. Save. The site publishes at `https://<user>.github.io/<repo>/`.

### Vercel

1. Import this repository at `https://vercel.com/new`.
2. In project settings, set Framework Preset to `Other`.
3. Leave Build Command empty.
4. Set Output Directory to `docs`.
5. Deploy on the free Hobby plan.
