"use client";

import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  User2,
} from "lucide-react";

import { DEFAULT_LOGIN_PASSWORD } from "@/lib/auth-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HERO_IMAGE_SRC = "/hero.png";
const LOGO_SRC = "/logo.png";

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState(DEFAULT_LOGIN_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      identifier,
      password,
      callbackUrl,
    });

    if (!result || result.error) {
      setError("Identifiant ou mot de passe invalide.");
      setIsSubmitting(false);
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <section className="grid w-full overflow-hidden rounded-[32px] bg-[#fdfdfd] shadow-[0_30px_80px_rgba(15,23,42,0.22)] lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex items-center px-8 py-10 sm:px-12 md:px-14 lg:px-16 lg:py-14 ">
        <div className="w-full ">
          <div className="mb-6 w-full flex items-center justify-center ">
            <Image
              src={LOGO_SRC}
              alt="Logo"
              width={280}
              height={70}
              priority
              className="h-auto mb-3 max-w-[400px]  object-contain"
            />
          </div>

          <div className="space-y-3 w-full  flex flex-col items-center justify-start">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight bg-gradient-to-r from-pink-500 to-fuchsia-600 bg-clip-text text-transparent">
              Se connecter
            </h1>
          </div>

          <form className="mt-10 space-y-5 " onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="identifier"
              >
                Email / Identifiant
              </label>

              <div className="group relative">
                <User2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-600" />
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="login@gmail.com"
                  autoComplete="username"
                  required
                  className="h-12 rounded-[14px] border border-slate-200 bg-white pl-11 pr-4 text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus-visible:border-pink-400 focus-visible:ring-2 focus-visible:ring-pink-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  Password
                </label>

                <button
                  type="button"
                  className="text-xs text-slate-400 transition-colors hover:text-[#db86ad]"
                >
                  Forgot Password ?
                </button>
              </div>

              <div className="group relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-600" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-12 rounded-[14px] border border-slate-200 bg-white pl-11 pr-12 text-slate-800 shadow-sm transition-all focus-visible:border-pink-400 focus-visible:ring-2 focus-visible:ring-pink-100"
                />
                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#db86ad]"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-full bg-[#db86ad] px-8 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(219,134,173,0.35)] transition-all duration-200 hover:scale-[1.02] hover:bg-[#d46f9f]"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    LOGIN
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden p-5 lg:block">
        <div className="relative h-full overflow-hidden rounded-[28px] flex flex-col justify-center bg-[#b2c2fa]">
          <Image
            src={HERO_IMAGE_SRC}
            alt="Illustration login"
            width={1100}
            height={1100}
            priority
            className="h-auto object-contain"
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        </div>
      </div>
    </section>
  );
}
