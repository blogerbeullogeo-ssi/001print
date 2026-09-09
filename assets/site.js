(function () {
  var cat = document.body.getAttribute('data-cat');

  if (cat) {
    fetch('data/prices.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      var arr = d[cat] || [];
      document.querySelectorAll('[data-i]').forEach(function (el) {
        el.textContent = arr[+el.getAttribute('data-i')] || '';
      });
    });
  }

  if (document.querySelector('[data-news]')) {
    fetch('data/news.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      document.querySelectorAll('[data-news]').forEach(function (el) {
        el.textContent = d['news' + el.getAttribute('data-news')] || '';
      });
    });
  }
})();
