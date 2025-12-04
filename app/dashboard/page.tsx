"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateFormatter } from "@/components/date-formatter"
import { createClient } from "@/lib/supabase/client"
import type { Group, Profile } from "@/lib/types"
import { Gift, Plus, Users, LogOut, Settings, Search, Calendar, DollarSign, Sparkles, Package, UserCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [joinedGroups, setJoinedGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push("/auth/login")
        return
      }

      // Set user info from auth immediately (fallback while profile loads)
      const nameFromMetadata = (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Usuario"
      setUserName(nameFromMetadata)
      setUserEmail(user.email || "")

      // Load profile - retry if not found (trigger might be delayed)
      let profileData = null
      let profileError = null
      let retries = 3

      while (retries > 0 && !profileData) {
        const result = await supabase.from("profiles").select("*").eq("id", user.id).single()
        profileData = result.data
        profileError = result.error

        if (profileError && profileError.code === "PGRST116") {
          // Profile not found, wait and retry
          await new Promise((resolve) => setTimeout(resolve, 500))
          retries--
        } else {
          break
        }
      }

      if (profileError) {
        if (profileError.code === "PGRST116") {
          // Profile still not found after retries - create it manually as fallback
          const nameToUse = nameFromMetadata
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              name: nameToUse,
              email: user.email || "",
            })
            .select()
            .single()

          if (createError) {
            console.error("Error creating profile:", createError)
            // Use auth metadata as fallback
            setUserName(nameToUse)
          } else if (newProfile) {
            setProfile(newProfile)
            setUserName(newProfile.name)
            setUserEmail(newProfile.email)
          }
        } else {
          console.error("Error loading profile:", profileError)
        }
      } else if (profileData) {
        setProfile(profileData)
        // Use profile name if available, otherwise keep the one from metadata
        if (profileData.name && profileData.name !== "Usuario") {
          setUserName(profileData.name)
        }
        if (profileData.email) {
          setUserEmail(profileData.email)
        }
      }

      // Load groups created by user (don't fail if this errors)
      const { data: createdGroups, error: createdError } = await supabase
        .from("groups")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })

      if (createdError) {
        console.error("Error loading created groups:", createdError)
      } else {
        setMyGroups(createdGroups || [])
      }

      // Load groups user joined (don't fail if this errors)
      const { data: participants, error: participantsError } = await supabase
        .from("participants")
        .select("group_id")
        .eq("user_id", user.id)

      if (participantsError) {
        console.error("Error loading participants:", participantsError)
      } else if (participants && participants.length > 0) {
        const groupIds = participants.map((p) => p.group_id)
        const { data: joinedGroupsData, error: joinedError } = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds)
          .order("created_at", { ascending: false })

        if (joinedError) {
          console.error("Error loading joined groups:", joinedError)
        } else {
          setJoinedGroups(joinedGroupsData || [])
        }
      }
    } catch (err) {
      console.error("Error loading dashboard:", err)
      // Don't block the UI, show what we can
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <Gift className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <Sparkles className="h-6 w-6 text-accent absolute -top-1 -right-1 animate-pulse delay-75" />
          </div>
          <p className="text-muted-foreground font-medium">Cargando tu dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 pb-8">
      {/* Header - Modern & Clean */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 border-2 border-emerald-200 shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-sm">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {userName || "Usuario"}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate flex items-center gap-1">
                  <UserCircle className="h-3 w-3" />
                  {userEmail || ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/preferences">
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-emerald-50 hover:text-emerald-600">
                  <Settings className="h-5 w-5 text-gray-600" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-red-50 hover:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-6">

        {/* Quick Actions - Modern Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href="/dashboard/create-group" className="block group">
            <Card className="border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-xl transition-all cursor-pointer h-full bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -mr-16 -mt-16"></div>
              <CardContent className="p-5 sm:p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    <Plus className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1 group-hover:text-emerald-700 transition-colors">
                      Crear Sorteo
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      Organiza un nuevo intercambio de regalos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/join-group" className="block group">
            <Card className="border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer h-full bg-gradient-to-br from-blue-50 via-white to-blue-50/50 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16"></div>
              <CardContent className="p-5 sm:p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform">
                    <Search className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                      Unirse a Sorteo
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      Ingresa un código para participar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* My Created Groups */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mis Sorteos</h2>
                <p className="text-xs text-gray-500">Sorteos que has creado</p>
              </div>
            </div>
            {myGroups.length > 0 && (
              <span className="text-sm font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                {myGroups.length}
              </span>
            )}
          </div>
          {myGroups.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
              <CardContent className="pt-10 pb-10">
                <div className="text-center">
                  <div className="h-20 w-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Package className="h-10 w-10 text-emerald-600" />
                  </div>
                  <p className="text-base text-gray-700 mb-2 font-semibold">Aún no has creado ningún sorteo</p>
                  <p className="text-sm text-gray-500 mb-6">Comienza organizando tu primer intercambio de regalos</p>
                  <Link href="/dashboard/create-group">
                    <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md">
                      <Plus className="h-4 w-4" />
                      Crear tu primer sorteo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.map((group) => (
                <Card
                  key={group.id}
                  className="border-2 border-gray-200 hover:border-emerald-400 hover:shadow-xl transition-all group bg-white"
                >
                  <CardHeader className="pb-3 bg-gradient-to-br from-emerald-50 to-white border-b border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-900 truncate mb-2 flex items-center gap-2">
                          <Gift className="h-5 w-5 text-emerald-600 shrink-0" />
                          {group.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">
                            {group.join_code}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="space-y-2.5">
                      {group.budget_limit && (
                        <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg">
                          <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-gray-700">
                            Límite: <span className="font-semibold text-gray-900">${group.budget_limit.toFixed(2)}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <DateFormatter date={group.created_at} options={{ day: "numeric", month: "short" }} />
                      </div>
                    </div>
                    <Link href={`/grupo/${group.id}?admin=${group.admin_secret}`}>
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm" size="sm">
                        Administrar
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Joined Groups */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Participando</h2>
                <p className="text-xs text-gray-500">Sorteos en los que participas</p>
              </div>
            </div>
            {joinedGroups.length > 0 && (
              <span className="text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                {joinedGroups.length}
              </span>
            )}
          </div>
          {joinedGroups.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
              <CardContent className="pt-10 pb-10">
                <div className="text-center">
                  <div className="h-20 w-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Users className="h-10 w-10 text-blue-600" />
                  </div>
                  <p className="text-base text-gray-700 mb-2 font-semibold">Aún no te has unido a ningún sorteo</p>
                  <p className="text-sm text-gray-500 mb-6">Únete a un sorteo usando un código de acceso</p>
                  <Link href="/dashboard/join-group">
                    <Button variant="outline" className="gap-2 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50">
                      <Search className="h-4 w-4 text-blue-600" />
                      Unirse a un sorteo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedGroups.map((group) => (
                <Card
                  key={group.id}
                  className="border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all group bg-white"
                >
                  <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-900 truncate mb-2 flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600 shrink-0" />
                          {group.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-semibold">
                            Participante
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {group.budget_limit && (
                      <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="text-gray-700">
                          Límite: <span className="font-semibold text-gray-900">${group.budget_limit.toFixed(2)}</span>
                        </span>
                      </div>
                    )}
                    <Link href={`/resultado/${group.id}`}>
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm" size="sm">
                        Ver Resultados
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

