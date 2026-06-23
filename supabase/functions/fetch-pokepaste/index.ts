import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Responde ao preflight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url || !url.includes('pokepast.es')) {
      throw new Error('URL inválida do PokePaste')
    }

    // Pega o ID no final do link e monta a URL da versão "raw" (texto puro)
    const pasteId = url.split('/').pop()
    const rawUrl = `https://pokepast.es/raw/${pasteId}`

    const response = await fetch(rawUrl)
    const text = await response.text()

    // Lógica para quebrar o texto e pegar os nomes
    const blocks = text.split('\n\n').filter(b => b.trim().length > 0)
    const team = blocks.map(block => {
      const firstLine = block.split('\n')[0].trim()
      // Remove itens (depois do @) e gêneros (M)/(F)
      let namePart = firstLine.split('@')[0].split('(M)')[0].split('(F)')[0].trim()
      
      // Se tiver nickname ex: "Zezinho (Garchomp)", pega o que está entre parênteses
      if (namePart.includes('(') && namePart.includes(')')) {
         const match = namePart.match(/\(([^)]+)\)/)
         if (match) return match[1].trim().toLowerCase()
      }
      return namePart.toLowerCase()
    }).filter(n => n)

    return new Response(JSON.stringify({ team }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: corsHeaders 
    })
  }
})