import { GoogleLogin } from '@react-oauth/google'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * Shared Google sign-in / connect button (uses @react-oauth/google — reliable in Chrome & Brave).
 * @param {'signin' | 'signup' | 'use'} context - Google button context
 * @param {'signin_with' | 'signup_with' | 'continue_with'} text
 */
export default function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  context = 'signin',
  text = 'continue_with',
}) {
  if (!clientId) {
    return (
      <p className="text-sm text-[#9A8070] text-center">
        Google sign-in is not configured (missing VITE_GOOGLE_CLIENT_ID).
      </p>
    )
  }

  return (
    <div
      className={`w-full flex justify-center min-h-[44px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      aria-hidden={disabled}
    >
      <GoogleLogin
        onSuccess={onSuccess}
        onError={() => onError?.(new Error('Google sign-in was cancelled or blocked. Allow third-party cookies for accounts.google.com, or try Chrome.'))}
        useOneTap={false}
        auto_select={false}
        theme="outline"
        size="large"
        width={320}
        text={text}
        context={context}
        shape="rectangular"
      />
    </div>
  )
}
