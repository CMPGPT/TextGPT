import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import TextGptLanding from './landing/textgptlanding';

export default function Home() {
  return (
    <div>
      <Head>
        <title>TextGPT - AI-Powered SMS Services</title>
        <meta name="description" content="TextGPT provides AI-powered SMS interaction services for businesses" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
<TextGptLanding />
     
      
    </div>
  );
} 