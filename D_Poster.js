import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { TwitterApi } from 'twitter-api-v2'
import { spawn } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const RSS_URL = 'https://stacker.news/~Design/rss'
const GIST_ID = process.env.GIST_ID
const GIST_FILENAME = 'posted.txt'
const GIST_TOKEN = process.env.GIST_TOKEN

// Debug: Check if GIST_ID and GIST_TOKEN are loaded
if (!GIST_ID || !GIST_TOKEN) {
  console.error('Missing GIST_ID or GIST_TOKEN!')
  console.error('GIST_ID:', GIST_ID)
  console.error('GIST_TOKEN:', GIST_TOKEN ? '[set]' : '[not set]')
  process.exit(1)
}

async function loadPostedCache() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `token ${GIST_TOKEN}` }
  })
  if (!res.ok) throw new Error('Failed to fetch Gist')
  const data = await res.json()
  const content = data.files[GIST_FILENAME]?.content || ''
  return new Set(content.split('\n').map(l => l.trim()).filter(Boolean))
}

async function savePostedCache(postedSet) {
  const body = {
    files: {
      [GIST_FILENAME]: { content: Array.from(postedSet).join('\n') + '\n' }
    }
  }
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${GIST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error('Failed to update Gist')
}

async function getRSSItems() {
  const res = await fetch(RSS_URL)
  const xml = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  return items.map(m => {
    const block = m[1]
    const link = block.match(/<guid>(.*?)<\/guid>/)?.[1]?.trim()
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim()
    const author = block.match(/<atom:author>[\s\S]*?<atom:name>([\s\S]*?)<\/atom:name>[\s\S]*?<\/atom:author>/)?.[1]?.trim()
      || block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/)?.[1]?.trim()
      || 'Someone'
    return { link, title, author }
  })
}

function getRandomMessageFormat({ title, link, author }) {
  const formats = [
   // 1. Original
    () => `@${author} just posted \"${title}\". Triggering #DesignThinking. Read more ${link}`,
    // 2. Variation 2
    () => `You should not miss @${author} posting \"${title}\"... #DesignInspiration. Click ${link}`,
    // 3. Variation 3
    () => `This is really an active post \"${title}\" by @${author} in #Design. Join in at ${link}`,
    // 4. Variation 4
    () => `Curious to know about \"${title}\" by @${author} in #Design, triggeting #creativity. Learn more ${link}`,

   // 1. Creative mastery & artistic focus
  () => `@${author} shares \"${title}\" - another step toward #creative mastery. Explore #design & #innovation: ${link}`,

  // 2. Design innovation angle  
  () => `New creation from @${author}: \"${title}\". Crafting the future of visual expression. Discover #design & #creativity. ${link}`,
  
  // 3. Minimalist design theme
  () => `@${author} contributes \"${title}\" to the minimal conversation. Less is more, #simplicity is law. #KISS Experience with #designThinking & #creativity: ${link}`,
    
  // 4. Artistic craftsmanship emphasis
  () => `\"${title}\" by @${author} - because authentic #creativity isn't negotiable, that's the true #art of #design. ${link}`,
  
  // 5. Traditional design ethos
  () => `@${author} drops wisdom: \"${title}\". #Timeless principles in action. Embrace the #creative #designCommunity on #StackerNews. ${link}`,
  
  // 6. Creative rebellion
  () => `New vision from @${author}: \"${title}\". Building unforgettable #experiences, one #design at a time with #creativity. ${link}`,

  // 7. Design activism
  () => `@${author} presents \"${title}\" - the future belongs to those who create it. Beautiful work of #design & #creativity. ${link}`,

  // 8. Creative sovereignty
  () => `\"${title}\" crafted by @${author}. Breaking conventions apart, one #design at a time, with #creativity. ${link}`,

  // 9. Seasonal design focus
  () => `@${author} unveils \"${title}\" - embracing inspiration. Marvel #design & #creativity: ${link}`,

  // 10. Design innovation
  () => `Fresh approach from @${author}: \"${title}\". Revolutionizing the #creative landscape. Discover #design & #creativity; ${link}`,

  // 11. Color mastery theme
  () => `@${author} colors the world with \"${title}\" - with passion. See the magic of #design & #creativity. ${link}`,

  // 12. Typography craft
  () => `\"${title}\" by @${author} - because good things speaks volumes without words. Experience clarity with #design & #creativity: ${link}`,

  // 13. Street art culture
  () => `@${author} brings wisdom: \"${title}\". Authentic at its finest. Get inspired by its #designThinking: ${link}`,

  // 14. Digital art fusion
  () => `New experiment from @${author}: \"${title}\". Technology meets beauty. Mind-bending #design & #creativity: ${link}`,

  // 15. Retro design revival
  () => `@${author} revives nostalgia with \"${title}\" - never looked so fresh. Feel inspired by its #designInspiration & #creativity: ${link}`,

  // 16. Sustainable design
  () => `\"${title}\" crafted by @${author}. Waste nothing purposefully. Conscious creation for #design & #creativity. ${link}`,
  
  // 17. Bold and experimental
  () => `@${author} pushes boundaries with \"${title}\" - where #bold becomes beautiful. Ignite your imagination, #design & #creativity: ${link}`,
  
  // 18. User experience focus
  () => `Fresh insight from @${author}: \"${title}\". The ancient arts lives on. Explore #design & #creativity: ${link}`,
  
  // 19. Brand identity perfection
  () => `@${author} shapes \"${title}\" - crafts tells stories. Connect with purpose, #designtips & #creativity: ${link}`,

  // 20. Design thinking
  () => `\"${title}\" conceived by @${author} - capturing #ideas in visual form. Brilliant thinking awaits #design & #creativity: ${link}`,

  // 21. Motion design magic
  () => `@${author} shares \"${title}\" - bringing beauty to life. Dynamic #design & #creativity. ${link}`,

  // 22. Illustration artistry
  () => `Insight from @${author}: \"${title}\". Growing your soul. A bliss for #creative #design: ${link}`,

  // 23. Web design alchemy
  () => `@${author} codes \"${title}\" - digital #alchemy in browser windows. #design & #creativity at work:  ${link}`,

  // 24. Print design mastery
  () => `\"${title}\" typed by @${author}. Starting conversations with brilliance always works. Tasteful #design & #creativity: ${link}`,

  // 25. Photography composition
  () => `@${author} captures life with \"${title}\" - where words becomes sculpture, framing responsibly with #design & #creativity: ${link}`,

  // 26. Packaging innovation
  () => `Smart one from @${author}: \"${title}\". Protects what words cannot. Function meets #designtips & #creativity: ${link}`,

  // 27. Logo design mastery
  () => `@${author} symbolizes \"${title}\" - taming #ideas for perfect marks. Identify #design #thinking: ${link}`,

  // 28. Design tools focus
  () => `\"${title}\" crafted by @${author}. Sharp #tools, sharper techniques, sharpest results. Precision work for #design & #creativity: ${link}`,

  // 29. Creative process
  () => `@${author} documents \"${title}\" - every #process tells #creative stories. Behind the scenes of #design & #creativity. ${link}`,

  // 30. Design inspiration
  () => `Inspiring work from @${author}: \"${title}\". #Inspiration connects minds across centuries with #creative #design. ${link}`,

  // 31. Product design craft
  () => `@${author} craft \"${title}\" - respecting every #function with purpose, improving #designtips & #creativity. ${link}`,

  // 32. Design trends
  () => `\"${title}\" by @${author}. Modern #trends meet timeless principles. Stylish evolution for #design & #creativity: ${link}`,

  // 33. Creative collaboration
  () => `@${author} shares \"${title}\" - in perfect harmony. Magic for #design & #creativity: ${link}`,

  // 34. Visual storytelling
  () => `Fresh from @${author}: \"${title}\". #Stories are visual journeys on screens. A Narrative for #designtips & #creativity. ${link}`,
    
  // 35. Design critique wisdom
  () => `@${author} analyzes \"${title}\" - where #critique meets growth in harmony. Perfect feedback for #designer & #creative #people:  ${link}`,

  // 36. Creative revelation
  () => `\"${title}\" revealed by @${author}. Inspiration transforms hidden beauty. Pure brilliance for #design & #creativity.  ${link}`,

  // 37. Design research
  () => `@${author} researches \"${title}\" - evidence-based #design tells informed stories. Data-driven beauty to #inspire #creativity:  ${link}`,

  // 38. Prototyping techniques
  () => `Wisdom from @${author}: \"${title}\". Fast and loose #prototyping builds character. Progress revealed for #designtips & #creativity. ${link}`,

  // 39. Design systems
  () => `@${author} posted \"${title}\" - where #consistency meets scalable #creativity. Organized beauty for #designThinking. ${link}`,

  // 40. Creative fusion
  () => `\"${title}\" fused by @${author}. Disciplines collide, creating #innovation magic in #pixels. Boundary breaking #design & #creativity. ${link} `,

  // 41. Aesthetic exploration
  () => `@${author} explores \"${title}\" - chasing the perfect #aesthetic through depths. Visual secrets for #design & #creativity. ${link}`,
  
  // 42. Design presentation
  () => `Vision from @${author}: \"${title}\". #Presentation transforms ideas into poetry. Persuasive #art for #designer & #cretive #brains. ${link}`,

  // 43. Creative morning routine
  () => `@${author} starts with \"${title}\" - morning wrapped in inspired dreams. Fresh perspective for #minimalism #designer:  ${link}`,

    // 44. Late night designing
  () => `\"${title}\" by @${author} for midnight #inspiration that demands expression. #Creative dedication for #designCommunity ${link}` 

  ]
  const idx = Math.floor(Math.random() * formats.length)
  return formats[idx]()
}

async function postToTwitter({ title, link, author }) {
  if (!process.env.TWITTER_POSTER_API_KEY) return console.log('Twitter not configured')
  const client = new TwitterApi({
    appKey: process.env.TWITTER_POSTER_API_KEY,
    appSecret: process.env.TWITTER_POSTER_API_KEY_SECRET,
    accessToken: process.env.TWITTER_POSTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_POSTER_ACCESS_TOKEN_SECRET
  })
  
  const fullLink = link.endsWith('/r/deSign_r') ? link : link + '/r/deSign_r'
  let message = getRandomMessageFormat({ title, link: fullLink, author })
  if (message.length > 280) message = message.slice(0, 277) + '...'
  await client.v2.tweet(message)
  console.log('Tweeted:', message)
}

async function postToNostr({ title, link, author }) {
  // Always resolve nostr.py relative to this file (project root)
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const scriptPath = resolve(__dirname, 'nostr.py')
  return new Promise((resolve, reject) => {
    // Append /r/deSign_r to the link
    const fullLink = link.endsWith('/r/deSign_r') ? link : link + '/r/deSign_r'
    // Use the same random message format for Nostr as for Twitter
    const message = getRandomMessageFormat({ title, link: fullLink, author })
    const entry = JSON.stringify({
      title,
      link: fullLink,
      author,
      message,
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

export async function runDBot() {
  const posted = await loadPostedCache()
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
      await savePostedCache(posted)
    }
    // Wait 210 seconds before next post
    await new Promise(res => setTimeout(res, 210000))
  }
  console.log('✅ Done.')
}

if (process.argv[1].includes('D_Poster.js')) {
  runDBot()
}
