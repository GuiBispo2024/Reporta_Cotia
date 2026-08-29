import { useEffect, useState } from 'react';

export default function UserAvatar({ user, className = '', alt, fallbackClassName = '' }) {
  const [failed, setFailed] = useState(false);
  const src = user?.avatarUrl;

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return <img className={`rc-avatar-image ${className}`} src={src} alt={alt || `Foto de ${user?.username || 'usuário'}`} onError={() => setFailed(true)} />;
  }

  return <span className={`${className} ${fallbackClassName}`} aria-label={alt || `Avatar de ${user?.username || 'usuário'}`}>
    {user?.username?.charAt(0).toUpperCase() || <i className="bi bi-person" />}
  </span>;
}
