#!/usr/bin/env bash
# Starts the local Substrate contracts node for PNS development.
#
# Usage:
#   ./scripts/start-node.sh            # uses default binary path
#   NODE_BIN=/path/to/node ./scripts/start-node.sh
#
# Prerequisites:
#   - substrate-contracts-node binary (download from
#     https://github.com/paritytech/substrate-contracts-node/releases)
#   - Default expected location: ~/substrate-contracts-node
#     Override with NODE_BIN env var.

set -e

NODE_BIN="${NODE_BIN:-$HOME/substrate-contracts-node}"

if [ ! -f "$NODE_BIN" ]; then
  echo "Error: substrate-contracts-node not found at $NODE_BIN"
  echo ""
  echo "Download it from:"
  echo "  https://github.com/paritytech/substrate-contracts-node/releases"
  echo ""
  echo "Then either:"
  echo "  mv ~/Downloads/substrate-contracts-node ~/substrate-contracts-node"
  echo "  chmod +x ~/substrate-contracts-node"
  echo ""
  echo "Or set NODE_BIN to the correct path:"
  echo "  NODE_BIN=/path/to/binary ./scripts/start-node.sh"
  exit 1
fi

if lsof -i :9944 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port 9944 is already in use — node may already be running."
  echo "Connect to ws://127.0.0.1:9944"
  exit 0
fi

echo "Starting substrate-contracts-node..."
echo "  RPC/WS: ws://127.0.0.1:9944"
echo "  Press Ctrl+C to stop."
echo ""

chmod +x "$NODE_BIN"
exec "$NODE_BIN" --dev --tmp --rpc-port 9944 --rpc-cors all
