import { useState } from 'react'

// Botão que pede confirmação antes de executar uma ação destrutiva
// (apagar, reverter, etc). No primeiro clique mostra "Confirmar?" /
// "Cancelar"; só executa a ação de fato no segundo clique.
// Evita modais — fica tudo inline, sem quebrar o fluxo da página.
export default function ConfirmButton({ onConfirm, children, confirmLabel = 'Confirmar', className = 'btn btn-ghost btn-sm' }) {
  const [confirmando, setConfirmando] = useState(false)

  if (confirmando) {
    return (
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button
          type="button"
          className="btn btn-sm"
          style={{ background: 'var(--danger)' }}
          onClick={() => {
            setConfirmando(false)
            onConfirm()
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <button type="button" className={className} onClick={() => setConfirmando(true)}>
      {children}
    </button>
  )
}
