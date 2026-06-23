import { useState } from 'react'

// Campo onde o jogador digita nomes de pokémon e aperta Enter pra
// adicionar um "chip". Usado para "time usado" e "mais vistos".
export default function TagInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('')

  function addTag() {
    const cleaned = draft.trim()
    if (!cleaned) return
    if (values.includes(cleaned)) {
      setDraft('')
      return
    }
    onChange([...values, cleaned])
    setDraft('')
  }

  function removeTag(tag) {
    onChange(values.filter((v) => v !== tag))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
      />
      {values.length > 0 && (
        <div className="chip-input-tags">
          {values.map((tag) => (
            <span className="chip" key={tag}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remover ${tag}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
