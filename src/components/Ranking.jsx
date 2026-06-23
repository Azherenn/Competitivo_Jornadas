import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Ranking() {
  const [temporadas, setTemporadas] = useState([])
  const [temporadaSelecionada, setTemporadaSelecionada] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('temporadas')
      .select('id, nome, eh_atual')
      .order('criada_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          return
        }
        setTemporadas(data)
        const atual = data.find((t) => t.eh_atual)
        setTemporadaSelecionada(atual?.id ?? data[0]?.id ?? null)
      })
  }, [])

  useEffect(() => {
    if (!temporadaSelecionada) return
    setLoading(true)
    supabase
      .from('ranking_jogadores')
      .select('*')
      .eq('temporada_id', temporadaSelecionada)
      .order('pontos_totais', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
        } else {
          setLinhas(data)
        }
        setLoading(false)
      })
  }, [temporadaSelecionada])

  const temporadaAtual = temporadas.find((t) => t.id === temporadaSelecionada)

  return (
    <div>
      <div className="field" style={{ maxWidth: 280 }}>
        <label>Temporada</label>
        <select
          value={temporadaSelecionada ?? ''}
          onChange={(e) => setTemporadaSelecionada(e.target.value)}
        >
          {temporadas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} {t.eh_atual ? '(atual)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="panel">
        <h2 className="panel-title">Ranking — {temporadaAtual?.nome ?? '…'}</h2>
        <p className="panel-hint">
          Pontos por colocação ao longo da temporada. Campeão vale mais, depois vice, top 4, e assim por
          diante.
        </p>

        {loading ? (
          <p className="row-meta">Carregando…</p>
        ) : linhas.length === 0 ? (
          <p className="empty-state">
            Ainda não tem registros nessa temporada. O ranking aparece conforme os jogadores forem
            registrando torneios.
          </p>
        ) : (
          linhas.map((l, i) => (
            <div className="row" key={l.nick_jogador}>
              <span
                className="row-meta"
                style={{ width: 24, fontWeight: 700, color: i < 3 ? 'var(--accent)' : undefined }}
              >
                {i + 1}.
              </span>
              <span className="row-name" style={{ flex: 1 }}>
                {l.nick_jogador}
              </span>
              <span className="row-meta">{l.total_torneios} torneios</span>
              <span className="row-meta" style={{ minWidth: 70, textAlign: 'right' }}>
                {l.pontos_totais} pts
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
