import AuthScreen from '../components/auth/auth-screen.js';

/** SC-05 Log in (/login): same layout as SC-04, Log in tab. ?error=link_expired comes from /auth/callback. */
export default async function LogInPage({ searchParams }) {
  return (
    <AuthScreen
      tab="login"
      next={typeof searchParams?.next === 'string' ? searchParams.next : ''}
      linkExpired={searchParams?.error === 'link_expired'}
    />
  );
}
