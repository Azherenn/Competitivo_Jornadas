// Helper pra resolver nome de pokémon -> número da PokeAPI -> URL do sprite.
// Guarda em memória (cache simples) pra não bater na API repetidas vezes
// com o mesmo nome durante a sessão.

const cache = new Map()

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

export function urlSpriteOficial(pokeapiId) {
  if (!pokeapiId) return null
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeapiId}.png`
}

export async function buscarPokeApiId(nome) {
  const chave = normalizarNome(nome)
  if (cache.has(chave)) return cache.get(chave)

  try {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${chave}`)
    if (!resp.ok) {
      cache.set(chave, null)
      return null
    }
    const data = await resp.json()
    cache.set(chave, data.id)
    return data.id
  } catch {
    cache.set(chave, null)
    return null
  }
}
