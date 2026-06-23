import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { capitalizar } from '../lib/formatacao'
import PokemonSprite from './PokemonSprite'
import MoveChip from './MoveChip'
import ConfirmButton from './ConfirmButton'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD
const COLOCACOES = ['Campeão', 'Vice', 'Top 4', 'Top 8', 'Fase de grupos', 'Outro']

export default function Historico({ refreshKey }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [isAdmin, setIsAdmin] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [rascunho, setRascunho] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erroEdicao, setErroEdicao] = useState('')

  async function carregar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('registros')
      .select(
        'id, nick_jogador, time_usado, time_estruturado, mais_vistos, colocacao, observacoes, criado_em, torneios(id, nome, data, formato)'
      )
      .order('criado_em', { ascending: false })
      .limit(50)

    if (error) {
      console.error(error)
      setErro('Não consegui carregar o histórico agora.')
    } else {
      setRegistros(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  function handleLogin(e) {
    e.preventDefault()
    if (senhaInput === ADMIN_PASSWORD && ADMIN_PASSWORD) {
      setIsAdmin(true)
      setSenhaErro('')
    } else {
      setSenhaErro('Senha incorreta.')
    }
  }

  function iniciarEdicao(registro) {
    setEditandoId(registro.id)
    setErroEdicao('')
    setRascunho({
      nick_jogador: registro.nick_jogador,
      colocacao: registro.colocacao ?? '',
      observacoes: registro.observacoes ?? '',
      mais_vistos: (registro.mais_vistos ?? []).join(', '),
    })
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setRascunho(null)
    setErroEdicao('')
  }

  async function salvarEdicao(id) {
    setSalvando(true)
    setErroEdicao('')
    try {
      const { error } = await supabase
        .from('registros')
        .update({
          nick_jogador: rascunho.nick_jogador.trim(),
          colocacao: rascunho.colocacao || null,
          observacoes: rascunho.observacoes.trim() || null,
          mais_vistos: rascunho.mais_vistos
            .split(',')
            .map((s) => capitalizar(s.trim()))
            .filter(Boolean),
        })
        .eq('id', id)
      if (error) throw error

      cancelarEdicao()
      carregar()
    } catch (err) {
      console.error(err)
      setErroEdicao('Não consegui salvar a edição.')
    } finally {
      setSalvando(false)
    }
  }

  async function apagarRegistro(id) {
    const { error } = await supabase.from('registros').delete().eq('id', id)
    if (error) {
      console.error(error)
      return
    }
    carregar()
  }

  if (loading) {
    return <div className="panel empty-state">Carregando histórico…</div>
  }

  if (erro) {
    return <div className="panel empty-state error-text">{erro}</div>
  }

  return (
    <div>
      <div className="panel">
        <h2 className="panel-title">Histórico de registros</h2>
        <p className="panel-hint">Últimas submissões dos jogadores, mais recentes primeiro.</p>

        {registros.length === 0 ? (
          <p className="empty-state">Ainda não tem nenhum registro. Vai na aba "Registrar" e seja o primeiro.</p>
        ) : (
          registros.map((r) => {
            const time = r.time_estruturado?.length ? r.time_estruturado : null
            const emEdicao = editandoId === r.id

            return (
              <div className="row" key={r.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="row-name">{r.torneios?.nome ?? 'Torneio removido'}</span>
                  <span className="row-meta">{r.torneios?.data}</span>
                </div>

                {emEdicao ? (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="field-row">
                      <div className="field">
                        <label>Nick</label>
                        <input
                          type="text"
                          value={rascunho.nick_jogador}
                          onChange={(e) => setRascunho({ ...rascunho, nick_jogador: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label>Colocação</label>
                        <select
                          value={rascunho.colocacao}
                          onChange={(e) => setRascunho({ ...rascunho, colocacao: e.target.value })}
                        >
                          <option value="">Não informar</option>
                          {COLOCACOES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Mais vistos (separe por vírgula)</label>
                      <input
                        type="text"
                        value={rascunho.mais_vistos}
                        onChange={(e) => setRascunho({ ...rascunho, mais_vistos: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Observações</label>
                      <textarea
                        rows={2}
                        value={rascunho.observacoes}
                        onChange={(e) => setRascunho({ ...rascunho, observacoes: e.target.value })}
                      />
                    </div>
                    <p className="row-meta">
                      O time (pokémon/item/golpes) deste registro não é editável aqui — para corrigir o
                      time, apague o registro e peça pro jogador registrar de novo.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm" onClick={() => salvarEdicao(r.id)} disabled={salvando}>
                        {salvando ? 'Salvando…' : 'Salvar'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelarEdicao}>
                        Cancelar
                      </button>
                    </div>
                    {erroEdicao && <p className="error-text">{erroEdicao}</p>}
                  </div>
                ) : (
                  <>
                    <div className="row-meta" style={{ marginTop: 2 }}>
                      {r.nick_jogador} · {r.torneios?.formato} {r.colocacao ? `· ${r.colocacao}` : ''}
                    </div>

                    {time && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {time.map((p, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <PokemonSprite nome={p.nome} size={28} />
                            <span className="row-name" style={{ fontSize: '0.85rem' }}>
                              {p.nome}
                            </span>
                            {p.item && <span className="row-meta">@ {p.item}</span>}
                            {p.golpes?.map((g, gi) => g && <MoveChip key={`${i}-${gi}`} nome={g} />)}
                          </div>
                        ))}
                      </div>
                    )}

                    {r.mais_vistos?.length > 0 && (
                      <div className="row-meta" style={{ marginTop: 8 }}>
                        Mais visto: {r.mais_vistos.join(', ')}
                      </div>
                    )}

                    {r.observacoes && (
                      <div className="row-meta" style={{ marginTop: 4 }}>
                        "{r.observacoes}"
                      </div>
                    )}

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => iniciarEdicao(r)}>
                          Editar
                        </button>
                        <ConfirmButton onConfirm={() => apagarRegistro(r.id)} confirmLabel="Apagar de vez">
                          Apagar
                        </ConfirmButton>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {!isAdmin && (
        <div className="panel">
          <h2 className="panel-title">Área do admin</h2>
          <p className="panel-hint">Editar ou apagar registros é só pra quem cuida do servidor.</p>
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
