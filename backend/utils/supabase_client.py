import os
from supabase import create_client

_url = os.getenv("SUPABASE_URL", "")
_key = os.getenv("SUPABASE_SERVICE_KEY", "")

supabase = create_client(_url, _key)
