# GalacticStocks - Quick Start Guide

Get your galactic stock market running in minutes!

## Fast Setup (5 Minutes)

### Terminal 1 - Start Backend

```bash
# Make the script executable (first time only)
chmod +x start-backend.sh

# Run the backend
./start-backend.sh
```

The backend will:
1. Create a Python virtual environment
2. Install dependencies
3. Initialize the database with sample companies
4. Start the FastAPI server on http://localhost:8000

### Terminal 2 - Start Frontend

```bash
# Make the script executable (first time only)
chmod +x start-frontend.sh

# Run the frontend
./start-frontend.sh
```

The frontend will:
1. Install npm dependencies
2. Start the Vite dev server on http://localhost:5173

### Access the App

Open your browser to **http://localhost:5173**

## Player Quick Start

1. Enter your character name (e.g., "Thorin Stonebeard")
2. Click "Enter Market"
3. You'll see your portfolio (empty at first)
4. Click "Market" to browse available stocks
5. Click "Buy" on any stock to purchase shares
6. View your holdings and P/L on the Portfolio page
7. Click "Sell" next to any holding to sell shares

## GM Quick Start

### Generate a Timestep (Advance the Market)

```bash
# Make the script executable (first time only)
chmod +x generate-timestep.sh

# Generate a new timestep
./generate-timestep.sh
```

All connected players will see real-time price updates!

### Alternative: Use curl directly

```bash
curl -X POST http://localhost:8000/api/admin/timestep
```

### View Transactions

```bash
# View all transactions
curl http://localhost:8000/api/admin/transactions

# View transactions for a specific character
curl "http://localhost:8000/api/admin/transactions?character_name=Thorin"

# View transactions for a specific stock
curl "http://localhost:8000/api/admin/transactions?symbol=APLO"
```

### Check Market State

```bash
curl http://localhost:8000/api/admin/market-state
```

## Sample Companies (Mock Data)

The app includes these sample galactic companies:

- **APLO** - Apollo ISR (Initial: $100, Trend: 0.001, Volatility: 0.02)
- **ELYP** - Elysium Planetary Acquisitions (Initial: $75, Trend: 0.002, Volatility: 0.025)
- **NOVA** - Nova Mining Consortium (Initial: $50, Trend: -0.001, Volatility: 0.03)
- **ZETA** - Zeta Transport Co. (Initial: $120, Trend: 0.0015, Volatility: 0.015)
- **TITA** - Titan Defense Industries (Initial: $200, Trend: 0.0005, Volatility: 0.01)

## Common Issues

### Backend won't start
```bash
# Make sure you have Python 3.9+
python3 --version

# If issues persist, manually install:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Frontend won't start
```bash
# Make sure you have Node 18+
node --version

# If issues persist, manually install:
cd frontend
npm install
npm run dev
```

### Port already in use
- Backend uses port 8000
- Frontend uses port 5173
- Kill existing processes or change ports in config files

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Configure Google Sheets for custom companies (optional)
- Deploy to a server for remote play
- Customize the UI colors and theme
- Add more companies to your galactic market!

## Support

For issues or questions, check the main README.md or review the backend logs.

Happy trading in the galactic markets!
