// Page body of the SYS auth and account screens; the site header and footer come from app/layout.js.
export default function AuthFrame({ children }) {
  return (
    <main style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1rem', boxSizing: 'border-box' }}>
      {children}
    </main>
  );
}
