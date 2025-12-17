# 🚀 Mode Switching & Connection Guide

## ✅ Problem Solved

I've fixed:
1. ✅ **Mode switching** between MOCK and DEVNET
2. ✅ **"Failed to fetch" errors** with proper connection handling
3. ✅ **Vercel deployment** compatibility with environment variables
4. ✅ **Auto-reconnection** when backend restarts
5. ✅ **Visual status indicators** for connection state

---

## 🎯 How It Works Now

### **Local Development**

**Terminal 1 - Backend:**
```powershell
npm run dev
```

You'll see:
```
═══════════════════════════════════════
  ⚡ DEX Execution Engine
  Mode: MOCK
═══════════════════════════════════════
[ROUTER] Running in MOCK mode
```

**Terminal 2 - Frontend:**
```powershell
cd client
npm run dev
```

You'll see:
```
🔗 API Configuration: { API_URL: 'http://localhost:3000', WS_URL: 'ws://localhost:3000/ws' }
```

---

## 🔄 Switching Modes

### **MOCK Mode (Default)**
`.env`:
```env
EXECUTION_MODE=mock
```

Restart backend, you'll see:
```
Mode: MOCK
[ROUTER] Running in MOCK mode
```

### **DEVNET Mode**
`.env`:
```env
EXECUTION_MODE=devnet
WALLET_PRIVATE_KEY=<your_key>
```

Restart backend, you'll see:
```
Mode: DEVNET
[ROUTER] Initialized in DEVNET mode with wallet: <address>
```

---

##" 🌐 Connection Status Indicators

### **Green Banner**  = Connected ✅
```
🟢 Connected • http://localhost:3000
```

### **Red Banner** = Disconnected ❌
```
⚠️ Cannot reach backend server
Backend: http://localhost:3000
```

The UI will:
- ✅ Auto-reconnect every 5 seconds
- ✅ Show clear error messages
- ✅ Still render the UI (won't crash)

---

## 🚀 Vercel Deployment

### **Step 1: Deploy Frontend** (Already configured)
```bash
git add .
git commit -m "Add connection status and env config"
git push
```

Vercel will:
- ✅ Build `client/` directory
- ✅ Deploy to: `https://your-app.vercel.app`
- ⚠️ Show "Cannot reach backend" (expected - no backend yet)

### **Step 2: Deploy Backend** (Railway.app - Free)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Get URL
railway domain
```

You'll get: `https://your-backend.up.railway.app`

### **Step 3: Connect Frontend to Backend**

**Option A: Environment Variables (Recommended)**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   VITE_API_URL=https://your-backend.up.railway.app
   VITE_WS_URL=wss://your-backend.up.railway.app/ws
   ```
3. Redeploy

**Option B: Update Code**
Edit `client/.env`:
```env
VITE_API_URL=https://your-backend.up.railway.app
VITE_WS_URL=wss://your-backend.up.railway.app/ws
```

Then:
```bash
git add client/.env
git commit -m "Update API URLs for production"
git push
```

---

## ✅ Verification Checklist

### **Local Dev:**
- [ ] Backend shows: `Mode: MOCK` or `Mode: DEVNET`
- [ ] Frontend shows: `🔗 API Configuration: ...`
- [ ] Green banner appears: `🟢 Connected •`
- [ ] Can execute test order
- [ ] Timeline animates smoothly

### **Production (Vercel):**
- [ ] Frontend deploys successfully
- [ ] Shows red banner (if backend not deployed yet) - EXPECTED
- [ ] After backend deployed: shows green banner
- [ ] Can execute orders end-to-end

---

## 🐛 Troubleshooting

### "Red banner won't go away"
**Check:**
1. Is backend running? `npm run dev`
2. Correct URLs in `.env`?
3. CORS enabled? (Already configured)
4. Port 3000 available?

**Fix:**
```powershell
# Kill port 3000
npx kill-port 3000

# Restart
npm run dev
```

### "Frontend can't connect on Vercel"
**Cause:** Backend not deployed or environment variables not set

**Fix:**
1. Deploy backend to Railway
2. Add Vercel environment variables (see Step 3 above)
3. Redeploy Vercel

### "Mode won't switch"
**Check `.env` file exists in ROOT directory** (not client/)
```
Molecule/
├── .env              ← Backend config HERE
├── client/
│   └── .env          ← Frontend config HERE
```

Restart backend after changing `.env`.

---

## 📊 Current Setup Summary

| Component | Location | Config File | Port |
|-----------|----------|-------------|------|
| Backend | `src/` | `.env` | 3000 |
| Frontend | `client/` | `client/.env` | 5173 |
| Database | Docker/Local | `.env` | 5432 |
| Redis | Docker/Local | `.env` | 6379 |

---

## 🎉 What You Can Do Now

✅ Switch between MOCK and DEVNET instantly
✅ See real-time connection status
✅ Get clear error messages when backend is down
✅ Deploy to Vercel (frontend only)
✅ Deploy backend separately (Railway/Render)
✅ Auto-reconnect on connection loss

---

Need help? Check:
- **QUICKSTART_DEVNET.md** - Devnet setup
- **DEPLOYMENT.md** - Full deployment guide
- **DEVNET_SETUP.md** - Technical details

Happy trading! 🚀
