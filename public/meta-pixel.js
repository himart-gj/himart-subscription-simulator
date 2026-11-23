/**
 * Meta Pixel Bootstrap — 롯데하이마트 경기광주점 (하이마트국지)
 * Dataset / Pixel ID: 1108973711692141
 * Loaded as a first-party script so Content-Security-Policy keeps script-src free of 'unsafe-inline'.
 */
(function (f, b, e, v, n, t, s) {
  if (f.fbq) return;
  n = f.fbq = function () {
    if (n.callMethod) {
      n.callMethod.apply(n, arguments);
    } else {
      n.queue.push(arguments);
    }
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  t = b.createElement(e);
  t.async = true;
  t.src = v;
  s = b.getElementsByTagName(e)[0];
  if (s && s.parentNode) {
    s.parentNode.insertBefore(t, s);
  }
})(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

(function () {
  var PIXEL_ID = '1108973711692141';
  if (typeof window.fbq !== 'function') return;
  window.fbq('init', PIXEL_ID);
  if (!/^#\/admin/i.test(window.location.hash || '')) {
    window.fbq('track', 'PageView');
  }
})();
