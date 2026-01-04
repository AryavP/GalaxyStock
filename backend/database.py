"""
SQLite database interface for GalacticStocks.
Handles all data persistence including stock prices, portfolios, and transactions.
"""
import sqlite3
import logging
from datetime import datetime
from typing import Optional, List
from contextlib import contextmanager

from models import (
    Company, StockPrice, PortfolioHolding, Transaction,
    TransactionType, MarketState, Portfolio
)

logger = logging.getLogger(__name__)


class Database:
    """SQLite database manager for GalacticStocks."""

    def __init__(self, db_path: str = "galactic_market.db"):
        """Initialize database connection.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self._init_database()
        logger.info(f"Database initialized at {db_path}")

    @contextmanager
    def get_connection(self):
        """Context manager for database connections.

        Yields:
            sqlite3.Connection: Database connection
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Access columns by name
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()

    def _init_database(self):
        """Create database tables if they don't exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Stock prices table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS stock_prices (
                    symbol TEXT NOT NULL,
                    timestep INTEGER NOT NULL,
                    price REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    is_override INTEGER DEFAULT 0,
                    PRIMARY KEY (symbol, timestep)
                )
            """)

            # Create index for faster price history queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol
                ON stock_prices(symbol, timestep DESC)
            """)

            # Portfolios table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS portfolios (
                    character_name TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    avg_purchase_price REAL NOT NULL,
                    PRIMARY KEY (character_name, symbol)
                )
            """)

            # Transactions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    character_name TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    transaction_type TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    price REAL NOT NULL,
                    total_amount REAL NOT NULL,
                    timestamp TEXT NOT NULL,
                    timestep INTEGER NOT NULL
                )
            """)

            # Create index for transaction queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_transactions_character
                ON transactions(character_name, timestamp DESC)
            """)

            # Market state table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS market_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    current_timestep INTEGER NOT NULL DEFAULT 0,
                    last_updated TEXT NOT NULL,
                    is_generating INTEGER DEFAULT 0
                )
            """)

            # Initialize market state if not exists
            cursor.execute("SELECT COUNT(*) FROM market_state WHERE id = 1")
            if cursor.fetchone()[0] == 0:
                cursor.execute("""
                    INSERT INTO market_state (id, current_timestep, last_updated, is_generating)
                    VALUES (1, 0, ?, 0)
                """, (datetime.now().isoformat(),))
                logger.info("Initialized market state at timestep 0")

    # Stock Price Methods

    def save_stock_price(self, stock_price: StockPrice):
        """Save a stock price to the database.

        Args:
            stock_price: StockPrice object to save
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO stock_prices
                (symbol, timestep, price, timestamp, is_override)
                VALUES (?, ?, ?, ?, ?)
            """, (
                stock_price.symbol,
                stock_price.timestep,
                stock_price.price,
                stock_price.timestamp.isoformat(),
                1 if stock_price.is_override else 0
            ))
            logger.debug(
                f"Saved price: {stock_price.symbol} @ timestep {stock_price.timestep} = ¢{stock_price.price:.2f}"
            )

    def get_latest_price(self, symbol: str) -> Optional[StockPrice]:
        """Get the most recent price for a stock.

        Args:
            symbol: Stock symbol

        Returns:
            StockPrice or None if not found
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT symbol, timestep, price, timestamp, is_override
                FROM stock_prices
                WHERE symbol = ?
                ORDER BY timestep DESC
                LIMIT 1
            """, (symbol,))
            row = cursor.fetchone()

            if row:
                return StockPrice(
                    symbol=row['symbol'],
                    timestep=row['timestep'],
                    price=row['price'],
                    timestamp=datetime.fromisoformat(row['timestamp']),
                    is_override=bool(row['is_override'])
                )
            return None

    def get_price_history(self, symbol: str, n_periods: Optional[int] = None) -> List[StockPrice]:
        """Get historical prices for a stock.

        Args:
            symbol: Stock symbol
            n_periods: Number of most recent periods to retrieve (None for all)

        Returns:
            List of StockPrice objects, ordered by timestep ascending
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            if n_periods:
                cursor.execute("""
                    SELECT symbol, timestep, price, timestamp, is_override
                    FROM stock_prices
                    WHERE symbol = ?
                    ORDER BY timestep DESC
                    LIMIT ?
                """, (symbol, n_periods))
            else:
                cursor.execute("""
                    SELECT symbol, timestep, price, timestamp, is_override
                    FROM stock_prices
                    WHERE symbol = ?
                    ORDER BY timestep ASC
                """, (symbol,))

            rows = cursor.fetchall()
            prices = [
                StockPrice(
                    symbol=row['symbol'],
                    timestep=row['timestep'],
                    price=row['price'],
                    timestamp=datetime.fromisoformat(row['timestamp']),
                    is_override=bool(row['is_override'])
                )
                for row in rows
            ]

            # If we limited, reverse to get ascending order
            if n_periods:
                prices.reverse()

            return prices

    def get_all_latest_prices(self) -> dict[str, float]:
        """Get the latest price for all stocks.

        Returns:
            Dictionary mapping symbol to price
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT symbol, price
                FROM stock_prices sp1
                WHERE timestep = (
                    SELECT MAX(timestep)
                    FROM stock_prices sp2
                    WHERE sp2.symbol = sp1.symbol
                )
            """)

            return {row['symbol']: row['price'] for row in cursor.fetchall()}

    # Portfolio Methods

    def get_portfolio(self, character_name: str) -> Portfolio:
        """Get a character's complete portfolio.

        Args:
            character_name: Character name

        Returns:
            Portfolio object with all holdings and calculations
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT character_name, symbol, quantity, avg_purchase_price
                FROM portfolios
                WHERE character_name = ? AND quantity > 0
            """, (character_name,))

            holdings = []
            total_value = 0.0
            total_cost_basis = 0.0

            for row in cursor.fetchall():
                holding = PortfolioHolding(
                    character_name=row['character_name'],
                    symbol=row['symbol'],
                    quantity=row['quantity'],
                    avg_purchase_price=row['avg_purchase_price']
                )
                holdings.append(holding)

                # Get current price for calculations
                current_price_obj = self.get_latest_price(row['symbol'])
                current_price = current_price_obj.price if current_price_obj else row['avg_purchase_price']

                total_value += holding.calculate_current_value(current_price)
                total_cost_basis += holding.total_cost_basis

            total_profit_loss = total_value - total_cost_basis

            return Portfolio(
                character_name=character_name,
                holdings=holdings,
                total_value=total_value,
                total_cost_basis=total_cost_basis,
                total_profit_loss=total_profit_loss
            )

    def get_holding(self, character_name: str, symbol: str) -> Optional[PortfolioHolding]:
        """Get a specific holding for a character.

        Args:
            character_name: Character name
            symbol: Stock symbol

        Returns:
            PortfolioHolding or None if not found
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT character_name, symbol, quantity, avg_purchase_price
                FROM portfolios
                WHERE character_name = ? AND symbol = ?
            """, (character_name, symbol))

            row = cursor.fetchone()
            if row:
                return PortfolioHolding(
                    character_name=row['character_name'],
                    symbol=row['symbol'],
                    quantity=row['quantity'],
                    avg_purchase_price=row['avg_purchase_price']
                )
            return None

    def update_portfolio(self, holding: PortfolioHolding):
        """Update or insert a portfolio holding.

        Args:
            holding: PortfolioHolding to save
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            if holding.quantity > 0:
                cursor.execute("""
                    INSERT OR REPLACE INTO portfolios
                    (character_name, symbol, quantity, avg_purchase_price)
                    VALUES (?, ?, ?, ?)
                """, (
                    holding.character_name,
                    holding.symbol,
                    holding.quantity,
                    holding.avg_purchase_price
                ))
                logger.info(
                    f"Updated portfolio: {holding.character_name} - {holding.symbol}: "
                    f"{holding.quantity} @ ¢{holding.avg_purchase_price:.2f}"
                )
            else:
                # Remove holding if quantity is zero
                cursor.execute("""
                    DELETE FROM portfolios
                    WHERE character_name = ? AND symbol = ?
                """, (holding.character_name, holding.symbol))
                logger.info(
                    f"Removed portfolio holding: {holding.character_name} - {holding.symbol}"
                )

    # Transaction Methods

    def save_transaction(self, transaction: Transaction) -> int:
        """Save a transaction to the database.

        Args:
            transaction: Transaction object to save

        Returns:
            Transaction ID
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO transactions
                (character_name, symbol, transaction_type, quantity, price,
                 total_amount, timestamp, timestep)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                transaction.character_name,
                transaction.symbol,
                transaction.transaction_type.value,
                transaction.quantity,
                transaction.price,
                transaction.total_amount,
                transaction.timestamp.isoformat(),
                transaction.timestep
            ))
            transaction_id = cursor.lastrowid
            logger.info(
                f"Transaction saved: {transaction.transaction_type.value} - "
                f"{transaction.character_name} - {transaction.symbol} - "
                f"{transaction.quantity} @ ¢{transaction.price:.2f}"
            )
            return transaction_id

    def get_transactions(
        self,
        character_name: Optional[str] = None,
        symbol: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Transaction]:
        """Get transactions with optional filters.

        Args:
            character_name: Filter by character (optional)
            symbol: Filter by stock symbol (optional)
            limit: Maximum number of transactions to return (optional)

        Returns:
            List of Transaction objects, ordered by timestamp descending
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM transactions WHERE 1=1"
            params = []

            if character_name:
                query += " AND character_name = ?"
                params.append(character_name)

            if symbol:
                query += " AND symbol = ?"
                params.append(symbol)

            query += " ORDER BY timestamp DESC"

            if limit:
                query += " LIMIT ?"
                params.append(limit)

            cursor.execute(query, params)

            return [
                Transaction(
                    id=row['id'],
                    character_name=row['character_name'],
                    symbol=row['symbol'],
                    transaction_type=TransactionType(row['transaction_type']),
                    quantity=row['quantity'],
                    price=row['price'],
                    total_amount=row['total_amount'],
                    timestamp=datetime.fromisoformat(row['timestamp']),
                    timestep=row['timestep']
                )
                for row in cursor.fetchall()
            ]

    # Market State Methods

    def get_market_state(self) -> MarketState:
        """Get current market state.

        Returns:
            MarketState object
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT current_timestep, last_updated, is_generating
                FROM market_state
                WHERE id = 1
            """)

            row = cursor.fetchone()
            return MarketState(
                current_timestep=row['current_timestep'],
                last_updated=datetime.fromisoformat(row['last_updated']),
                is_generating=bool(row['is_generating'])
            )

    def update_market_state(self, market_state: MarketState):
        """Update market state.

        Args:
            market_state: MarketState object to save
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE market_state
                SET current_timestep = ?, last_updated = ?, is_generating = ?
                WHERE id = 1
            """, (
                market_state.current_timestep,
                market_state.last_updated.isoformat(),
                1 if market_state.is_generating else 0
            ))
            logger.info(
                f"Market state updated: timestep={market_state.current_timestep}, "
                f"is_generating={market_state.is_generating}"
            )

    def set_generation_lock(self, is_locked: bool):
        """Set the generation lock flag.

        Args:
            is_locked: True to lock, False to unlock
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE market_state
                SET is_generating = ?
                WHERE id = 1
            """, (1 if is_locked else 0,))
            logger.debug(f"Generation lock {'acquired' if is_locked else 'released'}")

    def is_generation_locked(self) -> bool:
        """Check if timestep generation is currently locked.

        Returns:
            True if locked, False otherwise
        """
        market_state = self.get_market_state()
        return market_state.is_generating
