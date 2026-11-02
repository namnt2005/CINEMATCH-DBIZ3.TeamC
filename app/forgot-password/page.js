import ForgotForm from './forgot-form.js';

/** SC-06 Forgot password (/forgot-password). ?email= pre-fills the field (SC-07 *Send a new link*). */
export default async function ForgotPasswordPage({ searchParams }) {
  return (
    <ForgotForm initialEmail={typeof searchParams?.email === 'string' ? searchParams.email : ''} />
  );
}
