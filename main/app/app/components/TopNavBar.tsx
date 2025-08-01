'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../nxf-ui/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  FiLogIn,
  FiUserPlus,
  FiUser,
  FiChevronDown,
  FiLogOut,
} from 'react-icons/fi';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User } from '@supabase/auth-helpers-react'

type TopNavbarProps = {
  user?: User | null
}

export default function TopNavbar({ user: propUser }: TopNavbarProps) {
  const router = useRouter();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!propUser) {
      supabase.auth.getUser().then(({ data }) => {
        setLocalUser(data.user || null);
        setMounted(true);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setLocalUser(session?.user || null);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } else {
      setMounted(true);
    }
  }, [propUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocalUser(null);
    router.push('/');
    router.refresh();
  };

  const user = propUser || localUser;

  if (!mounted) return <div className="h-16 bg-white" />;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md border-b border-gray-200 z-50">
      <div className="container mx-auto flex items-center justify-between px-6 h-full">
        <Link href="/" className="text-black text-xl font-semibold hover:underline">
          NextFlutter
        </Link>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center space-x-3 rounded-full bg-gray-100 px-3 py-2 hover:bg-gray-200 focus:outline-none"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center border border-gray-400">
                <FiUser size={18} />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {user.user_metadata?.name || user.email?.split('@')[0]}
              </span>
              <FiChevronDown className="h-4 w-4 transition-transform" />
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="end" className="w-40 rounded-md border border-gray-200 bg-white shadow-lg">
              <DropdownMenuItem
                className="cursor-pointer flex items-center gap-2"
                onSelect={(event) => {
                  event.preventDefault();
                  handleLogout();
                }}
              >
                <FiLogOut /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex space-x-3 items-center">
            <Link href="/signin" className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition">
              <FiLogIn size={16} /> Sign In
            </Link>
            <Link href="/signup" className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition">
              <FiUserPlus size={16} /> Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
