import { createContext, useContext, useEffect, useState } from 'react'

const EstiloSpriteContext = createContext({ estilo: '3d', setEstilo: () => {} })

function estiloInicial() {
  try {
    return localStorage.getItem('dex-estilo-sprite') || '3d'
  } catch {
    return '3d'
  }
}

export function EstiloSpriteProvider({ children }) {
  const [estilo, setEstilo] = useState(estiloInicial)

  useEffect(() => {
    try {
      localStorage.setItem('dex-estilo-sprite', estilo)
    } catch {
      // ambiente sem localStorage — ignora
    }
  }, [estilo])

  return (
    <EstiloSpriteContext.Provider value={{ estilo, setEstilo }}>
      {children}
    </EstiloSpriteContext.Provider>
  )
}

export function useEstiloSprite() {
  return useContext(EstiloSpriteContext)
}
