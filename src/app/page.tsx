"use client";
import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast.error("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const email = `${username.trim().toLowerCase()}@rms.com`;
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground" htmlFor="username">
          Username <span className="text-primary">*</span>
        </label>
        <Input
          id="username"
          type="text"
          placeholder="e.g. syed.samad"
          className="h-11 bg-background"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground" htmlFor="password">
          Password <span className="text-primary">*</span>
        </label>
        <Input
          id="password"
          type="password"
          placeholder="enter your password"
          className="h-11 bg-background"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end -mt-1">
        <Link href="#" className="text-xs font-semibold text-primary hover:underline transition-colors">
          Forget Password
        </Link>
      </div>

      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ChevronRight className="w-4 h-4 ml-1" />
          </>
        )}
      </Button>
    </form>
  );
}

export default function Home() {
  return (
    <main
      className="min-h-screen w-full relative flex items-center justify-center md:justify-end bg-cover bg-center"
      style={{ backgroundImage: "url('/muj_building.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/10" />

      <div className="w-full max-w-md bg-card p-6 sm:p-10 rounded-lg shadow-md flex flex-col gap-6 relative z-10 mx-4 lg:mr-28">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="Manipal University Jaipur"
            width={150}
            height={50}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg md:text-xl font-bold text-center tracking-tight text-card-foreground">
            RMS Discussions
          </h1>
          <p className="text-xs font-medium text-muted-foreground text-center">
            Manipal University Jaipur internal portal
          </p>
        </div>

        <Suspense fallback={<div className="h-32" aria-hidden="true" />}>
          <LoginForm />
        </Suspense>

        <div className="text-center -mt-3">
          <p className="text-xs text-muted-foreground">
            Need access? Contact Research Office administration.
          </p>
        </div>
      </div>
    </main>
  );
}
