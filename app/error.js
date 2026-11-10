"use client";

export default function GlobalError({reset}){return <div className="container narrow"><section className="card empty" role="alert"><h2 className="section-title">This page could not be loaded</h2><p className="section-sub">Your data has not been changed. Please retry; if the problem continues, return to the platform overview.</p><div className="row-actions"><button className="btn" onClick={()=>reset()}>Try again</button><a className="btn secondary" href="/workspace">Go to overview</a></div></section></div>}
