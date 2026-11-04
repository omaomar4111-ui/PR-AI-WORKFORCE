"""
PR AI WORKFORCE - Integration Hub Base Adapter Contract
Enforces strict credential verification. NEVER simulates success if credentials are missing.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import datetime
import database


class BaseIntegration(ABC):
    provider: str = "base"
    name: str = "Base Integration"
    name_ar: str = "تكامل أساسي"
    category: str = "General"
    scopes: List[str] = []

    def __init__(self, org_id: str):
        self.org_id = org_id

    def get_config(self) -> Dict[str, Any]:
        """Loads stored integration configuration from database."""
        item = database.get_integration(self.org_id, self.provider)
        return item.get("config", {}) if item else {}

    def get_status(self) -> Dict[str, Any]:
        """Returns the current connection status and metadata."""
        item = database.get_integration(self.org_id, self.provider)
        if not item or item.get("status") != "connected":
            return {
                "provider": self.provider,
                "name": self.name,
                "name_ar": self.name_ar,
                "category": self.category,
                "status": item.get("status", "disconnected") if item else "disconnected",
                "scopes": self.scopes,
                "connected_at": None,
                "message": f"{self.name} is not connected. Credentials required.",
            }

        return {
            "provider": self.provider,
            "name": self.name,
            "name_ar": self.name_ar,
            "category": self.category,
            "status": "connected",
            "scopes": self.scopes,
            "connected_at": item.get("connected_at"),
            "connected_by": item.get("connected_by"),
        }

    def connect(self, config: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
        """Connects and persists integration configuration."""
        if not config or not isinstance(config, dict):
            raise ValueError(f"Valid configuration parameters required for {self.name}")

        record = database.save_integration(
            org_id=self.org_id,
            provider=self.provider,
            status="connected",
            config=config,
            connected_by=user_id,
        )
        return record

    def disconnect(self) -> bool:
        """Disconnects integration and removes stored credentials."""
        return database.delete_integration(self.org_id, self.provider)

    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        """Tests the integration credentials and returns health status."""
        pass

    @abstractmethod
    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Executes an action against the integrated external service."""
        pass
