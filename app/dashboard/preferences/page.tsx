"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Preference, UserPreference } from "@/lib/types"
import { ArrowLeft, Plus, X, Save, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [userPreferences, setUserPreferences] = useState<UserPreference[]>([])
  // Estado local para preferencias seleccionadas (sin guardar)
  const [selectedPreferenceIds, setSelectedPreferenceIds] = useState<Set<string>>(new Set())
  // Preferencias personalizadas temporales (sin guardar)
  const [tempCustomPreferences, setTempCustomPreferences] = useState<string[]>([])
  const [customPreference, setCustomPreference] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadPreferences()
  }, [])

  const ensureProfileExists = async (userId: string, email: string, name: string) => {
    // Check if profile exists
    const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", userId).single()

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: createError } = await supabase.from("profiles").insert({
        id: userId,
        name: name || "Usuario",
        email: email || "",
      })

      if (createError) {
        console.error("Error creating profile:", createError)
        throw createError
      }
    }
  }

  const loadPreferences = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push("/auth/login")
        return
      }

      // Ensure profile exists before loading preferences
      const userName = (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Usuario"
      await ensureProfileExists(user.id, user.email || "", userName)

      // Load all available preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from("preferences")
        .select("*")
        .order("name", { ascending: true })

      if (prefsError) {
        console.error("Error loading preferences:", prefsError)
        // Continue with empty array if preferences table doesn't exist yet
        setPreferences([])
      } else {
        setPreferences(prefsData || [])
      }

      // Load user's preferences - try with join first, fallback to simple query
      let userPrefsData = null
      let userPrefsError = null

      // Try with join
      const joinResult = await supabase
        .from("user_preferences")
        .select(`
          *,
          preferences(id, name)
        `)
        .eq("user_id", user.id)

      userPrefsData = joinResult.data
      userPrefsError = joinResult.error

      // If join fails, try simple query
      let finalUserPrefs = userPrefsData || []
      if (userPrefsError) {
        console.warn("Join query failed, trying simple query:", userPrefsError)
        const simpleResult = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)

        if (simpleResult.error) {
          console.error("Error loading user preferences:", simpleResult.error)
          setUserPreferences([])
          finalUserPrefs = []
        } else {
          setUserPreferences(simpleResult.data || [])
          finalUserPrefs = simpleResult.data || []
        }
      } else {
        setUserPreferences(userPrefsData || [])
      }

      // Inicializar estado local con preferencias guardadas (tanto de join como simple)
      const savedIds = new Set(
        finalUserPrefs
          .filter((up) => up.preference_id !== null)
          .map((up) => up.preference_id as string),
      )
      setSelectedPreferenceIds(savedIds)

      // Inicializar preferencias personalizadas guardadas
      const savedCustom = finalUserPrefs
        .filter((up) => up.custom_preference !== null)
        .map((up) => up.custom_preference as string)
      setTempCustomPreferences(savedCustom)
      setHasChanges(false)
    } catch (err) {
      console.error("Error loading preferences:", err)
      // Set empty arrays on error to prevent UI breakage
      setPreferences([])
      setUserPreferences([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePreference = (preferenceId: string, checked: boolean) => {
    setSelectedPreferenceIds((prev) => {
      const newSelected = new Set(prev)
      if (checked) {
        newSelected.add(preferenceId)
      } else {
        newSelected.delete(preferenceId)
      }
      setHasChanges(true)
      return newSelected
    })
  }

  const handleAddCustomPreference = () => {
    if (!customPreference.trim()) return

    const trimmed = customPreference.trim()
    if (tempCustomPreferences.includes(trimmed)) {
      toast({
        title: "Preferencia duplicada",
        description: "Esta preferencia ya está en tu lista",
        variant: "destructive",
      })
      return
    }

    setTempCustomPreferences([...tempCustomPreferences, trimmed])
    setCustomPreference("")
    setHasChanges(true)
  }

  const handleRemoveTempCustomPreference = (index: number) => {
    setTempCustomPreferences(tempCustomPreferences.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleSavePreferences = async () => {
    setIsSaving(true)
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error("User not authenticated:", authError)
        router.push("/auth/login")
        return
      }

      // Ensure profile exists
      const userName = (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Usuario"
      await ensureProfileExists(user.id, user.email || "", userName)

      // Get current saved preferences
      const { data: currentPrefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)

      const currentPreferenceIds = new Set(
        (currentPrefs || []).filter((p) => p.preference_id).map((p) => p.preference_id as string),
      )
      const currentCustomPrefs = (currentPrefs || [])
        .filter((p) => p.custom_preference)
        .map((p) => p.custom_preference as string)

      // Calculate what to add and remove
      const toAdd = Array.from(selectedPreferenceIds).filter((id) => !currentPreferenceIds.has(id))
      const toRemove = Array.from(currentPreferenceIds).filter((id) => !selectedPreferenceIds.has(id))

      const toAddCustom = tempCustomPreferences.filter((cp) => !currentCustomPrefs.includes(cp))
      const toRemoveCustom = currentCustomPrefs.filter((cp) => !tempCustomPreferences.includes(cp))

      // Remove preferences that are no longer selected
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_preferences")
          .delete()
          .eq("user_id", user.id)
          .in("preference_id", toRemove)

        if (deleteError) throw deleteError
      }

      // Remove custom preferences that are no longer in the list
      if (toRemoveCustom.length > 0) {
        for (const customPref of toRemoveCustom) {
          const { error: deleteError } = await supabase
            .from("user_preferences")
            .delete()
            .eq("user_id", user.id)
            .eq("custom_preference", customPref)

          if (deleteError) throw deleteError
        }
      }

      // Add new preferences
      if (toAdd.length > 0) {
        const preferencesToInsert = toAdd.map((prefId) => ({
          user_id: user.id,
          preference_id: prefId,
          custom_preference: null,
        }))

        const { error: insertError } = await supabase.from("user_preferences").insert(preferencesToInsert)
        if (insertError) throw insertError
      }

      // Add new custom preferences
      if (toAddCustom.length > 0) {
        const customPrefsToInsert = toAddCustom.map((customPref) => ({
          user_id: user.id,
          preference_id: null,
          custom_preference: customPref,
        }))

        const { error: insertError } = await supabase.from("user_preferences").insert(customPrefsToInsert)
        if (insertError) throw insertError
      }

      // Reload preferences to sync state
      await loadPreferences()

      toast({
        title: "¡Preferencias guardadas!",
        description: "Tus preferencias se han guardado correctamente",
        variant: "default",
      })
    } catch (err) {
      console.error("Error saving preferences:", err)
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Error desconocido al guardar preferencias",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isPreferenceSelected = (preferenceId: string) => {
    return selectedPreferenceIds.has(preferenceId)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando preferencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/dashboard" className="text-sm text-primary hover:underline mb-6 inline-block">
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Volver al dashboard
          </Link>

          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="text-2xl">Mis Preferencias</CardTitle>
              <CardDescription>
                Selecciona tus gustos e intereses para ayudar a otros a elegir el regalo perfecto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Preferences */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Preferencias Disponibles</Label>
                {preferences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay preferencias disponibles</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {preferences.map((pref) => {
                      const isSelected = isPreferenceSelected(pref.id)
                      return (
                        <div
                          key={pref.id}
                          onClick={() => handleTogglePreference(pref.id, !isSelected)}
                          className={`flex items-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 hover:bg-primary/10"
                              : "border-border hover:bg-secondary/50 hover:border-primary/50"
                          }`}
                        >
                          <Checkbox
                            id={pref.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              handleTogglePreference(pref.id, checked === true)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Label
                            htmlFor={pref.id}
                            className={`flex-1 cursor-pointer font-normal select-none ${
                              isSelected ? "font-semibold text-primary" : ""
                            }`}
                          >
                            {pref.name}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Custom Preferences */}
              <div>
                <Label className="text-lg font-semibold mb-4 block">Preferencias Personalizadas</Label>
                <div className="space-y-3">
                  {tempCustomPreferences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay preferencias personalizadas</p>
                  ) : (
                    tempCustomPreferences.map((customPref, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg border-2 border-accent/20 bg-accent/5 hover:bg-accent/10 transition-all"
                      >
                        <span className="font-medium text-foreground">{customPref}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveTempCustomPreference(index)
                          }}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Senderismo, Yoga, etc."
                      value={customPreference}
                      onChange={(e) => setCustomPreference(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddCustomPreference()
                        }
                      }}
                    />
                    <Button onClick={handleAddCustomPreference} disabled={!customPreference.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <p className="text-sm text-muted-foreground">
                  Estas preferencias serán visibles para los organizadores de sorteos y ayudarán a que otros
                  participantes elijan regalos que realmente te gusten.
                </p>

                <Button
                  onClick={handleSavePreferences}
                  disabled={!hasChanges || isSaving}
                  className="w-full"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Preferencias
                    </>
                  )}
                </Button>

                {hasChanges && (
                  <p className="text-xs text-muted-foreground text-center">
                    Tienes cambios sin guardar. Haz clic en "Guardar Preferencias" para aplicar los cambios.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

