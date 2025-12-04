"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { Group, Participant } from "@/lib/types"
import { Gift, MessageCircle, Lock, Sparkles } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ResultPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.groupId as string

  const [group, setGroup] = useState<Group | null>(null)
  const [receiver, setReceiver] = useState<Participant | null>(null)
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [groupId])

  const loadData = async () => {
    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push("/auth/login")
        return
      }

      // Load group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      // Find current user's participant record
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single()

      if (participantError) {
        if (participantError.code === "PGRST116") {
          setError("No estás registrado como participante en este sorteo")
        } else {
          throw participantError
        }
        setIsLoading(false)
        return
      }

      setCurrentParticipant(participantData)

      // Check if draw has been made
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("receiver_id")
        .eq("group_id", groupId)
        .eq("giver_id", participantData.id)
        .single()

      if (assignmentError) {
        if (assignmentError.code === "PGRST116") {
          setError("Aún no se ha realizado el sorteo para este grupo")
        } else {
          throw assignmentError
        }
        setIsLoading(false)
        return
      }

      // Get receiver details (the person this user will give a gift to)
      const { data: receiverData, error: receiverError } = await supabase
        .from("participants")
        .select("*")
        .eq("id", assignmentData.receiver_id)
        .single()

      if (receiverError) throw receiverError
      setReceiver(receiverData)
    } catch (err) {
      console.error("[v0] Error loading data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  const shareViaWhatsApp = () => {
    if (!receiver) return
    const message = `¡Hola! Tu amigo secreto para "${group?.name}" es: ${receiver.name}${receiver.wishlist ? `\n\nLista de deseos: ${receiver.wishlist}` : ""}${group?.budget_limit ? `\n\nMonto límite: $${group.budget_limit.toFixed(2)}` : ""}`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <Gift className="h-16 w-16 text-emerald-600 mx-auto mb-4 animate-pulse" />
            <Sparkles className="h-6 w-6 text-emerald-400 absolute -top-1 -right-1 animate-pulse delay-75" />
          </div>
          <p className="text-gray-600 font-medium">Cargando tu resultado...</p>
        </div>
      </div>
    )
  }

  if (error && !receiver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-2 border-red-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                    <Lock className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <CardTitle className="text-center text-2xl">No se puede ver el resultado</CardTitle>
                <CardDescription className="text-center">{error}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Link href="/dashboard">
                    <Button variant="outline">Volver al Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 pb-8">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <Gift className="h-20 w-20 text-emerald-600 mx-auto" />
              <Sparkles className="h-7 w-7 text-emerald-400 absolute -top-2 -right-2 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Tu Amigo Secreto</h1>
            {group && <p className="text-lg text-gray-600">{group.name}</p>}
          </div>

          {receiver && currentParticipant && (
            <Card className="shadow-xl border-2 border-emerald-200 bg-white">
              <CardHeader className="bg-gradient-to-br from-emerald-50 to-white border-b border-emerald-100">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-3 font-medium">Hola, {currentParticipant.name}</p>
                  <p className="text-lg text-gray-700 mb-1">Tu amigo secreto es:</p>
                  <p className="text-4xl font-bold text-emerald-600 mt-2">{receiver.name}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {group?.budget_limit && (
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">$</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Monto límite</p>
                        <p className="text-xl font-bold text-emerald-700">${group.budget_limit.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {receiver.wishlist && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-emerald-600" />
                      Lista de deseos
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{receiver.wishlist}</p>
                  </div>
                )}

                {receiver.contact && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Contacto</p>
                    <p className="text-sm text-gray-600">{receiver.contact}</p>
                  </div>
                )}

                {group?.custom_message && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">📝 Mensaje del organizador</p>
                    <p className="text-sm text-blue-800 leading-relaxed">{group.custom_message}</p>
                  </div>
                )}

                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 rounded-lg border border-amber-200 mt-6">
                  <p className="text-xs text-center text-amber-800 font-medium">
                    🔒 ¡Es un secreto! Solo tú puedes ver esta información. No compartas tu asignación con nadie.
                  </p>
                </div>

                <Button
                  onClick={shareViaWhatsApp}
                  variant="outline"
                  className="w-full mt-4 border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Compartir por WhatsApp
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-6 space-y-2">
            <Link href="/dashboard" className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline block">
              ← Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
