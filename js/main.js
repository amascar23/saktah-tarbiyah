/* ==========================================================================
   Saktah Tarbiyah — Main Vanilla JavaScript
   ========================================================================== */

(function () {
  "use strict";

  const WA_NUMBER = "6281802899219";
  const THEME_STORAGE_KEY = "saktah-theme";
  const ATTENDANCE_STORAGE_KEY = "saktah-attendance-v2";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* ------------------------------------------------------------------------
     1. Logo Fallback (tampilkan logo-saktah.png jika tersedia, selain itu SVG)
     ------------------------------------------------------------------------ */
  function initLogoFallback() {
    $$(".brand-mark").forEach((mark) => {
      const img = $(".brand-logo-img", mark);
      if (!img) return;

      const revealIfValid = () => {
        if (img.complete && img.naturalWidth > 0) {
          mark.classList.add("has-custom-logo");
        }
      };

      img.addEventListener("load", revealIfValid);
      img.addEventListener("error", () => {
        mark.classList.remove("has-custom-logo");
      });

      revealIfValid();
    });
  }

  /* ------------------------------------------------------------------------
     2. Dark / Light Mode Toggle
     ------------------------------------------------------------------------ */
  function initThemeToggle() {
    const toggleBtn = $("#themeToggle");
    const labelEl = toggleBtn ? $(".theme-label", toggleBtn) : null;
    const themeColorMeta = $("#themeColorMeta");
    const root = document.documentElement;

    const applyTheme = (theme) => {
      const isDark = theme === "dark";
      root.setAttribute("data-theme", theme);
      if (themeColorMeta) {
        themeColorMeta.setAttribute("content", isDark ? "#131b15" : "#344c38");
      }
      if (toggleBtn) {
        toggleBtn.setAttribute("aria-pressed", String(isDark));
        toggleBtn.setAttribute(
          "aria-label",
          isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"
        );
      }
      if (labelEl) {
        labelEl.textContent = isDark ? "Mode Terang" : "Mode Gelap";
      }
    };

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      applyTheme("dark");
    } else {
      applyTheme("light");
    }

    toggleBtn?.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
    });
  }

  /* ------------------------------------------------------------------------
     3. Mobile Navigation & Scroll Active State
     ------------------------------------------------------------------------ */
  function initNavigation() {
    const navToggle = $("#navToggle");
    const mainNav = $("#mainNav");
    const navLinks = $$(".nav-link", mainNav);

    const setMenuOpen = (open) => {
      if (!navToggle || !mainNav) return;
      mainNav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    };

    navToggle?.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!mainNav?.classList.contains("is-open")) return;
      const target = event.target;
      if (!mainNav.contains(target) && !navToggle?.contains(target)) {
        setMenuOpen(false);
      }
    });

    // Active section highlight
    const trackedIds = ["beranda", "program", "kartu-kehadiran", "saktah-play", "daftar"];
    const sections = trackedIds.map((id) => document.getElementById(id)).filter(Boolean);

    const updateActiveNav = () => {
      const scrollMarker = window.scrollY + 140;
      let currentId = "beranda";

      sections.forEach((sec) => {
        if (sec.offsetTop <= scrollMarker) {
          currentId = sec.id;
        }
      });

      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle("is-active", href === `#${currentId}`);
      });
    };

    window.addEventListener("scroll", updateActiveNav, { passive: true });
    updateActiveNav();
  }

  /* ------------------------------------------------------------------------
     4. Program Selector -> Auto-fill Form & Scroll
     ------------------------------------------------------------------------ */
  function initProgramSelectors() {
    const selectBtns = $$(".select-program-btn");
    const programSelect = $("#programChoice");
    const formCard = $(".register-form-card");
    const childNameInput = $("#childName");
    const daftarSection = $("#daftar");

    selectBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosenProgram = btn.dataset.program;
        if (programSelect && chosenProgram) {
          programSelect.value = chosenProgram;
          programSelect.setAttribute("aria-invalid", "false");
          const errorEl = $("#errorProgramChoice");
          if (errorEl) errorEl.textContent = "";
        }

        daftarSection?.scrollIntoView({ behavior: "smooth", block: "start" });

        if (formCard) {
          formCard.classList.add("is-highlighted");
          window.setTimeout(() => formCard.classList.remove("is-highlighted"), 1600);
        }

        window.setTimeout(() => {
          if (childNameInput && !childNameInput.value.trim()) {
            childNameInput.focus({ preventScroll: true });
          } else {
            $("#preferredSchedule")?.focus({ preventScroll: true });
          }
        }, 450);
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. Kartu Kehadiran & Catatan Progres (Multi-Murid + localStorage)
     ------------------------------------------------------------------------ */
  function getTodayFormatted() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function getDefaultMonthLabel() {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const now = new Date();
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  function createEmptyMeetings() {
    return Array.from({ length: 12 }, (_, idx) => ({
      step: idx + 1,
      present: false,
      date: "",
      note: "",
    }));
  }

  function createStudentProfile(overrides = {}) {
    return {
      id: overrides.id || `murid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: overrides.name ?? "",
      program: overrides.program ?? "Kelas Mengaji Iqra & Tahsin Anak",
      teacher: overrides.teacher ?? "",
      month: overrides.month ?? getDefaultMonthLabel(),
      meetings: Array.isArray(overrides.meetings) && overrides.meetings.length === 12
        ? overrides.meetings
        : createEmptyMeetings(),
    };
  }

  function normalizePhoneForWa(rawPhone) {
    const digits = (rawPhone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("0")) return `62${digits.slice(1)}`;
    if (digits.startsWith("62")) return digits;
    return `62${digits}`;
  }

  const STAR_CHECK_SVG = `<svg class="stamp-star-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="currentColor" fill-opacity="0.16" stroke="currentColor" stroke-width="1.5"/><path d="M6.4 10.2L8.8 12.6L13.7 7.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const EMPTY_RING_SVG = `<svg class="stamp-star-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.4" stroke-dasharray="2.5 2.5"/></svg>`;

  function initAttendanceCard() {
    const profileSelect = $("#studentProfileSelect");
    const newCardBtn = $("#newStudentCardBtn");
    const deleteCardBtn = $("#deleteStudentCardBtn");

    const nameInput = $("#cardStudentName");
    const programInput = $("#cardStudentProgram");
    const teacherInput = $("#cardTeacherName");
    const monthInput = $("#cardMonth");

    const displayName = $("#cardDisplayName");
    const displayProgram = $("#cardDisplayProgram");
    const displayTeacher = $("#cardDisplayTeacher");
    const displayMonth = $("#cardDisplayMonth");

    const summaryText = $("#attendanceSummaryText");
    const phaseBadge = $("#attendancePhaseBadge");
    const progressBar = $("#attendanceProgressBar");
    const progressFill = $("#attendanceProgressFill");

    const stampGrid = $("#stampGrid");
    const notesBody = $("#progressNotesBody");

    const parentWaInput = $("#parentWaInput");
    const sendRecapWaBtn = $("#sendRecapWaBtn");
    const copyRecapBtn = $("#copyRecapBtn");
    const recapStatus = $("#recapStatus");
    const recapPreviewText = $("#recapPreviewText");

    if (!stampGrid || !notesBody) return;

    let store = { activeId: "", students: [] };

    try {
      const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
          store = {
            activeId: typeof parsed.activeId === "string" ? parsed.activeId : parsed.students[0].id,
            students: parsed.students.map((st) =>
              createStudentProfile({
                id: st.id,
                name: typeof st.name === "string" ? st.name : "",
                program: typeof st.program === "string" ? st.program : "",
                teacher: typeof st.teacher === "string" ? st.teacher : "",
                month: typeof st.month === "string" ? st.month : getDefaultMonthLabel(),
                meetings: Array.isArray(st.meetings) && st.meetings.length === 12
                  ? st.meetings.map((m, i) => ({
                    step: i + 1,
                    present: Boolean(m?.present),
                    date: typeof m?.date === "string" ? m.date : "",
                    note: typeof m?.note === "string" ? m.note : "",
                  }))
                  : createEmptyMeetings(),
              })
            ),
          };
        }
      }
    } catch {
      store = { activeId: "", students: [] };
    }

    if (store.students.length === 0) {
      const firstProfile = createStudentProfile({
        name: "Aisyah Humaira",
        program: "Kelas Mengaji Iqra & Tahsin Anak",
        teacher: "Ustazah Hana",
        month: getDefaultMonthLabel(),
      });
      store = { activeId: firstProfile.id, students: [firstProfile] };
    }

    const getActiveStudent = () => {
      return store.students.find((s) => s.id === store.activeId) || store.students[0];
    };

    const saveStore = () => {
      try {
        localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(store));
      } catch {
        // Ignore storage quota errors
      }
    };

    const getPhaseSummary = (count) => {
      if (count === 0) return "Siap Memulai Pertemuan ke-1";
      if (count === 1) return "Fase 1: Asesmen Awal";
      if (count <= 5) return "Fase 2: Penguatan Pondasi";
      if (count <= 11) return "Fase 3: Latihan & Pembiasaan";
      return "Siklus 12 Pertemuan Tuntas";
    };

    const renderSelectDropdown = () => {
      if (!profileSelect) return;
      profileSelect.innerHTML = "";
      store.students.forEach((student, idx) => {
        const option = document.createElement("option");
        option.value = student.id;
        const labelName = student.name.trim() || `Murid ${idx + 1} (Tanpa Nama)`;
        const labelMonth = student.month.trim() ? ` · ${student.month.trim()}` : "";
        option.textContent = `${labelName}${labelMonth}`;
        profileSelect.appendChild(option);
      });
      profileSelect.value = getActiveStudent().id;

      if (deleteCardBtn) {
        deleteCardBtn.disabled = store.students.length <= 1;
        deleteCardBtn.title =
          store.students.length <= 1
            ? "Minimal harus ada satu profil kartu murid"
            : "Hapus profil kartu yang sedang dipilih";
      }
    };

    const renderIdentityAndProgress = () => {
      const student = getActiveStudent();
      const count = student.meetings.filter((m) => m.present).length;
      const pct = Math.round((count / 12) * 100);

      if (displayName) displayName.textContent = student.name.trim() || "Belum diisi";
      if (displayProgram) displayProgram.textContent = student.program.trim() || "Belum diisi";
      if (displayTeacher) displayTeacher.textContent = student.teacher.trim() || "Belum diisi";
      if (displayMonth) displayMonth.textContent = student.month.trim() || "Belum diisi";

      if (summaryText) {
        summaryText.textContent = `${count} dari 12 pertemuan hadir (${pct}%)`;
      }
      if (phaseBadge) {
        phaseBadge.textContent = getPhaseSummary(count);
      }
      if (progressBar) {
        progressBar.setAttribute("aria-valuenow", String(count));
      }
      if (progressFill) {
        progressFill.style.width = `${pct}%`;
      }
    };

    const syncNoteRowIndicators = () => {
      const student = getActiveStudent();
      student.meetings.forEach((meeting) => {
        const dot = $(`#noteDot-${meeting.step}`);
        if (dot) {
          dot.classList.toggle("is-done", meeting.present);
        }
      });
    };

    const renderStamps = () => {
      const student = getActiveStudent();
      stampGrid.innerHTML = "";

      student.meetings.forEach((meeting) => {
        const tile = document.createElement("div");
        tile.className = `stamp-tile${meeting.present ? " is-done" : ""}`;

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "stamp-toggle-btn";
        toggleBtn.setAttribute("aria-pressed", String(meeting.present));
        toggleBtn.setAttribute(
          "aria-label",
          `Pertemuan ke-${meeting.step}: ${meeting.present ? "Hadir" : "Belum hadir"}`
        );
        toggleBtn.innerHTML = `
          <span class="stamp-num-badge">${meeting.step}</span>
          <span class="stamp-status-pill">
            ${meeting.present ? STAR_CHECK_SVG : EMPTY_RING_SVG}
            <span>${meeting.present ? "Hadir" : "Tandai"}</span>
          </span>
        `;

        const dateInput = document.createElement("input");
        dateInput.type = "text";
        dateInput.className = "stamp-date-input";
        dateInput.value = meeting.date;
        dateInput.placeholder = meeting.present ? "Tgl hadir" : "Belum hadir";
        dateInput.disabled = !meeting.present;
        dateInput.maxLength = 20;
        dateInput.setAttribute("aria-label", `Tanggal pertemuan ke-${meeting.step}`);

        toggleBtn.addEventListener("click", () => {
          meeting.present = !meeting.present;
          if (meeting.present && !meeting.date.trim()) {
            meeting.date = getTodayFormatted();
          }
          saveStore();
          renderIdentityAndProgress();
          renderStamps();
          syncNoteRowIndicators();
        });

        dateInput.addEventListener("input", () => {
          meeting.date = dateInput.value;
          saveStore();
        });

        tile.appendChild(toggleBtn);
        tile.appendChild(dateInput);
        stampGrid.appendChild(tile);
      });
    };

    const renderNotesTable = () => {
      const student = getActiveStudent();
      notesBody.innerHTML = "";

      student.meetings.forEach((meeting) => {
        const tr = document.createElement("tr");

        const tdKe = document.createElement("td");
        tdKe.className = "col-ke";
        tdKe.innerHTML = `
          <span class="row-ke-wrap">
            <span class="row-hadir-dot${meeting.present ? " is-done" : ""}" id="noteDot-${meeting.step}" aria-hidden="true"></span>
            <span>Ke-${meeting.step}</span>
          </span>
        `;

        const tdNote = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "note-row-input";
        input.value = meeting.note;
        input.placeholder = `Tulis materi & catatan pertemuan ke-${meeting.step}...`;
        input.maxLength = 240;
        input.setAttribute("aria-label", `Materi dan catatan pertemuan ke-${meeting.step}`);

        input.addEventListener("input", () => {
          meeting.note = input.value;
          saveStore();
        });

        tdNote.appendChild(input);
        tr.appendChild(tdKe);
        tr.appendChild(tdNote);
        notesBody.appendChild(tr);
      });
    };

    const populateInputsFromActive = () => {
      const student = getActiveStudent();
      if (nameInput) nameInput.value = student.name;
      if (programInput) programInput.value = student.program;
      if (teacherInput) teacherInput.value = student.teacher;
      if (monthInput) monthInput.value = student.month;
    };

    const renderAll = () => {
      renderSelectDropdown();
      populateInputsFromActive();
      renderIdentityAndProgress();
      renderStamps();
      renderNotesTable();
      if (recapStatus) recapStatus.hidden = true;
    };

    const bindProfileField = (inputEl, key) => {
      inputEl?.addEventListener("input", () => {
        const student = getActiveStudent();
        student[key] = inputEl.value;
        saveStore();
        renderIdentityAndProgress();
        renderSelectDropdown();
      });
    };

    bindProfileField(nameInput, "name");
    bindProfileField(programInput, "program");
    bindProfileField(teacherInput, "teacher");
    bindProfileField(monthInput, "month");

    profileSelect?.addEventListener("change", () => {
      store.activeId = profileSelect.value;
      saveStore();
      renderAll();
    });

    newCardBtn?.addEventListener("click", () => {
      const newProfile = createStudentProfile({
        name: "",
        program: "",
        teacher: "",
        month: getDefaultMonthLabel(),
      });
      store.students.push(newProfile);
      store.activeId = newProfile.id;
      saveStore();
      renderAll();
      nameInput?.focus();
    });

    deleteCardBtn?.addEventListener("click", () => {
      if (store.students.length <= 1) return;
      const active = getActiveStudent();
      store.students = store.students.filter((s) => s.id !== active.id);
      store.activeId = store.students[0].id;
      saveStore();
      renderAll();
    });

    const buildRecapMessage = () => {
      const student = getActiveStudent();
      const childName = student.name.trim() || "Ananda";
      const programName = student.program.trim() || "Program Saktah Tarbiyah";
      const teacherName = student.teacher.trim() || "Tim Pengajar Saktah Tarbiyah";
      const monthName = student.month.trim() || getDefaultMonthLabel();

      const attendedMeetings = student.meetings.filter((m) => m.present);
      const attendedCount = attendedMeetings.length;

      const latestWithNote = [...student.meetings]
        .reverse()
        .find((m) => m.note.trim().length > 0);
      const latestAttended = [...attendedMeetings].reverse()[0] || null;

      let latestSummaryLine = "Belum ada catatan pertemuan yang dituliskan.";
      if (latestWithNote) {
        const datePart = latestWithNote.date.trim() ? ` (${latestWithNote.date.trim()})` : "";
        latestSummaryLine = `Pertemuan ke-${latestWithNote.step}${datePart}: ${latestWithNote.note.trim()}`;
      } else if (latestAttended) {
        const datePart = latestAttended.date.trim() ? ` (${latestAttended.date.trim()})` : "";
        latestSummaryLine = `Pertemuan ke-${latestAttended.step}${datePart} telah terlaksana dengan baik.`;
      }

      const attendedDatesLine = attendedMeetings.length > 0
        ? attendedMeetings
          .map((m) => `Ke-${m.step}${m.date.trim() ? ` (${m.date.trim()})` : ""}`)
          .join(", ")
        : "Belum ada pertemuan yang ditandai hadir.";

      return [
        "Assalamu'alaikum Ayah & Bunda,",
        `Berikut kami sampaikan rekap kartu kehadiran dan perkembangan belajar ananda *${childName}* di Saktah Tarbiyah:`,
        "",
        `• Program / Kelas: ${programName}`,
        `• Pengajar: ${teacherName}`,
        `• Bulan: ${monthName}`,
        `• Jumlah Kehadiran: ${attendedCount} dari 12 pertemuan`,
        `• Rincian Hadir: ${attendedDatesLine}`,
        "",
        "*Ringkasan Catatan Pertemuan Terakhir:*",
        latestSummaryLine,
        "",
        "Terima kasih atas dukungan Ayah & Bunda dalam mendampingi proses belajar ananda yang tenang dan penuh makna.",
        "Salam hangat,",
        "*Saktah Tarbiyah*",
      ].join("\n");
    };

    sendRecapWaBtn?.addEventListener("click", () => {
      const msg = buildRecapMessage();
      const targetPhone = normalizePhoneForWa(parentWaInput?.value);
      const waBase = targetPhone ? `https://wa.me/${targetPhone}` : "https://wa.me/";
      const waUrl = `${waBase}?text=${encodeURIComponent(msg)}`;

      if (recapPreviewText) recapPreviewText.textContent = msg;
      if (recapStatus) recapStatus.hidden = false;

      window.open(waUrl, "_blank", "noopener,noreferrer");
    });

    copyRecapBtn?.addEventListener("click", async () => {
      const msg = buildRecapMessage();
      if (recapPreviewText) recapPreviewText.textContent = msg;
      if (recapStatus) recapStatus.hidden = false;

      try {
        await navigator.clipboard.writeText(msg);
        copyRecapBtn.textContent = "Teks Tersalin ✓";
        window.setTimeout(() => {
          copyRecapBtn.textContent = "Salin Teks";
        }, 2000);
      } catch {
        copyRecapBtn.textContent = "Pratinjau Dibuka";
        window.setTimeout(() => {
          copyRecapBtn.textContent = "Salin Teks";
        }, 2000);
      }
    });

    renderAll();
  }

  /* ------------------------------------------------------------------------
     6. Saktah Play (Hijaiyah, Calistung Ceria, Kartu Doa & Adab)
     ------------------------------------------------------------------------ */
  function createSoftChimePlayer() {
    let audioCtx = null;
    let enabled = true;

    const playNote = (freq, duration = 0.22, delay = 0) => {
      if (!enabled) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => { });
      }

      const startAt = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.07, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    };

    return {
      isEnabled: () => enabled,
      setEnabled: (val) => {
        enabled = val;
      },
      playSuccess: () => {
        playNote(523.25, 0.18, 0);
        playNote(659.25, 0.24, 0.11);
      },
      playGentlePrompt: () => {
        playNote(329.63, 0.18, 0);
      },
      playFlip: () => {
        playNote(440, 0.14, 0);
      },
    };
  }

  function initSaktahPlay() {
    const sound = createSoftChimePlayer();
    const soundToggle = $("#soundToggle");
    const soundToggleText = $("#soundToggleText");

    soundToggle?.addEventListener("click", () => {
      const next = !sound.isEnabled();
      sound.setEnabled(next);
      soundToggle.setAttribute("aria-pressed", String(next));
      if (soundToggleText) {
        soundToggleText.textContent = next ? "Nada Lembut: Aktif" : "Nada Lembut: Hening";
      }
      if (next) sound.playFlip();
    });

    // Tabs
    const tabs = $$(".play-tab");
    const panels = $$(".play-panel");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const key = tab.dataset.playTab;
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", String(active));
        });
        panels.forEach((panel) => {
          const match = panel.id === `panel-${key}`;
          panel.classList.toggle("is-active", match);
          panel.hidden = !match;
        });
        sound.playFlip();
      });
    });

    // --- Tab 1: Kartu Balik Pintar (Flip Cards) ---
    const FLIP_ICONS = {
      book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 7h7M9 11h5"/></svg>`,
      meal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.2"/><path d="M4 5v6M6 5v6M20 5v14"/></svg>`,
      heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
      moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z"/><path d="M17 4v3M15.5 5.5h3"/></svg>`,
      door: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M2 21h20"/><circle cx="15" cy="12" r="1"/></svg>`,
      sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/></svg>`,
      speech: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>`,
      tidy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M9 5v14"/></svg>`,
      hands: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c4.5-3 7-6.5 7-10.5A3.5 3.5 0 0 0 12 8.2 3.5 3.5 0 0 0 5 10.5C5 14.5 7.5 18 12 21Z"/><path d="M9.5 12.5l1.8 1.8 3.2-3.5"/></svg>`,
      drop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5C12 2.5 6 9.5 6 14a6 6 0 0 0 12 0c0-4.5-6-11.5-6-11.5Z"/></svg>`,
    };

    const FLIP_CARDS_DATA = [
      {
        id: "doa-belajar",
        category: "doa",
        categoryLabel: "Doa Harian",
        title: "Doa Sebelum Belajar",
        icon: "book",
        arabic: "رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا",
        reading: "“Rabbi zidnii ‘ilmaa, warzuqnii fahmaa.”",
        meaning: "Ya Allah, tambahkanlah ilmu kepadaku dan berilah aku pemahaman yang baik.",
        practice: "Duduk rapi sebelum membuka buku, tarik napas tenang, lalu baca basmalah bersama.",
      },
      {
        id: "doa-makan",
        category: "doa",
        categoryLabel: "Doa Harian",
        title: "Doa Sebelum Makan",
        icon: "meal",
        arabic: "اَللّٰهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ",
        reading: "“Allahumma baarik lanaa fiimaa razaqtanaa wa qinaa ‘adzaabannaar.”",
        meaning: "Ya Allah, berkahilah rezeki yang Engkau berikan kepada kami dan jagalah kami dari api neraka.",
        practice: "Cuci tangan terlebih dahulu, duduk dengan tenang, dan ambil makanan secukupnya.",
      },
      {
        id: "doa-ortu",
        category: "doa",
        categoryLabel: "Doa Harian",
        title: "Doa untuk Orang Tua",
        icon: "heart",
        arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        reading: "“Rabbighfirlii waliwaalidayya warhamhumaa kamaa rabbayaanii shaghiiraa.”",
        meaning: "Ya Tuhanku, ampunilah aku dan kedua orang tuaku serta sayangilah mereka sebagaimana mereka menyayangiku di waktu kecil.",
        practice: "Peluk atau cium tangan Ayah dan Bunda setiap pagi sebelum berangkat atau belajar.",
      },
      {
        id: "doa-tidur",
        category: "doa",
        categoryLabel: "Doa Harian",
        title: "Doa Sebelum Tidur",
        icon: "moon",
        arabic: "بِسْمِكَ اللّٰهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ",
        reading: "“Bismikallaahumma ahyaa wa bismika amuut.”",
        meaning: "Dengan nama-Mu ya Allah aku hidup, dan dengan nama-Mu aku mati.",
        practice: "Sikat gigi, bersihkan tempat tidur, lalu berbaring menghadap kanan.",
      },
      {
        id: "doa-keluar",
        category: "doa",
        categoryLabel: "Doa Harian",
        title: "Doa Keluar Rumah",
        icon: "door",
        arabic: "بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ",
        reading: "“Bismillaahi tawakkaltu ‘alallaah, laa haula wa laa quwwata illaa billaah.”",
        meaning: "Dengan nama Allah, aku bertawakal kepada Allah; tiada daya dan kekuatan selain dengan pertolongan-Nya.",
        practice: "Ucapkan salam kepada keluarga dan melangkah dengan kaki kanan saat keluar pintu.",
      },
      {
        id: "doa-bangun",
        category: "doa",
        categoryLabel: "Doa Harian",
        title: "Doa Bangun Tidur",
        icon: "sun",
        arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ",
        reading: "“Alhamdulillaahilladzii ahyaanaa ba’da maa amaatanaa wa ilaihinnusyuur.”",
        meaning: "Segala puji bagi Allah yang telah menghidupkan kami kembali setelah tidur dan kepada-Nya kami kembali.",
        practice: "Duduk sejenak, usap wajah dengan senyum, lalu bantu merapikan bantal dan selimut.",
      },
      {
        id: "adab-bicara",
        category: "adab",
        categoryLabel: "Adab & Kebiasaan Baik",
        title: "Berbicara Lembut & Santun",
        icon: "speech",
        arabic: "قَوْلٌ مَعْرُوفٌ",
        reading: "“Qaulun ma’ruuf — Ucapan yang baik dan menyejukkan.”",
        meaning: "Menggunakan nada suara yang tenang, tidak membentak, dan mendengarkan saat orang lain berbicara.",
        practice: "Saat meminta sesuatu kepada Ayah, Bunda, atau teman, awali dengan kata “Tolong”.",
      },
      {
        id: "adab-makan",
        category: "adab",
        categoryLabel: "Adab & Kebiasaan Baik",
        title: "Makan Duduk & Tangan Kanan",
        icon: "meal",
        arabic: "كُلْ بِيَمِينِكَ",
        reading: "“Samillaaha wa kul biyamiinika.”",
        meaning: "Biasakan menyebut nama Allah, makan dan minum sambil duduk, serta memakai tangan kanan.",
        practice: "Habiskan makanan di piring tanpa bersisa dan letakkan piring ke dapur setelah selesai.",
      },
      {
        id: "adab-rapi",
        category: "adab",
        categoryLabel: "Adab & Kebiasaan Baik",
        title: "Merapikan Buku & Mainan",
        icon: "tidy",
        arabic: "النَّظَافَةُ مِنَ الْإِيمَانِ",
        reading: "“Kebersihan dan kerapian bagian dari keimanan.”",
        meaning: "Menjaga barang milik sendiri maupun bersama agar tetap tertata setelah digunakan.",
        practice: "Setelah selesai sesi belajar atau bermain, kembalikan pensil dan buku ke kotak semula.",
      },
      {
        id: "adab-terimakasih",
        category: "adab",
        categoryLabel: "Adab & Kebiasaan Baik",
        title: "Mengucap Terima Kasih & Maaf",
        icon: "hands",
        arabic: "جَزَاكُمُ اللهُ خَيْرًا",
        reading: "“Jazaakumullaahu khairan.”",
        meaning: "Menghargai kebaikan orang lain dengan ucapan terima kasih dan berani meminta maaf jika keliru.",
        practice: "Ucapkan “Terima kasih” saat dibantu guru atau orang tua, dan “Maaf” jika tidak sengaja menyenggol teman.",
      },
      {
        id: "adab-salam",
        category: "adab",
        categoryLabel: "Adab & Kebiasaan Baik",
        title: "Menebar Salam & Senyum",
        icon: "heart",
        arabic: "السَّلَامُ عَلَيْكُمْ",
        reading: "“Assalamu’alaikum warahmatullaah.”",
        meaning: "Menyapa dengan hangat dan mendoakan keselamatan saat bertemu guru, orang tua, atau teman.",
        practice: "Ucapkan salam dengan wajah ramah saat masuk kelas atau pulang ke rumah.",
      },
      {
        id: "adab-hemat-air",
        category: "adab",
        categoryLabel: "Adab & Kebiasaan Baik",
        title: "Hemat Air Saat Wudhu",
        icon: "drop",
        arabic: "لَا تُسْرِفْ",
        reading: "“Tidak berlebih-lebihan menggunakan nikmat Allah.”",
        meaning: "Membuka keran air secukupnya saat mencuci tangan atau berwudhu agar air tidak terbuang sia-sia.",
        practice: "Pastikan keran tertutup rapat setiap kali selesai mencuci tangan atau berwudhu.",
      },
    ];

    const flipCardGrid = $("#flipCardGrid");
    const flipFilterBtns = $$(".filter-pill");
    const flipCounterText = $("#flipCounterText");
    const flipResetBtn = $("#flipResetBtn");

    let activeFlipCategory = "all";
    const flippedIds = new Set();

    const updateFlipCounter = (visibleCards) => {
      if (!flipCounterText) return;
      const flippedVisible = visibleCards.filter((c) => flippedIds.has(c.id)).length;
      flipCounterText.textContent =
        flippedVisible > 0
          ? `Terbuka: ${flippedVisible} dari ${visibleCards.length} kartu`
          : "Ketuk kartu untuk membalik";
    };

    const renderFlipCards = () => {
      if (!flipCardGrid) return;
      const visibleCards =
        activeFlipCategory === "all"
          ? FLIP_CARDS_DATA
          : FLIP_CARDS_DATA.filter((card) => card.category === activeFlipCategory);

      flipCardGrid.innerHTML = "";
      visibleCards.forEach((card) => {
        const isFlipped = flippedIds.has(card.id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `flip-card${isFlipped ? " is-flipped" : ""}`;
        btn.setAttribute("aria-pressed", String(isFlipped));
        btn.setAttribute("aria-label", `${card.title} (${card.categoryLabel}). Ketuk untuk membalik kartu.`);

        btn.innerHTML = `
          <div class="flip-card-inner">
            <div class="flip-card-face flip-card-front">
              <span class="flip-cat-tag">${card.categoryLabel}</span>
              <span class="flip-icon-box" aria-hidden="true">${FLIP_ICONS[card.icon] || FLIP_ICONS.book}</span>
              <h3 class="flip-front-title">${card.title}</h3>
              <span class="flip-tap-hint">Ketuk untuk membalik &rarr;</span>
            </div>
            <div class="flip-card-face flip-card-back">
              <div class="flip-back-head">
                <span class="flip-back-title">${card.title}</span>
                <span class="flip-back-close">&larr; Balik</span>
              </div>
              <div class="flip-back-body">
                <p class="flip-arabic" dir="rtl" lang="ar">${card.arabic}</p>
                <p class="flip-reading">${card.reading}</p>
                <p class="flip-meaning">${card.meaning}</p>
              </div>
              <div class="flip-practice-box">
                <strong>Praktik:</strong> ${card.practice}
              </div>
            </div>
          </div>
        `;

        btn.addEventListener("click", () => {
          const nowFlipped = !flippedIds.has(card.id);
          if (nowFlipped) {
            flippedIds.add(card.id);
          } else {
            flippedIds.delete(card.id);
          }
          btn.classList.toggle("is-flipped", nowFlipped);
          btn.setAttribute("aria-pressed", String(nowFlipped));
          updateFlipCounter(visibleCards);
          sound.playFlip();
        });

        flipCardGrid.appendChild(btn);
      });

      updateFlipCounter(visibleCards);
    };

    flipFilterBtns.forEach((pill) => {
      pill.addEventListener("click", () => {
        activeFlipCategory = pill.dataset.flipCategory || "all";
        flipFilterBtns.forEach((p) => p.classList.toggle("is-active", p === pill));
        renderFlipCards();
        sound.playFlip();
      });
    });

    flipResetBtn?.addEventListener("click", () => {
      flippedIds.clear();
      renderFlipCards();
      sound.playFlip();
    });

    renderFlipCards();

    // --- Tab 2: Kuis Bintang Saktah ---
    const LEAF_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-7 0-12 4-12 11 0 1.5.5 2.5 1 3 1 .5 2 1 3.5 1 7 0 11-5 11-12 0-1.2-.8-3-3.5-3Z"/><path d="M7 19c3-3 6-6 10-10"/></svg>`;
    const STAR_OUTLINE_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.85 5.78 6.38.93-4.61 4.5 1.09 6.35L12 17.06l-5.71 3 1.09-6.35-4.61-4.5 6.38-.93L12 2.5Z"/></svg>`;

    const QUIZ_QUESTIONS = [
      {
        topic: "Adab Harian",
        question: "Saat Ayah atau Bunda memanggil kita, bagaimana sebaiknya sikap kita?",
        options: [
          "Menjawab dengan lembut dan segera datang",
          "Pura-pura tidak mendengar",
          "Berteriak dari jauh dengan kesal",
        ],
        correctIndex: 0,
        successMsg: "MasyaAllah, tepat sekali! Menjawab dengan suara lembut membuat orang tua senang.",
        gentleHint: "Tidak apa-apa ya, jawaban yang baik adalah menjawab panggilan orang tua dengan suara lembut dan segera menghampiri.",
      },
      {
        topic: "Doa Pendek",
        question: "Doa apa yang kita baca sebelum mulai membuka buku dan belajar?",
        options: [
          "Rabbi zidnii ‘ilmaa, warzuqnii fahmaa",
          "Bismikallaahumma ahyaa wa bismika amuut",
          "Allahumma baarik lanaa fiimaa razaqtanaa",
        ],
        correctIndex: 0,
        successMsg: "Benar! Itu doa memohon tambahan ilmu dan pemahaman yang baik sebelum belajar.",
        gentleHint: "Semangat terus ya! Doa sebelum belajar berbunyi: “Rabbi zidnii ‘ilmaa, warzuqnii fahmaa.”",
      },
      {
        topic: "Berhitung Dasar",
        question: "Ayo hitung pelan-pelan, ada berapa jumlah daun hijau pada kartu ini?",
        visualCountA: 3,
        visualCountB: 2,
        options: ["4 daun", "5 daun", "6 daun"],
        correctIndex: 1,
        successMsg: "Hebat dan teliti! 3 daun ditambah 2 daun sama dengan 5 daun.",
        gentleHint: "Hampir tepat! Yuk hitung lagi pelan-pelan: 3 daun ditambah 2 daun jumlahnya 5 daun.",
      },
      {
        topic: "Adab Harian",
        question: "Ketika kita makan dan minum, sebaiknya dilakukan sambil apa?",
        options: [
          "Berlari-lari di halaman",
          "Duduk tenang dan menggunakan tangan kanan",
          "Berbicara dengan mulut penuh",
        ],
        correctIndex: 1,
        successMsg: "Tepat sekali! Makan sambil duduk dengan tangan kanan adalah adab yang mulia.",
        gentleHint: "Belum tepat, tidak apa-apa ya. Adab makan yang baik adalah duduk tenang dan memakai tangan kanan.",
      },
      {
        topic: "Doa Pendek",
        question: "Bacaan singkat apakah yang kita ucapkan sebagai rasa syukur setelah selesai makan atau belajar?",
        options: [
          "Alhamdulillaahirabbil ‘aalamiin",
          "Astaghfirullaah",
          "Bismillaahirrahmaanirrahiim",
        ],
        correctIndex: 0,
        successMsg: "Pintar! Mengucap Alhamdulillah berarti kita bersyukur atas nikmat Allah.",
        gentleHint: "Tetap semangat! Setelah selesai makan atau belajar, kita mengucap syukur dengan “Alhamdulillaahirabbil ‘aalamiin”.",
      },
      {
        topic: "Berhitung Dasar",
        question: "Jika Aisyah memiliki 4 lembar kartu huruf, lalu ustazah memberi 3 kartu lagi, berapa total kartunya?",
        visualCountA: 4,
        visualCountB: 3,
        options: ["6 kartu", "7 kartu", "8 kartu"],
        correctIndex: 1,
        successMsg: "MasyaAllah cerdas! 4 kartu ditambah 3 kartu menjadi 7 kartu.",
        gentleHint: "Yuk coba hitung bersama lagi: 4 daun di kiri dan 3 daun di kanan berjumlah 7!",
      },
      {
        topic: "Adab Harian",
        question: "Apa yang sebaiknya dilakukan setelah selesai bermain atau belajar di meja?",
        options: [
          "Membiarkan buku dan pensil berserakan",
          "Merapikan kembali buku dan alat tulis ke tempatnya",
          "Menunggu orang lain membereskannya",
        ],
        correctIndex: 1,
        successMsg: "Betul sekali! Anak hebat selalu bertanggung jawab merapikan barangnya kembali.",
        gentleHint: "Pelan-pelan belajar bersama ya: merapikan kembali buku dan pensil setelah dipakai adalah kebiasaan baik.",
      },
      {
        topic: "Doa Pendek",
        question: "Saat mengucapkan “Rabbighfirlii waliwaalidayya...”, kita sedang mendoakan siapa?",
        options: [
          "Kedua orang tua (Ayah dan Bunda)",
          "Mainan kesayangan",
          "Cuaca di luar rumah",
        ],
        correctIndex: 0,
        successMsg: "Tepat! Itu adalah doa memohon ampunan dan kasih sayang Allah untuk Ayah dan Bunda.",
        gentleHint: "Tidak apa-apa, yuk ingat lagi: “wa liwaalidayya” berarti untuk kedua orang tua kita.",
      },
      {
        topic: "Berhitung Dasar",
        question: "Ada 8 buah kurma di piring. Jika 2 kurma dimakan dengan tangan kanan, berapa sisa kurmanya?",
        options: ["5 kurma", "6 kurma", "7 kurma"],
        correctIndex: 1,
        successMsg: "Luar biasa teliti! 8 dikurangi 2 sisanya adalah 6 kurma.",
        gentleHint: "Hampir benar! Jika dari 8 jari kita tekuk 2 jari, sisanya ada 6 ya.",
      },
    ];

    const quizStage = $("#quizStage");
    const quizSummaryCard = $("#quizSummaryCard");
    const quizStepLabel = $("#quizStepLabel");
    const quizProgressFill = $("#quizProgressFill");
    const quizStarBadge = $("#quizStarBadge");
    const quizStarCount = $("#quizStarCount");
    const quizTopicPill = $("#quizTopicPill");
    const quizQuestionText = $("#quizQuestionText");
    const quizVisualHelper = $("#quizVisualHelper");
    const quizOptionsGrid = $("#quizOptionsGrid");
    const quizFeedbackArea = $("#quizFeedbackArea");
    const quizStarAward = $("#quizStarAward");
    const quizFeedbackMsg = $("#quizFeedbackMsg");
    const quizNextBtn = $("#quizNextBtn");

    const quizSummaryTitle = $("#quizSummaryTitle");
    const quizSummaryScore = $("#quizSummaryScore");
    const quizSummaryStarsRow = $("#quizSummaryStarsRow");
    const quizSummaryMessage = $("#quizSummaryMessage");
    const quizRestartBtn = $("#quizRestartBtn");

    let quizIndex = 0;
    let quizStars = 0;
    let quizAnswered = false;

    const renderQuizQuestion = () => {
      if (!quizOptionsGrid || !quizQuestionText) return;
      quizAnswered = false;

      const total = QUIZ_QUESTIONS.length;
      const q = QUIZ_QUESTIONS[quizIndex];
      const pct = Math.round(((quizIndex + 1) / total) * 100);

      if (quizStage) quizStage.hidden = false;
      if (quizSummaryCard) quizSummaryCard.hidden = true;
      if (quizFeedbackArea) quizFeedbackArea.hidden = true;
      if (quizStarAward) quizStarAward.hidden = true;

      if (quizStepLabel) quizStepLabel.textContent = `Soal ${quizIndex + 1} dari ${total}`;
      if (quizProgressFill) quizProgressFill.style.width = `${pct}%`;
      if (quizStarCount) quizStarCount.textContent = `${quizStars} Bintang`;
      if (quizTopicPill) quizTopicPill.textContent = q.topic;
      quizQuestionText.textContent = q.question;

      if (quizVisualHelper) {
        if (typeof q.visualCountA === "number" && typeof q.visualCountB === "number") {
          quizVisualHelper.hidden = false;
          quizVisualHelper.innerHTML = "";
          for (let i = 0; i < q.visualCountA; i += 1) {
            const tok = document.createElement("span");
            tok.className = "leaf-token";
            tok.setAttribute("aria-hidden", "true");
            tok.innerHTML = LEAF_SVG;
            quizVisualHelper.appendChild(tok);
          }
          const plus = document.createElement("span");
          plus.className = "quiz-math-plus";
          plus.textContent = "+";
          quizVisualHelper.appendChild(plus);
          for (let j = 0; j < q.visualCountB; j += 1) {
            const tok = document.createElement("span");
            tok.className = "leaf-token";
            tok.setAttribute("aria-hidden", "true");
            tok.innerHTML = LEAF_SVG;
            quizVisualHelper.appendChild(tok);
          }
        } else {
          quizVisualHelper.hidden = true;
          quizVisualHelper.innerHTML = "";
        }
      }

      if (quizNextBtn) {
        quizNextBtn.textContent =
          quizIndex === total - 1 ? "Lihat Kartu Apresiasi" : "Soal Berikutnya";
      }

      const letters = ["A", "B", "C", "D"];
      quizOptionsGrid.innerHTML = "";

      q.options.forEach((optText, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option-btn";
        btn.innerHTML = `
          <span class="quiz-option-letter">${letters[idx]}</span>
          <span>${optText}</span>
        `;

        btn.addEventListener("click", () => {
          if (quizAnswered) return;
          quizAnswered = true;

          const allOptionBtns = $$(".quiz-option-btn", quizOptionsGrid);
          allOptionBtns.forEach((b) => {
            b.disabled = true;
          });

          const isCorrect = idx === q.correctIndex;
          if (isCorrect) {
            quizStars += 1;
            btn.classList.add("is-correct");
            if (quizStarCount) quizStarCount.textContent = `${quizStars} Bintang`;
            if (quizStarBadge) {
              quizStarBadge.classList.remove("is-pop");
              void quizStarBadge.offsetWidth;
              quizStarBadge.classList.add("is-pop");
            }
            if (quizStarAward) quizStarAward.hidden = false;
            if (quizFeedbackMsg) quizFeedbackMsg.textContent = q.successMsg;
            sound.playSuccess();
          } else {
            btn.classList.add("is-gentle-wrong");
            allOptionBtns[q.correctIndex]?.classList.add("is-correct");
            if (quizStarAward) quizStarAward.hidden = true;
            if (quizFeedbackMsg) quizFeedbackMsg.textContent = q.gentleHint;
            sound.playGentlePrompt();
          }

          if (quizFeedbackArea) quizFeedbackArea.hidden = false;
        });

        quizOptionsGrid.appendChild(btn);
      });
    };

    const showQuizSummary = () => {
      const total = QUIZ_QUESTIONS.length;
      if (quizStage) quizStage.hidden = true;
      if (quizSummaryCard) quizSummaryCard.hidden = false;

      let title = "MasyaAllah, Semangat Belajarnya Luar Biasa!";
      let note = "Terima kasih sudah mencoba dengan tenang. Terus berlatih doa, adab, dan berhitung bersama Ayah & Bunda ya!";

      if (quizStars === total) {
        title = "Sempurna! Bintang Teladan Saktah!";
        note = "MasyaAllah, semua soal dijawab dengan sangat teliti dan tenang. Semoga ilmunya membawa keberkahan!";
      } else if (quizStars >= 6) {
        title = "MasyaAllah, Hebat Sekali!";
        note = "Kamu sudah memahami banyak adab baik, doa pendek, dan berhitung dengan baik. Teruskan kebiasaannya ya!";
      }

      if (quizSummaryTitle) quizSummaryTitle.textContent = title;
      if (quizSummaryScore) {
        quizSummaryScore.textContent = `Kamu berhasil mengumpulkan ${quizStars} dari ${total} Bintang Saktah.`;
      }
      if (quizSummaryMessage) quizSummaryMessage.textContent = note;

      if (quizSummaryStarsRow) {
        quizSummaryStarsRow.innerHTML = "";
        for (let i = 0; i < total; i += 1) {
          const star = document.createElement("span");
          star.className = `summary-star-dot${i < quizStars ? " is-earned" : ""}`;
          star.innerHTML = STAR_OUTLINE_SVG;
          quizSummaryStarsRow.appendChild(star);
        }
      }

      sound.playSuccess();
    };

    quizNextBtn?.addEventListener("click", () => {
      if (quizIndex < QUIZ_QUESTIONS.length - 1) {
        quizIndex += 1;
        renderQuizQuestion();
        sound.playFlip();
      } else {
        showQuizSummary();
      }
    });

    quizRestartBtn?.addEventListener("click", () => {
      quizIndex = 0;
      quizStars = 0;
      renderQuizQuestion();
      sound.playFlip();
    });

    renderQuizQuestion();
  }

  /* ------------------------------------------------------------------------
     7. FAQ Accordion
     ------------------------------------------------------------------------ */
  function initFaqAccordion() {
    const triggers = $$(".faq-trigger", $("#faqAccordion"));

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const panelId = trigger.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        const item = trigger.closest(".faq-item");
        if (!panel || !item) return;

        const isExpanded = trigger.getAttribute("aria-expanded") === "true";
        trigger.setAttribute("aria-expanded", String(!isExpanded));
        item.classList.toggle("is-open", !isExpanded);
        panel.hidden = isExpanded;
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. Formulir Pendaftaran Kelas -> WhatsApp
     ------------------------------------------------------------------------ */
  function initRegistrationForm() {
    const form = $("#registrationForm");
    if (!form) return;

    const childName = $("#childName");
    const childAge = $("#childAge");
    const programChoice = $("#programChoice");
    const preferredSchedule = $("#preferredSchedule");
    const parentNotes = $("#parentNotes");

    const formStatus = $("#formStatus");
    const formStatusText = $("#formStatusText");
    const manualWaLink = $("#manualWaLink");
    const copyWaMsgBtn = $("#copyWaMsgBtn");

    let latestFormattedMessage = "";

    const fields = [
      {
        input: childName,
        errorEl: $("#errorChildName"),
        message: "Mohon isi nama lengkap atau panggilan buah hati.",
      },
      {
        input: childAge,
        errorEl: $("#errorChildAge"),
        message: "Mohon isi usia atau jenjang sekolah anak saat ini.",
      },
      {
        input: programChoice,
        errorEl: $("#errorProgramChoice"),
        message: "Mohon pilih salah satu program belajar.",
      },
      {
        input: preferredSchedule,
        errorEl: $("#errorPreferredSchedule"),
        message: "Mohon pilih jadwal belajar yang diinginkan.",
      },
    ];

    const validateField = (field) => {
      const value = field.input?.value.trim() || "";
      const valid = value.length > 0;
      if (field.input) {
        field.input.setAttribute("aria-invalid", String(!valid));
      }
      if (field.errorEl) {
        field.errorEl.textContent = valid ? "" : field.message;
      }
      return valid;
    };

    fields.forEach((field) => {
      const eventName = field.input?.tagName === "SELECT" ? "change" : "input";
      field.input?.addEventListener(eventName, () => {
        if (field.input.getAttribute("aria-invalid") === "true") {
          validateField(field);
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      let firstInvalid = null;
      let allValid = true;

      fields.forEach((field) => {
        const ok = validateField(field);
        if (!ok) {
          allValid = false;
          if (!firstInvalid) firstInvalid = field.input;
        }
      });

      if (!allValid) {
        firstInvalid?.focus();
        return;
      }

      const nameVal = childName.value.trim();
      const ageVal = childAge.value.trim();
      const programVal = programChoice.value.trim();
      const scheduleVal = preferredSchedule.value.trim();
      const notesVal = parentNotes?.value.trim() || "-";

      latestFormattedMessage = [
        "Assalamu'alaikum Saktah Tarbiyah,",
        "Saya ingin mendaftarkan kelas untuk buah hati dengan rincian berikut:",
        "",
        `• Nama Anak: ${nameVal}`,
        `• Usia / Jenjang: ${ageVal}`,
        `• Pilihan Program: ${programVal}`,
        `• Jadwal Diinginkan: ${scheduleVal}`,
        `• Catatan Orang Tua: ${notesVal}`,
        "",
        "Mohon informasi ketersediaan jadwal dan langkah selanjutnya. Terima kasih.",
      ].join("\n");

      const waUrl = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(latestFormattedMessage)}`;

      if (manualWaLink) {
        manualWaLink.href = waUrl;
      }
      if (formStatusText) {
        formStatusText.textContent = `Pesan pendaftaran untuk ${nameVal} (${programVal}) sudah siap. Jika tab WhatsApp tidak terbuka otomatis, gunakan tombol di bawah ini.`;
      }
      if (formStatus) {
        formStatus.hidden = false;
      }

      window.open(waUrl, "_blank", "noopener,noreferrer");
    });

    copyWaMsgBtn?.addEventListener("click", async () => {
      if (!latestFormattedMessage) return;
      try {
        await navigator.clipboard.writeText(latestFormattedMessage);
        copyWaMsgBtn.textContent = "Teks Tersalin ✓";
        window.setTimeout(() => {
          copyWaMsgBtn.textContent = "Salin Teks Pesan";
        }, 2000);
      } catch {
        copyWaMsgBtn.textContent = "Gunakan Tombol WhatsApp";
      }
    });
  }

  /* ------------------------------------------------------------------------
     9. Footer Year, Service Worker & Init
     ------------------------------------------------------------------------ */
  function initCurrentYear() {
    const yearEl = $("#currentYear");
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Lewati diam-diam jika pendaftaran gagal pada lingkungan pratinjau lokal
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLogoFallback();
    initThemeToggle();
    initNavigation();
    initProgramSelectors();
    initAttendanceCard();
    initSaktahPlay();
    initFaqAccordion();
    initRegistrationForm();
    initCurrentYear();
    initServiceWorker();
  });
})();
