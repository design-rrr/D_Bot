# D_Bot 🤖

Just another Node.js bot that automatically cross-posts design-related content from Stacker News/[~Design](https://stacker.news/~Design/r/deSign_r) to [Twitter](https://x.com/DeSign__r) and [Nostr](https://iris.to/deSign_r), tagging authors if they include their handles. Helping spread design inspiration across multiple social platforms, one note at time.

![75659 copy](https://github.com/user-attachments/assets/6de4e3eb-5c98-4149-813e-090f3ed59c23)

## 🚀 Features

- **Multi-Platform Posting**: Automatically posts to Twitter and Nostr
- **Stacker News Integration**: Monitors Stacker News for #Design tagged posts
- **Real-time Updates**: Uses WebSocket connections for live content monitoring
- **Rate Limit Handling**: Gracefully handles Twitter API rate limits

## 📋 Prerequisites

Before running D_Bot, you'll need:

- Node.js (v18 or higher)
- Twitter API v2 credentials (Bearer Token, API Key, API Secret, Access Token, Access Token Secret)
- Nostr private key for posting. get yours from [Nstart.me](https://nstart.me/)
- Stacker News API access

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/design-rrr/D_Bot.git
   cd D_Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Twitter API Credentials
   TWITTER_BEARER_TOKEN=your_bearer_token
   TWITTER_API_KEY=your_api_key
   TWITTER_API_SECRET=your_api_secret
   TWITTER_ACCESS_TOKEN=your_access_token
   TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
   
   # Nostr Configuration
   NOSTR_PRIVATE_KEY=your_nostr_private_key
   
   # Server Configuration
   PORT=10000
   ```

## 🏃‍♂️ Running the Bot

### Local Development
```bash
node D_Poster.js
```

### Production Deployment
The bot is configured for deployment with the following settings:
- **Build Command**: `npm install`
- **Start Command**: `node D_Poster.js`
- **Environment**: Node.js

## 📁 Project Structure

```
D_Bot/
├── D_Poster.js          # Main application file
├── package.json         # Node.js dependencies
├── .env                 # Environment variables (not in repo)
└── README.md           # This file
```

## 🔧 Configuration

### Twitter API Setup
1. Create a Twitter Developer account
2. Create a new app in the Twitter Developer Portal
3. Generate API keys and tokens
4. Add credentials to your environment variables

### Nostr Setup
1. Generate a Nostr private key
2. Add the private key to your environment variables
3. The bot will automatically derive the public key

### Rate Limits
- **Twitter Basic Plan**: 17 tweets per 24 hours
- **Twitter Basic Paid**: 10,000 tweets per month
- The bot includes automatic rate limit handling

## 📊 How It Works

1. **Monitoring**: The bot connects to Stacker News via WebSocket
2. **Filtering**: Monitors for new posts tagged with #Design
3. **Processing**: Extracts post title, author, and link
4. **Cross-posting**: 
   - Posts to Nostr with formatted message
   - Posts to Twitter (if not rate limited)
5. **Error Handling**: Gracefully handles API errors and rate limits


## ⚠️ Common Issues

### Port Already in Use
If you see `EADDRINUSE` error:
- The bot uses `process.env.PORT` for online deployment compatibility
- Locally defaults to port 10000
- Ensure no other services are using the same port

### Twitter Rate Limits
- Free tier: 17 requests per 24 hours
- Consider upgrading your Twitter API plan for higher limits
- The bot will continue posting to Nostr even when Twitter is rate limited

### Duplicate Function Errors
If you see "already declared" errors:
- Check for duplicate function or variable declarations
- Common culprits: `postToTwitter`, `PORT`, `server` variables

## 🚀 Deployment

1. **Configure Service**:
   - **Environment**: Node.js
   - **Build Command**: `npm install`
   - **Start Command**: `node D_Poster.js`
2. **Set Environment Variables**: Add all required API keys and tokens


## 📈 Monitoring

The bot provides console logging for:
- Successful posts to each platform
- Rate limit notifications
- Error messages and debugging info
- WebSocket connection status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure API credentials are valid and have proper permissions
4. Check rate limits on your Twitter API plan

## 🔗 Related Links

- [Stacker News](https://stacker.news/r/deSign_r)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Nostr Protocol](https://nostr.com)


---

Built with ❤️ for the design community
