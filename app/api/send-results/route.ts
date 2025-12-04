import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { groupId } = await request.json()

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get group info
    const { data: group, error: groupError } = await supabase.from("groups").select("*").eq("id", groupId).single()

    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    // Get all assignments with participant details
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select(
        `
        *,
        giver:participants!assignments_giver_id_fkey(id, name, contact),
        receiver:participants!assignments_receiver_id_fkey(id, name, contact, wishlist)
      `,
      )
      .eq("group_id", groupId)

    if (assignmentsError || !assignments || assignments.length === 0) {
      return NextResponse.json({ error: "No assignments found. Please draw names first." }, { status: 404 })
    }

    // Send emails using Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured. Please add RESEND_API_KEY." }, { status: 500 })
    }

    const emailPromises = assignments.map(async (assignment: any) => {
      const giver = assignment.giver
      const receiver = assignment.receiver

      // Check if contact is email
      const isEmail = giver.contact.includes("@")

      if (!isEmail) {
        console.log(`[v0] Skipping ${giver.name} - contact is not an email (${giver.contact})`)
        return { success: false, name: giver.name, reason: "Not an email" }
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      const resultUrl = `${baseUrl}/resultado/${groupId}?name=${encodeURIComponent(giver.name)}`

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Amigo Secreto - ${group.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0fdf4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0fdf4;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎁 Amigo Secreto</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">${group.name}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hola <strong>${giver.name}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ¡El sorteo de Amigo Secreto ha sido realizado! Tu persona asignada es:
              </p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 0 0 30px 0; border-radius: 8px;">
                <h2 style="margin: 0 0 10px 0; color: #10b981; font-size: 24px; font-weight: bold;">
                  ${receiver.name}
                </h2>
                ${
                  receiver.wishlist
                    ? `
                <div style="margin-top: 15px;">
                  <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Lista de deseos:</p>
                  <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">${receiver.wishlist}</p>
                </div>
                `
                    : ""
                }
              </div>
              
              ${
                group.budget_limit
                  ? `
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                💰 <strong>Monto límite:</strong> $${group.budget_limit.toFixed(2)}
              </p>
              `
                  : ""
              }
              
              ${
                group.custom_message
                  ? `
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 0 0 30px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  📝 <strong>Mensaje del organizador:</strong><br>
                  ${group.custom_message}
                </p>
              </div>
              `
                  : ""
              }
              
              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                También puedes ver tu asignación en cualquier momento haciendo clic en el botón de abajo:
              </p>
              
              <div style="text-align: center; margin: 0 0 30px 0;">
                <a href="${resultUrl}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Ver Mi Asignación
                </a>
              </div>
              
              <p style="margin: 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                ⚠️ Recuerda mantener en secreto tu asignación para conservar la sorpresa del intercambio.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-radius: 0 0 16px 16px;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Amigo Secreto Online - Organiza tu intercambio de regalos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Amigo Secreto <onboarding@resend.dev>",
            to: [giver.contact],
            subject: `🎁 Tu Amigo Secreto en ${group.name}`,
            html: htmlContent,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`[v0] Failed to send email to ${giver.name}:`, errorData)
          return { success: false, name: giver.name, reason: errorData.message || "Failed to send" }
        }

        return { success: true, name: giver.name }
      } catch (error) {
        console.error(`[v0] Error sending email to ${giver.name}:`, error)
        return { success: false, name: giver.name, reason: "Network error" }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter((r) => r.success).length
    const failedResults = results.filter((r) => !r.success)

    return NextResponse.json({
      success: true,
      sent: successCount,
      total: assignments.length,
      failed: failedResults,
      message: `Se enviaron ${successCount} de ${assignments.length} emails exitosamente.`,
    })
  } catch (error) {
    console.error("[v0] Error in send-results API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
