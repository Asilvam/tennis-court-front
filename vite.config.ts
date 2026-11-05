import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolveBuildInfo } from './scripts/buildInfo'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const buildInfo = resolveBuildInfo(version, process.env.SOURCE_VERSION, () =>
  execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __CTQ_BUILD_INFO__: JSON.stringify(buildInfo),
  },
})
