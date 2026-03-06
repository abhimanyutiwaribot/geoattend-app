import Header from './Header';

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'var(--bg-base)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {children}
      </main>
    </div>
  );
}
