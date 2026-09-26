import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const APP_DESC = 'Air-gapped contract intelligence workstation. Turn complex legal agreements into clear, grounded, and actionable insights — with zero external LLM calls.';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Legal Lens — Forensic Contract Intelligence</title>
        <meta name="description" content={APP_DESC} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no" />
        <meta name="theme-color" content="#090b0e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="robots" content="noindex, nofollow" />

        {/* Open Graph */}
        <meta property="og:title" content="Legal Lens — Forensic Contract Intelligence" />
        <meta property="og:description" content={APP_DESC} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={APP_URL} />
        <meta property="og:site_name" content="Legal Lens" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Legal Lens — Forensic Contract Intelligence" />
        <meta name="twitter:description" content={APP_DESC} />

        {/* Favicon */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚖</text></svg>" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
