/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['api.dicebear.com', 'flagcdn.com', 'images.unsplash.com'],
  },
  eslint: {
    // Permite que a build termine com sucesso mesmo se houver avisos de lint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite que a build termine mesmo se houver erros de tipagem
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
