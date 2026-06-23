import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { capitalizar } from '../lib/formatacao'
import PokemonSprite from './PokemonSprite'
import ConfirmButton from './ConfirmButton'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function MetaReport() {
  const [formato, setFormato] = useState('singles')
  const [itens, setItens] = useState([])
  const [usoCalculado, setUsoCalculado] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  // form
  const [pokemonNome, setPokemonNome] = useState('')
  const [setComum, setSetComum] = useState('')
  const [comoEnfrentar, setComoEnfrentar] = useState('')
  const [popularidade, setPopularidade] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  async function carregar() {
    setLoading(true)

    const [{ data: curadoria, error: erroCuradoria }, { data: uso, error: erroUso }] =
      await Promise.all([
        supabase
          .from('meta_report')
          .select('id, set_comum, como_enfrentar, popularidade, pokemons(id, nome)')
          .eq('formato', formato)
          .order('popularidade', { ascending: false }),
        supabase
          .from('meta_uso_calculado')
          .select('pokemon_nome, vezes_usado, percentual_uso')
          .eq('formato', formato)
          .order('vezes_usado', { ascending: false })
          .limit(10),
      ])

    if (erroCuradoria) console.error(erroCuradoria)
    else setItens(curadoria)

    if (erroUso) console.error(erroUso)
    else setUsoCalculado(uso)

    setLoading(false)
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formato])

  function handleLogin(e) {
    e.preventDefault()
    if (senhaInput === ADMIN_PASSWORD && ADMIN_PASSWORD) {
      setIsAdmin(true)
      setSenhaErro('')
    } else {
      setSenhaErro('Senha incorreta.')
    }
  }

  function resetForm() {
    setPokemonNome('')
    setSetComum('')
    setComoEnfrentar('')
    setPopularidade(0)
    setEditandoId(null)
  }

  function handleEdit(item) {
    setEditandoId(item.id)
    setPokemonNome(item.pokemons?.nome ?? '')
    setSetComum(item.set_comum ?? '')
    setComoEnfrentar(item.como_enfrentar ?? '')
    setPopularidade(item.popularidade ?? 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pokemonNome.trim()) return
    setSalvando(true)
    setErroForm('')

    try {
      const { data: existente, error: buscaErro } = await supabase
        .from('pokemons')
        .select('id')
        .ilike('nome', pokemonNome.trim())
        .maybeSingle()
      if (buscaErro) throw buscaErro

      let pokemonId = existente?.id
      if (!pokemonId) {
        const { data: criado, error: criarErro } = await supabase
          .from('pokemons')
          .insert({ nome: capitalizar(pokemonNome.trim()) })
          .select('id')
          .single()
        if (criarErro) throw criarErro
        pokemonId = criado.id
      }

      const { error: upsertErro } = await supabase.from('meta_report').upsert(
        {
          pokemon_id: pokemonId,
          formato,
          set_comum: setComum.trim() || null,
          como_enfrentar: comoEnfrentar.trim() || null,
          popularidade: Number(popularidade) || 0,
        },
        { onConflict: 'pokemon_id,formato' }
      )
      if (upsertErro) throw upsertErro

      resetForm()
      carregar()
    } catch (err) {
      console.error(err)
      setErroForm('Não consegui salvar essa entrada do meta report.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemove(id) {
    const { error } = await supabase.from('meta_report').delete().eq('id', id)
    if (error) {
      console.error(error)
      return
    }
    carregar()
  }

  function usarSugestao(nome, percentual) {
    setEditandoId(null)
    setPokemonNome(nome)
    setPopularidade(Math.round(percentual))
    setSetComum('')
    setComoEnfrentar('')
  }

  return (
    <div>
      <div className="format-toggle">
        <button className={formato === 'singles' ? 'active' : ''} onClick={() => setFormato('singles')}>
          Singles
        </button>
        <button className={formato === 'doubles' ? 'active' : ''} onClick={() => setFormato('doubles')}>
          Doubles
        </button>
      </div>

      <div className="panel">
        <p className="section-label">Calculado a partir dos registros</p>
        <h2 className="panel-title">Mais usados de verdade — {formato}</h2>
        <p className="panel-hint">
          Baseado nos times que os jogadores registraram na aba "Registrar". Atualiza sozinho conforme
          mais gente submete.
        </p>

        {loading ? (
          <p className="row-meta">Carregando…</p>
        ) : usoCalculado.length === 0 ? (
          <p className="empty-state">
            Ainda não tem registros suficientes de {formato} pra calcular isso. Assim que jogadores
            começarem a registrar times, esse ranking aparece aqui.
          </p>
        ) : (
          usoCalculado.map((u, i) => (
            <div className="row" key={u.pokemon_nome}>
              <span className="row-meta" style={{ width: 20 }}>
                {i + 1}.
              </span>
              <PokemonSprite nome={u.pokemon_nome} size={32} />
              <span className="row-name">{u.pokemon_nome}</span>
              <span className="row-meta">{u.percentual_uso}%</span>
              {isAdmin && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => usarSugestao(u.pokemon_nome, u.percentual_uso)}
                  title="Usar esse número como ponto de partida na curadoria abaixo"
                >
                  Usar
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="panel">
        <p className="section-label">Curadoria do admin</p>
        <h2 className="panel-title">Como enfrentar — {formato}</h2>
        <p className="panel-hint">Sets comuns e dicas de matchup, mantidos manualmente.</p>

        {loading ? (
          <p className="row-meta">Carregando…</p>
        ) : itens.length === 0 ? (
          <p className="empty-state">Nenhuma entrada cadastrada para {formato} ainda.</p>
        ) : (
          itens.map((item) => (
            <div className="row" key={item.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PokemonSprite nome={item.pokemons?.nome} size={32} />
                <span className="row-name" style={{ flex: 1 }}>
                  {item.pokemons?.nome}
                </span>
                <span className="row-meta">{item.popularidade}% de uso</span>
              </div>
              {item.set_comum && (
                <p className="row-meta" style={{ marginTop: 6 }}>
                  <strong style={{ color: 'var(--ink)' }}>Set comum:</strong> {item.set_comum}
                </p>
              )}
              {item.como_enfrentar && (
                <p className="row-meta" style={{ marginTop: 2 }}>
                  <strong style={{ color: 'var(--ink)' }}>Como enfrentar:</strong> {item.como_enfrentar}
                </p>
              )}
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(item)}>
                    Editar
                  </button>
                  <ConfirmButton onConfirm={() => handleRemove(item.id)} confirmLabel="Remover de vez">
                    Remover
                  </ConfirmButton>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!isAdmin ? (
        <div className="panel">
          <h2 className="panel-title">Área do admin</h2>
          <p className="panel-hint">Curadoria do meta report é só pra quem cuida disso.</p>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Senha de admin</label>
              <input
                type="password"
                value={senhaInput}
                onChange={(e) => setSenhaInput(e.target.value)}
              />
            </div>
            {senhaErro && <p className="error-text">{senhaErro}</p>}
            <button className="btn btn-ghost" type="submit">
              Entrar
            </button>
          </form>
        </div>
      ) : (
        <div className="panel">
          <h2 className="panel-title">{editandoId ? 'Editar entrada' : 'Nova entrada no meta report'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Pokémon</label>
                <input
                  type="text"
                  value={pokemonNome}
                  onChange={(e) => setPokemonNome(e.target.value)}
                  placeholder="Ex: Dragapult"
                />
              </div>
              <div className="field" style={{ maxWidth: 120 }}>
                <label>% de uso</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={popularidade}
                  onChange={(e) => setPopularidade(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Set comum (itens, moves, EVs observados)</label>
              <textarea
                rows={2}
                value={setComum}
                onChange={(e) => setSetComum(e.target.value)}
                placeholder="Ex: Choice Scarf, Draco Meteor / U-turn / Shadow Ball / Flamethrower"
              />
            </div>
            <div className="field">
              <label>Como enfrentar</label>
              <textarea
                rows={3}
                value={comoEnfrentar}
                onChange={(e) => setComoEnfrentar(e.target.value)}
                placeholder="Dica prática de matchup ou counter"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="submit" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
              {editandoId && (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  Cancelar edição
                </button>
              )}
            </div>
            {erroForm && <p className="error-text">{erroForm}</p>}
          </form>
        </div>
      )}
    </div>
  )
}
