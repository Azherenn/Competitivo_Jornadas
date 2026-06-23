import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { capitalizar } from '../lib/formatacao'
import TagInput from './TagInput'
import TeamBuilder from './TeamBuilder'

const COLOCACOES = ['Campeão', 'Vice', 'Top 4', 'Top 8', 'Fase de grupos', 'Outro']

function timeVazio() {
  return []
}

// Extrai nome + item + golpes de um texto no formato de export do
// Pokémon Showdown / PokePaste. Cada pokémon é um bloco separado por
// linha(s) vazia(s):
//
//   Talonflame @ Flyinium Z
//   Ability: Gale Wings
//   EVs: 252 Atk / 4 Def / 252 Spe
//   Jolly Nature
//   - Brave Bird
//   - Flare Blitz
//   - Swords Dance
//   - Roost
//
// Nicknames aparecem como "Nickname (NomeReal) @ Item" — nesse caso
// usamos o nome real entre parênteses, não o nickname.
function extrairTimeDoPaste(texto) {
  const blocos = texto
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)

  return blocos.map((bloco) => {
    const linhas = bloco.split(/\r?\n/).map((l) => l.trim())
    const primeiraLinha = linhas[0]

    const [parteNome, parteItem] = primeiraLinha.split(' @ ')

    let nomeBruto = parteNome.replace(/\s*\((M|F)\)\s*$/, '').trim()
    const matchNickname = nomeBruto.match(/\(([^)]+)\)\s*$/)
    const nome = capitalizar(matchNickname ? matchNickname[1] : nomeBruto)

    const item = parteItem ? capitalizar(parteItem.trim()) : ''

    const golpes = linhas
      .filter((l) => l.startsWith('- '))
      .map((l) => capitalizar(l.slice(2).trim()))
      .slice(0, 4)
    while (golpes.length < 4) golpes.push('')

    return { nome, item, golpes }
  })
}

export default function RegistroTorneio({ onSaved }) {
  const [nomeTorneio, setNomeTorneio] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [formato, setFormato] = useState('singles')
  const [nick, setNick] = useState('')
  const [colocacao, setColocacao] = useState('')
  const [time, setTime] = useState(timeVazio)
  const [maisVistos, setMaisVistos] = useState([])
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [linkPokePaste, setLinkPokePaste] = useState('')
  const [buscandoPaste, setBuscandoPaste] = useState(false)
  const [pasteErro, setPasteErro] = useState('')
  const [pasteSucesso, setPasteSucesso] = useState(false)

  async function handleBuscarPokePaste() {
    setPasteErro('')
    setPasteSucesso(false)

    if (!linkPokePaste.trim() || !linkPokePaste.includes('pokepast.es')) {
      setPasteErro('Cole um link válido do pokepast.es antes de buscar.')
      return
    }

    setBuscandoPaste(true)
    try {
      const pasteId = linkPokePaste.trim().split('/').filter(Boolean).pop()
      const rawUrl = `https://pokepast.es/${pasteId}/raw`

      const resp = await fetch(rawUrl)
      if (resp.status === 404) {
        throw new Error('Não encontrei esse paste. Verifique se o link está certo.')
      }
      if (!resp.ok) {
        throw new Error('Não consegui acessar o PokePaste agora. Tente de novo em um instante.')
      }

      const texto = await resp.text()
      const novoTime = extrairTimeDoPaste(texto)

      if (novoTime.length === 0) {
        throw new Error('Não consegui identificar pokémons nesse paste.')
      }

      setTime(novoTime.slice(0, 6))
      setLinkPokePaste('')
      setPasteSucesso(true)
    } catch (err) {
      setPasteErro(err.message || 'Erro ao buscar o time. Tente de novo.')
    } finally {
      setBuscandoPaste(false)
    }
  }

  function resetForm() {
    setNomeTorneio('')
    setColocacao('')
    setTime(timeVazio())
    setMaisVistos([])
    setObservacoes('')
    setPasteSucesso(false)
    // mantém nick, data e formato pra facilitar registrar vários jogos seguidos
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!nomeTorneio.trim() || !nick.trim()) {
      setError('Preencha pelo menos o nome do torneio e o seu nick.')
      return
    }

    setSaving(true)
    try {
      // 1. Garante que o torneio existe (ou cria um novo com esse nome+data+formato)
      const { data: torneioExistente, error: buscaErro } = await supabase
        .from('torneios')
        .select('id')
        .eq('nome', nomeTorneio.trim())
        .eq('data', data)
        .eq('formato', formato)
        .maybeSingle()

      if (buscaErro) throw buscaErro

      let torneioId = torneioExistente?.id

      if (!torneioId) {
        // novo torneio entra sempre na temporada marcada como "atual"
        const { data: temporadaAtual, error: temporadaErro } = await supabase
          .from('temporadas')
          .select('id')
          .eq('eh_atual', true)
          .maybeSingle()
        if (temporadaErro) throw temporadaErro

        const { data: novoTorneio, error: criarErro } = await supabase
          .from('torneios')
          .insert({ nome: nomeTorneio.trim(), data, formato, temporada_id: temporadaAtual?.id ?? null })
          .select('id')
          .single()
        if (criarErro) throw criarErro
        torneioId = novoTorneio.id
      }

      // 2. Monta o time estruturado (limpa slots sem nome, e golpes vazios)
      const timeLimpo = time
        .filter((slot) => slot.nome?.trim())
        .map((slot) => ({
          nome: capitalizar(slot.nome),
          item: slot.item?.trim() ? capitalizar(slot.item.trim()) : null,
          golpes: (slot.golpes ?? []).map((g) => capitalizar(g.trim())).filter(Boolean),
        }))

      // mantém a coluna antiga (time_usado) preenchida só com os nomes,
      // pra qualquer leitura legada que ainda dependa dela.
      const nomesTime = timeLimpo.map((p) => p.nome)

      // 3. Insere o registro do jogador
      const { error: registroErro } = await supabase.from('registros').insert({
        torneio_id: torneioId,
        nick_jogador: nick.trim(),
        time_usado: nomesTime,
        time_estruturado: timeLimpo,
        mais_vistos: maisVistos.map(capitalizar),
        colocacao: colocacao || null,
        observacoes: observacoes.trim() || null,
      })
      if (registroErro) throw registroErro

      resetForm()
      onSaved?.()
    } catch (err) {
      console.error(err)
      setError('Não consegui salvar. Verifique a conexão com o Supabase e tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2 className="panel-title">Registrar torneio</h2>
      <p className="panel-hint">Conta como foi sua participação — leva menos de um minuto.</p>

      <div className="field-row">
        <div className="field">
          <label>Torneio</label>
          <input
            type="text"
            value={nomeTorneio}
            onChange={(e) => setNomeTorneio(e.target.value)}
            placeholder="Ex: Copa Méier #3"
          />
        </div>
        <div className="field">
          <label>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Formato</label>
          <select value={formato} onChange={(e) => setFormato(e.target.value)}>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
        </div>
        <div className="field">
          <label>Seu nick</label>
          <input
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="Como te chamam no servidor"
          />
        </div>
      </div>

      <div className="field">
        <label>Colocação</label>
        <select value={colocacao} onChange={(e) => setColocacao(e.target.value)}>
          <option value="">Não informar</option>
          {COLOCACOES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Importar do PokePaste (opcional)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            placeholder="https://pokepast.es/..."
            value={linkPokePaste}
            onChange={(e) => setLinkPokePaste(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={handleBuscarPokePaste}
            className="btn"
            disabled={buscandoPaste}
            style={{ whiteSpace: 'nowrap' }}
          >
            {buscandoPaste ? 'Buscando…' : 'Buscar time'}
          </button>
        </div>
        {pasteErro && <p className="error-text">{pasteErro}</p>}
        {pasteSucesso && (
          <p className="row-meta" style={{ color: 'var(--moss)', marginTop: 6 }}>
            Time importado! Confira abaixo e ajuste se precisar.
          </p>
        )}
      </div>

      <TeamBuilder time={time} onChange={setTime} />

      <TagInput
        label="Pokémons que você mais viu no torneio"
        values={maisVistos}
        onChange={setMaisVistos}
        placeholder="Digite um pokémon e Enter"
      />

      <div className="field">
        <label>Observações (opcional)</label>
        <textarea
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Alguma coisa que valha registrar sobre essa partida ou torneio"
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn" type="submit" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar registro'}
      </button>
    </form>
  )
}
