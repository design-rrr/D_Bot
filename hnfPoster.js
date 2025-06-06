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
  const paragraphs = $('article.item_fullItemContainer__ZAYtZ')
  let text = ''
  paragraphs.each((_, p) => {
    text += $(p).text().trim() + '\n'
  })
  return text.trim()
}

function extractHandles(text) {
  const nostrMatch = text.match(/Nostr:\s*(npub1[a-z0-9]+)/i)
  const twitterMatch = text.match(/X:\s*@?([a-zA-Z0-9_]+)/i)
  return {
    npub: nostrMatch?.[1] || null,
    twitter: twitterMatch?.[1] || null
  }
}

async function postToTwitter({ title, link, twitter }) {
  if (!process.env.TWITTER_POSTER_API_KEY) return console.log('Twitter not configured')
  const client = new TwitterApi({
    appKey: process.env.TWITTER_POSTER_API_KEY,
    appSecret: process.env.TWITTER_POSTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_POSTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_POSTER_ACCESS_TOKEN_SECRET
  })
  const tag = twitter ? `by @${twitter}` : ''
  const message = `${title}\n${tag}\n${link}`
  await client.v2.tweet(message)
  console.log('Tweeted:', message)
}

async function postToNostr({ title, link, npub }) {
  if (!process.env.NOSTR_PRIVATE_KEY) return console.log('Nostr not configured')
  const nostr = Nostr.get()
  const signer = nostr.getSigner({ privKey: process.env.NOSTR_PRIVATE_KEY })
  const content = `${title}\n${npub ? `nostr:${npub}\n` : ''}${link}`
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
    await postToTwitter({ title: item.title, link: item.link, twitter })
    await postToNostr({ title: item.title, link: item.link, npub })
    posted.add(item.link)
  }

  savePostedCache([...posted])
  console.log('✅ Done.')
}

// Run directly
if (process.argv[1].includes('hnfPoster.js')) {
  runHnfBot()
}
