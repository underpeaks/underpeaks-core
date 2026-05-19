import path from 'path'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  //outputFileTracingRoot: path.join(__dirname, '../../'),
}

export default withNextIntl(nextConfig)