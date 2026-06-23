import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { capitalizar } from '../lib/formatacao'
import PokemonSprite from './PokemonSprite'
import ConfirmButton from './ConfirmButton'

const TIERS = ['S', 'A', 'B', 'C', 'D']
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function TierList() {
  const [formato, setFormato] = useState('singles')
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')

  // Temporadas
  const [temporadas, setTemporadas] = useState([])
  const [temporadaSelecionada, setTemporadaSelecionada] = useState(null)
  const [criandoTemporada, setCriandoTemporada] = useState(false)
  const [novaTemporadaNome, setNovaTemporadaNome] = useState('')

  // Form de adicionar/atualizar entrada na tier list
  const [novoPokemon, setNovoPokemon] = useState('')
  const [novoTier, setNovoTier] = useState('A')
  const [salvando, setSalvando] = useState(false)
  const [erroTemporada, setErroTemporada] = useState('')
  const [erroTierForm, setErroTierForm] = useState('')

  const temporadaAtual = temporadas.find((t) => t.id === temporadaSelecionada)
  const ehTemporadaAtualDoServidor = temporadaAtual?.eh_atual === true

  async function carregarTemporadas() {
    const { data, error } = await supabase
      .from('temporadas')
      .select('id, nome, eh_atual, criada_em')
      .order('criada_em', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    setTemporadas(data)
    // seleciona a temporada atual por padrão, se ainda não tiver seleção
    if (!temporadaSelecionada) {
      const atual = data.find((t) => t.eh_atual)
      setTemporadaSelecionada(atual?.id ?? data[0]?.id ?? null)
    }
  }

  async function carregarTierList() {
    if (!temporadaSelecionada) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tier_list')
      .select('id, tier, pokemons(id, nome, tipo_1, tipo_2)')
      .eq('formato', formato)
      .eq('temporada_id', temporadaSelecionada)

    if (error) {
      console.error(error)
    } else {
      const ordem = { S: 0, A: 1, B: 2, C: 3, D: 4 }
      setTiers([...data].sort((a, b) => ordem[a.tier] - ordem[b.tier]))
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarTemporadas()
  }, [])

  useEffect(() => {
    carregarTierList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formato, temporadaSelecionada])

  function handleLogin(e) {
    e.preventDefault()
    if (senhaInput === ADMIN_PASSWORD && ADMIN_PASSWORD) {
      setIsAdmin(true)
      setSenhaErro('')
    } else {
      setSenhaErro('Senha incorreta.')
    }
  }

  async function handleCriarTemporada(e) {
    e.preventDefault()
    if (!novaTemporadaNome.trim()) return
    setSalvando(true)
    setErroTemporada('')
    try {
      const { data, error } = await supabase
        .from('temporadas')
        .insert({ nome: novaTemporadaNome.trim(), eh_atual: true })
        .select('id')
        .single()
      if (error) throw error
      setNovaTemporadaNome('')
      await carregarTemporadas()
      setTemporadaSelecionada(data.id)
      setCriandoTemporada(false)
    } catch (err) {
      console.error(err)
      setErroTemporada('Não consegui criar a temporada. Talvez já exista uma com esse nome.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleAddOrUpdate(e) {
    e.preventDefault()
    if (!novoPokemon.trim() || !temporadaSelecionada) return
    setSalvando(true)
    setErroTierForm('')

    try {
      const { data: existente, error: buscaErro } = await supabase
        .from('pokemons')
        .select('id')
        .ilike('nome', novoPokemon.trim())
        .maybeSingle()
      if (buscaErro) throw buscaErro

      let pokemonId = existente?.id
      if (!pokemonId) {
        const { data: criado, error: criarErro } = await supabase
          .from('pokemons')
          .insert({ nome: capitalizar(novoPokemon.trim()) })
          .select('id')
          .single()
        if (criarErro) throw criarErro
        pokemonId = criado.id
      }

      const { error: upsertErro } = await supabase
        .from('tier_list')
        .upsert(
          { pokemon_id: pokemonId, formato, tier: novoTier, temporada_id: temporadaSelecionada },
          { onConflict: 'pokemon_id,formato,temporada_id' }
        )
      if (upsertErro) throw upsertErro

      setNovoPokemon('')
      carregarTierList()
    } catch (err) {
      console.error(err)
      setErroTierForm('Não consegui salvar essa entrada da tier list.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemove(id) {
    const { error } = await supabase.from('tier_list').delete().eq('id', id)
    if (error) {
      console.error(error)
      return
    }
    carregarTierList()
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

      {!ehTemporadaAtualDoServidor && temporadaAtual && (
        <p className="row-meta" style={{ marginBottom: 12 }}>
          Você está vendo o histórico de "{temporadaAtual.nome}". Essa temporada está congelada.
        </p>
      )}

      <div className="format-toggle">
        <button className={formato === 'singles' ? 'active' : ''} onClick={() => setFormato('singles')}>
          Singles
        </button>
        <button className={formato === 'doubles' ? 'active' : ''} onClick={() => setFormato('doubles')}>
          Doubles
        </button>
      </div>

      <div className="panel">
        <h2 className="panel-title">Tier list — {formato}</h2>
        <p className="panel-hint">{temporadaAtual?.nome ?? 'Carregando temporada…'}</p>

        {loading ? (
          <p className="row-meta">Carregando…</p>
        ) : tiers.length === 0 ? (
          <p className="empty-state">Tier list ainda vazia para {formato} nessa temporada.</p>
        ) : (
          tiers.map((t) => (
            <div className="row" key={t.id} data-tier={t.tier}>
              <span className="tier-badge" data-tier={t.tier}>
                {t.tier}
              </span>
              <PokemonSprite nome={t.pokemons?.nome} size={36} />
              <span className="row-name">{t.pokemons?.nome}</span>
              {isAdmin && ehTemporadaAtualDoServidor && (
                <ConfirmButton onConfirm={() => handleRemove(t.id)} confirmLabel="Remover de vez">
                  Remover
                </ConfirmButton>
              )}
            </div>
          ))
        )}
      </div>

      {!isAdmin ? (
        <div className="panel">
          <h2 className="panel-title">Área do admin</h2>
          <p className="panel-hint">Só quem cuida da tier list precisa entrar aqui.</p>
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
        <>
          <div className="panel">
            <h2 className="panel-title">Temporadas</h2>
            <p className="panel-hint">
              Criar uma nova temporada congela a atual como histórico e abre uma tier list zerada.
            </p>
            {!criandoTemporada ? (
              <button className="btn btn-ghost" onClick={() => setCriandoTemporada(true)}>
                + Nova temporada
              </button>
            ) : (
              <form onSubmit={handleCriarTemporada}>
                <div className="field">
                  <label>Nome da nova temporada</label>
                  <input
                    type="text"
                    value={novaTemporadaNome}
                    onChange={(e) => setNovaTemporadaNome(e.target.value)}
                    placeholder="Ex: temporada-2"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" type="submit" disabled={salvando}>
                    {salvando ? 'Criando…' : 'Criar e ativar'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setCriandoTemporada(false)}
                  >
                    Cancelar
                  </button>
                </div>
                {erroTemporada && <p className="error-text">{erroTemporada}</p>}
              </form>
            )}
          </div>

          {ehTemporadaAtualDoServidor ? (
            <div className="panel">
              <h2 className="panel-title">Adicionar / atualizar tier</h2>
              <form onSubmit={handleAddOrUpdate}>
                <div className="field-row">
                  <div className="field">
                    <label>Pokémon</label>
                    <input
                      type="text"
                      value={novoPokemon}
                      onChange={(e) => setNovoPokemon(e.target.value)}
                      placeholder="Ex: Garchomp"
                    />
                  </div>
                  <div className="field" style={{ maxWidth: 100 }}>
                    <label>Tier</label>
                    <select value={novoTier} onChange={(e) => setNovoTier(e.target.value)}>
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="btn" type="submit" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar na tier list'}
                </button>
                {erroTierForm && <p className="error-text">{erroTierForm}</p>}
              </form>
            </div>
          ) : (
            <p className="panel-hint" style={{ padding: '0 4px' }}>
              Edição desabilitada: essa é uma temporada antiga (histórico congelado).
            </p>
          )}
        </>
      )}
    </div>
  )
}
