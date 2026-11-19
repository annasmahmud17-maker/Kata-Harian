import {test} from 'node:test';
import assert from 'node:assert/strict';
test('usage counts queue safely, omit personal properties, and respect opt-out', async()=>{
 const scripts=[];const sent=[];const saved=new Map();
 globalThis.window={};globalThis.location={hostname:'example.test'};
 globalThis.document={createElement:()=>({setAttribute(){}}),head:{appendChild:s=>scripts.push(s)}};
 globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 const a=await import('../analytics.js?test=privacy');
 assert.equal(scripts.length,1);
 a.trackUsage('activity_start',{activity:'Pilih Gambar',category:'Dapur',answer:'secret',name:'private'});
 window.websiteInsights=(...args)=>sent.push(args);scripts[0].onload();
 assert.deepEqual(sent,[['activity_start',{activity:'Pilih Gambar',category:'Dapur'}]]);
 a.setAnalyticsOptOut(true);assert.equal(a.analyticsAllowed(),false);assert.equal(window.websiteInsightsDisabled,true);
 a.trackUsage('round_complete',{activity:'Pilih Gambar',category:'Dapur'});assert.equal(sent.length,1);
 a.trackUsage('answer',{answer:'secret'});assert.equal(sent.length,1);
});
