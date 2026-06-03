import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — BOSS by Monoversal Hub",
  description: "How BOSS collects, uses, and protects your business data.",
};

const s = {
  wrap: { background: "#F2F2F7", height: "100svh", overflowY: "auto", overflowX: "hidden", fontFamily: "inherit" },
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

export default function PrivacyPage() {
  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <Link href="/" style={s.back}>← Back to BOSS</Link>
        <div style={s.wordmark}>BOSS</div>
        <h1 style={s.h1}>Privacy Policy</h1>
        <div style={s.date}>Effective Date: 1 July 2025 &middot; Last Updated: June 2026</div>
        <hr style={s.divider} />

        <p style={s.body}><strong>Operator:</strong> Monoversal Hub (CAC BN 9319562), Lagos, Nigeria<br />
        <strong>Contact:</strong> monoversalhub@gmail.com<br />
        <strong>App:</strong> https://boss-africa.vercel.app</p>

        <h2 style={s.h2}>1. Who We Are</h2>
        <p style={s.body}>BOSS is a business management application owned and operated by <strong>Monoversal Hub</strong>, a business registered under the Corporate Affairs Commission of Nigeria (BN 9319562).</p>
        <p style={s.body}>&quot;We,&quot; &quot;us,&quot; or &quot;our&quot; means Monoversal Hub. &quot;You&quot; or &quot;your&quot; means any tailor or business owner who registers and uses BOSS.</p>

        <h2 style={s.h2}>2. What BOSS Does</h2>
        <p style={s.body}>BOSS is a business organisation tool for tailors and informal business owners in Africa. It helps you:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Track orders, customer measurements, and delivery dates</li>
          <li style={{ marginBottom: 6 }}>Record payments you receive manually (cash or bank transfer)</li>
          <li style={{ marginBottom: 6 }}>Generate and share professional WhatsApp receipts with your customers</li>
          <li style={{ marginBottom: 6 }}>Export a public invoice link your customer can open and screenshot</li>
          <li style={{ marginBottom: 6 }}>Build a Trust Score (BOS Score) that reflects your business history</li>
          <li style={{ marginBottom: 6 }}>Export your business data as CSV or JSON</li>
          <li style={{ marginBottom: 6 }}>Back up your data to your personal Google Drive</li>
          <li style={{ marginBottom: 6 }}>Sync delivery dates to your Google Calendar</li>
        </ul>
        <p style={s.body}><strong>BOSS does not process, collect, hold, or move money on your behalf.</strong> All payments happen directly between you and your customers outside of BOSS. BOSS only records what you tell it.</p>

        <h2 style={s.h2}>3. Data We Collect</h2>

        <h3 style={s.h3}>3.1 Account &amp; Profile Data</h3>
        <p style={s.body}>When you create a BOSS account, we collect:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Your <strong>email address</strong> — used for Google OAuth login via Supabase Auth</li>
          <li style={{ marginBottom: 6 }}>Your <strong>shop name</strong> — displayed on your receipts and invoice pages</li>
          <li style={{ marginBottom: 6 }}>Your <strong>phone number</strong> — included on WhatsApp receipts</li>
          <li style={{ marginBottom: 6 }}>Your <strong>city</strong> — used to personalise your experience</li>
          <li style={{ marginBottom: 6 }}>Your <strong>years of experience</strong> — used to calculate your initial BOS Score</li>
        </ul>

        <h3 style={s.h3}>3.2 Payment Details You Provide</h3>
        <p style={s.body}>You may optionally enter:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Your <strong>bank name and account number</strong> (your personal Nigerian bank account)</li>
        </ul>
        <p style={s.body}>This information is stored in your profile and printed on receipts you generate. BOSS does not use these details to move money. We do not connect to your bank or verify your account with any bank or payment processor.</p>

        <h3 style={s.h3}>3.3 Customer Data</h3>
        <p style={s.body}>When you add a customer, we store:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Customer name and phone number</li>
          <li style={{ marginBottom: 6 }}>Body measurements (for tailoring work)</li>
          <li style={{ marginBottom: 6 }}>Notes about the customer</li>
        </ul>

        <h3 style={s.h3}>3.4 Order Data</h3>
        <p style={s.body}>When you create an order, we store:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Cloth type, total price, deposit amount, balance outstanding</li>
          <li style={{ marginBottom: 6 }}>Delivery date and order status (In Progress / Ready / Delivered)</li>
          <li style={{ marginBottom: 6 }}>Payment records you enter manually (amount, date)</li>
          <li style={{ marginBottom: 6 }}>Up to 5 reference style images per order (stored in Supabase Storage)</li>
        </ul>

        <h3 style={s.h3}>3.5 BOS Score Data</h3>
        <p style={s.body}>We calculate a Trust Score based on:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Order completion rate (30%)</li>
          <li style={{ marginBottom: 6 }}>Repeat customer rate (25%)</li>
          <li style={{ marginBottom: 6 }}>Payment consistency (25%)</li>
          <li style={{ marginBottom: 6 }}>Revenue signal (20%)</li>
          <li style={{ marginBottom: 6 }}>Overdue order penalty (−5% per overdue order)</li>
          <li style={{ marginBottom: 6 }}>Self-declared years of experience (entered during onboarding)</li>
        </ul>
        <p style={s.body}>Your BOS Score is visible only to you and is not shared with any third party.</p>

        <h3 style={s.h3}>3.6 Google Drive &amp; Calendar Data (if you connect)</h3>
        <p style={s.body}>If you connect your Google account:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>We store a <strong>Google OAuth refresh token</strong> to perform backups on your behalf</li>
          <li style={{ marginBottom: 6 }}>We upload your data as a file to a BOSS folder in your Google Drive</li>
          <li style={{ marginBottom: 6 }}>We create delivery date events in your Google Calendar</li>
        </ul>
        <p style={s.body}>We request only the narrowest Google scopes:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}><code style={s.code}>drive.file</code> — only files BOSS itself creates</li>
          <li style={{ marginBottom: 6 }}><code style={s.code}>calendar.events</code> — only events BOSS itself creates</li>
        </ul>
        <p style={s.body}>We do not read, access, or process any other content in your Drive or Calendar.</p>

        <h3 style={s.h3}>3.7 Technical Data</h3>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Last seen timestamp (for BOS Score activity)</li>
          <li style={{ marginBottom: 6 }}>Notification preferences</li>
          <li style={{ marginBottom: 6 }}>Error logs for debugging (contain no customer personal data)</li>
        </ul>
        <p style={s.body}>We do not use third-party analytics, advertising SDKs, or tracking pixels.</p>

        <h2 style={s.h2}>4. How We Use Your Data</h2>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Purpose</th>
              <th style={s.th}>Legal Basis</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Creating and managing your BOSS account</td><td style={s.td}>Performance of contract</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Storing your orders and customer records</td><td style={s.td}>Performance of contract</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Generating WhatsApp receipts and invoice links</td><td style={s.td}>Performance of contract</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Calculating your BOS Score</td><td style={s.td}>Legitimate interest</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Backing up data to Google Drive</td><td style={s.td}>Consent (you connect Google)</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Syncing delivery dates to Google Calendar</td><td style={s.td}>Consent (you connect Google)</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Sending delivery reminder notifications</td><td style={s.td}>Consent (you opt in)</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Detecting fraud and preventing abuse</td><td style={s.td}>Legitimate interest</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Complying with Nigerian law</td><td style={s.td}>Legal obligation</td></tr>
          </tbody>
        </table>

        <h2 style={s.h2}>5. How We Share Your Data</h2>
        <p style={s.body}>We do not sell your data. We share data only with these service providers:</p>
        <p style={s.body}><strong>Supabase</strong> — Your data is stored on Supabase (PostgreSQL) servers. Row Level Security ensures only your authenticated session can read your records. Privacy policy: supabase.com/privacy</p>
        <p style={s.body}><strong>Google</strong> — If you connect Google, your business data is sent to your own Google Drive account and delivery dates to your Google Calendar. Privacy policy: policies.google.com/privacy</p>
        <p style={s.body}><strong>Vercel</strong> — BOSS is hosted on Vercel, which processes request logs including IP addresses as standard hosting infrastructure. Privacy policy: vercel.com/legal/privacy-policy</p>
        <p style={s.body}><strong>Supabase Storage</strong> — Order reference images are stored with authenticated write and public read access so invoice links can display them.</p>
        <p style={s.body}>We do not share customer data, order history, BOS Score, or payment details with any third party for marketing, profiling, or advertising.</p>

        <h2 style={s.h2}>6. Public Invoice Pages</h2>
        <p style={s.body}>When you share an invoice link (<code style={s.code}>boss-africa.vercel.app/invoice/[orderId]</code>), the following is publicly visible to anyone with that link:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Your shop name</li>
          <li style={{ marginBottom: 6 }}>Your bank account details (if entered)</li>
          <li style={{ marginBottom: 6 }}>Your WhatsApp number (as a contact link)</li>
          <li style={{ marginBottom: 6 }}>Order details: cloth type, price, amount paid, balance, delivery date, status</li>
          <li style={{ marginBottom: 6 }}>Style reference images attached to the order</li>
        </ul>
        <p style={s.body}>Customer personal information (name, phone number, measurements) is never shown on public invoice pages.</p>
        <p style={s.body}>You control whether to share invoice links — BOSS generates them but you decide who receives them.</p>

        <h2 style={s.h2}>7. Your Customers' Data — Your Responsibility</h2>
        <p style={s.body}>When you enter customers' names, phone numbers, and measurements into BOSS, you are the <strong>data controller</strong> for that information. You are responsible for:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>Informing your customers that their details are stored digitally</li>
          <li style={{ marginBottom: 6 }}>Obtaining consent where required</li>
          <li style={{ marginBottom: 6 }}>Responding to any requests your customers make about their own data</li>
        </ul>
        <p style={s.body}>BOSS processes this data as your data processor. We do not contact your customers or use their data for any purpose other than operating BOSS for you.</p>

        <h2 style={s.h2}>8. Data Retention</h2>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Data</th>
              <th style={s.th}>Retention Period</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Account and profile data</td><td style={s.td}>Until you delete your account</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Orders and customer records</td><td style={s.td}>Until you delete them or your account</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>BOS Score history</td><td style={s.td}>Until account deletion</td></tr>
            <tr style={{ background: "#F9F9F9" }}><td style={s.td}>Google OAuth refresh token</td><td style={s.td}>Until you disconnect Google or delete account</td></tr>
            <tr style={{ background: "#FFFFFF" }}><td style={s.td}>Error logs</td><td style={s.td}>30 days rolling</td></tr>
          </tbody>
        </table>

        <h2 style={s.h2}>9. Your Rights</h2>
        <p style={s.body}>Under the Nigeria Data Protection Act (NDPA) 2023, you have the right to:</p>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}><strong>Access</strong> — request a copy of all data we hold about you</li>
          <li style={{ marginBottom: 6 }}><strong>Correction</strong> — request correction of inaccurate data</li>
          <li style={{ marginBottom: 6 }}><strong>Deletion</strong> — request deletion of your account and all associated data</li>
          <li style={{ marginBottom: 6 }}><strong>Portability</strong> — export your data as JSON or CSV from Profile at any time</li>
          <li style={{ marginBottom: 6 }}><strong>Withdraw consent</strong> — disconnect Google Drive/Calendar in Profile settings</li>
          <li style={{ marginBottom: 6 }}><strong>Object</strong> — object to processing based on legitimate interest</li>
        </ul>
        <p style={s.body}>To exercise these rights, email <strong>monoversalhub@gmail.com</strong> with the subject &quot;Data Request — [your shop name].&quot; We will respond within 14 business days.</p>

        <h2 style={s.h2}>10. Data Security</h2>
        <ul style={{ ...s.body, paddingLeft: 24, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>All data in transit is encrypted via HTTPS/TLS</li>
          <li style={{ marginBottom: 6 }}>Supabase Row Level Security ensures your data is only accessible to your authenticated session</li>
          <li style={{ marginBottom: 6 }}>Google OAuth tokens are stored securely and used only for authorised actions</li>
          <li style={{ marginBottom: 6 }}>API routes are rate-limited to prevent abuse</li>
          <li style={{ marginBottom: 6 }}>Server-side keys are never exposed to the browser</li>
        </ul>
        <p style={s.body}>In the event of a data breach, we will notify you within 72 hours as required by the NDPA 2023.</p>

        <h2 style={s.h2}>11. Children's Privacy</h2>
        <p style={s.body}>BOSS is for adults operating businesses. We do not knowingly collect data from anyone under 18. Contact monoversalhub@gmail.com if you believe a minor has registered.</p>

        <h2 style={s.h2}>12. International Data Transfers</h2>
        <p style={s.body}>Your data may be stored outside Nigeria by Supabase, Vercel, and Google. We rely on the data processing agreements of those providers to ensure equivalent protection.</p>

        <h2 style={s.h2}>13. Changes to This Policy</h2>
        <p style={s.body}>We will notify you of material changes via the app or email at least 14 days before they take effect.</p>

        <h2 style={s.h2}>14. Contact &amp; Complaints</h2>
        <p style={s.body}><strong>Monoversal Hub</strong> | Lagos, Nigeria | CAC BN 9319562<br />
        Email: monoversalhub@gmail.com<br />
        App: https://boss-africa.vercel.app</p>
        <p style={s.body}>To complain: <strong>Nigeria Data Protection Commission (NDPC)</strong> at ndpb.gov.ng</p>
        <p style={{ ...s.body, fontStyle: "italic", fontSize: 14, color: "#8E8E93" }}>This Privacy Policy complies with the Nigeria Data Protection Act (NDPA) 2023, the NDPR 2019, and Google's OAuth API Services User Data Policy.</p>

        <div style={s.footer}>
          <p style={{ margin: 0 }}>Monoversal Hub &middot; Lagos, Nigeria &middot; CAC BN 9319562</p>
        </div>
      </div>
    </div>
  );
}
