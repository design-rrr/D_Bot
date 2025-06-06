import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'
import fs from 'fs'
import { TwitterApi } from 'twitter-api-v2'
import Nostr from './lib/nostr.js' // assume this is your nostr wrapper like in SN code

dotenv.config()

const RSS_URL = 'https://stacker.news/~HealthAndFitness/rss'
const POSTED_CACHE = './posted.json'
const RELAYS = [
  'wss://nos.lol/', 'wss://nostr.land/', 'wss://nostr.wine/',
  'wss://purplerelay.com/', 'wss://relay.damus.io/',
  'wss://relay.snort.social/', 'wss://relay.nostr.band/',
  'wss://relay.primal.net/'
]

function loadPostedCache() {
  if (!fs.existsSync(POSTED_CACHE)) return []
  return JSON.parse(fs.readFileSync(POSTED_CACHE)).posted
}

function savePostedCache(posted) {
  fs.writeFileSync(POSTED_CACHE, JSON.stringify({ posted }, null, 2))
}

async function getRSSItems() {
  const res = await fetch(RSS_URL)
  const xml = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return items.map(m => {
    const block = m[1]
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]
    const title = block.match(/<title>(.*?)<\/title>/)?.[1]
    return { link, title }
  })
}

async function getPostBody(link) {
  const res = await fetch(link)
  const html = await res.text()
  const $ = cheerio.load(html)
  // Select the main article body by class name
  const article = $('div.article.item_fullItemContainer__ZAYtZ')
  let text = ''
  if (article.length) {
    // Get all text inside the article div
    text = article.text().trim()
  } else {
    // fallback: try the old selector if needed
    text = $('article.item_fullItemContainer__ZAYtZ').text().trim()
  }
  return text
}

function extractHandles(text) {
  // Look for handles at the end of the article body
  // Accepts lines like: 'X: @username' and 'Nostr: npub1...'
  let npub = null, twitter = null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (!npub) {
      const m = line.match(/Nostr:\s*(npub1[a-z0-9]+)/i)
      if (m) npub = m[1]
    }
    if (!twitter) {
      const m = line.match(/X:\s*@?([a-zA-Z0-9_]+)/i)
      if (m) twitter = m[1]
    }
    if (npub && twitter) break
  }
  return { npub, twitter }
}

async function postToTwitter({ title, link, twitter, body }) {
  if (!process.env.TWITTER_POSTER_API_KEY) return console.log('Twitter not configured')
  const client = new TwitterApi({
    appKey: process.env.TWITTER_POSTER_API_KEY,
    appSecret: process.env.TWITTER_POSTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_POSTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_POSTER_ACCESS_TOKEN_SECRET
  })
  let message = `${title}\n${link}`
  if (twitter) message = `${title}\nby @${twitter}\n${link}`
  // Optionally add a short excerpt from the body
  if (body) {
    const excerpt = body.split('\n').slice(0, 2).join(' ')
    if (excerpt && !message.includes(excerpt)) {
      message = `${title}\n${excerpt}\n${link}`
      if (twitter) message = `${title}\n${excerpt}\nby @${twitter}\n${link}`
    }
  }
  // Twitter/X limit: 280 chars
  if (message.length > 280) message = message.slice(0, 277) + '...'
  await client.v2.tweet(message)
  console.log('Tweeted:', message)
}

async function postToNostr({ title, link, npub, body }) {
  if (!process.env.NOSTR_PRIVATE_KEY) return console.log('Nostr not configured')
  const nostr = Nostr.get()
  const signer = nostr.getSigner({ privKey: process.env.NOSTR_PRIVATE_KEY })
  let content = `${title}\n${link}`
  if (body) {
    const excerpt = body.split('\n').slice(0, 2).join(' ')
    if (excerpt && !content.includes(excerpt)) {
      content = `${title}\n${excerpt}\n${link}`
    }
  }
  if (npub) content = `${content}\nnostr:${npub}`
  const tags = npub ? [['p', npub]] : []
  await nostr.publish({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags
  }, { relays: RELAYS, signer, timeout: 5000 })
  console.log('Posted to Nostr:', content)
}

export async function runHnfBot() {
  const posted = new Set(loadPostedCache())
  const items = await getRSSItems()

  for (const item of items) {
    if (!item.link || posted.has(item.link)) continue
    const body = await getPostBody(item.link)
    const { npub, twitter } = extractHandles(body)
    await postToTwitter({ title: item.title, link: item.link, twitter, body })
    await postToNostr({ title: item.title, link: item.link, npub, body })
    posted.add(item.link)
  }

  savePostedCache([...posted])
  console.log('✅ Done.')
}

// Run directly
if (process.argv[1].includes('hnfPoster.js')) {
  runHnfBot()
}
