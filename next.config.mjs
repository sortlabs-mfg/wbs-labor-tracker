/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow pg and papaparse to be used in server components/routes
  serverExternalPackages: ['pg'],
};

export default nextConfig;
