from .base import BaseIntegration
from .registry import get_integration_adapter, list_supported_providers, ADAPTER_CLASSES
from .google_drive import GoogleDriveIntegration

__all__ = [
    "BaseIntegration",
    "get_integration_adapter",
    "list_supported_providers",
    "ADAPTER_CLASSES",
    "GoogleDriveIntegration",
]
