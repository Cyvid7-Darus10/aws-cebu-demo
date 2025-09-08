"use client";

import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useState } from "react";
import { Logo, Button } from "../atoms";
import { UserProfile } from "../molecules";

export default function Header() {
  const { user, signOut } = useAuthenticator();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-8">
          <Logo animated />
          {user && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors relative group"
              >
                Dashboard
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-3">
                <UserProfile username={user.username || ""} />
                <Button variant="ghost" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </>
          ) : (
            <Button as={Link} href="/login" size="sm">
              Sign in
            </Button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && user && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-3 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 font-medium py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <UserProfile username={user.username || ""} size="sm" />
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
