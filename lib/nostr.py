import os
import time
from pynostr.event import Event
from pynostr.relay_manager import RelayManager
from pynostr.key import PrivateKey

# Load private key from environment variable or fallback
NOSTR_PRIVATE_KEY = os.environ.get("NOSTR_PRIVATE_KEY", "nsec12345")
NOSTR_RELAYS = [
    "wss://relay.damus.io",
    "wss://nostr.easydns.ca",
    "wss://relay.snort.social",
    "wss://relay.nsecbunker.com",
    "wss://relay.primal.net",
    "wss://nos-lol",
    "wss://bitcoiner-social",
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
        return f"@{entry['author']} just posted {entry['title']} in #Design. Check out now {entry['link']}"

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
