"use client";

import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { useState } from "react";

export default function Header() {
  const { user, signOut } = useAuthenticator();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pastelero
            </span>
          </Link>
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
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-700 text-sm font-medium">
                    {user?.username}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign out
                </button>
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
            <Link
              href="/login"
              className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign in
            </Link>
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
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 text-sm">{user?.username}</span>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
