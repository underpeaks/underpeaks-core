// // supabase/utils.ts
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
// import type { Database } from '../types/supabase';
// import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';

// /**
//  * Returns a Supabase client for client-side components
//  */
// export function getClientSupabase() {
//   return createClientComponentClient<Database>();
// }

// /**
//  * Returns a Supabase client for server-side code
//  * @param context Required: server context for API routes or server actions
//  * @param options Optional: supabaseUrl, supabaseKey, options, cookieOptions
//  */
// export function getServerSupabase(
//   context: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse },
//   options?: {
//     supabaseUrl?: string;
//     supabaseKey?: string;
//     options?: any;
//     cookieOptions?: any;
//   }
// ) {
//   return createServerSupabaseClient<Database>(context, options);
// }

// /**
//  * Example helper: get a project ID for a user
//  */
// export async function getProjectIdForUser(
//   userId: string,
//   context?: GetServerSidePropsContext | { req: NextApiRequest; res: NextApiResponse },
//   isServer = false
// ): Promise<string | null> {
//   const supabase = isServer
//     ? getServerSupabase(context!)
//     : getClientSupabase();

//   const { data: userData, error: userError } = await supabase
//     .from('users')
//     .select('project_id')
//     .eq('id', userId)
//     .single();

//   if (userError) {
//     console.error('Error fetching user:', userError);
//     return null;
//   }

//   if (userData?.project_id) return userData.project_id;

//   const { data: project, error: projectError } = await supabase
//     .from('projects')
//     .select('id')
//     .eq('owner_id', userId)
//     .limit(1)
//     .single();

//   if (projectError || !project) {
//     console.error('No project found:', projectError);
//     return null;
//   }

//   const { error: updateError } = await supabase
//     .from('users')
//     .update({ project_id: project.id })
//     .eq('id', userId);

//   if (updateError) console.error('Failed to update user with project ID:', updateError);

//   return project.id;
// }
