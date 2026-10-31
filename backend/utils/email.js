// Sending email through Resend. One place that knows the from-address and the
// API key, so the rest of the app just asks for an email to go out.
//
// Without RESEND_API_KEY set (local development), nothing is sent: the message
// is logged to the server console instead, so the reset flow still works end
// to end while you're building it.

const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

let client = null;
function resend() {
    if (client) return client;
    const { Resend } = require("resend");
    client = new Resend(process.env.RESEND_API_KEY);
    return client;
}

async function sendPasswordResetEmail(to, resetUrl) {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[password reset] no RESEND_API_KEY set; reset link for ${to}: ${resetUrl}`);
        return;
    }

    // Resend resolves to { data, error } and does NOT throw on an API error
    // (bad key, unverified sender, and so on), so check it ourselves and
    // throw, or the failure would pass silently.
    const { error } = await resend().emails.send({
        from: FROM,
        to,
        subject: "Reset your Kino Kaverit password",
        text:
            `Someone asked to reset the password for your Kino Kaverit account.\n\n` +
            `Open this link to choose a new one. It expires in 20 minutes:\n${resetUrl}\n\n` +
            `If this wasn't you, you can ignore this email: your password stays as it is.`,
        html:
            `<p>Someone asked to reset the password for your Kino Kaverit account.</p>` +
            `<p><a href="${resetUrl}">Choose a new password</a>. The link expires in 20 minutes.</p>` +
            `<p>If this wasn't you, you can ignore this email: your password stays as it is.</p>`,
    });

    if (error) {
        throw new Error(`Resend refused the email: ${error.message || error.name || "unknown error"}`);
    }
}

module.exports = { sendPasswordResetEmail };
