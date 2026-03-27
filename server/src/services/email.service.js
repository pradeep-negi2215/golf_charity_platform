const nodemailer = require("nodemailer");

let transporter;

const isEmailEnabled = () => {
  return `${process.env.EMAIL_ENABLED || "false"}`.toLowerCase() === "true";
};

const getFromAddress = () => {
  return process.env.EMAIL_FROM || "no-reply@golf-charity.local";
};

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP_HOST,
      port: Number(process.env.EMAIL_SMTP_PORT || 587),
      secure: `${process.env.EMAIL_SMTP_SECURE || "false"}`.toLowerCase() === "true",
      auth: process.env.EMAIL_SMTP_USER
        ? {
            user: process.env.EMAIL_SMTP_USER,
            pass: process.env.EMAIL_SMTP_PASS || ""
          }
        : undefined
    });
  }

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: "EMAIL_ENABLED is false" };
  }

  if (!to) {
    return { skipped: true, reason: "missing recipient" };
  }

  const smtpHost = process.env.EMAIL_SMTP_HOST;
  if (!smtpHost) {
    return { skipped: true, reason: "EMAIL_SMTP_HOST is not configured" };
  }

  const tx = getTransporter();

  await tx.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html
  });

  return { skipped: false };
};

const sendSignupEmail = async ({ email, firstName }) => {
  const displayName = firstName || "Golfer";
  const subject = "Welcome to Golf Charity Subscription Platform";
  const text = `Hi ${displayName},\n\nWelcome to the Golf Charity Subscription Platform. Your account is ready, and you can now track scores, support your selected charity, and participate in monthly draws.\n\nThanks for joining us.`;
  const html = `
    <p>Hi ${displayName},</p>
    <p>Welcome to the Golf Charity Subscription Platform.</p>
    <p>Your account is ready, and you can now track scores, support your selected charity, and participate in monthly draws.</p>
    <p>Thanks for joining us.</p>
  `;

  return sendEmail({ to: email, subject, text, html });
};

const sendDrawResultEmail = async ({ email, firstName, monthKey, matchedNumbers, winnings }) => {
  const displayName = firstName || "Golfer";
  const matchText = (matchedNumbers || []).length
    ? matchedNumbers.join(", ")
    : "No matched numbers this month";
  const amount = Number(winnings || 0).toFixed(2);
  const subject = `Monthly draw results for ${monthKey}`;
  const text = `Hi ${displayName},\n\nYour monthly draw results for ${monthKey} are now available.\nMatched numbers: ${matchText}\nWinnings: GBP ${amount}\n\nSign in to view full details.`;
  const html = `
    <p>Hi ${displayName},</p>
    <p>Your monthly draw results for <strong>${monthKey}</strong> are now available.</p>
    <p><strong>Matched numbers:</strong> ${matchText}</p>
    <p><strong>Winnings:</strong> GBP ${amount}</p>
    <p>Sign in to view full details.</p>
  `;

  return sendEmail({ to: email, subject, text, html });
};

const sendWinnerEmail = async ({ email, firstName, monthKey, tier, winnings }) => {
  const displayName = firstName || "Winner";
  const amount = Number(winnings || 0).toFixed(2);
  const tierLabel = `${tier}`.replace("match", "");
  const subject = `Congratulations! You are a ${tierLabel}-match winner`;
  const text = `Hi ${displayName},\n\nCongratulations. You are a ${tier} winner for the ${monthKey} draw.\nPrize amount: GBP ${amount}\n\nOur team will process payout verification soon.`;
  const html = `
    <p>Hi ${displayName},</p>
    <p><strong>Congratulations.</strong> You are a ${tier} winner for the ${monthKey} draw.</p>
    <p><strong>Prize amount:</strong> GBP ${amount}</p>
    <p>Our team will process payout verification soon.</p>
  `;

  return sendEmail({ to: email, subject, text, html });
};

const sendPasswordResetEmail = async ({ email, firstName, resetUrl }) => {
  const displayName = firstName || "Golfer";
  const subject = "Reset your Golf Charity account password";
  const text = `Hi ${displayName},\n\nWe received a request to reset your password.\nUse this link to reset it: ${resetUrl}\n\nIf you did not request a reset, you can ignore this message. The link will expire in 1 hour.`;
  const html = `
    <p>Hi ${displayName},</p>
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you did not request a reset, you can ignore this message. The link will expire in 1 hour.</p>
  `;

  return sendEmail({ to: email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendSignupEmail,
  sendDrawResultEmail,
  sendWinnerEmail,
  sendPasswordResetEmail
};
