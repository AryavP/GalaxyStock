"""
Admin routes for GalacticStocks.
Simple password-based admin panel for managing companies, timesteps, and viewing player stats.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional
import json
import os
from datetime import datetime

from models import StockPrice

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Simple password auth - no JWT, no bcrypt for D&D campaign simplicity
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "galacticstocks123")

# These will be injected from main.py during startup
db_instance = None
market_instance = None

def get_db():
    """Get database instance."""
    if db_instance is None:
        raise RuntimeError("Database not initialized")
    return db_instance

def get_market():
    """Get market instance."""
    if market_instance is None:
        raise RuntimeError("Market not initialized")
    return market_instance

def verify_admin(x_admin_password: str = Header(None)):
    """Verify admin password from header.

    Args:
        x_admin_password: Password from X-Admin-Password header

    Returns:
        True if authenticated

    Raises:
        HTTPException: If password is invalid
    """
    if x_admin_password != ADMIN_PASSWORD:
        logger.warning(f"Failed admin authentication attempt")
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return True

# Pydantic models for requests
class PasswordRequest(BaseModel):
    """Request to verify password."""
    password: str

class CreateCompanyRequest(BaseModel):
    """Request to create a new company."""
    symbol: str
    name: str
    initial_price: float
    trend: float
    volatility: float
    description: str = ""

class UpdateCompanyRequest(BaseModel):
    """Request to update a company."""
    trend: Optional[float] = None
    volatility: Optional[float] = None
    description: Optional[str] = None

class TimestepOverrides(BaseModel):
    """Request to generate timestep with price overrides."""
    overrides: dict[str, float] = {}

# Companies JSON file path
COMPANIES_FILE = os.path.join(os.path.dirname(__file__), "companies.json")

def load_companies() -> List[dict]:
    """Load companies from JSON file.

    Returns:
        List of company dictionaries
    """
    if not os.path.exists(COMPANIES_FILE):
        logger.warning(f"Companies file not found: {COMPANIES_FILE}")
        return []

    try:
        with open(COMPANIES_FILE, 'r') as f:
            companies = json.load(f)
            logger.debug(f"Loaded {len(companies)} companies from JSON")
            return companies
    except Exception as e:
        logger.error(f"Error loading companies: {e}")
        return []

def save_companies(companies: List[dict]):
    """Save companies to JSON file.

    Args:
        companies: List of company dictionaries
    """
    try:
        with open(COMPANIES_FILE, 'w') as f:
            json.dump(companies, f, indent=2)
        logger.info(f"Saved {len(companies)} companies to JSON")
    except Exception as e:
        logger.error(f"Error saving companies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save companies: {e}")


# Auth endpoint
@router.post("/verify")
async def verify_password(request: PasswordRequest):
    """Verify admin password.

    Args:
        request: Password verification request

    Returns:
        Authentication status
    """
    authenticated = request.password == ADMIN_PASSWORD
    logger.info(f"Admin password verification: {'success' if authenticated else 'failed'}")
    return {"authenticated": authenticated}


# Company CRUD endpoints
@router.get("/companies")
async def get_companies(_: bool = Depends(verify_admin)):
    """Get all companies from JSON file.

    Returns:
        List of companies
    """
    logger.info("Admin: Fetching all companies")
    return load_companies()


@router.post("/companies")
async def create_company(
    request: CreateCompanyRequest,
    _: bool = Depends(verify_admin)
):
    """Create a new company.

    Args:
        request: Company creation request

    Returns:
        Success message with symbol
    """
    companies = load_companies()

    # Check for duplicate symbol
    symbol_upper = request.symbol.upper()
    if any(c["symbol"] == symbol_upper for c in companies):
        logger.warning(f"Admin: Attempt to create duplicate company: {symbol_upper}")
        raise HTTPException(status_code=400, detail=f"Symbol {symbol_upper} already exists")

    # Validate parameters
    if request.initial_price <= 0:
        raise HTTPException(status_code=400, detail="Initial price must be positive")
    if request.volatility <= 0:
        raise HTTPException(status_code=400, detail="Volatility must be positive")

    # Create new company
    new_company = {
        "symbol": symbol_upper,
        "name": request.name,
        "initial_price": request.initial_price,
        "trend": request.trend,
        "volatility": request.volatility,
        "description": request.description
    }

    companies.append(new_company)
    save_companies(companies)

    logger.info(f"Admin: Created company {symbol_upper}: {request.name}")

    return {
        "message": "Company created successfully",
        "symbol": symbol_upper
    }


@router.patch("/companies/{symbol}")
async def update_company(
    symbol: str,
    request: UpdateCompanyRequest,
    _: bool = Depends(verify_admin)
):
    """Update an existing company.

    Args:
        symbol: Stock symbol to update
        request: Update request with optional fields

    Returns:
        Success message
    """
    companies = load_companies()
    symbol_upper = symbol.upper()

    # Find company
    company = next((c for c in companies if c["symbol"] == symbol_upper), None)
    if not company:
        logger.warning(f"Admin: Attempt to update non-existent company: {symbol_upper}")
        raise HTTPException(status_code=404, detail=f"Company {symbol_upper} not found")

    # Update fields
    updated_fields = []
    if request.trend is not None:
        company["trend"] = request.trend
        updated_fields.append("trend")
    if request.volatility is not None:
        if request.volatility <= 0:
            raise HTTPException(status_code=400, detail="Volatility must be positive")
        company["volatility"] = request.volatility
        updated_fields.append("volatility")
    if request.description is not None:
        company["description"] = request.description
        updated_fields.append("description")

    save_companies(companies)

    logger.info(f"Admin: Updated company {symbol_upper}: {', '.join(updated_fields)}")

    return {
        "message": f"Company {symbol_upper} updated successfully",
        "updated_fields": updated_fields
    }


@router.delete("/companies/{symbol}")
async def delete_company(
    symbol: str,
    _: bool = Depends(verify_admin)
):
    """Delete a company.

    Args:
        symbol: Stock symbol to delete

    Returns:
        Success message
    """
    companies = load_companies()
    symbol_upper = symbol.upper()

    # Filter out the company
    original_count = len(companies)
    companies = [c for c in companies if c["symbol"] != symbol_upper]

    if len(companies) == original_count:
        logger.warning(f"Admin: Attempt to delete non-existent company: {symbol_upper}")
        raise HTTPException(status_code=404, detail=f"Company {symbol_upper} not found")

    save_companies(companies)

    logger.info(f"Admin: Deleted company {symbol_upper}")

    return {
        "message": f"Company {symbol_upper} deleted successfully"
    }


# Timestep control endpoints
@router.get("/timestep/preview")
async def preview_timestep(_: bool = Depends(verify_admin)):
    """Preview what the next timestep prices would be.

    Returns:
        Price previews for all companies
    """
    logger.info("Admin: Generating timestep preview")

    companies = load_companies()
    db = get_db()
    market = get_market()

    previews = []
    for company in companies:
        # Get current price
        current_price_obj = db.get_latest_price(company["symbol"])
        current_price = current_price_obj.price if current_price_obj else company["initial_price"]

        # Calculate next price using market simulator
        calculated_price = market.calculate_next_price(
            company["symbol"],
            company["trend"],
            company["volatility"],
            current_price
        )

        # Calculate change percentage
        change_pct = ((calculated_price - current_price) / current_price) * 100

        previews.append({
            "symbol": company["symbol"],
            "name": company["name"],
            "current_price": current_price,
            "calculated_price": calculated_price,
            "change_pct": change_pct
        })

    logger.debug(f"Admin: Generated {len(previews)} price previews")

    return {"previews": previews}


@router.post("/timestep/generate")
async def generate_timestep(
    request: TimestepOverrides,
    _: bool = Depends(verify_admin)
):
    """Generate a new timestep with optional price overrides.

    Args:
        request: Timestep generation request with optional overrides

    Returns:
        New timestep information
    """
    logger.info(f"Admin: Generating new timestep with {len(request.overrides)} overrides")

    companies = load_companies()
    db = get_db()
    market = get_market()

    # Get current market state
    market_state = db.get_market_state()
    next_timestep = market_state.current_timestep + 1

    logger.info(f"Admin: Creating timestep {next_timestep}")

    # Generate prices for each company
    for company in companies:
        symbol = company["symbol"]

        # Get current price
        current_price_obj = db.get_latest_price(symbol)
        current_price = current_price_obj.price if current_price_obj else company["initial_price"]

        # Check for override, otherwise calculate
        if symbol in request.overrides:
            next_price = request.overrides[symbol]
            is_override = True
            logger.info(f"Admin: Using override price for {symbol}: ¢{next_price:.2f}")
        else:
            next_price = market.calculate_next_price(
                symbol,
                company["trend"],
                company["volatility"],
                current_price
            )
            is_override = False

        # Save the new price
        db.save_stock_price(StockPrice(
            symbol=symbol,
            timestep=next_timestep,
            price=next_price,
            timestamp=datetime.now(),
            is_override=is_override
        ))

        logger.debug(f"Admin: Set {symbol} price at timestep {next_timestep}: ¢{next_price:.2f}")

    # Update market state
    market_state.current_timestep = next_timestep
    market_state.last_updated = datetime.now()
    db.update_market_state(market_state)

    logger.info(f"Admin: Successfully generated timestep {next_timestep}")

    return {
        "message": "Timestep generated successfully",
        "timestep": next_timestep,
        "companies_updated": len(companies),
        "overrides_applied": len(request.overrides)
    }


# Player stats endpoint
@router.get("/players")
async def get_player_stats(_: bool = Depends(verify_admin)):
    """Get statistics for all players.

    Returns:
        Player leaderboard with portfolio data
    """
    logger.info("Admin: Fetching player statistics")

    db = get_db()

    # Get all unique character names
    with db.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT character_name FROM portfolios WHERE quantity > 0")
        characters = [row['character_name'] for row in cursor.fetchall()]

    logger.debug(f"Admin: Found {len(characters)} characters with holdings")

    # Build player stats
    players = []
    for character in characters:
        portfolio = db.get_portfolio(character)

        # Get current prices for holdings
        current_prices = {}
        for holding in portfolio.holdings:
            price_obj = db.get_latest_price(holding.symbol)
            if price_obj:
                current_prices[holding.symbol] = price_obj.price

        # Build holdings data
        holdings_data = []
        for holding in portfolio.holdings:
            current_price = current_prices.get(holding.symbol, holding.avg_purchase_price)
            current_value = holding.calculate_current_value(current_price)
            profit_loss = holding.calculate_profit_loss(current_price)

            holdings_data.append({
                "symbol": holding.symbol,
                "quantity": holding.quantity,
                "avg_price": holding.avg_purchase_price,
                "current_value": current_value,
                "cost_basis": holding.total_cost_basis,
                "profit_loss": profit_loss
            })

        players.append({
            "character_name": character,
            "total_value": portfolio.total_value,
            "cost_basis": portfolio.total_cost_basis,
            "profit_loss": portfolio.total_profit_loss,
            "profit_loss_pct": portfolio.profit_loss_percentage,
            "holdings": holdings_data
        })

    # Sort by profit/loss descending
    players.sort(key=lambda p: p["profit_loss"], reverse=True)

    logger.info(f"Admin: Returning stats for {len(players)} players")

    return {"players": players}


# Market reset endpoint
@router.post("/reset-market")
async def reset_market(_: bool = Depends(verify_admin)):
    """Reset the market to timestep 0 with initial prices.

    WARNING: This deletes ALL market data including:
    - All stock prices
    - All transactions
    - All portfolio holdings

    Returns:
        Success message with reset details
    """
    logger.warning("Admin: Resetting market - THIS WILL DELETE ALL DATA")

    db = get_db()
    market = get_market()

    # Delete all data
    with db.get_connection() as conn:
        cursor = conn.cursor()

        # Delete all stock prices
        cursor.execute("DELETE FROM stock_prices")
        deleted_prices = cursor.rowcount

        # Delete all transactions
        cursor.execute("DELETE FROM transactions")
        deleted_transactions = cursor.rowcount

        # Delete all portfolio holdings
        cursor.execute("DELETE FROM portfolios")
        deleted_holdings = cursor.rowcount

        # Reset market state to timestep 0
        cursor.execute(
            "UPDATE market_state SET current_timestep = 0, last_updated = ?",
            (datetime.now(),)
        )

        conn.commit()

    logger.info(
        f"Admin: Deleted {deleted_prices} prices, {deleted_transactions} transactions, "
        f"{deleted_holdings} holdings"
    )

    # Reinitialize market with starting prices
    market.initialize_market()

    logger.info("Admin: Market reset complete")

    return {
        "message": "Market reset successfully",
        "timestep": 0,
        "companies_initialized": len(market.companies),
        "deleted": {
            "prices": deleted_prices,
            "transactions": deleted_transactions,
            "holdings": deleted_holdings
        }
    }
