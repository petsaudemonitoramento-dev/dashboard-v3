import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

import { SECURITY_HEADERS } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: [...SECURITY_HEADERS] }];
  },
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
  webpack: {
    automaticVercelMonitors: false,
    treeshake: { removeDebugLogging: true },
  },
});
