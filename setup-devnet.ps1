# Quick Devnet Setup Script for Windows
# Run in PowerShell

Write-Host "🚀 Setting up Solana Devnet Wallet..." -ForegroundColor Green

# Check if solana CLI is installed
$solanaExists = Get-Command solana -ErrorAction SilentlyContinue
if (-not $solanaExists) {
    Write-Host "❌ Solana CLI not found." -ForegroundColor Red
    Write-Host "📥 Download installer from: https://github.com/solana-labs/solana/releases" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run:" -ForegroundColor Cyan
    Write-Host 'cmd /c "curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"'
    exit 1
}

# Generate new keypair
Write-Host "🔑 Generating new devnet wallet..." -ForegroundColor Cyan
solana-keygen new --outfile ./devnet-wallet.json --no-bip39-passphrase

# Set config to devnet
Write-Host "⚙️ Configuring for devnet..." -ForegroundColor Cyan
solana config set --url devnet
solana config set --keypair ./devnet-wallet.json

# Get wallet address
$walletAddress = solana address
Write-Host "📍 Wallet Address: $walletAddress" -ForegroundColor Green

# Airdrop SOL
Write-Host "💰 Requesting SOL airdrop..." -ForegroundColor Cyan
solana airdrop 2
Start-Sleep -Seconds 2
solana airdrop 2

# Check balance
$balance = solana balance
Write-Host "✅ Balance: $balance" -ForegroundColor Green

Write-Host ""
Write-Host "🔐 To get your private key for .env:" -ForegroundColor Yellow
Write-Host "Run this command:" -ForegroundColor Cyan
Write-Host 'node -e "const fs=require(`fs`);const bs58=require(`bs58`);console.log(bs58.encode(Uint8Array.from(JSON.parse(fs.readFileSync(`./devnet-wallet.json`)))))"' -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install bs58: npm install bs58" -ForegroundColor White
Write-Host "2. Get your key (see command above)" -ForegroundColor White
Write-Host "3. Update .env:" -ForegroundColor White
Write-Host "   EXECUTION_MODE=devnet" -ForegroundColor White
Write-Host "   WALLET_PRIVATE_KEY=<your_key>" -ForegroundColor White
Write-Host "4. Restart: npm run dev" -ForegroundColor White
