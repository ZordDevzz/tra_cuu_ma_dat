/**
 * APP.JS — Động cơ tra cứu từ điển mã loại đất phía Client
 * Hoạt động 100% trong bộ nhớ trình duyệt, không cần backend hay mạng ngoài.
 */

(function () {
  "use strict";

  // Kiểm tra dữ liệu tĩnh nạp từ data.js
  if (!window.LAND_DATA || !Array.isArray(window.LAND_DATA.dictionary)) {
    console.error("Lỗi: Không tìm thấy cơ sở dữ liệu window.LAND_DATA!");
    return;
  }

  const { dictionary, legalDocs } = window.LAND_DATA;

  // Trạng thái ứng dụng (State)
  const state = {
    searchQuery: "",
    groupFilter: "ALL",
    periodFilter: "ALL",
    selectedId: null,
    filteredItems: []
  };

  // DOM Elements
  const searchInput = document.getElementById("searchInput");
  const searchClear = document.getElementById("searchClear");
  const groupFilterPills = document.getElementById("groupFilterPills");
  const periodFilterSelect = document.getElementById("periodFilterSelect");
  const candidateList = document.getElementById("candidateList");
  const visibleCount = document.getElementById("visibleCount");
  const totalCount = document.getElementById("totalCount");
  const btnResetFilter = document.getElementById("btnResetFilter");

  const detailView = document.getElementById("detailView");
  const emptyView = document.getElementById("emptyView");

  // Hero elements
  const heroCodeBadge = document.getElementById("heroCodeBadge");
  const heroTitle = document.getElementById("heroTitle");
  const heroBadges = document.getElementById("heroBadges");
  const btnCopyCode = document.getElementById("btnCopyCode");
  const btnCopyCitation = document.getElementById("btnCopyCitation");
  const btnShareLink = document.getElementById("btnShareLink");

  // Color preview elements
  const colorSpecCard = document.getElementById("colorSpecCard");
  const colorPreviewBox = document.getElementById("colorPreviewBox");
  const colorRgbVal = document.getElementById("colorRgbVal");
  const colorHexVal = document.getElementById("colorHexVal");
  const colorTargetName = document.getElementById("colorTargetName");

  // Timeline & Statutory details
  const timelineContainer = document.getElementById("timelineContainer");
  const detailLegalBasis = document.getElementById("detailLegalBasis");
  const detailDefinition = document.getElementById("detailDefinition");
  const detailEvolution = document.getElementById("detailEvolution");
  const crossTableBody = document.getElementById("crossTableBody");
  const specialLegalContainer = document.getElementById("specialLegalContainer");
  const relatedChips = document.getElementById("relatedChips");

  // Modal 22 văn bản
  const docsModal = document.getElementById("docsModal");
  const btnOpenDocs = document.getElementById("btnOpenDocs");
  const btnCloseDocsModal = document.getElementById("btnCloseDocsModal");
  const btnConfirmCloseModal = document.getElementById("btnConfirmCloseModal");
  const docsTableBody = document.getElementById("docsTableBody");
  const toast = document.getElementById("toast");

  // =========================================================================
  // TIỆN ÍCH CHUẨN HÓA TIẾNG VIỆT & CHỈ MỤC TÌM KIẾM
  // =========================================================================
  function removeVietnameseTones(str) {
    if (!str) return "";
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Tiền xử lý chỉ mục tìm kiếm cho từng bản ghi
  dictionary.forEach(item => {
    const rawSearchText = [
      item.code,
      item.displayCode,
      item.name,
      item.group,
      item.status,
      item.legalBasis,
      item.definition,
      item.evolutionNote,
      item.primaryPeriod,
      JSON.stringify(item.comparison || {})
    ].join(" ");
    item._searchIndex = removeVietnameseTones(rawSearchText);
    item._codeLower = (item.code || "").toLowerCase();
  });

  // =========================================================================
  // BỘ LỌC & TÌM KIẾM
  // =========================================================================
  function filterDictionary() {
    const queryNorm = removeVietnameseTones(state.searchQuery.trim());
    const group = state.groupFilter;
    const period = state.periodFilter;

    state.filteredItems = dictionary.filter(item => {
      // 1. Lọc theo từ khóa
      if (queryNorm) {
        if (!item._searchIndex.includes(queryNorm)) {
          return false;
        }
      }

      // 2. Lọc theo nhóm đất
      if (group !== "ALL") {
        const itemGrp = item.group.toLowerCase();
        if (group === "NNP" && !itemGrp.includes("nông nghiệp")) return false;
        if (group === "NNP" && itemGrp.includes("phi nông nghiệp")) return false;
        if (group === "PNN" && !itemGrp.includes("phi nông nghiệp")) return false;
        if (group === "CSD" && !itemGrp.includes("chưa sử dụng")) return false;
        if (group === "HL" && !(item.status.includes("Hành lang") || item.name.includes("Hành lang"))) return false;
        if (group === "QH" && !itemGrp.includes("quy hoạch")) return false;
        if (group === "SUB" && !itemGrp.includes("đối tượng")) return false;
      }

      // 3. Lọc theo thời kỳ pháp luật
      if (period !== "ALL") {
        const pStr = (item.primaryPeriod + " " + item.sourceSheet + " " + JSON.stringify(item.comparison)).toLowerCase();
        if (period === "2024" && !pStr.includes("2024")) return false;
        if (period === "2013" && !pStr.includes("2013")) return false;
        if (period === "2003" && !pStr.includes("2003")) return false;
        if (period === "1993_2001" && !(pStr.includes("1995") || pStr.includes("2001") || pStr.includes("1993"))) return false;
        if (period === "299" && !pStr.includes("299")) return false;
      }

      return true;
    });

    renderCandidateList();
    updateCounter();

    // Tự động chọn item đầu tiên nếu danh sách hiện tại chưa có selection hoặc selection bị ẩn
    if (state.filteredItems.length > 0) {
      const exists = state.filteredItems.some(it => it.id === state.selectedId);
      if (!exists) {
        selectItem(state.filteredItems[0].id, false);
      }
    } else {
      showEmptyState();
    }
  }

  // =========================================================================
  // RENDER DANH SÁCH CANDIDATE
  // =========================================================================
  function renderCandidateList() {
    candidateList.innerHTML = "";

    if (state.filteredItems.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-list-msg";
      emptyDiv.style.padding = "24px 16px";
      emptyDiv.style.textAlign = "center";
      emptyDiv.style.color = "var(--text-muted)";
      emptyDiv.style.fontSize = "0.85rem";
      emptyDiv.textContent = "Không tìm thấy mã loại đất nào phù hợp với bộ lọc.";
      candidateList.appendChild(emptyDiv);
      return;
    }

    const fragment = document.createDocumentFragment();

    state.filteredItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "candidate-card" + (item.id === state.selectedId ? " active" : "");
      card.dataset.id = item.id;

      // Group badge tag
      let tagClass = "tag-nnp";
      let tagLabel = "Nông nghiệp";
      const grp = item.group.toLowerCase();
      if (grp.includes("phi nông nghiệp")) {
        tagClass = "tag-pnn";
        tagLabel = "Phi NN";
      } else if (grp.includes("chưa sử dụng")) {
        tagClass = "tag-csd";
        tagLabel = "Chưa SD";
      } else if (grp.includes("quy hoạch")) {
        tagClass = "tag-qh";
        tagLabel = "Quy hoạch";
      } else if (grp.includes("đối tượng")) {
        tagClass = "tag-sub";
        tagLabel = "Đối tượng";
      } else if (item.status.includes("Hành lang")) {
        tagClass = "tag-hl";
        tagLabel = "Hành lang";
      }

      // Màu RGB dot
      const colorDotHtml = item.rgb && item.rgb.hex 
        ? `<span class="color-dot" style="background-color: ${item.rgb.hex};"></span>`
        : "";

      card.innerHTML = `
        <div class="card-top">
          <div class="card-code-wrap">
            ${colorDotHtml}
            <span class="card-code">${escapeHtml(item.displayCode || item.code)}</span>
          </div>
          <span class="badge-tag ${tagClass}">${tagLabel}</span>
        </div>
        <div class="card-name">${escapeHtml(item.name)}</div>
        <div class="card-subtext">
          <span class="card-period-hint">${escapeHtml(item.primaryPeriod)}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        selectItem(item.id, true);
      });

      fragment.appendChild(card);
    });

    candidateList.appendChild(fragment);
  }

  function updateCounter() {
    visibleCount.textContent = state.filteredItems.length;
    totalCount.textContent = dictionary.length;

    const isFiltered = state.searchQuery || state.groupFilter !== "ALL" || state.periodFilter !== "ALL";
    if (isFiltered) {
      btnResetFilter.classList.remove("hidden");
    } else {
      btnResetFilter.classList.add("hidden");
    }
  }

  // =========================================================================
  // CHỌN VÀ HIỂN THỊ CHI TIẾT MÃ ĐẤT
  // =========================================================================
  function selectItem(id, updateHash = true) {
    const item = dictionary.find(it => it.id === id);
    if (!item) return;

    state.selectedId = id;

    // Cập nhật class active trong danh sách candidate
    const cards = candidateList.querySelectorAll(".candidate-card");
    cards.forEach(c => {
      if (c.dataset.id === id) {
        c.classList.add("active");
        c.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        c.classList.remove("active");
      }
    });

    renderDetail(item);

    // Cập nhật URL Hash
    if (updateHash) {
      window.location.hash = "code=" + encodeURIComponent(item.code);
    }
  }

  function renderDetail(item) {
    emptyView.classList.add("hidden");
    detailView.classList.remove("hidden");

    // 1. HERO SECTION
    heroCodeBadge.textContent = item.displayCode || item.code;
    heroTitle.textContent = item.name;

    // Nhóm màu thẻ hero
    let tagClass = "tag-nnp";
    const grp = item.group.toLowerCase();
    if (grp.includes("phi nông nghiệp")) tagClass = "tag-pnn";
    else if (grp.includes("chưa sử dụng")) tagClass = "tag-csd";
    else if (grp.includes("quy hoạch")) tagClass = "tag-qh";
    else if (grp.includes("đối tượng")) tagClass = "tag-sub";
    else if (item.status.includes("Hành lang")) tagClass = "tag-hl";

    let rgbBadgeHtml = "";
    if (item.rgb && item.rgb.hex) {
      colorPreviewBox.classList.remove("hidden");
      colorPreviewBox.style.backgroundColor = item.rgb.hex;
      colorPreviewBox.title = `Mẫu màu bản đồ: RGB(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b}) - ${item.rgb.hex}`;
      rgbBadgeHtml = `<span class="badge-tag" style="background-color: #E2E8F0; color: #1E293B; font-family: var(--font-mono);" title="Thông số màu bản đồ hiện trạng">RGB: ${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b} (${item.rgb.hex})</span>`;
    } else {
      colorPreviewBox.classList.add("hidden");
    }

    heroBadges.innerHTML = `
      <span class="badge-tag ${tagClass}">${escapeHtml(item.group)}</span>
      <span class="badge-tag" style="background-color: #E2E8F0; color: #334155;">${escapeHtml(item.primaryPeriod)}</span>
      <span class="badge-tag" style="background-color: #FEF3C7; color: #92400E;">${escapeHtml(item.status)}</span>
      ${rgbBadgeHtml}
    `;

    // 2. TRỤC THỜI GIAN 5 THỜI KỲ (DẠNG NGANG DENSE)
    renderTimeline(item);

    // 3. QUY ĐỊNH PHÁP LUẬT CHI TIẾT
    detailLegalBasis.textContent = item.legalBasis || "Quy định tại Luật Đất đai 2024 và các văn bản hướng dẫn thi hành.";
    detailDefinition.textContent = item.definition || item.name;
    detailEvolution.textContent = item.evolutionNote || "Không có thay đổi cơ bản qua các thời kỳ.";

    // 4. BẢNG ĐỐI CHIẾU CÁC VĂN BẢN QUY PHẠM
    renderCrossComparisonTable(item);

    // 5. PHÁP LÝ ĐẶC THÙ (ĐIỀU 141, ĐIỀU 210, ĐIỀU 152)
    renderSpecialLegal(item);

    // 6. CÁC MÃ LIÊN QUAN
    renderRelatedChips(item);
  }

  function renderTimeline(item) {
    timelineContainer.innerHTML = "";
    const timeline = item.timeline || [];

    timeline.forEach((step, idx) => {
      const isCurrent = idx === timeline.length - 1;
      const node = document.createElement("div");
      node.className = "timeline-node" + (isCurrent ? " current-era" : "");
      node.innerHTML = `
        <div class="timeline-period-name">${escapeHtml(step.period)}</div>
        <div class="timeline-code-badge">${escapeHtml(step.code || "-")}</div>
        <div class="timeline-doc-hint" title="${escapeHtml(step.doc)} · ${escapeHtml(step.status || '')}">${escapeHtml(step.doc)}</div>
      `;
      timelineContainer.appendChild(node);
    });
  }

  function renderCrossComparisonTable(item) {
    crossTableBody.innerHTML = "";
    const cmp = item.comparison || {};

    const rows = [
      {
        era: "Luật Đất đai 2024 (Hiện hành)",
        doc: "Thông tư 08/2024/TT-BTNMT & NĐ 102/2024/NĐ-CP",
        code: cmp.m24 || item.code,
        note: "Quy định mã loại đất thống kê, kiểm kê và sổ địa chính hiện hành"
      },
      {
        era: "Luật Đất đai 2013 (Bản đồ địa chính)",
        doc: "Thông tư 25/2014/TT-BTNMT (Điểm 13 Mục III)",
        code: cmp.m13_bddc || "-",
        note: "Ký hiệu thể hiện trên bản đồ địa chính tỷ lệ lớn"
      },
      {
        era: "Luật Đất đai 2013 (Giấy chứng nhận / Sổ đỏ)",
        doc: "Thông tư 23/2014/TT-BTNMT (Trang 2 GCN)",
        code: cmp.m13_sodo || "-",
        note: "Mã loại đất in trên bìa và trang 2 Giấy chứng nhận"
      },
      {
        era: "Luật Đất đai 2013 (Kiểm kê đất đai & Bản đồ hiện trạng)",
        doc: "Thông tư 27/2018/TT-BTNMT (Phụ lục 01)",
        code: cmp.m13_kk || "-",
        note: "Kèm phân nhóm cấp bậc và mã màu RGB chuẩn hóa"
      },
      {
        era: "Luật Đất đai 2003 (Hồ sơ địa chính & GCN)",
        doc: "Thông tư 09/2007/TT-BTNMT & TT 17/2009/TT-BTNMT",
        code: cmp.m03_hsdc || "-",
        note: "Ký hiệu ghi trên hồ sơ địa chính và GCN thời kỳ 2004-2014"
      },
      {
        era: "Luật Đất đai 2003 (Kiểm kê đất đai)",
        doc: "Thông tư 08/2007/TT-BTNMT & NĐ 181/2004/NĐ-CP",
        code: cmp.m03_kk || "-",
        note: "Bao gồm các mã chỉ tiêu chi tiết: LNC, LNQ, LNK, COC, RSN, RST..."
      },
      {
        era: "Giai đoạn 1993 - 2001",
        doc: "Thông tư 1990/2001/TT-TCĐC & QĐ 499 QĐ/ĐC (1995)",
        code: cmp.m95 || "-",
        note: "Ký hiệu ghi sổ địa chính, sổ mục kê và GCN giai đoạn 1995-2001"
      },
      {
        era: "Chỉ thị 299/TTg (Trước 1993)",
        doc: "Chỉ thị 299/TTg, QĐ 56-ĐKTK & QĐ 201-ĐKTK",
        code: cmp.m299 || "-",
        note: "Bản đồ giải thửa 299, Sổ mục kê và Sổ đăng ký ruộng đất"
      }
    ];

    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600;">${escapeHtml(r.era)}</td>
        <td>${escapeHtml(r.doc)}</td>
        <td><code>${escapeHtml(r.code)}</code></td>
        <td style="color: var(--text-secondary);">${escapeHtml(r.note)}</td>
      `;
      crossTableBody.appendChild(tr);
    });
  }

  function renderSpecialLegal(item) {
    specialLegalContainer.innerHTML = "";
    const special = item.specialLegal || {};
    let hasSpecial = false;

    // 1. Căn cứ cấp GCN đất ở từ đất 299 (Điều 141)
    if (special.certificateRecognition) {
      hasSpecial = true;
      const alertDiv = document.createElement("div");
      alertDiv.className = "legal-alert alert-info";
      alertDiv.innerHTML = `
        <svg class="legal-alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <div>
          <div class="legal-alert-title">Căn cứ Công nhận Quyền Sử dụng Đất ở & Hạn mức (Điều 141 Luật Đất đai 2024):</div>
          <div>${escapeHtml(special.certificateRecognition)}</div>
        </div>
      `;
      specialLegalContainer.appendChild(alertDiv);
    }

    // 2. Phạm vi hạn chế quyền hành lang an toàn (Điều 210)
    if (special.restrictions) {
      hasSpecial = true;
      const alertDiv = document.createElement("div");
      alertDiv.className = "legal-alert alert-warning";
      alertDiv.innerHTML = `
        <svg class="legal-alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <div>
          <div class="legal-alert-title">Ranh giới Hạn chế Quyền Sử dụng Đất (Điều 210 Luật Đất đai 2024):</div>
          <div>${escapeHtml(special.restrictions)}</div>
        </div>
      `;
      specialLegalContainer.appendChild(alertDiv);
    }

    // 3. Cảnh báo đính chính dữ liệu gốc (Điều 152 Luật 2024)
    if (special.auditNote) {
      hasSpecial = true;
      const alertDiv = document.createElement("div");
      alertDiv.className = "legal-alert alert-caution";
      alertDiv.innerHTML = `
        <svg class="legal-alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <div>
          <div class="legal-alert-title">Quy định về Thẩm quyền Đính chính Sai sót CSDL Địa chính:</div>
          <div>${escapeHtml(special.auditNote)}</div>
        </div>
      `;
      specialLegalContainer.appendChild(alertDiv);
    }

    if (hasSpecial) {
      specialLegalContainer.classList.remove("hidden");
    } else {
      specialLegalContainer.classList.add("hidden");
    }
  }

  function renderRelatedChips(item) {
    relatedChips.innerHTML = "";

    // Tìm các mã cùng nhóm hoặc có liên quan logic
    const sameGroupItems = dictionary.filter(it => 
      it.id !== item.id && 
      it.group === item.group && 
      !it.status.includes("sai sót")
    ).slice(0, 10);

    if (sameGroupItems.length === 0) {
      relatedChips.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Không có mã phụ thuộc cùng nhóm.</span>`;
      return;
    }

    sameGroupItems.forEach(rel => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `
        <span class="chip-code">${escapeHtml(rel.displayCode || rel.code)}</span>
        <span>${escapeHtml(rel.name)}</span>
      `;
      chip.addEventListener("click", () => {
        selectItem(rel.id, true);
      });
      relatedChips.appendChild(chip);
    });
  }

  function showEmptyState() {
    emptyView.classList.remove("hidden");
    detailView.classList.add("hidden");
  }

  // =========================================================================
  // MODAL 22 VĂN BẢN QUY PHẠM PHÁP LUẬT
  // =========================================================================
  function renderLegalDocsModal() {
    docsTableBody.innerHTML = "";
    legalDocs.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align: center; font-weight: 600;">${d.stt}</td>
        <td><span class="badge-tag" style="background-color: #E2E8F0; color: #1E293B;">${escapeHtml(d.period)}</span></td>
        <td><strong style="color: var(--primary-navy);">${escapeHtml(d.docNumber)}</strong></td>
        <td>${escapeHtml(d.issueDate)}</td>
        <td>${escapeHtml(d.authority)}</td>
        <td>${escapeHtml(d.summary)}</td>
        <td><span style="font-size: 0.75rem; color: ${d.status.includes('Đang có hiệu lực') ? '#15803D' : '#64748B'}; font-weight: 600;">${escapeHtml(d.status)}</span></td>
      `;
      docsTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // TOAST THÔNG BÁO & SAO CHÉP
  // =========================================================================
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 2200);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(successMsg);
    } catch (e) {
      showToast("Không thể sao chép");
    }
    document.body.removeChild(ta);
  }

  // =========================================================================
  // TIỆN ÍCH HTML ESCAPE
  // =========================================================================
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // =========================================================================
  // EVENT LISTENERS & KHỞI TẠO
  // =========================================================================
  // Tìm kiếm
  searchInput.addEventListener("input", e => {
    state.searchQuery = e.target.value;
    if (state.searchQuery) {
      searchClear.classList.remove("hidden");
    } else {
      searchClear.classList.add("hidden");
    }
    filterDictionary();
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    searchClear.classList.add("hidden");
    searchInput.focus();
    filterDictionary();
  });

  // Filter pills nhóm đất
  groupFilterPills.addEventListener("click", e => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    groupFilterPills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    state.groupFilter = pill.dataset.group;
    filterDictionary();
  });

  // Filter thời kỳ
  periodFilterSelect.addEventListener("change", e => {
    state.periodFilter = e.target.value;
    filterDictionary();
  });

  // Nút reset bộ lọc
  btnResetFilter.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    searchClear.classList.add("hidden");

    groupFilterPills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    groupFilterPills.querySelector('[data-group="ALL"]').classList.add("active");
    state.groupFilter = "ALL";

    periodFilterSelect.value = "ALL";
    state.periodFilter = "ALL";

    filterDictionary();
  });

  // Phím tắt bàn phím
  window.addEventListener("keydown", e => {
    // Focus ô tìm kiếm khi bấm "/" hoặc Ctrl+K
    if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    // Escape để xóa tìm kiếm
    if (e.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      state.searchQuery = "";
      searchClear.classList.add("hidden");
      filterDictionary();
    }
    // Mũi tên Lên / Xuống để duyệt danh sách candidate
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (state.filteredItems.length === 0) return;
      const curIndex = state.filteredItems.findIndex(it => it.id === state.selectedId);
      let nextIndex = curIndex;
      if (e.key === "ArrowDown") {
        nextIndex = (curIndex + 1) % state.filteredItems.length;
      } else {
        nextIndex = (curIndex - 1 + state.filteredItems.length) % state.filteredItems.length;
      }
      e.preventDefault();
      selectItem(state.filteredItems[nextIndex].id, true);
    }
  });

  // Các nút sao chép
  btnCopyCode.addEventListener("click", () => {
    const item = dictionary.find(it => it.id === state.selectedId);
    if (item) copyToClipboard(item.displayCode || item.code, `Đã sao chép mã: ${item.displayCode || item.code}`);
  });

  btnCopyCitation.addEventListener("click", () => {
    const item = dictionary.find(it => it.id === state.selectedId);
    if (item) {
      const citation = `${item.displayCode || item.code} - ${item.name} (${item.legalBasis})`;
      copyToClipboard(citation, "Đã sao chép trích dẫn pháp lý");
    }
  });

  btnShareLink.addEventListener("click", () => {
    copyToClipboard(window.location.href, "Đã sao chép liên kết trực tiếp");
  });

  // Modal văn bản
  btnOpenDocs.addEventListener("click", () => {
    renderLegalDocsModal();
    docsModal.classList.remove("hidden");
  });
  btnCloseDocsModal.addEventListener("click", () => docsModal.classList.add("hidden"));
  btnConfirmCloseModal.addEventListener("click", () => docsModal.classList.add("hidden"));
  docsModal.addEventListener("click", e => {
    if (e.target === docsModal) docsModal.classList.add("hidden");
  });

  // Đồng bộ Hash URL khi mở trang (#code=LUC)
  function initHashRouting() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#code=")) {
      const codeParam = decodeURIComponent(hash.substring(6)).trim();
      const matched = dictionary.find(it => it.code.toLowerCase() === codeParam.toLowerCase() || (it.displayCode && it.displayCode.toLowerCase() === codeParam.toLowerCase()));
      if (matched) {
        state.selectedId = matched.id;
        return;
      }
    }
    // Mặc định chọn mã LUC nếu có, hoặc item đầu tiên
    const defaultItem = dictionary.find(it => it.code === "LUC") || dictionary[0];
    if (defaultItem) {
      state.selectedId = defaultItem.id;
    }
  }

  // Khởi động
  initHashRouting();
  filterDictionary();
  if (state.selectedId) {
    selectItem(state.selectedId, false);
  }
})();
