# Chicken Cohort Simulator

Interactive executive demo for weekly broiler, commercial-layer and broiler-breeder cohort planning. The model recalculates flock survival, feed demand, labour, health events, egg output and direct OPEX in the browser. CSV export is included.

## Important model boundary

This is a decision-support prototype. The vaccination and veterinary events are editable placeholders, not prescriptions. They must be validated for the selected genetics, production system, epidemiological situation and jurisdiction by the responsible veterinarian.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Production verification:

```bash
npm run build
```

## GitHub → Cloudflare deployment

This repository builds to a Cloudflare-compatible ESM Worker via Vinext.

1. Create an empty GitHub repository and push this project to its `main` branch.
2. In Cloudflare, open **Workers & Pages**, choose **Create application**, then **Import a repository**.
3. Select the GitHub repository and use Node.js 22.13 or newer.
4. Build command: `npm run build`.
5. Deploy command: `npx wrangler deploy`.
6. The included `wrangler.jsonc` publishes `dist/server/index.js` together with the static client assets from `dist/client`.
7. Add a custom domain in the Cloudflare deployment settings if required.

No database, XML file, API key or backend is required for this demo. Assumptions currently live in `app/page.tsx`; an ERP implementation should move them into governed master-data tables and versioned veterinary/feed programmes.

## Reference basis

- Aviagen Ross 308 technical portal: https://ross-intl.aviagen.com/eu/brands/ross/products/ross-308
- Hy-Line management guide: https://www.hyline.com/varieties/guide
