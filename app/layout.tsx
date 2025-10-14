import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Lucas Hanson',
  description: 'Explore Lucas Frey Torres Hanson\'s portfolio and IT related blog. Discover projects, insights, and tutorials on software development and web technologies.',
  keywords: 'software developer, portfolio, personal website, IT University of Copenhagen, DHI, hand gesture interaction, hybrid meetings, JavaScript, React, Python, ITU, Lucas Hanson',
  authors: [{ name: 'Lucas Frey Torres Hanson' }],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;1,700&display=swap" rel="stylesheet" />
        <link rel="canonical" href="https://lucashanson.dk" />
      </head>
      <body>
        <div className="App">
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  )
}
