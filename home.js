(function() {
  'use strict';

  var themeKey = 'cloud-notes-theme';
  var root = document.documentElement;
  var themeButton = document.querySelector('.home-theme-toggle');
  var searchInput = document.getElementById('global-search');
  var results = document.getElementById('global-search-results');
  var personalSection = document.getElementById('personal-section');
  var index = window.__SEARCH_INDEX__ || [];
  var activeIndex = -1;
  var bookmarkKey = 'cloud-notes-bookmarks';
  var recentKey = 'cloud-notes-recent';
  var sharedStatePrefix = 'cloud-notes-state:';

  function readSharedState() {
    if (window.name.indexOf(sharedStatePrefix) !== 0) return {};
    try { return JSON.parse(window.name.slice(sharedStatePrefix.length)); } catch (_) { return {}; }
  }

  function mergeStoredItems(primary, secondary) {
    var seen = {};
    return primary.concat(secondary).filter(function(item) {
      if (!item || !item.href || seen[item.href]) return false;
      seen[item.href] = true;
      return true;
    });
  }

  function readStoredList(key) {
    var local = [];
    try { local = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    var shared = readSharedState()[key] || [];
    var merged = mergeStoredItems(shared, local);
    var timeField = key === recentKey ? 'visitedAt' : 'bookmarkedAt';
    merged.sort(function(a, b) { return (b[timeField] || 0) - (a[timeField] || 0); });
    try { localStorage.setItem(key, JSON.stringify(merged)); } catch (_) {}
    return merged;
  }

  function writeStoredList(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
    var state = readSharedState();
    state[key] = value;
    window.name = sharedStatePrefix + JSON.stringify(state);
  }

  function rememberItem(item) {
    if (!item || !item.href) return;
    var recent = readStoredList(recentKey).filter(function(entry) { return entry.href !== item.href; });
    recent.unshift({ title: item.title, page: item.page, href: item.href, source: item.source, visitedAt: Date.now() });
    writeStoredList(recentKey, recent.slice(0, 10));
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(themeKey, theme);
    if (themeButton) themeButton.textContent = theme === 'dark' ? '☀' : '◐';
  }

  setTheme(localStorage.getItem(themeKey) || 'light');

  if (themeButton) {
    themeButton.addEventListener('click', function() {
      setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function excerpt(text, query) {
    var lower = text.toLowerCase();
    var position = lower.indexOf(query.toLowerCase());
    var start = Math.max(0, position - 38);
    var value = text.slice(start, start + 110);
    if (start > 0) value = '…' + value;
    if (start + 110 < text.length) value += '…';
    return value;
  }

  function renderResults(query) {
    var normalized = query.trim().toLowerCase();
    activeIndex = -1;
    if (!normalized) {
      results.classList.remove('show');
      results.innerHTML = '';
      return;
    }

    var matches = index
      .map(function(item) {
        var title = item.title.toLowerCase();
        var source = item.source.toLowerCase();
        var text = item.text.toLowerCase();
        var score = title === normalized ? 100 : title.indexOf(normalized) >= 0 ? 60 : source.indexOf(normalized) >= 0 ? 35 : text.indexOf(normalized) >= 0 ? 10 : 0;
        return { item: item, score: score };
      })
      .filter(function(match) { return match.score > 0; })
      .sort(function(a, b) { return b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-CN'); })
      .slice(0, 12);

    if (!matches.length) {
      results.innerHTML = '<div class="global-search-empty">没有匹配的笔记</div>';
      results.classList.add('show');
      return;
    }

    results.innerHTML = matches.map(function(match) {
      var item = match.item;
      return '<a href="' + escapeHtml(item.href) + '" data-result-href="' + escapeHtml(item.href) + '" role="option">' +
        '<span class="result-topic">' + escapeHtml(item.page) + '</span>' +
        '<strong>' + escapeHtml(item.title) + '</strong>' +
        '<small>' + escapeHtml(excerpt(item.text, normalized)) + '</small>' +
        '</a>';
    }).join('');
    results.classList.add('show');
  }

  function updateActive(items) {
    items.forEach(function(item, indexValue) {
      item.classList.toggle('active', indexValue === activeIndex);
      if (indexValue === activeIndex) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function renderKnowledgeItems(items, type) {
    return items.map(function(item) {
      return '<div class="quick-item">' +
        '<a href="' + escapeHtml(item.href) + '" data-quick-href="' + escapeHtml(item.href) + '">' +
          '<span>' + escapeHtml(item.page || '') + '</span>' +
          '<strong>' + escapeHtml(item.title || '') + '</strong>' +
          '<small>' + escapeHtml(item.source || '') + '</small>' +
        '</a>' +
        (type === 'bookmark' ? '<button type="button" class="quick-remove" data-remove-bookmark="' + escapeHtml(item.href) + '" title="取消收藏" aria-label="取消收藏">★</button>' : '') +
      '</div>';
    }).join('');
  }

  function renderPersonalSection() {
    if (!personalSection) return;
    var bookmarks = readStoredList(bookmarkKey);
    var recent = readStoredList(recentKey);
    if (!bookmarks.length && !recent.length) {
      personalSection.hidden = true;
      personalSection.innerHTML = '';
      return;
    }

    var groups = '';
    if (bookmarks.length) {
      groups += '<div class="quick-group"><div class="quick-heading"><h2>收藏笔记</h2><span>' + bookmarks.length + '</span></div><div class="quick-list">' + renderKnowledgeItems(bookmarks, 'bookmark') + '</div></div>';
    }
    if (recent.length) {
      groups += '<div class="quick-group"><div class="quick-heading"><h2>最近浏览</h2><button type="button" class="clear-recent">清除</button></div><div class="quick-list">' + renderKnowledgeItems(recent, 'recent') + '</div></div>';
    }
    personalSection.innerHTML = groups;
    personalSection.hidden = false;
  }

  if (searchInput) {
    searchInput.addEventListener('input', function() { renderResults(searchInput.value); });
    searchInput.addEventListener('keydown', function(event) {
      var items = Array.prototype.slice.call(results.querySelectorAll('a'));
      if (event.key === 'ArrowDown' && items.length) {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActive(items);
      } else if (event.key === 'ArrowUp' && items.length) {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActive(items);
      } else if (event.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
        window.location.href = items[activeIndex].href;
      } else if (event.key === 'Escape') {
        searchInput.value = '';
        renderResults('');
        searchInput.blur();
      }
    });
  }

  if (results) {
    results.addEventListener('click', function(event) {
      var link = event.target.closest('[data-result-href]');
      if (!link) return;
      var item = index.find(function(entry) { return entry.href === link.dataset.resultHref; });
      rememberItem(item);
    });
  }

  if (personalSection) {
    personalSection.addEventListener('click', function(event) {
      var quickLink = event.target.closest('[data-quick-href]');
      if (quickLink) {
        var known = readStoredList(bookmarkKey).concat(readStoredList(recentKey)).find(function(item) { return item.href === quickLink.dataset.quickHref; });
        rememberItem(known);
      }
      var removeButton = event.target.closest('[data-remove-bookmark]');
      if (removeButton) {
        var bookmarks = readStoredList(bookmarkKey).filter(function(item) { return item.href !== removeButton.dataset.removeBookmark; });
        writeStoredList(bookmarkKey, bookmarks);
        renderPersonalSection();
      }
      if (event.target.closest('.clear-recent')) {
        writeStoredList(recentKey, []);
        renderPersonalSection();
      }
    });
  }

  document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (searchInput) searchInput.focus();
    }
  });

  document.addEventListener('click', function(event) {
    if (!event.target.closest('.home-search-wrap')) results.classList.remove('show');
  });

  renderPersonalSection();
})();
