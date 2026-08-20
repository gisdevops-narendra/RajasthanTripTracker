
    /* =========================================================
       GOOGLE SHEETS CONFIGURATION
       1) Deploy Code.gs as Web App.
       2) Copy the Web App URL below.
       ========================================================= */
    const API_URL = "https://script.google.com/macros/s/AKfycbx3R8BG5Uv6slIKTuH9Ln0y-TRTW6hLj4Tgr-POHsG2rkGax64qu-_12RDyCq14bDamTw/exec";
    const SHEET_URL = "https://docs.google.com/spreadsheets/d/1EFoexe8aYvB9VDAFQdZf72NiMM5P2z_naKHjDBzqwEo/edit?usp=sharing";
    const DATA_VERSION = 4;

    const PEOPLE = [
      { id: "rahul", name: "Rahul", family: "rahul-dhara" },
      { id: "dhara", name: "Dhara", family: "rahul-dhara" },
      { id: "dugu1", name: "Dugu1 (2Y)", family: "rahul-dhara", childOf: ["rahul", "dhara"] },
      { id: "dugu2", name: "Dugu2 (3Y)", family: "rahul-dhara", childOf: ["rahul", "dhara"] },
      { id: "naren", name: "Naren", family: "naren" },
      { id: "parul", name: "Parul", family: "parul" },
      { id: "prakash", name: "Prakash", family: "prakash" }
    ];

    const INITIAL_DAYS = [
      {
        id: "day-1", name: "Day 1", places: [
          ["city-palace", "City Palace", 400, 400, 0, 0, 400, 400, 400],
          ["jagdish-temple", "Jagdish Temple", 0, 0, 0, 0, 0, 0, 0],
          ["lake-pichola-boat", "Lake Pichola / Boat", 400, 400, 0, 0, 400, 400, 400],
          ["jag-mandir", "Jag Mandir", 600, 600, 0, 0, 600, 600, 600],
          ["bagore-ki-haveli", "Bagore Ki Haveli", 60, 60, 0, 0, 60, 60, 60],
          ["gangaur-ghat", "Gangaur Ghat", 0, 0, 0, 0, 0, 0, 0],
          ["ambrai-ghat", "Ambrai Ghat", 0, 0, 0, 0, 0, 0, 0]
        ]
      },
      {
        id: "day-2", name: "Day 2", places: [
          ["bahubali-hills", "Bahubali Hills", 0, 0, 0, 0, 0, 0, 0],
          ["badi-lake", "Badi Lake", 0, 0, 0, 0, 0, 0, 0],
          ["saheliyon-ki-bari", "Saheliyon Ki Bari", 10, 10, 0, 0, 10, 10, 10],
          ["fateh-sagar", "Fateh Sagar", 0, 0, 0, 0, 0, 0, 0],
          ["sajjangarh-fort", "Sajjangarh Fort", 30, 30, 0, 0, 30, 30, 30],
          ["doodh-talai", "Doodh Talai", 0, 0, 0, 0, 0, 0, 0],
          ["karni-mata-ropeway", "Karni Mata Ropeway", 117, 117, 0, 55, 117, 117, 117],
          ["hathi-pol", "Hathi Pol", 0, 0, 0, 0, 0, 0, 0]
        ]
      },
      {
        id: "day-3", name: "Day 3", places: [
          ["udaipur-chittorgarh", "Udaipur → Chittorgarh", 0, 0, 0, 0, 0, 0, 0],
          ["chittorgarh-fort", "Chittorgarh Fort", 40, 40, 0, 0, 40, 40, 40],
          ["rana-kumbha-palace", "Rana Kumbha Palace", 0, 0, 0, 0, 0, 0, 0],
          ["vijay-stambh", "Vijay Stambh", 0, 0, 0, 0, 0, 0, 0],
          ["meera-temple", "Meera Temple", 0, 0, 0, 0, 0, 0, 0],
          ["kirti-stambh", "Kirti Stambh", 0, 0, 0, 0, 0, 0, 0],
          ["padmini-palace", "Padmini Palace", 0, 0, 0, 0, 0, 0, 0],
          ["kalika-mata-temple", "Kalika Mata Temple", 0, 0, 0, 0, 0, 0, 0],
          ["gaumukh", "Gaumukh", 0, 0, 0, 0, 0, 0, 0],
          ["chittorgarh-udaipur", "Chittorgarh → Udaipur", 0, 0, 0, 0, 0, 0, 0]
        ]
      },
      { id: "day-4", name: "Day 4", places: [] },
      { id: "day-5", name: "Day 5", places: [] }];

    const ORIGINAL_COSTS = (() => {
      const map = {};
      INITIAL_DAYS.forEach(day => day.places.forEach(p => {
        const costs = {}; PEOPLE.forEach((person, i) => costs[person.id] = Number(p[i + 2] || 0));
        map[p[0]] = costs;
      }));
      return map;
    })();

    let data = null;
    let syncing = false;
    let loadingCloud = false;
    let dayFilterAutoApplied = false;
    let activeTab = "sightseeing";
    const expandedPlaces = new Set();
    function togglePlaceExpand(placeId) {
      if (expandedPlaces.has(placeId)) expandedPlaces.delete(placeId); else expandedPlaces.add(placeId);
      renderSightseeing();
    }
    function switchTab(tab) {
      if (activeTab !== tab) { closeModal(); closeFoodModal() }
      activeTab = tab;
      document.getElementById("sightseeingView").style.display = tab === "sightseeing" ? "" : "none";
      document.getElementById("foodView").style.display = tab === "food" ? "" : "none";
      document.getElementById("tabBtnSightseeing").classList.toggle("active", tab === "sightseeing");
      document.getElementById("tabBtnFood").classList.toggle("active", tab === "food");
      try { localStorage.setItem("rtt_activeTab", tab) } catch (e) { }
    }

    // Each view (Sightseeing / Food Bill) has its own two sub-pages: the
    // Entries list (what you add/edit/filter) and the Dashboard (aggregate
    // totals, payment summary, settlement) — kept apart so entering data and
    // reviewing totals don't compete for the same screen.
    function switchSightseeingPage(page) {
      const isDashboard = page === "dashboard";
      document.getElementById("sightseeingEntriesPage").style.display = isDashboard ? "none" : "";
      document.getElementById("sightseeingDashboardPage").style.display = isDashboard ? "" : "none";
      document.getElementById("ssTabEntries").classList.toggle("active", !isDashboard);
      document.getElementById("ssTabDashboard").classList.toggle("active", isDashboard);
    }
    function switchFoodPage(page) {
      const isDashboard = page === "dashboard";
      document.getElementById("foodEntriesPage").style.display = isDashboard ? "none" : "";
      document.getElementById("foodDashboardPage").style.display = isDashboard ? "" : "none";
      document.getElementById("foodTabEntries").classList.toggle("active", !isDashboard);
      document.getElementById("foodTabDashboard").classList.toggle("active", isDashboard);
    }

    const TRIP_START_DATE = new Date(2026, 7, 29); // 29 Aug 2026 = Day 1
    const TRIP_DAY_COUNT = 5; // 29 Aug - 2 Sept 2026

    function uid(prefix = "id") { return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9) }
    function currency(v) { return "₹" + Number(v || 0).toLocaleString("en-IN") }
    function escapeHtml(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") }
    function capitalize(v) { return v.charAt(0).toUpperCase() + v.slice(1) }

    function getTripDayOffset() {
      const today = new Date(); const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return Math.round((todayMidnight - TRIP_START_DATE) / 86400000);
    }
    function getAutoDayId() {
      const offset = getTripDayOffset();
      if (offset < 0) return data.days[0] ? data.days[0].id : "all";
      if (offset >= TRIP_DAY_COUNT) return "all";
      return data.days[offset] ? data.days[offset].id : "all";
    }
    function getTodayDayId() {
      const offset = getTripDayOffset();
      if (offset < 0 || offset >= TRIP_DAY_COUNT) return null;
      return data.days[offset] ? data.days[offset].id : null;
    }
    function getDayDateString(dayId) {
      const idx = data.days.findIndex(d => d.id === dayId);
      if (idx < 0) return "";
      const d = new Date(TRIP_START_DATE); d.setDate(d.getDate() + idx);
      const pad = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    function getDayIdForDateString(dateStr) {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-").map(Number);
      if (!y || !m || !d) return null;
      const idx = Math.round((new Date(y, m - 1, d) - TRIP_START_DATE) / 86400000);
      if (idx < 0 || idx >= data.days.length) return null;
      return data.days[idx] ? data.days[idx].id : null;
    }
    function todayDateString() {
      const d = new Date(), pad = n => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    const FOOD_CATEGORIES = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks", other: "Other" };

    function makeInitialData() {
      return {
        version: DATA_VERSION, people: PEOPLE.map(p => ({ ...p })), days: INITIAL_DAYS.map(day => ({
          id: day.id, name: day.name, foodBills: [], places: day.places.map(p => {
            const costs = {}; PEOPLE.forEach((person, i) => costs[person.id] = Number(p[i + 2] || 0));
            return { id: uid("place"), sourceKey: p[0], original: true, name: p[1], costs, visited: false, paidBy: "naren" };
          })
        }))
      };
    }

    function normalizeData() {
      if (!data || !Array.isArray(data.days)) data = makeInitialData();
      const existingIds = new Set(data.days.map(d => d.id));
      const addedDays = [];
      INITIAL_DAYS.forEach(initDay => {
        if (existingIds.has(initDay.id)) return;
        const newDay = {
          id: initDay.id, name: initDay.name, foodBills: [], places: initDay.places.map(p => {
            const costs = {}; PEOPLE.forEach((person, i) => costs[person.id] = Number(p[i + 2] || 0));
            return { id: uid("place"), sourceKey: p[0], original: true, name: p[1], costs, visited: false, paidBy: "naren" };
          })
        };
        data.days.push(newDay);
        addedDays.push(newDay);
      });
      data.days.forEach(day => {
        if (!day.id) day.id = uid("day");
        if (!Array.isArray(day.places)) day.places = [];
        if (!Array.isArray(day.foodBills)) day.foodBills = [];
        day.places.forEach(place => {
          if (!place.id) place.id = uid("place");
          if (!place.costs) place.costs = {};
          PEOPLE.forEach(p => place.costs[p.id] = Math.max(0, Number(place.costs[p.id]) || 0));
          place.visited = Boolean(place.visited);
          if (!PEOPLE.some(p => p.id === place.paidBy)) place.paidBy = "naren";
        });
        day.foodBills.forEach(bill => {
          if (!bill.id) bill.id = uid("food");
          bill.date = bill.date || getDayDateString(day.id);
          bill.restaurantShop = String(bill.restaurantShop || bill.name || "Food Bill");
          bill.food = String(bill.food || "");
          bill.amount = Math.max(0, Number(bill.amount) || 0);
          if (!PEOPLE.some(p => p.id === bill.paidBy)) bill.paidBy = "parul";
          if (!FOOD_CATEGORIES[bill.category]) bill.category = "lunch";
          delete bill.paymentStatus;
          bill.notes = String(bill.notes || "");
          delete bill.name;
        });
      });
      data.people = PEOPLE.map(p => ({ ...p }));
      return addedDays;
    }

    function reconcileFoodBillDays() {
      const moves = [];
      data.days.forEach(day => {
        (day.foodBills || []).forEach(bill => {
          const correctDayId = bill.date ? getDayIdForDateString(bill.date) : null;
          if (correctDayId && correctDayId !== day.id) moves.push({ bill, fromDayId: day.id, toDayId: correctDayId });
        });
      });
      moves.forEach(({ bill, fromDayId, toDayId }) => {
        const fromDay = data.days.find(d => d.id === fromDayId), toDay = data.days.find(d => d.id === toDayId);
        if (!fromDay || !toDay) return;
        fromDay.foodBills = fromDay.foodBills.filter(b => b.id !== bill.id);
        toDay.foodBills.push(bill);
      });
      return moves;
    }

    let statusHideTimer = null;
    function setStatus(text, color) {
      const toast = document.getElementById("statusToast"), textEl = document.getElementById("statusToastText"), dot = document.getElementById("statusDot");
      if (!toast || !textEl) return;
      textEl.textContent = text;
      dot.style.background = color || "var(--green)";
      toast.classList.add("show");
      clearTimeout(statusHideTimer);
      const duration = color === "var(--red)" ? 4500 : 2600;
      statusHideTimer = setTimeout(() => toast.classList.remove("show"), duration);
    }

    function syncModalMaxHeight() {
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      const maxH = Math.max(260, Math.round(vh) - (vh < 500 ? 24 : 48));
      document.documentElement.style.setProperty("--modal-max-h", maxH + "px");
    }
    syncModalMaxHeight();
    window.addEventListener("resize", syncModalMaxHeight);
    window.addEventListener("orientationchange", syncModalMaxHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncModalMaxHeight);
      window.visualViewport.addEventListener("scroll", syncModalMaxHeight);
    }

    let modalLockCount = 0, savedScrollY = 0;
    function lockBodyScroll() {
      modalLockCount++;
      if (modalLockCount > 1) return;
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = (-savedScrollY) + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
    }
    function unlockBodyScroll() {
      modalLockCount = Math.max(0, modalLockCount - 1);
      if (modalLockCount > 0) return;
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, savedScrollY);
    }

    let busyCount = 0;
    function setBusy(active) {
      busyCount = Math.max(0, busyCount + (active ? 1 : -1));
      const busy = busyCount > 0;
      const overlay = document.getElementById("syncOverlay"); if (overlay) overlay.classList.toggle("active", busy);
    }

    /* JSONP is used intentionally: Google Apps Script Web Apps can be called
       from a plain HTML file without a database server or CORS configuration. */
    function apiCall(action, payload = {}, showSaving = true) {
      return new Promise((resolve, reject) => {
        if (!API_URL || API_URL.includes("PASTE_YOUR")) {
          reject(new Error("Google Apps Script URL is not configured."));
          return;
        }
        if (showSaving) setStatus("Syncing...", "var(--orange)");
        setBusy(true);
        const cb = "jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
        const script = document.createElement("script");
        let done = false;
        const cleanup = () => { done = true; setBusy(false); script.remove(); try { delete window[cb] } catch (e) { } };
        const timer = setTimeout(() => { cleanup(); reject(new Error("Cloud sync timed out.")) }, 20000);
        window[cb] = (result) => { clearTimeout(timer); cleanup(); if (result && result.ok) resolve(result); else reject(new Error(result?.error || "Cloud error")) };
        const params = new URLSearchParams({ action, callback: cb });
        if (payload && Object.keys(payload).length) params.set("payload", btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
        script.src = API_URL + "?" + params.toString();
        script.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error("Could not connect to Google Sheets.")) };
        document.body.appendChild(script);
      });
    }

    function viewGoogleSheet() {
      window.open(SHEET_URL, "_blank", "noopener");
    }

    const appNavMenu = document.getElementById("appNavMenu");
    appNavMenu.addEventListener("click", e => {
      if (e.target.closest(".nav-link") && appNavMenu.classList.contains("show")) bootstrap.Collapse.getOrCreateInstance(appNavMenu).hide();
    });

    async function shareGoogleSheet() {
      if (navigator.share) {
        try { await navigator.share({ title: "Rajasthan Trip Expense Sheet", url: SHEET_URL }); return } catch (err) { if (err.name === "AbortError") return }
      }
      openShareModal();
    }
    function openShareModal() { document.getElementById("shareModalBackdrop").classList.add("open"); lockBodyScroll() }
    function closeShareModal() { document.getElementById("shareModalBackdrop").classList.remove("open"); unlockBodyScroll() }
    async function shareVia(target) {
      const text = "Rajasthan Trip Expense Sheet: " + SHEET_URL;
      if (target === "whatsapp") window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
      else if (target === "email") window.location.href = "mailto:?subject=" + encodeURIComponent("Rajasthan Trip Expense Sheet") + "&body=" + encodeURIComponent(text);
      else if (target === "copy") {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try { await navigator.clipboard.writeText(SHEET_URL); setStatus("Google Sheet link copied to clipboard!", "var(--green)") }
          catch (err) { await customPrompt("Copy this link:", SHEET_URL) }
        } else await customPrompt("Copy this link:", SHEET_URL);
      }
      closeShareModal();
    }

    let confirmModalResolve = null;
    function openConfirmModal({ title = "Confirm", message = "", okText = "OK", cancelText = "Cancel", danger = false, showCancel = true, inputMode = false, inputValue = "" }) {
      return new Promise(resolve => {
        confirmModalResolve = resolve;
        document.getElementById("confirmModalTitle").textContent = title;
        document.getElementById("confirmModalMessage").textContent = message;
        const okBtn = document.getElementById("confirmModalOkBtn");
        okBtn.textContent = okText;
        okBtn.className = danger ? "btn-danger" : "btn-primary";
        const cancelBtn = document.getElementById("confirmModalCancelBtn");
        cancelBtn.style.display = showCancel ? "" : "none";
        cancelBtn.textContent = cancelText;
        const input = document.getElementById("confirmModalInput");
        input.style.display = inputMode ? "" : "none";
        input.value = inputValue;
        document.getElementById("confirmModalBackdrop").classList.add("open");
        lockBodyScroll();
        if (inputMode) setTimeout(() => { input.focus(); input.select() }, 60);
      });
    }
    function resolveConfirmModal(confirmed) {
      document.getElementById("confirmModalBackdrop").classList.remove("open");
      if (!confirmModalResolve) return;
      unlockBodyScroll();
      const resolve = confirmModalResolve; confirmModalResolve = null;
      const input = document.getElementById("confirmModalInput");
      const isPrompt = input.style.display !== "none";
      resolve(isPrompt ? (confirmed ? input.value : null) : confirmed);
    }
    function customConfirm(message, opts = {}) {
      return openConfirmModal({ message, danger: opts.danger, okText: opts.okText || "OK", cancelText: opts.cancelText || "Cancel", title: opts.title || "Please Confirm" });
    }
    function customPrompt(message, defaultValue = "") {
      return openConfirmModal({ message, inputMode: true, inputValue: defaultValue, okText: "OK", cancelText: "Cancel", title: "Enter Value" });
    }

    async function refreshFromCloud() {
      loadingCloud = true; render();
      try {
        setStatus("Loading cloud...", "var(--orange)");
        const result = await apiCall("read", {}, false);
        if (result.days && result.days.length) {
          data = { version: DATA_VERSION, people: PEOPLE.map(p => ({ ...p })), days: result.days };
          const addedDays = normalizeData();
          const movedBills = reconcileFoodBillDays();
          setStatus("Cloud synced", "var(--green)");
          if (addedDays.length) { loadingCloud = false; render(); for (const day of addedDays) await cloudSaveDay(day); }
          if (movedBills.length) {
            loadingCloud = false; render();
            for (const { bill, fromDayId, toDayId } of movedBills) {
              await cloudDeleteFoodBill(fromDayId, bill.id);
              const toDay = data.days.find(d => d.id === toDayId);
              await cloudSaveFoodBill(toDay, bill);
            }
          }
        } else {
          data = makeInitialData(); normalizeData();
          loadingCloud = false; render();
          await uploadAllInitialData();
          return;
        }
      } catch (e) {
        console.error(e);
        if (!data) { data = makeInitialData(); normalizeData(); }
        setStatus("Offline / cloud unavailable", "var(--red)");
      } finally {
        loadingCloud = false; render();
      }
    }

    async function uploadAllInitialData() {
      try {
        setStatus("Uploading initial trip...", "var(--orange)");
        await apiCall("bulkSaveAll", { days: data.days }, false);
        setStatus("Cloud synced", "var(--green)");
      } catch (e) { console.error(e); setStatus("Local changes not synced", "var(--red)") }
    }

    async function cloudSavePlace(day, place) {
      try { await apiCall("savePlace", { dayId: day.id, dayName: day.name, place }); setStatus("Saved online", "var(--green)") }
      catch (e) { console.error(e); setStatus("Changed locally; cloud save failed", "var(--red)") }
      notifyPlaceCostWhatsApp(day, place);
    }
    async function cloudDeletePlace(dayId, placeId) {
      try { await apiCall("deletePlace", { dayId, placeId }); setStatus("Deleted online", "var(--green)") }
      catch (e) { console.error(e); setStatus("Deleted locally; cloud delete failed", "var(--red)") }
    }
    async function cloudSaveDay(day) {
      try { await apiCall("saveDay", { day }); setStatus("Saved online", "var(--green)") }
      catch (e) { console.error(e); setStatus("Changed locally; cloud save failed", "var(--red)") }
    }
    async function cloudSaveFoodBill(day, bill) {
      try { await apiCall("saveFoodBill", { dayId: day.id, dayName: day.name, bill }); setStatus("Saved online", "var(--green)") }
      catch (e) { console.error(e); setStatus("Changed locally; cloud save failed", "var(--red)") }
      notifyFoodBillWhatsApp(day, bill);
    }

    /* =========================================================
       WHATSAPP NOTIFICATIONS (Twilio)
       Fires on food bill and sightseeing cost saves. Config/credentials
       live in twilio-config.js (gitignored, loaded before this file).
       Only recipients with enabled:true actually receive a message.
       ========================================================= */
    const FOOD_SPLIT_IDS = ["rahul", "dhara", "naren", "parul", "prakash"];
    async function sendTwilioWhatsApp(toPhone, body) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.accountSid}/Messages.json`;
        const params = new URLSearchParams({ To: `whatsapp:${toPhone}`, From: TWILIO_CONFIG.whatsappFrom, Body: body });
        await fetch(url, {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`),
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        });
      } catch (e) { console.warn("WhatsApp notify failed (Twilio's API may block direct browser calls via CORS):", e) }
    }
    function enabledWhatsAppRecipients() {
      return (typeof TWILIO_CONFIG !== "undefined" && TWILIO_CONFIG.recipients || []).filter(r => r.enabled);
    }
    async function notifyFoodBillWhatsApp(day, bill) {
      const recipients = enabledWhatsAppRecipients(); if (!recipients.length) return;
      const payerName = PEOPLE.find(p => p.id === bill.paidBy)?.name || bill.paidBy;
      const share = (Number(bill.amount) || 0) / FOOD_SPLIT_IDS.length;
      const body = `Food bill (${day.name}): ${bill.restaurantShop}\nAmount: Rs.${bill.amount}\nPaid by: ${payerName}\nDate: ${bill.date}\nYour share: Rs.${share.toFixed(0)}${bill.notes ? `\nNotes: ${bill.notes}` : ""}`;
      await Promise.all(recipients.map(r => sendTwilioWhatsApp(r.phone, body)));
    }
    async function notifyPlaceCostWhatsApp(day, place) {
      const recipients = enabledWhatsAppRecipients(); if (!recipients.length) return;
      const total = getPlaceTotal(place);
      const body = `Sightseeing cost updated: ${place.name} (${day.name})\nTotal: Rs.${total}`;
      await Promise.all(recipients.map(r => sendTwilioWhatsApp(r.phone, body)));
    }
    async function cloudDeleteFoodBill(dayId, billId) {
      try { await apiCall("deleteFoodBill", { dayId, billId }); setStatus("Deleted online", "var(--green)") }
      catch (e) { console.error(e); setStatus("Deleted locally; cloud delete failed", "var(--red)") }
    }
    async function cloudReset() {
      try { await apiCall("reset", {}); await uploadAllInitialData(); } catch (e) { console.error(e); setStatus("Reset locally; cloud reset failed", "var(--red)") }
    }
    async function cloudSaveAllPlaces() {
      try {
        setStatus("Saving reset...", "var(--orange)");
        await apiCall("bulkSavePlaces", { days: data.days }, false);
        setStatus("Cloud synced", "var(--green)");
      } catch (e) { console.error(e); setStatus("Reset locally; cloud save failed", "var(--red)") }
    }

    function getPlaceTotal(place) { return PEOPLE.reduce((t, p) => t + Number(place.costs[p.id] || 0), 0) }
    function getDayTotals(day, places) {
      const totals = {}; PEOPLE.forEach(p => totals[p.id] = 0);
      (places || day.places).forEach(place => PEOPLE.forEach(p => totals[p.id] += Number(place.costs[p.id] || 0)));
      totals.overall = PEOPLE.reduce((s, p) => s + totals[p.id], 0); return totals;
    }
    function calculateTotals() {
      const totals = { people: {}, payments: {}, overall: 0, locations: 0, visited: 0 };
      PEOPLE.forEach(p => { totals.people[p.id] = 0; totals.payments[p.id] = 0 });
      data.days.forEach(day => day.places.forEach(place => {
        totals.locations++; if (place.visited) totals.visited++;
        PEOPLE.forEach(p => { const c = Number(place.costs[p.id] || 0); totals.people[p.id] += c; totals.overall += c });
        const total = getPlaceTotal(place);
        totals.payments[place.paidBy] += total;
      })); return totals;
    }

    function calculateFoodTotals() {
      const totals = { payments: {}, overall: 0, count: 0 };
      PEOPLE.forEach(p => totals.payments[p.id] = 0);
      data.days.forEach(day => (day.foodBills || []).forEach(bill => {
        totals.count++;
        const amt = Number(bill.amount || 0);
        totals.overall += amt;
        totals.payments[bill.paidBy] = (totals.payments[bill.paidBy] || 0) + amt;
      }));
      return totals;
    }

    // render() refreshes both tabs (used after data reloads / cross-tab changes like
    // adding a day). Interactions scoped to a single tab call renderSightseeing()/
    // renderFood() directly so typing in one tab's search box doesn't rebuild the
    // other, hidden tab's DOM on every keystroke.
    function render() { renderSightseeing(); renderFood(); }

    function renderSightseeing() {
      if (!data) return;
      const totals = calculateTotals();
      document.getElementById("overallTotal").textContent = currency(totals.overall);
      document.getElementById("locationCount").textContent = totals.locations;
      document.getElementById("visitedCount").textContent = totals.visited + " / " + totals.locations;
      document.getElementById("averagePersonCost").textContent = currency(totals.overall / PEOPLE.length);
      renderDayFilter(); renderDays(); renderPersonTotals(totals); renderPayments(totals); renderSettlement(totals);
    }

    function renderFood() {
      if (!data) return;
      const foodTotals = calculateFoodTotals();
      document.getElementById("foodOverallTotal").textContent = currency(foodTotals.overall);
      document.getElementById("foodBillCount").textContent = foodTotals.count;
      document.getElementById("foodAverageBill").textContent = currency(foodTotals.count ? foodTotals.overall / foodTotals.count : 0);
      renderFoodDayFilter(); renderFoodDays(); renderFoodPayments(foodTotals); renderFoodSettlement(foodTotals);
    }
    function renderDayFilter() {
      const select = document.getElementById("dayFilter"), current = select.value;
      const signature = data.days.map(d => d.id + ":" + d.name).join("|");
      if (select.dataset.sig === signature) return;
      select.dataset.sig = signature;
      select.innerHTML = '<option value="all">All Days</option>' + data.days.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join("");
      if (!dayFilterAutoApplied) {
        dayFilterAutoApplied = true;
        const autoId = getAutoDayId();
        if ([...select.options].some(o => o.value === autoId)) { select.value = autoId; return; }
      }
      if ([...select.options].some(o => o.value === current)) select.value = current;
    }
    function renderDays() {
      const container = document.getElementById("daysContainer"), search = document.getElementById("searchInput").value.trim().toLowerCase(), dayFilter = document.getElementById("dayFilter").value, visitedFilter = document.getElementById("visitedFilter").value, todayDayId = getTodayDayId();
      let html = "";
      data.days.forEach(day => {
        if (dayFilter !== "all" && day.id !== dayFilter) return;
        const places = day.places.filter(p => (!search || p.name.toLowerCase().includes(search)) && (visitedFilter === "all" || (visitedFilter === "visited" && p.visited) || (visitedFilter === "notVisited" && !p.visited)));
        if (!places.length) return;
        const totals = getDayTotals(day, places);
        html += `<section class="day-card"><div class="day-header"><h2>${escapeHtml(day.name)}${day.id === todayDayId ? '<span class="today-badge">Today</span>' : ""}</h2><div class="day-total">${currency(totals.overall)}</div></div>`;
        html += `<div class="table-wrap"><table><thead><tr><th>Sightseeing</th>${PEOPLE.map(p => `<th>${escapeHtml(p.name)}</th>`).join("")}<th>Total</th><th>Actions</th></tr></thead><tbody>${places.map(p => renderDesktopPlace(day, p)).join("")}</tbody><tfoot><tr><th>Day Total</th>${PEOPLE.map(p => `<th>${currency(totals[p.id])}</th>`).join("")}<th>${currency(totals.overall)}</th><th></th></tr></tfoot></table></div>`;
        html += `<div class="mobile-places">${places.map(p => renderMobilePlace(day, p)).join("")}</div><div class="mobile-day-total"><div class="mobile-day-total-box"><span class="small-label">Places</span><strong>${places.length}</strong></div><div class="mobile-day-total-box"><span class="small-label">Day Total</span><strong>${currency(totals.overall)}</strong></div></div></section>`;
      });
      container.innerHTML = html || '<div class="card empty">No sightseeing found.</div>';
    }
    function renderDesktopPlace(day, place) {
      const locked = place.visited || loadingCloud;
      return `<tr class="${place.visited ? "visited-row" : ""}"><td><input class="name-input" value="${escapeHtml(place.name)}" onchange="renameSightseeing('${day.id}','${place.id}',this.value)" ${locked ? "disabled" : ""}>${place.visited ? '<span class="visited-badge">✓ Visited</span>' : ""}</td>
${PEOPLE.map(p => `<td><input class="cost-input" type="number" min="0" value="${Number(place.costs[p.id] || 0)}" onchange="updateCost('${day.id}','${place.id}','${p.id}',this.value)" ${locked ? "disabled" : ""}></td>`).join("")}
<td class="total-cell">${currency(getPlaceTotal(place))}</td>
<td><div class="actions"><button class="btn-primary btn-small" onclick="saveCosts('${day.id}','${place.id}')" ${locked ? "disabled" : ""}>Update</button><button class="${place.visited ? "btn-green" : ""} btn-small" onclick="toggleVisited('${day.id}','${place.id}')" ${loadingCloud ? "disabled" : ""}>${place.visited ? "✓ Visited" : "Visited"}</button><button class="btn-danger btn-small" onclick="deleteSightseeing('${day.id}','${place.id}')" ${loadingCloud ? "disabled" : ""}>Delete</button></div></td></tr>`;
    }
    function renderMobilePlace(day, place) {
      const expanded = expandedPlaces.has(place.id), locked = place.visited || loadingCloud;
      return `<div class="mobile-place ${place.visited ? "visited" : ""}">
<div class="mp-row ${expanded ? "mp-open" : ""}">
<button class="mp-visited-toggle" onclick="toggleVisited('${day.id}','${place.id}')" title="${place.visited ? "Mark not visited" : "Mark visited"}" aria-label="Toggle visited" ${loadingCloud ? "disabled" : ""}>${place.visited ? "✅" : "⬜"}</button>
<input class="mp-name" value="${escapeHtml(place.name)}" onchange="renameSightseeing('${day.id}','${place.id}',this.value)" ${locked ? "disabled" : ""}>
<span class="mp-total">${currency(getPlaceTotal(place))}</span>
<button class="mp-toggle-btn" onclick="togglePlaceExpand('${place.id}')" aria-expanded="${expanded}" aria-controls="mp-${place.id}">${expanded ? "▲" : "▼"}</button>
</div>
<div class="collapse ${expanded ? "show" : ""}" id="mp-${place.id}">
<div class="mobile-cost-section"><div class="mobile-section-label">Ticket Cost</div><div class="mobile-cost-grid">${PEOPLE.map(p => `<div class="mobile-cost-field"><label>${escapeHtml(p.name)}</label><input class="mobile-cost-input" type="number" min="0" value="${Number(place.costs[p.id] || 0)}" onchange="updateCost('${day.id}','${place.id}','${p.id}',this.value)" ${locked ? "disabled" : ""}></div>`).join("")}</div></div>
<div class="mobile-actions"><button class="btn-primary" onclick="saveCosts('${day.id}','${place.id}')" ${locked ? "disabled" : ""}>Update Amount</button><button class="btn-danger" onclick="deleteSightseeing('${day.id}','${place.id}')" ${loadingCloud ? "disabled" : ""}>Delete Sightseeing</button></div>
</div>
</div>`;
    }
    function updateCost(dayId, placeId, personId, value) {
      const day = data.days.find(d => d.id === dayId), place = day?.places.find(p => p.id === placeId); if (!place) return;
      place.costs[personId] = Math.max(0, Number(value) || 0); renderSightseeing();
    }
    async function saveCosts(dayId, placeId) {
      const day = data.days.find(d => d.id === dayId), place = day?.places.find(p => p.id === placeId); if (!place) return;
      await cloudSavePlace(day, place);
    }
    async function renameSightseeing(dayId, placeId, name) {
      const day = data.days.find(d => d.id === dayId), place = day?.places.find(p => p.id === placeId); if (!place) return;
      const cleaned = String(name).trim(); if (!cleaned) { setStatus("Sightseeing name cannot be empty.", "var(--red)"); renderSightseeing(); return }
      place.name = cleaned; renderSightseeing(); await cloudSavePlace(day, place);
    }
    async function toggleVisited(dayId, placeId) {
      const day = data.days.find(d => d.id === dayId), place = day?.places.find(p => p.id === placeId); if (!place) return;
      place.visited = !place.visited; renderSightseeing(); await cloudSavePlace(day, place);
    }
    async function deleteSightseeing(dayId, placeId) {
      const day = data.days.find(d => d.id === dayId), place = day?.places.find(p => p.id === placeId); if (!day || !place) return;
      if (!(await customConfirm(`Delete "${place.name}"?\n\nThis sightseeing and its costs will be removed.`, { danger: true, okText: "Delete", title: "Delete Sightseeing" }))) return;
      day.places = day.places.filter(p => p.id !== placeId); renderSightseeing(); await cloudDeletePlace(dayId, placeId);
    }

    function renderFoodDayFilter() {
      const select = document.getElementById("foodDayFilter"), current = select.value;
      const signature = data.days.map(d => d.id + ":" + d.name).join("|");
      if (select.dataset.sig === signature) return;
      select.dataset.sig = signature;
      select.innerHTML = '<option value="all">All Days</option>' + data.days.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join("");
      if ([...select.options].some(o => o.value === current)) select.value = current;
    }
    function foodBillMatches(bill, search) {
      if (!search) return true;
      return [bill.restaurantShop, bill.food, bill.notes].some(v => String(v || "").toLowerCase().includes(search));
    }
    function renderFoodDays() {
      const container = document.getElementById("foodDaysContainer"), search = document.getElementById("foodSearchInput").value.trim().toLowerCase(), dayFilter = document.getElementById("foodDayFilter").value, todayDayId = getTodayDayId();
      let html = "";
      data.days.forEach(day => {
        if (dayFilter !== "all" && day.id !== dayFilter) return;
        const bills = (day.foodBills || []).filter(b => foodBillMatches(b, search));
        if (!bills.length) return;
        const total = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
        html += `<section class="day-card"><div class="day-header"><h2>${escapeHtml(day.name)}${day.id === todayDayId ? '<span class="today-badge">Today</span>' : ""}</h2><div class="day-total">${currency(total)}</div></div>`;
        html += `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Restaurant / Shop</th><th>Food</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead><tbody>${bills.map(b => renderDesktopFoodBill(day, b)).join("")}</tbody><tfoot><tr><th colspan="4">Day Total</th><th>${currency(total)}</th><th></th></tr></tfoot></table></div>`;
        html += `<div class="mobile-places">${bills.map(b => renderMobileFoodBill(day, b)).join("")}</div><div class="mobile-day-total"><div class="mobile-day-total-box"><span class="small-label">Bills</span><strong>${bills.length}</strong></div><div class="mobile-day-total-box"><span class="small-label">Day Total</span><strong>${currency(total)}</strong></div></div></section>`;
      });
      container.innerHTML = html || '<div class="card empty">No food bills found.</div>';
    }
    function paidByBadge(bill) {
      return bill.paidBy !== "parul" ? `<span class="visited-badge">Paid by ${escapeHtml(PEOPLE.find(p => p.id === bill.paidBy)?.name || bill.paidBy)}</span>` : "";
    }
    function renderDesktopFoodBill(day, bill) {
      return `<tr><td>${escapeHtml(bill.date || "-")}</td>
<td>${escapeHtml(bill.restaurantShop)}${paidByBadge(bill)}</td>
<td>${escapeHtml(bill.food || "-")}</td>
<td>${escapeHtml(FOOD_CATEGORIES[bill.category] || bill.category)}</td>
<td class="total-cell">${currency(bill.amount)}</td>
<td><div class="actions"><button class="btn-small" onclick="openEditFoodBill('${day.id}','${bill.id}')" ${loadingCloud ? "disabled" : ""}>Edit</button><button class="btn-danger btn-small" onclick="deleteFoodBill('${day.id}','${bill.id}')" ${loadingCloud ? "disabled" : ""}>Delete</button></div></td></tr>`;
    }
    function renderMobileFoodBill(day, bill) {
      return `<div class="mobile-place">
<div class="mp-row mp-open">
<span class="mp-name" style="border:0;background:transparent;padding:7px 0">${escapeHtml(bill.restaurantShop)}${paidByBadge(bill)}</span>
<span class="mp-total">${currency(bill.amount)}</span>
</div>
<div class="mobile-cost-section">
<div class="mobile-section-label">${escapeHtml(bill.date || "")} · ${escapeHtml(FOOD_CATEGORIES[bill.category] || bill.category)}</div>
${bill.food ? `<div style="font-size:13px;color:var(--muted);margin-bottom:8px">${escapeHtml(bill.food)}</div>` : ""}
${bill.notes ? `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">📝 ${escapeHtml(bill.notes)}</div>` : ""}
</div>
<div class="mobile-actions" style="display:flex;gap:6px;padding:0 11px 11px"><button onclick="openEditFoodBill('${day.id}','${bill.id}')" ${loadingCloud ? "disabled" : ""}>Edit</button><button class="btn-danger" onclick="deleteFoodBill('${day.id}','${bill.id}')" ${loadingCloud ? "disabled" : ""}>Delete</button></div>
</div>`;
    }
    async function deleteFoodBill(dayId, billId) {
      const day = data.days.find(d => d.id === dayId), bill = day?.foodBills.find(b => b.id === billId); if (!day || !bill) return;
      if (!(await customConfirm(`Delete the food bill at "${bill.restaurantShop}"?\n\nThis entry will be removed.`, { danger: true, okText: "Delete", title: "Delete Food Bill" }))) return;
      day.foodBills = day.foodBills.filter(b => b.id !== billId); renderFood(); await cloudDeleteFoodBill(dayId, billId);
    }

    let editingFoodBill = null;
    function openAddFoodBill() {
      editingFoodBill = null;
      document.getElementById("foodModalTitle").textContent = "🍽️ Add Food Bill";
      document.getElementById("foodFormSaveBtn").textContent = "Save Food Bill";
      document.getElementById("foodFormDay").disabled = false;
      populateFoodDayForm();
      document.getElementById("foodFormRestaurant").value = "";
      document.getElementById("foodFormFood").value = "";
      document.getElementById("foodFormAmount").value = 0;
      document.getElementById("foodFormCategory").value = "lunch";
      document.getElementById("foodFormNotes").value = "";
      document.getElementById("foodFormPaidBy").innerHTML = PEOPLE.filter(p => !p.childOf).map(p => `<option value="${p.id}" ${p.id === "parul" ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("");
      document.getElementById("foodFormDay").value = getTodayDayId() || (data.days[0] ? data.days[0].id : "");
      document.getElementById("foodFormDate").value = todayDateString();
      document.getElementById("foodFormBackdrop").classList.add("open");
      document.getElementById("foodFab").style.display = "none";
      lockBodyScroll();
    }
    function openEditFoodBill(dayId, billId) {
      const day = data.days.find(d => d.id === dayId), bill = day?.foodBills.find(b => b.id === billId); if (!bill) return;
      editingFoodBill = { dayId, billId };
      document.getElementById("foodModalTitle").textContent = "🍽️ Edit Food Bill";
      document.getElementById("foodFormSaveBtn").textContent = "Update Food Bill";
      populateFoodDayForm();
      document.getElementById("foodFormDay").value = dayId;
      document.getElementById("foodFormDay").disabled = false;
      document.getElementById("foodFormDate").value = bill.date || getDayDateString(dayId);
      document.getElementById("foodFormRestaurant").value = bill.restaurantShop;
      document.getElementById("foodFormFood").value = bill.food || "";
      document.getElementById("foodFormAmount").value = bill.amount;
      document.getElementById("foodFormCategory").value = bill.category;
      document.getElementById("foodFormNotes").value = bill.notes || "";
      document.getElementById("foodFormPaidBy").innerHTML = PEOPLE.filter(p => !p.childOf).map(p => `<option value="${p.id}" ${p.id === bill.paidBy ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("");
      document.getElementById("foodFormBackdrop").classList.add("open");
      document.getElementById("foodFab").style.display = "none";
      lockBodyScroll();
    }
    function populateFoodDayForm() {
      const select = document.getElementById("foodFormDay");
      select.innerHTML = data.days.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join("");
    }
    function syncFoodFormDateFromDay() {
      const dayId = document.getElementById("foodFormDay").value, dateStr = getDayDateString(dayId);
      if (dateStr) document.getElementById("foodFormDate").value = dateStr;
    }
    function syncFoodFormDayFromDate() {
      const dayId = getDayIdForDateString(document.getElementById("foodFormDate").value);
      if (dayId) document.getElementById("foodFormDay").value = dayId;
    }
    async function saveFoodBill() {
      const dayId = document.getElementById("foodFormDay").value, restaurantShop = document.getElementById("foodFormRestaurant").value.trim();
      if (!restaurantShop) { setStatus("Please enter a restaurant/shop name.", "var(--red)"); return }
      if (!dayId) { setStatus("No trip day is set up for this date yet.", "var(--red)"); return }
      const day = data.days.find(d => d.id === dayId); if (!day) return;
      const fields = {
        date: document.getElementById("foodFormDate").value || getDayDateString(dayId),
        restaurantShop,
        food: document.getElementById("foodFormFood").value.trim(),
        category: document.getElementById("foodFormCategory").value,
        amount: Math.max(0, Number(document.getElementById("foodFormAmount").value) || 0),
        paidBy: document.getElementById("foodFormPaidBy").value,
        notes: document.getElementById("foodFormNotes").value.trim()
      };
      if (!day.foodBills) day.foodBills = [];
      let bill, movedFromDayId = null;
      if (editingFoodBill) {
        const oldDay = data.days.find(d => d.id === editingFoodBill.dayId);
        bill = oldDay?.foodBills.find(b => b.id === editingFoodBill.billId); if (!bill) return;
        Object.assign(bill, fields);
        if (oldDay.id !== dayId) {
          oldDay.foodBills = oldDay.foodBills.filter(b => b.id !== bill.id);
          day.foodBills.push(bill);
          movedFromDayId = oldDay.id;
        }
      } else {
        bill = { id: uid("food"), ...fields }; day.foodBills.push(bill);
      }
      closeFoodModal(); renderFood();
      if (movedFromDayId) await cloudDeleteFoodBill(movedFromDayId, bill.id);
      await cloudSaveFoodBill(day, bill);
    }
    function closeFoodModal() {
      const backdrop = document.getElementById("foodFormBackdrop"), wasOpen = backdrop.classList.contains("open");
      backdrop.classList.remove("open");
      document.getElementById("foodFab").style.display = "";
      editingFoodBill = null;
      if (wasOpen) unlockBodyScroll();
    }

    function renderFoodPayments(totals) { document.getElementById("foodPaymentSummary").innerHTML = PEOPLE.filter(p => !p.childOf).map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${currency(totals.payments[p.id] || 0)}</td></tr>`).join("") }
    function renderFoodSettlement(totals) {
      const people = ["rahul", "dhara", "naren", "parul", "prakash"], share = totals.overall / people.length;
      let rows = people.map(id => { const p = PEOPLE.find(x => x.id === id); return renderSettlementRow(p.name, totals.payments[id] || 0, share) }).join("");
      document.getElementById("foodSettlementSummary").innerHTML = rows;
    }

    function openAddSightseeing() {
      if (activeTab !== "sightseeing") switchTab("sightseeing");
      populateDayForm(); document.getElementById("formName").value = "";
      PEOPLE.forEach(p => document.getElementById("cost" + capitalize(p.id)).value = 0);
      document.getElementById("sightseeingFormBackdrop").classList.add("open");
      document.getElementById("sightseeingFab").style.display = "none";
      lockBodyScroll();
    }
    function populateDayForm() { document.getElementById("formDay").innerHTML = data.days.map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`).join("") }
    async function saveSightseeing() {
      const dayId = document.getElementById("formDay").value, name = document.getElementById("formName").value.trim(); if (!dayId || !name) { setStatus("Please select a day and enter a sightseeing name.", "var(--red)"); return }
      const day = data.days.find(d => d.id === dayId); if (!day) return; const costs = {}; PEOPLE.forEach(p => costs[p.id] = Math.max(0, Number(document.getElementById("cost" + capitalize(p.id)).value) || 0));
      const place = { id: uid("place"), sourceKey: null, original: false, name, costs, visited: false, paidBy: "naren" }; day.places.push(place); closeModal(); renderSightseeing(); await cloudSavePlace(day, place);
    }
    async function addDay() {
      const name = await customPrompt("Enter the new day name:", `Day ${data.days.length + 1}`); if (name === null) return; const cleaned = name.trim(); if (!cleaned) { setStatus("Day name cannot be empty.", "var(--red)"); return }
      const day = { id: uid("day"), name: cleaned, places: [] }; data.days.push(day); render(); await cloudSaveDay(day);
    }

    function renderPersonTotals(totals) { document.getElementById("personTotals").innerHTML = PEOPLE.map(p => `<div class="card person-card"><div class="label">${escapeHtml(p.name)}</div><div class="value">${currency(totals.people[p.id] || 0)}</div></div>`).join("") }
    function renderPayments(totals) { document.getElementById("paymentSummary").innerHTML = PEOPLE.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${currency(totals.payments[p.id] || 0)}</td></tr>`).join("") }
    function renderSettlement(totals) {
      let rows = PEOPLE.map(p => renderSettlementRow(p.name, totals.payments[p.id] || 0, totals.people[p.id] || 0)).join("");
      document.getElementById("settlementSummary").innerHTML = rows;
    }
    function renderSettlementRow(name, paid, share) {
      const balance = paid - share; let result;
      if (Math.abs(balance) < .005) result = '<span style="color:var(--green);font-weight:bold">Settled</span>';
      else if (balance > 0) result = `<span style="color:var(--green);font-weight:bold">Gets ${currency(balance)}</span>`;
      else result = `<span style="color:var(--red);font-weight:bold">Pays ${currency(Math.abs(balance))}</span>`;
      return `<tr><td>${escapeHtml(name)}</td><td>${currency(paid)}</td><td>${currency(share)}</td><td>${result}</td></tr>`;
    }

    async function resetTrip() {
      if (!(await customConfirm("Reset payment data?\n\nAll costs and Paid By selections will be reset to their default values. Sightseeing locations, days, names and visited status will NOT be changed.", { danger: true, okText: "Continue", title: "Reset Payment Data" }))) return;
      if (!(await customConfirm("FINAL CONFIRMATION\n\nReset all costs and Paid By selections to their default values?", { danger: true, okText: "Reset Everything", title: "Are You Sure?" }))) return;
      data.days.forEach(day => day.places.forEach(place => {
        const original = ORIGINAL_COSTS[place.sourceKey];
        PEOPLE.forEach(p => place.costs[p.id] = original ? Number(original[p.id] || 0) : 0);
        place.paidBy = "naren";
      }));
      renderSightseeing(); await cloudSaveAllPlaces(); setStatus("Payment data has been reset successfully.", "var(--green)");
    }
    function closeModal() {
      const backdrop = document.getElementById("sightseeingFormBackdrop"), wasOpen = backdrop.classList.contains("open");
      backdrop.classList.remove("open");
      document.getElementById("sightseeingFab").style.display = "";
      if (wasOpen) unlockBodyScroll();
    }
    document.getElementById("shareModalBackdrop").addEventListener("click", e => { if (e.target === e.currentTarget) closeShareModal() });
    document.getElementById("confirmModalBackdrop").addEventListener("click", e => { if (e.target === e.currentTarget) resolveConfirmModal(false) });
    document.getElementById("sightseeingFormBackdrop").addEventListener("click", e => { if (e.target === e.currentTarget) closeModal() });
    document.getElementById("foodFormBackdrop").addEventListener("click", e => { if (e.target === e.currentTarget) closeFoodModal() });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeFoodModal(); closeShareModal(); closeThemeMenu(); resolveConfirmModal(false) } });

    function populateThemeMenu() {
      const menu = document.getElementById("themeMenu"), current = getSavedThemeId() || "classic-blue";
      menu.innerHTML = '<div class="theme-menu-title">Theme</div>' + THEMES.map(t => `<button type="button" class="theme-option ${t.id === current ? "active" : ""}" data-theme="${t.id}" onclick="selectTheme('${t.id}')" role="menuitemradio" aria-checked="${t.id === current}"><span class="theme-swatch" style="background:linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})"></span><span class="theme-option-name">${escapeHtml(t.name)}</span><span class="theme-check">✓</span></button>`).join("");
    }
    function selectTheme(themeId) { applyTheme(themeId); closeThemeMenu() }
    function toggleThemeMenu(e) {
      e.stopPropagation();
      const picker = document.getElementById("themePicker"), isOpen = picker.classList.toggle("open");
      document.getElementById("themePickerBtn").setAttribute("aria-expanded", isOpen);
      document.getElementById("themeMenu").setAttribute("aria-hidden", String(!isOpen));
    }
    function closeThemeMenu() {
      document.getElementById("themePicker").classList.remove("open");
      document.getElementById("themePickerBtn").setAttribute("aria-expanded", "false");
      document.getElementById("themeMenu").setAttribute("aria-hidden", "true");
    }
    document.addEventListener("click", e => { if (!e.target.closest("#themePicker")) closeThemeMenu() });
    document.getElementById("appNavMenu").addEventListener("show.bs.collapse", closeThemeMenu);
    populateThemeMenu();

    function chooseLandingView(tab) {
      const view = tab === "food" ? "food" : "sightseeing";
      document.getElementById("landingScreen").style.display = "none";
      document.getElementById("appShell").classList.add("app-shell-visible");
      switchTab(view);
      // Only one view was chosen on the landing page, so don't offer a way
      // to switch to the other one from inside the app.
      document.getElementById("mainViewTabsRow").style.display = "none";
      if (view === "food") {
        document.getElementById("navAddSightseeingItem").style.display = "none";
        document.getElementById("navResetTripItem").style.display = "none";
      }
    }
    switchTab("sightseeing");

    if (API_URL.includes("PASTE_YOUR")) {
      data = makeInitialData(); normalizeData(); render(); setStatus("Add Apps Script URL", "var(--orange)");
    } else {
      refreshFromCloud();
    }
  