import Link from "next/link";

export default function NotFound(){
  return <div className="shell"><div className="auth wide"><div className="card stack"><div><div className="eyebrow">No disponible</div><h1>No encontramos esa pantalla</h1><p className="muted">El recurso puede no existir o no estar disponible para tu cuenta.</p></div><div className="row"><Link className="btn" href="/">Volver al inicio</Link></div></div></div></div>;
}
