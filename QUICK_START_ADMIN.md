# GalacticStocks Admin Panel - Quick Start Guide

## Access the Admin Panel

1. **Open your browser** and navigate to:
   ```
   http://localhost:5174/admin/login
   ```

2. **Login** with the admin password:
   ```
   galacticstocks123
   ```

3. You'll be redirected to the admin dashboard at:
   ```
   http://localhost:5174/admin
   ```

## Quick Tasks

### Generate a New Timestep (Update All Stock Prices)

1. Click the big yellow **"Generate New Timestep"** button at the top
2. Review the preview modal showing:
   - Current prices for all stocks
   - Calculated next prices
   - Percentage changes (green = increase, red = decrease)
3. **Optional**: Override specific prices by entering values in the "Override Price" column
4. Click **"Confirm Generate"** to create the new timestep
5. Tell players to refresh their browsers to see updated prices

### Add a New Company

1. Scroll to the **"Create New Company"** section
2. Fill in the form:
   - **Symbol**: Short ticker (e.g., STAR, NOVA, TECH)
   - **Company Name**: Full name (e.g., "StarLight Industries")
   - **Initial Price**: Starting stock price in credits (e.g., 75.00)
   - **Trend**: Price drift -0.1 to 0.1 (e.g., 0.02 = slight upward trend)
   - **Volatility**: Price variation 0.1 to 0.5 (e.g., 0.2 = moderate volatility)
   - **Description**: Brief flavor text (optional)
3. Click **"Create Company"**
4. The new company appears in the table and will be included in future timesteps

### Edit a Company

1. Find the company in the **"Companies"** table
2. Click **"Edit"** in the Actions column
3. Modify:
   - **Trend**: Adjust the drift up or down
   - **Volatility**: Make price swings bigger or smaller
   - **Description**: Update flavor text
4. Click **"Save"** to apply changes
5. Changes affect future timestep calculations

### Delete a Company

1. Find the company in the **"Companies"** table
2. Click **"Delete"** in the Actions column
3. Confirm the deletion (cannot be undone!)
4. The company is removed from companies.json

### View Player Rankings

- The **"Player Leaderboard"** at the bottom shows all players ranked by profit/loss
- Columns show:
  - **Rank**: Position (#1 = most profitable)
  - **Character**: Player character name
  - **Portfolio Value**: Current total holdings value
  - **Cost Basis**: Total amount invested
  - **P&L**: Profit/Loss in credits (green = profit, red = loss)
  - **P&L %**: Percentage return on investment

## Tips & Tricks

### Price Override Examples

When generating a timestep, you can override prices to create story events:

- **Good news for a company**: Override price higher than calculated
  - Example: GLXT calculated at ¢95 → Override to ¢110 (company won big contract!)

- **Bad news for a company**: Override price lower than calculated
  - Example: CYBER calculated at ¢52 → Override to ¢35 (scandal revealed!)

- **Market crash**: Override all prices significantly lower

- **Market boom**: Override all prices significantly higher

### Trend Values Guide

- **Strong Bull**: 0.05 to 0.1 (prices tend to rise quickly)
- **Mild Bull**: 0.01 to 0.05 (prices slowly increase)
- **Neutral**: -0.01 to 0.01 (prices drift randomly)
- **Mild Bear**: -0.05 to -0.01 (prices slowly decrease)
- **Strong Bear**: -0.1 to -0.05 (prices tend to fall quickly)

### Volatility Values Guide

- **Very Stable**: 0.05 to 0.1 (small price swings)
- **Stable**: 0.1 to 0.2 (moderate price swings)
- **Volatile**: 0.2 to 0.3 (large price swings)
- **Very Volatile**: 0.3 to 0.5 (extreme price swings)

## Common Workflows

### Campaign Start
1. Create 4-6 companies with varied trends and volatilities
2. Set initial prices around 50-150 credits
3. Generate timestep 1 to initialize the market

### Weekly Session
1. Generate a new timestep before or during the session
2. Review price changes with players
3. Let them react and trade
4. Check player leaderboard to see who's winning

### Story Event Integration
1. Generate timestep preview
2. Override specific companies based on story events:
   - Quest success → boost related company
   - Quest failure → tank related company
   - Random events → adjust as needed
3. Confirm generation
4. Narrate the price changes as in-game news

### End of Campaign
1. Check final player leaderboard
2. Award RP bonuses or rewards to top performers
3. Share final statistics with the party

## Troubleshooting

### Can't Login
- Password is: `galacticstocks123`
- Make sure backend is running on port 8000
- Check browser console for errors

### Changes Not Appearing
- Players need to **refresh their browser** after timestep generation
- Check that backend server didn't crash (look for errors in terminal)

### Company Not Showing Up
- Make sure you clicked "Create Company"
- Check the Companies table on the admin panel
- Verify backend received the request (check terminal logs)

### Frontend Not Loading
- Make sure frontend dev server is running on port 5174
- Check for TypeScript compilation errors
- Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Advanced: API Usage

If you prefer command-line or want to automate:

### Generate Timestep via curl
```bash
curl -X POST http://localhost:8000/admin/timestep/generate \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: galacticstocks123" \
  -d '{"overrides": {}}'
```

### Create Company via curl
```bash
curl -X POST http://localhost:8000/admin/companies \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: galacticstocks123" \
  -d '{
    "symbol": "NOVA",
    "name": "Nova Corporation",
    "initial_price": 80.0,
    "trend": 0.02,
    "volatility": 0.2,
    "description": "Innovative tech company"
  }'
```

### Get Player Stats via curl
```bash
curl http://localhost:8000/admin/players \
  -H "X-Admin-Password: galacticstocks123"
```

## Need Help?

- Check `/Users/aryavpal/Projects/GalacticStocks/ADMIN_PANEL_IMPLEMENTATION.md` for technical details
- Check backend logs in terminal for error messages
- Verify both servers are running:
  - Backend: http://localhost:8000
  - Frontend: http://localhost:5174

## Have Fun!

The admin panel gives you full control over the GalacticStocks market. Use it to:
- Create exciting market drama
- Reward clever player strategies
- Integrate stock market events with your D&D story
- Track player competition and rankings

Remember: In the grim darkness of the far future, there is only capitalism!
