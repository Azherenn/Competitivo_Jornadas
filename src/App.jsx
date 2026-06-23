import { useEffect, useState } from 'react'
import RegistroTorneio from './components/RegistroTorneio'
import Historico from './components/Historico'
import TierList from './components/TierList'
import MetaReport from './components/MetaReport'
import Ranking from './components/Ranking'
import ThemeSwitch from './components/ThemeSwitch'

const TABS = [
  { id: 'registrar', label: 'Registrar' },
  { id: 'historico', label: 'Histórico' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'tierlist', label: 'Tier list' },
  { id: 'meta', label: 'Meta report' },
]

function temaInicial() {
  try {
    return localStorage.getItem('dex-tema') || 'pastel'
  } catch {
    return 'pastel'
  }
}

export default function App() {
  const [tab, setTab] = useState('registrar')
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState('')
  const [tema, setTema] = useState(temaInicial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    try {
      localStorage.setItem('dex-tema', tema)
    } catch {
      // ambiente sem localStorage disponível — só ignora
    }
  }, [tema])

  function handleSaved() {
    setRefreshKey((k) => k + 1)
    setToast('Registro salvo!')
    setTimeout(() => setToast(''), 2500)
    setTab('historico')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Dex Competitiva</h1>
          <p className="app-subtitle">Torneios, times e o estado do meta — tudo num lugar só.</p>
        </div>
        <ThemeSwitch tema={tema} onChange={setTema} />
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'registrar' && <RegistroTorneio onSaved={handleSaved} />}
        {tab === 'historico' && <Historico refreshKey={refreshKey} />}
        {tab === 'ranking' && <Ranking />}
        {tab === 'tierlist' && <TierList />}
        {tab === 'meta' && <MetaReport />}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
