/* eslint-disable */
const https = require('https')

const CARDS_API = 'https://blightbane.io/api/cards-codex?search=&rarity=&category=&type=&banner=&exp='
const TALENTS_API = 'https://blightbane.io/api/cards-codex?search=&rarity=&category=10&type=&banner=&exp='

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function buildIdToNameMapping() {
  const [cardsRes, talentsRes] = await Promise.all([
    fetchJson(CARDS_API),
    fetchJson(TALENTS_API),
  ])
  const mapping = {}
  for (const item of [...(cardsRes.cards || []), ...(talentsRes.cards || [])]) {
    if (item.id != null && item.name != null) {
      mapping[item.id] = item.name
    }
  }
  return mapping
}

module.exports = { fetchJson, buildIdToNameMapping }
