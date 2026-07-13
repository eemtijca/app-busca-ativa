import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Informe um e-mail válido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { error } = await supabaseAdmin.rpc('fn_solicitar_codigo_redefinicao', {
      p_email: email,
    })

    if (error) {
      console.error('[solicitar-codigo] Erro ao processar:', error.message)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Se o e-mail estiver cadastrado, a administração será notificada.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('[solicitar-codigo] Erro interno:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor. Tente novamente.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
