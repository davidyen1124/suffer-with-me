import { defineConfig } from 'vite'

// Relative base so the same build works at a domain root or under a sub-path
// such as GitHub Pages' https://<user>.github.io/<repo>/.
// (Social cards want whole addresses, which a relative build cannot know: those are written out in index.html.)
export default defineConfig({ base: './' })
