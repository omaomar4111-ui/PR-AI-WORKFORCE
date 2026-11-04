import sys
import os

# Ensure apps/api is prioritized and external conflicts like ComfyUI are purged
api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path = [p for p in sys.path if "ComfyUI" not in p]
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)
