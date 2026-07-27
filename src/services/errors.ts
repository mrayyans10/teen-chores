/** Turn Supabase auth errors into something a human wants to read. */
export function friendlyAuthError(e: unknown): string {
  const err = e as { code?: string; message?: string; status?: number };
  const code = err?.code ?? '';
  switch (code) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account already exists with that email.';
    case 'weak_password':
      return 'Password should be at least 6 characters.';
    case 'email_not_confirmed':
      return 'Please confirm your email first (check your inbox), then sign in.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please try again in a little while.';
    case 'validation_failed':
      return 'That email address looks invalid.';
    default:
      break;
  }

  const msg = err?.message ?? '';
  // The placeholder config produces fetch/URL failures until real keys are set.
  if (/fetch|network|Failed to|ENOTFOUND|placeholder/i.test(msg)) {
    return 'Could not reach Supabase. Add your project URL + anon key to .env (see .env.example).';
  }
  return msg || 'Something went wrong. Please try again.';
}
