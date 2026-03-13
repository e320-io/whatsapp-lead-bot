export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🤖 WhatsApp Lead Bot</h1>
      <p style={{ color: '#666', fontSize: '18px' }}>
        Bot de captura y conversión de leads por WhatsApp.
      </p>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f0f9f0', borderRadius: '8px', border: '1px solid #c6e6c6' }}>
        <p style={{ margin: 0, color: '#2d6a2d' }}>✅ Sistema activo</p>
      </div>
      <div style={{ marginTop: '20px' }}>
        <p><strong>Endpoints:</strong></p>
        <ul>
          <li><code>POST /api/webhook/whatsapp</code> — Recibe mensajes</li>
          <li><code>GET /api/dashboard/stats</code> — Métricas</li>
        </ul>
      </div>
      <div style={{ marginTop: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>
          Cliente: CIRE Depilación Láser — Piloto Sucursal Polanco
        </p>
      </div>
    </div>
  )
}
