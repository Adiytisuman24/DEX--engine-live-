# 🚨 CRITICAL DEPLOYMENT FIXES

Your deployment is failing because of **incorrect configuration on Render and Vercel dashboards**. The code works, but the cloud settings need to be updated.

Follow these steps exactly to fix the "Module Not Found" error and the connectivity issues.

## 1. Fix Render Backend (Module Not Found)

Render is trying to run `node index.js`, but your app is compiled to `dist/index.js`.

1.  Go to your **Render Dashboard**.
2.  Select your **molecule-backend** (or whatever you named it) service.
3.  Click **Settings** (left sidebar).
4.  Scroll down to **Start Command**.
5.  Change it from `node index.js` to:
    ```bash
    npm start
    ```
    *(OR `node dist/index.js`)*
6.  Scroll up and click **Manual Deploy** -> **Deploy latest commit**.

**Wait for it to say "Live".** Copy the URL (e.g., `https://molecule-backend.onrender.com`).

---

## 2. Fix Vercel Frontend (Connection Issue)

Vercel is stuck connecting to `localhost:3000` because it doesn't know about your Render backend.

1.  Go to your **Vercel Dashboard**.
2.  Select your project.
3.  Go to **Settings** -> **Environment Variables**.
4.  Add the following variables (replace URL with your ACTUAL Render URL from Step 1):

    | Key | Value |
    |-----|-------|
    | `VITE_API_URL` | `https://your-render-app.onrender.com` |
    | `VITE_WS_URL` | `wss://your-render-app.onrender.com/ws` |
    *(Note: For WS_URL, replace `https://` with `wss://` and add `/ws` at the end)*

5.  **Re-deploy Vercel**:
    *   Go to **Deployments** tab.
    *   Click the three dots on the latest deployment -> **Redeploy**.
    *   (Or just push a new commit to GitHub).

---

## 3. Verify Fix

1.  Open your Vercel App URL.
2.  Check the green status bar. It should say:
    `• Connected • https://your-render-app.onrender.com`
3.  **Toggle Devnet**: Click "Mock Network" -> Switch to Devnet.
    *   Enter a wallet address (e.g. any random string > 32 chars for now, or a real one).
    *   Click **Verify**. It should work now that the backend is connected!

---

## Why this happened?

1.  **Render Error**: `node index.js` failed because TypeScript compiles to `dist/`. We forced `npm start` to run `node dist/index.js`, but Render's dashboard setting overrides `package.json` sometimes.
2.  **Toggle Not Working**: The toggle requires checking a wallet balance on the backend. Since the frontend couldn't talk to the backend, the toggle appeared broken.
