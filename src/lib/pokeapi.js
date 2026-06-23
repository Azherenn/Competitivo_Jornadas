// Helper pra resolver nome de pokémon/golpe -> dados da PokeAPI
// (sprite, tipo, categoria). Guarda em memória (cache simples) pra
// não bater na API repetidas vezes com o mesmo nome durante a sessão.

const cachePokemon = new Map()
const cacheGolpe = new Map()

// A PokeAPI usa nomes em minúsculo, sem espaço (hífen no lugar).
// Cobre os casos comuns; nomes muito fora do padrão (formas regionais
// raras) podem não casar — nesse caso o app simplesmente não mostra sprite.
function normalizarNome(nome) {
  return nome
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '-')
}

export function urlSpriteOficial(pokeapiId, estilo = '3d') {
  if (!pokeapiId) return null
  if (estilo === 'pixel') {
    // Sprite pixel-art estilo Gen 5 (Black/White) — o mais nostálgico
    // e nítido dentre as opções de pixel da PokeAPI.
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/${pokeapiId}.png`
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeapiId}.png`
}

export async function buscarPokeApiId(nome) {
  const chave = normalizarNome(nome)
  if (cachePokemon.has(chave)) return cachePokemon.get(chave)

  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${chave}`)
    if (!resp.ok) {
      cachePokemon.set(chave, null)
      return null
    }
    const data = await resp.json()
    cachePokemon.set(chave, data.id)
    return data.id
  } catch {
    cachePokemon.set(chave, null)
    return null
  }
}

// Cores por tipo, convenção usada pelos próprios jogos/Showdown.
// Usadas pra colorir o "chip" de golpe pelo tipo dele.
export const CORES_TIPO = {
  normal: '#9a9a73', fire: '#e8703a', water: '#5a8fd6', electric: '#e0c632',
  grass: '#6fbb56', ice: '#6fd6d6', fighting: '#c4452c', poison: '#a157a1',
  ground: '#cfb656', flying: '#9c91e8', psychic: '#e85f8c', bug: '#a8b82a',
  rock: '#b8a13a', ghost: '#6f5c99', dragon: '#7560e8', dark: '#73604f',
  steel: '#aaaabf', fairy: '#e6a0c4',
}

// Busca nome/tipo/categoria de um golpe. Categoria vem em inglês
// da API ('physical' | 'special' | 'status'); convertido aqui pra
// rótulo em português pra exibição.
//
// Cache em duas camadas: memória (instantâneo dentro da sessão) e
// Supabase (golpes_cache — compartilhado entre todos os jogadores,
// então depois que o primeiro registro usa um golpe, os próximos
// nem precisam ir até a PokeAPI de novo).
const CATEGORIA_PT = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Status',
}

export async function buscarDadosGolpe(nomeGolpe, supabaseClient) {
  const chave = normalizarNome(nomeGolpe)
  if (cacheGolpe.has(chave)) return cacheGolpe.get(chave)

  // 1) tenta o cache persistente no Supabase, se um client foi passado
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('golpes_cache')
        .select('tipo, categoria')
        .eq('nome', chave)
        .maybeSingle()

      if (data) {
        const resultado = {
          tipo: data.tipo,
          categoria: CATEGORIA_PT[data.categoria] ?? data.categoria,
          corTipo: CORES_TIPO[data.tipo] ?? '#9a9a9a',
        }
        cacheGolpe.set(chave, resultado)
        return resultado
      }
    } catch {
      // se o cache persistente falhar por qualquer motivo, segue pra API normal
    }
  }

  // 2) busca na PokeAPI e grava no cache persistente pra próxima vez
  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/move/${chave}`)
    if (!resp.ok) {
      cacheGolpe.set(chave, null)
      return null
    }
    const data = await resp.json()
    const categoriaOriginal = data.damage_class?.name
    const resultado = {
      tipo: data.type?.name ?? null,
      categoria: CATEGORIA_PT[categoriaOriginal] ?? null,
      corTipo: CORES_TIPO[data.type?.name] ?? '#9a9a9a',
    }
    cacheGolpe.set(chave, resultado)

    if (supabaseClient && resultado.tipo) {
      supabaseClient
        .from('golpes_cache')
        .upsert({ nome: chave, tipo: resultado.tipo, categoria: categoriaOriginal })
        .then(() => {})
        .catch(() => {})
    }

    return resultado
  } catch {
    cacheGolpe.set(chave, null)
    return null
  }
}
