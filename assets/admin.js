(function () {
  var REPO = 'blogerbeullogeo-ssi/001print';
  var BRANCH = 'main';
  var API = 'https://api.github.com/repos/' + REPO + '/contents/';

  var statusbar = document.getElementById('statusbar');
  function setStatus(msg, ok) {
    statusbar.textContent = msg;
    statusbar.style.background = ok === true ? '#2e7d32' : (ok === false ? '#c62828' : '#222');
  }

  var tabs = document.querySelectorAll('.tab');
  var secs = document.querySelectorAll('.catsec');
  function showTab(key) {
    secs.forEach(function (s) { s.hidden = s.getAttribute('data-cat') !== key; });
    tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === key); });
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.getAttribute('data-tab')); });
  });
  showTab('news');

  var patInput = document.getElementById('patInput');
  var tokenState = document.getElementById('tokenState');
  function refreshTokenState() {
    tokenState.textContent = localStorage.getItem('gh_pat') ? '설정됨' : '미설정';
  }
  document.getElementById('saveTokenBtn').addEventListener('click', function () {
    var v = patInput.value.trim();
    if (!v) return;
    localStorage.setItem('gh_pat', v);
    patInput.value = '';
    refreshTokenState();
    setStatus('저장됨', true);
  });
  document.getElementById('clearTokenBtn').addEventListener('click', function () {
    localStorage.removeItem('gh_pat');
    refreshTokenState();
    setStatus('초기화됨', true);
  });
  refreshTokenState();

  function utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function base64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  Promise.all([
    fetch('data/prices.json', { cache: 'no-store' }).then(function (r) { return r.json(); }),
    fetch('data/news.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
  ]).then(function (res) {
    var prices = res[0], news = res[1];
    document.querySelectorAll('input.cell[data-i]').forEach(function (el) {
      var sec = el.closest('.catsec');
      var cat = sec.getAttribute('data-cat');
      var arr = prices[cat] || [];
      el.value = arr[+el.getAttribute('data-i')] || '';
    });
    document.querySelectorAll('textarea.news[data-news]').forEach(function (el) {
      el.value = news['news' + el.getAttribute('data-news')] || '';
    });
    setStatus('불러오기 완료. 값을 수정한 뒤 저장하세요.');
  }).catch(function (e) {
    setStatus('불러오기 실패: ' + e.message, false);
  });

  function ghRequest(path, opts) {
    var pat = localStorage.getItem('gh_pat');
    if (!pat) return Promise.reject(new Error('먼저 코드를 입력하세요'));
    opts = opts || {};
    opts.headers = Object.assign({
      'Authorization': 'Bearer ' + pat,
      'Accept': 'application/vnd.github+json'
    }, opts.headers || {});
    return fetch(API + path + '?ref=' + BRANCH, opts).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t); });
      return r.json();
    });
  }

  var saveBtns = document.querySelectorAll('button.save');
  function setSaving(on) {
    saveBtns.forEach(function (b) { b.disabled = on; });
  }

  function putOnce(path, mutateFn, commitMsg) {
    return ghRequest(path).then(function (file) {
      var current = JSON.parse(base64ToUtf8(file.content.replace(/\n/g, '')));
      mutateFn(current);
      var body = {
        message: commitMsg,
        content: utf8ToBase64(JSON.stringify(current, null, 2)),
        sha: file.sha,
        branch: BRANCH
      };
      return ghRequest(path, { method: 'PUT', body: JSON.stringify(body) });
    });
  }

  function saveJsonFile(path, mutateFn, commitMsg) {
    setStatus('저장 중...');
    setSaving(true);
    return putOnce(path, mutateFn, commitMsg).catch(function (e) {
      if (String(e.message).indexOf('409') === 0 || String(e.message).indexOf(' 409') !== -1) {
        setStatus('다시 시도 중...');
        return putOnce(path, mutateFn, commitMsg);
      }
      throw e;
    }).then(function () {
      setStatus('저장완료! 반영까지 1분 정도 걸릴 수 있습니다.', true);
    }).catch(function (e) {
      setStatus('저장 실패: ' + e.message, false);
    }).then(function () {
      setSaving(false);
    });
  }

  saveBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      var cat = btn.getAttribute('data-cat');
      if (cat === 'news') {
        saveJsonFile('data/news.json', function (news) {
          document.querySelectorAll('textarea.news[data-news]').forEach(function (el) {
            news['news' + el.getAttribute('data-news')] = el.value;
          });
        }, '공지사항 수정');
      } else {
        saveJsonFile('data/prices.json', function (prices) {
          var arr = prices[cat] || [];
          document.querySelectorAll('.catsec[data-cat="' + cat + '"] input.cell[data-i]').forEach(function (el) {
            arr[+el.getAttribute('data-i')] = el.value;
          });
          prices[cat] = arr;
        }, cat + ' 가격 수정');
      }
    });
  });
})();
