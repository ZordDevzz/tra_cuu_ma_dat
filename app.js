/**
 * APP.JS — Động cơ tra cứu từ điển mã loại đất phía Client
 * Hoạt động 100% trong bộ nhớ trình duyệt (Client-side in-memory engine)
 * Đáp ứng giao diện siêu đậm đặc (Dense civic GIS layout), đầy đủ và chính xác theo chuẩn pháp luật.
 */

(function () {
  "use strict";

  // 1. KIỂM TRA DỮ LIỆU TĨNH TỪ DATA.JS
  if (!window.LAND_DATA || !Array.isArray(window.LAND_DATA.dictionary)) {
    console.error("Lỗi: Không tìm thấy cơ sở dữ liệu window.LAND_DATA!");
    return;
  }

  const { dictionary, legalDocs } = window.LAND_DATA;

  // 2. TRẠNG THÁI ỨNG DỤNG (APP STATE)
  const state = {
    searchQuery: "",
    groupFilter: "ALL",
    periodFilter: "ALL",
    selectedId: null,
    filteredItems: []
  };

  // 3. DOM ELEMENTS
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

  // Header Strip Elements
  const heroCodeBadge = document.getElementById("heroCodeBadge");
  const heroTitle = document.getElementById("heroTitle");
  const heroBadges = document.getElementById("heroBadges");
  const colorPreviewBox = document.getElementById("colorPreviewBox");
  const btnCopyCode = document.getElementById("btnCopyCode");
  const btnCopyCitation = document.getElementById("btnCopyCitation");
  const btnShareLink = document.getElementById("btnShareLink");

  // Khối I Elements (Luật 2024 chuẩn hóa)
  const sec1Code = document.getElementById("sec1Code");
  const sec1Group = document.getElementById("sec1Group");
  const sec1Name = document.getElementById("sec1Name");
  const sec1StatusEffect = document.getElementById("sec1StatusEffect");
  const sec1LegalBasis = document.getElementById("sec1LegalBasis");
  const sec1Rgb = document.getElementById("sec1Rgb");
  const sec1Purpose = document.getElementById("sec1Purpose");
  const sec1Evolution = document.getElementById("sec1Evolution");

  // Khối II Elements (Ma trận 6 cột 5 thời kỳ)
  const crossTableBody = document.getElementById("crossTableBody");

  // Khối III Elements (Xử lý hồ sơ cũ & quy đổi)
  const sec3OldScenario = document.getElementById("sec3OldScenario");
  const sec3OldDoc = document.getElementById("sec3OldDoc");
  const sec3Relation = document.getElementById("sec3Relation");
  const sec3TabsRef = document.getElementById("sec3TabsRef");
  const sec3StatutoryRule = document.getElementById("sec3StatutoryRule");
  const sec3PracticalPrinciple = document.getElementById("sec3PracticalPrinciple");
  const specialLegalContainer = document.getElementById("specialLegalContainer");

  // Related Strip
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
    return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Tiền xử lý chỉ mục tìm kiếm cho từng bản ghi
  dictionary.forEach(item => {
    const rawSearchText = [
      item.code,
      item.displayCode,
      item.name,
      item.group,
      item.status,
      item.primaryPeriod,
      item.sec1 ? (item.sec1.code2024 + " " + item.sec1.name2024 + " " + item.sec1.legalBasis + " " + item.sec1.purpose + " " + item.sec1.evolution) : "",
      item.sec3 ? (item.sec3.oldScenario + " " + item.sec3.oldDoc + " " + item.sec3.statutoryRule + " " + item.sec3.practicalPrinciple) : ""
    ].join(" ");
    item._searchIndex = removeVietnameseTones(rawSearchText);
    item._codeLower = (item.code || "").toLowerCase();
    item._displayCodeLower = (item.displayCode || "").toLowerCase();
  });

  // =========================================================================
  // BỘ LỌC & TÌM KIẾM
  // =========================================================================
  function filterDictionary() {
    const query = state.searchQuery.trim();
    const queryNorm = removeVietnameseTones(query);
    const queryCodeLower = query.toLowerCase();
    const group = state.groupFilter;
    const period = state.periodFilter;

    let results = dictionary.filter(item => {
      // 1. Lọc theo từ khóa
      if (queryNorm) {
        if (!item._searchIndex.includes(queryNorm)) {
          return false;
        }
      }

      // 2. Lọc theo nhóm đất
      if (group !== "ALL") {
        const itemGrp = (item.group || "").toLowerCase();
        if (group === "NNP" && (!itemGrp.includes("nông nghiệp") || itemGrp.includes("phi nông nghiệp"))) return false;
        if (group === "PNN" && !itemGrp.includes("phi nông nghiệp")) return false;
        if (group === "CSD" && !itemGrp.includes("chưa sử dụng")) return false;
        if (group === "HL" && !(item.status.includes("Hành lang") || item.name.includes("Hành lang"))) return false;
        if (group === "QH" && !itemGrp.includes("quy hoạch")) return false;
        if (group === "SUB" && !itemGrp.includes("đối tượng")) return false;
      }

      // 3. Lọc theo thời kỳ pháp luật
      if (period !== "ALL") {
        const pStr = ((item.primaryPeriod || "") + " " + (item.sourceSheet || "") + " " + JSON.stringify(item.sec2 || [])).toLowerCase();
        if (period === "2024" && !pStr.includes("2024")) return false;
        if (period === "2013" && !pStr.includes("2013")) return false;
        if (period === "2003" && !pStr.includes("2003")) return false;
        if (period === "1993_2001" && !(pStr.includes("1995") || pStr.includes("2001") || pStr.includes("1993"))) return false;
        if (period === "299" && !pStr.includes("299")) return false;
      }

      return true;
    });

    // Sắp xếp ưu tiên: Khớp mã chính xác -> Mã bắt đầu bằng query -> Khác
    if (queryCodeLower) {
      results.sort((a, b) => {
        const aExact = a._codeLower === queryCodeLower || a._displayCodeLower === queryCodeLower;
        const bExact = b._codeLower === queryCodeLower || b._displayCodeLower === queryCodeLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStart = a._codeLower.startsWith(queryCodeLower) || a._displayCodeLower.startsWith(queryCodeLower);
        const bStart = b._codeLower.startsWith(queryCodeLower) || b._displayCodeLower.startsWith(queryCodeLower);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;

        return 0;
      });
    }

    state.filteredItems = results;
    renderCandidateList();
    updateCounter();

    // Tự động chọn item đầu tiên nếu item hiện tại không còn trong danh sách
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
  // RENDER DANH SÁCH CANDIDATE (BÊN TRÁI)
  // =========================================================================
  function renderCandidateList() {
    candidateList.innerHTML = "";

    if (state.filteredItems.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.padding = "16px 8px";
      emptyDiv.style.textAlign = "center";
      emptyDiv.style.color = "var(--text-muted)";
      emptyDiv.style.fontSize = "0.75rem";
      emptyDiv.textContent = "Không tìm thấy mã phù hợp với điều kiện tra cứu.";
      candidateList.appendChild(emptyDiv);
      return;
    }

    const fragment = document.createDocumentFragment();

    state.filteredItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "candidate-card" + (item.id === state.selectedId ? " active" : "");
      card.dataset.id = item.id;

      // Phân loại nhóm
      let tagClass = "tag-nnp";
      let tagLabel = item.group;
      const grp = (item.group || "").toLowerCase();
      if (grp.includes("phi nông nghiệp")) {
        tagClass = "tag-pnn";
      } else if (grp.includes("chưa sử dụng")) {
        tagClass = "tag-csd";
      } else if (grp.includes("quy hoạch")) {
        tagClass = "tag-qh";
        tagLabel = "Quy hoạch";
      } else if (grp.includes("đối tượng")) {
        tagClass = "tag-sub";
        tagLabel = "Đối tượng";
      } else if (item.status && item.status.includes("Hành lang")) {
        tagClass = "tag-hl";
        tagLabel = "Hành lang";
      }

      // Màu RGB dot
      const colorDotHtml = item.rgb && item.rgb.hex 
        ? `<span class="color-dot" style="background-color: ${item.rgb.hex};" title="RGB(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b})"></span>`
        : "";

      card.innerHTML = `
        <div class="card-top">
          <div class="card-code-wrap">
            ${colorDotHtml}
            <span class="card-code">${escapeHtml(item.displayCode || item.code)}</span>
          </div>
          <span class="badge-tag ${tagClass}">${escapeHtml(tagLabel)}</span>
        </div>
        <div class="card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="card-subtext">
          <span class="card-period-hint">${escapeHtml(item.primaryPeriod || '')}</span>
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
  // CHỌN VÀ HIỂN THỊ CHI TIẾT MÃ ĐẤT (BÊN PHẢI)
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

    // -----------------------------------------------------------------------
    // HEADER STRIP BANNER
    // -----------------------------------------------------------------------
    heroCodeBadge.textContent = item.displayCode || item.code;
    heroTitle.textContent = item.name;

    // Tag class
    let tagClass = "tag-nnp";
    const grp = (item.group || "").toLowerCase();
    if (grp.includes("phi nông nghiệp")) tagClass = "tag-pnn";
    else if (grp.includes("chưa sử dụng")) tagClass = "tag-csd";
    else if (grp.includes("quy hoạch")) tagClass = "tag-qh";
    else if (grp.includes("đối tượng")) tagClass = "tag-sub";
    else if (item.status && item.status.includes("Hành lang")) tagClass = "tag-hl";

    // Color preview swatch
    let rgbBadgeHtml = "";
    if (item.rgb && item.rgb.hex) {
      colorPreviewBox.classList.remove("hidden");
      colorPreviewBox.style.backgroundColor = item.rgb.hex;
      colorPreviewBox.title = `Màu bản đồ hiện trạng: RGB(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b}) - Hex ${item.rgb.hex}`;
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

    // -----------------------------------------------------------------------
    // KHỐI I: THÔNG TIN LOẠI ĐẤT CHUẨN HÓA THEO LUẬT ĐẤT ĐAI 2024
    // -----------------------------------------------------------------------
    const sec1 = item.sec1 || {};
    sec1Code.textContent = sec1.code2024 || item.code;
    sec1Group.textContent = sec1.group || item.group;
    sec1Name.textContent = sec1.name2024 || item.name;
    sec1StatusEffect.textContent = sec1.statusEffect || "Đang có hiệu lực (Luật Đất đai 2024 áp dụng từ 01/08/2024)";
    sec1LegalBasis.textContent = sec1.legalBasis || "Điều 9 Luật Đất đai 2024, Nghị định số 102/2024/NĐ-CP";

    if (item.rgb && item.rgb.hex) {
      sec1Rgb.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 14px; height: 14px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.25); background-color: ${item.rgb.hex};"></span>
          <span>RGB(${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b}) &bull; Mã màu Hex: <code class="cell-code">${item.rgb.hex}</code></span>
        </span>
      `;
    } else {
      sec1Rgb.textContent = "Không quy định thông số RGB chuyên biệt";
    }

    sec1Purpose.textContent = sec1.purpose || item.name;
    sec1Evolution.textContent = sec1.evolution || "Không có thay đổi cơ bản so với quy định giai đoạn trước.";

    // -----------------------------------------------------------------------
    // KHỐI II: ĐỐI CHIẾU DÒNG LỊCH SỬ KÝ HIỆU LOẠI ĐẤT QUA CÁC THỜI KỲ (6 CỘT)
    // -----------------------------------------------------------------------
    renderCrossComparisonTable(item);

    // -----------------------------------------------------------------------
    // KHỐI III: HƯỚNG DẪN XỬ LÝ HỒ SƠ ĐỊA CHÍNH LỊCH SỬ & QUY ĐỔI KHI CẤP GCN
    // -----------------------------------------------------------------------
    const sec3 = item.sec3 || {};
    sec3OldScenario.textContent = sec3.oldScenario || item.name;
    sec3OldDoc.textContent = sec3.oldDoc || (item.primaryPeriod || "-");
    sec3Relation.textContent = sec3.relation || "1 -> 1";
    sec3TabsRef.textContent = sec3.tabsRef || "01_TONG_QUAN_CAN_CU, 02_DOI_CHIEU_CHUYEN_DOI";
    sec3StatutoryRule.textContent = sec3.statutoryRule || (sec1.legalBasis || "-");
    sec3PracticalPrinciple.textContent = sec3.practicalPrinciple || "Căn cứ hồ sơ địa chính gốc và quy định hiện hành của Luật Đất đai 2024 để xác định mục đích sử dụng đất tương đương.";

    // Lưu ý pháp lý đặc thù
    renderSpecialLegal(item);

    // Mã liên quan
    renderRelatedChips(item);
  }

  // RENDER MA TRẬN 6 CỘT KHỐI II
  function renderCrossComparisonTable(item) {
    crossTableBody.innerHTML = "";
    const historyRows = item.sec2 || [];

    if (historyRows.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted); padding: 8px;">Chưa có dữ liệu phân kỳ lịch sử cho mã này.</td>`;
      crossTableBody.appendChild(tr);
      return;
    }

    historyRows.forEach(r => {
      const tr = document.createElement("tr");
      const bddcVal = r.bddc && r.bddc !== "-" ? `<code class="cell-code">${escapeHtml(r.bddc)}</code>` : "-";
      const sodoVal = r.sodo && r.sodo !== "-" ? `<code class="cell-code">${escapeHtml(r.sodo)}</code>` : "-";
      const kkVal = r.kk && r.kk !== "-" ? `<code class="cell-code">${escapeHtml(r.kk)}</code>` : "-";

      tr.innerHTML = `
        <td style="font-weight: 700; color: #1E293B;">${escapeHtml(r.era)}</td>
        <td style="color: #334155;">${escapeHtml(r.doc)}</td>
        <td style="text-align: center;">${bddcVal}</td>
        <td style="text-align: center;">${sodoVal}</td>
        <td style="text-align: center;">${kkVal}</td>
        <td style="color: #0F172A;">${escapeHtml(r.note || '-')}</td>
      `;
      crossTableBody.appendChild(tr);
    });
  }

  // RENDER LƯU Ý PHÁP LÝ ĐẶC THÙ (ĐIỀU 141, ĐIỀU 210, ĐIỀU 152)
  function renderSpecialLegal(item) {
    specialLegalContainer.innerHTML = "";
    const special = item.specialLegal || {};
    let hasSpecial = false;

    // 1. Căn cứ công nhận hạn mức đất ở (Điều 141)
    if (special.certificateRecognition) {
      hasSpecial = true;
      const alertDiv = document.createElement("div");
      alertDiv.className = "legal-alert alert-info";
      alertDiv.innerHTML = `
        <svg class="legal-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <div>
          <div class="legal-alert-title">Căn cứ Xác định Loại Đất ở & Hạn mức Đất ở (Điều 141 Luật Đất đai 2024):</div>
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
        <svg class="legal-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

    // 3. Cảnh báo đính chính dữ liệu gốc (Khoản 1 Điều 152 Luật 2024 & Điều 45 NĐ 101/2024)
    if (special.auditNote) {
      hasSpecial = true;
      const alertDiv = document.createElement("div");
      alertDiv.className = "legal-alert alert-caution";
      alertDiv.innerHTML = `
        <svg class="legal-alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <div>
          <div class="legal-alert-title">Nguyên tắc Đính chính Dữ liệu Gốc theo Pháp luật (Điều 152 Luật 2024):</div>
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

  // RENDER CÁC MÃ LIÊN QUAN CÙNG NHÓM
  function renderRelatedChips(item) {
    relatedChips.innerHTML = "";

    const sameGroupItems = dictionary.filter(it => 
      it.id !== item.id && 
      it.group === item.group && 
      (!it.status || !it.status.includes("sai sót"))
    ).slice(0, 12);

    if (sameGroupItems.length === 0) {
      relatedChips.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted);">Không có mã phụ thuộc cùng nhóm.</span>`;
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
      const isEffective = d.status.includes("Đang có hiệu lực");
      tr.innerHTML = `
        <td style="text-align: center; font-weight: 600;">${d.stt}</td>
        <td><span class="badge-tag" style="background-color: #E2E8F0; color: #1E293B;">${escapeHtml(d.period)}</span></td>
        <td><strong style="color: var(--primary-navy);">${escapeHtml(d.docNumber)}</strong></td>
        <td style="text-align: center;">${escapeHtml(d.issueDate)}</td>
        <td>${escapeHtml(d.authority)}</td>
        <td>${escapeHtml(d.summary)}</td>
        <td><span style="font-size: 0.725rem; color: ${isEffective ? '#166534' : '#64748B'}; font-weight: 600;">${escapeHtml(d.status)}</span></td>
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
  // EVENT LISTENERS & KHỞI TẠO
  // =========================================================================
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
    if ((e.key === "/" || (e.ctrlKey && e.key === "k")) && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === "Escape") {
      if (!docsModal.classList.contains("hidden")) {
        docsModal.classList.add("hidden");
        return;
      }
      if (document.activeElement === searchInput) {
        searchInput.value = "";
        state.searchQuery = "";
        searchClear.classList.add("hidden");
        filterDictionary();
      }
    }
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

  // Nút sao chép
  btnCopyCode.addEventListener("click", () => {
    const item = dictionary.find(it => it.id === state.selectedId);
    if (item) copyToClipboard(item.displayCode || item.code, `Đã sao chép mã: ${item.displayCode || item.code}`);
  });

  btnCopyCitation.addEventListener("click", () => {
    const item = dictionary.find(it => it.id === state.selectedId);
    if (item) {
      const legal = (item.sec1 && item.sec1.legalBasis) || (item.sec3 && item.sec3.statutoryRule) || "Luật Đất đai 2024";
      const citation = `[Mã ${item.displayCode || item.code}] ${item.name} — Căn cứ pháp lý: ${legal}`;
      copyToClipboard(citation, "Đã sao chép trích dẫn pháp lý");
    }
  });

  btnShareLink.addEventListener("click", () => {
    copyToClipboard(window.location.href, "Đã sao chép liên kết trực tiếp");
  });

  // Modal 22 văn bản
  btnOpenDocs.addEventListener("click", () => {
    renderLegalDocsModal();
    docsModal.classList.remove("hidden");
  });
  btnCloseDocsModal.addEventListener("click", () => docsModal.classList.add("hidden"));
  btnConfirmCloseModal.addEventListener("click", () => docsModal.classList.add("hidden"));
  docsModal.addEventListener("click", e => {
    if (e.target === docsModal) docsModal.classList.add("hidden");
  });

  // Hash Routing
  function initHashRouting() {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#code=")) {
      const codeParam = decodeURIComponent(hash.substring(6)).trim().toLowerCase();
      const matched = dictionary.find(it => 
        (it.code && it.code.toLowerCase() === codeParam) || 
        (it.displayCode && it.displayCode.toLowerCase() === codeParam)
      );
      if (matched) {
        state.selectedId = matched.id;
        return;
      }
    }
    // Mặc định chọn mã BHK như hình mẫu của người dùng nếu có, hoặc LUC
    const defaultItem = dictionary.find(it => it.code === "BHK" || it.displayCode === "BHK") ||
                        dictionary.find(it => it.code === "LUC") || 
                        dictionary[0];
    if (defaultItem) {
      state.selectedId = defaultItem.id;
    }
  }

  // Lắng nghe thay đổi Hash
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#code=")) {
      const codeParam = decodeURIComponent(hash.substring(6)).trim().toLowerCase();
      const matched = dictionary.find(it => 
        (it.code && it.code.toLowerCase() === codeParam) || 
        (it.displayCode && it.displayCode.toLowerCase() === codeParam)
      );
      if (matched && matched.id !== state.selectedId) {
        selectItem(matched.id, false);
      }
    }
  });

  // KHỞI ĐỘNG HỆ THỐNG
  initHashRouting();
  filterDictionary();
  if (state.selectedId) {
    selectItem(state.selectedId, false);
  }
})();
