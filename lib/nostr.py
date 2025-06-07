import os
import json
import time
from datetime import datetime
from pynostr.event import Event
from pynostr.relay_manager import RelayManager
from pynostr.key import PrivateKey

# Configuration
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

POSTED_CACHE_FILE = "posted.txt"

# Duplicate Prevention Functions
def load_posted_items(posted_file=POSTED_CACHE_FILE):
    """Load posted items from cache file"""
    if not os.path.exists(posted_file):
        return set()
    
    try:
        with open(posted_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return set()
            
            # Try JSON format first
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    return set(data)
                elif isinstance(data, dict) and 'posted_items' in data:
                    return set(data['posted_items'])
            except json.JSONDecodeError:
                pass
            
            # Fallback to line-by-line format
            return set(line.strip() for line in content.split('\n') if line.strip())
            
    except Exception as e:
        print(f"Error loading posted items: {e}")
        return set()

def save_posted_items(posted_items, posted_file=POSTED_CACHE_FILE):
    """Save posted items to cache file"""
    try:
        data = {
            'posted_items': list(posted_items),
            'last_updated': datetime.now().isoformat()
        }
        with open(posted_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving posted items: {e}")

def get_item_id(entry):
    """Generate unique ID for an entry - matches the data structure from Stacker.News"""
    # Using link as the primary identifier since it's most reliable for Stacker.News posts
    if 'link' in entry and entry['link']:
        return entry['link']
    elif 'url' in entry and entry['url']:
        return entry['url']
    elif 'id' in entry:
        return str(entry['id'])
    else:
        # Fallback: create ID from title + timestamp
        title = entry.get('title', 'untitled')
        return f"{title}_{int(time.time())}"

class NostrPoster:
    """Main class for posting to Nostr network"""
    
    def __init__(self, privkey=None, relays=None):
        self.privkey = privkey or NOSTR_PRIVATE_KEY
        self.relays = relays or NOSTR_RELAYS
        
        try:
            self.pk = PrivateKey.from_nsec(self.privkey)
        except Exception as e:
            print(f"Error loading private key: {e}")
            raise
            
        self.relay_manager = RelayManager()
        
        # Add relays
        for relay in self.relays:
            try:
                self.relay_manager.add_relay(relay)
            except Exception as e:
                print(f"Warning: Could not add relay {relay}: {e}")
        
        # Give relays time to connect
        time.sleep(1.25)

    def build_nostr_message(self, entry):
        """Build the message content for Nostr - matches Twitter template exactly"""
        return f"@{entry['author']} just posted \"{entry['title']}\" in #Design. Check it out at {entry['link']}/r/deSign_r"

    def post_item(self, entry):
        """Post a single item to Nostr with duplicate checking"""
        # Load posted items cache
        posted_items = load_posted_items()
        
        # Get item ID
        item_id = get_item_id(entry)
        
        # Check if already posted
        if item_id in posted_items:
            title = entry.get('title', 'Unknown')[:50]
            print(f"Skipping already posted item: {title}...")
            return False
        
        try:
            # Build message using exact Twitter template
            message = self.build_nostr_message(entry)
            
            # Create and sign event
            event = Event(message)
            event.sign(self.pk.hex())
            
            # Publish to relays with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    self.relay_manager.publish_event(event)
                    self.relay_manager.run_sync()
                    break
                except Exception as relay_error:
                    if attempt == max_retries - 1:
                        raise relay_error
                    print(f"Relay attempt {attempt + 1} failed, retrying...")
                    time.sleep(1)
            
            # Add to posted items and save cache
            posted_items.add(item_id)
            save_posted_items(posted_items)
            
            title = entry.get('title', 'Unknown')[:50]
            print(f"✓ Posted to Nostr: {title}...")
            print(f"  Message: {message}")
            
            return True
            
        except Exception as e:
            title = entry.get('title', 'Unknown')[:50]
            print(f"✗ Failed to post to Nostr: {title}...")
            print(f"  Error: {e}")
            return False

    def post_multiple_items(self, entries):
        """Post multiple items with delay between posts"""
        if not entries:
            print("No items to post")
            return
        
        posted_count = 0
        skipped_count = 0
        
        for i, entry in enumerate(entries):
            print(f"\nProcessing item {i+1}/{len(entries)}...")
            
            success = self.post_item(entry)
            if success:
                posted_count += 1
                # Add delay between posts to avoid rate limiting
                if i < len(entries) - 1:  # Don't delay after last item
                    time.sleep(2)
            else:
                skipped_count += 1
        
        print(f"\n--- Summary ---")
        print(f"Posted: {posted_count}")
        print(f"Skipped: {skipped_count}")
        print(f"Total processed: {len(entries)}")

    def close(self):
        """Close relay connections"""
        try:
            self.relay_manager.close_connections()
        except Exception as e:
            print(f"Error closing connections: {e}")

# Convenience functions for backward compatibility
def post_to_nostr(entry):
    """Simple function to post a single item"""
    poster = NostrPoster()
    try:
        success = poster.post_item(entry)
        return success
    finally:
        poster.close()

def post_multiple_to_nostr(entries):
    """Simple function to post multiple items"""
    poster = NostrPoster()
    try:
        poster.post_multiple_items(entries)
    finally:
        poster.close()

# Main execution for command line usage
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Single item: python3 nostr.py '{\"title\":\"...\",\"link\":\"...\",\"author\":\"...\"}'")
        print("  JSON file:   python3 nostr.py --file items.json")
        sys.exit(1)
    
    try:
        if sys.argv[1] == "--file":
            # Load items from JSON file
            if len(sys.argv) < 3:
                print("Error: Please specify JSON file path")
                sys.exit(1)
            
            with open(sys.argv[2], 'r', encoding='utf-8') as f:
                entries = json.load(f)
            
            if not isinstance(entries, list):
                entries = [entries]
            
            post_multiple_to_nostr(entries)
            
        else:
            # Single item from command line argument
            entry = json.loads(sys.argv[1])
            success = post_to_nostr(entry)
            sys.exit(0 if success else 1)
            
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format: {e}")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"Error: File not found: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
