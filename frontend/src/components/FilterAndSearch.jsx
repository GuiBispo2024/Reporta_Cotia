import { useId } from 'react';
import { useMemo, useState } from "react";

const EMPTY = { titulo: "", descricao: "", localizacao: "", user: "", sort: "", categoria: "", resolucaoStatus: "" };

export default function FilterAndSearch({ onFilter }) {
  const accessibilityId = useId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const activeCount = useMemo(() => Object.values(applied).filter(Boolean).length, [applied]);
  const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }));

  const submit = e => {
    e.preventDefault();
    const normalized = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
    );
    setForm(normalized);
    setApplied(normalized);
    onFilter(normalized);
    setOpen(false);
  };

  const clear = () => {
    setForm(EMPTY);
    setApplied(EMPTY);
    onFilter(EMPTY);
    setOpen(false);
  };

  return <section className="rc-search-section mb-4">
    <button aria-expanded={open} aria-controls={`${accessibilityId}-filters`} className="rc-filter-mobile" onClick={() => setOpen(value => !value)}>
      <span><i aria-hidden="true" className="bi bi-sliders me-2" />Busca e filtros</span>
      {activeCount > 0 && <span className="rc-filter-badge">{activeCount}</span>}
      <i className={`bi bi-chevron-${open ? "up" : "down"}`} />
    </button>

    <div id={`${accessibilityId}-filters`} className={`rc-filter-modern ${open ? "is-open" : ""}`}>
      <header className="rc-filter-header">
        <div className="rc-filter-heading"><span className="rc-filter-icon"><i aria-hidden="true" className="bi bi-sliders" /></span><div><h2>Encontre uma denúncia</h2><p>Use um ou mais campos para refinar os resultados.</p></div></div>
        {activeCount > 0 && <span className="rc-active-filters"><i aria-hidden="true" className="bi bi-check-circle" /> {activeCount} {activeCount === 1 ? "filtro ativo" : "filtros ativos"}</span>}
      </header>

      <form onSubmit={submit}>
        <div className="rc-filter-search-row">
          <div className="rc-filter-field rc-filter-field-wide"><label htmlFor={`${accessibilityId}-field-1`}>Título ou assunto</label><div className="rc-field-control"><i aria-hidden="true" className="bi bi-search" /><input id={`${accessibilityId}-field-1`} name="titulo" placeholder="Ex.: buraco na avenida" value={form.titulo} onChange={change} /></div></div>
          <div className="rc-filter-field"><label htmlFor={`${accessibilityId}-field-2`}>Localização</label><div className="rc-field-control"><i aria-hidden="true" className="bi bi-geo-alt" /><input id={`${accessibilityId}-field-2`} name="localizacao" placeholder="Rua ou bairro" value={form.localizacao} onChange={change} /></div></div>
          <div className="rc-filter-field"><label htmlFor={`${accessibilityId}-field-3`}>Publicado por</label><div className="rc-field-control"><i aria-hidden="true" className="bi bi-person" /><input id={`${accessibilityId}-field-3`} name="user" placeholder="Nome do usuário" value={form.user} onChange={change} /></div></div>
        </div>

        <div className="rc-filter-options-row">
          <div className="rc-filter-field"><label htmlFor={`${accessibilityId}-field-4`}>Categoria</label><select id={`${accessibilityId}-field-4`} name="categoria" value={form.categoria} onChange={change}><option value="">Todas as categorias</option><option>Buraco e pavimentação</option><option>Iluminação pública</option><option>Limpeza urbana</option><option>Saneamento</option><option>Água e esgoto</option><option>Trânsito e sinalização</option><option>Árvore e área verde</option><option>Outros</option></select></div>
          <div className="rc-filter-field"><label htmlFor={`${accessibilityId}-field-5`}>Status</label><select id={`${accessibilityId}-field-5`} name="resolucaoStatus" value={form.resolucaoStatus} onChange={change}><option value="">Todos os status</option><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="resolvida">Resolvida</option></select></div>
          <div className="rc-filter-field"><label htmlFor={`${accessibilityId}-field-6`}>Ordenação</label><select id={`${accessibilityId}-field-6`} name="sort" value={form.sort} onChange={change}><option value="">Mais recentes</option><option value="oldest">Mais antigas</option><option value="likes">Mais curtidas</option><option value="shares">Mais compartilhadas</option></select></div>
          <div className="rc-filter-field rc-filter-description"><label htmlFor={`${accessibilityId}-field-7`}>Palavra na descrição</label><input id={`${accessibilityId}-field-7`} name="descricao" placeholder="Ex.: perigoso" value={form.descricao} onChange={change} /></div>
        </div>

        <footer className="rc-filter-actions"><button type="button" className="btn btn-link text-secondary" disabled={!activeCount && !Object.values(form).some(Boolean)} onClick={clear}><i aria-hidden="true" className="bi bi-x-circle me-1" />Limpar filtros</button><button className="btn btn-primary px-4"><i aria-hidden="true" className="bi bi-search me-2" />Buscar denúncias</button></footer>
      </form>
    </div>
  </section>;
}
