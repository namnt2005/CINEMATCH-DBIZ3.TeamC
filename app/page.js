export default function HomePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>CINEMATCH — Location Discovery (Module 3)</h1>
        <p style={{ color: '#4b5563' }}>
          Vietnam Film Development Association (VFDA) Production Location Discovery Service.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>SC-14: Location Discovery Grid</h2>
          <p style={{ color: '#4b5563' }}>Filter and search published filming locations with deterministic 6-criteria ranking.</p>
          <a
            href="/locations"
            style={{ display: 'inline-block', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 500 }}
          >
            Open Location Discovery (SC-14) &rarr;
          </a>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>SC-15: Scene Description AI Matching</h2>
          <p style={{ color: '#4b5563' }}>Describe a scene in free text and extract structured attributes mapped to the VFDA catalog.</p>
          <a
            href="/locations/match"
            style={{ display: 'inline-block', padding: '0.5rem 1rem', background: '#059669', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 500 }}
          >
            Open Scene Matcher (SC-15) &rarr;
          </a>
        </div>
      </section>
    </main>
  );
}
