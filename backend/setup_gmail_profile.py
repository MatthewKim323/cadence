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
    profile = None
    resp = await client.profiles.list_profiles()
    for p in resp.items:
        if p.name == "cadence-gmail":
            profile = p
            print(f"Found existing profile: {profile.id} ({profile.name})")
            break

    if not profile:
        profile = await client.profiles.create_profile(name="cadence-gmail")
        print(f"Created new profile: {profile.id}")

    # Create a session with the profile
    print("\nCreating browser session on Gmail...")
    session = await client.sessions.create_session(
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

    # Use update_session with action="stop" to persist profile state
    print("\nStopping session and saving profile state...")
    await client.sessions.update_session(session.id, action="stop")

    print(f"\nDone! Profile state saved.")
    print(f"\nAdd this to your backend/.env file:")
    print(f"\n  GMAIL_PROFILE_ID={profile.id}")
    print(f"\nThe inbox agent will use this profile to access Gmail")
    print(f"without needing to log in again.")


if __name__ == "__main__":
    asyncio.run(main())
