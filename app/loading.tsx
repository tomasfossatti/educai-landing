import { JellyLoader } from "./components/obsidian/jelly-loader";

export default function Loading(){
  return <div className="shell"><div className="auth"><div className="card stack auth-card obsidian-loading" aria-live="polite" aria-busy="true">
    <JellyLoader/>
    <div className="eyebrow">Educai</div>
    <h2>Cargando tu espacio…</h2>
    <p className="muted">Estamos preparando la información de esta pantalla.</p>
  </div></div></div>;
}
