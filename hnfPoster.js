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
  const raw = fs.readFileSync(POSTED_CACHE, 'utf8').trim()
  if (!raw) return []
  try {
    return JSON.parse(raw).posted || []
  } catch (e) {
    console.error('Invalid posted.json, resetting cache.')
    return []
  }
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
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim()
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim()
    // atom:author and atom:name may have namespace, so match with or without prefix
    const author = block.match(/<atom:author>[\s\S]*?<atom:name>([\s\S]*?)<\/atom:name>[\s\S]*?<\/atom:author>/)?.[1]?.trim()
      || block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/)?.[1]?.trim()
      || 'Someone'
    return { link, title, author }
  })
}

async function postToTwitter({ title, link, author }) {
  if (!process.env.TWITTER_POSTER_API_KEY) return console.log('Twitter not configured')
  const client = new TwitterApi({
    appKey: process.env.TWITTER_POSTER_API_KEY,
    appSecret: process.env.TWITTER_POSTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_POSTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_POSTER_ACCESS_TOKEN_SECRET
  })
  let message = `${author} just posted ${title} in ~HealthAndFitness. Check out now ${link}`
  if (message.length > 280) message = message.slice(0, 277) + '...'
  await client.v2.tweet(message)
  console.log('Tweeted:', message)
}

async function postToNostr({ title, link, author }) {
  if (!process.env.NOSTR_PRIVATE_KEY) return console.log('Nostr not configured')
  const nostr = Nostr.get()
  const signer = nostr.getSigner({ privKey: process.env.NOSTR_PRIVATE_KEY })
  let content = `${author} just posted ${title} in ~HealthAndFitness. Check out now ${link}`
  await nostr.publish({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags: []
  }, { relays: RELAYS, signer, timeout: 5000 })
  console.log('Posted to Nostr:', content)
}

export async function runHnfBot() {
  const posted = new Set(loadPostedCache())
  const items = await getRSSItems()

  for (const item of items) {
    if (!item.link || posted.has(item.link)) continue
    await postToTwitter({ title: item.title, link: item.link, author: item.author })
    await postToNostr({ title: item.title, link: item.link, author: item.author })
    posted.add(item.link) // Add the link to the posted set
  }

  savePostedCache([...posted]) // Save all posted links
  console.log('✅ Done.')
}

// Run directly
if (process.argv[1].includes('hnfPoster.js')) {
  runHnfBot()
}
