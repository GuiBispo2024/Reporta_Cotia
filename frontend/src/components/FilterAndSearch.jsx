import { useState } from "react";

export default function FilterAndSearch({ onFilter }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [user, setUser] = useState("");
  const [sort, setSort] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onFilter({ titulo, descricao, localizacao, user, sort });
  };

  const limparFiltros = () => {
    setTitulo("");
    setDescricao("");
    setLocalizacao("");
    setUser("");
    setSort("");
    onFilter({});
  };

  return (
    <div className="accordion mb-4" id="filtrosAccordion">
      <div className="accordion-item shadow-sm border-0">
        <h2 className="accordion-header" id="headingFiltros">
          <button
            className="accordion-button collapsed"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapseFiltros"
            aria-expanded="false"
            aria-controls="collapseFiltros"
          >
            🔍 Filtrar Denúncias
          </button>
        </h2>

        <div
          id="collapseFiltros"
          className="accordion-collapse collapse"
          aria-labelledby="headingFiltros"
          data-bs-parent="#filtrosAccordion"
        >
          <div className="accordion-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-2">

                {/* Título */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Título</label>
                  <input
                    type="text"
                    placeholder="Ex: buraco, iluminação"
                    className="form-control form-control-sm"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>

                {/* Descrição */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: perigoso"
                    className="form-control form-control-sm"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>

                {/* Localização */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Localização</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores"
                    className="form-control form-control-sm"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                  />
                </div>

                {/* Usuário */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Usuário</label>
                  <input
                    type="text"
                    placeholder="Ex: Gui Bispo"
                    className="form-control form-control-sm"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                  />
                </div>

                {/* Ordenação */}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Ordenar</label>
                  <select
                    className="form-select form-select-sm"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="">Mais recentes</option>
                    <option value="likes">Mais curtidas</option>
                  </select>
                </div>

                {/* Botões */}
                <div className="col-12 d-flex justify-content-end gap-2 mt-3">
                  <button type="submit" className="btn btn-primary btn-sm px-3">
                    Aplicar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={limparFiltros}
                  >
                    Limpar
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

