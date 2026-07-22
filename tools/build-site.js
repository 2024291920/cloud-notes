'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MarkdownIt = require('markdown-it');

const siteRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(siteRoot, '..');
const mediaDir = path.join(siteRoot, 'assets', 'media');
const downloadsDir = path.join(siteRoot, 'assets', 'downloads');
const verifyOnly = process.argv.includes('--verify');

const pages = [
  {
    number: '01', slug: 'linux-core', title: 'Linux 核心', icon: '⌨',
    color: 'linear-gradient(90deg,#f59e0b,#f97316)', sources: ['Linux 核心'],
    description: '计算机原理、文件与磁盘、权限、用户、软件包、正则表达式及基础命令'
  },
  {
    number: '02', slug: 'linux-service', title: 'Linux 服务', icon: '◉',
    color: 'linear-gradient(90deg,#3b82f6,#6366f1)', sources: ['Linux 服务'],
    description: '网络模型、DHCP、FTP、NTP、Cobbler、Shell、文本处理与中间件服务'
  },
  {
    number: '03', slug: 'linux-database', title: 'Linux 数据库', icon: '▤',
    color: 'linear-gradient(90deg,#10b981,#059669)', sources: ['Linux 数据库'],
    description: 'MySQL 安装、基础操作、备份恢复与主从复制'
  },
  {
    number: '04', slug: 'ansible', title: 'Ansible 自动化', icon: '⚙',
    color: 'linear-gradient(90deg,#8b5cf6,#7c3aed)', sources: ['Linux 自动化运维'],
    description: 'Ad-hoc、Playbook、变量、角色及进阶自动化运维'
  },
  {
    number: '05', slug: 'deployment', title: 'Linux 部署', icon: '⇧',
    color: 'linear-gradient(90deg,#ec4899,#f43f5e)', sources: ['Linux 部署'],
    description: '服务器部署、Jenkins 与持续集成、自动化发布流程'
  },
  {
    number: '06', slug: 'zabbix', title: 'Zabbix 监控', icon: '⌁',
    color: 'linear-gradient(90deg,#f59e0b,#eab308)', sources: ['Zabbix 监控', 'Zabbix笔记'],
    description: '安装部署、主机与应用监控、告警、自动发现、分布式、Grafana 和实战项目'
  },
  {
    number: '07', slug: 'docker', title: 'Docker 容器', icon: '▣',
    color: 'linear-gradient(90deg,#6366f1,#4f46e5)', sources: ['Docker 容器'],
    description: '容器基础、镜像与容器管理、Dockerfile、网络、存储及 Compose'
  },
  {
    number: '08', slug: 'k8s', title: 'Kubernetes', icon: '⎈',
    color: 'linear-gradient(90deg,#14b8a6,#0d9488)', sources: ['K8S'],
    description: '集群部署、核心资源、工作负载、服务发现与集群验证'
  },
  {
    number: '09', slug: 'appendix', title: '课程附录', icon: '+',
    color: 'linear-gradient(90deg,#64748b,#334155)', sources: ['扩展-安装centos7 桌面版'],
    rootFiles: ['云计算15期试卷.md', '试卷2.md', '项目答辩.md', '简历编写.md'],
    attachments: ['云计算复习.xmind'],
    description: '课程试卷、项目答辩、简历编写、CentOS 桌面版安装与复习思维导图'
  }
];

const corrections = [
  [/\blinux Torvalds\b/gi, 'Linus Torvalds'],
  [/Linux的软件打了CPL将近80%/g, 'Linux 相关软件大量采用 GPL 许可证'],
  [/复制管理计算机其他组件/g, '负责管理计算机其他组件'],
  [/最后有操作系统来控制/g, '最后由操作系统来控制'],
  [/内核时无法单独工作/g, '内核是无法单独工作'],
  [/讲源码发布出来/g, '将源码发布出来'],
  [/\bDcoker\b/g, 'Docker'],
  [/安装docke\b/g, '安装 Docker'],
  [/docke build\b/g, 'docker build'],
  [/通高工作效率/g, '提高工作效率'],
  [/成产环境/g, '生产环境'],
  [/docker file/gi, 'Dockerfile']
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function naturalCompare(a, b) {
  return a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

function walkFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (!predicate || predicate(full)) out.push(full);
    }
  }
  return out.sort(naturalCompare);
}

const allSourceFiles = walkFiles(sourceRoot, file => !file.startsWith(siteRoot + path.sep));
const imageFiles = allSourceFiles.filter(file => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file));
const imagesByBasename = new Map();
for (const image of imageFiles) {
  const key = path.basename(image).toLowerCase();
  if (!imagesByBasename.has(key)) imagesByBasename.set(key, []);
  imagesByBasename.get(key).push(image);
}

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch (_) { return value; }
}

function cleanImageReference(raw) {
  return safeDecode(String(raw || '').trim())
    .replace(/^<|>$/g, '')
    .replace(/^file:\/\//i, '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/');
}

function resolveImage(sourceFile, rawReference) {
  const reference = cleanImageReference(rawReference);
  if (!reference || /^(https?:|data:|blob:)/i.test(reference)) return null;

  const attempts = [];
  if (!/^[A-Za-z]:\//.test(reference)) {
    attempts.push(path.resolve(path.dirname(sourceFile), ...reference.replace(/^\.\//, '').split('/')));
  }

  const rootMarker = reference.toLowerCase().lastIndexOf('云计算15/'.toLowerCase());
  if (rootMarker >= 0) {
    const relativeFromRoot = reference.slice(rootMarker + '云计算15/'.length);
    attempts.push(path.resolve(sourceRoot, ...relativeFromRoot.split('/')));
  }

  for (const candidate of attempts) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  const matches = imagesByBasename.get(path.basename(reference).toLowerCase()) || [];
  if (!matches.length) return null;
  if (matches.length === 1) return matches[0];

  const sourceTop = path.relative(sourceRoot, sourceFile).split(path.sep)[0].toLowerCase();
  const sameTopic = matches.filter(file => path.relative(sourceRoot, file).split(path.sep)[0].toLowerCase() === sourceTop);
  if (sameTopic.length === 1) return sameTopic[0];

  return (sameTopic.length ? sameTopic : matches)
    .sort((a, b) => {
      const aDepth = path.relative(path.dirname(sourceFile), a).split(path.sep).length;
      const bDepth = path.relative(path.dirname(sourceFile), b).split(path.sep).length;
      return aDepth - bDepth || naturalCompare(a, b);
    })[0];
}

function assertSafeMediaDirectory() {
  for (const directory of [mediaDir, downloadsDir]) {
    const resolved = path.resolve(directory);
    if (!resolved.startsWith(siteRoot + path.sep) || resolved === siteRoot) {
      throw new Error(`拒绝清理不安全的生成目录：${resolved}`);
    }
  }
}

const copiedAssets = new Map();
const assetUsageByDoc = new Map();
let mediaSequence = 0;

function copyImage(sourceFile, rawReference) {
  if (/^(https?:|data:|blob:)/i.test(String(rawReference || '').trim())) {
    return { url: rawReference, external: true };
  }

  const resolved = resolveImage(sourceFile, rawReference);
  if (!resolved) return null;

  if (!copiedAssets.has(resolved)) {
    mediaSequence += 1;
    const extension = path.extname(resolved).toLowerCase() || '.png';
    const digest = crypto.createHash('sha1').update(path.relative(sourceRoot, resolved)).digest('hex').slice(0, 8);
    const filename = `${String(mediaSequence).padStart(4, '0')}-${digest}${extension}`;
    if (!verifyOnly) fs.copyFileSync(resolved, path.join(mediaDir, filename));
    copiedAssets.set(resolved, `assets/media/${filename}`);
  }

  if (!assetUsageByDoc.has(sourceFile)) assetUsageByDoc.set(sourceFile, new Set());
  assetUsageByDoc.get(sourceFile).add(resolved);
  return { url: copiedAssets.get(resolved), external: false, source: resolved };
}

let activeSourceFile = '';
const unresolvedImages = [];
const md = new MarkdownIt({ html: true, linkify: true, breaks: false });

const defaultImageRenderer = md.renderer.rules.image || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.image = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const source = token.attrGet('src');
  const mapped = copyImage(activeSourceFile, source);
  if (!mapped) {
    unresolvedImages.push({ sourceFile: activeSourceFile, reference: source });
    return `<span class="missing-media" title="${escapeHtml(source)}">图片资源未找到：${escapeHtml(path.basename(cleanImageReference(source)))}</span>`;
  }
  token.attrSet('src', mapped.url);
  token.attrSet('loading', 'lazy');
  token.attrSet('decoding', 'async');
  token.attrSet('data-source-name', path.basename(cleanImageReference(source)));
  return defaultImageRenderer(tokens, idx, options, env, self);
};

const defaultLinkOpen = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const href = tokens[idx].attrGet('href') || '';
  if (/^https?:/i.test(href)) {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

function applyCorrections(markdown) {
  let output = markdown.replace(/^\uFEFF/, '');
  for (const [pattern, replacement] of corrections) output = output.replace(pattern, replacement);
  return output;
}

function stripDuplicateTitle(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  const firstContentIndex = lines.findIndex(line => line.trim());
  if (firstContentIndex < 0) return markdown;
  const match = lines[firstContentIndex].match(/^#\s+(.+)$/);
  if (!match) return markdown;
  const normalize = value => value.toLowerCase().replace(/[\s_\-—、，。:：()（）]/g, '');
  if (normalize(match[1]) === normalize(title)) lines.splice(firstContentIndex, 1);
  return lines.join('\n');
}

function shiftHeadings(markdown) {
  return markdown.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => `${'#'.repeat(Math.min(6, hashes.length + 3))} ${title}`);
}

function rewriteRawHtmlImages(markdown, sourceFile) {
  return markdown.replace(/<img\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>/gi, (whole, before, quote, source, after) => {
    const mapped = copyImage(sourceFile, source);
    if (!mapped) {
      unresolvedImages.push({ sourceFile, reference: source });
      return `<span class="missing-media">图片资源未找到：${escapeHtml(path.basename(cleanImageReference(source)))}</span>`;
    }
    return `<img${before}src=${quote}${escapeHtml(mapped.url)}${quote}${after} loading="lazy" decoding="async">`;
  });
}

function renderMarkdown(sourceFile, title) {
  activeSourceFile = sourceFile;
  let markdown = fs.readFileSync(sourceFile, 'utf8');
  markdown = applyCorrections(markdown);
  markdown = stripDuplicateTitle(markdown, title);
  markdown = shiftHeadings(markdown);
  markdown = rewriteRawHtmlImages(markdown, sourceFile);
  let html = md.render(markdown);
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  return html;
}

function sourceFilesForPage(page) {
  const files = [];
  for (const source of page.sources) {
    const dir = path.join(sourceRoot, source);
    files.push(...walkFiles(dir, file => /\.(md|txt)$/i.test(file)));
  }
  for (const rootFile of page.rootFiles || []) {
    const full = path.join(sourceRoot, rootFile);
    if (fs.existsSync(full)) files.push(full);
  }
  return files.sort((a, b) => naturalCompare(path.relative(sourceRoot, a), path.relative(sourceRoot, b)));
}

function documentLabel(page, sourceFile) {
  const relative = path.relative(sourceRoot, sourceFile);
  const parts = relative.split(path.sep);
  const base = path.basename(sourceFile, path.extname(sourceFile));
  if (page.sources.length > 1 || parts.length > 2) {
    const parents = parts.slice(1, -1).join(' / ');
    return parents ? `${parents} / ${base}` : base;
  }
  return base;
}

function plainSearchText(markdown) {
  return applyCorrections(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~|\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageFilename(page) {
  return `${page.number}-${page.slug}.html`;
}

function buildPage(page, pageIndex, searchItems) {
  const files = sourceFilesForPage(page);
  const cards = [];
  const navItems = [];
  let pageImageCount = 0;

  files.forEach((sourceFile, index) => {
    const title = path.basename(sourceFile, path.extname(sourceFile));
    const label = documentLabel(page, sourceFile);
    const id = `sec-${page.number}-${String(index + 1).padStart(2, '0')}`;
    const html = renderMarkdown(sourceFile, title);
    const imageCount = (assetUsageByDoc.get(sourceFile) || new Set()).size;
    pageImageCount += imageCount;
    const relativeSource = path.relative(sourceRoot, sourceFile).replace(/\\/g, '/');

    navItems.push(`<li><a href="#${id}" title="${escapeHtml(label)}">${escapeHtml(label)}</a></li>`);
    cards.push(`
      <article class="file-card${index === 0 ? '' : ' collapsed'}" id="${id}" data-source="${escapeHtml(relativeSource)}">
        <div class="file-card-header" role="button" tabindex="0" aria-expanded="${index === 0 ? 'true' : 'false'}">
          <div class="card-title-group"><span class="card-icon">${page.icon}</span><div><h3>${escapeHtml(title)}</h3><span class="source-path">${escapeHtml(relativeSource)}</span></div></div>
          <div class="card-meta"><button class="bookmark-btn" type="button" data-bookmark-title="${escapeHtml(title)}" data-bookmark-page="${escapeHtml(page.title)}" data-bookmark-href="${pageFilename(page)}#${id}" data-bookmark-source="${escapeHtml(relativeSource)}" title="收藏笔记" aria-label="收藏笔记">☆</button><span>${imageCount ? `${imageCount} 图` : '纯文本'}</span><span class="toggle-icon">▼</span></div>
        </div>
        <div class="file-card-body">${html}</div>
      </article>`);

    const raw = fs.readFileSync(sourceFile, 'utf8');
    searchItems.push({
      page: page.title,
      title,
      source: relativeSource,
      href: `${pageFilename(page)}#${id}`,
      text: plainSearchText(raw)
    });
  });

  for (const [attachmentIndex, attachment] of (page.attachments || []).entries()) {
    const source = path.join(sourceRoot, attachment);
    if (!fs.existsSync(source)) continue;
    const extension = path.extname(attachment);
    const outputName = `course-review${extension.toLowerCase()}`;
    if (!verifyOnly) fs.copyFileSync(source, path.join(downloadsDir, outputName));
    const id = `sec-${page.number}-attachment-${attachmentIndex + 1}`;
    navItems.push(`<li><a href="#${id}">${escapeHtml(attachment)}</a></li>`);
    cards.push(`
      <article class="file-card collapsed" id="${id}" data-source="${escapeHtml(attachment)}">
        <div class="file-card-header" role="button" tabindex="0" aria-expanded="false">
          <div class="card-title-group"><span class="card-icon">↓</span><div><h3>${escapeHtml(attachment)}</h3><span class="source-path">${escapeHtml(attachment)}</span></div></div>
          <div class="card-meta"><button class="bookmark-btn" type="button" data-bookmark-title="${escapeHtml(attachment)}" data-bookmark-page="${escapeHtml(page.title)}" data-bookmark-href="${pageFilename(page)}#${id}" data-bookmark-source="${escapeHtml(attachment)}" title="收藏资料" aria-label="收藏资料">☆</button><span>原始附件</span><span class="toggle-icon">▼</span></div>
        </div>
        <div class="file-card-body"><h4>课程复习思维导图</h4><p>保留原始 XMind 文件，可下载后使用 XMind 或兼容软件打开。</p><p><a class="download-link" href="assets/downloads/${outputName}" download>下载 ${escapeHtml(attachment)}</a></p></div>
      </article>`);
  }

  const previous = pages[(pageIndex - 1 + pages.length) % pages.length];
  const next = pages[(pageIndex + 1) % pages.length];
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(page.description)}">
  <title>${page.number} ${escapeHtml(page.title)} - 云计算运维课程知识库</title>
  <link rel="stylesheet" href="common.css">
</head>
<body data-generated="true">
  <div class="topbar">
    <span class="title"><span class="num" style="background:${page.color}">${page.number}</span>${escapeHtml(page.title)}</span>
    <div class="search-box-wrap"><input class="search-box" type="search" placeholder="搜索本页… (Ctrl+K)" aria-label="搜索本页"></div>
    <div class="nav-btns"><a href="${pageFilename(previous)}" title="上一主题">←</a><a href="${pageFilename(next)}" title="下一主题">→</a></div>
  </div>
  <header class="page-header">
    <h1>${page.number} ${escapeHtml(page.title)}</h1>
    <p class="desc">${escapeHtml(page.description)}</p>
  </header>
  <div class="page-wrap">
    <nav class="sidebar" id="sidebar" aria-label="本页笔记目录">
      <div class="side-title">本页导航 <span>${files.length + (page.attachments || []).length}</span></div>
      <ul>${navItems.join('')}</ul>
    </nav>
    <main class="content">${cards.join('')}</main>
  </div>
  <script src="common.js"></script>
</body>
</html>`;

  if (!verifyOnly) fs.writeFileSync(path.join(siteRoot, pageFilename(page)), html, 'utf8');
  return { files: files.length, images: pageImageCount, filename: pageFilename(page) };
}

function buildIndex(pageStats, searchItems) {
  const cards = pages.map((page, index) => {
    const stats = pageStats[index];
    return `<a class="subject-card" href="${pageFilename(page)}" data-search="${escapeHtml(`${page.title} ${page.description}`)}">
      <span class="subject-accent" style="background:${page.color}"></span>
      <div class="subject-head"><span class="subject-num">${page.number}</span><span class="subject-icon">${page.icon}</span></div>
      <h2>${escapeHtml(page.title)}</h2>
      <p>${escapeHtml(page.description)}</p>
      <div class="subject-stats"><span>${stats.files} 篇</span><span>${stats.images} 图</span></div>
      <span class="subject-link">进入主题 →</span>
    </a>`;
  }).join('');

  const searchJson = JSON.stringify(searchItems).replace(/</g, '\\u003c');
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="云计算运维课程离线知识库，内容与项目内原始 Markdown 笔记和图片同步。">
  <title>云计算运维课程知识库</title>
  <link rel="stylesheet" href="common.css">
</head>
<body class="home-page">
  <button class="home-theme-toggle" type="button" aria-label="切换深色模式" title="切换深色模式">◐</button>
  <header class="home-hero">
    <div class="home-hero-inner">
      <h1>云计算运维课程知识库</h1>
      <div class="home-search-wrap">
        <span aria-hidden="true">⌕</span>
        <input id="global-search" type="search" placeholder="搜索 Linux、MySQL、Zabbix、Docker、K8S…" autocomplete="off" aria-label="搜索全部笔记">
        <kbd>Ctrl K</kbd>
        <div class="global-search-results" id="global-search-results" role="listbox"></div>
      </div>
    </div>
  </header>
  <main class="home-main">
    <section class="personal-section" id="personal-section" hidden></section>
    <section class="home-section-head"><h2>知识主题</h2></section>
    <section class="subject-grid" id="subject-grid">${cards}</section>
  </main>
  <script>window.__SEARCH_INDEX__=${searchJson};</script>
  <script src="home.js"></script>
</body>
</html>`;
  if (!verifyOnly) fs.writeFileSync(path.join(siteRoot, 'index.html'), html, 'utf8');
}

function verifyOutput(pageStats) {
  const problems = [];
  const expectedPages = ['index.html', ...pageStats.map(item => item.filename), 'common.css', 'common.js', 'home.js'];
  for (const file of expectedPages) {
    if (!fs.existsSync(path.join(siteRoot, file))) problems.push(`缺少文件：${file}`);
  }

  for (const item of pageStats) {
    const pagePath = path.join(siteRoot, item.filename);
    if (!fs.existsSync(pagePath)) continue;
    const html = fs.readFileSync(pagePath, 'utf8');
    if (/src=["']images\//i.test(html)) problems.push(`${item.filename} 仍含旧 images/ 路径`);
    const mediaRefs = [...html.matchAll(/src=["'](assets\/media\/[^"']+)["']/g)].map(match => match[1]);
    for (const ref of mediaRefs) {
      if (!fs.existsSync(path.join(siteRoot, ...ref.split('/')))) problems.push(`${item.filename} 缺少资源：${ref}`);
    }
  }

  if (unresolvedImages.length) {
    for (const item of unresolvedImages) {
      problems.push(`未解析图片：${path.relative(sourceRoot, item.sourceFile)} -> ${item.reference}`);
    }
  }

  const expectedKnowledgeFiles = allSourceFiles
    .filter(file => /\.(md|txt)$/i.test(file))
    .map(file => path.resolve(file));
  const includedKnowledgeFiles = pages
    .flatMap(page => sourceFilesForPage(page))
    .map(file => path.resolve(file));
  const includedSet = new Set(includedKnowledgeFiles);
  for (const file of expectedKnowledgeFiles) {
    if (!includedSet.has(file)) problems.push(`原始笔记未收录：${path.relative(sourceRoot, file)}`);
  }

  for (const page of pages) {
    for (const attachment of page.attachments || []) {
      const extension = path.extname(attachment).toLowerCase();
      const outputName = `course-review${extension}`;
      if (!fs.existsSync(path.join(downloadsDir, outputName))) problems.push(`缺少附件副本：${attachment}`);
    }
  }

  return problems;
}

function main() {
  assertSafeMediaDirectory();
  if (!verifyOnly) {
    fs.rmSync(mediaDir, { recursive: true, force: true });
    fs.rmSync(downloadsDir, { recursive: true, force: true });
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  const searchItems = [];
  const pageStats = pages.map((page, index) => buildPage(page, index, searchItems));
  buildIndex(pageStats, searchItems);
  const problems = verifyOutput(pageStats);
  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot,
    topics: pages.length,
    documents: searchItems.length,
    imageReferencesCopied: copiedAssets.size,
    unresolvedImages: unresolvedImages.length,
    correctionRules: corrections.length,
    pages: pages.map((page, index) => ({ title: page.title, ...pageStats[index] })),
    problems
  };

  if (!verifyOnly) fs.writeFileSync(path.join(siteRoot, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (problems.length) process.exitCode = 1;
}

main();
