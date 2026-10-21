import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check Your Email" };

export default function VerifyPage() {
  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Check your email</h1>
      </div>
      <div className="card-content space-y-4">
        <p className="text-gray-600">
          We've sent a sign-in link to your email. Click the link to continue.
        </p>
        <p className="text-sm text-gray-500">
          Didn't receive it? Check your spam folder or{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            try again
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
