# Ayurvedic Invoice & Quote Maker

**→ [Open the live app](https://ak-apoorvkulkarni.github.io/Invoice_Maker_Order_Managment/)** (use this link on your phone or browser — the repo URL above is for code only.)

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

Do these steps **in order** so the site stops showing 404:

0. **Allow Actions to push** (needed for deployment):
   - **Settings** → **Actions** → **General**.
   - Under "Workflow permissions", choose **Read and write permissions**. Save.

1. **Create the `gh-pages` branch** (once):
   - **Actions** tab → click **Create gh-pages branch (run once)** in the left sidebar.
   - Click **Run workflow** → **Run workflow**. Wait until it finishes (green ✓).

2. **Turn on GitHub Pages**:
   - **Settings** → **Pages**.
   - **Build and deployment** → **Source**: **Deploy from a branch**.
   - **Branch**: `gh-pages`, **Folder**: `/ (root)`. Save.

3. **Deploy the app**:
   - **Actions** tab → **Deploy to gh-pages branch** → **Run workflow** → **Run workflow**. Wait until it finishes (green ✓).

4. After 1–2 minutes, open the app at:

   **https://ak-apoorvkulkarni.github.io/Invoice_Maker_Order_Managment/**

Use that link on your phone or desktop. Each push to `main` will redeploy automatically.

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
