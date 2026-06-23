import { useEffect, useState } from 'react'
import { buscarPokeApiId, urlSpriteOficial } from '../lib/pokeapi'
import { useEstiloSprite } from '../lib/EstiloSpriteContext'

// Mostra o sprite do pokémon (via PokeAPI) com fallback discreto
// pra quando o nome não é reconhecido (ex: forma regional rara, ou nome
// específico do Cobblemon que não existe na PokeAPI). Respeita a
// preferência global de estilo (3D ou Pixel) escolhida no header.
export default function PokemonSprite({ nome, size = 40 }) {
  const { estilo } = useEstiloSprite()
  const [pokeapiId, setPokeapiId] = useState(null)
  const [falhou, setFalhou] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    setFalhou(false)
    setCarregando(true)

    // debounce: espera o nome "parar de mudar" por um instante antes de
    // buscar — evita uma chamada à PokeAPI a cada tecla digitada quando
    // esse componente está dentro de um campo de texto controlado.
    const timeoutId = setTimeout(() => {
      buscarPokeApiId(nome).then((id) => {
        if (!ativo) return
        if (id) {
          setPokeapiId(id)
        } else {
          setFalhou(true)
        }
        setCarregando(false)
      })
    }, 350)

    return () => {
      ativo = false
      clearTimeout(timeoutId)
    }
  }, [nome])

  const src = pokeapiId ? urlSpriteOficial(pokeapiId, estilo) : null

  const estiloBase = {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  if (falhou || (!src && !carregando)) {
    // placeholder: círculo com a primeira letra, se não achar o pokémon
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
        title={nome}
      >
        {nome?.[0]?.toUpperCase() ?? '?'}
      </div>
    )
  }

  if (!src) {
    // ainda carregando o ID por trás — placeholder neutro pra não "pular" o layout
    return <div style={estiloBase} />
  }

  return (
    <div style={estiloBase}>
      <img
        key={src}
        src={src}
        alt={nome}
        width={size}
        height={size}
        style={{ objectFit: 'contain', imageRendering: estilo === 'pixel' ? 'pixelated' : 'auto' }}
        onError={() => setFalhou(true)}
        loading="lazy"
      />
    </div>
  )
}
