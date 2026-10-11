import { defineConfig } from 'vite'

// Social cards want whole addresses, for the page and for its picture. On Vercel the build knows where it
// will live; anywhere else, set SITE_URL, or the addresses stay relative.
const site = (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '')

export default defineConfig({
  plugins: [
    {
      name: 'absolute-social-card',
      transformIndexHtml: (html) => (site ? html.replaceAll('content="/og.jpg"', `content="${site}/og.jpg"`).replace('property="og:url" content="/"', `property="og:url" content="${site}/"`) : html),
    },
  ],
})
