# Acme Analytics

Compact PostHog-style analytics dashboard with mock events, funnels, retention cohorts, saved cohorts, and feature flags.

## Run locally

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/docs/`.

You can also open `docs/index.html` directly in a browser. The chart uses Chart.js from jsDelivr, so the polished chart view expects network access.

## Verify

```bash
npm install
npx playwright install firefox
npm test
```

Or run the smoke script directly after dependencies are installed:

```bash
PLAYWRIGHT_BROWSER=firefox node test-smoke.mjs
```

The smoke test starts a local static server, opens the dashboard in Firefox, checks the major sections and interactions, and writes a screenshot to `output/playwright/dashboard-smoke.png`.

## Free static hosting

### Netlify Drop

1. Open `https://app.netlify.com/drop`.
2. Drag the `docs/` folder into the drop target.
3. Netlify publishes the folder as a static site and shows the public URL.

### GitHub Pages

1. Create a public GitHub repository.
2. Push this working directory to the repository.
3. In GitHub, open `Settings -> Pages`.
4. Set `Source` to `Deploy from a branch`.
5. Select the branch, set the folder to `/docs`, and save.
6. GitHub Pages will publish at `https://<user>.github.io/<repo>/`.

### Vercel

1. Create a new Vercel project from this repository.
2. Set the output/static directory to `docs`.
3. Deploy using the free Hobby plan.
