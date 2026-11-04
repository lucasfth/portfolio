const finite = value => typeof value === 'number' && Number.isFinite(value);
export function validFinancePayload(p) {
  return Boolean(p && p.schemaVersion === 1 && p.currency === 'DKK' && typeof p.generatedAt === 'string' && finite(p.total) &&
    p.nordea && finite(p.nordea.balance) && Array.isArray(p.nordea.accounts) && p.nordea.accounts.every(a => a && typeof a.name === 'string' && finite(a.balance) && typeof a.source === 'string') &&
    p.saxo && finite(p.saxo.total) && finite(p.saxo.investments) && finite(p.saxo.cash) && typeof p.saxo.asOf === 'string' && Array.isArray(p.limitations) && p.limitations.every(x => typeof x === 'string'));
}
export function supportedHistory(history) {
  return (Array.isArray(history) ? history : []).filter(p => p && p.kind === 'valuation_snapshot' && typeof p.asOf === 'string' && Number.isFinite(Date.parse(p.asOf)) && finite(p.total) && finite(p.cash) && finite(p.investments)).sort((a,b) => Date.parse(a.asOf)-Date.parse(b.asOf));
}
/** Month-end contributions; annual effective return, annual proportional fee, constant inflation. */
export function projectScenario({start, monthly, years, annualReturn, inflation, fees}) {
  if (![start,monthly,years,annualReturn,inflation,fees].every(finite) || start < 0 || monthly < 0 || years < 1 || years > 60 || !Number.isInteger(years) || annualReturn <= -100 || annualReturn > 100 || inflation <= -100 || inflation > 100 || fees < 0 || fees >= 100) throw new RangeError('Invalid scenario assumptions');
  const monthlyRate = ((1+annualReturn/100)*(1-fees/100))**(1/12);
  let value = start;
  const rows = [{year:0,value,real:value,added:start}];
  for(let month=1;month<=years*12;month++) {
    value = value*monthlyRate+monthly;
    if(month%12===0) rows.push({year:month/12,value,real:value/(1+inflation/100)**(month/12),added:start+monthly*month});
  }
  return rows;
}
export function financeFailure(error) {
  const message=error instanceof Error ? error.message : '';
  if (/HTTP 401/.test(message)) return 'Session rejected. Sign in again, then retry the finance read.';
  if (/HTTP 403/.test(message)) return 'Admin permission denied. Check the finance service’s Supabase admin policy; do not share or paste a token.';
  if (/HTTP 429/.test(message)) return 'Finance service is busy. Wait before retrying; the previous report is retained.';
  if (/HTTP 5\d\d/.test(message)) return 'Finance service failed. Open the report endpoint to check reachability, then inspect the local sync health.';
  if (/format/.test(message)) return 'Finance report format is unsupported. Check the backend report version.';
  return 'Browser/network request did not complete. Confirm this device is on the tailnet and the report endpoint opens. Direct navigation should say authentication required. Then check browser local-network permissions, bearer/session rejection and response CORS—not preflight alone.';
}
export function cronFailure(error) {
  const message = error instanceof Error ? error.message : '';
  if (/HTTP 401/.test(message)) return 'Session rejected. Sign in again, then retry the cron status read.';
  if (/HTTP 403/.test(message)) return 'Cron admin permission denied. Check the service authorization policy.';
  if (/HTTP 429/.test(message)) return 'Cron status service is busy. Wait before retrying.';
  if (/HTTP 5\d\d/.test(message)) return 'Cron status service failed. Inspect the local scheduler status endpoint; previous job observations are retained.';
  if (/format/.test(message)) return 'Cron status format is unsupported. Check the backend status version.';
  return 'Cron status network request failed. Check tailnet reachability, browser local-network permissions and the current session.';
}

const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
function datedSeries(rows, field, allowNegative = true) {
  if (!Array.isArray(rows)) return null;
  const result = new Map();
  for (const row of rows) {
    if (!row || !day(row.date) || !finite(row[field]) || (!allowNegative && row[field] <= 0) || result.has(row.date)) return null;
    result.set(row.date, row[field]);
  }
  return result;
}
export function matchedComparison(performance, benchmark) {
  if (performance?.status !== 'available' || performance.method !== 'provider_time_weighted' || performance.currency !== 'DKK' || performance.returnUnit !== 'fraction' || benchmark?.currency !== 'DKK' || benchmark.returnType !== 'total_return') return [];
  const portfolio = datedSeries(performance.series, 'value');
  const index = datedSeries(benchmark.points, 'level', false);
  if (!portfolio || !index || [...portfolio.values()].some(x => x <= -1)) return [];
  const dates = [...portfolio.keys()].filter(date => index.has(date)).sort();
  if (dates.length < 2) return [];
  const first = dates[0];
  return dates.map(date => ({date, portfolio: ((1+portfolio.get(date))/(1+portfolio.get(first))-1)*100, benchmark:(index.get(date)/index.get(first)-1)*100}));
}
/** Disabled unless the producer explicitly proves the complete flow interval, including transfers. */
export function cashflowHistory(performance) {
  if (performance?.status !== 'available' || performance.currency !== 'DKK' || performance.cashFlowsComplete !== true || !day(performance.from) || !day(performance.through)) return [];
  const accounts = datedSeries(performance.accountValues, 'value');
  if (!accounts || !accounts.has(performance.from) || !accounts.has(performance.through)) return [];
  const flows = [];
  for (const list of [performance.cashFlows, performance.securityTransfers]) {
    if (!Array.isArray(list)) return [];
    for (const row of list) {
      if (!row || !day(row.date) || !finite(row.value) || row.date < performance.from || row.date > performance.through) return [];
      flows.push(row);
    }
  }
  const opening = accounts.get(performance.from);
  return [...accounts.keys()].filter(date => date >= performance.from && date <= performance.through).sort().map(date => {
    const added = opening + flows.filter(row => row.date > performance.from && row.date <= date).reduce((sum,row) => sum+row.value, 0);
    return {date, value:accounts.get(date), added, gain:accounts.get(date)-added};
  });
}

const strings = value => Array.isArray(value) ? value.filter(x => typeof x === 'string') : [];
export function financeExtensions(payload) {
  if (!payload) return null;
  const clean = {...payload};
  if (clean.estimate && (!finite(clean.estimate.total) || !finite(clean.estimate.additionalSavings) || clean.estimate.currency !== 'DKK' || !Array.isArray(clean.estimate.assumptions))) delete clean.estimate;
  else if (clean.estimate) clean.estimate = {...clean.estimate, assumptions:strings(clean.estimate.assumptions)};
  if (clean.investments) {
    const p=clean.investments;
    const performance=p.performance && typeof p.performance === 'object' ? {...p.performance,limitations:strings(p.performance.limitations)} : undefined;
    clean.investments={...p,holdings:Array.isArray(p.holdings)?p.holdings.filter(h=>h && typeof h.name==='string' && typeof h.assetType==='string' && typeof h.currency==='string' && (h.value===null || finite(h.value))):[],allocation:Array.isArray(p.allocation)?p.allocation.filter(a=>a && typeof a.assetType==='string' && (a.value===null || finite(a.value)) && (a.percent===null || finite(a.percent))):[],history:supportedHistory(p.history),performance,limitations:strings(p.limitations)};
  }
  if (clean.benchmarks) clean.benchmarks={...clean.benchmarks,series:Array.isArray(clean.benchmarks.series)?clean.benchmarks.series.filter(b=>b && typeof b.id==='string' && typeof b.name==='string' && b.currency==='DKK' && b.returnType==='total_return' && Array.isArray(b.points)).map(b=>({...b,limitations:strings(b.limitations)})):[],limitations:strings(clean.benchmarks.limitations)};
  if (clean.peers) clean.peers={...clean.peers,limitations:strings(clean.peers.limitations)};
  return clean;
}
