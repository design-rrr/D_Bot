import fetch from 'node-fetch'

export default class Nostr {
  static globalInstance = null
  constructor ({ relays } = {}) {
    this.relays = relays || []
    this.privKey = process.env.NOSTR_PRIVATE_KEY
  }

  static get () {
    if (!Nostr.globalInstance) {
      Nostr.globalInstance = new Nostr()
    }
    return Nostr.globalInstance
  }

  getSigner ({ privKey } = {}) {
    return privKey || this.privKey
  }

  async publish ({ kind, created_at, content, tags = [] }, { relays, signer, timeout } = {}) {
    const event = {
      kind,
      created_at,
      content,
      tags
    }
    const payload = {
      event,
      privkey: signer,
      relays: relays || this.relays,
      timeout: timeout || 5000
    }
    const res = await fetch('https://nostrhttp.com/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error('Nostr publish failed: ' + err)
    }
    return await res.json()
  }
}
