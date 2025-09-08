"use client";

import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function Header() {
  const { user, signOut } = useAuthenticator();

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <nav className="flex items-center justify-between max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-bold text-blue-600 hover:text-blue-700"
          >
            Pastelero
          </Link>
          {user && (
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-blue-600 font-medium"
            >
              QR Generator
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-gray-600 text-sm">{user?.username}</span>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
