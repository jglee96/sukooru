import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>Sukooru Next App Router Fixture</h1>
      <p>This fixture exists to prove that the published package builds inside a real Next app.</p>
      <Link href="/products">Open products</Link>
    </main>
  )
}
