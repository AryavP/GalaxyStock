"""
Google Sheets integration for GalacticStocks.
Loads company parameters and GM price overrides from a Google Sheet.
"""
import logging
from typing import List, Optional
from datetime import datetime
import os

try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
    GOOGLE_SHEETS_AVAILABLE = True
except ImportError:
    GOOGLE_SHEETS_AVAILABLE = False

from models import Company, PriceOverride

logger = logging.getLogger(__name__)


class GoogleSheetsClient:
    """Client for reading market data from Google Sheets."""

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        spreadsheet_id: Optional[str] = None
    ):
        """Initialize Google Sheets client.

        Args:
            credentials_path: Path to service account credentials JSON file
            spreadsheet_id: Google Sheets spreadsheet ID

        Raises:
            ValueError: If Google Sheets libraries are not installed
        """
        if not GOOGLE_SHEETS_AVAILABLE:
            logger.warning(
                "Google Sheets libraries not available. "
                "Install with: pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client"
            )
            self.service = None
            return

        self.credentials_path = credentials_path or os.getenv("GOOGLE_CREDENTIALS_PATH")
        self.spreadsheet_id = spreadsheet_id or os.getenv("GOOGLE_SPREADSHEET_ID")

        if not self.credentials_path or not self.spreadsheet_id:
            logger.warning(
                "Google Sheets credentials or spreadsheet ID not configured. "
                "Set GOOGLE_CREDENTIALS_PATH and GOOGLE_SPREADSHEET_ID environment variables."
            )
            self.service = None
            return

        try:
            # Set up credentials
            creds = Credentials.from_service_account_file(
                self.credentials_path,
                scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
            )

            # Build the service
            self.service = build('sheets', 'v4', credentials=creds)
            logger.info(f"Google Sheets client initialized for spreadsheet: {self.spreadsheet_id}")

        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")
            self.service = None

    def is_available(self) -> bool:
        """Check if Google Sheets integration is available.

        Returns:
            True if service is initialized, False otherwise
        """
        return self.service is not None

    def load_companies(self) -> List[Company]:
        """Load company data from the Companies sheet.

        Expected sheet format:
        | symbol | name | initial_price | trend | volatility |
        |--------|------|---------------|-------|------------|
        | APLO   | ... | 100.00        | 0.001 | 0.02       |

        Returns:
            List of Company objects

        Raises:
            Exception: If sheet cannot be read
        """
        if not self.service:
            logger.warning("Google Sheets not available, returning empty company list")
            return []

        try:
            # Read the Companies sheet
            sheet_range = 'Companies!A2:E'  # Skip header row
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=sheet_range
            ).execute()

            values = result.get('values', [])

            if not values:
                logger.warning("No company data found in Google Sheet")
                return []

            companies = []
            for i, row in enumerate(values, start=2):  # Start at 2 for row number
                try:
                    # Handle rows with missing columns
                    if len(row) < 5:
                        logger.warning(f"Row {i} has insufficient columns, skipping")
                        continue

                    symbol = row[0].strip()
                    name = row[1].strip()
                    initial_price = float(row[2])
                    trend = float(row[3])
                    volatility = float(row[4])

                    company = Company(
                        symbol=symbol,
                        name=name,
                        initial_price=initial_price,
                        trend=trend,
                        volatility=volatility
                    )
                    companies.append(company)
                    logger.debug(f"Loaded company: {symbol} - {name}")

                except (ValueError, IndexError) as e:
                    logger.error(f"Error parsing row {i}: {e}, skipping")
                    continue

            logger.info(f"Loaded {len(companies)} companies from Google Sheet")
            return companies

        except Exception as e:
            logger.error(f"Failed to load companies from Google Sheet: {e}")
            raise

    def load_price_overrides(self) -> List[PriceOverride]:
        """Load GM price overrides from the Overrides sheet.

        Expected sheet format:
        | symbol | override_price | timestamp |
        |--------|----------------|-----------|
        | APLO   | 150.00         | 2024-...  |

        Returns:
            List of PriceOverride objects

        Raises:
            Exception: If sheet cannot be read
        """
        if not self.service:
            logger.warning("Google Sheets not available, returning empty overrides list")
            return []

        try:
            # Read the Overrides sheet
            sheet_range = 'Overrides!A2:C'  # Skip header row
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=sheet_range
            ).execute()

            values = result.get('values', [])

            if not values:
                logger.debug("No price overrides found in Google Sheet")
                return []

            overrides = []
            for i, row in enumerate(values, start=2):  # Start at 2 for row number
                try:
                    # Handle rows with missing columns
                    if len(row) < 2:  # At minimum we need symbol and price
                        continue

                    symbol = row[0].strip()
                    override_price = float(row[1])

                    # Parse timestamp if provided, otherwise use current time
                    if len(row) >= 3 and row[2].strip():
                        try:
                            timestamp = datetime.fromisoformat(row[2].strip())
                        except ValueError:
                            timestamp = datetime.now()
                    else:
                        timestamp = datetime.now()

                    override = PriceOverride(
                        symbol=symbol,
                        override_price=override_price,
                        timestamp=timestamp
                    )
                    overrides.append(override)
                    logger.debug(f"Loaded override: {symbol} = ¢{override_price:.2f}")

                except (ValueError, IndexError) as e:
                    logger.error(f"Error parsing override row {i}: {e}, skipping")
                    continue

            logger.info(f"Loaded {len(overrides)} price overrides from Google Sheet")
            return overrides

        except Exception as e:
            logger.error(f"Failed to load price overrides from Google Sheet: {e}")
            # Don't raise - overrides are optional
            return []


class MockGoogleSheetsClient(GoogleSheetsClient):
    """Mock client for development/testing without Google Sheets."""

    def __init__(self):
        """Initialize mock client with sample data."""
        # Don't call super().__init__() to avoid needing credentials
        self.service = "mock"
        logger.info("Using mock Google Sheets client with sample data")

    def is_available(self) -> bool:
        """Mock is always available."""
        return True

    def load_companies(self) -> List[Company]:
        """Return sample company data.

        Returns:
            List of sample Company objects
        """
        companies = [
            Company(
                symbol="APLO",
                name="Apollo ISR",
                initial_price=100.0,
                trend=0.001,
                volatility=0.02
            ),
            Company(
                symbol="ELYP",
                name="Elysium Planetary Acquisitions",
                initial_price=75.0,
                trend=0.002,
                volatility=0.025
            ),
            Company(
                symbol="NOVA",
                name="Nova Mining Consortium",
                initial_price=50.0,
                trend=-0.001,
                volatility=0.03
            ),
            Company(
                symbol="ZETA",
                name="Zeta Transport Co.",
                initial_price=120.0,
                trend=0.0015,
                volatility=0.015
            ),
            Company(
                symbol="TITA",
                name="Titan Defense Industries",
                initial_price=200.0,
                trend=0.0005,
                volatility=0.01
            )
        ]

        logger.info(f"Loaded {len(companies)} mock companies")
        return companies

    def load_price_overrides(self) -> List[PriceOverride]:
        """Return empty overrides list for mock.

        Returns:
            Empty list (no overrides in mock mode)
        """
        return []
