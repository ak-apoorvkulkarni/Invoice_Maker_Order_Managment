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

1. **Run the deploy once** so the `gh-pages` branch is created:
   - Open the repo on GitHub → **Actions** tab.
   - Click **Deploy to gh-pages branch** in the left sidebar.
   - Click **Run workflow** (top right) → **Run workflow**. Wait until the run finishes (green ✓).

2. **Turn on GitHub Pages**:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to **Deploy from a branch**.
   - Set **Branch** to `gh-pages`, **Folder** to `/ (root)`. Save.

3. After 1–2 minutes the app will be live at:

   **https://ak-apoorvkulkarni.github.io/Invoice_Maker_Order_Managment/**

Open this URL on your phone or any device. Each push to `main` will redeploy automatically.

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
