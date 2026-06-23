import { useState } from 'react'
import { capitalizar } from '../lib/formatacao'
import PokemonSprite from './PokemonSprite'

// Edita o time como uma lista de até 6 "slots", cada um com
// nome + item + até 4 golpes. Usado tanto quando o time vem de um
// PokePaste (já preenchido) quanto quando o jogador monta manualmente.
export default function TeamBuilder({ time, onChange }) {
  const [expandido, setExpandido] = useState(null)

  function atualizarSlot(index, campo, valor) {
    const novoTime = time.map((slot, i) => (i === index ? { ...slot, [campo]: valor } : slot))
    onChange(novoTime)
  }

  function atualizarGolpe(index, golpeIndex, valor) {
    const novoTime = time.map((slot, i) => {
      if (i !== index) return slot
      const golpes = [...slot.golpes]
      golpes[golpeIndex] = valor
      return { ...slot, golpes }
    })
    onChange(novoTime)
  }

  function adicionarSlot() {
    if (time.length >= 6) return
    onChange([...time, { nome: '', item: '', golpes: ['', '', '', ''] }])
    setExpandido(time.length)
  }

  function removerSlot(index) {
    onChange(time.filter((_, i) => i !== index))
    setExpandido(null)
  }

  function finalizarNome(index, valor) {
    atualizarSlot(index, 'nome', capitalizar(valor))
  }

  return (
    <div className="field">
      <label>Seu time ({time.length}/6)</label>

      {time.map((slot, index) => (
        <div key={index} className="team-slot">
          <div className="team-slot-header">
            <PokemonSprite nome={slot.nome} size={32} />
            <input
              type="text"
              value={slot.nome}
              placeholder={`Pokémon ${index + 1}`}
              onChange={(e) => atualizarSlot(index, 'nome', e.target.value)}
              onBlur={(e) => finalizarNome(index, e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setExpandido(expandido === index ? null : index)}
            >
              {expandido === index ? 'Fechar' : 'Item/Golpes'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => removerSlot(index)}
              aria-label={`Remover ${slot.nome || `pokémon ${index + 1}`}`}
            >
              ×
            </button>
          </div>

          {expandido === index && (
            <div className="team-slot-details">
              <div className="field">
                <label>Item</label>
                <input
                  type="text"
                  value={slot.item ?? ''}
                  placeholder="Ex: Choice Scarf"
                  onChange={(e) => atualizarSlot(index, 'item', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Golpes</label>
                <div className="team-slot-moves">
                  {[0, 1, 2, 3].map((golpeIndex) => (
                    <input
                      key={golpeIndex}
                      type="text"
                      value={slot.golpes?.[golpeIndex] ?? ''}
                      placeholder={`Golpe ${golpeIndex + 1}`}
                      onChange={(e) => atualizarGolpe(index, golpeIndex, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {time.length < 6 && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={adicionarSlot}>
          + Adicionar pokémon
        </button>
      )}
    </div>
  )
}
