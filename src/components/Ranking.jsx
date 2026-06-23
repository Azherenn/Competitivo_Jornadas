import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ConfirmButton from './ConfirmButton'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function Ranking() {
  const [temporadas, setTemporadas] = useState([])
  const [temporadaSelecionada, setTemporadaSelecionada] = useState(null)
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(true)

  const [isAdmin, setIsAdmin] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')

  const [ajustandoNick, setAjustandoNick] = useState(null)
  const [valorAjuste, setValorAjuste] = useState('')
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroAjuste, setErroAjuste] = useState('')
  const [erroTemporada, setErroTemporada] = useState('')

  async function carregarTemporadas() {
    const { data, error } = await supabase
      .from('temporadas')
      .select('id, nome, eh_atual')
      .order('criada_em', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    setTemporadas(data)
    if (!temporadaSelecionada) {
      const atual = data.find((t) => t.eh_atual)
      setTemporadaSelecionada(atual?.id ?? data[0]?.id ?? null)
    }
  }

  async function carregarRanking() {
    if (!temporadaSelecionada) return
    setLoading(true)
    const { data, error } = await supabase
      .from('ranking_jogadores')
      .select('*')
      .eq('temporada_id', temporadaSelecionada)
      .order('pontos_totais', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setLinhas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarTemporadas()
  }, [])

  useEffect(() => {
    carregarRanking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temporadaSelecionada])

  function handleLogin(e) {
    e.preventDefault()
    if (senhaInput === ADMIN_PASSWORD && ADMIN_PASSWORD) {
      setIsAdmin(true)
      setSenhaErro('')
    } else {
      setSenhaErro('Senha incorreta.')
    }
  }

  const temporadaAtual = temporadas.find((t) => t.id === temporadaSelecionada)
  const vendoTemporadaAntiga = temporadaAtual && !temporadaAtual.eh_atual

  function iniciarAjuste(linha) {
    setAjustandoNick(linha.nick_jogador)
    setValorAjuste(String(linha.pontos_ajuste ?? 0))
    setMotivoAjuste('')
  }

  async function salvarAjuste() {
    setSalvando(true)
    setErroAjuste('')
    try {
      const { error } = await supabase.from('ajustes_ranking').upsert(
        {
          nick_jogador: ajustandoNick,
          temporada_id: temporadaSelecionada,
          pontos_ajuste: Number(valorAjuste) || 0,
          motivo: motivoAjuste.trim() || null,
        },
        { onConflict: 'nick_jogador,temporada_id' }
      )
      if (error) throw error

      setAjustandoNick(null)
      carregarRanking()
    } catch (err) {
      console.error(err)
      setErroAjuste('Não consegui salvar o ajuste de pontos.')
    } finally {
      setSalvando(false)
    }
  }

  async function reativarTemporada(id) {
    setErroTemporada('')
    try {
      // a trigger no banco já garante que só uma temporada fica "atual";
      // só precisamos marcar essa como true.
      const { error } = await supabase.from('temporadas').update({ eh_atual: true }).eq('id', id)
      if (error) throw error
      await carregarTemporadas()
    } catch (err) {
      console.error(err)
      setErroTemporada('Não consegui reativar essa temporada.')
    }
  }

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

      {vendoTemporadaAntiga && (
        <div className="row-meta" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>Você está vendo o histórico de "{temporadaAtual.nome}" (temporada antiga).</span>
          {isAdmin && (
            <ConfirmButton
              onConfirm={() => reativarTemporada(temporadaAtual.id)}
              confirmLabel="Reativar de vez"
            >
              Reativar esta temporada
            </ConfirmButton>
          )}
          {erroTemporada && <span className="error-text">{erroTemporada}</span>}
        </div>
      )}

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
            <div key={l.nick_jogador} className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                {isAdmin && (
                  <button className="btn btn-ghost btn-sm" onClick={() => iniciarAjuste(l)}>
                    Ajustar
                  </button>
                )}
              </div>

              {l.pontos_ajuste !== 0 && (
                <div className="row-meta" style={{ marginTop: 2, paddingLeft: 36 }}>
                  {l.pontos_calculados} pts calculados {l.pontos_ajuste > 0 ? '+' : ''}
                  {l.pontos_ajuste} de ajuste manual
                </div>
              )}

              {ajustandoNick === l.nick_jogador && (
                <div style={{ marginTop: 8, paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="field-row">
                    <div className="field">
                      <label>Ajuste de pontos (+ ou -)</label>
                      <input
                        type="number"
                        value={valorAjuste}
                        onChange={(e) => setValorAjuste(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Motivo (opcional)</label>
                      <input
                        type="text"
                        value={motivoAjuste}
                        onChange={(e) => setMotivoAjuste(e.target.value)}
                        placeholder="Ex: correção de colocação"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" onClick={salvarAjuste} disabled={salvando}>
                      {salvando ? 'Salvando…' : 'Salvar ajuste'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAjustandoNick(null)}>
                      Cancelar
                    </button>
                  </div>
                  {erroAjuste && <p className="error-text">{erroAjuste}</p>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!isAdmin && (
        <div className="panel">
          <h2 className="panel-title">Área do admin</h2>
          <p className="panel-hint">Ajustar pontos ou reativar temporadas é só pra quem cuida do servidor.</p>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Senha de admin</label>
              <input type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} />
            </div>
            {senhaErro && <p className="error-text">{senhaErro}</p>}
            <button className="btn btn-ghost" type="submit">
              Entrar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
