"use client"

import { useEffect, useState } from "react"

interface DateFormatterProps {
  date: string
  options?: Intl.DateTimeFormatOptions
}

export const DateFormatter = ({ date, options }: DateFormatterProps) => {
  const [formattedDate, setFormattedDate] = useState<string>("")

  useEffect(() => {
    const dateObj = new Date(date)
    const formatted = dateObj.toLocaleDateString("es-ES", options || { day: "numeric", month: "short" })
    setFormattedDate(formatted)
  }, [date, options])

  return <span>{formattedDate || "..."}</span>
}

