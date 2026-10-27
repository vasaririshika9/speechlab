/**
 * SpeechLab Branded Transactional Email Templates
 *
 * Uses the Warm Cream (#F5F1E8), Near Black (#171411), Terracotta Red (#C83218),
 * and Sand Beige (#E5DED1) palette to generate high-conversion, professional HTML emails.
 */

export function generateVerificationEmailHtml({
  recipientName,
  verificationCode,
  verificationLink,
}: {
  recipientName?: string;
  verificationCode: string;
  verificationLink?: string;
}): string {
  const name = recipientName ? recipientName.trim() : 'Speaker';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your SpeechLab account</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F5F1E8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #171411; }
    .email-container { max-width: 580px; margin: 40px auto; background-color: #FAF8F2; border: 1px solid #E5DED1; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(23, 20, 17, 0.05); }
    .email-header { background-color: #F5F1E8; padding: 28px 36px; border-bottom: 1px solid #E5DED1; display: flex; align-items: center; }
    .brand-title { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #171411; margin: 0; }
    .brand-title span { color: #C83218; }
    .email-body { padding: 40px 36px; }
    .kicker { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #C83218; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 600; line-height: 1.15; margin: 0 0 16px; color: #171411; letter-spacing: -0.5px; }
    p { font-size: 15px; line-height: 1.6; color: #6D6860; margin: 0 0 24px; }
    .code-box { background-color: #F5F1E8; border: 1px solid #E5DED1; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
    .code-label { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6D6860; margin-bottom: 8px; }
    .otp-code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #C83218; margin: 0; }
    .btn-action { display: inline-block; background-color: #C83218; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-top: 10px; }
    .email-footer { background-color: #F5F1E8; padding: 24px 36px; border-top: 1px solid #E5DED1; font-size: 12px; line-height: 1.5; color: #8E8880; }
    .note { font-size: 13px; color: #8E8880; line-height: 1.5; margin-top: 24px; border-top: 1px solid #ECE5DA; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand-title">Speech<span>Lab</span></div>
    </div>
    <div class="email-body">
      <div class="kicker">/ ACCOUNT VERIFICATION</div>
      <h1>Verify your SpeechLab workspace</h1>
      <p>Hello ${name},</p>
      <p>Thank you for registering with SpeechLab — Contrastive Speech Analytics & Temporal Flaw Grounding. To complete your setup and access your private speaking workspace, enter this verification code:</p>
      
      <div class="code-box">
        <div class="code-label">YOUR 6-DIGIT VERIFICATION CODE</div>
        <div class="otp-code">${verificationCode}</div>
      </div>
      
      ${verificationLink ? `<p style="text-align: center;"><a href="${verificationLink}" class="btn-action">Verify Account Directly &rarr;</a></p>` : ''}
      
      <div class="note">
        This single-use code expires in 15 minutes. If you did not create a SpeechLab account, you can safely ignore this email — no workspace will be created without verification.
      </div>
    </div>
    <div class="email-footer">
      SpeechLab &bull; Contrastive Speech Analytics &bull; Private by default
    </div>
  </div>
</body>
</html>`;
}

export function generatePasswordResetEmailHtml({
  recipientName,
  resetCode,
  resetLink,
}: {
  recipientName?: string;
  resetCode: string;
  resetLink?: string;
}): string {
  const name = recipientName ? recipientName.trim() : 'Speaker';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your SpeechLab password</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F5F1E8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #171411; }
    .email-container { max-width: 580px; margin: 40px auto; background-color: #FAF8F2; border: 1px solid #E5DED1; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(23, 20, 17, 0.05); }
    .email-header { background-color: #F5F1E8; padding: 28px 36px; border-bottom: 1px solid #E5DED1; }
    .brand-title { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #171411; margin: 0; }
    .brand-title span { color: #C83218; }
    .email-body { padding: 40px 36px; }
    .kicker { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #C83218; margin-bottom: 12px; }
    h1 { font-size: 28px; font-weight: 600; line-height: 1.15; margin: 0 0 16px; color: #171411; letter-spacing: -0.5px; }
    p { font-size: 15px; line-height: 1.6; color: #6D6860; margin: 0 0 24px; }
    .code-box { background-color: #F5F1E8; border: 1px solid #E5DED1; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
    .code-label { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6D6860; margin-bottom: 8px; }
    .otp-code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #C83218; margin: 0; }
    .btn-action { display: inline-block; background-color: #C83218; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-top: 10px; }
    .email-footer { background-color: #F5F1E8; padding: 24px 36px; border-top: 1px solid #E5DED1; font-size: 12px; line-height: 1.5; color: #8E8880; }
    .note { font-size: 13px; color: #8E8880; line-height: 1.5; margin-top: 24px; border-top: 1px solid #ECE5DA; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="brand-title">Speech<span>Lab</span></div>
    </div>
    <div class="email-body">
      <div class="kicker">/ SECURITY RECOVERY</div>
      <h1>Reset your SpeechLab password</h1>
      <p>Hello ${name},</p>
      <p>We received a request to reset the password for your SpeechLab workspace. Use the verification code below to establish a new password:</p>
      
      <div class="code-box">
        <div class="code-label">PASSWORD RECOVERY CODE</div>
        <div class="otp-code">${resetCode}</div>
      </div>
      
      ${resetLink ? `<p style="text-align: center;"><a href="${resetLink}" class="btn-action">Reset Password Directly &rarr;</a></p>` : ''}
      
      <div class="note">
        This code is valid for 15 minutes. If you did not request a password reset, your password has not changed, and you can safely ignore this email.
      </div>
    </div>
    <div class="email-footer">
      SpeechLab &bull; Contrastive Speech Analytics &bull; Private by default
    </div>
  </div>
</body>
</html>`;
}
