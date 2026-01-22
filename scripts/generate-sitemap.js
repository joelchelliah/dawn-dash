const fs = require('fs')
const path = require('path')

const EVENTS_FILE = path.join(__dirname, '../src/codex/data/event-trees.json')
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml')
const BASE_URL = 'https://www.dawn-dash.com'

function normalizeEventNameForUrl(name) {
  return name.toLowerCase().replace(/\s+/g, '_')
}

function generateSitemap() {
  console.log('📖 Reading events file...')
  const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))

  console.log(`📋 Found ${events.length} events`)

  const urls = [
    {
      loc: `${BASE_URL}/`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '1.0',
    },
    {
      loc: `${BASE_URL}/cardex`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${BASE_URL}/skilldex`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${BASE_URL}/eventmaps`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.9',
    },
    {
      loc: `${BASE_URL}/speedruns`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.7',
    },
  ]

  // Add all event pages
  events.forEach((event) => {
    const eventUrl = normalizeEventNameForUrl(event.name)
    urls.push({
      loc: `${BASE_URL}/eventmaps/${eventUrl}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.6',
    })
  })

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf-8')
  console.log(`✅ Generated sitemap with ${urls.length} URLs`)
  console.log(`   - ${urls.length - events.length} static pages`)
  console.log(`   - ${events.length} event pages`)
  console.log(`📄 Written to ${OUTPUT_FILE}`)
}

generateSitemap()
