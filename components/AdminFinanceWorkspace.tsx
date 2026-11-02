"use client";

import { useState, type ReactNode } from "react";
import { projectScenario, supportedHistory, matchedComparison, cashflowHistory, financeExtensions, type FinancePayload, type ScenarioAssumptions } from "@/lib/admin/finance.mjs";

const money = (value: number) => value.toLocaleString("en-GB", { style: "currency", currency: "DKK", maximumFractionDigits: 0 });
const date = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Europe/Copenhagen", dateStyle: "medium", timeStyle: "short" });
const tabs = ["Overview", "Investments", "Future", "Danish comparison"] as const;
function Notice({ children }: { children: ReactNode }) { return <p className="border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted-foreground">{children}</p>; }

export function Investments({ finance }: { finance: FinancePayload | null }) {
  finance = financeExtensions(finance);
  const investment = finance?.investments;
  const holdings = investment?.holdings?.filter(h => h && typeof h.name === "string" && Number.isFinite(h.value)) ?? [];
  const allocation = investment?.allocation?.filter(a => a && typeof a.assetType === "string" && Number.isFinite(a.value) && Number.isFinite(a.percent)) ?? [];
  const history = supportedHistory(investment?.history);
  return <div className="space-y-6">
    <header><h2 className="text-xl font-medium">Investments</h2><p className="mt-2 text-sm text-muted-foreground">Saxo holdings in client-base DKK. Instrument currencies are shown separately. {investment?.asOf ? `Source ${date(investment.asOf)} · Copenhagen time.` : "Waiting for a verified valuation."}</p></header>
    {finance ? <dl className="grid gap-4 border-y border-border py-5 sm:grid-cols-3">{[["Invested", finance.saxo.investments], ["Broker cash", finance.saxo.cash], ["Broker total", finance.saxo.total]].map(([label,value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl tabular-nums">{money(value as number)}</dd></div>)}</dl> : <Notice>Read the finance report from Overview first. No example balances are used.</Notice>}
    {allocation.length ? <section><h3 className="mb-3 font-medium">Allocation · investments only</h3><ul className="space-y-3">{allocation.map((a,i) => <li key={i}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{a.assetType}</span><span className="tabular-nums">{money(a.value)} · {a.percent.toFixed(1)}%</span></div><meter aria-label={`${a.assetType} allocation`} className="block h-2 w-full accent-accent" min={0} max={100} value={Math.max(0, Math.min(100, a.percent))}>{a.percent}%</meter></li>)}</ul></section> : null}
    <section><h3 className="mb-3 font-medium">Holdings</h3>{holdings.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Verified Saxo holdings, valuation in DKK</caption><thead className="border-b border-border text-xs text-muted-foreground"><tr><th scope="col" className="py-3 pr-4">Holding</th><th scope="col" className="p-3">Instrument currency</th><th scope="col" className="p-3 text-right">Quantity</th><th scope="col" className="py-3 pl-3 text-right">Value · DKK</th></tr></thead><tbody>{holdings.map((h,i) => <tr key={i} className="border-b border-border"><th scope="row" className="py-4 pr-4 font-normal">{h.name}<span className="mt-1 block text-xs text-muted-foreground">{h.assetType}</span></th><td className="p-3">{h.currency}</td><td className="p-3 text-right tabular-nums">{Number.isFinite(h.quantity) ? h.quantity!.toLocaleString("en-GB") : "Not provided"}</td><td className="py-4 pl-3 text-right tabular-nums">{money(h.value)}</td></tr>)}</tbody></table></div> : <Notice>No verified holdings loaded. A broker subtotal is not holding-level coverage.</Notice>}</section>
    <section><h3 className="mb-3 font-medium">Observed portfolio value</h3>{history.length >= 2 ? <ValueChart rows={history.map(p => ({ asOf:p.asOf, label: date(p.asOf), value: p.total }))} /> : <Notice>{history.length ? "One verified observation. A trend needs at least two dated observations." : "No dated valuation history available."} Money added versus returns requires complete cashflow history; snapshots alone cannot establish returns.</Notice>}{history.length >= 2 ? <p className="mt-3 text-xs text-muted-foreground">Actual valuation snapshots, not investment returns. Deposits, withdrawals and market changes are not separated.</p> : null}</section>
    <PerformanceComparison finance={finance} />
    {investment?.limitations?.length ? <details><summary className="cursor-pointer text-sm">Valuation coverage and limitations</summary><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{investment.limitations.map((note,i)=><li key={i}>{note}</li>)}</ul></details> : null}
  </div>;
}

export function ValueChart({ rows }: { rows: {asOf:string;label:string;value:number}[] }) {
  // Duplicate instants retain the last supplied observation; never invent cadence.
  const observations=[...new Map(rows.filter(p=>Number.isFinite(Date.parse(p.asOf)) && Number.isFinite(p.value)).map(p=>[Date.parse(p.asOf),p])).values()].sort((a,b)=>Date.parse(a.asOf)-Date.parse(b.asOf));
  if(observations.length<2) return <Notice>A trend needs at least two distinct valid observation times.</Notice>;
  return <div className="space-y-3">
    <ComparisonChart label="Observed valuation" unit="DKK" first={observations[0].label} last={observations.at(-1)!.label} series={[{label:'Account value',points:observations.map(p=>({x:Date.parse(p.asOf),value:p.value}))}]} />
    <p className="text-xs text-muted-foreground">X axis: elapsed time. Duplicate timestamps retain the last supplied observation.</p>
    <details><summary className="cursor-pointer text-xs text-muted-foreground">Read valuation observations</summary><div className="overflow-x-auto"><table className="mt-3 w-full text-sm"><caption className="sr-only">Observed valuations · DKK</caption><thead><tr><th scope="col" className="text-left">Copenhagen time</th><th scope="col" className="text-right">DKK</th></tr></thead><tbody>{observations.map(p=><tr key={p.asOf}><th scope="row" className="py-2 text-left font-normal">{p.label}</th><td className="text-right tabular-nums">{money(p.value)}</td></tr>)}</tbody></table></div></details>
  </div>;
}

type ChartSeries = {label:string;points:{x:number;value:number}[]};
function ComparisonChart({label,series,first,last,unit}:{label:string;series:ChartSeries[];first:string;last:string;unit:'DKK'|'%'}) {
  const values=series.flatMap(s=>s.points.map(p=>p.value));
  const min=Math.min(0,...values), max=Math.max(0,...values), span=max-min||1;
  const xs=series.flatMap(s=>s.points.map(p=>p.x)), from=Math.min(...xs), duration=Math.max(...xs)-from||1;
  const strokes=['var(--color-accent)','currentColor','currentColor'];
  const dashes=[undefined,'7 4','2 4'];
  const format=(value:number)=>unit==='DKK'?money(value):`${value.toFixed(1)}%`;
  return <figure className="space-y-3"><figcaption className="text-sm font-medium">{label}</figcaption>
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs">{series.map((s,i)=><li key={s.label} className="flex items-center gap-2"><svg aria-hidden="true" width="24" height="8"><path d="M0 4H24" stroke={strokes[i]} strokeWidth="2" strokeDasharray={dashes[i]} /></svg>{s.label}</li>)}</ul>
    <div className="overflow-x-auto"><svg viewBox="0 0 720 250" className="w-full min-w-[560px]" role="img" aria-label={`${label}; ${unit}. ${first} to ${last}. Full figures in tables below.`}>
      <path d="M112 30V190H680" fill="none" stroke="currentColor" opacity=".35" />
      <path d={`M112 ${190-(0-min)/span*150}H680`} stroke="currentColor" opacity=".2" />
      <text x="104" y="44" textAnchor="end" fill="currentColor" fontSize="12">{format(max)}</text><text x="104" y="194" textAnchor="end" fill="currentColor" fontSize="12">{format(min)}</text>
      {series.map((s,i)=><polyline key={s.label} aria-label={s.label} points={s.points.map(p=>`${112+(p.x-from)/duration*568},${190-(p.value-min)/span*150}`).join(' ')} fill="none" stroke={strokes[i]} strokeWidth="2" strokeDasharray={dashes[i]} />)}
      <text x="112" y="223" fill="currentColor" fontSize="12">{first}</text><text x="680" y="243" textAnchor="end" fill="currentColor" fontSize="12">{last}</text>
    </svg></div></figure>;
}

export function Future({ startingCapital }: { startingCapital: number | null }) {
  const [inputs, setInputs] = useState({monthly:"3000",years:"20",inflation:"2",fees:"0.25",conservative:"2",base:"5",optimistic:"8"});
  const [customStart,setCustomStart] = useState<string | null>(null);
  const start = customStart ?? (startingCapital === null ? "" : String(startingCapital));
  const scenarios = ([['conservative','Conservative'],['base','Base'],['optimistic','Optimistic']] as const).map(([key,label]) => {
    const assumptions: ScenarioAssumptions = {start:Number(start),monthly:Number(inputs.monthly),years:Number(inputs.years),inflation:Number(inputs.inflation),fees:Number(inputs.fees),annualReturn:Number(inputs[key])};
    let rows: ReturnType<typeof projectScenario> = [];
    try { if(start.trim() && Object.values(inputs).every(v=>v.trim())) rows=projectScenario(assumptions); } catch { /* Visible validation, no silent correction. */ }
    return {key,label,rows};
  });
  const valid = scenarios.every(scenario=>scenario.rows.length>0);
  return <div className="space-y-6"><header><h2 className="text-xl font-medium">Future · scenario, not forecast</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Compare three constant-return assumptions on the same capital, additions and horizon. Names describe editable assumptions, not probabilities or guaranteed ordering. No prediction or confidence interval. Starting capital defaults to tracked assets, excluding unknown debt and pension. Nothing here is saved or sent.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="space-y-2 text-sm"><span className="block">Starting capital · DKK</span><input type="number" min="0" step="100" value={start} onChange={e=>setCustomStart(e.target.value)} className="w-full border border-border bg-background p-3" /></label>{([['monthly','Monthly addition · DKK',0,1000000,100],['years','Horizon · years',1,60,1],['inflation','Annual inflation · %',-99,100,0.5],['fees','Annual fee · %',0,99,0.05],['conservative','Conservative annual return · %',-99,100,0.5],['base','Base annual return · %',-99,100,0.5],['optimistic','Optimistic annual return · %',-99,100,0.5]] as const).map(([key,label,min,max,step])=><label key={key} className="space-y-2 text-sm"><span className="block">{label}</span><input type="number" value={inputs[key]} min={min} max={max} step={step} onChange={e=>setInputs(p=>({...p,[key]:e.target.value}))} className="w-full border border-border bg-background p-3" /></label>)}</div>
    {valid ? <>
      <div className="grid gap-5 border-y border-border py-5 sm:grid-cols-3">{scenarios.map(({key,label,rows})=>{const end=rows.at(-1)!;return <article key={key} aria-label={`${label} scenario`} className="min-w-0"><h3 className="font-medium">{label}</h3><p className="mt-1 text-xs text-muted-foreground">{inputs[key]}% annual return assumption</p><dl className="mt-3 space-y-3">{[["Nominal value",end.value],["Today’s purchasing power",end.real],["Capital + additions",end.added]].map(([name,value])=><div key={name}><dt className="text-xs text-muted-foreground">{name}</dt><dd className="mt-1 text-lg tabular-nums">{money(value as number)}</dd></div>)}</dl></article>;})}</div>
      <ComparisonChart label="Scenario comparison · nominal value" unit="DKK" first="Year 0" last={`Year ${inputs.years}`} series={scenarios.map(s=>({label:s.label,points:s.rows.map(p=>({x:p.year,value:p.value}))}))} />
      {scenarios.map(({key,label,rows})=><details key={key}><summary className="cursor-pointer text-sm">Read {label.toLowerCase()} scenario path</summary><div className="overflow-x-auto"><table className="mt-3 w-full text-sm"><caption className="mb-3 text-left text-muted-foreground">{label} constant-return scenario · DKK</caption><thead className="border-b border-border"><tr>{["Year","Capital + additions","Modelled gain/loss","Nominal value","Today’s money"].map(x=><th key={x} scope="col" className="p-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{rows.map(p=><tr key={p.year} className="border-b border-border tabular-nums"><th scope="row" className="p-3 text-left font-normal">{p.year}</th>{[p.added,p.value-p.added,p.value,p.real].map((v,i)=><td key={i} className="p-3 text-right">{money(v)}</td>)}</tr>)}</tbody></table></div></details>)}
    </> : <p role="status" className="text-sm">Enter valid finite assumptions: non-negative capital and additions, 1–60 whole years, return and inflation above −100% and at most 100%, fees 0–99%.</p>}
    <Notice>Monthly additions are made at month end. Annual effective returns compound monthly; the annual proportional fee reduces growth, and inflation discounts the final value. Additions stay fixed in nominal DKK. Taxes, investment restrictions, changing returns and personal circumstances are not modelled. Negative real outcomes are possible.</Notice>
  </div>;
}

export default function AdminFinanceWorkspace({finance, overview}: {finance:FinancePayload|null;overview:ReactNode}) {
  const [tab,setTab]=useState<typeof tabs[number]>("Overview");
  return <section aria-label="Personal finance" className="mb-6 min-w-0"><nav aria-label="Finance views" className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">{tabs.map(label=><button key={label} type="button" aria-pressed={tab===label} onClick={()=>setTab(label)} className={`min-h-11 px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${tab===label?'bg-accent/10 text-accent':'text-muted-foreground hover:text-foreground'}`}>{label}</button>)}</nav>{tab==='Overview'?overview:<div className="border border-border bg-card p-5 sm:p-7">{tab==='Investments'?<Investments finance={finance}/>:tab==='Future'?<Future startingCapital={finance?.total??null}/>:<DanishComparison finance={finance}/>}</div>}</section>;
}

export function DanishComparison({finance}:{finance:FinancePayload|null}) {
  finance = financeExtensions(finance);
  const [age,setAge]=useState("");
  const [sex,setSex]=useState("");
  const [wealth,setWealth]=useState("FGNF2020");
  const peers=finance?.peers;
  const ready=peers?.status==='available' && peers.currency==='DKK' && peers.unit==='nominal_DKK' && peers.statistic==='median' && Array.isArray(peers.rows) && [peers.ageGroups,peers.sexGroups,peers.wealthTypes].every(options=>Array.isArray(options) && options.every(option=>option && typeof option.id==='string' && typeof option.text==='string'));
  const selectedWealth=ready && peers.wealthTypes.some(type=>type.id===wealth) ? wealth : ready ? peers.wealthTypes[0]?.id??'' : '';
  const rows=ready && age && sex ? peers.rows.filter(row=>row && row.age===age && row.sex===sex && row.wealthType===selectedWealth && Number.isInteger(row.year) && row.year>=2014 && Number.isFinite(row.median)).sort((a,b)=>a.year-b.year) : [];
  return <div className="space-y-5"><h2 className="text-xl font-medium">Danish comparison</h2><Notice>Official Statistics Denmark published cohorts only. Known assets are not comparable net worth: liabilities and pension are incomplete. No percentile, relative ranking or personal cohort is inferred.</Notice>
    {ready ? <><div className="grid gap-4 sm:grid-cols-3">{([{label:'Age group',value:age,set:setAge,options:peers.ageGroups},{label:'Sex cohort',value:sex,set:setSex,options:peers.sexGroups},{label:'Wealth definition',value:selectedWealth,set:setWealth,options:peers.wealthTypes}]).map(field=><label key={field.label} className="space-y-2 text-sm"><span className="block">{field.label}</span><select value={field.value} onChange={e=>field.set(e.target.value)} className="w-full border border-border bg-background p-3"><option value="">Select {field.label.toLowerCase()}</option>{field.options.map(option=><option key={option.id} value={option.id}>{option.text}</option>)}</select></label>)}</div><p className="text-sm text-muted-foreground">Population: {peers.population}. Median · nominal DKK · period {peers.asOf}. Published {peers.publishedAt}. Cohorts are public context, not a matched measurement of your assets.</p>
    {!age||!sex ? <p role="status" className="text-sm">Choose both age and sex cohort to read the published median. Nothing is selected from your identity.</p> : rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="mb-3 text-left">{peers.wealthTypes.find(type=>type.id===selectedWealth)?.text} · published cohort median</caption><thead><tr><th scope="col" className="p-3 text-left">Period</th><th scope="col" className="p-3 text-right">Median · nominal DKK</th></tr></thead><tbody>{rows.map(row=><tr key={row.year} className="border-t border-border"><th scope="row" className="p-3 text-left font-normal">{row.year}</th><td className="p-3 text-right tabular-nums">{money(row.median!)}</td></tr>)}</tbody></table></div> : <p role="status" className="text-sm">No published median is available for this selection.</p>}</> : <p className="text-sm text-muted-foreground">Official cohort observations are not loaded. No estimated median is substituted.</p>}
    <Notice>Net wealth uses the selected official definition, including debt and pension adjustments; bank deposits and financial assets use different definitions. Cohort medians cannot be added to construct a median total. Nominal historical amounts are not inflation-adjusted. Entire-population data avoids selecting only wealth holders. A 2023–2024 property-value series break affects real-asset and net-wealth comparisons.</Notice>
    {peers?.limitations?.map((note,i)=><p key={i} className="text-sm text-muted-foreground">{note}</p>)}<a href="https://www.statistikbanken.dk/FORMUE11" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-accent underline">Statistics Denmark · FORMUE11</a></div>;
}

function PerformanceComparison({finance}:{finance:FinancePayload|null}) {
  finance = financeExtensions(finance);
  const performance=finance?.investments?.performance;
  const flows=cashflowHistory(performance);
  const series=finance?.benchmarks?.series??[];
  return <section className="space-y-4"><h3 className="font-medium">Performance and matched benchmarks</h3>
    {flows.length>=2 ? <>
      <ComparisonChart label="Capital, gain/loss and account value" unit="DKK" first={flows[0].date} last={flows.at(-1)!.date} series={([['added','Capital + net additions'],['gain','Gain/loss'],['value','Account value']] as const).map(([key,label])=>({label,points:flows.map(row=>({x:Date.parse(row.date),value:row[key]}))}))} />
      <p className="text-xs text-muted-foreground">Elapsed calendar time. Opening account value is starting capital, not lifetime contributions. Gain/loss is interval value minus capital and net additions, not a rate of return.</p>
      <details><summary className="cursor-pointer text-sm">Read account values and complete cashflows</summary><div className="overflow-x-auto"><table className="mt-3 w-full text-sm"><caption className="mb-3 text-left">Verified account values and complete cashflows · DKK</caption><thead><tr>{['Date','Capital + net additions','Gain/loss','Account value'].map(label=><th key={label} scope="col" className="p-2 text-right first:text-left">{label}</th>)}</tr></thead><tbody>{flows.map(row=><tr key={row.date} className="border-t border-border"><th scope="row" className="p-2 text-left font-normal">{row.date}</th>{[row.added,row.gain,row.value].map((value,i)=><td key={i} className="p-2 text-right tabular-nums">{money(value)}</td>)}</tr>)}</tbody></table></div></details>
    </> : <Notice>Money added versus returns needs complete dated cashflows and transfers across the account-value interval. Valuation snapshots alone do not establish it.</Notice>}
    {series.map(benchmark=>{const rows=matchedComparison(performance,benchmark);return <article key={benchmark.id} className="space-y-3 border-t border-border pt-4"><h4 className="font-medium">{benchmark.name} · DKK total return</h4>{rows.length>=2 ? <>
      <p className="text-xs text-muted-foreground">{rows[0].date} to {rows.at(-1)!.date} · common dates only, both rebased at the first common date. Portfolio: provider time-weighted return. X axis: elapsed calendar time.</p>
      <ComparisonChart label={`Matched total returns · ${benchmark.name}`} unit="%" first={rows[0].date} last={rows.at(-1)!.date} series={([['portfolio','Portfolio'],['benchmark',benchmark.name]] as const).map(([key,label])=>({label,points:rows.map(row=>({x:Date.parse(row.date),value:row[key]}))}))} />
      <details><summary className="cursor-pointer text-sm">Read matched return observations</summary><div className="overflow-x-auto"><table className="mt-3 w-full text-sm"><caption className="sr-only">Matched dates, portfolio and benchmark total returns rebased to zero · %</caption><thead><tr><th scope="col" className="p-2 text-left">Date</th><th scope="col" className="p-2 text-right">Portfolio · %</th><th scope="col" className="p-2 text-right">Benchmark · %</th></tr></thead><tbody>{rows.map(row=><tr key={row.date} className="border-t border-border"><th scope="row" className="p-2 text-left font-normal">{row.date}</th><td className="p-2 text-right tabular-nums">{row.portfolio.toFixed(2)}</td><td className="p-2 text-right tabular-nums">{row.benchmark.toFixed(2)}</td></tr>)}</tbody></table></div></details>
    </> : <p className="text-sm text-muted-foreground">No verified overlapping portfolio time-weighted return and benchmark dates. No comparison inferred.</p>}<p className="text-xs leading-relaxed text-muted-foreground">Source: {benchmark.source}. Dividends: {benchmark.dividendTreatment}. FX: {benchmark.fxTreatment}.</p>{benchmark.limitations.map((note,i)=><p key={i} className="text-xs text-muted-foreground">{note}</p>)}</article>})}
    {!series.length ? <Notice>S&amp;P 500 total-return and global-equity total-return DKK data are not loaded. Price-only series are never substituted. An ETF proxy must be identified as a proxy, not an official index.</Notice> : null}
    {[...(performance?.limitations??[]),...(finance?.benchmarks?.limitations??[])].map((note,i)=><p key={i} className="text-sm text-muted-foreground">{note}</p>)}
  </section>;
}
