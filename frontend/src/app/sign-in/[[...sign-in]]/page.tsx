import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-8">
      <SignIn />
    </main>
  );
}
