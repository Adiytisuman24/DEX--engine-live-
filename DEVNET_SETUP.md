# DEX Execution Engine - Devnet Setup Guide

## Current Status: Mock Mode ✓

The system is currently running in **MOCK mode** with simulated execution. To enable **real devnet trading**, follow the steps below.

---

## 🎯 Quick Start (Mock Mode)
The system works out of the box in mock mode:
```bash
npm install
npm run dev
```

---

## 🚀 Enable Devnet Trading

### 1. Install Solana CLI (if not installed)
```bash
# macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Windows (PowerShell)
cmd /c "curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe --output solana-install.exe"
solana-install.exe
```

### 2. Create a Devnet Wallet
```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json

# Set to devnet
solana config set --url devnet

# Airdrop SOL for testing
solana airdrop 2

# Get your wallet address
solana address
```

### 3. Export Private Key
```bash
# Get base58 private key
solana-keygen pubkey ~/.config/solana/devnet-wallet.json --outfile /dev/null | \
  solana-keygen recover prompt:/ --outfile /dev/stdout | base64

# Or use this helper:
cat ~/.config/solana/devnet-wallet.json | python3 -c "import sys, json, base58; print(base58.b58encode(bytes(json.load(sys.stdin))).decode())"
```

### 4. Configure Environment
Create `.env` file:
```env
EXECUTION_MODE=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
WALLET_PRIVATE_KEY=<your_base58_private_key>
```

### 5. Restart Server
```bash
npm run dev
```

You should see:
```
[ROUTER] Initialized in DEVNET mode with wallet: <your_address>
```

---

## 🔍 Verify Trades

### Check Transaction on Solana Explorer
1. Click the transaction hash in the History table
2. Or manually visit: `https://explorer.solana.com/tx/<txHash>?cluster=devnet`

### Check Wallet Balance
```bash
solana balance
```

---

## ⚙️ Configuration Reference

### Environment Variables
| Variable | Values | Description |
|----------|--------|-------------|
| `EXECUTION_MODE` | `mock` \| `devnet` | Execution environment |
| `SOLANA_RPC_URL` | URL | Devnet RPC endpoint |
| `WALLET_PRIVATE_KEY` | Base58 | Your wallet's private key |

### Safety Limits (Recommended)
```env
MAX_TRADE_AMOUNT_SOL=0.1
MAX_SLIPPAGE_BPS=500
```

---

## 🐛 Troubleshooting

### "No WALLET_PRIVATE_KEY provided"
- Ensure `.env` file exists in project root
- Check the private key format (must be base58)

### "Insufficient SOL balance"
```bash
solana airdrop 2
```

### "Transaction failed"
- Check devnet is operational: https://status.solana.com/
- Increase slippage tolerance
- Verify pool liquidity

---

## 📊 Feature Comparison

| Feature | Mock Mode | Devnet Mode |
|---------|-----------|-------------|
| Price Quotes | ✓ CoinGecko | ✓ Real pool data |
| Order Execution | ✓ Simulated | ✓ Real blockchain |
| Transaction Hash | ✓ Generated | ✓ Real tx hash |
| Cost | Free | Gas fees (devnet SOL) |
| Speed | 6-8s | 8-15s |

---

## 🎓 Next Steps

1. **Test with small amounts** (0.01 SOL max)
2. **Monitor gas usage** on devnet
3. **Compare mock vs real execution times**
4. **Implement full Raydium SDK integration** for production

---

## ⚠️ Important Notes

- **Never commit your private key to git**
- **Only use throwaway wallets for devnet**
- **Devnet is unstable** - use for testing only
- **Mock mode is recommended** for development

---

## 📝 Development Roadmap

- [x] Mock execution
- [x] Environment configuration
- [x] Wallet integration
- [ ] Full Raydium SDK swap
- [ ] Full Meteora SDK swap
- [ ] Mainnet support (future)
