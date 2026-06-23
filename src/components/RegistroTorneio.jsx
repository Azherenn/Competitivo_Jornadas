import { useState } from 'react'
import { supabase } from '../lib/supabase'
import TagInput from './TagInput'

const COLOCACOES = ['Campeão', 'Vice', 'Top 4', 'Top 8', 'Fase de grupos', 'Outro']

export default function RegistroTorneio({ onSaved }) {
  const [nomeTorneio, setNomeTorneio] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [formato, setFormato] = useState('singles')
  const [nick, setNick] = useState('')
  const [colocacao, setColocacao] = useState('')
  const [timeUsado, setTimeUsado] = useState([])
  const [maisVistos, setMaisVistos] = useState([])
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setNomeTorneio('')
    setColocacao('')
    setTimeUsado([])
    setMaisVistos([])
    setObservacoes('')
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

      // 2. Insere o registro do jogador
      const { error: registroErro } = await supabase.from('registros').insert({
        torneio_id: torneioId,
        nick_jogador: nick.trim(),
        time_usado: timeUsado,
        mais_vistos: maisVistos,
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

      <TagInput
        label="Seu time"
        values={timeUsado}
        onChange={setTimeUsado}
        placeholder="Digite um pokémon e Enter"
      />

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
