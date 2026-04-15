import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Sukooru Next Pages Router Fixture</h1>
      <Link href="/products">Open products</Link>
    </main>
  )
}
