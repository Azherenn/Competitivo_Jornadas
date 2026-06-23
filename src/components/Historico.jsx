import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PokemonSprite from './PokemonSprite'

export default function Historico({ refreshKey }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    supabase
      .from('registros')
      .select('id, nick_jogador, time_usado, mais_vistos, colocacao, criado_em, torneios(nome, data, formato)')
      .order('criado_em', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error(error)
        } else {
          setRegistros(data)
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshKey])

  if (loading) {
    return <div className="panel empty-state">Carregando histórico…</div>
  }

  if (registros.length === 0) {
    return (
      <div className="panel empty-state">
        Ainda não tem nenhum registro. Vai na aba "Registrar" e seja o primeiro.
      </div>
    )
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Histórico de registros</h2>
      <p className="panel-hint">Últimas submissões dos jogadores, mais recentes primeiro.</p>

      {registros.map((r) => (
        <div className="row" key={r.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="row-name">{r.torneios?.nome ?? 'Torneio removido'}</span>
            <span className="row-meta">{r.torneios?.data}</span>
          </div>
          <div className="row-meta" style={{ marginTop: 2 }}>
            {r.nick_jogador} · {r.torneios?.formato} {r.colocacao ? `· ${r.colocacao}` : ''}
          </div>
          {r.time_usado?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="row-meta" style={{ marginBottom: 4 }}>Time</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.time_usado.map((nome) => (
                  <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PokemonSprite nome={nome} size={28} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {r.mais_vistos?.length > 0 && (
            <div className="row-meta" style={{ marginTop: 8 }}>
              Mais visto: {r.mais_vistos.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
