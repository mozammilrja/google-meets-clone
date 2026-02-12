/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {},
  env: {
    // NOTE: These fallbacks are used only if .env.local is missing
    // Backend API runs on port 4000
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
    // Signaling WebSocket also on backend port 4000
    NEXT_PUBLIC_SIGNALING_URL: process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000',
    // Media server (Mediasoup SFU) runs on port 7000 (browser-safe port)
    NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:7000',
  },
}

module.exports = nextConfig
