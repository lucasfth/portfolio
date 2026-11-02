import test from 'node:test';
import assert from 'node:assert/strict';
import { projectScenario, financeFailure, cronFailure, validFinancePayload, supportedHistory, matchedComparison, cashflowHistory } from '../lib/admin/finance.mjs';

const report = {schemaVersion:1,currency:'DKK',generatedAt:'2026-11-02T10:00:00Z',total:1000,nordea:{balance:600,accounts:[]},saxo:{total:400,investments:350,cash:50,asOf:'2026-11-02'},limitations:[]};
test('finance validation rejects nonfinite and malformed observations without dropping compatible extensions',()=>{
 assert.equal(validFinancePayload(report),true);
 for(const total of [NaN,Infinity,'1000']) assert.equal(validFinancePayload({...report,total}),false);
 assert.equal(validFinancePayload({...report,nordea:{balance:600,accounts:[null]}}),false);
 assert.equal(validFinancePayload({...report,investments:{history:[]}}),true);
});
test('scenario contributions occur at month end and real values discount all capital',()=>{
 const flat=projectScenario({start:1000,monthly:100,years:1,annualReturn:0,inflation:0,fees:0});
 assert.equal(flat.at(-1).value,2200); assert.equal(flat.at(-1).added,2200);
 const gain=projectScenario({start:1000,monthly:0,years:1,annualReturn:10,inflation:2,fees:0});
 assert.ok(Math.abs(gain.at(-1).value-1100)<0.001);assert.ok(Math.abs(gain.at(-1).real-1100/1.02)<0.001);
 assert.throws(()=>projectScenario({start:0,monthly:0,years:Infinity,annualReturn:5,inflation:2,fees:0}));
 assert.throws(()=>projectScenario({start:100,monthly:1,years:1,annualReturn:-100,inflation:0,fees:0}));
});
test('snapshot history is never converted to money added or returns; invalid dates cannot enter chart',()=>{
 const rows=supportedHistory([{asOf:'2026-11-02T12:00:00Z',total:110,cash:10,investments:100,kind:'valuation_snapshot'}, {asOf:'bad',total:200}, {asOf:'2026-11-01T12:00:00Z',total:100,cash:10,investments:90,kind:'valuation_snapshot'}]);
 assert.equal(rows.length,2); assert.equal(rows[0].total,100); assert.equal(rows[0].returns,undefined);assert.equal(rows[0].netContributions,undefined);
});
test('network null errors explain bearer, reachability and browser policy without claiming missing CORS',()=>{
 assert.match(financeFailure(new TypeError('Failed to fetch')), /browser|network/i);
 assert.match(financeFailure(new Error('HTTP 401')), /Sign in again/);
 assert.match(financeFailure(new Error('HTTP 403')), /admin|permission/i);
 assert.doesNotMatch(financeFailure(new Error('secret payload')), /secret payload/);
});

test('matched total-return DKK dates rebase fractional TWR and index levels without lookahead',()=>{
 const perf={status:'available',method:'provider_time_weighted',currency:'DKK',returnUnit:'fraction',series:[{date:'2026-01-01',value:0.1},{date:'2026-01-02',value:0.2},{date:'2026-01-03',value:0.32}]};
 const benchmark={currency:'DKK',returnType:'total_return',points:[{date:'2026-01-02',level:100},{date:'2026-01-03',level:110},{date:'2026-01-04',level:120}]};
 const rows=matchedComparison(perf,benchmark);
 assert.deepEqual(rows.map(p=>p.date),['2026-01-02','2026-01-03']);
 assert.equal(rows[0].portfolio,0);assert.ok(Math.abs(rows[1].portfolio-10)<1e-9);assert.ok(Math.abs(rows[1].benchmark-10)<1e-9);
 assert.deepEqual(matchedComparison({...perf,currency:'USD'},benchmark),[]);
 assert.deepEqual(matchedComparison(perf,{...benchmark,returnType:'price'}),[]);
 assert.deepEqual(matchedComparison({...perf,series:perf.series.slice(0,1)},benchmark),[]);
 assert.deepEqual(matchedComparison({...perf,series:[...perf.series,perf.series[0]]},benchmark),[]);
});
test('money added requires exact dated account-values and complete documented flows including security transfers',()=>{
 const performance={status:'available',currency:'DKK',from:'2026-01-01',through:'2026-01-03',cashFlowsComplete:true,accountValues:[{date:'2026-01-01',value:100},{date:'2026-01-03',value:160}],cashFlows:[{date:'2026-01-02',value:40}],securityTransfers:[]};
 const rows=cashflowHistory(performance); assert.equal(rows[1].added,140);assert.equal(rows[1].gain,20);
 assert.deepEqual(cashflowHistory({...performance,cashFlowsComplete:false}),[]);
 assert.deepEqual(cashflowHistory({...performance,cashFlows:[{date:'bad',value:40}]}),[]);
});

test('cron 503 recovery is scheduler-specific, never finance-labelled',()=>{
 assert.match(cronFailure(new Error('HTTP 503')),/Cron.*scheduler/);
 assert.doesNotMatch(cronFailure(new Error('HTTP 503')),/finance/i);
});
