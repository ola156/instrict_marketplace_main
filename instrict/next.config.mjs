/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  reactCompiler: true,
  // Left un-bundled/un-transformed by Next's RSC compilation layer — that
  // transform was the actual cause of the SendChamp OTP fetch failing
  // with a generic network error, reproducing identically under both
  // Turbopack and webpack (ruling out the bundler itself as the cause).
  serverExternalPackages: ['undici'],
};

export default nextConfig;
