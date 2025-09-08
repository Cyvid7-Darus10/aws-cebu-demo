"use client";

import Link from "next/link";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function Header() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);

  return (
    <header className="site-header">
      <nav className="nav">
        <div className="nav-left">
          <Link href="/" className="brand">Pastelero</Link>
        </div>
        <div className="nav-right">
          {user ? (
            <>
              <span className="user-label">{user?.username}</span>
              <button className="btn btn-secondary" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}


