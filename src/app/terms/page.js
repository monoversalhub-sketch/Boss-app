import Link from "next/link";

export const metadata = {
  title: "Terms of Service — BOSS by Monoversal Hub",
  description: "Terms and conditions for using BOSS.",
};

const s = {
  wrap: { background: "#F2F2F7", minHeight: "100svh", fontFamily: "inherit" },
  inner: { maxWidth: 680, margin: "0 auto", padding: "24px 24px 80px" },
  back: { display: "block", fontSize: 14, color: "#007AFF", padding: "0 0 16px 0", textDecoration: "none", fontWeight: 600 },
  wordmark: { fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "#8E8E93", textTransform: "uppercase", marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: 800, color: "#1C1C1E", marginBottom: 6 },
  date: { fontSize: 13, color: "#8E8E93" },
  divider: { border: "none", borderTop: "1px solid #E5E5EA", margin: "20px 0" },
  body: { fontSize: 15, lineHeight: "1.75", color: "#3A3A3C", marginBottom: 16 },
  h2: { fontSize: 17, fontWeight: 700, color: "#1C1C1E", marginTop: 36, marginBottom: 10 },
  h3: { fontSize: 15, fontWeight: 600, color: "#1C1C1E", marginTop: 20, marginBottom: 6 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 16 },
  th: { background: "#1C1C1E", color: "#FFFFFF", padding: "10px 12px", textAlign: "left", fontWeight: 600 },
  td: { padding: "10px 12px", borderBottom: "1px solid #E5E5EA" },
  code: { fontFamily: "monospace", fontSize: 13, background: "#E5E5EA", padding: "2px 6px", borderRadius: 4 },
  footer: { marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E5EA", fontSize: 13, color: "#8E8E93", textAlign: "center" },
};

export default function TermsPage() {
  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <Link href="/" style={s.back}>← Back to BOSS</Link>
        <div style={s.wordmark}>BOSS</div>
        <h1 style={s.h1}>Terms of Service</h1>
        <div style={s.date}>Effective Date: 1 July 2025 &middot; Last Updated: June 2026</div>
        <hr style={s.divider} />

        <p style={s.body}><strong>Operator:</strong> Monoversal Hub (CAC BN 9319562), Lagos, Nigeria<br />
        <strong>Contact:</strong> monoversalhub@gmail.com<br />
        <strong>App:</strong> https://boss-africa.vercel.app</p>

        <h2 style={s.h2}>1. Acceptance of Terms</h2>
        <p style={s.body}>By creating a BOSS account or using the BOSS application at boss-africa.vercel.app, you agree to these Terms of Service. If you do not agree, do not use BOSS. These Terms form a binding legal agreement between you (the tailor or business owner) and Monoversal Hub.</p>

        <h2 style={s.h2}>2. What BOSS Provides</h2>
        <p style={s.body}>BOSS provides:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Order management: tracking orders, customer measurements, and delivery dates</li>
          <li style={{ marginBottom: 6 }}>Manual payment recording (you record what customers pay you directly)</li>
          <li style={{ marginBottom: 6 }}>WhatsApp receipt generation and public invoice links</li>
          <li style={{ marginBottom: 6 }}>A BOS Trust Score reflecting your business activity</li>
          <li style={{ marginBottom: 6 }}>Financial reporting and CSV/JSON data export</li>
          <li style={{ marginBottom: 6 }}>Optional Google Drive backup of your business data</li>
          <li style={{ marginBottom: 6 }}>Optional Google Calendar sync for delivery dates</li>
        </ul>
        <p style={s.body}>BOSS does not process payments, hold funds, or act as a payment intermediary. No money passes through BOSS. All financial transactions occur directly between you and your customers.</p>

        <h2 style={s.h2}>3. Eligibility</h2>
        <p style={s.body}>You must be at least 18 years old and operating a legitimate business in Nigeria to use BOSS. By registering, you confirm:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>You are the owner or authorised operator of the business you register</li>
          <li style={{ marginBottom: 6 }}>Any bank account details you enter belong to you</li>
          <li style={{ marginBottom: 6 }}>You will use BOSS only for lawful business purposes</li>
        </ul>

        <h2 style={s.h2}>4. Your Account</h2>
        <p style={s.body}>You are responsible for:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Keeping your login credentials confidential</li>
          <li style={{ marginBottom: 6 }}>All activity that occurs under your account</li>
          <li style={{ marginBottom: 6 }}>Ensuring your shop name, bank details, and contact information are accurate</li>
        </ul>
        <p style={s.body}>Notify us immediately at monoversalhub@gmail.com if you suspect unauthorised access to your account.</p>

        <h2 style={s.h2}>5. How Payments Work in BOSS</h2>
        <p style={s.body}>BOSS does not process or collect payments. The payment workflow is:</p>
        <ol style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>You create an order in BOSS and set the price and deposit amount</li>
          <li style={{ marginBottom: 6 }}>You share a WhatsApp receipt or invoice link with your customer</li>
          <li style={{ marginBottom: 6 }}>Your customer pays you directly (cash or bank transfer) using the bank account you have entered in your Profile</li>
          <li style={{ marginBottom: 6 }}>You record the payment manually in BOSS</li>
        </ol>
        <p style={s.body}>BOSS records what you enter. It does not verify, confirm, or process any payment. It does not connect to your bank account.</p>

        <h2 style={s.h2}>6. Public Invoice Links</h2>
        <p style={s.body}>When you generate an invoice link, it is publicly accessible to anyone with the URL. The link displays your shop name, bank payment details, and order information. Customer personal details (name, phone, measurements) are never shown on public invoice pages. You control who you share invoice links with.</p>

        <h2 style={s.h2}>7. BOS Trust Score</h2>
        <p style={s.body}>Your BOS Score is a proprietary metric calculated by Monoversal Hub based on your activity in BOSS:</p>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Factor</th>
              <th style={s.th}>Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Order Completion Rate</td><td style={s.td}>30%</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Repeat Customers</td><td style={s.td}>25%</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Payment Consistency</td><td style={s.td}>25%</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Revenue Signal</td><td style={s.td}>20%</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Overdue Penalty</td><td style={s.td}>−5% per overdue order</td></tr>
          </tbody>
        </table>
        <p style={s.body}>Score Levels: New → Building → Growing → Trusted<br />Credit Readiness indicator: Low / Medium / High</p>
        <p style={s.body}>The BOS Score is for your information only. It does not currently constitute a credit assessment under any regulatory framework. It is not transferable and not redeemable for cash. Future credit products based on the BOS Score will be governed by separate terms at the time of launch.</p>

        <h2 style={s.h2}>8. Google Drive &amp; Calendar Integration</h2>
        <p style={s.body}>If you connect your Google account:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>You authorise BOSS to create backup files in your Google Drive (in a BOSS folder) and delivery events in your Google Calendar</li>
          <li style={{ marginBottom: 6 }}>You can disconnect at any time in Profile settings</li>
          <li style={{ marginBottom: 6 }}>Disconnecting does not delete data already in your Drive or Calendar — those remain under your control in your Google account</li>
          <li style={{ marginBottom: 6 }}>BOSS accesses only files it created (<code style={s.code}>drive.file</code> scope) and only events it created (<code style={s.code}>calendar.events</code> scope)</li>
        </ul>

        <h2 style={s.h2}>9. Your Customers' Data</h2>
        <p style={s.body}>You are the data controller for all customer information you enter into BOSS. You are responsible for having the right to store this information and for responding to any requests from your customers about their data. Do not enter false or malicious information about individuals.</p>

        <h2 style={s.h2}>10. Acceptable Use</h2>
        <p style={s.body}>You must not use BOSS to:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Record transactions for illegal goods or services</li>
          <li style={{ marginBottom: 6 }}>Impersonate another business or person</li>
          <li style={{ marginBottom: 6 }}>Store data about individuals without their knowledge or consent</li>
          <li style={{ marginBottom: 6 }}>Attempt to reverse-engineer, scrape, or exploit the BOSS platform</li>
          <li style={{ marginBottom: 6 }}>Interfere with the security or integrity of the app or its infrastructure</li>
        </ul>
        <p style={s.body}>Violation may result in immediate account suspension.</p>

        <h2 style={s.h2}>11. Data Export &amp; Backup</h2>
        <p style={s.body}>You can export your data at any time from Profile → Financial Report (CSV) or Profile → Data &amp; Backup (JSON). You are encouraged to maintain your own backups. Monoversal Hub is not liable for data loss resulting from third-party infrastructure failures or your own account deletion.</p>

        <h2 style={s.h2}>12. Service Fees</h2>
        <p style={s.body}>BOSS is currently free to use. We reserve the right to introduce fees (subscription, feature-based, or otherwise) with at least 30 days' notice to active users before any charges take effect.</p>

        <h2 style={s.h2}>13. Availability &amp; Changes</h2>
        <p style={s.body}>We aim to keep BOSS available at all times but do not guarantee uninterrupted service. We may update, improve, or discontinue features with reasonable notice, and may modify these Terms with 30 days' notice to active users. Continued use after updated Terms take effect constitutes acceptance.</p>

        <h2 style={s.h2}>14. Limitation of Liability</h2>
        <p style={s.body}>To the maximum extent permitted by Nigerian law, Monoversal Hub's total liability for any claim arising from your use of BOSS is limited to amounts you paid to BOSS (if any) in the 3 months preceding the claim. We are not liable for indirect, consequential, or incidental damages, including loss of business or lost profits.</p>

        <h2 style={s.h2}>15. Governing Law</h2>
        <p style={s.body}>These Terms are governed by the laws of the Federal Republic of Nigeria. Any dispute will be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.</p>

        <h2 style={s.h2}>16. Contact</h2>
        <p style={s.body}><strong>Monoversal Hub</strong> | Lagos, Nigeria | CAC BN 9319562<br />
        Email: monoversalhub@gmail.com<br />
        App: https://boss-africa.vercel.app</p>

        <div style={s.footer}>
          <p style={{ margin: 0 }}>Monoversal Hub &middot; Lagos, Nigeria &middot; CAC BN 9319562</p>
        </div>
      </div>
    </div>
  );
}
