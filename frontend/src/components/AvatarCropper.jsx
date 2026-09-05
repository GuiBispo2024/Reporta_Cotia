import { useEffect, useRef, useState } from 'react';

const PREVIEW_SIZE = 320;
const OUTPUT_SIZE = 512;

function drawCrop(canvas, image, zoom, positionX, positionY, size) {
  const context = canvas.getContext('2d');
  const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const overflowX = Math.max(0, width - size);
  const overflowY = Math.max(0, height - size);
  const x = (size - width) / 2 - (positionX / 100) * (overflowX / 2);
  const y = (size - height) / 2 - (positionY / 100) * (overflowY / 2);

  context.clearRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);
}

export default function AvatarCropper({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;
    drawCrop(canvas, image, zoom, positionX, positionY, PREVIEW_SIZE);
  }, [ready, zoom, positionX, positionY]);

  const confirmar = () => {
    if (!ready || saving) return;
    setSaving(true);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    drawCrop(canvas, imageRef.current, zoom, positionX, positionY, OUTPUT_SIZE);
    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

    canvas.toBlob(blob => {
      if (!blob) {
        setSaving(false);
        return;
      }
      const extension = outputType === 'image/png' ? 'png' : 'jpg';
      const croppedFile = new File([blob], `avatar-recortado.${extension}`, { type: outputType });
      onConfirm(croppedFile);
    }, outputType, .9);
  };

  return <div className="rc-cropper-backdrop" role="presentation">
    <section className="rc-cropper" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <div className="rc-cropper-header">
        <div><span className="rc-eyebrow">FOTO DE PERFIL</span><h2 id="avatar-crop-title">Ajuste o enquadramento</h2></div>
        <button type="button" onClick={onCancel} aria-label="Fechar recorte"><i className="bi bi-x-lg" /></button>
      </div>

      <div className="rc-cropper-preview">
        <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} aria-label="Prévia do recorte da foto" />
        <img ref={imageRef} src={imageUrl} alt="" onLoad={() => setReady(true)} />
      </div>

      <div className="rc-cropper-controls">
        <label><span><i className="bi bi-zoom-in" /> Zoom</span><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
        <label><span><i className="bi bi-arrows" /> Posição horizontal</span><input type="range" min="-100" max="100" value={positionX} onChange={event => setPositionX(Number(event.target.value))} /></label>
        <label><span><i className="bi bi-arrows-vertical" /> Posição vertical</span><input type="range" min="-100" max="100" value={positionY} onChange={event => setPositionY(Number(event.target.value))} /></label>
      </div>

      <p className="rc-cropper-help"><i className="bi bi-info-circle" /> Somente a área exibida no quadrado será usada no perfil.</p>
      <div className="rc-cropper-actions">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={!ready || saving} onClick={confirmar}>{saving ? 'Aplicando...' : 'Usar este recorte'}</button>
      </div>
    </section>
  </div>;
}
