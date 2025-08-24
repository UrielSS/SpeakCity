function Dashboard({ numCarros, callesAbiertas, callesCerradas }) {
  return (
    <section className="dashboard-wrapper">
        <h2 className="dashboard-title">Dashboard</h2>

        <div className="dashboard">
            <div className="dashboard-card car">
                <div className="icon">🚗</div>
                <div>
                    <h3>Numero de Carros</h3>
                    <p>{numCarros}</p>
                </div>
            </div>

            <div className="dashboard-card open">
                <div className="icon">🛣️</div>
                <div>
                    <h3>Calles Abiertas</h3>
                    <p>{callesAbiertas}</p>
                </div>
            </div>

            <div className="dashboard-card closed">
                <div className="icon">🚧</div>
                <div>
                    <h3>Calles Cerradas</h3>
                    <p>{callesCerradas}</p>
                </div>
            </div>

            <div className="dashboard-card green-light">
                <div className="icon">🚦✅</div>
                <div>
                    <h3>Semáforos Habilitados</h3>
                    <p>-</p>
                </div>
            </div>

            <div className="dashboard-card red-light">
                <div className="icon">🚦❌</div>
                <div>
                    <h3>Semáforos Deshabilitados</h3>
                    <p>-</p>
                </div>
            </div>

        </div>
    </section>
  )
}

export default Dashboard
