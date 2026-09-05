import { useState } from "react";
import { useNavigate } from "react-router-dom";
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { friendlyError } from '../utils/errorMessage';
import { formatAddress } from '../utils/formatAddress';

const CATEGORIAS = [
  "Buraco e pavimentação", "Iluminação pública", "Limpeza urbana",
  "Saneamento", "Água e esgoto", "Trânsito e sinalização",
  "Árvore e área verde", "Outros"
];

export default function NovaDenuncia() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ titulo: "", descricao: "", localizacao: "", categoria: "Outros", latitude: "", longitude: "" });
  const [imagens, setImagens] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const usarLocalizacao = () => {
    if (!navigator.geolocation) return setMensagem("Seu navegador não oferece geolocalização.");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latitude = coords.latitude.toFixed(7);
        const longitude = coords.longitude.toFixed(7);
        setMensagem("📍 Localização encontrada. Buscando o endereço...");
        let endereco = `Latitude ${latitude}, Longitude ${longitude}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          if (response.ok) {
            const data = await response.json();
            endereco = formatAddress(data, endereco);
          }
        } catch {
          // Mantém as coordenadas como endereço legível quando a geocodificação falhar.
        }

        setForm(prev => ({ ...prev, latitude, longitude, localizacao: endereco }));
        setMensagem("📍 Endereço e coordenadas preenchidos. Confira antes de enviar.");
      },
      () => setMensagem("Não conseguimos acessar sua localização. Autorize o acesso nas configurações do navegador ou preencha o endereço manualmente.")
    );
  };

  const escolherImagem = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    if (!files.length) return;
    if (files.some(file => !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) {
      setMensagem("Cada arquivo deve ser uma imagem de no máximo 5 MB.");
      return;
    }
    previews.forEach(URL.revokeObjectURL);
    setImagens(files);
    setPreviews(files.map(URL.createObjectURL));
  };

  const removerImagem = index => {
    URL.revokeObjectURL(previews[index]);
    setImagens(current => current.filter((_, itemIndex) => itemIndex !== index));
    setPreviews(current => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem("");
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      imagens.forEach(imagem => data.append("imagens", imagem));

      await denunciaService.create(data);
      setMensagem("✅ Denúncia enviada! Ela passará pela moderação antes de aparecer publicamente.");
      setTimeout(() => navigate("/minhas-denuncias"), 1000);
    } catch (error) {
      setMensagem(friendlyError(error, "Não foi possível enviar a denúncia. Seus dados continuam no formulário; confira as informações e tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <div className="rc-form-card mx-auto">
          <span className="rc-eyebrow">NOVO REGISTRO</span>
          <h2 className="fw-bold mb-2">O que precisa ser melhorado?</h2>
          <p className="text-muted mb-4">Quanto mais detalhes e evidências, mais fácil identificar o problema.</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Título</label>
              <input className="form-control" name="titulo" maxLength="120" placeholder="Ex.: Buraco grande na via" value={form.titulo} onChange={change} required />
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Categoria</label>
                <select className="form-select" name="categoria" value={form.categoria} onChange={change}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Localização</label>
                <input className="form-control" name="localizacao" placeholder="Rua, número ou referência" value={form.localizacao} onChange={change} required />
              </div>
            </div>

            <div className="row g-3 mt-1">
              <div className="col-6">
                <label className="form-label small">Latitude</label>
                <input className="form-control" name="latitude" value={form.latitude} onChange={change} placeholder="-23.0000000" />
              </div>
              <div className="col-6">
                <label className="form-label small">Longitude</label>
                <input className="form-control" name="longitude" value={form.longitude} onChange={change} placeholder="-46.0000000" />
              </div>
              <div className="col-12">
                <button type="button" className="btn btn-outline-primary w-100" onClick={usarLocalizacao}>📍 Usar minha localização atual</button>
              </div>
            </div>

            <div className="mb-3 mt-3">
              <label className="form-label fw-semibold">Descrição</label>
              <textarea className="form-control" name="descricao" maxLength="2000" rows="5" placeholder="Explique o problema, há quanto tempo ocorre e como afeta as pessoas..." value={form.descricao} onChange={change} required />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Fotos do problema <span className="text-muted fw-normal">(até 4 imagens, 5 MB cada)</span></label>
              <input className="form-control" type="file" accept="image/*" multiple onChange={escolherImagem} />
              {!!previews.length && <div className="rc-upload-gallery mt-3">{previews.map((preview, index) => <div key={preview}><img src={preview} alt={`Pré-visualização ${index + 1}`} /><button type="button" onClick={() => removerImagem(index)} aria-label={`Remover imagem ${index + 1}`}><i className="bi bi-x-lg" /></button></div>)}</div>}
            </div>

            <button className="btn btn-primary btn-lg w-100" disabled={loading}>
              {loading ? "Enviando..." : "Enviar denúncia"}
            </button>
          </form>

          {mensagem && <div className="alert alert-info mt-3 mb-0">{mensagem}</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
