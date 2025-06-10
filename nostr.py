import os
import time
import random
from pynostr.event import Event
from pynostr.relay_manager import RelayManager
from pynostr.key import PrivateKey

# Load private key from environment variable or fallback
NOSTR_PRIVATE_KEY = os.environ.get("NOSTR_PRIVATE_KEY", "nsec12345")
NOSTR_RELAYS = [
    "wss://relay.nsecbunker.com",
    "wss://relay.damus.io",
    "wss://nostr.easydns.ca",
    "wss://relay.snort.social",
    "wss://relay.nsecbunker.com",
    "wss://relay.primal.net",
    "wss://nos.lol",
    "wss://bitcoiner.social",
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
        # Use the message if provided, else use random template
        if 'message' in entry and entry['message']:
            return entry['message']
        
        author = entry['author']
        title = entry['title']
        link = entry['link']
        
        templates = [
            # 1. Creative mastery & artistic focus
            f"@{author} shares \"{title}\" - another step toward #creative mastery. Explore its #design & #creativity: {link}",
            
            # 2. Design innovation angle  
            f"New creation from @{author}: \"{title}\". Crafting the future of visual expression. Discover #design & #creativity. {link}",
            
            # 3. Minimalist design theme
            f"@{author} contributes \"{title}\" to the minimal conversation. Less is more, #simplicity is law. #KISS Experience with #design & #creativity: {link}",
            
            # 4. Artistic craftsmanship emphasis
            f"\"{title}\" by @{author} - because authentic #creativity isn't negotiable, that's the true #art of #design. {link}",
            
            # 5. Traditional design ethos
            f"@{author} drops wisdom: \"{title}\". #Timeless principles in action. Embrace #design & #creativity. {link}",
            
            # 6. Creative rebellion
            f"New vision from @{author}: \"{title}\". Building unforgettable #experiences, one #design at a time with #creativity. {link}",
            
            # 7. Design activism
            f"@{author} presents \"{title}\" - the future belongs to those who create it. Beautiful work of #design & #creativity. {link}",
            
            # 8. Creative sovereignty
            f"\"{title}\" crafted by @{author}. Breaking conventions apart, one #design at a time, with #creativity. {link}",
            
            # 9. Seasonal design focus
            f"@{author} unveils \"{title}\" - embracing inspiration. Marvel #design & #creativity: {link}",
            
            # 10. Design innovation
            f"Fresh approach from @{author}: \"{title}\". Revolutionizing the #creative landscape. Discover #design & #creativity; {link}",
            
            # 11. Color mastery theme
            f"@{author} colors the world with \"{title}\" - with passion. See the magic of #design & #creativity. {link}",
            
            # 12. Typography craft
            f"\"{title}\" by @{author} - because good things speaks volumes without words. Experience clarity with #design & #creativity: {link}",
            
            # 13. Street art culture
            f"@{author} brings wisdom: \"{title}\". Authentic at its finest. Get inspired by its #design & #creativity: {link}",
            
            # 14. Digital art fusion
            f"New experiment from @{author}: \"{title}\". Technology meets beauty. Mind-bending #design & #creativity: {link}",
            
            # 15. Retro design revival
            f"@{author} revives nostalgia with \"{title}\" - never looked so fresh. Feel inspired by its #design & #creativity: {link}",
            
            # 16. Sustainable design
            f"\"{title}\" crafted by @{author}. Waste nothing purposefully. Conscious creation for #design & #creativity. {link}",
            
            # 17. Bold and experimental
            f"@{author} pushes boundaries with \"{title}\" - where #bold becomes beautiful. Ignite your imagination, #design & #creativity: {link}",
            
            # 18. User experience focus
            f"Fresh insight from @{author}: \"{title}\". The ancient arts lives on. Explore #design & #creativity: {link}",
            
            # 19. Brand identity perfection
            f"@{author} shapes \"{title}\" - crafts tells stories. Connect with purpose, #design & #creativity: {link}",
            
            # 20. Design thinking
            f"\"{title}\" conceived by @{author} - capturing #ideas in visual form. Brilliant thinking awaits #design & #creativity: {link}",
            
            # 21. Motion design magic
            f"@{author} shares \"{title}\" - bringing beauty to life. Dynamic #design & #creativity. {link}",
            
            # 22. Illustration artistry
            f"Insight from @{author}: \"{title}\". Growing your soul. A bliss for #design & #creativity: {link}",
            
            # 23. Web design alchemy
            f"@{author} codes \"{title}\" - digital #alchemy in browser windows. #design & #creativity at work:  {link}",
            
            # 24. Print design mastery
            f"\"{title}\" typed by @{author}. Starting conversations with brilliance always works. Tasteful #design & #creativity: {link}",
            
            # 25. Photography composition
            f"@{author} captures life with \"{title}\" - where words becomes sculpture, framing responsibly with #design & #creativity: {link}",
            
            # 26. Packaging innovation
            f"Smart one from @{author}: \"{title}\". Protects what words cannot. Function meets #design & #creativity: {link}",
            
            # 27. Logo design mastery
            f"@{author} symbolizes \"{title}\" - taming #ideas for perfect marks. Identify #design & #creativity: {link}",
            
            # 28. Design tools focus
            f"\"{title}\" crafted by @{author}. Sharp #tools, sharper techniques, sharpest results. Precision work for #design & #creativity: {link}",
            
            # 29. Creative process
            f"@{author} documents \"{title}\" - every #process tells #creative stories. Behind the scenes of #design & #creativity. {link}",
            
            # 30. Design inspiration
            f"Inspiring work from @{author}: \"{title}\". #Inspiration connects minds across centuries with #design & #creativity. {link}",
            
            # 31. Product design craft
            f"@{author} craft \"{title}\" - respecting every #function with purpose, improving #design & #creativity. {link}",
            
            # 32. Design trends
            f"\"{title}\" by @{author}. Modern #trends meet timeless principles. Stylish evolution for #design & #creativity: {link}",
            
            # 33. Creative collaboration
            f"@{author} shares \"{title}\" - in perfect harmony. Magic for #design & #creativity: {link}",
            
            # 34. Visual storytelling
            f"Fresh from @{author}: \"{title}\". #Stories are visual journeys on screens. A Narrative for #design & #creativity. {link}",
            
            # 35. Design critique wisdom
            f"@{author} analyzes \"{title}\" - where #critique meets growth in harmony. Perfect feedback for #design & #creativity:  {link}",
            
            # 36. Creative revelation
            f"\"{title}\" revealed by @{author}. Inspiration transforms hidden beauty. Pure brilliance for #design & #creativity.  {link}",
            
            # 37. Design research
            f"@{author} researches \"{title}\" - evidence-based #design tells informed stories. Data-driven beauty to #inspire #creativity:  {link}",
            
            # 38. Prototyping techniques
            f"Wisdom from @{author}: \"{title}\". Fast and loose #prototyping builds character. Progress revealed for #design & #creativity. {link}",
            
            # 39. Design systems
            f"@{author} posted \"{title}\" - where #consistency meets scalable creativity. Organized beauty for #design. {link}",
            
            # 40. Creative fusion
            f"\"{title}\" fused by @{author}. Disciplines collide, creating #innovation magic in #pixels. Boundary breaking #design & #creativity. {link} ",
            
            # 41. Aesthetic exploration
            f"@{author} explores \"{title}\" - chasing the perfect #aesthetic through depths. Visual secrets for #design & #creativity. {link}",
            
            # 42. Design presentation
            f"Vision from @{author}: \"{title}\". #Presentation transforms ideas into poetry. Persuasive #art for #design & #creativity. {link}",
            
            # 43. Creative morning routine
            f"@{author} starts with \"{title}\" - morning wrapped in inspired dreams. Fresh perspective for #design & #creativity:  {link}",
            
            # 44. Late night designing
            f"\"{title}\" by @{author} for midnight #inspiration that demands expression. Creative dedication for #design & #creativity: {link}"
        ]
        
        # Randomly select a template
        return random.choice(templates)

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
