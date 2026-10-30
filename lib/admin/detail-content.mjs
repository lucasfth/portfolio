import { cronJobDetail } from './detail-dialog.mjs';

const unknown = 'Unknown';
const number = (value, suffix = '') => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}${suffix}` : unknown;
const value = input => typeof input === 'string' && input.trim() ? input : unknown;
const money = (amount, currency) => number(amount, currency ? ` ${currency}` : ' (currency unknown)');
const date = input => {
  if (typeof input !== 'string' || !input) return unknown;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? unknown : `${parsed.toLocaleString('en-GB', { timeZone: 'Europe/Copenhagen', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Copenhagen time`;
};
const yesNo = input => typeof input === 'boolean' ? input ? 'Yes' : 'No' : unknown;
const section = (title, fields = [], notes = []) => ({ title, fields, notes });
const freshness = error => error ? [`Refresh unavailable (${error}); showing last available data.`] : [];

export function stockDetail(stock, error) {
  return {
    title: `${value(stock.symbol)} — ${value(stock.name)}`,
    subtitle: 'Market · Yahoo Finance · not a live trading feed',
    sections: [section('Quote', [
      ['Last price', money(stock.price, stock.currency)], ['Change vs previous close', number(stock.changePct, '%')],
      ['Previous close', money(stock.prevClose, stock.currency)], ['Market timestamp', date(stock.at)],
    ], freshness(error))],
    history: (Array.isArray(stock.closes) ? stock.closes : []).filter(item => typeof item === 'number' && Number.isFinite(item)).slice(-5),
    historyCurrency: value(stock.currency),
    historyNote: 'Recent daily closes, oldest to newest. Individual dates are not supplied by this source payload; spacing represents observations, not elapsed time.',
  };
}

export function weatherDetail(weather, error) {
  const current = weather.current ?? {};
  const today = weather.today ?? {};
  return { title: 'Copenhagen weather', subtitle: `wttr.in · fetched ${date(weather.updated)}`, sections: [
    section('Current conditions', [
      ['Conditions', value(current.desc)], ['Temperature', number(current.temp, '°C')], ['Feels like', number(current.feels, '°C')],
      ['Wind', number(current.wind, ' km/h')], ['Precipitation', number(current.precip, ' mm')],
      ['Cycling conditions suitable', yesNo(current.bike)], ['Waterproof layer recommended', yesNo(current.waterproof)],
    ], freshness(error)),
    section('Today’s forecast', [
      ['Low / high', `${number(today.mint, '°C')} / ${number(today.max, '°C')}`], ['UV index', number(today.uv)],
      ['Sunrise (Copenhagen local)', value(today.sunrise)], ['Sunset (Copenhagen local)', value(today.sunset)],
      ['Wet forecast intervals', number(today.precipHours)],
    ], ['Wet forecast intervals count source forecast slots with rain, not hours of rainfall. Cycling advice uses temperature >5°C, wind <25 km/h and no current rain.']),
  ] };
}

export function financeDetail(finance, error) {
  const bank = finance.nordea ?? {};
  const saxo = finance.saxo ?? {};
  const sections = [section('Supported balances', [
    ['Supported subtotal', money(finance.total, finance.currency)], ['Nordea', money(bank.balance, finance.currency)], ['Saxo', money(saxo.total, finance.currency)],
    ['Report generated', date(finance.generatedAt)], ['Mixed source dates', yesNo(finance.mixedDates)], ['Simulated data included', yesNo(finance.simIncluded)],
  ], ['Partial assets only; this is not net worth.', ...freshness(error)]),
  section('Nordea accounts', [['Connection status', value(bank.status)], ['Last sync', date(bank.lastSync)]], (bank.accounts ?? []).length ? [] : ['No account breakdown supplied.'])];
  for (const account of bank.accounts ?? []) sections.push(section(value(account.name), [
    ['Balance', money(account.balance, finance.currency)], ['Source', value(account.source)], ['Source date', date(account.lastSync)], ['Bank status', value(account.bankStatus)],
  ]));
  sections.push(section('Saxo statement', [
    ['Investments', money(saxo.investments, finance.currency)], ['Cash', money(saxo.cash, finance.currency)],
    ['Source date', date(saxo.asOf)], ['Mode', value(saxo.mode)], ['Live sync', yesNo(saxo.liveSync)],
  ], ['Manual statement snapshot; not a live account balance.']));
  if (finance.estimate) sections.push(section('Historical estimate — not net worth', [
    ['Estimated known assets', money(finance.estimate.total, finance.estimate.currency)], ['Assumed additional savings', money(finance.estimate.additionalSavings, finance.estimate.currency)], ['As of', date(finance.estimate.asOf)],
  ], finance.estimate.assumptions ?? []));
  if (finance.syncHealth) sections.push(section('Bank sync health', [
    ['Status', value(finance.syncHealth.status)], ['Last attempt', date(finance.syncHealth.lastAttempt)], ['Last success', date(finance.syncHealth.lastSuccess)],
  ]));
  if (finance.limitations?.length) sections.push(section('Coverage and limitations', [], finance.limitations));
  return { title: 'Finance breakdown', subtitle: 'Private source snapshot · account and statement dates may differ', sections };
}

export function scheduledJobDetail(job, limitations = []) {
  const safe = cronJobDetail(job);
  return { title: value(safe.name), subtitle: `Scheduler · ${value(safe.kind)}`, sections: [
    section('Run status', [['Status', value(safe.status)], ['Schedule', safe.enabled ? 'Enabled' : 'Paused'], ['Last run', date(safe.lastRun)], ['Next run', date(safe.nextRun)]], [value(safe.summary)]),
    section('Safe reference', [['Reference type', value(safe.referenceType)], ['Reference', value(safe.reference)]], safe.detailsWithheld ? ['Additional details are withheld for safety.'] : []),
    ...(limitations.length ? [section('Source limitations', [], limitations)] : []),
  ] };
}
