"use client";

export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <div className="shell"><div className="auth wide"><div className="card stack"><div><div className="eyebrow">Algo no salió bien</div><h1>No pudimos completar esta acción</h1><p className="muted">No mostramos detalles técnicos para proteger la información del sistema. Intentá nuevamente; si el problema continúa, volvé a la pantalla anterior y repetí la acción.</p></div><div className="row"><button className="btn" onClick={reset}>Intentar de nuevo</button></div></div></div></div>;
}
