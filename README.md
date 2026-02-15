# Ayurvedic Invoice & Quote Maker

A simple web app for an Ayurvedic practitioner to:

- **Orders**: Add medicine/recipe orders with ingredients (raw material name + price paid), total quantity to make, work hours, and labor rate. Get an automatic **Order ID** and **cost per unit**.
- **Packages**: Define packages (e.g. Basic, Pro, Premium) with a price multiplier on cost.
- **Quote & Invoice**: Pick an order and package, enter quantity for the customer, see the quote price, and **download an invoice PDF** with your letterhead (clinic name, doctor name, address, phone).

Data is stored in the browser (localStorage), so no server or sign-up is required. Deploy once and use it online.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Live deployment (use on mobile)

The repo deploys via **GitHub Actions** to **GitHub Pages**. To go live:

1. On GitHub: repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Each push to `main` builds and deploys. The app will be at:

   **https://ak-apoorvkulkarni.github.io/Invoice_Maker_Order_Managment/**

Open this URL on your phone or any device. Data is in the browser (localStorage); works offline after first load and is mobile-friendly.

## Build for production

```bash
npm run build
```

The `dist` folder can be deployed to:

- **GitHub Pages**: Enable Pages for the repo and set source to “Deploy from branch” → branch `main` (or `gh-pages`), folder `/ (root)` or `dist` if you deploy the contents of `dist` from that branch.
- **Netlify / Vercel**: Connect the repo and set build command `npm run build`, publish directory `dist`.

## Using the app

1. **My Details**: Enter clinic name, doctor name, address, phone, email. This appears on the invoice PDF as your letterhead.
2. **Orders**: For each medicine/recipe add ingredient names and prices paid, total quantity to be made, work hours, and labor rate per hour. Save to get an Order ID and cost per unit.
3. **Packages**: Edit or add packages (Basic, Pro, etc.) and set the multiplier (e.g. 1.5 = 50% margin on cost).
4. **Quote & Invoice**: Select an order, a package, and quantity for the customer. You’ll see the quote; use “Download invoice PDF” to get an invoice with your letterhead.

All data stays in your browser; nothing is sent to any server.
