# 🚀 Vercel & Render Integration Guide

Your project is architected as follows:

- **Frontend**: Deployed on **Vercel** (Static React App)
- **Backend**: Deployed on **Render** (Node.js API + Worker)

To make them work together, you must verify your Render backend URL and configure your Vercel environment variables.

## 1. Get your Render Backend URL

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click on your `molecule-backend` service.
3. Copy the URL from the top left (it looks like `https://molecule-backend-xyz.onrender.com`).

## 2. Configure Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your `molecule` project.
3. Go to **Settings** > **Environment Variables**.
4. Add the following variables:

| Variable Name | Value Example | Note |
|--------------|---------------|------|
| `VITE_API_URL` | `https://molecule-backend-xyz.onrender.com` | No trailing slash |
| `VITE_WS_URL` | `wss://molecule-backend-xyz.onrender.com/ws` | Use `wss://` for secure WebSocket |

> **Important**: Replace `molecule-backend-xyz.onrender.com` with your ACTUAL Render URL.

## 3. Redeploy Configuration

If you have already deployed to Vercel, you need to redeploy for these changes to take effect:

1. Go to the **Deployments** tab in Vercel.
2. Click the three dots (⋮) on the latest deployment.
3. Select **Redeploy**.

## 4. Verification

Once redeployed:

1. Open your Vercel frontend URL.
2. You should see a green "Connected" badge in the UI.
3. The console logs will show: `🔗 API Configuration: { API_URL: '...', WS_URL: '...' }`

---
**Troubleshooting**:

- If you see `⚠️ CRITICAL: Frontend is running in PRODUCTION but VITE_API_URL is set to localhost`, you missed Step 2.
- If WebSocket fails to connect, ensure you used `wss://` and appended `/ws`.
