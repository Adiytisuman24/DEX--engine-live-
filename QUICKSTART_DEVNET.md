# 🚀 Quick Start: Running on Solana Devnet

## Current Status
✅ Your system is running in **MOCK MODE** (safe, no real blockchain interaction)

To switch to **DEVNET MODE** (real Solana devnet blockchain), follow these steps:

---

## Option 1: Quick Setup (Manual - 5 minutes)

### Step 1: Install Solana CLI
```powershell
# Download the installer
Invoke-WebRequest -Uri "https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "solana-install.exe"

# Run installer
.\solana-install.exe

# Close and reopen terminal, then verify
solana --version
```

### Step 2: Create Devnet Wallet
```powershell
# Generate new wallet
solana-keygen new --outfile devnet-wallet.json --no-bip39-passphrase

# Configure for devnet
solana config set --url devnet
solana config set --keypair devnet-wallet.json

# Get your wallet address
solana address
```

### Step 3: Get Test SOL
```powershell
# Request 2 SOL (free testnet tokens)
solana airdrop 2

# Check balance
solana balance
# Should show: 2 SOL
```

### Step 4: Extract Private Key
```powershell
# First, install the required package
npm install bs58

# Then run this command to get your base58 private key
node -e "const fs=require('fs');const bs58=require('bs58');console.log(bs58.encode(Uint8Array.from(JSON.parse(fs.readFileSync('./devnet-wallet.json')))))"
```

Copy the output - this is your private key.

### Step 5: Update Environment
Edit your `.env` file:
```env
EXECUTION_MODE=devnet
WALLET_PRIVATE_KEY=<paste_your_key_here>
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Step 6: Restart Server
```powershell
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

You should see:
```
[ROUTER] Initialized in DEVNET mode with wallet: <your_address>
```

---

## Option 2: Even Faster (Using Script)

### For Windows:
```powershell
# Run the setup script
.\setup-devnet.ps1
```

### For Mac/Linux:
```bash
# Make executable
chmod +x setup-devnet.sh

# Run setup
./setup-devnet.sh
```

Then follow the on-screen instructions to complete `.env` configuration.

---

## ✅ Verification Checklist

After setup, verify everything works:

1. **Check wallet balance**:
   ```powershell
   solana balance
   # Should show: ~2 SOL
   ```

2. **Check server logs**:
   ```
   npm run dev
   # Look for: [ROUTER] Initialized in DEVNET mode
   ```

3. **Execute a test trade**:
   - Open UI: http://localhost:5173
   - Create a small trade (0.01 SOL → USDC)
   - Watch the timeline execute
   - Check the transaction hash in logs

4. **Verify on Solana Explorer**:
   - Copy the transaction hash from logs
   - Visit: https://explorer.solana.com/tx/<hash>?cluster=devnet
   - You should see your real transaction!

---

## 🐛 Troubleshooting

### "solana: command not found"
- Solana CLI not installed
- Restart terminal after installation
- Check PATH: `echo $env:PATH` (Windows) or `echo $PATH` (Mac/Linux)

### "Insufficient SOL balance"
```powershell
# Request more
solana airdrop 2
```

### "Transaction failed"
- Devnet might be congested (check https://status.solana.com)
- Try again in a few minutes
- Reduce trade amount

### "Server still in MOCK mode"
- Check `.env` file exists in project root
- Verify `EXECUTION_MODE=devnet` (no quotes)
- Restart server completely

---

## 📊 Mock vs Devnet Comparison

| Feature | Mock Mode | Devnet Mode |
|---------|-----------|-------------|
| **Setup Time** | None | 5 minutes |
| **Cost** | Free | Free (testnet) |
| **Speed** | 6-8 seconds | 8-15 seconds |
| **Blockchain** | None | Real Solana devnet |
| **Transaction Hash** | Generated | Real tx hash |
| **Explorer** | N/A | Viewable on Solana Explorer |
| **Risk** | Zero | Zero (test tokens only) |

---

## 🎯 Recommended Workflow

1. **Development**: Use MOCK mode (faster, no setup)
2. **Testing**: Use DEVNET mode (real blockchain behavior)
3. **Demo**: Keep MOCK mode (reliable, no dependencies)

---

## 🔒 Security Notes

- **Never commit** your private key to git
- The `devnet-wallet.json` file is in `.gitignore`
- `.env` file is also gitignored
- Only use devnet keys (never mainnet)
- Devnet tokens have **zero** real value

---

## 📝 Next Steps

After successful devnet testing:
- Monitor gas usage
- Test different token pairs
- Observe actual DEX routing
- Compare mock vs real execution times

---

Need help? Check the full guide: [DEVNET_SETUP.md](./DEVNET_SETUP.md)
