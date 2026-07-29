/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site — no server runtime. `next build` emits an `out/` directory.
  output: 'export',
  // Required for next/image under static export (no image optimization server).
  images: { unoptimized: true },
  // Lint is enforced via `npm run lint` (its own gate), not coupled to the build.
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
