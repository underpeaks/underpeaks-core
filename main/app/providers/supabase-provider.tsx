'use client'

/**
 * SupabaseProvider.tsx
 *
 * A thin wrapper component that initialises the Supabase client and makes it
 * available to every component in the application through React Context.
 *
 * What is Supabase?
 *   Supabase is a Backend-as-a-Service (BaaS) platform built on top of
 *   PostgreSQL. It provides a database, authentication, file storage, and
 *   real-time subscriptions — all accessible through a JavaScript client
 *   library. Think of it as an open-source alternative to Firebase.
 *
 * What does this component do?
 *   Two things:
 *     1. Creates a single Supabase client instance for the whole app.
 *     2. Passes that client into Supabase's SessionContextProvider so that
 *        any component anywhere in the tree can call Supabase hooks (e.g.
 *        useUser(), useSession(), useSupabaseClient()) without needing the
 *        client passed down as a prop.
 *
 * Why create the client inside useState?
 *   In Next.js with the App Router, Client Components can re-render. If we
 *   wrote `const supabaseClient = createClient(...)` at the top of the
 *   function body, a new client instance would be created on every re-render.
 *   Each instance opens its own connections and resets auth state, which is
 *   wasteful and causes bugs.
 *
 *   useState(() => createClient(...)) uses a "lazy initialiser": the arrow
 *   function runs only once, the very first time the component mounts. The
 *   same client instance is then reused for the entire lifetime of the app,
 *   no matter how many times the component re-renders.
 *
 * Where to place it:
 *   Typically in app/layout.tsx, wrapping {children}, so that every page
 *   has access to the Supabase client and session state:
 *
 *     import SupabaseProvider from '@/components/SupabaseProvider'
 *
 *     export default function RootLayout({ children }) {
 *       return (
 *         <html>
 *           <body>
 *             <SupabaseProvider
 *               supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
 *               supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
 *             >
 *               {children}
 *             </SupabaseProvider>
 *           </body>
 *         </html>
 *       )
 *     }
 *
 * How child components consume the context:
 *   Any component inside SupabaseProvider can use the hooks provided by
 *   @supabase/auth-helpers-react:
 *
 *     import { useUser, useSession } from '@supabase/auth-helpers-react'
 *
 *     function ProfilePage() {
 *       const user = useUser()       // currently logged-in user or null
 *       const session = useSession() // full session object or null
 *       ...
 *     }
 */

import { createClient }             from '@supabase/supabase-js'
import { SessionContextProvider }   from '@supabase/auth-helpers-react'
import { useState }                 from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * SupabaseProviderProps
 *
 * The props accepted by SupabaseProvider.
 *
 * @property children       - The rest of the React component tree that should
 *                            have access to the Supabase client and session.
 *                            In practice this is the entire application.
 *
 * @property supabaseUrl    - The URL of your Supabase project, found in the
 *                            Supabase dashboard under Project Settings → API.
 *                            Example: 'https://xyzcompany.supabase.co'
 *                            Typically sourced from NEXT_PUBLIC_SUPABASE_URL.
 *
 * @property supabaseAnonKey - The anonymous (public) API key for your Supabase
 *                             project, also found in Project Settings → API.
 *                             This key is safe to expose in the browser — it
 *                             only grants access according to your Row Level
 *                             Security (RLS) policies.
 *                             Typically sourced from NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
interface SupabaseProviderProps {
  children:        React.ReactNode
  supabaseUrl:     string
  supabaseAnonKey: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SupabaseProvider
 *
 * Initialises a single Supabase client and provides it to all descendant
 * components via Supabase's SessionContextProvider.
 *
 * @param {SupabaseProviderProps} props - See SupabaseProviderProps above.
 * @returns {JSX.Element} A SessionContextProvider wrapping the children.
 */
export default function SupabaseProvider({
  children,
  supabaseUrl,
  supabaseAnonKey,
}: SupabaseProviderProps) {

  /**
   * supabaseClient — the single shared Supabase client instance.
   *
   * useState with a lazy initialiser (an arrow function) ensures createClient
   * is called exactly once when the component first mounts, not on every
   * re-render. The setter from useState is intentionally omitted (we
   * destructure only the first element) because the client never needs to
   * be replaced after it is created.
   *
   * createClient(url, key) connects to the Supabase project identified by
   * `supabaseUrl` using `supabaseAnonKey` for public access.
   */
  const [supabaseClient] = useState(() => createClient(supabaseUrl, supabaseAnonKey))

  /**
   * SessionContextProvider (from @supabase/auth-helpers-react)
   *
   * Wraps the children with a React Context that holds the Supabase client
   * and the current auth session. This is what enables the useUser(),
   * useSession(), and useSupabaseClient() hooks to work in any child
   * component without prop drilling.
   */
  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  )
}