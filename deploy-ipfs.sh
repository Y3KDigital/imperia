#!/bin/bash

###############################################################################
# K IMPERIA — IPFS Deployment Script
# One-command deployment to IPFS with CID output and gateway links
###############################################################################

set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  K IMPERIA — IPFS Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if IPFS is installed
if ! command -v ipfs &> /dev/null; then
    echo "❌ IPFS CLI not found"
    echo ""
    echo "Install IPFS:"
    echo "  • macOS: brew install ipfs"
    echo "  • Linux: snap install ipfs"
    echo "  • Windows: https://docs.ipfs.tech/install/"
    echo ""
    exit 1
fi

# Check if IPFS daemon is running
if ! ipfs swarm peers &> /dev/null; then
    echo "⚠️  IPFS daemon not running"
    echo ""
    echo "Starting IPFS daemon in background..."
    ipfs daemon &
    DAEMON_PID=$!
    echo "Waiting for daemon to initialize..."
    sleep 5
fi

# Create deployment directory (frontend only)
DEPLOY_DIR="ipfs-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo "📦 Preparing frontend files..."

# Copy frontend files only (no backend)
cp index.html "$DEPLOY_DIR/"
cp styles.css "$DEPLOY_DIR/"
cp k-imperia.js "$DEPLOY_DIR/"

# Admin panel (read-only)
cp admin.html "$DEPLOY_DIR/"
cp admin.css "$DEPLOY_DIR/"
cp admin.js "$DEPLOY_DIR/"

# Stamp Supabase Edge Functions base URL for IPFS deployment
# Expected format: https://<PROJECT_REF>.supabase.co/functions/v1
if [ -n "$SUPABASE_FUNCTIONS_BASE" ]; then
    sed -i.bak "s|__SUPABASE_FUNCTIONS_BASE__|$SUPABASE_FUNCTIONS_BASE|g" "$DEPLOY_DIR/k-imperia.js"
    rm "$DEPLOY_DIR/k-imperia.js.bak" 2>/dev/null || true

    sed -i.bak "s|__SUPABASE_FUNCTIONS_BASE__|$SUPABASE_FUNCTIONS_BASE|g" "$DEPLOY_DIR/admin.js"
    rm "$DEPLOY_DIR/admin.js.bak" 2>/dev/null || true
else
    echo "⚠️  SUPABASE_FUNCTIONS_BASE not set; build will use local /api/* endpoints"
fi

echo "🚀 Deploying to IPFS..."
echo ""

# Add to IPFS
OUTPUT=$(ipfs add -r "$DEPLOY_DIR")

# Extract CID (last line, second column)
CID=$(echo "$OUTPUT" | tail -n 1 | awk '{print $2}')

# Pin for persistence
ipfs pin add "$CID" > /dev/null 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ DEPLOYMENT SUCCESSFUL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 CID: $CID"
echo ""
echo "🌐 Access via gateways:"
echo ""
echo "  https://ipfs.io/ipfs/$CID/index.html"
echo "  https://gateway.pinata.cloud/ipfs/$CID/index.html"
echo "  https://cloudflare-ipfs.com/ipfs/$CID/index.html"
echo ""
echo "🔗 IPFS protocol:"
echo ""
echo "  ipfs://$CID/index.html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "  1. Generate QR code:"
echo "     qrencode -o k-imperia-qr.png 'https://ipfs.io/ipfs/$CID/index.html'"
echo ""
echo "  2. Configure DNSLink (optional):"
echo "     DNS TXT record: _dnslink.genesis.unykorn.io = dnslink=/ipfs/$CID"
echo ""
echo "  3. Pin on pinning service (recommended):"
echo "     • Pinata: https://pinata.cloud"
echo "     • Web3.Storage: https://web3.storage"
echo "     • Infura: https://infura.io/product/ipfs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save CID to file
echo "$CID" > LATEST_IPFS_CID.txt
echo "💾 CID saved to: LATEST_IPFS_CID.txt"
echo ""

# Clean up
rm -rf "$DEPLOY_DIR"

# Stop daemon if we started it
if [ ! -z "$DAEMON_PID" ]; then
    echo "Stopping IPFS daemon..."
    kill $DAEMON_PID 2>/dev/null || true
fi

echo "🎉 K IMPERIA Genesis Gate is live on IPFS"
echo ""
