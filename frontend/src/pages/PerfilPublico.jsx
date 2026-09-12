import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import UserAvatar from '../components/UserAvatar';
import { getPrimaryRoleLabel } from '../utils/accessControl';
import userService from '../services/userService';
import denunciaService from '../services/denunciaService';
import { friendlyError } from '../utils/errorMessage';

export default function PerfilPublico() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    userService.getById(id).then(async user => {
      const result = await denunciaService.buscarPublicadasPorUsuario(id, { page: 1, limit: 12 });
      if (active) { setProfile(user); setReports(result.data || []); }
    }).catch(err => active && setError(friendlyError(err, 'Não foi possível carregar este perfil.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  return <div className="rc-page"><Navbar /><main className="container py-4 flex-grow-1">
    {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : error ? <div className="alert alert-danger">{error}</div> : <>
      <header className="rc-public-profile"><UserAvatar user={profile} className="rc-profile-main-avatar" /><div><span className="rc-eyebrow">PERFIL PÚBLICO</span><h1>{profile.username}</h1><p>{getPrimaryRoleLabel(profile)} · {reports.length} contribuições públicas nesta página</p></div></header>
      <h2 className="h4 fw-bold my-4">Denúncias publicadas</h2>
      {!reports.length ? <div className="rc-empty">Este usuário ainda não possui denúncias aprovadas.</div> : <div className="row g-3">{reports.map(report => <div className="col-12 col-md-6" key={report.id}><Link className="rc-public-report" to={`/denuncia/${report.id}`}><strong>{report.titulo}</strong><span><i className="bi bi-geo-alt" /> {report.localizacao}</span><small>{report.likesCount || 0} curtidas · {report.commentsCount || 0} comentários</small></Link></div>)}</div>}
    </>}
  </main><Footer /></div>;
}
