import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Dev Login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(creds) {
        const email =
          typeof creds?.email === "string" ? creds.email.toLowerCase().trim() : "";
        if (!email) return null;

        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name ?? "" };
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
});
