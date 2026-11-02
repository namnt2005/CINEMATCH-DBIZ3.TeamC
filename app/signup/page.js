import AuthScreen from '../components/auth/auth-screen.js';

/** SC-04 Sign up (/signup): the Create account tab. `next` is the page that led here (SR-025). */
export default async function SignUpPage({ searchParams }) {
  return (
    <AuthScreen tab="signup" next={typeof searchParams?.next === 'string' ? searchParams.next : ''} />
  );
}
