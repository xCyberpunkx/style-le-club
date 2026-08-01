'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@style-le-club/shared'
import { useLogin } from '@/features/auth/use-login'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { ApiError } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const { data: user, isLoading: isLoadingUser } = useCurrentUser()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  // Hard navigation, not router.replace() — see the matching comment in
  // (dashboard)/layout.tsx. Crossing the auth boundary through client-side
  // routing let a stale in-memory query cache produce a bounce loop
  // between /login and /dashboard; a full page load rules that out
  // entirely by starting from a clean slate every time.
  useEffect(() => {
    if (!isLoadingUser && user) window.location.href = '/dashboard'
  }, [isLoadingUser, user])

  const onSubmit = handleSubmit(async (values) => {
    await login.mutateAsync(values)
    window.location.href = '/dashboard'
  })

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — the one place personality lives on this screen */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3E5745 0%, transparent 70%)' }}
        />
        <div className="relative">
          <p className="font-display text-3xl font-medium tracking-tight text-paper">
            Style Le Club
          </p>
          <div className="mt-4 h-px w-16 bg-bronze" />
          <p className="mt-4 max-w-xs text-sm text-paper/70">
            La gestion de votre gym, spa et institut de beauté, réunie en un seul endroit.
          </p>
        </div>
        <p className="relative text-xs text-paper/40">© {new Date().getFullYear()} Style Le Club</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden">
            <p className="font-display text-2xl font-medium tracking-tight">Style Le Club</p>
            <div className="mt-3 h-px w-12 bg-bronze" />
          </div>

          <div>
            <h1 className="text-xl font-semibold">Connexion</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrez vos identifiants pour accéder à votre espace.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@styleleclub.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {login.isError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {login.error instanceof ApiError
                  ? login.error.message
                  : 'Une erreur est survenue. Veuillez réessayer.'}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Connexion en cours…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
