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
    filteredItems: [],
    // Chế độ phân giải mã trùng định danh: tắt auto-chọn, yêu cầu người dùng chọn biến thể
    disambiguate: false,
    disambiguationMsg: ""
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
  const emptyViewHint = document.getElementById("emptyViewHint");

  // Variant Strip (biến thể pháp lý cùng mã định danh)
  const variantStrip = document.getElementById("variantStrip");
  const variantBaseCode = document.getElementById("variantBaseCode");
  const variantChips = document.getElementById("variantChips");

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

  // QoL: Đánh dấu (highlight) từ khóa khớp trong văn bản hiển thị
  function highlightMatch(text, query) {
    const t = String(text || "");
    const q = String(query || "").trim();
    if (!q) return escapeHtml(t);
    const qLower = q.toLowerCase();
    const tLower = t.toLowerCase();
    let out = "", i = 0, hit;
    while ((hit = tLower.indexOf(qLower, i)) !== -1) {
      out += escapeHtml(t.slice(i, hit)) + '<mark class="hl">' + escapeHtml(t.slice(hit, hit + q.length)) + "</mark>";
      i = hit + q.length;
    }
    out += escapeHtml(t.slice(i));
    return out || escapeHtml(t);
  }

  // =========================================================================
  // ROUTING THEO ID DUY NHẤT + PHÂN GIẢI MÃ TRÙNG ĐỊNH DANH
  // Bản chất từ điển địa chính: cùng một ký hiệu mã (CLN, RSX, ONT...) có thể
  // tồn tại nhiều biến thể pháp lý (Luật 2024 / quy hoạch / lịch sử 299-2013).
  // - Deep link chuẩn: #id=<id duy nhất> (VD: #id=M24_CLN_6)
  // - Deep link theo mã (#code=CLN) chỉ là "ý định tra cứu": lọc toàn bộ biến
  //   thể, KHÔNG auto-chọn; nếu chỉ đúng 1 kết quả thì chọn và chuẩn hóa hash.
  // =========================================================================
  // QoL: Phân giải phạm vi (scope) của bản ghi: mã đất / chỉ tiêu quy hoạch /
  // mã đối tượng sử dụng-quản lý đất. Cùng một ký hiệu (VD: TSN) có thể tồn tại
  // ở các phạm vi khác nhau với ý nghĩa pháp lý hoàn toàn khác nhau.
  function scopeOf(item) {
    const grp = (item.group || "").toLowerCase();
    if (grp.includes("đối tượng")) return { key: "SUB", label: "Mã đối tượng" };
    if (grp.includes("quy hoạch")) return { key: "QH", label: "Chỉ tiêu QH" };
    return { key: "LAND", label: "Mã loại đất" };
  }

  function baseCodeOf(item) {
    const c = (item.code || item.displayCode || "").toString();
    return c.split(/[\s(\/]/)[0].trim().toUpperCase();
  }

  function parseHash() {
    const hash = window.location.hash.replace(/^#/, "");
    const params = {};
    if (!hash) return params;
    hash.split("&").forEach(pair => {
      const idx = pair.indexOf("=");
      if (idx > 0) {
        params[pair.slice(0, idx).toLowerCase()] = decodeURIComponent(pair.slice(idx + 1));
      }
    });
    return params;
  }

  function findById(id) {
    const needle = String(id).trim();
    return dictionary.find(it => it.id === needle) || null;
  }

  // QoL: Tra cứu theo ký hiệu mã từ bất kỳ đâu (link bảng đối chiếu, chip gợi ý...)
  // Tái sử dụng đúng logic deep link #code=: lọc mọi biến thể, nhiều kết quả thì
  // chuyển sang chế độ phân giải trùng mã, một kết quả thì chọn luôn.
  function searchByCode(code) {
    const codeTrim = String(code || "").trim();
    if (!codeTrim) return;
    const base = codeTrim.split(/[\s(\/]/)[0].trim().toUpperCase();
    const variants = dictionary.filter(it => baseCodeOf(it) === base);

    searchInput.value = codeTrim;
    state.searchQuery = codeTrim;
    state.disambiguate = false;
    state.disambiguationMsg = "";
    searchClear.classList.remove("hidden");

    if (variants.length > 1) {
      state.disambiguate = true;
      const scopeLabels = [...new Set(variants.map(v => scopeOf(v).label))];
      const scopeNote = scopeLabels.length > 1
        ? " Lưu ý: cùng ký hiệu nhưng thuộc các phạm vi khác nhau (" + scopeLabels.join(" / ") + ")."
        : "";
      state.disambiguationMsg =
        'Mã "' + base + '" có ' + variants.length + ' biến thể pháp lý khác nhau ' +
        '(Luật 2024 / quy hoạch / lịch sử). Hãy chọn biến thể cụ thể trong danh sách bên trái.' + scopeNote;
    }
    filterDictionary();

    if (!state.disambiguate && state.filteredItems.length > 0) {
      selectItem(state.filteredItems[0].id, true);
    }
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
  // Quy tắc khớp nhóm đất (dùng chung cho bộ lọc và bộ đếm trên pill)
  function matchesGroupFilter(item, group) {
    const itemGrp = (item.group || "").toLowerCase();
    if (group === "NNP") return itemGrp.includes("nông nghiệp") && !itemGrp.includes("phi nông nghiệp");
    if (group === "PNN") return itemGrp.includes("phi nông nghiệp");
    if (group === "CSD") return itemGrp.includes("chưa sử dụng");
    if (group === "HL") return (item.status && item.status.includes("Hành lang")) || (item.name && item.name.includes("Hành lang"));
    if (group === "QH") return itemGrp.includes("quy hoạch");
    if (group === "SUB") return itemGrp.includes("đối tượng");
    return true;
  }

  // QoL: Hiển thị số lượng bản ghi của từng nhóm ngay trên pill bộ lọc
  function renderPillCounts() {
    groupFilterPills.querySelectorAll(".pill").forEach(pill => {
      const key = pill.dataset.group;
      if (!key || key === "ALL") return;
      const badge = document.createElement("span");
      badge.className = "pill-count";
      badge.textContent = dictionary.filter(it => matchesGroupFilter(it, key)).length;
      pill.appendChild(badge);
    });
  }
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
      if (group !== "ALL" && !matchesGroupFilter(item, group)) return false;

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

    // Tự động chọn item đầu tiên nếu item hiện tại không còn trong danh sách.
    // Ngoại lệ: đang phân giải mã trùng định danh -> giữ trạng thái rỗng và
    // yêu cầu người dùng chủ động chọn biến thể pháp lý.
    if (state.filteredItems.length > 0) {
      const exists = state.filteredItems.some(it => it.id === state.selectedId);
      if (!exists) {
        if (state.disambiguate) {
          showEmptyState(state.disambiguationMsg);
        } else {
          selectItem(state.filteredItems[0].id, false);
        }
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
            <span class="card-code">${highlightMatch(item.displayCode || item.code, state.searchQuery)}</span>
          </div>
          <span class="badge-tag ${tagClass}">${escapeHtml(tagLabel)}</span>
        </div>
        <div class="card-name" title="${escapeHtml(item.name)}">${highlightMatch(item.name, state.searchQuery)}</div>
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
    state.disambiguate = false;
    state.disambiguationMsg = "";

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

    // Cập nhật URL Hash theo id duy nhất (định danh ổn định, không trùng lặp)
    if (updateHash) {
      window.location.hash = "id=" + encodeURIComponent(item.id);
      pushRecent(item); // QoL: ghi lịch sử tra cứu (chỉ thao tác chủ động của người dùng)
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
      rgbBadgeHtml = `<span class="badge-tag tag-rgb" title="Thông số màu bản đồ hiện trạng">RGB: ${item.rgb.r}, ${item.rgb.g}, ${item.rgb.b} (${item.rgb.hex})</span>`;
    } else {
      colorPreviewBox.classList.add("hidden");
    }

    heroBadges.innerHTML = `
      <span class="badge-tag ${tagClass}">${escapeHtml(item.group)}</span>
      <span class="badge-tag tag-period">${escapeHtml(item.primaryPeriod)}</span>
      <span class="badge-tag tag-status">${escapeHtml(item.status)}</span>
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
        <span class="rgb-inline">
          <span class="rgb-swatch" style="background-color: ${item.rgb.hex};"></span>
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

    // Biến thể pháp lý cùng mã định danh (nếu có)
    renderVariantStrip(item);
  }

  // RENDER STRIP BIẾN THỂ PHÁP LÝ CÙNG MÃ ĐỊNH DANH
  // Cùng ký hiệu mã (VD: CLN) nhưng khác nội dung pháp lý -> cho phép nhảy
  // nhanh giữa các biến thể mà không phải quay lại ô tìm kiếm.
  function renderVariantStrip(item) {
    variantChips.innerHTML = "";
    const base = baseCodeOf(item);
    const variants = dictionary.filter(it => baseCodeOf(it) === base);
    if (variants.length <= 1) {
      variantStrip.classList.add("hidden");
      return;
    }

    variantBaseCode.textContent = base;
    variants.forEach(v => {
      const chip = document.createElement("div");
      chip.className = "variant-chip" + (v.id === item.id ? " active" : "");
      chip.title = v.name + " — " + (v.primaryPeriod || "");
      const sc = scopeOf(v);
      chip.innerHTML = `
        <span class="chip-code">${escapeHtml(v.displayCode || v.code)}</span>
        <span class="v-scope scope-${sc.key.toLowerCase()}">${escapeHtml(sc.label)}</span>
        <span class="v-name">${escapeHtml(v.name)}</span>
        <span class="v-period">${escapeHtml(v.primaryPeriod || "")}</span>
      `;
      chip.addEventListener("click", () => {
        selectItem(v.id, true);
      });
      variantChips.appendChild(chip);
    });
    variantStrip.classList.remove("hidden");
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
      // QoL: mã ký hiệu trong bảng trở thành nút tra cứu tiếp (click để tra mã đó)
      const codeBtn = (v) => v && v !== "-"
        ? `<button class="cell-code cell-code-link" data-code="${escapeHtml(v)}" title="Tra cứu ký hiệu ${escapeHtml(v)}">${escapeHtml(v)}</button>`
        : "-";
      const bddcVal = codeBtn(r.bddc);
      const sodoVal = codeBtn(r.sodo);
      const kkVal = codeBtn(r.kk);

      tr.innerHTML = `
        <td class="cell-era">${escapeHtml(r.era)}</td>
        <td class="cell-doc">${escapeHtml(r.doc)}</td>
        <td style="text-align: center;">${bddcVal}</td>
        <td style="text-align: center;">${sodoVal}</td>
        <td style="text-align: center;">${kkVal}</td>
        <td class="cell-note">${escapeHtml(r.note || '-')}</td>
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

  function showEmptyState(message) {
    emptyView.classList.remove("hidden");
    detailView.classList.add("hidden");
    emptyViewHint.textContent = message || "Hoặc nhập ký hiệu mã (ví dụ LUC, ONT, T, BHK, HLD) vào ô tìm kiếm.";
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
        <td><span class="badge-tag tag-plain">${escapeHtml(d.period)}</span></td>
        <td><strong style="color: var(--primary-navy);">${escapeHtml(d.docNumber)}</strong></td>
        <td style="text-align: center;">${escapeHtml(d.issueDate)}</td>
        <td>${escapeHtml(d.authority)}</td>
        <td>${escapeHtml(d.summary)}</td>
        <td><span class="doc-status ${isEffective ? 'is-effective' : ''}">${escapeHtml(d.status)}</span></td>
      `;
      docsTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // QoL: LỊCH SỬ TRA CỨU GẦN ĐÂY (localStorage, tối đa 8 mục)
  // =========================================================================
  const RECENT_KEY = "landdict_recent_v1";

  function loadRecent() {
    try {
      const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(arr) ? arr.filter(r => r && r.id) : [];
    } catch (e) {
      return [];
    }
  }

  function pushRecent(item) {
    let rec = loadRecent().filter(r => r.id !== item.id);
    rec.unshift({ id: item.id, code: item.displayCode || item.code, name: item.name });
    rec = rec.slice(0, 8);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(rec));
    } catch (e) { /* chế độ riêng tư / file:// chặn localStorage -> bỏ qua */ }
    renderRecent();
  }

  function renderRecent() {
    const rec = loadRecent();
    const recentChips = document.getElementById("recentChips");
    const recentStripEl = document.getElementById("recentStrip");
    if (!recentChips || !recentStripEl) return;
    recentChips.innerHTML = "";

    if (rec.length === 0) {
      recentStripEl.classList.add("hidden");
      return;
    }

    rec.forEach(r => {
      const chip = document.createElement("button");
      chip.className = "recent-chip";
      chip.type = "button";
      chip.title = r.name || "";
      chip.innerHTML = `<span class="chip-code">${escapeHtml(r.code || "")}</span><span class="rc-name">${escapeHtml(r.name || "")}</span>`;
      chip.addEventListener("click", () => {
        const matched = findById(r.id);
        if (matched) selectItem(matched.id, true);
      });
      recentChips.appendChild(chip);
    });
    recentStripEl.classList.remove("hidden");
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
    state.disambiguate = false;
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
    state.disambiguate = false;
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
    state.disambiguate = false;
    filterDictionary();
  });

  // Filter thời kỳ
  periodFilterSelect.addEventListener("change", e => {
    state.periodFilter = e.target.value;
    state.disambiguate = false;
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
    state.disambiguate = false;

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

  // QoL: Click mã trong bảng đối chiếu 5 thời kỳ (Khối II) để tra cứu tiếp
  crossTableBody.addEventListener("click", e => {
    const btn = e.target.closest(".cell-code-link");
    if (btn) searchByCode(btn.dataset.code);
  });

  // QoL: Chip tra nhanh tại trạng thái chưa chọn mã
  const quickChips = document.getElementById("quickCodeChips");
  if (quickChips) {
    quickChips.addEventListener("click", e => {
      const chip = e.target.closest(".quick-chip");
      if (chip) searchByCode(chip.dataset.code);
    });
  }

  // QoL: Nút In / Xuất PDF trang chi tiết
  const btnPrintDetail = document.getElementById("btnPrintDetail");
  if (btnPrintDetail) {
    btnPrintDetail.addEventListener("click", () => {
      if (state.selectedId) window.print();
    });
  }

  // QoL: Click ô mẫu màu để sao chép mã Hex
  colorPreviewBox.addEventListener("click", () => {
    const item = dictionary.find(it => it.id === state.selectedId);
    if (item && item.rgb && item.rgb.hex) {
      copyToClipboard(item.rgb.hex, `Đã sao chép mã màu: ${item.rgb.hex}`);
    }
  });

  // Hash Routing: #id=<id duy nhất> là canonical; #code=<mã> là legacy/tra cứu
  function applyHashRouting() {
    const { id, code } = parseHash();

    if (id) {
      const matched = findById(id);
      if (matched) {
        state.selectedId = matched.id;
        return true;
      }
    }

    if (code !== undefined && code !== "") {
      // Deep link theo mã định danh: lọc danh sách tất cả biến thể cùng mã.
      searchByCode(code);
      return true;
    }

    return false;
  }

  function initHashRouting() {
    const routed = applyHashRouting();
    if (routed) return;

    // Mặc định chọn mã BHK như hình mẫu của người dùng nếu có, hoặc LUC
    const defaultItem = dictionary.find(it => it.code === "BHK" || it.displayCode === "BHK") ||
                        dictionary.find(it => it.code === "LUC") ||
                        dictionary[0];
    if (defaultItem) {
      state.selectedId = defaultItem.id;
    }
  }

  // Lắng nghe thay đổi Hash (deep link / nút back-forward)
  window.addEventListener("hashchange", () => {
    const { id } = parseHash();
    if (id) {
      const matched = findById(id);
      if (matched && matched.id !== state.selectedId) {
        selectItem(matched.id, false);
      }
    }
  });

  // KHỞI ĐỘNG HỆ THỐNG
  renderPillCounts();
  renderRecent();
  initHashRouting();
  filterDictionary();
  if (state.selectedId) {
    selectItem(state.selectedId, false);
  }
})();
