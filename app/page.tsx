"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Gift, Sparkles, Users, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Link from "next/link"

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        router.push("/dashboard")
      }
    }
    checkAuth()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Gift className="h-16 w-16 text-primary" />
              <Sparkles className="h-6 w-6 text-accent absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">Amigo Secreto Online</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Organiza tu intercambio de regalos de forma fácil, rápida y divertida. Sin registros complicados, sin
            instalaciones.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <Card className="border-2">
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Invita Participantes</h3>
              <p className="text-sm text-muted-foreground">Comparte un código simple para que se unan</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-6">
              <Sparkles className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Sorteo Automático</h3>
              <p className="text-sm text-muted-foreground">El sistema hace el sorteo de forma justa</p>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="pt-6">
              <Gift className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Resultados Privados</h3>
              <p className="text-sm text-muted-foreground">Cada persona ve solo su asignación</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-12">
          <Link href="/auth/login">
            <Button size="lg" className="gap-2">
              <LogIn className="h-5 w-5" />
              Iniciar Sesión
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="outline" size="lg">
              Crear Cuenta
            </Button>
          </Link>
        </div>

        {/* Info Card */}
        <div className="max-w-lg mx-auto">
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle>¿Cómo Funciona?</CardTitle>
              <CardDescription>Regístrate para comenzar a participar en sorteos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  1. <strong>Crea una cuenta</strong> con tu correo electrónico y nombre
                </p>
                <p className="text-sm text-muted-foreground">
                  2. <strong>Configura tus preferencias</strong> de gustos e intereses
                </p>
                <p className="text-sm text-muted-foreground">
                  3. <strong>Crea o únete</strong> a sorteos de Amigo Secreto
                </p>
                <p className="text-sm text-muted-foreground">
                  4. <strong>Recibe tu asignación</strong> cuando el organizador realice el sorteo
                </p>
              </div>
              <Link href="/auth/register">
                <Button className="w-full" size="lg">
                  Comenzar Ahora
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
