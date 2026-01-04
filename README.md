# GalacticStocks

A D&D campaign stock market simulator featuring fictitious galactic companies. Track your character's portfolio, trade stocks, and watch the market evolve as your Game Master drives the narrative.

## Features

### For Players
- **Real-time Market Updates**: WebSocket-powered live price updates when GM generates new timesteps
- **Portfolio Management**: Track your holdings, profits/losses, and average cost basis
- **Buy & Sell Stocks**: Trade shares with instant transaction processing
- **Price History Charts**: Visualize stock performance over time
- **Dark Sci-Fi UI**: Sleek, space-themed interface perfect for galactic trading

### For Game Masters
- **Google Sheets Integration**: Configure companies and override prices via spreadsheet
- **Timestep Generation**: Manually trigger market movements with stochastic price simulation
- **Transaction Log**: View all player trades for campaign tracking
- **Concurrency Protection**: Lock mechanism prevents simultaneous timestep generation

## Architecture

### Backend (Python + FastAPI)
- **Stock Simulation**: Geometric Brownian motion for realistic price movements
- **Database**: SQLite for persistent storage of prices, portfolios, and transactions
- **REST API**: Endpoints for market data, portfolio queries, and trading
- **WebSocket**: Real-time market update broadcasts
- **Google Sheets**: Optional integration for company parameters and GM overrides

### Frontend (React + TypeScript)
- **Vite**: Fast build tooling and dev server
- **Tailwind CSS**: Utility-first styling with custom space theme
- **Recharts**: Stock price visualization
- **React Router**: Client-side navigation
- **WebSocket Client**: Real-time market connection

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment** (optional):
   - Copy `.env.example` to `.env`
   - Add Google Sheets credentials if using (see Google Sheets Setup below)
   - If not using Google Sheets, the app will use mock data with sample companies

5. **Run the server**:
   ```bash
   python main.py
   ```

   The backend will start on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:5173`

### Google Sheets Setup (Optional)

If you want to use Google Sheets for company configuration:

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Sheets API

2. **Create Service Account**:
   - Go to IAM & Admin > Service Accounts
   - Create a service account
   - Download the JSON credentials file

3. **Create Google Sheet**:
   - Create a new Google Sheet
   - Share it with the service account email (found in credentials JSON)
   - Create two sheets:

   **Companies Sheet**:
   | symbol | name | initial_price | trend | volatility |
   |--------|------|---------------|-------|------------|
   | APLO   | Apollo ISR | 100.0 | 0.001 | 0.02 |
   | ELYP   | Elysium Planetary Acquisitions | 75.0 | 0.002 | 0.025 |

   **Overrides Sheet** (for GM price overrides):
   | symbol | override_price | timestamp |
   |--------|----------------|-----------|
   | APLO   | 150.0          | 2024-01-15T10:00:00 |

4. **Configure Backend**:
   - Set `GOOGLE_CREDENTIALS_PATH` to your credentials JSON path
   - Set `GOOGLE_SPREADSHEET_ID` to your spreadsheet ID (from URL)

## Usage

### Player Workflow

1. **Login**: Enter your character name (no authentication required)
2. **View Portfolio**: See your current holdings and profit/loss
3. **Browse Market**: View all available stocks and price charts
4. **Buy Stock**: Select a company, enter quantity, confirm purchase
5. **Sell Stock**: Select a holding, enter quantity, confirm sale
6. **Watch Updates**: Prices update in real-time when GM generates new timesteps

### GM Workflow

1. **Generate Timestep**: POST to `/api/admin/timestep` or use a simple script
   ```bash
   curl -X POST http://localhost:8000/api/admin/timestep
   ```

2. **Override Prices**: Update the Overrides sheet in Google Sheets, then generate a timestep

3. **View Transactions**: GET `/api/admin/transactions` to see all trades
   ```bash
   curl http://localhost:8000/api/admin/transactions
   ```

4. **Monitor State**: GET `/api/admin/market-state` for current timestep info

### Example GM Script

Create `generate_timestep.sh`:
```bash
#!/bin/bash
curl -X POST http://localhost:8000/api/admin/timestep
```

Run it whenever you want to advance the market.

## API Endpoints

### Public Endpoints
- `GET /api/market` - Get current market data
- `GET /api/market/:symbol/history` - Get price history for a stock
- `GET /api/portfolio/:character` - Get portfolio for a character
- `POST /api/transaction/buy` - Buy stock
- `POST /api/transaction/sell` - Sell stock

### Admin Endpoints (GM Only)
- `POST /api/admin/timestep` - Generate new market timestep
- `GET /api/admin/transactions` - Get transaction history
- `GET /api/admin/market-state` - Get current market state

### WebSocket
- `WS /ws` - Real-time market updates

## Development

### Backend Development
```bash
cd backend
source venv/bin/activate
python main.py  # Auto-reloads on file changes
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot module replacement enabled
```

### Building for Production

**Frontend**:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## Project Structure

```
GalacticStocks/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── stock_simulator.py      # Price generation engine
│   ├── database.py             # SQLite interface
│   ├── google_sheets.py        # Google Sheets client
│   ├── models.py               # Data models
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment template
│   └── galactic_market.db      # SQLite database (created on first run)
├── frontend/
│   ├── src/
│   │   ├── api/                # API client and WebSocket
│   │   ├── components/         # React components
│   │   ├── pages/              # Page components
│   │   ├── contexts/           # React context
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
├── .gitignore
└── README.md
```

## Technical Details

### Stock Price Simulation

Prices are generated using geometric Brownian motion:

```
S(t+1) = S(t) * exp((μ - 0.5σ²)dt + σ√dt * Z)
```

Where:
- `S(t)` = current price
- `μ` = trend (drift parameter)
- `σ` = volatility
- `dt` = time step (1.0)
- `Z` = standard normal random variable

### Portfolio Calculations

- **Average Cost Basis**: Weighted average of all purchase prices
- **Unrealized P/L**: (Current Price - Avg Purchase Price) × Quantity
- **Realized P/L**: Calculated on sale using avg purchase price

### Concurrency

The backend uses a database lock to prevent concurrent timestep generation:
- Lock acquired before generation starts
- Released after completion (even if error occurs)
- Returns 409 error if generation already in progress

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.9+)
- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend won't start
- Check Node version: `node --version` (need 18+)
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### WebSocket not connecting
- Ensure backend is running on port 8000
- Check browser console for connection errors
- Verify proxy configuration in `vite.config.ts`

### Google Sheets not working
- Check credentials file path in `.env`
- Verify service account has access to spreadsheet
- Check spreadsheet ID is correct
- Review backend logs for Google API errors

### Database issues
- Delete `galactic_market.db` to reset (WARNING: loses all data)
- Check file permissions
- Ensure SQLite is installed

## Contributing

This is a custom D&D campaign tool. Feel free to fork and adapt for your own campaign!

## License

MIT License - Use freely for your campaigns

## Credits

Built with FastAPI, React, Tailwind CSS, and enthusiasm for galactic capitalism.
