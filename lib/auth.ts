// Authentication utilities
import { NextAuthOptions } from "next-auth";
import { createClient } from "@/lib/supabase/client";

export const authOptions: NextAuthOptions = {
  providers: [],  // Will be configured elsewhere
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  pages: {
    signIn: '/iqr/login',
    signOut: '/iqr/login',
    error: '/iqr/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 