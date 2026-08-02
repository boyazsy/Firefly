/* 青柚 · Firefly 后台 —— 纯前端管理台，对接 GitHub REST API
 * 无后端、无数据库；所有写操作通过 GitHub Contents API 提交到仓库。
 */
(function () {
  "use strict";

  // ---------- 常量 / 状态 ----------
  var DEFAULT_ADMIN_PASS = "qingyouadmin";
  var API = "https://api.github.com";
  var state = {
    repo: localStorage.getItem("ff_repo") || "boyazsy/Firefly",
    branch: localStorage.getItem("ff_branch") || "master",
    token: localStorage.getItem("ff_token") || "",
    adminPassB64: b64u(DEFAULT_ADMIN_PASS),
    tree: null,
    posts: [],
    operators: [],
    configRaw: "",
    configSha: "",
  };

  // ---------- 工具 ----------
  function $(id) { return document.getElementById(id); }
  function b64u(str) { // utf8 -> base64
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function ub64(b64) { // base64 -> utf8
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
    return new TextDecoder().decode(bytes);
  }
  function esc(s) { return (s == null ? "" : String(s)).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  var toastTimer;
  function toast(msg, type) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (type ? " " + type : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- GitHub API ----------
  function headers(extra) {
    var h = { "Accept": "application/vnd.github+json" };
    if (state.token) h["Authorization"] = "Bearer " + state.token;
    if (extra) Object.assign(h, extra);
    return h;
  }
  function gh(path, opts) {
    opts = opts || {};
    return fetch(API + path, { method: opts.method || "GET", headers: headers(opts.headers), body: opts.body })
      .then(function (r) {
        var ct = r.headers.get("content-type") || "";
        var p = ct.indexOf("application/json") >= 0 ? r.json() : r.text();
        return p.then(function (data) {
          if (!r.ok) {
            var msg = (data && (data.message || data.error)) || ("HTTP " + r.status);
            var err = new Error(msg);
            err.status = r.status;
            throw err;
          }
          return data;
        });
      });
  }
  function getFile(path) {
    return gh("/repos/" + state.repo + "/contents/" + path + "?ref=" + state.branch)
      .then(function (d) { return { content: ub64(d.content), sha: d.sha }; });
  }
  function putFile(path, content, sha, message) {
    var body = { message: message, content: b64u(content), branch: state.branch };
    if (sha) body.sha = sha;
    return gh("/repos/" + state.repo + "/contents/" + path, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  function deleteFile(path, sha, message) {
    return gh("/repos/" + state.repo + "/contents/" + path, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, sha: sha, branch: state.branch }),
    });
  }
  function getTree() {
    return gh("/repos/" + state.repo + "/git/trees/" + state.branch + "?recursive=1")
      .then(function (d) { return d.tree || []; });
  }

  // ---------- frontmatter ----------
  function parseFrontmatter(raw) {
    var m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {}, body: raw };
    var fm = m[1], body = m[2], data = {};
    fm.split(/\r?\n/).forEach(function (line) {
      var mm = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (!mm) return;
      var k = mm[1], v = mm[2].trim();
      if (v === "") { data[k] = ""; return; }
      if (v[0] === "[") {
        var inner = v.slice(1, -1).trim();
        data[k] = inner ? inner.split(",").map(function (s) { return unq(s.trim()); }) : [];
      } else if (v === "true") data[k] = true;
      else if (v === "false") data[k] = false;
      else if (/^-?\d+(\.\d+)?$/.test(v)) data[k] = Number(v);
      else data[k] = unq(v);
    });
    return { data: data, body: body };
  }
  function unq(s) {
    if ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'")) {
      try { return JSON.parse(s); } catch (e) { return s.slice(1, -1); }
    }
    return s;
  }
  function buildPostFrontmatter(d) {
    var lines = ["---"];
    lines.push('title: ' + JSON.stringify(d.title || "未命名文章"));
    lines.push("published: " + (d.published || new Date().toISOString().slice(0, 10)));
    lines.push("description: " + JSON.stringify(d.description || (d.body || "").slice(0, 60) || d.title));
    if (d.image) lines.push("image: " + JSON.stringify(d.image));
    if (d.tags && d.tags.length) lines.push("tags: [" + d.tags.map(function (t) { return JSON.stringify(t); }).join(", ") + "]");
    if (d.category) lines.push("category: " + JSON.stringify(d.category));
    lines.push("draft: " + (d.draft ? "true" : "false"));
    lines.push("---");
    lines.push("");
    lines.push(d.body || "");
    return lines.join("\n");
  }
  function slugify(s) {
    return (s || "").toString().toLowerCase().trim()
      .replace(/[\s]+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "")
      .replace(/-+/g, "-").replace(/^-|-$/g, "") || "untitled";
  }
  function wordCount(body) {
    var cjk = (body.match(/[一-鿿]/g) || []).length;
    var en = (body.replace(/[一-鿿]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
    return cjk + en;
  }

  // ---------- TS 字段替换（缩进感知） ----------
  // 匹配首个 key:（允许缩进，保留原缩进），用于 siteConfig 内缩进的顶层字段
  function setTopLevel(raw, key, render) {
    var lines = raw.split("\n"), replaced = false;
    for (var i = 0; i < lines.length; i++) {
      var mm = lines[i].match(/^(\s*)([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (mm && mm[2] === key) {
        lines[i] = mm[1] + key + ": " + render();
        replaced = true; break;
      }
    }
    if (!replaced) lines.push(key + ": " + render());
    return lines.join("\n");
  }
  // 进入 parent 块（按缩进判定）后，替换其内部的 key:
  function setNested(raw, parent, key, render) {
    var lines = raw.split("\n"), out = [], inBlock = false, pdepth = 0;
    for (var i = 0; i < lines.length; i++) {
      var ind = (lines[i].match(/^(\s*)/) || ["", ""])[1].length;
      if (!inBlock) {
        var pm = lines[i].match(/^(\s*)([A-Za-z0-9_]+)\s*:/);
        if (pm && pm[2] === parent) { inBlock = true; pdepth = pm[1].length; out.push(lines[i]); continue; }
        out.push(lines[i]); continue;
      }
      if (ind <= pdepth) { inBlock = false; out.push(lines[i]); continue; }
      var km = lines[i].match(/^(\s*)([A-Za-z0-9_]+)\s*:\s*(.*)$/);
      if (km && km[2] === key) { out.push(km[1] + key + ": " + render()); }
      else out.push(lines[i]);
    }
    return out.join("\n");
  }
  function renderStr(v) { return JSON.stringify(v == null ? "" : String(v)); }
  function renderArr(arr) { return "[" + (arr || []).map(renderStr).join(", ") + "]"; }
  function renderBool(b) { return b ? "true" : "false"; }

  // ---------- 密码门 ----------
  function initGate() {
    // 尝试读取仓库中的 auth.json（若存在则覆盖默认密码）
    gh("/repos/" + state.repo + "/contents/.firefly-admin/auth.json?ref=" + state.branch)
      .then(function (d) { state.adminPassB64 = d.content ? b64u(ub64(d.content)) : state.adminPassB64; })
      .catch(function () {});
    $("gate-btn").addEventListener("click", unlock);
    $("gate-input").addEventListener("keydown", function (e) { if (e.key === "Enter") unlock(); });
  }
  function unlock() {
    var v = $("gate-input").value;
    if (b64u(v) === state.adminPassB64) {
      sessionStorage.setItem("ff_gate_ok", "1");
      $("gate").hidden = true;
      $("app").hidden = false;
      boot();
    } else {
      $("gate-error").textContent = "密码错误";
    }
  }

  // ---------- 启动 ----------
  function boot() {
    $("repo-label").textContent = state.repo + "@" + state.branch;
    updateTokenStatus();
    bindTabs();
    bindUsers();
    bindConfig();
    bindPosts();
    bindStats();
    if (sessionStorage.getItem("ff_gate_ok") === "1") loadAll();
  }
  function updateTokenStatus() {
    var el = $("token-status");
    if (state.token) { el.textContent = "Token 已配置"; el.className = "pill pill-ok"; }
    else { el.textContent = "未配置 Token"; el.className = "pill pill-warn"; }
  }
  function loadAll() {
    getTree().then(function (tree) {
      state.tree = tree;
      state.posts = tree.filter(function (n) { return /^src\/content\/posts\/.+\.(md|markdown)$/.test(n.path); });
      renderDashboard();
      renderPosts();
      renderStats();
    }).catch(function (e) {
      toast("读取仓库失败：" + e.message, "err");
      $("posts-status").textContent = "错误：" + e.message + "（请检查 Token / 仓库权限）";
    });
  }

  // ---------- tabs ----------
  function bindTabs() {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var tab = btn.getAttribute("data-tab");
        document.querySelectorAll(".view").forEach(function (v) { v.hidden = true; });
        $("view-" + tab).hidden = false;
        if (tab === "dashboard") renderDashboard();
        if (tab === "posts") renderPosts();
        if (tab === "stats") renderStats();
        if (tab === "config") loadConfig();
      });
    });
    document.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-go");
        document.querySelector('.tab[data-tab="' + t + '"]').click();
      });
    });
    $("btn-logout").addEventListener("click", function () {
      sessionStorage.removeItem("ff_gate_ok");
      location.reload();
    });
  }

  // ---------- 概览 ----------
  function renderDashboard() {
    var posts = state.posts;
    var drafts = 0, words = 0;
    posts.forEach(function (n) { /* 计字数需读内容，概览仅统计篇数，详细在 stats */ });
    var cards = [
      { num: posts.length, lbl: "文章总数", accent: true },
      { num: state.operators.length || "—", lbl: "操作员" },
      { num: state.token ? "已配置" : "未配置", lbl: "GitHub Token" },
      { num: state.branch, lbl: "分支" },
    ];
    $("dash-cards").innerHTML = cards.map(function (c) {
      return '<div class="bento' + (c.accent ? " accent" : "") + '"><div class="num">' + esc(c.num) + '</div><div class="lbl">' + esc(c.lbl) + "</div></div>";
    }).join("");
    $("dash-repo").innerHTML =
      '<div class="k">仓库</div><div>' + esc(state.repo) + "</div>" +
      '<div class="k">分支</div><div>' + esc(state.branch) + "</div>" +
      '<div class="k">文章路径</div><div>src/content/posts/</div>' +
      '<div class="k">配置路径</div><div>src/config/</div>';
  }

  // ---------- 内容管理 ----------
  var editingPath = null;
  function bindPosts() {
    $("btn-new-post").addEventListener("click", function () { openPostModal(null); });
    $("btn-refresh-posts").addEventListener("click", loadAll);
    $("posts-search").addEventListener("input", renderPosts);
    $("pm-cancel").addEventListener("click", closePostModal);
    $("pm-save").addEventListener("click", savePost);
    $("pm-delete").addEventListener("click", deletePost);
    $("pm-body").addEventListener("input", renderPreview);
    var t;
    $("pm-title").addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!editingPath) $("pm-slug").value = slugify($("pm-title").value);
      }, 300);
    });
  }
  function renderPosts() {
    var q = ($("posts-search").value || "").toLowerCase();
    var list = state.posts.filter(function (n) { return true; });
    // 需要 frontmatter，先并行拉取（已读取的内容做缓存）
    $("posts-status").textContent = "加载文章列表…";
    Promise.all(list.map(function (n) {
      return getFile(n.path).then(function (f) {
        var fm = parseFrontmatter(f.content);
        return { path: n.path, name: n.path.split("/").pop(), fm: fm, sha: f.sha };
      }).catch(function () { return { path: n.path, name: n.path.split("/").pop(), fm: { data: {}, body: "" }, sha: null }; });
    })).then(function (items) {
      items.sort(function (a, b) { return (b.fm.data.published || "") > (a.fm.data.published || "") ? 1 : -1; });
      state._postCache = {};
      items.forEach(function (it) { state._postCache[it.path] = it; });
      var filtered = items.filter(function (it) {
        if (!q) return true;
        var d = it.fm.data;
        return (d.title || "").toLowerCase().indexOf(q) >= 0 ||
          (d.tags || []).join(",").toLowerCase().indexOf(q) >= 0 ||
          (d.category || "").toLowerCase().indexOf(q) >= 0;
      });
      $("posts-status").textContent = "共 " + items.length + " 篇" + (q ? "，匹配 " + filtered.length + " 篇" : "");
      $("posts-list").innerHTML = filtered.map(function (it) {
        var d = it.fm.data;
        var tags = (d.tags || []).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
        return '<div class="post-item">' +
          '<div class="pi-main">' +
            '<div class="pi-title">' + esc(d.title || it.name) +
              (d.draft ? '<span class="badge-draft">草稿</span>' : "") + "</div>" +
            '<div class="pi-meta">' + esc(d.published || "") + " · " + esc(d.category || "未分类") + (tags ? " · " + stripTags(tags) : "") + "</div>" +
          "</div>" +
          '<div class="pi-actions">' +
            '<button class="btn-ghost" data-edit="' + esc(it.path) + '">编辑</button>' +
            '<button class="btn-ghost" data-copy="' + esc(it.path) + '">复制</button>' +
          "</div></div>";
      }).join("") || '<p class="muted">暂无文章</p>';

      document.querySelectorAll("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () { openPostModal(b.getAttribute("data-edit")); });
      });
      document.querySelectorAll("[data-copy]").forEach(function (b) {
        b.addEventListener("click", function () {
          var it = state._postCache[b.getAttribute("data-copy")];
          var content = buildPostFrontmatter(Object.assign({}, it.fm.data, { title: (it.fm.data.title || "未命名") + "（副本）", draft: true })) + "\n" + it.fm.body;
          download((it.name.replace(/\.md$/, "") + "-copy.md"), content);
        });
      });
    }).catch(function (e) {
      $("posts-status").textContent = "加载失败：" + e.message;
    });
  }
  function stripTags(s) { var d = document.createElement("div"); d.innerHTML = s; return d.textContent; }
  function download(name, content) {
    var blob = new Blob([content], { type: "text/markdown" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  }
  function openPostModal(path) {
    editingPath = path;
    var it = path ? state._postCache[path] : null;
    $("pm-title2").textContent = path ? "编辑文章" : "新建文章";
    $("pm-status").textContent = "";
    if (it) {
      var d = it.fm.data;
      $("pm-title").value = d.title || "";
      $("pm-slug").value = path.split("/").pop().replace(/\.(md|markdown)$/, "");
      $("pm-tags").value = (d.tags || []).join(", ");
      $("pm-category").value = d.category || "";
      $("pm-date").value = (d.published || "").slice(0, 10);
      $("pm-cover").value = d.image || "";
      $("pm-draft").checked = !!d.draft;
      $("pm-body").value = it.fm.body || "";
      $("pm-delete").style.display = "";
    } else {
      $("pm-title").value = ""; $("pm-slug").value = ""; $("pm-tags").value = "";
      $("pm-category").value = ""; $("pm-date").value = new Date().toISOString().slice(0, 10);
      $("pm-cover").value = ""; $("pm-draft").checked = false; $("pm-body").value = "";
      $("pm-delete").style.display = "none";
    }
    renderPreview();
    $("post-modal").hidden = false;
  }
  function closePostModal() { $("post-modal").hidden = true; editingPath = null; }
  function renderPreview() {
    var src = $("pm-body").value || "";
    try {
      $("pm-preview").innerHTML = window.marked ? window.marked.parse(src) : "<pre>" + esc(src) + "</pre>";
    } catch (e) { $("pm-preview").textContent = src; }
  }
  function savePost() {
    var title = $("pm-title").value.trim();
    if (!title) { $("pm-status").textContent = "请填写标题"; return; }
    var slug = slugify($("pm-slug").value) || slugify(title);
    var tags = $("pm-tags").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var d = {
      title: title,
      published: $("pm-date").value || new Date().toISOString().slice(0, 10),
      description: ($("pm-body").value || "").slice(0, 60),
      image: $("pm-cover").value.trim(),
      tags: tags,
      category: $("pm-category").value.trim(),
      draft: $("pm-draft").checked,
      body: $("pm-body").value,
    };
    var content = buildPostFrontmatter(d);
    var path = "src/content/posts/" + slug + ".md";
    var it = editingPath ? state._postCache[editingPath] : null;
    var sha = it ? it.sha : null;
    $("pm-save").disabled = true;
    putFile(path, content, sha, (editingPath ? "Update" : "Add") + " post: " + title)
      .then(function () {
        toast("已保存：" + path, "ok");
        closePostModal();
        loadAll();
      })
      .catch(function (e) { $("pm-status").textContent = "保存失败：" + e.message; toast("保存失败：" + e.message, "err"); })
      .then(function () { $("pm-save").disabled = false; });
  }
  function deletePost() {
    if (!editingPath) return;
    if (!confirm("确认删除该文章？此操作不可恢复。")) return;
    var it = state._postCache[editingPath];
    deleteFile(editingPath, it.sha, "Delete post: " + it.name)
      .then(function () { toast("已删除", "ok"); closePostModal(); loadAll(); })
      .catch(function (e) { toast("删除失败：" + e.message, "err"); });
  }

  // ---------- 站点配置 ----------
  function bindConfig() {
    $("cfg-reload").addEventListener("click", loadConfig);
    $("cfg-save").addEventListener("click", saveConfig);
    $("cfg-raw-save").addEventListener("click", saveConfigRaw);
  }
  function loadConfig() {
    $("cfg-status").textContent = "读取 siteConfig.ts…";
    getFile("src/config/siteConfig.ts").then(function (f) {
      state.configRaw = f.content; state.configSha = f.sha;
      prefillConfig(f.content);
      $("cfg-raw").value = f.content;
      $("cfg-status").textContent = "已读取";
    }).catch(function (e) { $("cfg-status").textContent = "读取失败：" + e.message; });
  }
  function readTsField(raw, key) {
    var m = raw.match(new RegExp("^\\s*" + escapeRe(key) + "\\s*:\\s*([^\\n]*)", "m"));
    return m ? m[1].trim().replace(/,\s*$/, "") : "";
  }
  function prefillConfig(raw) {
    $("cfg-title").value = unq(readTsField(raw, "title")) || "";
    $("cfg-subtitle").value = unq(readTsField(raw, "subtitle")) || "";
    $("cfg-description").value = unq(readTsField(raw, "description")) || "";
    $("cfg-lang").value = (unq(readTsField(raw, "lang")) || "zh_CN");
    $("cfg-keywords").value = (unq(readTsField(raw, "keywords")) || "").replace(/^\[|\]$/g, "");
    // 嵌套字段
    var hueM = raw.match(/themeColor[\s\S]*?hue\s*:\s*(\d+)/);
    $("cfg-hue").value = hueM ? hueM[1] : "";
    var modeM = raw.match(/themeColor[\s\S]*?defaultMode\s*:\s*"(\w+)"/);
    $("cfg-mode").value = modeM ? modeM[1] : "system";
    var pwM = raw.match(/pageWidth\s*:\s*(\d+)/);
    $("cfg-pagewidth").value = pwM ? pwM[1] : "";
    var cbM = raw.match(/card\s*:\s*\{[^}]*?border\s*:\s*(true|false)/);
    $("cfg-cardborder").checked = cbM ? cbM[1] === "true" : false;
    var cfM = raw.match(/card\s*:\s*\{[^}]*?followTheme\s*:\s*(true|false)/);
    $("cfg-cardfollow").checked = cfM ? cfM[1] === "true" : false;
    var nsM = raw.match(/navbar\s*:\s*\{[^}]*?stickyNavbar\s*:\s*(true|false)/);
    $("cfg-navsticky").checked = nsM ? nsM[1] === "true" : false;
    var ntM = raw.match(/navbar\s*:\s*\{[^}]*?title\s*:\s*"([^"]*)"/);
    $("cfg-navtitle").value = ntM ? ntM[1] : "";
    var naM = raw.match(/navbar\s*:\s*\{[^}]*?menuAlign\s*:\s*"(\w+)"/);
    $("cfg-navalign").value = naM ? naM[1] : "center";
  }
  function saveConfig() {
    var raw = state.configRaw;
    raw = setTopLevel(raw, "title", function () { return renderStr($("cfg-title").value); });
    raw = setTopLevel(raw, "subtitle", function () { return renderStr($("cfg-subtitle").value); });
    raw = setTopLevel(raw, "description", function () { return renderStr($("cfg-description").value); });
    raw = setTopLevel(raw, "lang", function () { return renderStr($("cfg-lang").value); });
    raw = setTopLevel(raw, "keywords", function () { return renderArr($("cfg-keywords").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean)); });
    raw = setNested(raw, "themeColor", "hue", function () { return String($("cfg-hue").value || 0); });
    raw = setNested(raw, "themeColor", "defaultMode", function () { return renderStr($("cfg-mode").value); });
    raw = setTopLevel(raw, "pageWidth", function () { return String($("cfg-pagewidth").value || 100); });
    raw = setNested(raw, "card", "border", function () { return renderBool($("cfg-cardborder").checked); });
    raw = setNested(raw, "card", "followTheme", function () { return renderBool($("cfg-cardfollow").checked); });
    raw = setNested(raw, "navbar", "title", function () { return renderStr($("cfg-navtitle").value); });
    raw = setNested(raw, "navbar", "menuAlign", function () { return renderStr($("cfg-navalign").value); });
    raw = setNested(raw, "navbar", "stickyNavbar", function () { return renderBool($("cfg-navsticky").checked); });
    putFile("src/config/siteConfig.ts", raw, state.configSha, "Update site config via 后台")
      .then(function () { state.configRaw = raw; $("cfg-raw").value = raw; toast("配置已保存", "ok"); $("cfg-status").textContent = "已保存"; })
      .catch(function (e) { toast("保存失败：" + e.message, "err"); $("cfg-status").textContent = "失败：" + e.message; });
  }
  function saveConfigRaw() {
    var raw = $("cfg-raw").value;
    putFile("src/config/siteConfig.ts", raw, state.configSha, "Update siteConfig.ts (raw) via 后台")
      .then(function () { state.configRaw = raw; toast("原始配置已保存", "ok"); })
      .catch(function (e) { toast("保存失败：" + e.message, "err"); });
  }

  // ---------- 用户与权限 ----------
  function bindUsers() {
    $("usr-repo").value = state.repo;
    $("usr-branch").value = state.branch;
    $("usr-token").value = state.token;
    $("usr-token-save").addEventListener("click", function () {
      state.token = $("usr-token").value.trim();
      localStorage.setItem("ff_token", state.token);
      updateTokenStatus();
      loadAuthAndOps();
      $("usr-token-status").textContent = state.token ? "已保存" : "已清除";
      toast("Token 已保存", "ok");
    });
    $("usr-token-clear").addEventListener("click", function () {
      state.token = ""; localStorage.removeItem("ff_token");
      $("usr-token").value = ""; updateTokenStatus();
      $("usr-token-status").textContent = "已清除";
    });
    $("usr-save-repo").addEventListener("click", function () {
      state.repo = $("usr-repo").value.trim(); state.branch = $("usr-branch").value.trim();
      localStorage.setItem("ff_repo", state.repo); localStorage.setItem("ff_branch", state.branch);
      $("repo-label").textContent = state.repo + "@" + state.branch;
      toast("仓库配置已保存", "ok");
    });
    $("usr-pass-set").addEventListener("click", function () {
      var np = $("usr-pass-new").value;
      if (!np) { $("usr-pass-status").textContent = "请输入新密码"; return; }
      var content = JSON.stringify({ adminPassB64: b64u(np), updatedAt: new Date().toISOString() }, null, 2);
      putFile(".firefly-admin/auth.json", content, state._authSha || null, "Update admin password")
        .then(function (d) { state.adminPassB64 = b64u(np); state._authSha = d.sha || state._authSha; $("usr-pass-status").textContent = "密码已修改，下次用新密码登录"; toast("密码已修改", "ok"); })
        .catch(function (e) { $("usr-pass-status").textContent = "失败：" + e.message; });
    });
    $("usr-op-add").addEventListener("click", function () {
      var v = $("usr-op-input").value.trim();
      if (!v) return;
      if (state.operators.indexOf(v) < 0) state.operators.push(v);
      $("usr-op-input").value = "";
      saveOperators();
    });
    loadAuthAndOps();
  }
  function loadAuthAndOps() {
    getFile(".firefly-admin/auth.json").then(function (f) {
      try { var j = JSON.parse(f.content); if (j.adminPassB64) state.adminPassB64 = j.adminPassB64; } catch (e) {}
      state._authSha = f.sha;
    }).catch(function () {});
    getFile(".firefly-admin/operators.json").then(function (f) {
      try { state.operators = JSON.parse(f.content).operators || []; } catch (e) { state.operators = []; }
      state._opSha = f.sha; renderOperators();
    }).catch(function () { state.operators = []; renderOperators(); });
  }
  function renderOperators() {
    $("usr-operators").innerHTML = state.operators.map(function (o) {
      return '<span class="op-item">' + esc(o) + '<button data-op="' + esc(o) + '">✕</button></span>';
    }).join("") || '<span class="muted">暂无操作员</span>';
    document.querySelectorAll("[data-op]").forEach(function (b) {
      b.addEventListener("click", function () {
        var o = b.getAttribute("data-op");
        state.operators = state.operators.filter(function (x) { return x !== o; });
        saveOperators();
      });
    });
  }
  function saveOperators() {
    var content = JSON.stringify({ operators: state.operators }, null, 2);
    putFile(".firefly-admin/operators.json", content, state._opSha || null, "Update operators")
      .then(function (d) { state._opSha = d.sha || state._opSha; renderOperators(); renderDashboard(); toast("操作员已保存", "ok"); })
      .catch(function (e) { toast("保存失败：" + e.message, "err"); });
  }

  // ---------- 数据与互动 ----------
  function bindStats() {
    $("umami-load").addEventListener("click", loadUmami);
  }
  function renderStats() {
    var paths = state.posts;
    $("stats-cards").innerHTML = '<div class="bento accent"><div class="num">' + paths.length + '</div><div class="lbl">文章总数</div></div>' +
      '<div class="bento"><div class="num">—</div><div class="lbl">总字数（读内容计算）</div></div>' +
      '<div class="bento"><div class="num">—</div><div class="lbl">草稿</div></div>' +
      '<div class="bento"><div class="num">' + state.operators.length + '</div><div class="lbl">操作员</div></div>';
    // 标签 / 分类聚合
    Promise.all(paths.slice(0, 60).map(function (n) {
      return getFile(n.path).then(function (f) { return parseFrontmatter(f.content).data; }).catch(function () { return {}; });
    })).then(function (datas) {
      var tags = {}, cats = {}, words = 0, drafts = 0;
      datas.forEach(function (d) {
        (d.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
        if (d.category) cats[d.category] = (cats[d.category] || 0) + 1;
        if (d.draft) drafts++;
      });
      $("stats-tags").innerHTML = Object.keys(tags).length ? Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).map(function (t) { return '<span class="chip">' + esc(t) + " · " + tags[t] + "</span>"; }).join("") : '<span class="muted">暂无标签</span>';
      $("stats-cats").innerHTML = Object.keys(cats).length ? Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; }).map(function (c) { return '<span class="chip">' + esc(c) + " · " + cats[c] + "</span>"; }).join("") : '<span class="muted">暂无分类</span>';
      // 更新卡片
      var cards = $("stats-cards").children;
      if (cards[1]) cards[1].querySelector(".num").textContent = "详见文章";
      if (cards[2]) cards[2].querySelector(".num").textContent = drafts;
    }).catch(function () {});
    // 评论系统状态
    getFile("src/config/commentConfig.ts").then(function (f) {
      var raw = f.content;
      var enabled = (raw.match(/enabled\s*:\s*(true|false)/) || [])[1] || "?";
      var provider = (raw.match(/provider\s*:\s*"([^"]*)"/) || [])[1] || "—";
      $("comment-status").innerHTML = '<div class="k">是否启用</div><div>' + esc(enabled) + "</div>" +
        '<div class="k">评论系统</div><div>' + esc(provider) + "</div>" +
        '<div class="k">说明</div><div>真评论审核需在对应平台后台操作（如 Giscus/Waline）。</div>';
    }).catch(function (e) {
      $("comment-status").innerHTML = '<div class="k">状态</div><div>未检测到 commentConfig.ts</div>';
    });
  }
  function loadUmami() {
    var host = $("umami-host").value.trim().replace(/\/$/, "");
    var id = $("umami-id").value.trim();
    var key = $("umami-key").value.trim();
    if (!host || !id || !key) { $("umami-result").textContent = "请填写 Host / Website ID / API Key"; return; }
    var start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    var end = new Date().toISOString().slice(0, 10);
    fetch(host + "/api/websites/" + encodeURIComponent(id) + "/stats?startAt=" + Date.parse(start) + "&endAt=" + Date.parse(end), {
      headers: { "x-umami-api-key": key },
    }).then(function (r) { return r.json(); }).then(function (d) {
      $("umami-result").textContent = JSON.stringify(d, null, 2);
    }).catch(function (e) { $("umami-result").textContent = "拉取失败：" + e.message; });
  }

  // ---------- 入口 ----------
  if (sessionStorage.getItem("ff_gate_ok") === "1") {
    $("gate").hidden = true; $("app").hidden = false; boot();
  } else {
    initGate();
  }
})();
