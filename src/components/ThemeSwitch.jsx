const TEMAS = [
  { id: 'pastel', label: 'Pastel' },
  { id: 'escuro', label: 'Escuro' },
  { id: 'claro', label: 'Claro' },
]

export default function ThemeSwitch({ tema, onChange }) {
  return (
    <div className="theme-switch" role="group" aria-label="Escolher tema visual">
      {TEMAS.map((t) => (
        <button
          key={t.id}
          className={`theme-dot ${tema === t.id ? 'active' : ''}`}
          data-for={t.id}
          title={t.label}
          aria-label={`Tema ${t.label}`}
          aria-pressed={tema === t.id}
          onClick={() => onChange(t.id)}
        />
      ))}
    </div>
  )
}
