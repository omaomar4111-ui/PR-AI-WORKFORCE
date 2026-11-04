from typing import Dict, Any, List, Type
from .base import BaseIntegration
from .google_drive import GoogleDriveIntegration
from .google_docs import GoogleDocsIntegration
from .gmail import GmailIntegration
from .google_sheets import GoogleSheetsIntegration
from .meta_ads import MetaAdsIntegration
from .google_ads import GoogleAdsIntegration
from .instagram import InstagramIntegration
from .image_gen import ImageGenIntegration
from .video_gen import VideoGenIntegration

ADAPTER_CLASSES: Dict[str, Type[BaseIntegration]] = {
    "google_drive": GoogleDriveIntegration,
    "google_docs": GoogleDocsIntegration,
    "gmail": GmailIntegration,
    "google_sheets": GoogleSheetsIntegration,
    "meta_ads": MetaAdsIntegration,
    "google_ads": GoogleAdsIntegration,
    "instagram": InstagramIntegration,
    "image_gen": ImageGenIntegration,
    "video_gen": VideoGenIntegration,
}


def get_integration_adapter(provider: str, org_id: str) -> BaseIntegration:
    """Returns an instantiated integration adapter for the requested provider."""
    cls = ADAPTER_CLASSES.get(provider)
    if not cls:
        raise ValueError(f"Unknown integration provider: '{provider}'")
    return cls(org_id=org_id)


def list_supported_providers() -> List[Dict[str, Any]]:
    """Returns metadata for all 9 supported external tool integrations."""
    results = []
    for provider, cls in ADAPTER_CLASSES.items():
        results.append({
            "provider": provider,
            "name": cls.name,
            "name_ar": cls.name_ar,
            "category": cls.category,
            "scopes": cls.scopes,
            "required_scopes": cls.scopes,
        })
    return results
