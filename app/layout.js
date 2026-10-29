export const metadata = {
  title: 'CINEMATCH - Location Discovery (M3)',
  description: 'AI-assisted scene matching and location discovery for filmmakers in Vietnam under VFDA.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
