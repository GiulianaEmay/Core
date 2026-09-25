import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <section className="brand">
        <div>
          <div className="logo" style={{ fontSize: 26 }}>CORE</div>
          <div className="tag">Creación de Valor para Empresas</div>
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--disp)", fontSize: 48, lineHeight: 1.05, fontWeight: 700 }}>
            Su empresa, <span style={{ color: "var(--cyan)" }}>en un solo tablero</span>
          </h1>
          <p className="lead" style={{ marginTop: 18 }}>
            Indicadores, fugas de valor, la ruta de su plan, aprobaciones y documentos: todo lo que su equipo CORE
            gestiona con usted, en un solo lugar.
          </p>
        </div>
        <div className="tag">Finanzas · Operaciones · Legal</div>
      </section>
      <section className="formside">
        <div className="lform">
          <h2>Portal del cliente</h2>
          <p className="muted">Ingrese con su correo o con su cuenta de Google.</p>
          <Link className="btn" href="/sign-in">Iniciar sesión</Link>
          <Link className="btn line" href="/sign-up">Crear cuenta</Link>
          <p className="hint">
            Si es la primera vez que ingresa, su líder de cuenta CORE vinculará su usuario a su empresa para que
            pueda ver su información.
          </p>
        </div>
      </section>
    </main>
  );
}
