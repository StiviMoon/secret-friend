"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { Group, Preference, UserPreference } from "@/lib/types"
import { ArrowLeft, Check, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function JoinGroupPage() {
  const [step, setStep] = useState<"code" | "info" | "success">("code")
  const [joinCode, setJoinCode] = useState("")
  const [group, setGroup] = useState<Group | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(false)

  // User preferences
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([])
  const [selectedPreferenceIds, setSelectedPreferenceIds] = useState<string[]>([])
  const [wishlist, setWishlist] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (step === "info") {
      loadUserPreferences()
    }
  }, [step])

  const loadUserPreferences = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from("user_preferences")
        .select(`
          *,
          preference:preferences(id, name)
        `)
        .eq("user_id", user.id)

      if (error) throw error
      setUserPreferences(data || [])
      // Initialize with all preferences selected
      const allIds = (data || [])
        .map((up) => up.preference_id || up.id)
        .filter(Boolean) as string[]
      setSelectedPreferenceIds(allIds)
    } catch (err) {
      console.error("Error loading preferences:", err)
    }
  }

  const handleFindGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoadingGroup(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("join_code", joinCode.toUpperCase().trim())
        .single()

      if (error || !data) {
        setError("Código no válido. Verifica e intenta de nuevo.")
        return
      }

      // Check if draw already happened
      const { data: assignments } = await supabase.from("assignments").select("id").eq("group_id", data.id).limit(1)

      if (assignments && assignments.length > 0) {
        setError("Este grupo ya realizó el sorteo. No se pueden agregar más participantes.")
        return
      }

      setGroup(data)
      setStep("info")
    } catch (err) {
      console.error("Error finding group:", err)
      setError("Error al buscar el grupo")
    } finally {
      setIsLoadingGroup(false)
    }
  }

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group) return

    setIsSubmitting(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get user profile for name and email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError

      // Build wishlist from preferences and custom text
      const selectedPrefs = userPreferences.filter((up) => {
        const prefId = up.preference_id || up.id
        return selectedPreferenceIds.includes(prefId)
      })

      const preferenceNames = selectedPrefs
        .map((up) => {
          if (up.preference_id && (up as any).preference) {
            return (up as any).preference.name
          }
          return null
        })
        .filter(Boolean)

      const customPreferences = selectedPrefs
        .map((up) => up.custom_preference)
        .filter(Boolean)

      const allPreferences = [...preferenceNames, ...customPreferences]
      const finalWishlist = wishlist.trim()
        ? `${allPreferences.join(", ")}${wishlist.trim() ? ` | ${wishlist.trim()}` : ""}`
        : allPreferences.join(", ")

      const { error } = await supabase.from("participants").insert({
        group_id: group.id,
        user_id: user.id,
        name: profile.name,
        contact: profile.email,
        wishlist: finalWishlist || null,
      })

      if (error) throw error

      setStep("success")
    } catch (err) {
      console.error("Error joining group:", err)
      setError("Error al unirse al grupo. Por favor intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePreference = (preferenceId: string) => {
    setSelectedPreferenceIds((prev) =>
      prev.includes(preferenceId) ? prev.filter((id) => id !== preferenceId) : [...prev, preferenceId],
    )
  }

  // Step 1: Enter join code
  if (step === "code") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <Link href="/dashboard" className="text-sm text-primary hover:underline mb-8 inline-block">
              <ArrowLeft className="h-4 w-4 inline mr-2" />
              Volver al dashboard
            </Link>

            <Card className="shadow-lg border-2">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <UserPlus className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">Unirse a un Sorteo</CardTitle>
                <CardDescription className="text-center">Ingresa el código que te compartió el organizador</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFindGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinCode">Código de Unión</Label>
                    <Input
                      id="joinCode"
                      placeholder="Ej: ABC123"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                      maxLength={6}
                      className="text-center text-2xl tracking-wider font-bold"
                    />
                    <p className="text-xs text-muted-foreground text-center">Ingresa el código de 6 caracteres</p>
                  </div>

                  {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

                  <Button type="submit" className="w-full" size="lg" disabled={isLoadingGroup}>
                    {isLoadingGroup ? "Buscando..." : "Buscar Grupo"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Select preferences and add wishlist
  if (step === "info" && group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <Link href="/dashboard/join-group" className="text-sm text-primary hover:underline mb-8 inline-block">
              <ArrowLeft className="h-4 w-4 inline mr-2" />
              Cambiar código
            </Link>

            <Card className="shadow-lg border-2">
              <CardHeader>
                <CardTitle className="text-center text-2xl">{group.name}</CardTitle>
                <CardDescription className="text-center">
                  Selecciona tus preferencias y completa tu información
                </CardDescription>
                {group.budget_limit && (
                  <div className="bg-emerald-50 p-3 rounded-md mt-4">
                    <p className="text-sm text-center">
                      <span className="font-medium">Monto límite:</span> ${group.budget_limit.toFixed(2)}
                    </p>
                  </div>
                )}
                {group.custom_message && (
                  <div className="bg-secondary p-3 rounded-md mt-2">
                    <p className="text-sm text-center text-muted-foreground">{group.custom_message}</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitInfo} className="space-y-6">
                  {/* Preferences Selection */}
                  {userPreferences.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Selecciona tus Preferencias</Label>
                      <p className="text-sm text-muted-foreground">
                        Esto ayudará a tu amigo secreto a elegir el regalo perfecto
                      </p>
                      <div className="grid md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 border rounded-lg">
                        {userPreferences.map((up) => {
                          const prefName = (up as any).preference?.name || up.custom_preference || "Preferencia"
                          const prefId = up.preference_id || up.id
                          return (
                            <div key={up.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={up.id}
                                checked={selectedPreferenceIds.includes(prefId)}
                                onCheckedChange={() => handleTogglePreference(prefId)}
                              />
                              <Label htmlFor={up.id} className="flex-1 cursor-pointer font-normal">
                                {prefName}
                              </Label>
                            </div>
                          )
                        })}
                      </div>
                      {userPreferences.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          <Link href="/dashboard/preferences" className="text-primary hover:underline">
                            Configura tus preferencias primero
                          </Link>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Wishlist */}
                  <div className="space-y-2">
                    <Label htmlFor="wishlist">Lista de Deseos Adicional (opcional)</Label>
                    <Textarea
                      id="wishlist"
                      placeholder="Ej: Me gustan los libros de ciencia ficción, café artesanal, plantas de interior..."
                      rows={4}
                      value={wishlist}
                      onChange={(e) => setWishlist(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Agrega información adicional que pueda ayudar a elegir tu regalo
                    </p>
                  </div>

                  {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Uniéndose..." : "Unirse al Grupo"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Success
  if (step === "success" && group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <Card className="shadow-lg border-2">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">¡Te has unido exitosamente!</CardTitle>
                <CardDescription className="text-center">Bienvenido a {group.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-sm text-center text-emerald-800">
                    El organizador hará el sorteo cuando todos estén listos. Recibirás tu asignación por email.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => router.push(`/resultado/${group.id}`)} className="w-full" size="lg">
                    Ver Mis Resultados
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

  return null
}

