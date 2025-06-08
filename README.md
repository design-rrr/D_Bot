# HnFBot
A bot that reposts every new ~HealthAndFitness post from Stacker.News to Twitter and Nostr

---

## Promo
**Check out the [~HealthAndFitness territory](https://stacker.news/~HealthAndFitness) on Stacker.News!**
Curated and founded by [@realBitcoinDog](https://stacker.news/realBitcoinDog), it's the best place to discover and discuss health, fitness, and wellness topics with a Bitcoin twist. Join the conversation and share your insights!

---

## Features
- **RSS Fetching** ([getRSSItems](hnfPoster.js)): Parses the ~HealthAndFitness RSS feed and extracts new items, using `<guid>` as the canonical post link.
- **Duplicate Prevention** ([loadPostedCache/savePostedCache](hnfPoster.js)): Tracks posted items in `posted.txt` to avoid reposting the same content.
- **Twitter Posting** ([postToTwitter](hnfPoster.js)): Posts formatted messages to Twitter/X, appending `/r/realBitcoinDog` to each link and handling API credentials securely.
- **Nostr Posting** ([postToNostr](hnfPoster.js), [nostr.py](nostr.py)): Calls a Python subprocess to post to Nostr relays, using the same message format and duplicate prevention.
- **CI/CD & State Persistence**: GitHub Actions workflow (`.github/workflows/hnfbot.yml`) runs the bot on a schedule and persists `posted.txt` between runs using artifacts.
- **Robust Path Handling**: All file and script paths are resolved absolutely for compatibility in local and CI environments.

---

## Setup

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.8+
- Twitter API credentials (developer account)
- Nostr private key

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd HnFBot
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the project root with the following variables:
   ```env
   TWITTER_POSTER_API_KEY=your_twitter_api_key
   TWITTER_POSTER_API_KEY_SECRET=your_twitter_api_secret
   TWITTER_POSTER_ACCESS_TOKEN=your_twitter_access_token
   TWITTER_POSTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
   NOSTR_PRIVATE_KEY=your_nostr_private_key
   ```

---

## Usage

### Local Run
```bash
node hnfPoster.js
```

### GitHub Actions
- The bot is configured to run via `.github/workflows/hnfbot.yml`.
- State is persisted using GitHub Actions artifacts (see workflow file for details).

---

## Troubleshooting
- **Twitter 401/429 errors:**
  - Check that your API credentials are correct and not rate-limited.
  - Twitter developer accounts have strict posting limits (17 posts/day).
- **Nostr errors:**
  - Ensure your NOSTR_PRIVATE_KEY is valid and relays are reachable.
- **posted.txt not updating:**
  - Make sure the bot has write permissions in the working directory.
- **RSS feed not updating:**
  - Check the Stacker.News RSS feed URL and your network connection.

---

## FAQ

**Q: Why does the bot use <guid> instead of <link> for posting?**
A: <guid> always points to the Stacker.News item, which is the canonical post URL. <link> may point to an external article.

**Q: How does the bot avoid duplicate posts?**
A: It tracks posted links in `posted.txt` and skips any already listed.

**Q: Can I run the bot on a schedule?**
A: Yes, use a cron job or GitHub Actions scheduled workflow.

**Q: How do I add more relays for Nostr?**
A: Edit the `NOSTR_RELAYS` list in `nostr.py`.

**Q: How do I rotate API credentials?**
A: Update your `.env` file and GitHub Secrets as needed.

---

## Contributing

1. Fork the repository and create a new branch for your feature or bugfix.
2. Write clear, concise code and add comments where helpful.
3. Add or update tests if applicable.
4. Submit a pull request with a detailed description of your changes.
5. Be respectful and responsive in code reviews.

---

## License
MIT
