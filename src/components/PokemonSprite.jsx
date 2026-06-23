import { useEffect, useState } from 'react'
import { buscarPokeApiId, urlSpriteOficial } from '../lib/pokeapi'

// Mostra o sprite oficial do pokémon (via PokeAPI) com fallback discreto
// pra quando o nome não é reconhecido (ex: forma regional rara, ou nome
// específico do Cobblemon que não existe na PokeAPI).
export default function PokemonSprite({ nome, size = 40 }) {
  const [src, setSrc] = useState(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let ativo = true
    setFalhou(false)
    setSrc(null)

    buscarPokeApiId(nome).then((id) => {
      if (!ativo) return
      if (id) {
        setSrc(urlSpriteOficial(id))
      } else {
        setFalhou(true)
      }
    })

    return () => {
      ativo = false
    }
  }, [nome])

  const estiloBase = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  if (falhou || !src) {
    // placeholder: círculo com a primeira letra, enquanto carrega ou se não achar
    return (
      <div
        style={{
          ...estiloBase,
          borderRadius: '50%',
          background: 'var(--panel-raised)',
          border: '1px solid var(--line)',
          fontSize: size * 0.4,
          fontWeight: 700,
          color: 'var(--ink-dim)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {nome?.[0]?.toUpperCase() ?? '?'}
      </div>
    )
  }

  return (
    <div style={estiloBase}>
      <img
        src={src}
        alt={nome}
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
        onError={() => setFalhou(true)}
        loading="lazy"
      />
    </div>
  )
}
