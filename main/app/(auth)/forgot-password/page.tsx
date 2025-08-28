'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FiMail } from 'react-icons/fi'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
  if (!email) {
    setError('Please enter your email address.')
    return
  }

  setLoading(true)
  setError(null)
  setSuccess(false)

  // try {
  //   const { error } = await supabase.auth.resetPasswordForEmail(email, {
  //     redirectTo: `${window.location.origin}/reset-password` // your reset password page
  //   })

  //   if (error) {
  //     setError(error.message)
  //     setLoading(false)
  //     return
  //   }

  //   setSuccess(true)
   
  // } catch (err) {
  //   setError('Failed to send reset email. Please try again.')
  // } finally {
  //   setLoading(false)
  // }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-black mb-4">Forgot Password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {success ? (
          <Alert variant="default" className="mb-4">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              A password reset link has been sent to your email.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Label htmlFor="email" className="text-black mb-1">
              Email address
            </Label>
            <div className="relative mb-4">
              <FiMail className="absolute left-3 top-3 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}


// 'use client'

// import { useState } from 'react'

// import { colors } from '@/lib/colours/colours'

// export default function ForgotPasswordPage() {
//   const [email, setEmail] = useState('')
//   const [message] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [, setSent] = useState(false)

//   const handleSubmit = async () => {
//     if (!email) return alert('Enter your email')
//     setLoading(true)
//     try {
//       const res = await fetch('/api/auth/forgot-password', {
//         method: 'POST',
//         body: JSON.stringify({ email }),
//         headers: { 'Content-Type': 'application/json' },
//       })

//       if (!res.ok) throw new Error('Failed to send reset link')
//       setSent(true)
//     } catch (err) {
//       alert('Error sending reset email' + err)
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <>
     
//       <div
//         className="min-h-screen flex items-center justify-center"
//         style={{ backgroundColor: colors.primaryBlue }}
//       >
//         <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 mx-4">

//           <h1
//             className="text-3xl font-bold mb-6"
//             style={{ color: colors.primaryBlue }}
//           >
//             Forgot Password
//           </h1>

//           {message ? (
//             <p className="text-gray-700">{message}</p>
//           ) : (
//             <>
//               <label
//                 className="block text-sm font-medium mb-1"
//                 style={{ color: colors.primaryBlue }}
//               >
//                 Email
//               </label>
//               <input
//                 type="email"
//                 placeholder="you@example.com"
//                 className="w-full border border-gray-400 rounded px-3 py-2 mb-4 outline-none text-sm text-black"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//               />

//               <button
//                 onClick={handleSubmit}
//                 disabled={loading}
//                 className="w-full py-2 text-white font-semibold rounded hover:bg-[#013760] transition"
//                 style={{ backgroundColor: colors.primaryBlueHover }}
//               >
//                 {loading ? 'Sending...' : 'Send Reset Email'}
//               </button>
//             </>
//           )}
//         </div>
//       </div>
//     </>
//   )
// }