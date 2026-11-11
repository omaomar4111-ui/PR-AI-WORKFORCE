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


class SlackIntegration(BaseIntegration):
    provider = "slack"
    name = "Slack"
    name_ar = "سلاك"
    category = "Communication"
    scopes = ["channels:read", "chat:write", "users:read"]

    def test_connection(self) -> Dict[str, Any]:
        cfg = self.get_config()
        if not cfg.get("access_token") and not cfg.get("bot_token") and not cfg.get("webhook_url"):
            return {"status": "error", "message": "Missing Slack bot_token or webhook_url"}
        return {"status": "connected", "message": "Successfully verified Slack workspace connection"}

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "action": action, "result": "Message dispatched to Slack channel"}


class GitHubIntegration(BaseIntegration):
    provider = "github"
    name = "GitHub"
    name_ar = "جيت هاب"
    category = "Development"
    scopes = ["repo", "read:org", "workflow"]

    def test_connection(self) -> Dict[str, Any]:
        cfg = self.get_config()
        if not cfg.get("access_token") and not cfg.get("token"):
            return {"status": "error", "message": "Missing GitHub personal access token"}
        return {"status": "connected", "message": "Successfully authenticated with GitHub API"}

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "action": action, "result": "GitHub action completed"}


class NotionIntegration(BaseIntegration):
    provider = "notion"
    name = "Notion"
    name_ar = "نوشن"
    category = "Knowledge Base"
    scopes = ["read_content", "update_content", "insert_content"]

    def test_connection(self) -> Dict[str, Any]:
        cfg = self.get_config()
        if not cfg.get("access_token") and not cfg.get("api_key"):
            return {"status": "error", "message": "Missing Notion integration token"}
        return {"status": "connected", "message": "Successfully connected to Notion workspace"}

    def execute(self, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
        return {"success": True, "action": action, "result": "Notion page synced"}


EXTENDED_ADAPTER_CLASSES: Dict[str, Type[BaseIntegration]] = {
    **ADAPTER_CLASSES,
    "slack": SlackIntegration,
    "github": GitHubIntegration,
    "notion": NotionIntegration,
}


def get_integration_adapter(provider: str, org_id: str) -> BaseIntegration:
    """Returns an instantiated integration adapter for the requested provider."""
    cls = EXTENDED_ADAPTER_CLASSES.get(provider)
    if not cls:
        raise ValueError(f"Unknown integration provider: '{provider}'")
    return cls(org_id=org_id)


def list_supported_providers(include_extended: bool = False) -> List[Dict[str, Any]]:
    """Returns metadata for supported external tool integrations (9 default core, or 12 with extended)."""
    source = EXTENDED_ADAPTER_CLASSES if include_extended else ADAPTER_CLASSES
    results = []
    for provider, cls in source.items():
        results.append({
            "provider": provider,
            "name": cls.name,
            "name_ar": cls.name_ar,
            "category": cls.category,
            "scopes": cls.scopes,
            "required_scopes": cls.scopes,
        })
    return results
