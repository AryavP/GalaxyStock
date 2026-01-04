"""
FastAPI server for GalacticStocks.
Provides REST API endpoints and WebSocket support for real-time updates.
"""
import logging
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from database import Database
from stock_simulator import StockMarket
from google_sheets import GoogleSheetsClient, MockGoogleSheetsClient
from models import TransactionType, PortfolioHolding, Transaction
from admin_routes import router as admin_router
import admin_routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
db: Optional[Database] = None
market: Optional[StockMarket] = None
websocket_manager: Optional['ConnectionManager'] = None


class ConnectionManager:
    """Manages WebSocket connections for real-time market updates."""

    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: List[WebSocket] = []
        logger.info("WebSocket ConnectionManager initialized")

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection.

        Args:
            websocket: WebSocket connection to register
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection.

        Args:
            websocket: WebSocket connection to remove
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients.

        Args:
            message: Dictionary to send as JSON
        """
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to WebSocket: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

        if disconnected:
            logger.info(f"Cleaned up {len(disconnected)} disconnected WebSocket(s)")


# Pydantic models for API requests/responses

class BuyRequest(BaseModel):
    """Request to buy stock."""
    character_name: str = Field(..., min_length=1, description="Character name")
    symbol: str = Field(..., min_length=1, description="Stock symbol")
    quantity: int = Field(..., gt=0, description="Number of shares to buy")


class SellRequest(BaseModel):
    """Request to sell stock."""
    character_name: str = Field(..., min_length=1, description="Character name")
    symbol: str = Field(..., min_length=1, description="Stock symbol")
    quantity: int = Field(..., gt=0, description="Number of shares to sell")


class TransactionResponse(BaseModel):
    """Response after a transaction."""
    success: bool
    transaction_id: Optional[int] = None
    message: str
    new_holding: Optional[dict] = None


class PortfolioResponse(BaseModel):
    """Portfolio data for a character."""
    character_name: str
    holdings: List[dict]
    total_value: float
    total_cost_basis: float
    total_profit_loss: float
    profit_loss_percentage: float


class MarketResponse(BaseModel):
    """Current market data."""
    timestep: int
    last_updated: str
    prices: dict[str, float]
    companies: dict[str, dict]


class PriceHistoryResponse(BaseModel):
    """Price history for a stock."""
    symbol: str
    history: List[dict]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle.

    Args:
        app: FastAPI application instance
    """
    # Startup
    global db, market, websocket_manager

    logger.info("Starting GalacticStocks server...")

    # Initialize database
    db = Database("galactic_market.db")

    # Initialize Google Sheets client (or mock)
    try:
        sheets_client = GoogleSheetsClient()
        if not sheets_client.is_available():
            logger.warning("Google Sheets not available, using mock client")
            sheets_client = MockGoogleSheetsClient()
    except Exception as e:
        logger.warning(f"Failed to initialize Google Sheets client: {e}, using mock")
        sheets_client = MockGoogleSheetsClient()

    # Initialize market
    market = StockMarket(db, sheets_client)

    # Inject dependencies into admin routes
    admin_routes.db_instance = db
    admin_routes.market_instance = market

    # Initialize market with starting prices if needed
    try:
        market_state = db.get_market_state()
        if market_state.current_timestep == 0:
            existing_prices = db.get_all_latest_prices()
            if not existing_prices:
                logger.info("No existing prices, initializing market...")
                market.initialize_market()
            else:
                logger.info(f"Market already has {len(existing_prices)} prices")
        else:
            logger.info(f"Market already initialized at timestep {market_state.current_timestep}")
            # Load companies to have them available
            market.load_companies()
    except Exception as e:
        logger.error(f"Error during market initialization: {e}")

    # Initialize WebSocket manager
    websocket_manager = ConnectionManager()

    logger.info("GalacticStocks server started successfully")

    yield

    # Shutdown
    logger.info("Shutting down GalacticStocks server...")


# Create FastAPI app
app = FastAPI(
    title="GalacticStocks API",
    description="D&D Campaign Stock Market Simulator",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount admin router
app.include_router(admin_router)


# REST API Endpoints

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "GalacticStocks API",
        "version": "1.0.0",
        "endpoints": {
            "market": "/api/market",
            "portfolio": "/api/portfolio/{character_name}",
            "buy": "/api/transaction/buy",
            "sell": "/api/transaction/sell",
            "admin": "/api/admin/*",
            "websocket": "/ws"
        }
    }


@app.get("/api/market", response_model=MarketResponse)
async def get_market():
    """Get current market state with all stock prices.

    Returns:
        Current market snapshot
    """
    try:
        snapshot = market.get_market_snapshot()
        return MarketResponse(**snapshot)
    except Exception as e:
        logger.error(f"Error getting market data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/{symbol}/history", response_model=PriceHistoryResponse)
async def get_price_history(symbol: str, limit: Optional[int] = None):
    """Get price history for a specific stock.

    Args:
        symbol: Stock symbol
        limit: Maximum number of periods to return (optional)

    Returns:
        Price history data
    """
    try:
        history = market.get_price_history(symbol, limit)
        history_data = [
            {
                "timestep": p.timestep,
                "price": p.price,
                "timestamp": p.timestamp.isoformat(),
                "is_override": p.is_override
            }
            for p in history
        ]
        return PriceHistoryResponse(symbol=symbol, history=history_data)
    except Exception as e:
        logger.error(f"Error getting price history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/{character_name}", response_model=PortfolioResponse)
async def get_portfolio(character_name: str):
    """Get portfolio for a character.

    Args:
        character_name: Character name

    Returns:
        Portfolio data with holdings and P/L
    """
    try:
        portfolio = db.get_portfolio(character_name)

        # Get current prices for holdings
        current_prices = market.get_current_prices()

        holdings_data = []
        for holding in portfolio.holdings:
            current_price = current_prices.get(holding.symbol, holding.avg_purchase_price)
            current_value = holding.calculate_current_value(current_price)
            profit_loss = holding.calculate_profit_loss(current_price)

            holdings_data.append({
                "symbol": holding.symbol,
                "quantity": holding.quantity,
                "avg_purchase_price": holding.avg_purchase_price,
                "current_price": current_price,
                "current_value": current_value,
                "profit_loss": profit_loss,
                "profit_loss_percentage": (profit_loss / holding.total_cost_basis * 100)
                if holding.total_cost_basis > 0 else 0
            })

        return PortfolioResponse(
            character_name=portfolio.character_name,
            holdings=holdings_data,
            total_value=portfolio.total_value,
            total_cost_basis=portfolio.total_cost_basis,
            total_profit_loss=portfolio.total_profit_loss,
            profit_loss_percentage=portfolio.profit_loss_percentage
        )
    except Exception as e:
        logger.error(f"Error getting portfolio for {character_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transaction/buy", response_model=TransactionResponse)
async def buy_stock(request: BuyRequest):
    """Buy stock for a character.

    Args:
        request: Buy request with character, symbol, and quantity

    Returns:
        Transaction result
    """
    try:
        # Get current market state
        market_state = db.get_market_state()
        current_timestep = market_state.current_timestep

        # Get current price
        current_price_obj = db.get_latest_price(request.symbol)
        if not current_price_obj:
            raise HTTPException(status_code=404, detail=f"Stock {request.symbol} not found")

        current_price = current_price_obj.price
        total_cost = current_price * request.quantity

        logger.info(
            f"Processing BUY: {request.character_name} - {request.symbol} - "
            f"{request.quantity} @ ¢{current_price:.2f} = ¢{total_cost:.2f}"
        )

        # Get existing holding or create new one
        existing_holding = db.get_holding(request.character_name, request.symbol)

        if existing_holding:
            # Update average purchase price
            total_quantity = existing_holding.quantity + request.quantity
            total_cost_basis = (
                existing_holding.total_cost_basis + total_cost
            )
            new_avg_price = total_cost_basis / total_quantity

            new_holding = PortfolioHolding(
                character_name=request.character_name,
                symbol=request.symbol,
                quantity=total_quantity,
                avg_purchase_price=new_avg_price
            )
        else:
            # Create new holding
            new_holding = PortfolioHolding(
                character_name=request.character_name,
                symbol=request.symbol,
                quantity=request.quantity,
                avg_purchase_price=current_price
            )

        # Save holding
        db.update_portfolio(new_holding)

        # Create transaction record
        transaction = Transaction(
            id=None,
            character_name=request.character_name,
            symbol=request.symbol,
            transaction_type=TransactionType.BUY,
            quantity=request.quantity,
            price=current_price,
            total_amount=total_cost,
            timestamp=datetime.now(),
            timestep=current_timestep
        )
        transaction_id = db.save_transaction(transaction)

        logger.info(f"BUY transaction completed: ID={transaction_id}")

        return TransactionResponse(
            success=True,
            transaction_id=transaction_id,
            message=f"Bought {request.quantity} shares of {request.symbol} for ¢{total_cost:.2f}",
            new_holding={
                "symbol": new_holding.symbol,
                "quantity": new_holding.quantity,
                "avg_purchase_price": new_holding.avg_purchase_price
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing buy transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/transaction/sell", response_model=TransactionResponse)
async def sell_stock(request: SellRequest):
    """Sell stock for a character.

    Args:
        request: Sell request with character, symbol, and quantity

    Returns:
        Transaction result
    """
    try:
        # Get current market state
        market_state = db.get_market_state()
        current_timestep = market_state.current_timestep

        # Get current price
        current_price_obj = db.get_latest_price(request.symbol)
        if not current_price_obj:
            raise HTTPException(status_code=404, detail=f"Stock {request.symbol} not found")

        current_price = current_price_obj.price

        # Get existing holding
        existing_holding = db.get_holding(request.character_name, request.symbol)

        if not existing_holding:
            raise HTTPException(
                status_code=400,
                detail=f"No holdings found for {request.symbol}"
            )

        if existing_holding.quantity < request.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares. Have {existing_holding.quantity}, trying to sell {request.quantity}"
            )

        total_proceeds = current_price * request.quantity
        realized_profit_loss = (current_price - existing_holding.avg_purchase_price) * request.quantity

        logger.info(
            f"Processing SELL: {request.character_name} - {request.symbol} - "
            f"{request.quantity} @ ¢{current_price:.2f} = ¢{total_proceeds:.2f} "
            f"(P/L: ¢{realized_profit_loss:+.2f})"
        )

        # Update holding
        new_quantity = existing_holding.quantity - request.quantity

        new_holding = PortfolioHolding(
            character_name=request.character_name,
            symbol=request.symbol,
            quantity=new_quantity,
            avg_purchase_price=existing_holding.avg_purchase_price  # Keep same avg price
        )

        # Save updated holding (will delete if quantity is 0)
        db.update_portfolio(new_holding)

        # Create transaction record
        transaction = Transaction(
            id=None,
            character_name=request.character_name,
            symbol=request.symbol,
            transaction_type=TransactionType.SELL,
            quantity=request.quantity,
            price=current_price,
            total_amount=total_proceeds,
            timestamp=datetime.now(),
            timestep=current_timestep
        )
        transaction_id = db.save_transaction(transaction)

        logger.info(f"SELL transaction completed: ID={transaction_id}")

        return TransactionResponse(
            success=True,
            transaction_id=transaction_id,
            message=f"Sold {request.quantity} shares of {request.symbol} for ¢{total_proceeds:.2f} "
                    f"(Realized P/L: ¢{realized_profit_loss:+.2f})",
            new_holding={
                "symbol": new_holding.symbol,
                "quantity": new_holding.quantity,
                "avg_purchase_price": new_holding.avg_purchase_price
            } if new_quantity > 0 else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing sell transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Admin Endpoints

@app.post("/api/admin/timestep")
async def generate_timestep():
    """Generate a new market timestep (GM only).

    Returns:
        New market state and updated prices
    """
    try:
        logger.info("Admin: Generating new timestep")

        # Generate new timestep
        new_state = market.generate_timestep()

        # Get updated prices
        snapshot = market.get_market_snapshot()

        # Broadcast update to all WebSocket clients
        await websocket_manager.broadcast({
            "type": "timestep_updated",
            "timestep": new_state.current_timestep,
            "prices": snapshot["prices"],
            "timestamp": new_state.last_updated.isoformat()
        })

        logger.info(f"Timestep {new_state.current_timestep} generated and broadcast")

        return {
            "success": True,
            "timestep": new_state.current_timestep,
            "last_updated": new_state.last_updated.isoformat(),
            "prices": snapshot["prices"]
        }

    except RuntimeError as e:
        # Generation already in progress
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating timestep: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/transactions")
async def get_all_transactions(
    character_name: Optional[str] = None,
    symbol: Optional[str] = None,
    limit: int = 100
):
    """Get transaction history (GM only).

    Args:
        character_name: Filter by character (optional)
        symbol: Filter by symbol (optional)
        limit: Maximum number of transactions to return

    Returns:
        List of transactions
    """
    try:
        transactions = db.get_transactions(character_name, symbol, limit)

        transactions_data = [
            {
                "id": t.id,
                "character_name": t.character_name,
                "symbol": t.symbol,
                "type": t.transaction_type.value,
                "quantity": t.quantity,
                "price": t.price,
                "total_amount": t.total_amount,
                "timestamp": t.timestamp.isoformat(),
                "timestep": t.timestep
            }
            for t in transactions
        ]

        return {
            "transactions": transactions_data,
            "count": len(transactions_data)
        }

    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/market-state")
async def get_market_state():
    """Get current market state (GM only).

    Returns:
        Market state information
    """
    try:
        market_state = db.get_market_state()
        return {
            "current_timestep": market_state.current_timestep,
            "last_updated": market_state.last_updated.isoformat(),
            "is_generating": market_state.is_generating
        }
    except Exception as e:
        logger.error(f"Error getting market state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket Endpoint

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time market updates.

    Args:
        websocket: WebSocket connection
    """
    await websocket_manager.connect(websocket)

    try:
        # Send initial market state
        snapshot = market.get_market_snapshot()
        await websocket.send_json({
            "type": "connected",
            "timestep": snapshot["timestep"],
            "prices": snapshot["prices"],
            "timestamp": snapshot["last_updated"]
        })

        # Keep connection alive and listen for messages
        while True:
            # Wait for messages (mainly to detect disconnect)
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket message: {data}")

    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)


# Run server
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
