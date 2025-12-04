"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState("")
  const [budgetLimit, setBudgetLimit] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdGroup, setCreatedGroup] = useState<{ id: string; join_code: string; admin_secret: string } | null>(
    null,
  )
  const [copiedJoinCode, setCopiedJoinCode] = useState(false)
  const [copiedAdminLink, setCopiedAdminLink] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: groupName,
          budget_limit: budgetLimit ? Number.parseFloat(budgetLimit) : null,
          custom_message: customMessage || null,
          creator_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      setCreatedGroup(data)
    } catch (err) {
      console.error("Error creating group:", err)
      setError("Error al crear el grupo. Por favor intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const copyJoinCode = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.join_code)
      setCopiedJoinCode(true)
      setTimeout(() => setCopiedJoinCode(false), 2000)
    }
  }

  const copyAdminLink = () => {
    if (createdGroup) {
      const adminUrl = `${window.location.origin}/grupo/${createdGroup.id}?admin=${createdGroup.admin_secret}`
      navigator.clipboard.writeText(adminUrl)
      setCopiedAdminLink(true)
      setTimeout(() => setCopiedAdminLink(false), 2000)
    }
  }

  const goToAdminPanel = () => {
    if (createdGroup) {
      router.push(`/grupo/${createdGroup.id}?admin=${createdGroup.admin_secret}`)
    }
  }

  if (createdGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Link href="/dashboard" className="text-sm text-primary hover:underline mb-6 inline-block">
              <ArrowLeft className="h-4 w-4 inline mr-2" />
              Volver al dashboard
            </Link>

            <Card className="shadow-lg border-2">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">¡Grupo Creado Exitosamente!</CardTitle>
                <CardDescription className="text-center">Comparte el código con tus participantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-emerald-50 p-6 rounded-lg border-2 border-emerald-200">
                  <Label className="text-sm font-medium mb-2 block">Código de Unión</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white p-4 rounded-md border-2 border-emerald-300">
                      <p className="text-3xl font-bold text-center tracking-wider text-primary">
                        {createdGroup.join_code}
                      </p>
                    </div>
                    <Button onClick={copyJoinCode} variant="outline" size="icon">
                      {copiedJoinCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Los participantes pueden usar este código para unirse
                  </p>
                </div>

                <div className="bg-amber-50 p-6 rounded-lg border-2 border-amber-200">
                  <Label className="text-sm font-medium mb-2 block">Enlace de Administrador</Label>
                  <div className="flex items-center gap-2">
                    <Button onClick={copyAdminLink} variant="outline" className="flex-1 bg-transparent">
                      {copiedAdminLink ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Enlace Admin
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    ⚠️ Guarda este enlace para administrar el grupo y hacer el sorteo
                  </p>
                </div>

                <div className="space-y-3">
                  <Button onClick={goToAdminPanel} className="w-full" size="lg">
                    Ir al Panel de Administración
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
                    Volver al Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-sm text-primary hover:underline mb-6 inline-block">
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Volver al dashboard
          </Link>

          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle>Crear Nuevo Sorteo</CardTitle>
              <CardDescription>Completa los datos para comenzar tu intercambio</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nombre del Grupo *</Label>
                  <Input
                    id="groupName"
                    placeholder="Ej: Familia 2025"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetLimit">Monto Límite (opcional)</Label>
                  <Input
                    id="budgetLimit"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 50.00"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Define un presupuesto máximo para los regalos</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customMessage">Mensaje Personalizado (opcional)</Label>
                  <Textarea
                    id="customMessage"
                    placeholder="Ej: ¡Celebremos la navidad juntos! La entrega será el 24 de diciembre."
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                  />
                </div>

                {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? "Creando..." : "Crear Grupo"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

