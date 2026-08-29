import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import denunciaService from "../services/denunciaService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { friendlyError } from '../utils/errorMessage';

const CATEGORIAS = ["Buraco e pavimentação","Iluminação pública","Limpeza urbana","Saneamento","Água e esgoto","Trânsito e sinalização","Árvore e área verde","Outros"];

export default function EditarDenuncia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [denuncia, setDenuncia] = useState(null);
  const [form, setForm] = useState({ titulo:"", descricao:"", localizacao:"", categoria:"Outros", latitude:"", longitude:"" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagem, setImagem] = useState(null);
  const [preview, setPreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    denunciaService.buscarPorId(id)
      .then(data => {
        setDenuncia(data);
        setPreview(data.imageUrl || "");
        setForm({
          titulo: data.titulo || "",
          descricao: data.descricao || "",
          localizacao: data.localizacao || "",
          categoria: data.categoria || "Outros",
          latitude: data.latitude || "",
          longitude: data.longitude || ""
        });
      })
      .catch(err => setError(friendlyError(err, "Não foi possível carregar a denúncia para edição. Volte e tente novamente.")))
      .finally(() => setLoading(false));
  }, [id]);

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const escolherImagem = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Selecione um arquivo de imagem válido.');
    if (file.size > 5 * 1024 * 1024) return alert('A imagem deve ter no máximo 5 MB.');
    if (imagem && preview) URL.revokeObjectURL(preview);
    setImagem(file);
    setPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const removerImagem = () => {
    if (imagem && preview) URL.revokeObjectURL(preview);
    setImagem(null);
    setPreview("");
    setRemoveImage(true);
  };

  const submit = async e => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (imagem) data.append('imagem', imagem);
      if (removeImage) data.append('removeImage', 'true');
      await denunciaService.atualizar(id, data);
      alert("Denúncia atualizada com sucesso. Ela foi reenviada para análise da moderação.");
      navigate("/minhas-denuncias");
    } catch (err) {
      alert(friendlyError(err, "Não foi possível atualizar a denúncia. Revise os campos e tente novamente."));
    }
  };

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <div className="rc-form-card mx-auto">
          <span className="rc-eyebrow">CORRIGIR REGISTRO</span>
          <h2 className="fw-bold">Editar denúncia</h2>

          {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          : error ? <div className="alert alert-danger">{error}</div>
          : !user?.id ? <div className="alert alert-danger">Você precisa estar logado.</div>
          : Number(denuncia.userId) !== Number(user.id) ? <div className="alert alert-danger">Apenas o autor pode editar esta denúncia.</div>
          : denuncia.status !== "rejeitada" ? <div className="alert alert-warning">Apenas denúncias rejeitadas podem ser editadas.</div>
          : <form onSubmit={submit}>
            <div className="mb-3"><label className="form-label fw-semibold">Título</label><input className="form-control" name="titulo" value={form.titulo} onChange={change} required /></div>
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label fw-semibold">Categoria</label><select className="form-select" name="categoria" value={form.categoria} onChange={change}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="col-md-6"><label className="form-label fw-semibold">Localização</label><input className="form-control" name="localizacao" value={form.localizacao} onChange={change} required /></div>
            </div>
            <div className="mb-3 mt-3"><label className="form-label fw-semibold">Descrição</label><textarea className="form-control" rows="5" name="descricao" value={form.descricao} onChange={change} required /></div>
            <div className="row g-3 mb-4">
              <div className="col-6"><label className="form-label small">Latitude</label><input className="form-control" name="latitude" value={form.latitude} onChange={change} /></div>
              <div className="col-6"><label className="form-label small">Longitude</label><input className="form-control" name="longitude" value={form.longitude} onChange={change} /></div>
            </div>
            <div className="mb-4"><label className="form-label fw-semibold">Imagem da denúncia</label><input className="form-control" type="file" accept="image/*" onChange={escolherImagem} />{preview && <div className="mt-3"><img src={preview} alt="Imagem da denúncia" className="rc-upload-preview" /><button type="button" className="btn btn-outline-danger btn-sm mt-2" onClick={removerImagem}><i className="bi bi-trash me-1" />Remover imagem</button></div>}{removeImage && <small className="text-muted d-block mt-2">A imagem atual será removida ao salvar.</small>}</div>
            <button className="btn btn-primary w-100">Reenviar para moderação</button>
          </form>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
