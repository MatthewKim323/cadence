"""
One-time setup: Create a Browser Use profile and log into Gmail.

Run this script, then manually log into Gmail in the browser window that appears.
The login state (cookies, session) will be saved to the profile and reused
by the inbox agent automatically.

Usage:
    python3 setup_gmail_profile.py

After logging in, the script prints your GMAIL_PROFILE_ID.
Add it to your .env file.
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from browser_use_sdk import AsyncBrowserUse


async def main():
    api_key = os.getenv("BROWSER_USE_API_KEY", "")
    if not api_key:
        print("ERROR: BROWSER_USE_API_KEY not set in .env")
        return

    client = AsyncBrowserUse(api_key=api_key)

    # Check if profile already exists
    existing = await client.profiles.list(query="cadence-gmail")
    if existing.items:
        profile = existing.items[0]
        print(f"Found existing profile: {profile.id} ({profile.name})")
    else:
        profile = await client.profiles.create(name="cadence-gmail")
        print(f"Created new profile: {profile.id}")

    # Create a session with the profile - this opens a browser
    print("\nCreating browser session on Gmail...")
    session = await client.sessions.create(
        profile_id=profile.id,
        keep_alive=True,
        start_url="https://mail.google.com",
    )

    live_url = session.live_url or ""
    print(f"\n{'='*60}")
    print(f"BROWSER SESSION IS LIVE")
    print(f"{'='*60}")
    print(f"\nLive URL: {live_url}")
    print(f"\nOpen this URL in your browser to see the session.")
    print(f"Log into your Gmail account in the Browser Use window.")
    print(f"\nOnce you're fully logged in and can see your inbox,")
    print(f"come back here and press ENTER to save the session.")
    print(f"{'='*60}")

    input("\nPress ENTER after you've logged into Gmail... ")

    # CRITICAL: Use stop() not delete() to persist profile state
    print("\nStopping session and saving profile state...")
    await client.sessions.stop(session.id)

    print(f"\nDone! Profile state saved.")
    print(f"\nAdd this to your backend/.env file:")
    print(f"\n  GMAIL_PROFILE_ID={profile.id}")
    print(f"\nThe inbox agent will use this profile to access Gmail")
    print(f"without needing to log in again.")


if __name__ == "__main__":
    asyncio.run(main())
