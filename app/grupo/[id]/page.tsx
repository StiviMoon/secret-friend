"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { Group, Participant } from "@/lib/types"
import { Check, Gift, Shuffle, Users, Copy, Share2, Lock } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function GroupPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const groupId = params.id as string
  const adminSecret = searchParams.get("admin")

  const [group, setGroup] = useState<Group | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [hasAssignments, setHasAssignments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSendingEmails, setIsSendingEmails] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedJoinCode, setCopiedJoinCode] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    try {
      // Load group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      setIsAdmin(adminSecret === groupData.admin_secret)

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })

      if (participantsError) throw participantsError
      setParticipants(participantsData || [])

      // Check if assignments exist
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id")
        .eq("group_id", groupId)
        .limit(1)

      if (assignmentsError) throw assignmentsError
      setHasAssignments((assignmentsData?.length || 0) > 0)
    } catch (err) {
      console.error("[v0] Error loading group data:", err)
      setError("Error al cargar los datos del grupo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrawNames = async () => {
    if (participants.length < 3) {
      alert("Se necesitan al menos 3 participantes para hacer el sorteo")
      return
    }

    if (hasAssignments) {
      if (!confirm("Ya existe un sorteo. ¿Deseas hacer uno nuevo? Esto eliminará el sorteo anterior.")) {
        return
      }

      // Delete existing assignments
      await supabase.from("assignments").delete().eq("group_id", groupId)
    }

    setIsDrawing(true)
    setError(null)

    try {
      // Improved algorithm: Random assignment ensuring no self-assignment
      // and no duplicates (each person gives to exactly one, receives from exactly one)
      const assignments: Array<{ group_id: string; giver_id: string; receiver_id: string }> = []
      const receivers = [...participants]
      const maxAttempts = 100 // Prevent infinite loops

      for (const giver of participants) {
        let attempts = 0
        let validReceiver = null

        // Find a valid receiver (not the giver, and not already assigned)
        while (attempts < maxAttempts) {
          const randomIndex = Math.floor(Math.random() * receivers.length)
          const candidate = receivers[randomIndex]

          // Check if candidate is valid (not self, and not already assigned as receiver)
          if (candidate.id !== giver.id) {
            const alreadyAssigned = assignments.some((a) => a.receiver_id === candidate.id)
            if (!alreadyAssigned) {
              validReceiver = candidate
              receivers.splice(randomIndex, 1) // Remove from available receivers
              break
            }
          }
          attempts++
        }

        // If we couldn't find a valid receiver, use fallback circular method
        if (!validReceiver) {
          // Fallback: circular assignment with shuffle
          const shuffled = [...participants]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }

          const giverIndex = shuffled.findIndex((p) => p.id === giver.id)
          const receiverIndex = (giverIndex + 1) % shuffled.length
          validReceiver = shuffled[receiverIndex]

          // Ensure no self-assignment in fallback
          if (validReceiver.id === giver.id) {
            const nextIndex = (giverIndex + 2) % shuffled.length
            validReceiver = shuffled[nextIndex]
          }
        }

        assignments.push({
          group_id: groupId,
          giver_id: giver.id,
          receiver_id: validReceiver.id,
        })
      }

      // Verify no self-assignments before inserting
      const hasSelfAssignment = assignments.some((a) => a.giver_id === a.receiver_id)
      if (hasSelfAssignment) {
        throw new Error("Error: Se detectó auto-asignación. Por favor intenta de nuevo.")
      }

      // Verify all participants are assigned
      const allGivers = new Set(assignments.map((a) => a.giver_id))
      const allReceivers = new Set(assignments.map((a) => a.receiver_id))
      if (
        allGivers.size !== participants.length ||
        allReceivers.size !== participants.length ||
        allGivers.size !== allReceivers.size
      ) {
        throw new Error("Error: El sorteo no es válido. Por favor intenta de nuevo.")
      }

      const { error } = await supabase.from("assignments").insert(assignments)

      if (error) throw error

      setHasAssignments(true)
      alert("¡Sorteo realizado exitosamente! Ahora cada participante puede ver su asignación.")
      await loadGroupData() // Reload to refresh UI
    } catch (err) {
      console.error("[v0] Error drawing names:", err)
      setError(err instanceof Error ? err.message : "Error al realizar el sorteo")
    } finally {
      setIsDrawing(false)
    }
  }

  const handleSendEmails = async () => {
    if (!confirm("¿Deseas enviar los resultados por email a todos los participantes con email válido?")) {
      return
    }

    setIsSendingEmails(true)
    setEmailResult(null)
    setError(null)

    try {
      const response = await fetch("/api/send-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar emails")
      }

      setEmailResult(data.message)

      if (data.failed && data.failed.length > 0) {
        console.log("[v0] Failed emails:", data.failed)
      }
    } catch (err) {
      console.error("[v0] Error sending emails:", err)
      setError(err instanceof Error ? err.message : "Error al enviar emails")
    } finally {
      setIsSendingEmails(false)
    }
  }

  const copyJoinCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.join_code)
      setCopiedJoinCode(true)
      setTimeout(() => setCopiedJoinCode(false), 2000)
    }
  }

  const shareJoinLink = () => {
    if (group) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
      const joinUrl = `${baseUrl}/unirse`
      const message = `¡Únete a nuestro Amigo Secreto "${group.name}"!\n\nCódigo: ${group.join_code}\n\nEntra aquí: ${joinUrl}`

      if (navigator.share) {
        navigator.share({
          title: `Amigo Secreto: ${group.name}`,
          text: message,
        })
      } else {
        navigator.clipboard.writeText(message)
        alert("Mensaje copiado al portapapeles")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Gift className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Grupo no encontrado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto">
            <Card className="shadow-lg border-2 border-amber-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
                    <Lock className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">Acceso Restringido</CardTitle>
                <CardDescription className="text-center">Esta es la página de administración del grupo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-center text-amber-800">
                    Solo el organizador puede acceder a esta página con su enlace especial de administrador.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => router.push(`/resultado/${groupId}`)} className="w-full" size="lg">
                    Ver Mis Resultados
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                    Volver al Inicio
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary hover:underline mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">Admin</span>
              </div>
              {group.budget_limit && (
                <p className="text-muted-foreground">Monto límite: ${group.budget_limit.toFixed(2)}</p>
              )}
              {group.custom_message && (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl text-pretty">{group.custom_message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={copyJoinCode} variant="outline" size="sm">
                {copiedJoinCode ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Código: {group.join_code}
                  </>
                )}
              </Button>
              <Button onClick={shareJoinLink} variant="default" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-1 gap-6">
          {/* Participants List */}
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participantes ({participants.length})
              </CardTitle>
              <CardDescription>Personas que se han unido al intercambio</CardDescription>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Aún no hay participantes</p>
                  <p className="text-sm text-muted-foreground mt-1">Comparte el código para que se unan (mínimo 3)</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-start justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-muted-foreground">{participant.contact}</p>
                        {participant.wishlist && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{participant.wishlist}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {participants.length >= 3 && (
                <div className="mt-6 space-y-3">
                  <Button onClick={handleDrawNames} className="w-full" size="lg" disabled={isDrawing}>
                    {isDrawing ? (
                      "Realizando sorteo..."
                    ) : hasAssignments ? (
                      <>
                        <Shuffle className="h-4 w-4 mr-2" />
                        Realizar Nuevo Sorteo
                      </>
                    ) : (
                      <>
                        <Shuffle className="h-4 w-4 mr-2" />
                        Realizar Sorteo
                      </>
                    )}
                  </Button>

                  {hasAssignments && (
                    <div className="bg-primary/10 p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-primary" />
                        <p className="font-medium text-sm">Sorteo realizado</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Los participantes pueden ver sus asignaciones en la página de resultados
                      </p>

                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={handleSendEmails}
                        disabled={isSendingEmails}
                      >
                        {isSendingEmails ? "Enviando emails..." : "📧 Enviar Resultados por Email"}
                      </Button>

                      {emailResult && (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md">
                          <p className="text-sm text-emerald-800">{emailResult}</p>
                        </div>
                      )}

                      {error && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent"
                        onClick={() => router.push(`/resultado/${groupId}`)}
                      >
                        Ver Página de Resultados
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {participants.length > 0 && participants.length < 3 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Se necesitan {3 - participants.length} participante(s) más para poder realizar el sorteo
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
