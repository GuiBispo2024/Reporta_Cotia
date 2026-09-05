async function sendPasswordResetEmail(email, token) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;

  if (!process.env.RESEND_API_KEY || !process.env.RESET_EMAIL_FROM) {
    if (process.env.NODE_ENV !== 'production') console.log(`[password-reset] ${email}: ${resetUrl}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESET_EMAIL_FROM,
      to: [email],
      subject: 'Redefinição de senha — Reporta Cotia',
      html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}">Redefinir minha senha</a></p><p>O link expira em 30 minutos e pode ser usado uma única vez.</p>`
    })
  });
  if (!response.ok) throw new Error('O provedor de e-mail recusou a mensagem.');
}

module.exports = { sendPasswordResetEmail };
