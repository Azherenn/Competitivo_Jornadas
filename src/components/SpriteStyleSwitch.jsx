import { useEstiloSprite } from '../lib/EstiloSpriteContext'

export default function SpriteStyleSwitch() {
  const { estilo, setEstilo } = useEstiloSprite()

  return (
    <div className="format-toggle" style={{ margin: 0 }} role="group" aria-label="Estilo de sprite">
      <button
        className={estilo === '3d' ? 'active' : ''}
        onClick={() => setEstilo('3d')}
        title="Sprite 3D (artwork oficial)"
      >
        3D
      </button>
      <button
        className={estilo === 'pixel' ? 'active' : ''}
        onClick={() => setEstilo('pixel')}
        title="Sprite pixel art"
      >
        Pixel
      </button>
    </div>
  )
}
