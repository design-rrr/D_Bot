import os
import json
import time
from datetime import datetime
from pynostr.event import Event
from pynostr.relay_manager import RelayManager
from pynostr.key import PrivateKey

# 2. DUPLICATE PREVENTION FUNCTIONS 
def load_posted_items(posted_file="posted.txt"):
    """Load posted items - make this identical to your Twitter implementation"""
    if not os.path.exists(posted_file):
        return set()
    
    try:
        with open(posted_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return set()
            
            # Handle JSON format
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    return set(data)
                elif isinstance(data, dict) and 'posted_items' in data:
                    return set(data['posted_items'])
            except json.JSONDecodeError:
                pass
            
            # Handle line-by-line format
            return set(line.strip() for line in content.split('\n') if line.strip())
    except:
        return set()

def save_posted_items(posted_items, posted_file="posted.txt"):
    """Save posted items - make this identical to your Twitter implementation"""
    try:
        data = {
            'posted_items': list(posted_items),
            'last_updated': datetime.now().isoformat()
        }
        with open(posted_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving posted items: {e}")

def get_item_id(item):
    """Generate item ID - MUST be identical to your Twitter implementation"""
    # CRITICAL: Use the same ID generation logic as your Twitter code
    # Check your Twitter implementation and copy the exact same logic here
    
    # Common patterns (choose the one that matches your Twitter implementation):
    return str(item.get('id', ''))  # Most common - using Stacker.News ID
    # return item.get('url', '')      # Alternative - using URL as ID
    # return f"{item.get('title', '')}{item.get('url', '')}"  # Alternative - title+url

# 3. MODIFIED POSTING FUNCTION - Replace your existing posting function with this
def post_to_nostr_safe(item):
    """
    Replace your current posting function with this one
    """
    # Load posted items
    posted_items = load_posted_items("posted.txt")
    
    # Get item ID (must match Twitter implementation)
    item_id = get_item_id(item)
    
    # Check if already posted
    if item_id in posted_items:
        print(f"Skipping already posted item: {item.get('title', 'Unknown')[:50]}...")
        return False
    
    try:
        # Call your existing Nostr posting logic
        success = post_to_nostr_original(item)  # Rename your current function to this
        
        if success:
            # Add to posted items and save
            posted_items.add(item_id)
            save_posted_items(posted_items, "posted.txt")
            print(f"✓ Posted to Nostr: {item.get('title', 'Unknown')[:50]}...")
            return True
        else:
            print(f"✗ Failed to post to Nostr: {item.get('title', 'Unknown')[:50]}...")
            return False
            
    except Exception as e:
        print(f"Error posting to Nostr: {e}")
        return False

# 4. YOUR EXISTING FUNCTIONS - Keep all your existing Nostr functions here
# But rename your main posting function to avoid conflicts

def post_to_nostr_original(item):
    """
    Your existing Nostr posting logic goes here
    (rename your current posting function to this)
    """
    # ... your existing Nostr posting code ...
    pass

# ... rest of your existing functions ...

# 5. MAIN EXECUTION - Update your main loop to use the new function
if __name__ == "__main__":
    # Your existing code, but replace calls to your old posting function
    # with calls to post_to_nostr_safe(item)
    pass

# Load private key from environment variable or fallback
NOSTR_PRIVATE_KEY = os.environ.get("NOSTR_PRIVATE_KEY", "nsec12345")
NOSTR_RELAYS = [
    "wss://relay.damus.io",
    "wss://nostr.easydns.ca",
    "wss://relay.snort.social",
    "wss://relay.nsecbunker.com",
    "wss://relay.primal.net",
    "wss://nos.lol",
    "wss://bitcoiner.social",
    "wss://nostr.land",
    "wss://nostr.wine",
    "wss://purplerelay.com"
]

POSTED_CACHE = "posted.txt"

def load_posted_cache():
    if not os.path.exists(POSTED_CACHE):
        return set()
    with open(POSTED_CACHE, "r") as f:
        lines = [line.strip() for line in f if line.strip()]
    return set(lines)

def save_posted_cache(posted_set):
    with open(POSTED_CACHE, "w") as f:
        for link in posted_set:
            f.write(link + "\n")

class NostrPoster:
    def __init__(self, privkey, relays):
        self.privkey = privkey
        self.relays = relays
        self.pk = PrivateKey.from_nsec(privkey)
        self.relay_manager = RelayManager()
        for relay in relays:
            self.relay_manager.add_relay(relay)
        time.sleep(1.25)

    def build_nostr_entry(self, entry):
        return f"@{entry['author']} just posted {entry['title']} in #Design. Check it out at {entry['link']}"

    def post(self, entry, posted_set=None):
        link = entry.get('link')
        if not link:
            print("No link in entry, skipping.")
            return False
        if posted_set is not None and link in posted_set:
            print(f"Already posted: {link}")
            return False
        try:
            out_str = self.build_nostr_entry(entry)
            event = Event(out_str)
            event.sign(self.pk.hex())
            self.relay_manager.publish_event(event)
            self.relay_manager.run_sync()
            print(f"Posted to Nostr: {out_str}")
            if posted_set is not None:
                posted_set.add(link)
                save_posted_cache(posted_set)
            return True
        except Exception as e:
            print(f"Submitting to Nostr failed: {e}")
            return False

    def close(self):
        self.relay_manager.close_connections()

if __name__ == "__main__":
    import sys
    import json
    posted = load_posted_cache()
    if len(sys.argv) > 1:
        entry = json.loads(sys.argv[1])
        poster = NostrPoster(NOSTR_PRIVATE_KEY, NOSTR_RELAYS)
        poster.post(entry, posted)
        poster.close()
    else:
        print("Usage: python3 nostr.py '{\"title\":...,\"link\":...,\"author\":...}'")
