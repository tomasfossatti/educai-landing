"use client";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="shell"><div className="card"><h2>No pudimos completar esta acción</h2><p className="muted">{error.message || "Ocurrió un error inesperado."}</p><button className="btn" onClick={reset}>Intentar de nuevo</button></div></div>}
