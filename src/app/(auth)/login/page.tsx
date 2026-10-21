import { Metadata } from "next";
import Link from "next/link";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Sign in to DocIt</h1>
        <p className="card-description">Event documentation for student chapters</p>
      </div>
      <div className="card-content space-y-4">
        <form
          action={async (formData) => {
            "use server";
            await signIn("email", formData);
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
              className="input mt-1"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Send Magic Link
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className="btn btn-secondary w-full">
            Continue with Google
          </button>
        </form>

        <p className="text-center text-xs text-gray-600">
          By signing in, you agree to our terms.{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
