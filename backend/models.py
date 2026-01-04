"""
Data models for GalacticStocks application.
Defines the structure for companies, portfolios, transactions, and market state.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class TransactionType(str, Enum):
    """Transaction types for stock trades."""
    BUY = "BUY"
    SELL = "SELL"


@dataclass
class Company:
    """Represents a galactic company in the stock market."""
    symbol: str
    name: str
    initial_price: float
    trend: float  # Drift parameter for price movement
    volatility: float  # Volatility parameter for stochastic variation
    description: str = ""  # Company description for tooltips

    def __post_init__(self):
        """Validate company parameters."""
        if self.initial_price <= 0:
            raise ValueError(f"Initial price must be positive, got {self.initial_price}")
        if self.volatility < 0:
            raise ValueError(f"Volatility must be non-negative, got {self.volatility}")


@dataclass
class StockPrice:
    """Represents a stock price at a specific timestep."""
    symbol: str
    timestep: int
    price: float
    timestamp: datetime
    is_override: bool = False  # True if price was manually set by GM

    def __post_init__(self):
        """Validate price data."""
        if self.price <= 0:
            raise ValueError(f"Price must be positive, got {self.price}")
        if self.timestep < 0:
            raise ValueError(f"Timestep must be non-negative, got {self.timestep}")


@dataclass
class PortfolioHolding:
    """Represents a character's holdings of a specific stock."""
    character_name: str
    symbol: str
    quantity: int
    avg_purchase_price: float

    def __post_init__(self):
        """Validate holding data."""
        if self.quantity < 0:
            raise ValueError(f"Quantity must be non-negative, got {self.quantity}")
        if self.avg_purchase_price <= 0:
            raise ValueError(f"Average price must be positive, got {self.avg_purchase_price}")

    @property
    def total_cost_basis(self) -> float:
        """Calculate total cost basis (quantity * avg purchase price)."""
        return self.quantity * self.avg_purchase_price

    def calculate_current_value(self, current_price: float) -> float:
        """Calculate current value of this holding."""
        return self.quantity * current_price

    def calculate_profit_loss(self, current_price: float) -> float:
        """Calculate unrealized profit/loss."""
        return (current_price - self.avg_purchase_price) * self.quantity


@dataclass
class Transaction:
    """Represents a stock transaction (buy or sell)."""
    id: Optional[int]
    character_name: str
    symbol: str
    transaction_type: TransactionType
    quantity: int
    price: float  # Price per share at time of transaction
    total_amount: float  # Total transaction value (quantity * price)
    timestamp: datetime
    timestep: int  # Market timestep when transaction occurred

    def __post_init__(self):
        """Validate transaction data."""
        if self.quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {self.quantity}")
        if self.price <= 0:
            raise ValueError(f"Price must be positive, got {self.price}")
        if self.total_amount <= 0:
            raise ValueError(f"Total amount must be positive, got {self.total_amount}")

        # Verify total_amount matches quantity * price (with small tolerance for floating point)
        expected = self.quantity * self.price
        if abs(self.total_amount - expected) > 0.01:
            raise ValueError(
                f"Total amount {self.total_amount} doesn't match quantity * price = {expected}"
            )


@dataclass
class MarketState:
    """Represents the current state of the market."""
    current_timestep: int
    last_updated: datetime
    is_generating: bool = False  # Lock flag for timestep generation

    def __post_init__(self):
        """Validate market state."""
        if self.current_timestep < 0:
            raise ValueError(f"Timestep must be non-negative, got {self.current_timestep}")


@dataclass
class PriceOverride:
    """Represents a GM price override from Google Sheets."""
    symbol: str
    override_price: float
    timestamp: datetime

    def __post_init__(self):
        """Validate override data."""
        if self.override_price <= 0:
            raise ValueError(f"Override price must be positive, got {self.override_price}")


@dataclass
class Portfolio:
    """Aggregated portfolio view for a character."""
    character_name: str
    holdings: list[PortfolioHolding]
    total_value: float
    total_cost_basis: float
    total_profit_loss: float

    @property
    def profit_loss_percentage(self) -> float:
        """Calculate profit/loss as a percentage of cost basis."""
        if self.total_cost_basis == 0:
            return 0.0
        return (self.total_profit_loss / self.total_cost_basis) * 100


@dataclass
class MarketSnapshot:
    """Current market prices for all stocks."""
    timestep: int
    prices: dict[str, float]  # symbol -> price
    timestamp: datetime
