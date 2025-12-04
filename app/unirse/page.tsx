"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { LogIn } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function JoinPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        router.push("/dashboard/join-group")
      }
    }
    checkAuth()
  }, [router, supabase])
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Inicia Sesión Requerido</CardTitle>
            <CardDescription className="text-center">
              Necesitas iniciar sesión para unirte a un sorteo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Para unirte a un sorteo, primero debes crear una cuenta e iniciar sesión. Esto te permitirá
              configurar tus preferencias y participar en múltiples sorteos.
            </p>
            <Link href="/auth/login">
              <Button className="w-full" size="lg">
                <LogIn className="h-4 w-4 mr-2" />
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" className="w-full">
                Crear Cuenta
              </Button>
            </Link>
            <div className="text-center mt-4">
              <Link href="/" className="text-sm text-muted-foreground hover:underline">
                ← Volver al inicio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
