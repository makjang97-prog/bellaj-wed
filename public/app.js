/* 벨라제이웨딩 초대전 — 신청 폼 */
(function () {
  "use strict";

  var form = document.getElementById("applyForm");
  var done = document.getElementById("applyDone");
  var submitBtn = document.getElementById("submitBtn");
  var toastEl = document.getElementById("toast");
  if (!form) return;

  var state = { day: "", plan: "" };

  /* ---- toast ---- */
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  /* ---- today as min date (KST) ---- */
  var dateInput = document.getElementById("visitDate");
  if (dateInput) {
    var now = new Date();
    var kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
    var iso = kst.toISOString().slice(0, 10);
    dateInput.min = iso;
  }

  /* ---- day chips (single select) ---- */
  var dayChips = document.getElementById("dayChips");
  if (dayChips) {
    dayChips.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var val = btn.getAttribute("data-day");
      var on = btn.getAttribute("aria-pressed") === "true";
      Array.prototype.forEach.call(dayChips.querySelectorAll(".chip"), function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      state.day = on ? "" : val;
      btn.setAttribute("aria-pressed", on ? "false" : "true");
      if (!on && dateInput) dateInput.value = "";
    });
  }

  /* choosing a date clears the day chip */
  if (dateInput) {
    dateInput.addEventListener("change", function () {
      if (!dateInput.value) return;
      state.day = "";
      if (dayChips) {
        Array.prototype.forEach.call(dayChips.querySelectorAll(".chip"), function (c) {
          c.setAttribute("aria-pressed", "false");
        });
      }
    });
  }

  /* ---- plan chips (single select) ---- */
  var planChips = document.getElementById("planChips");
  if (planChips) {
    planChips.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var on = btn.getAttribute("aria-pressed") === "true";
      Array.prototype.forEach.call(planChips.querySelectorAll(".chip"), function (c) {
        c.setAttribute("aria-pressed", "false");
      });
      state.plan = on ? "" : btn.getAttribute("data-plan");
      btn.setAttribute("aria-pressed", on ? "false" : "true");
    });
  }

  /* ---- agree detail ---- */
  var agreeMore = document.getElementById("agreeMore");
  var agreeBox = document.getElementById("agreeBox");
  if (agreeMore && agreeBox) {
    agreeMore.addEventListener("click", function () {
      var open = agreeBox.hidden;
      agreeBox.hidden = !open;
      agreeMore.setAttribute("aria-expanded", String(open));
    });
    agreeMore.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        agreeMore.click();
      }
    });
  }

  /* ---- phone formatting ---- */
  var phone = document.getElementById("phone");
  if (phone) {
    phone.addEventListener("input", function () {
      var d = phone.value.replace(/\D/g, "").slice(0, 11);
      var out = d;
      if (d.length > 3 && d.length <= 7) out = d.slice(0, 3) + "-" + d.slice(3);
      else if (d.length > 7) {
        if (d.slice(0, 2) === "02") out = d.slice(0, 2) + "-" + d.slice(2, d.length - 4) + "-" + d.slice(-4);
        else out = d.slice(0, 3) + "-" + d.slice(3, d.length - 4) + "-" + d.slice(-4);
      }
      phone.value = out;
    });
  }

  /* ---- errors ---- */
  function setErr(key, msg) {
    var el = form.querySelector('[data-err="' + key + '"]');
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.textContent = "";
      el.hidden = true;
    }
    var input = document.getElementById(key);
    if (input) {
      if (msg) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    }
  }

  function dayName(iso) {
    var days = ["일", "월", "화", "수", "목", "금", "토"];
    var d = new Date(iso + "T00:00:00");
    return days[d.getDay()];
  }

  /* ---- submit ---- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    var name = (document.getElementById("name").value || "").trim();
    var phoneVal = (document.getElementById("phone").value || "").replace(/\D/g, "");
    var agreed = document.getElementById("agree").checked;
    var dateVal = dateInput ? dateInput.value : "";

    var ok = true;
    setErr("name", "");
    setErr("phone", "");
    setErr("agree", "");

    if (name.length < 2) {
      setErr("name", "성함을 2자 이상 적어주세요.");
      ok = false;
    }
    if (!/^01[016789]\d{7,8}$/.test(phoneVal) && !/^0\d{8,9}$/.test(phoneVal)) {
      setErr("phone", "연락 가능한 전화번호를 정확히 적어주세요.");
      ok = false;
    }
    if (!agreed) {
      setErr("agree", "개인정보 수집·이용에 동의해 주셔야 신청이 완료됩니다.");
      ok = false;
    }
    if (!ok) {
      var firstErr = form.querySelector(".field-err:not([hidden])");
      if (firstErr) firstErr.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    var visitWhen = "";
    if (dateVal) visitWhen = dateVal + " (" + dayName(dateVal) + ")";
    else if (state.day) visitWhen = state.day;

    submitBtn.disabled = true;
    var label = submitBtn.textContent;
    submitBtn.textContent = "신청 중…";

    try {
      var res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          phone: phone.value,
          visit_when: visitWhen,
          plan: state.plan,
          agree: true,
          page: location.pathname
        })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.ok) throw new Error(data.error || "failed");

      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch (err) {
      toast("신청이 잠시 지연되고 있어요. 다시 한 번 눌러주세요.");
      submitBtn.disabled = false;
      submitBtn.textContent = label;
    }
  });
})();
