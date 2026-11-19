// Aggregate website usage only. Never send words, answers, scores, or personal details.
const collector = 'https://annas-insights-collector.annas-mahmud-17.chatgpt.site';
const siteId = 's_2fb45bd6ce93403a8e781fc2';
const queue = [];
let loading = false;
let optedOut = false;
try { optedOut = localStorage.getItem('kh-analytics-opt-out') === '1'; } catch {}
export function browserBlocksAnalytics() {
  return typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true);
}
export function analyticsAllowed() { return !optedOut && !browserBlocksAnalytics(); }
function initialize() {
  if (typeof window === 'undefined' || !analyticsAllowed() || loading || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  window.websiteInsightsDisabled = false;
  loading = true;
  const script = document.createElement('script');
  script.src = collector + '/tracker.js';
  script.defer = true;
  script.setAttribute('data-site', siteId);
  script.onload = () => { while (queue.length && analyticsAllowed()) { const [event, props] = queue.shift(); window.websiteInsights?.(event, props); } };
  script.onerror = () => { queue.length = 0; };
  document.head.appendChild(script);
}
export function trackUsage(event, props) {
  if (typeof window === 'undefined' || !analyticsAllowed() || !['activity_start', 'round_complete'].includes(event)) return;
  const safe = {activity: props.activity, category: props.category};
  if (typeof window.websiteInsights === 'function') window.websiteInsights(event, safe);
  else if (queue.length < 10) queue.push([event, safe]);
}
export function setAnalyticsOptOut(value) {
  optedOut = Boolean(value);
  try { localStorage.setItem('kh-analytics-opt-out', optedOut ? '1' : '0'); } catch {}
  if (typeof window !== 'undefined') window.websiteInsightsDisabled = !analyticsAllowed();
  if (optedOut) queue.length = 0;
  else initialize();
}
initialize();
