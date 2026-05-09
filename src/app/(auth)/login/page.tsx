import Link from "next/link";
import Image from "next/image";
import { loginAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center overflow-hidden rounded-lg bg-zinc-950">
            <Image src="/brand/liplo_logo.png" alt="Liplo" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Liplo</h1>
            <p className="text-sm text-muted-foreground">Flow of Live Interaction</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Open your automation dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {params.error ? (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {params.error}
              </div>
            ) : null}
            <form action={loginAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <SubmitButton className="w-full">Login</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">No account yet?</span>
          <Button asChild variant="link">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
