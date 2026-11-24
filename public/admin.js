/* 벨라제이웨딩 신청 리스트 관리 */
(function () {
  "use strict";

  var LABEL = { waiting: "대기", contacted: "연락완료", booked: "예약확정" };
  var gate = document.getElementById("gate");
  var app = document.getElementById("app");
  var listEl = document.getElementById("list");
  var toastEl = document.getElementById("toast");
  var updatedEl = document.getElementById("updated");
  var filter = "all";
  var rows = [];

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }

  /* ---------- PIN ---------- */
  var pinForm = document.getElementById("pinForm");
  var gateErr = document.getElementById("gateErr");

  pinForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var pin = document.getElementById("pin").value.trim();
    if (!pin) return;
    gateErr.hidden = true;
    try {
      var res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin })
      });
      if (!res.ok) {
        var d = await res.json().catch(function () { return {}; });
        gateErr.textContent = d.error === "too_many_attempts"
          ? "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요."
          : "PIN 번호가 맞지 않습니다.";
        gateErr.hidden = false;
        return;
      }
      enterApp();
    } catch (err) {
      gateErr.textContent = "연결이 잠시 불안정합니다. 다시 시도해 주세요.";
      gateErr.hidden = false;
    }
  });

  function enterApp() {
    gate.hidden = true;
    app.hidden = false;
    load();
  }

  document.getElementById("logoutBtn").addEventListener("click", async function () {
    await fetch("/api/admin/logout", { method: "POST" }).catch(function () {});
    app.hidden = true;
    gate.hidden = false;
    document.getElementById("pin").value = "";
  });

  /* ---------- load ---------- */
  async function load() {
    try {
      var res = await fetch("/api/admin/inquiries", { cache: "no-store" });
      if (res.status === 401) {
        app.hidden = true;
        gate.hidden = false;
        return;
      }
      var data = await res.json();
      if (!data.ok) throw new Error(data.error);
      rows = data.rows || [];
      render();
      var t = new Date();
      updatedEl.textContent = "마지막 확인 " + t.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } catch (err) {
      listEl.innerHTML = '<p class="empty">목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>';
    }
  }

  /* ---------- render ---------- */
  function fmtDate(iso) {
    if (!iso) return "-";
    var d = new Date(iso);
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    var hh = String(d.getHours()).padStart(2, "0");
    var mi = String(d.getMinutes()).padStart(2, "0");
    return mm + "." + dd + " " + hh + ":" + mi;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render() {
    var counts = { all: rows.length, waiting: 0, contacted: 0, booked: 0 };
    rows.forEach(function (r) {
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    document.querySelectorAll("[data-stat]").forEach(function (el) {
      el.textContent = counts[el.getAttribute("data-stat")];
    });

    var view = rows.filter(function (r) { return filter === "all" || r.status === filter; });

    if (!view.length) {
      listEl.innerHTML = '<p class="empty">' +
        (rows.length ? "이 상태의 신청이 없습니다." : "아직 신청이 없습니다. 신청이 들어오면 이곳에 바로 표시됩니다.") +
        "</p>";
      return;
    }

    listEl.innerHTML = view.map(function (r) {
      var tel = String(r.phone || "").replace(/[^\d]/g, "");
      var statusBtns = ["waiting", "contacted", "booked"].map(function (s) {
        return '<button class="act' + (r.status === s ? " is-on" : "") + '" data-act="status" data-id="' +
          esc(r.id) + '" data-status="' + s + '" type="button">' + LABEL[s] + "</button>";
      }).join("");

      return '<article class="card" data-id="' + esc(r.id) + '">' +
        '<div class="card-top">' +
          '<div class="who">' +
            '<p class="name">' + esc(r.name) + "</p>" +
            '<p class="when">신청 ' + fmtDate(r.created_at) + "</p>" +
          "</div>" +
          '<span class="badge" data-s="' + esc(r.status) + '">' + (LABEL[r.status] || r.status) + "</span>" +
        "</div>" +
        '<div class="meta">' +
          '<div class="meta-row"><span class="meta-key">연락처</span>' +
            (tel
              ? '<a class="meta-val tel" href="tel:' + tel + '">' + esc(r.phone) + "</a>"
              : '<span class="meta-val none">-</span>') +
          "</div>" +
          '<div class="meta-row"><span class="meta-key">방문일</span>' +
            '<span class="meta-val' + (r.visit_when ? "" : " none") + '">' + (r.visit_when ? esc(r.visit_when) : "미정") + "</span>" +
          "</div>" +
          '<div class="meta-row"><span class="meta-key">희망구성</span>' +
            '<span class="meta-val' + (r.plan ? "" : " none") + '">' + (r.plan ? esc(r.plan) : "미정") + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="actions">' +
          statusBtns +
          (tel ? '<button class="act copy" data-act="copy" data-phone="' + esc(tel) + '" type="button">번호 복사</button>' : "") +
          '<button class="act del" data-act="del" data-id="' + esc(r.id) + '" data-name="' + esc(r.name) + '" type="button">삭제</button>' +
        "</div>" +
      "</article>";
    }).join("");
  }

  /* ---------- actions ---------- */
  listEl.addEventListener("click", async function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var act = btn.getAttribute("data-act");

    if (act === "copy") {
      var phone = btn.getAttribute("data-phone");
      try {
        await navigator.clipboard.writeText(phone);
        toast("번호를 복사했습니다");
      } catch (err) {
        toast(phone);
      }
      return;
    }

    if (act === "status") {
      var id = btn.getAttribute("data-id");
      var status = btn.getAttribute("data-status");
      try {
        var res = await fetch("/api/admin/inquiries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id, status: status })
        });
        if (!res.ok) throw new Error("failed");
        var row = rows.find(function (r) { return String(r.id) === String(id); });
        if (row) row.status = status;
        render();
        toast("‘" + LABEL[status] + "’로 바꿨습니다");
      } catch (err) {
        toast("변경에 실패했습니다. 다시 시도해 주세요.");
      }
      return;
    }

    if (act === "del") {
      var did = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      if (!confirm("‘" + name + "’ 님의 신청을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.")) return;
      try {
        var dres = await fetch("/api/admin/inquiries", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: did })
        });
        if (!dres.ok) throw new Error("failed");
        rows = rows.filter(function (r) { return String(r.id) !== String(did); });
        render();
        toast("삭제했습니다");
      } catch (err) {
        toast("삭제에 실패했습니다.");
      }
    }
  });

  /* ---------- tabs / refresh ---------- */
  document.getElementById("tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tab");
    if (!tab) return;
    filter = tab.getAttribute("data-filter");
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-on", t === tab);
    });
    render();
  });

  document.getElementById("refreshBtn").addEventListener("click", function () {
    load();
    toast("새로고침했습니다");
  });

  /* 세션이 살아 있으면 바로 목록으로 */
  (async function boot() {
    try {
      var res = await fetch("/api/admin/inquiries", { cache: "no-store" });
      if (res.ok) enterApp();
    } catch (e) {}
  })();
})();
