import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-8">
      <SignUp />
    </main>
  );
}
