"""
Stock price simulation engine for GalacticStocks.
Implements stochastic price generation using geometric Brownian motion.
"""
import logging
import math
import random
from datetime import datetime
from typing import Dict, List, Optional

from models import Company, StockPrice, MarketState, PriceOverride
from database import Database
from google_sheets import GoogleSheetsClient

logger = logging.getLogger(__name__)


class StockMarket:
    """Manages the galactic stock market simulation."""

    def __init__(self, db: Database, sheets_client: GoogleSheetsClient):
        """Initialize the stock market.

        Args:
            db: Database instance
            sheets_client: Google Sheets client instance
        """
        self.db = db
        self.sheets_client = sheets_client
        self.companies: Dict[str, Company] = {}

        logger.info("StockMarket initialized")

    def load_companies(self) -> Dict[str, Company]:
        """Load company data from Google Sheets.

        Returns:
            Dictionary mapping symbol to Company object

        Raises:
            Exception: If companies cannot be loaded
        """
        logger.info("Loading companies from Google Sheets")

        if not self.sheets_client.is_available():
            logger.warning("Google Sheets not available, using existing companies")
            return self.companies

        try:
            companies_list = self.sheets_client.load_companies()

            if not companies_list:
                logger.warning("No companies loaded from Google Sheets")
                return self.companies

            # Convert to dictionary
            self.companies = {c.symbol: c for c in companies_list}

            logger.info(f"Loaded {len(self.companies)} companies: {list(self.companies.keys())}")
            return self.companies

        except Exception as e:
            logger.error(f"Failed to load companies: {e}")
            raise

    def initialize_market(self):
        """Initialize the market with starting prices (timestep 0).

        This should be called once when setting up the market for the first time.
        """
        logger.info("Initializing market with starting prices")

        # Load companies first
        self.load_companies()

        if not self.companies:
            logger.error("No companies loaded, cannot initialize market")
            raise ValueError("No companies available to initialize market")

        # Check if market is already initialized
        market_state = self.db.get_market_state()
        if market_state.current_timestep > 0:
            logger.warning(f"Market already initialized at timestep {market_state.current_timestep}")
            return

        # Check if we have any prices
        existing_prices = self.db.get_all_latest_prices()
        if existing_prices:
            logger.warning("Market already has prices, skipping initialization")
            return

        # Save initial prices for all companies
        now = datetime.now()
        for symbol, company in self.companies.items():
            stock_price = StockPrice(
                symbol=symbol,
                timestep=0,
                price=company.initial_price,
                timestamp=now,
                is_override=False
            )
            self.db.save_stock_price(stock_price)

            logger.info(f"Initialized {symbol} at ¢{company.initial_price:.2f}")

        logger.info("Market initialization complete")

    def _generate_price(
        self,
        current_price: float,
        trend: float,
        volatility: float,
        dt: float = 1.0
    ) -> float:
        """Generate next price using geometric Brownian motion.

        Formula: S(t+1) = S(t) * exp((trend - 0.5*volatility^2)*dt + volatility*sqrt(dt)*Z)
        where Z is a standard normal random variable.

        Args:
            current_price: Current stock price
            trend: Drift parameter (expected return)
            volatility: Volatility parameter (standard deviation of returns)
            dt: Time step (default 1.0)

        Returns:
            New price
        """
        # Generate random component from standard normal distribution
        z = random.gauss(0, 1)

        # Calculate drift component
        drift = (trend - 0.5 * volatility ** 2) * dt

        # Calculate stochastic component
        diffusion = volatility * math.sqrt(dt) * z

        # Calculate new price
        new_price = current_price * math.exp(drift + diffusion)

        # Ensure price doesn't go below a minimum threshold
        min_price = 0.01
        new_price = max(new_price, min_price)

        return new_price

    def calculate_next_price(
        self,
        symbol: str,
        trend: float,
        volatility: float,
        current_price: float
    ) -> float:
        """Calculate what the next price would be for a stock.

        This is a public wrapper around _generate_price for use by admin panel.

        Args:
            symbol: Stock symbol (for logging)
            trend: Drift parameter
            volatility: Volatility parameter
            current_price: Current stock price

        Returns:
            Calculated next price
        """
        return self._generate_price(current_price, trend, volatility)

    def generate_timestep(self) -> MarketState:
        """Generate a new market timestep with updated prices for all stocks.

        This method:
        1. Acquires generation lock to prevent concurrent generation
        2. Loads latest company parameters and price overrides from Google Sheets
        3. Generates new prices using stochastic simulation
        4. Applies any GM overrides
        5. Saves new prices and updates market state
        6. Releases generation lock

        Returns:
            Updated MarketState

        Raises:
            RuntimeError: If generation is already in progress
            Exception: If generation fails
        """
        # Check and acquire lock
        if self.db.is_generation_locked():
            logger.warning("Timestep generation already in progress")
            raise RuntimeError("Timestep generation already in progress")

        try:
            # Acquire lock
            self.db.set_generation_lock(True)
            logger.info("Acquired timestep generation lock")

            # Get current market state
            market_state = self.db.get_market_state()
            current_timestep = market_state.current_timestep
            next_timestep = current_timestep + 1

            logger.info(f"Generating timestep {next_timestep}")

            # Reload companies and check for overrides
            self.load_companies()
            overrides = self._load_overrides()

            if not self.companies:
                raise ValueError("No companies loaded, cannot generate timestep")

            # Generate new prices
            now = datetime.now()
            new_prices = {}

            for symbol, company in self.companies.items():
                # Check for override first
                if symbol in overrides:
                    new_price = overrides[symbol].override_price
                    is_override = True
                    logger.info(f"Applied override for {symbol}: ¢{new_price:.2f}")
                else:
                    # Get current price
                    latest_price = self.db.get_latest_price(symbol)
                    if not latest_price:
                        # Use initial price if no history exists
                        current_price = company.initial_price
                        logger.warning(
                            f"No price history for {symbol}, using initial price ¢{current_price:.2f}"
                        )
                    else:
                        current_price = latest_price.price

                    # Generate new price
                    new_price = self._generate_price(
                        current_price=current_price,
                        trend=company.trend,
                        volatility=company.volatility
                    )
                    is_override = False

                # Save new price
                stock_price = StockPrice(
                    symbol=symbol,
                    timestep=next_timestep,
                    price=new_price,
                    timestamp=now,
                    is_override=is_override
                )
                self.db.save_stock_price(stock_price)
                new_prices[symbol] = new_price

                change_pct = ((new_price - current_price) / current_price * 100) if latest_price else 0
                logger.info(
                    f"Generated price for {symbol}: ¢{new_price:.2f} "
                    f"({change_pct:+.2f}%)"
                )

            # Update market state
            market_state.current_timestep = next_timestep
            market_state.last_updated = now
            self.db.update_market_state(market_state)

            logger.info(f"Timestep {next_timestep} generation complete with {len(new_prices)} prices")

            return market_state

        except Exception as e:
            logger.error(f"Failed to generate timestep: {e}")
            raise

        finally:
            # Always release lock
            self.db.set_generation_lock(False)
            logger.info("Released timestep generation lock")

    def _load_overrides(self) -> Dict[str, PriceOverride]:
        """Load price overrides from Google Sheets.

        Returns:
            Dictionary mapping symbol to PriceOverride
        """
        if not self.sheets_client.is_available():
            return {}

        try:
            overrides_list = self.sheets_client.load_price_overrides()
            return {o.symbol: o for o in overrides_list}
        except Exception as e:
            logger.error(f"Failed to load price overrides: {e}")
            return {}

    def get_current_prices(self) -> Dict[str, float]:
        """Get current prices for all stocks.

        Returns:
            Dictionary mapping symbol to current price
        """
        return self.db.get_all_latest_prices()

    def get_price_history(self, symbol: str, n_periods: Optional[int] = None) -> List[StockPrice]:
        """Get price history for a stock.

        Args:
            symbol: Stock symbol
            n_periods: Number of most recent periods (None for all)

        Returns:
            List of StockPrice objects
        """
        return self.db.get_price_history(symbol, n_periods)

    def get_market_snapshot(self) -> dict:
        """Get complete market snapshot with prices and state.

        Returns:
            Dictionary with market data:
            - timestep: Current timestep number
            - last_updated: Timestamp of last update
            - prices: Dict of symbol -> price
            - companies: Dict of symbol -> company info
        """
        market_state = self.db.get_market_state()
        all_prices = self.get_current_prices()

        # Filter prices to only include companies that are currently defined
        prices = {
            symbol: price
            for symbol, price in all_prices.items()
            if symbol in self.companies
        }

        companies_info = {
            symbol: {
                "name": company.name,
                "symbol": company.symbol,
                "description": company.description
            }
            for symbol, company in self.companies.items()
        }

        return {
            "timestep": market_state.current_timestep,
            "last_updated": market_state.last_updated.isoformat(),
            "prices": prices,
            "companies": companies_info
        }

    def apply_override(self, symbol: str, price: float) -> StockPrice:
        """Manually apply a price override for a stock.

        This creates a new price entry at the current timestep with the override flag.

        Args:
            symbol: Stock symbol
            price: Override price

        Returns:
            Created StockPrice object

        Raises:
            ValueError: If symbol not found or price invalid
        """
        if symbol not in self.companies:
            raise ValueError(f"Unknown symbol: {symbol}")

        if price <= 0:
            raise ValueError(f"Price must be positive, got {price}")

        market_state = self.db.get_market_state()

        stock_price = StockPrice(
            symbol=symbol,
            timestep=market_state.current_timestep,
            price=price,
            timestamp=datetime.now(),
            is_override=True
        )

        self.db.save_stock_price(stock_price)
        logger.info(f"Applied manual override: {symbol} = ¢{price:.2f}")

        return stock_price
