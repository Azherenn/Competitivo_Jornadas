import { useEffect, useState } from 'react'
import { buscarDadosGolpe } from '../lib/pokeapi'
import { supabase } from '../lib/supabase'

// Mostra um golpe como um pequeno chip colorido pelo tipo
// (ex: bolinha vermelha pra golpes de fogo). Se o nome do golpe
// não for reconhecido pela PokeAPI, mostra só o texto sem cor.
export default function MoveChip({ nome }) {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    let ativo = true
    setDados(null)
    if (!nome) return

    const timeoutId = setTimeout(() => {
      buscarDadosGolpe(nome, supabase).then((res) => {
        if (ativo) setDados(res)
      })
    }, 350)

    return () => {
      ativo = false
      clearTimeout(timeoutId)
    }
  }, [nome])

  if (!nome) return null

  return (
    <span className="move-chip">
      {dados?.corTipo && <span className="move-dot" style={{ background: dados.corTipo }} />}
      {nome}
    </span>
  )
}
