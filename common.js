// common.js - 所有子页面共享的交互逻辑
(function() {
  'use strict';

  // === 0. 面包屑导航（嵌入顶栏） ===
  (function initBreadcrumb() {
    var topbar = document.querySelector('.topbar');
    var pageTitle = document.querySelector('.page-header h1');
    var titleText = pageTitle ? pageTitle.textContent.trim() : '';
    var sectionName = titleText.replace(/^\d+\s*/, '');

    var bc = document.createElement('div');
    bc.className = 'breadcrumb';
    bc.innerHTML = '<a href="index.html">首页</a><span class="sep">/</span>' +
      '<a href="' + document.location.pathname.split('/').pop() + '">' + sectionName + '</a>' +
      '<span class="sep" id="bc-card-sep" style="display:none">/</span>' +
      '<span class="current" id="bc-card-title" style="display:none"></span>';

    // Insert breadcrumb inside topbar, after the title
    if (topbar) {
      var titleEl = topbar.querySelector('.title');
      if (titleEl && titleEl.nextSibling) {
        topbar.insertBefore(bc, titleEl.nextSibling);
      } else {
        topbar.appendChild(bc);
      }
    }

    var bcCardTitle = document.getElementById('bc-card-title');
    var bcCardSep = document.getElementById('bc-card-sep');
    var sideLinks = document.querySelectorAll('.sidebar li a');
    sideLinks.forEach(function(a) {
      a.addEventListener('click', function() {
        var text = a.textContent.trim();
        if (bcCardTitle) { bcCardTitle.textContent = text; bcCardTitle.style.display = ''; }
        if (bcCardSep) bcCardSep.style.display = '';
      });
    });

    function updateBreadcrumbFromHash() {
      var hash = window.location.hash;
      if (hash && hash.length > 1) {
        var keyword = decodeURIComponent(hash.substring(1));
        if (keyword && bcCardTitle) {
          bcCardTitle.textContent = '搜索: ' + keyword;
          bcCardTitle.style.display = '';
          if (bcCardSep) bcCardSep.style.display = '';
        }
      }
    }
    updateBreadcrumbFromHash();
  })();

  // === 1. 卡片折叠 + 动画延迟 ===
  (function initCards() {
    // Staggered entrance animation (only once)
    document.querySelectorAll('.file-card, .card').forEach(function(card, i) {
      card.style.animationDelay = (0.05 * i) + 's';
      card.addEventListener('animationend', function() {
        card.style.animation = 'none';
      }, { once: true });
    });

    // Collapse toggle
    document.querySelectorAll('.file-card-header, .card-header').forEach(function(h) {
      h.addEventListener('click', function() {
        var card = h.closest('.file-card') || h.closest('.card');
        if (card) {
          card.classList.toggle('collapsed');
        }
      });
    });
  })();

  // === 2. 侧边栏滚动高亮 + 瞬时跳转 ===
  var sideLinks = document.querySelectorAll('.sidebar li a');
  var cards = document.querySelectorAll('.file-card[id], .card[id]');

  // Highlight on target card
  function highlightTarget(el) {
    var card = el.closest('.file-card') || el.closest('.card');
    if (!card) card = el;
    // Expand if collapsed (skip animation)
    if (card.classList.contains('collapsed')) {
      card.style.transition = 'none';
      card.classList.remove('collapsed');
      // Force reflow then restore transition
      card.offsetHeight;
      card.style.transition = '';
    }
    card.classList.add('scroll-target');
    setTimeout(function() {
      card.classList.remove('scroll-target');
    }, 800);
  }

  // Intercept sidebar link clicks — instant jump
    sideLinks.forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        var target = document.getElementById(href.substring(1));
        if (!target) return;
        highlightTarget(target);
        // Calculate offset: topbar + toolbar only (breadcrumb is now inside topbar)
        var topbarH = (document.querySelector('.topbar') || {}).offsetHeight || 52;
        var toolbarH = (document.querySelector('.toolbar') || {}).offsetHeight || 36;
        var offset = topbarH + toolbarH + 8;
        var targetY = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, targetY);
      });
    });

  function onScroll() {
    var pos = window.scrollY + 120;
    var current = cards[0];
    cards.forEach(function(c) {
      if (c.offsetTop <= pos) current = c;
    });
    sideLinks.forEach(function(a) { a.classList.remove('active'); });
    if (current) {
      sideLinks.forEach(function(a) {
        if (a.getAttribute('href') === '#' + current.id) a.classList.add('active');
      });
    }
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  // === 3. 暗色模式 ===
  var themeKey = 'cloud-notes-theme';
  var savedTheme = localStorage.getItem(themeKey) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(themeKey, next);
  }

  var topbar = document.querySelector('.topbar');
  if (topbar) {
    var themeBtn = document.createElement('button');
    themeBtn.innerHTML = savedTheme === 'dark' ? '&#9728;' : '&#9790;';
    themeBtn.title = '切换暗色模式 (D)';
    themeBtn.className = 'theme-toggle';
    themeBtn.onclick = toggleTheme;
    topbar.querySelector('.nav-btns').insertAdjacentElement('afterbegin', themeBtn);
    var observer = new MutationObserver(function() {
      var t = document.documentElement.getAttribute('data-theme');
      themeBtn.innerHTML = t === 'dark' ? '&#9728;' : '&#9790;';
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'd' && !e.ctrlKey && !e.altKey && !e.metaKey && 
        document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      toggleTheme();
    }
  });

  // === 4. 返回顶部 ===
  var backTop = document.createElement('div');
  backTop.className = 'back-top';
  backTop.innerHTML = '&#8593;';
  backTop.title = '返回顶部';
  backTop.onclick = function() { window.scrollTo({ top: 0 }); };
  document.body.appendChild(backTop);
  var backTopVisible = false;
  window.addEventListener('scroll', function() {
    var shouldShow = window.scrollY > 400;
    if (shouldShow !== backTopVisible) {
      backTop.classList.toggle('show', shouldShow);
      backTopVisible = shouldShow;
    }
  });

  // === 5. 代码块复制按钮 ===
  document.querySelectorAll('.file-card-body pre, .card-body pre').forEach(function(pre) {
    var btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = '复制';
    btn.onclick = function(e) {
      e.stopPropagation();
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '已复制';
        setTimeout(function() { btn.textContent = '复制'; }, 1500);
      });
    };
    pre.appendChild(btn);
  });

  // === 6. 工具栏（智能展开/折叠 + 侧边栏切换） ===
  var pageWrap = document.querySelector('.page-wrap');
  if (pageWrap && document.querySelector('.sidebar')) {
    var toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    toolbar.innerHTML = 
      '<button class="toolbar-btn" id="btn-toggle-all" title="展开/折叠全部卡片">&#9654; 全部折叠</button>' +
      '<div class="toolbar-spacer"></div>' +
      '<button class="sidebar-toggle" id="btn-sidebar" title="切换侧边栏">&#9776;</button>';
    pageWrap.parentNode.insertBefore(toolbar, pageWrap);

    var toggleAllBtn = document.getElementById('btn-toggle-all');
    var allCollapsed = false;

    toggleAllBtn.onclick = function() {
      allCollapsed = !allCollapsed;
      if (allCollapsed) {
        document.querySelectorAll('.file-card, .card').forEach(function(c) {
          c.classList.add('collapsed');
        });
        toggleAllBtn.innerHTML = '&#9660; 全部展开';
        toggleAllBtn.title = '展开全部卡片';
      } else {
        document.querySelectorAll('.file-card.collapsed, .card.collapsed').forEach(function(c) {
          c.classList.remove('collapsed');
        });
        toggleAllBtn.innerHTML = '&#9654; 全部折叠';
        toggleAllBtn.title = '折叠全部卡片';
      }
    };

    // 智能检测：如果大部分卡片已折叠，默认显示"全部展开"
    var totalCards = document.querySelectorAll('.file-card, .card').length;
    var collapsedCount = document.querySelectorAll('.file-card.collapsed, .card.collapsed').length;
    if (collapsedCount > totalCards / 2) {
      allCollapsed = true;
      toggleAllBtn.innerHTML = '&#9660; 全部展开';
    } else {
      allCollapsed = false;
      toggleAllBtn.innerHTML = '&#9654; 全部折叠';
    }

    var sidebarBtn = document.getElementById('btn-sidebar');
    sidebarBtn.onclick = function() {
      var sidebar = pageWrap.querySelector('.sidebar');
      if (window.innerWidth <= 900) {
        // Mobile: toggle drawer
        if (sidebar.classList.contains('open')) {
          closeSidebar(sidebar);
        } else {
          openSidebar(sidebar);
        }
      } else {
        // Desktop: toggle sidebar visibility
        pageWrap.classList.toggle('sidebar-hidden');
      }
    };
  }

  // === 7. URL hash 搜索（从 index.html 跳转时） ===
  function checkHashSearch() {
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
      var keyword = decodeURIComponent(hash.substring(1));
      if (keyword && keyword.length > 0) {
        var searchInput = document.querySelector('.search-box');
        if (searchInput) {
          searchInput.value = keyword;
          searchInput.dispatchEvent(new Event('input'));
        }
      }
    }
  }
  setTimeout(checkHashSearch, 300);

  // === 8. 页内搜索框 ===
  var searchInput = document.querySelector('.search-box');
  if (searchInput) {
    var searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      var query = searchInput.value.trim().toLowerCase();
      searchTimeout = setTimeout(function() {
        document.querySelectorAll('.search-match').forEach(function(el) {
          el.outerHTML = el.textContent;
        });
        if (query.length < 2) {
          document.querySelectorAll('.file-card.search-hidden, .card.search-hidden').forEach(function(c) {
            c.classList.remove('search-hidden');
          });
          return;
        }
        var allCards = document.querySelectorAll('.file-card, .card');
        allCards.forEach(function(card) {
          var body = card.querySelector('.file-card-body') || card.querySelector('.card-body');
          if (!body) return;
          var text = body.textContent.toLowerCase();
          if (text.indexOf(query) === -1) {
            card.classList.add('search-hidden');
          } else {
            card.classList.remove('search-hidden');
            card.classList.remove('collapsed');
            highlightText(body, query);
          }
        });
      }, 200);
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
      }
    });

    function highlightText(container, query) {
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      var nodesToReplace = [];
      while (walker.nextNode()) {
        var node = walker.currentNode;
        if (node.parentElement.tagName === 'CODE' || node.parentElement.tagName === 'PRE' || 
            node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') continue;
        var idx = node.textContent.toLowerCase().indexOf(query);
        if (idx !== -1) {
          nodesToReplace.push({ node: node, idx: idx, query: query });
        }
      }
      nodesToReplace.forEach(function(item) {
        var node = item.node;
        var text = node.textContent;
        var idx = item.idx;
        var before = text.substring(0, idx);
        var match = text.substring(idx, idx + item.query.length);
        var after = text.substring(idx + item.query.length);
        var span = document.createElement('span');
        span.className = 'search-match';
        span.textContent = match;
        var frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(span);
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
      });
    }
  }

  // === 9. 键盘快捷键 ===
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var searchInput = document.querySelector('.search-box');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // === 10. 阅读进度条 ===
  (function initProgressBar() {
    var bar = document.createElement('div');
    bar.className = 'progress-bar';
    document.body.appendChild(bar);
    window.addEventListener('scroll', function() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      bar.style.width = pct + '%';
      bar.classList.toggle('done', pct >= 99.5);
    });
  })();

  // === 11. 代码块行号 + 语法高亮 ===
  (function initCodeBlocks() {
    var shellKw = /\b(if|then|else|elif|fi|for|do|done|while|until|case|esac|in|function|return|exit|select|echo|read|shift|local|export|source|alias|unset|set|cd|ls|cp|mv|rm|mkdir|rmdir|chmod|chown|chgrp|cat|grep|sed|awk|find|sort|uniq|head|tail|less|more|wc|cut|tr|tee|xargs|tar|gzip|gunzip|zip|unzip|curl|wget|ssh|scp|rsync|crontab|nohup|service|systemctl|enable|disable|start|stop|restart|status|install|remove|update|upgrade|search|list|info|show|create|delete|drop|alter|insert|select|from|where|grant|revoke|flush|use|import|dump|load|mount|umount|fdisk|mkfs|fsck|df|du|free|top|ps|kill|netstat|ip|ping|nslookup|dig|vi|vim|nano|yum|apt|dnf|rpm|dpkg|make|gcc|docker|kubectl|kubeadm|ansible|playbook|touch|ln|stat|file|which|type|history|clear|init|reboot|shutdown|hostname|date|whoami|id|su|sudo|passwd|useradd|userdel|usermod|groupadd|groupdel|visudo|ssh-keygen|ssh-copy-id|git|zcat|mysql|mysqldump|ntpdate|firewall-cmd|setenforce|getenforce)\b/g;

    document.querySelectorAll('.file-card-body pre, .card-body pre').forEach(function(pre) {
      var code = pre.querySelector('code');
      if (!code) return;
      var raw = code.textContent;
      var lines = raw.split('\n');

      // === 行号 ===
      var lineNumDiv = document.createElement('div');
      lineNumDiv.className = 'code-line-numbers';
      var numsHtml = '';
      for (var i = 0; i < lines.length; i++) {
        numsHtml += '<span>' + (i + 1) + '</span>';
      }
      lineNumDiv.innerHTML = numsHtml;

      // === 包裹 pre ===
      var wrap = document.createElement('div');
      wrap.className = 'code-block-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(lineNumDiv);
      wrap.appendChild(pre);

      // === 语法高亮 ===
      var escaped = code.textContent;
      var html = escaped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      html = html.replace(/(#[^\n{]*|\/\/[^\n]*)$/gm, '<span class="hl-cmt">$1</span>');
      html = html.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="hl-str">"$1"</span>');
      html = html.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, '<span class="hl-str">\'$1\'</span>');
      html = html.replace(shellKw, '<span class="hl-cmd">$&</span>');

      if (html !== escaped.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')) {
        code.innerHTML = html;
      }
    });
  })();

  // === 12. 记忆上次阅读位置 ===
  (function initScrollMemory() {
    var pageKey = 'scroll_' + window.location.pathname;
    var collapseKey = 'collapsed_' + window.location.pathname;

    try {
      var savedScroll = sessionStorage.getItem(pageKey);
      if (savedScroll) {
        setTimeout(function() { window.scrollTo(0, parseInt(savedScroll)); }, 100);
      }
    } catch(e) {}

    try {
      var savedCollapsed = JSON.parse(sessionStorage.getItem(collapseKey) || '[]');
      savedCollapsed.forEach(function(id) {
        var card = document.getElementById(id);
        if (card) card.classList.add('collapsed');
      });
    } catch(e) {}

    var saveTimer;
    window.addEventListener('scroll', function() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        try {
          sessionStorage.setItem(pageKey, window.scrollY);
          var collapsedIds = [];
          document.querySelectorAll('.file-card.collapsed, .card.collapsed').forEach(function(c) {
            if (c.id) collapsedIds.push(c.id);
          });
          sessionStorage.setItem(collapseKey, JSON.stringify(collapsedIds));
        } catch(e) {}
      }, 300);
    });

    window.addEventListener('beforeunload', function() {
      try {
        sessionStorage.setItem(pageKey, window.scrollY);
      } catch(e) {}
    });
  })();

  // === 13. 双击代码块全屏查看 ===
  (function initFullscreenCode() {
    // Detect language from surrounding context
    function detectLang(pre) {
      var body = pre.closest('.file-card-body, .card-body');
      if (!body) return 'Shell';
      var h4 = pre.previousElementSibling;
      while (h4 && h4.tagName !== 'H4' && h4.previousElementSibling) {
        h4 = h4.previousElementSibling;
      }
      if (h4 && h4.tagName === 'H4') {
        var text = h4.textContent.toLowerCase();
        if (text.indexOf('mysql') !== -1 || text.indexOf('sql') !== -1) return 'SQL';
        if (text.indexOf('dockerfile') !== -1) return 'Dockerfile';
        if (text.indexOf('yaml') !== -1 || text.indexOf('yml') !== -1) return 'YAML';
        if (text.indexOf('python') !== -1) return 'Python';
        if (text.indexOf('ansible') !== -1) return 'YAML';
      }
      return 'Shell';
    }

    // Create overlay once
    var overlay = document.createElement('div');
    overlay.className = 'code-fullscreen-overlay';
    overlay.innerHTML =
      '<div class="code-fullscreen-modal">' +
        '<div class="code-fullscreen-header">' +
          '<span class="lang-badge" id="fs-lang">Shell</span>' +
          '<div class="code-fullscreen-actions">' +
            '<button id="fs-copy-btn">复制</button>' +
            '<button id="fs-wrap-btn">自动换行</button>' +
          '</div>' +
          '<button class="close-btn" id="fs-close">&times;</button>' +
        '</div>' +
        '<div class="code-fullscreen-body" id="fs-body"></div>' +
        '<div class="code-fullscreen-tip">按 Esc 关闭 · 双击代码块打开</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var fsBody = document.getElementById('fs-body');
    var fsLang = document.getElementById('fs-lang');
    var fsClose = document.getElementById('fs-close');
    var fsCopy = document.getElementById('fs-copy-btn');
    var fsWrap = document.getElementById('fs-wrap-btn');
    var fsRawCode = '';

    function openFullscreen(pre) {
      var code = pre.querySelector('code');
      fsRawCode = code ? code.textContent : pre.textContent;
      var lang = detectLang(pre);
      fsLang.textContent = lang;

      // Render with line numbers
      var lines = fsRawCode.split('\n');
      var html = '';
      for (var i = 0; i < lines.length; i++) {
        html += '<span class="fs-ln">' + (i + 1) + '</span>' + escapeHtml(lines[i]) + '\n';
      }
      fsBody.innerHTML = html;
      fsBody.style.whiteSpace = 'pre';
      fsWrap.textContent = '自动换行';
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeFullscreen() {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    function escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Double click on pre to open
    document.querySelectorAll('.file-card-body pre, .card-body pre').forEach(function(pre) {
      pre.addEventListener('dblclick', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openFullscreen(pre);
      });
      // Add cursor hint
      pre.style.cursor = 'pointer';
      pre.title = '双击全屏查看';
    });

    fsClose.onclick = closeFullscreen;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeFullscreen();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('show')) {
        closeFullscreen();
      }
    });

    fsCopy.onclick = function() {
      navigator.clipboard.writeText(fsRawCode).then(function() {
        fsCopy.textContent = '已复制';
        setTimeout(function() { fsCopy.textContent = '复制'; }, 1500);
      });
    };

    fsWrap.onclick = function() {
      if (fsBody.style.whiteSpace === 'pre-wrap') {
        fsBody.style.whiteSpace = 'pre';
        fsWrap.textContent = '自动换行';
      } else {
        fsBody.style.whiteSpace = 'pre-wrap';
        fsWrap.textContent = '不换行';
      }
    };
  })();

  // === 14. 移动端底部导航 ===
  (function initMobileNav() {
    // Get current page number for prev/next
    var currentPage = document.location.pathname.split('/').pop();
    var pages = ['01-linux-core.html','02-linux-service.html','03-linux-database.html',
                 '04-ansible.html','05-deployment.html','06-zabbix.html',
                 '07-docker.html','08-k8s.html'];
    var idx = pages.indexOf(currentPage);
    var prevPage = idx > 0 ? pages[idx - 1] : null;
    var nextPage = idx < pages.length - 1 ? pages[idx + 1] : null;

    // Get page title
    var pageTitle = document.querySelector('.page-header h1');
    var titleText = pageTitle ? pageTitle.textContent.trim().replace(/^\d+\s*/, '') : '';

    var nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.innerHTML =
      '<div class="mobile-bottom-nav-items">' +
        '<div class="mobile-nav-item" data-action="home">' +
          '<span class="nav-icon">&#127968;</span>' +
          '<span>首页</span>' +
        '</div>' +
        '<div class="mobile-nav-item" data-action="prev" ' + (prevPage ? '' : 'style="opacity:0.35;pointer-events:none"') + '>' +
          '<span class="nav-icon">&#9664;</span>' +
          '<span>上一页</span>' +
        '</div>' +
        '<div class="mobile-nav-item active" data-action="search">' +
          '<span class="nav-icon">&#128269;</span>' +
          '<span>搜索</span>' +
        '</div>' +
        '<div class="mobile-nav-item" data-action="next" ' + (nextPage ? '' : 'style="opacity:0.35;pointer-events:none"') + '>' +
          '<span class="nav-icon">&#9654;</span>' +
          '<span>下一页</span>' +
        '</div>' +
        '<div class="mobile-nav-item" data-action="top">' +
          '<span class="nav-icon">&#8593;</span>' +
          '<span>顶部</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(nav);

    // Event delegation
    nav.addEventListener('click', function(e) {
      var item = e.target.closest('.mobile-nav-item');
      if (!item) return;
      var action = item.getAttribute('data-action');

      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(10);

      switch (action) {
        case 'home':
          window.location.href = 'index.html';
          break;
        case 'prev':
          if (prevPage) window.location.href = prevPage;
          break;
        case 'next':
          if (nextPage) window.location.href = nextPage;
          break;
        case 'top':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'search':
          var sb = document.querySelector('.search-box');
          if (sb) { sb.focus(); sb.select(); }
          break;
      }
    });
  })();

  // === 15. 移动端触摸手势 ===
  (function initTouchGestures() {
    if (!('ontouchstart' in window)) return;

    // Swipe down on a card header to collapse
    var touchStartY = 0;
    var touchTarget = null;

    document.querySelectorAll('.file-card-header, .card-header').forEach(function(header) {
      header.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
        touchTarget = header;
      }, { passive: true });

      header.addEventListener('touchend', function(e) {
        if (!touchTarget) return;
        var deltaY = e.changedTouches[0].clientY - touchStartY;
        var card = header.closest('.file-card') || header.closest('.card');
        if (!card) return;

        // Swipe down > 40px = collapse, swipe up > 40px = expand
        if (Math.abs(deltaY) > 40) {
          if (deltaY > 0) {
            card.classList.add('collapsed');
          } else {
            card.classList.remove('collapsed');
          }
          // Haptic feedback
          if (navigator.vibrate) navigator.vibrate(15);
        }
        touchTarget = null;
      }, { passive: true });
    });

    // Swipe right from left edge to open sidebar on mobile
    var edgeStartX = 0;
    document.addEventListener('touchstart', function(e) {
      if (e.touches[0].clientX < 20) {
        edgeStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (edgeStartX > 0 && e.changedTouches[0].clientX - edgeStartX > 60) {
        var sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth <= 900) {
          openSidebar(sidebar);
          if (navigator.vibrate) navigator.vibrate(10);
        }
      }
      edgeStartX = 0;
    }, { passive: true });

    // Tap outside sidebar to close on mobile
    document.addEventListener('click', function(e) {
      if (window.innerWidth > 900) return;
      var sidebar = document.querySelector('.sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !e.target.closest('.sidebar-toggle') && !e.target.closest('.toolbar')) {
          closeSidebar(sidebar);
        }
      }
    });

    // Swipe left on sidebar to close
    var sidebarStartX = 0;
    document.querySelector('.sidebar').addEventListener('touchstart', function(e) {
      sidebarStartX = e.touches[0].clientX;
    }, { passive: true });
    document.querySelector('.sidebar').addEventListener('touchend', function(e) {
      if (e.changedTouches[0].clientX - sidebarStartX < -50) {
        closeSidebar(document.querySelector('.sidebar'));
      }
    }, { passive: true });
  })();

  // === 16. Mobile sidebar backdrop (shared helper) ===
  // Called from toolbar toggle and touch gestures
  function closeSidebar(sidebar) {
    if (!sidebar) sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');
    var backdrop = document.querySelector('.sidebar-backdrop');
    if (backdrop) backdrop.remove();
  }
  function openSidebar(sidebar) {
    if (!sidebar) sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.classList.add('open');
    // Add backdrop if not exists
    if (!document.querySelector('.sidebar-backdrop')) {
      var bd = document.createElement('div');
      bd.className = 'sidebar-backdrop';
      bd.onclick = function() { closeSidebar(sidebar); };
      document.body.appendChild(bd);
    }
  }

  // === 17. 尊重减少动画偏好 ===
  (function respectMotionPreference() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var style = document.createElement('style');
      style.textContent = 
        '*, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }';
      document.head.appendChild(style);
    }
  })();

})();
