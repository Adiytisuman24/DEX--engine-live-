#!/bin/bash
# Quick Devnet Setup Script
# Run this to set up your wallet and environment for devnet testing

echo "🚀 Setting up Solana Devnet Wallet..."

# Check if solana CLI is installed
if ! command -v solana &> /dev/null
then
    echo "❌ Solana CLI not found. Installing..."
    echo "📥 Download from: https://docs.solana.com/cli/install-solana-cli-tools"
    echo ""
    echo "Quick install:"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Generate new keypair
echo "🔑 Generating new devnet wallet..."
solana-keygen new --outfile ./devnet-wallet.json --no-bip39-passphrase

# Set config to devnet
echo "⚙️ Configuring for devnet..."
solana config set --url devnet
solana config set --keypair ./devnet-wallet.json

# Get wallet address
WALLET_ADDRESS=$(solana address)
echo "📍 Wallet Address: $WALLET_ADDRESS"

# Airdrop SOL
echo "💰 Requesting SOL airdrop..."
solana airdrop 2
sleep 2
solana airdrop 2

# Check balance
BALANCE=$(solana balance)
echo "✅ Balance: $BALANCE"

# Extract base58 private key
echo ""
echo "🔐 Extracting private key for .env..."
# This is a simplified version - actual extraction needs proper base58 encoding
echo "Run this command to get your private key:"
echo "cat ./devnet-wallet.json"
echo ""
echo "Then manually copy the array and encode it, or use:"
echo "npm install -g @solana/web3.js bs58"
echo "node -e \"const fs = require('fs'); const bs58 = require('bs58'); const key = Uint8Array.from(JSON.parse(fs.readFileSync('./devnet-wallet.json'))); console.log(bs58.encode(key));\""

echo ""
echo "✅ Setup complete!"
echo "Next steps:"
echo "1. Get your private key (see command above)"
echo "2. Update .env file:"
echo "   EXECUTION_MODE=devnet"
echo "   WALLET_PRIVATE_KEY=<your_base58_key>"
echo "3. Restart server: npm run dev"
