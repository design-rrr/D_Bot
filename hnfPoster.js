import fetch from 'node-fetch'
import dotenv from 'dotenv'
import fs from 'fs'
import { TwitterApi } from 'twitter-api-v2'
import { spawn } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const RSS_URL = 'https://stacker.news/~HealthAndFitness/rss'
const POSTED_CACHE = './posted.txt'

function loadPostedCache() {
  if (!fs.existsSync(POSTED_CACHE)) return new Set()
  const raw = fs.readFileSync(POSTED_CACHE, 'utf8').trim()
  if (!raw) return new Set()
  return new Set(raw.split('\n').map(l => l.trim()).filter(Boolean))
}

function savePostedCache(postedSet) {
  fs.writeFileSync(POSTED_CACHE, Array.from(postedSet).join('\n') + '\n')
}

async function getRSSItems() {
  const res = await fetch(RSS_URL)
  const xml = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return items.map(m => {
    const block = m[1]
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim()
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim()
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
  // Use absolute path to nostr.py for CI and local compatibility
  const scriptPath = resolve(process.cwd(), 'nostr.py')
  return new Promise((resolve, reject) => {
    const entry = JSON.stringify({
      title,
      link,
      author,
      tags: [],
    })
    const py = spawn('python3', [scriptPath, entry])
    py.stdout.on('data', data => process.stdout.write(data))
    py.stderr.on('data', data => process.stderr.write(data))
    py.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error('nostr.py failed'))
    })
  })
}

export async function runHnfBot() {
  const posted = loadPostedCache()
  const items = await getRSSItems()

  for (const item of items) {
    if (!item.link || posted.has(item.link)) continue
    let tweeted = false, nostrPosted = false
    try {
      await postToTwitter({ title: item.title, link: item.link, author: item.author })
      tweeted = true
    } catch (e) {
      if (e?.data?.detail?.includes('duplicate')) {
        console.log('Duplicate tweet, skipping X:', item.link)
      } else {
        console.error('Twitter error:', e)
      }
    }
    try {
      await postToNostr({ title: item.title, link: item.link, author: item.author })
      nostrPosted = true
    } catch (e) {
      console.error('Nostr error:', e)
    }
    if (tweeted || nostrPosted) {
      posted.add(item.link)
      savePostedCache(posted)
    }
    // Wait 1 second before next post
    await new Promise(res => setTimeout(res, 1000))
  }
  console.log('✅ Done.')
}

if (process.argv[1].includes('hnfPoster.js')) {
  runHnfBot()
}
