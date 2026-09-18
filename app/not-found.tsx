import Link from "next/link";
export default function NotFound(){return <div className="shell"><div className="card"><h2>No encontramos esa pantalla</h2><p className="muted">El recurso puede no existir o no estar disponible para tu cuenta.</p><Link className="btn" href="/">Volver</Link></div></div>}
