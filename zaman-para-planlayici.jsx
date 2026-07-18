import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";

// ---------- helpers ----------
const fmtTL = (v) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " TL";
const fmtTL0 = (v) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(v) + " TL";
const fmtPct = (v) =>
  "%" + new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const MAX_MONTHS = 120;

function simulate({ capital, installment, remaining, monthlyReturn, payFromCapital, target }) {
  const rows = [];
  let cap = capital;
  let busted = null;
  let targetMonth = null;
  let debtFreeMonth = remaining === 0 ? 0 : null;

  for (let m = 1; m <= MAX_MONTHS; m++) {
    const start = cap;
    const taksit = payFromCapital && m <= remaining ? installment : 0;
    const after = start - taksit;
    if (after <= 0 && busted === null) {
      busted = m;
      rows.push({ m, start, taksit, after, profit: 0, end: after, debt: installment * Math.max(0, remaining - m), net: after - installment * Math.max(0, remaining - m) });
      break;
    }
    const profit = after * (monthlyReturn / 100);
    const end = after + profit;
    const debt = installment * Math.max(0, remaining - m);
    const net = end - debt;
    rows.push({ m, start, taksit, after, profit, end, debt, net });
    if (debtFreeMonth === null && debt === 0) debtFreeMonth = m;
    if (targetMonth === null && end >= target) targetMonth = m;
    cap = end;
    if (targetMonth !== null && m >= remaining) break;
  }
  return { rows, busted, targetMonth, debtFreeMonth };
}

function requiredReturn({ capital, installment, remaining, payFromCapital, target, months }) {
  // binary search monthly return (%) so that capital >= target at `months`
  let lo = 0, hi = 300, ok = null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const { busted, targetMonth } = simulate({ capital, installment, remaining, monthlyReturn: mid, payFromCapital, target });
    const reached = !busted && targetMonth !== null && targetMonth <= months;
    if (reached) { ok = mid; hi = mid; } else { lo = mid; }
  }
  return ok;
}

// ---------- inputs ----------
function Field({ label, suffix, value, onChange, step = 1, min = 0 }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="field-wrap">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))}
          className="field-input"
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

export default function App() {
  const [capital, setCapital] = useState(70472);
  const [installment, setInstallment] = useState(14201.22);
  const [remaining, setRemaining] = useState(6);
  const [target, setTarget] = useState(150000);
  const [monthlyReturn, setMonthlyReturn] = useState(5);
  const [deadline, setDeadline] = useState(12);
  const [payFromCapital, setPayFromCapital] = useState(true);

  const sim = useMemo(
    () => simulate({ capital, installment, remaining, monthlyReturn, payFromCapital, target }),
    [capital, installment, remaining, monthlyReturn, payFromCapital, target]
  );

  const reqReturn = useMemo(
    () => requiredReturn({ capital, installment, remaining, payFromCapital, target, months: deadline }),
    [capital, installment, remaining, payFromCapital, target, deadline]
  );

  const totalDebt = installment * remaining;
  const shownRows = sim.rows.slice(0, sim.targetMonth ? sim.targetMonth : Math.min(sim.rows.length, 36));
  const chartRows = shownRows.map((r) => ({ ay: r.m, Sermaye: Math.round(r.end), "Net (Sermaye − Borç)": Math.round(r.net) }));

  const riskLevel =
    reqReturn === null ? "impossible" : reqReturn > 10 ? "high" : reqReturn > 4 ? "mid" : "ok";

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root{
          --bg:#0C0F14; --panel:#141A22; --panel2:#10151D; --line:#232C38;
          --amber:#FFB020; --pos:#3ECF8E; --neg:#F2555A; --txt:#E9E7DF; --muted:#7E8AA0;
        }
        *{box-sizing:border-box}
        .app{min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Sora',system-ui,sans-serif;padding:20px}
        .mono{font-family:'IBM Plex Mono',ui-monospace,monospace}
        .shell{max-width:1100px;margin:0 auto}
        header h1{font-size:22px;font-weight:700;margin:0;letter-spacing:-0.02em}
        header p{color:var(--muted);font-size:13px;margin:6px 0 0}
        .kicker{color:var(--amber);font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;margin-bottom:6px}
        .grid{display:grid;grid-template-columns:300px 1fr;gap:16px;margin-top:20px}
        @media(max-width:820px){.grid{grid-template-columns:1fr}}
        .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px}
        .field-label{display:block;font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
        .field-wrap{display:flex;align-items:center;background:var(--panel2);border:1px solid var(--line);border-radius:7px;margin-bottom:12px}
        .field-wrap:focus-within{border-color:var(--amber)}
        .field-input{flex:1;background:transparent;border:0;outline:0;color:var(--txt);font-family:'IBM Plex Mono',monospace;font-size:14px;padding:9px 10px;width:100%}
        .field-suffix{color:var(--muted);font-size:12px;padding-right:10px;font-family:'IBM Plex Mono',monospace}
        .toggle{display:flex;gap:6px;margin-bottom:4px}
        .toggle button{flex:1;padding:8px;border-radius:7px;border:1px solid var(--line);background:var(--panel2);color:var(--muted);font-size:12px;cursor:pointer;font-family:inherit}
        .toggle button.on{border-color:var(--amber);color:var(--amber);background:rgba(255,176,32,.08)}
        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        @media(max-width:640px){.cards{grid-template-columns:1fr}}
        .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px}
        .card .lbl{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
        .card .val{font-family:'IBM Plex Mono',monospace;font-size:24px;font-weight:600;margin-top:6px}
        .card .sub{font-size:12px;color:var(--muted);margin-top:4px}
        .runway{display:flex;gap:3px;margin-top:16px;align-items:flex-end;height:56px}
        .runway .cell{flex:1;min-width:6px;border-radius:3px 3px 0 0;position:relative}
        .legend{display:flex;gap:14px;font-size:11px;color:var(--muted);margin-top:8px;flex-wrap:wrap}
        .dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;vertical-align:middle}
        table{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12.5px}
        th{color:var(--muted);font-weight:500;text-align:right;padding:8px 10px;border-bottom:1px solid var(--line);font-size:11px;letter-spacing:.04em;white-space:nowrap}
        th:first-child,td:first-child{text-align:left}
        td{text-align:right;padding:7px 10px;border-bottom:1px solid rgba(35,44,56,.5);white-space:nowrap}
        tr:hover td{background:rgba(255,176,32,.04)}
        .pos{color:var(--pos)} .neg{color:var(--neg)} .amb{color:var(--amber)}
        .warn{margin-top:14px;padding:12px 14px;border-radius:8px;font-size:13px;line-height:1.5;border:1px solid}
        .warn.high{border-color:rgba(242,85,90,.4);background:rgba(242,85,90,.07);color:#F5A3A6}
        .warn.mid{border-color:rgba(255,176,32,.4);background:rgba(255,176,32,.06);color:#F0C878}
        .warn.ok{border-color:rgba(62,207,142,.35);background:rgba(62,207,142,.06);color:#9BE3C4}
        .tblwrap{overflow-x:auto;margin-top:16px}
        h2{font-size:14px;margin:0 0 10px;font-weight:600}
      `}</style>

      <div className="shell">
        <header>
          <div className="kicker">Zaman · Para · Getiri</div>
          <h1>Trader Zaman–Para Planlayıcısı</h1>
          <p>Taksitler sermayeden düşer, kalan sermaye hedefe koşar. Zamanı ve gerekli getiriyi birlikte gör.</p>
        </header>

        <div className="grid">
          {/* inputs */}
          <div className="panel">
            <h2>Girdiler</h2>
            <Field label="Mevcut sermaye" suffix="TL" value={capital} onChange={setCapital} step={1000} />
            <Field label="Aylık taksit" suffix="TL" value={installment} onChange={setInstallment} step={100} />
            <Field label="Kalan taksit sayısı" suffix="ay" value={remaining} onChange={setRemaining} step={1} />
            <Field label="Hedef tutar" suffix="TL" value={target} onChange={setTarget} step={5000} />
            <Field label="Beklenen aylık getiri" suffix="%" value={monthlyReturn} onChange={setMonthlyReturn} step={0.5} />
            <Field label="Hedef için süre sınırı" suffix="ay" value={deadline} onChange={setDeadline} step={1} min={1} />
            <span className="field-label">Taksitin kaynağı</span>
            <div className="toggle" role="group" aria-label="Taksitin kaynağı">
              <button className={payFromCapital ? "on" : ""} onClick={() => setPayFromCapital(true)}>Sermayeden</button>
              <button className={!payFromCapital ? "on" : ""} onClick={() => setPayFromCapital(false)}>Gelirden</button>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              Kalan toplam borç: <span className="mono amb">{fmtTL(totalDebt)}</span>
            </p>
          </div>

          {/* readouts */}
          <div>
            <div className="cards">
              <div className="card">
                <div className="lbl">Hedefe ulaşma</div>
                <div className={"val " + (sim.busted ? "neg" : sim.targetMonth ? "pos" : "amb")}>
                  {sim.busted ? "Sermaye bitiyor" : sim.targetMonth ? sim.targetMonth + " ay" : ">" + MAX_MONTHS + " ay"}
                </div>
                <div className="sub">%{monthlyReturn} aylık getiri varsayımıyla</div>
              </div>
              <div className="card">
                <div className="lbl">Gerekli aylık getiri</div>
                <div className={"val " + (riskLevel === "impossible" || riskLevel === "high" ? "neg" : riskLevel === "mid" ? "amb" : "pos")}>
                  {reqReturn === null ? "—" : fmtPct(reqReturn)}
                </div>
                <div className="sub">{deadline} ayda {fmtTL0(target)} hedefi için</div>
              </div>
              <div className="card">
                <div className="lbl">Borç bitişi</div>
                <div className="val amb">{payFromCapital ? (sim.busted && (sim.debtFreeMonth === null) ? "—" : (sim.debtFreeMonth ?? remaining) + ". ay") : remaining + ". ay"}</div>
                <div className="sub">Toplam {fmtTL0(totalDebt)} taksit ödemesi</div>
              </div>
            </div>

            {/* runway strip */}
            <div className="panel" style={{ marginTop: 12 }}>
              <h2>Sermaye pisti</h2>
              <div className="runway" aria-hidden="true">
                {shownRows.map((r) => {
                  const h = Math.max(8, Math.min(56, (r.end / Math.max(target, capital)) * 56));
                  const color = r.end <= 0 ? "var(--neg)" : r.end >= target ? "var(--pos)" : r.end < capital ? "var(--neg)" : "var(--amber)";
                  return <div key={r.m} className="cell" title={`Ay ${r.m}: ${fmtTL0(r.end)}`} style={{ height: h, background: color, opacity: r.debt > 0 ? 0.85 : 1 }} />;
                })}
              </div>
              <div className="legend">
                <span><span className="dot" style={{ background: "var(--neg)" }} />Başlangıcın altında</span>
                <span><span className="dot" style={{ background: "var(--amber)" }} />Büyüyor</span>
                <span><span className="dot" style={{ background: "var(--pos)" }} />Hedefte</span>
              </div>
            </div>

            {/* chart */}
            <div className="panel" style={{ marginTop: 12, height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#232C38" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ay" stroke="#7E8AA0" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
                  <YAxis stroke="#7E8AA0" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} width={70}
                    tickFormatter={(v) => new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(v)} />
                  <Tooltip
                    contentStyle={{ background: "#141A22", border: "1px solid #232C38", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 12 }}
                    labelFormatter={(l) => "Ay " + l}
                    formatter={(v) => fmtTL0(v)}
                  />
                  <ReferenceLine y={target} stroke="#3ECF8E" strokeDasharray="4 4" label={{ value: "Hedef", fill: "#3ECF8E", fontSize: 11, position: "insideTopRight" }} />
                  <ReferenceLine y={capital} stroke="#7E8AA0" strokeDasharray="2 4" label={{ value: "Başlangıç", fill: "#7E8AA0", fontSize: 11, position: "insideBottomRight" }} />
                  <Area type="monotone" dataKey="Net (Sermaye − Borç)" fill="rgba(255,176,32,0.08)" stroke="none" />
                  <Line type="monotone" dataKey="Sermaye" stroke="#FFB020" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Net (Sermaye − Borç)" stroke="#3ECF8E" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* risk note */}
            <div className={"warn " + (riskLevel === "impossible" || riskLevel === "high" ? "high" : riskLevel)}>
              {riskLevel === "impossible" &&
                "Bu süre sınırı içinde hedefe hiçbir makul getiriyle ulaşılamıyor. Süreyi uzat, hedefi düşür veya taksiti gelirden öde."}
              {riskLevel === "high" &&
                `Hedef için gereken aylık ${fmtPct(reqReturn)} getiri, sürdürülebilir profesyonel standartların çok üzerinde. Bu tempo yüksek kaldıraç ve yüksek iflas riski demektir.`}
              {riskLevel === "mid" &&
                `Gereken aylık ${fmtPct(reqReturn)} getiri iddialı ama imkânsız değil. İşlem başına riski %1–2 bandında tutmadan bu tempoyu kovalamak sermayeyi tehlikeye atar.`}
              {riskLevel === "ok" &&
                `Gereken aylık ${fmtPct(reqReturn)} getiri makul bir hedef. Disiplinli risk yönetimiyle (işlem başına %1–2) ulaşılabilir görünüyor.`}
            </div>
          </div>
        </div>

        {/* table */}
        <div className="panel tblwrap" style={{ marginTop: 16 }}>
          <h2>Ay ay dökümü {sim.targetMonth ? "" : "(ilk 36 ay)"}</h2>
          <table>
            <thead>
              <tr>
                <th>Ay</th><th>Ay Başı</th><th>Taksit</th><th>Taksit Sonrası</th>
                <th>Kâr (%{monthlyReturn})</th><th>Ay Sonu</th><th>Kalan Borç</th><th>Net Değer</th>
              </tr>
            </thead>
            <tbody>
              {shownRows.map((r) => (
                <tr key={r.m}>
                  <td>{r.m}</td>
                  <td>{fmtTL(r.start)}</td>
                  <td className={r.taksit > 0 ? "neg" : ""}>{r.taksit > 0 ? "−" + fmtTL(r.taksit) : "—"}</td>
                  <td>{fmtTL(r.after)}</td>
                  <td className="pos">+{fmtTL(r.profit)}</td>
                  <td className={r.end >= target ? "pos" : r.end < capital ? "neg" : "amb"}>{fmtTL(r.end)}</td>
                  <td>{r.debt > 0 ? fmtTL(r.debt) : "0,00 TL"}</td>
                  <td className={r.net >= 0 ? "pos" : "neg"}>{fmtTL(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sim.busted && (
            <div className="warn high" style={{ marginTop: 12 }}>
              {sim.busted}. ayda taksit ödenince sermaye sıfırın altına düşüyor. Bu senaryoda plan matematiksel olarak çöküyor.
            </div>
          )}
        </div>

        <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
          Bu araç bir planlama simülasyonudur; yatırım tavsiyesi değildir. Getiriler sabit varsayılmıştır — gerçek trading getirileri
          dalgalıdır ve ardışık kayıp ayları burada görünenden çok daha ağır sonuç doğurur.
        </p>
      </div>
    </div>
  );
}
