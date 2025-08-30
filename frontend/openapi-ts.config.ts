import { defineConfig } from '@hey-api/openapi-ts'

// Use environment variable for API URL or fallback to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1'
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`

export default defineConfig({
    input: `${API_URL}/openapi.json`,
    output: './src/lib/api',
})
