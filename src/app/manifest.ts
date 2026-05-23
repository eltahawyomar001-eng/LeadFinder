import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LeadFinder — Global Lead Finder',
    short_name: 'LeadFinder',
    description: 'Find local business leads worldwide. Scrapes emails, scores website quality, generates personalized cold outreach.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020609',
    theme_color: '#020609',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    screenshots: [],
  };
}
