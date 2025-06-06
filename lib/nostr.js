import fetch from 'node-fetch'
import { schnorr } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'

function hexToBytes(hex) {
  if (hex.startsWith('0x')) hex = hex.slice(2)
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function getPublicKey(privKeyHex) {
  const priv = hexToBytes(privKeyHex)
  return bytesToHex(schnorr.getPublicKey(priv))
}

function getEventHash(event) {
  const ev = [0, event.pubkey, event.created_at, event.kind, event.tags, event.content]
  return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(ev))))
}

function signEvent(event, privKeyHex) {
  const hash = getEventHash(event)
  const priv = hexToBytes(privKeyHex)
  const sig = schnorr.sign(hash, priv)
  return bytesToHex(sig)
}

export default class Nostr {
  static globalInstance = null
  constructor ({ relays } = {}) {
    this.relays = relays || []
    this.privKey = process.env.NOSTR_PRIVATE_KEY?.replace(/^nsec/, '')
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
    const privKeyHex = (signer || this.privKey).replace(/^nsec/, '')
    const pubkey = getPublicKey(privKeyHex)
    const event = {
      kind,
      created_at,
      content,
      tags,
      pubkey
    }
    event.id = getEventHash(event)
    event.sig = signEvent(event, privKeyHex)
    const payload = { ...event, relays: relays || this.relays }
    const res = await fetch('https://nostrhttp.com/event', {
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
