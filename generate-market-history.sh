#!/bin/bash

# GalacticStocks Market History Generator
# Resets the market and generates historical timesteps

API_URL="https://galaxystockbackend-production.up.railway.app/api"
ADMIN_PASSWORD="galacticstocks123"
NUM_TIMESTEPS=30

echo "================================================"
echo "  GalacticStocks Market History Generator"
echo "================================================"
echo ""

echo "Step 1: Resetting market to timestep 0..."
echo "WARNING: This will delete all prices, transactions, and portfolios!"
echo ""

RESET_RESPONSE=$(curl -s -X POST "$API_URL/admin/reset-market" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: $ADMIN_PASSWORD")

echo "$RESET_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESET_RESPONSE"
echo ""

echo "Step 2: Generating $NUM_TIMESTEPS timesteps of market history..."
echo ""

for i in $(seq 1 $NUM_TIMESTEPS); do
  printf "Generating timestep %2d/%d... " "$i" "$NUM_TIMESTEPS"

  RESPONSE=$(curl -s -X POST "$API_URL/admin/timestep/generate" \
    -H "Content-Type: application/json" \
    -H "X-Admin-Password: $ADMIN_PASSWORD" \
    -d '{"overrides": {}}')

  # Check if successful
  if echo "$RESPONSE" | grep -q "\"message\""; then
    echo "✓"
  else
    echo "✗"
    echo "Error: $RESPONSE"
  fi

  sleep 0.5
done

echo ""
echo "================================================"
echo "  Done! Market now has $NUM_TIMESTEPS timesteps"
echo "================================================"
echo ""
echo "Your players will now see charts with historical data!"
