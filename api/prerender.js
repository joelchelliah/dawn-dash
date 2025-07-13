export default async function handler(req, res) {
  const { path } = req.query
  const url = 'https://www.dawn-dash.com'
  const prerenderUrl = `https://service.prerender.io/${url}${path || '/'}`
  const response = await fetch(prerenderUrl, {
    headers: {
      'X-Prerender-Token': process.env.PRERENDER_TOKEN,
      'User-Agent': req.headers['user-agent'],
    },
  })
  const html = await response.text()
  res.setHeader('Content-Type', 'text/html')
  res.status(response.status).send(html)
}
