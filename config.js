// =====================================================================
//  TIÊN ĐỒ LỘ — Bot game tu tiên Discord
//  TOÀN BỘ THÔNG SỐ GAME nằm ở đây. Muốn chỉnh nhịp game thì sửa file này.
//  (1 nguồn sự thật cho mọi con số — không rải số ma khắp nơi.)
// =====================================================================

module.exports = {
  // --- Màu embed dùng chung ---
  colors: {
    primary: 0x6c5ce7, // tím linh khí
    success: 0x00b894, // xanh đột phá
    danger: 0xd63031, // đỏ tâm ma / thất bại
    info: 0x0984e3, // xanh thông tin
    gold: 0xfdcb6e, // vàng linh thạch / tiên duyên
    // Màu chủ đạo MỖI KÊNH (đại tu UI: mỗi panel một sắc riêng để dễ nhận diện).
    chan: {
      soNhap: 0x55efc4, tuLuyen: 0x6c5ce7, dotPha: 0xfdcb6e, nhiemVu: 0x74b9ff,
      monPhai: 0xe17055, hoSo: 0x0984e3, trangBi: 0xa29bfe, luyenTruong: 0x00b894,
      dauDai: 0xd63031, bossTheGioi: 0x2d3436, bangXepHang: 0xfdcb6e, shop: 0xe84393,
      toDoi: 0x9b59b6,
    },
  },

  // --- UI: PANEL CHUNG cập nhật thời gian thực + STICKY (GĐ16) ---
  //  Panel CHUNG (boss/BXH/đấu pháp) tự edit định kỳ -> coi như real-time.
  //  Sticky: panel tự đăng lại xuống đáy kênh khi bị tin nhắn đẩy lên.
  //  (View CÁ NHÂN ephemeral KHÔNG auto-edit được — giới hạn Discord — giữ nút 🔄.)
  ui: {
    liveRefreshMs: 5 * 1000,    // nhịp NỀN của vòng cập nhật panel chung (5s); mỗi panel
                                //  có thể đặt intervalMs riêng khi register (vd boss 5s, BXH 10s)
    stickyEnabled: true,        // panel tự nổi xuống đáy kênh khi có tin nhắn mới
    stickyDebounceMs: 4 * 1000, // gộp nhiều tin nhắn liên tiếp, đăng lại 1 lần
    // VIEW CÁ NHÂN ẩn (săn yêu/tháp/tu luyện/bế quan): tự cập nhật bằng interaction.editReply
    //  định kỳ trong giới hạn token 15' của Discord. autoRefreshMs = nhịp; autoRefreshMaxMs = trần.
    autoRefreshMs: 5 * 1000,
    autoRefreshMaxMs: 14 * 60 * 1000, // < 15' (token ẩn hết hạn) -> tự dừng trước
  },

  // --- SHOP (Phường Thị): bán VẬT PHẨM TIÊU HAO (nguyên liệu · Tinh Thiết · đan) ---
  //  KHÔNG bán trang bị (trang bị chỉ từ rớt/boss). Giá ở shop.js; đây là cần gạt chung.
  shop: {
    priceMult: 1.0,             // nhân toàn cục lên giá bán (chỉnh lạm phát)
    sellbackPct: 0.4,           // (dự phòng) % giá khi bán lại — chưa dùng
  },

  // --- Tiền tệ: LINH THẠCH ---
  currency: {
    emoji: '💎',
    name: 'Linh Thạch',
    short: ' LT',
  },

  // --- TIỀN CAO CẤP: TIÊN NGỌC (rất khó cày) ---
  //  Chỉ kiếm được nhỏ giọt từ: hạ Boss Thế Giới (top đóng góp), hạ boss Phó Bản
  //  Tổ Đội, và các MỐC thành tựu lớn (độ kiếp vượt cảnh giới thành công). Dùng
  //  để mua vật phẩm CAO CẤP ở Phường Thị Cao Cấp (vé đổi giới tính · rương trang
  //  bị xịn · đan/Tinh Thiết hiếm · danh hiệu). KHÔNG dính nerf Linh Khí Loãng.
  premiumCurrency: {
    emoji: '🔮',
    name: 'Tiên Ngọc',
    short: ' TN',
  },

  // Linh thạch khởi điểm khi mới nhập đạo.
  startingStones: 0,

  // --- ROLE NGƯỜI CHƠI (cấp khi nhập đạo lần đầu — để nhận thông báo @) ---
  //  Ưu tiên PLAYER_ROLE_ID (.env). Nếu rỗng, bot TỰ TẠO role tên playerRoleName
  //  (cần quyền Manage Roles). Gán cho người mới ngay khi đăng ký.
  playerRoleId: process.env.PLAYER_ROLE_ID || '',
  playerRoleName: 'Đạo Hữu',

  // --- Tu luyện VẬN CÔNG (/tuluyen): CHỌN thời gian vận công, nhận tu vi SAU đó ---
  //  Người chơi chọn 1 mốc thời gian rồi "vận công"; đủ giờ (kể cả offline) thì
  //  nhận tu vi = số phút × ratePerMin. Thu hoạch sớm vẫn nhận theo phần đã trôi.
  cultivate: {
    ratePerMin: 3,                       // tu vi mỗi phút vận công (thường)
    durations: [5, 15, 30, 60, 120],     // các mốc phút người chơi chọn để vận công
  },

  // --- BẾ QUAN (/bequan): CHỌN MỐC thời gian rồi nhập định, tích tu vi dù offline ---
  //  Người chơi chọn 1 mốc (durations). Đủ giờ (kể cả offline) thu trọn; xuất sớm
  //  nhận theo phần đã ngồi. TRẦN = mốc đã chọn (không quá maxHours tuyệt đối).
  seclusion: {
    ratePerMin: 2,                       // tu vi mỗi phút bế quan
    durations: [60, 120, 240, 480],      // các mốc phút để chọn (1h / 2h / 4h / 8h)
    maxHours: 8,                         // trần tuyệt đối (an toàn cho phiên cũ không có mốc)
    minMinutes: 5,                       // phải bế quan ít nhất 5 phút mới xuất quan có thu hoạch
  },

  // --- NGỘ TÍNH khi chat trong server (giống tích lũy nhẹ) ---
  insight: {
    cooldownMs: 60 * 1000, // 60 giây/lần
    min: 1,
    max: 4,
  },

  // --- KỲ NGỘ (/kyngo): sự kiện phiêu lưu ngẫu nhiên, nguồn tu vi/linh thạch phụ
  //  (đặc biệt hữu ích GIAI ĐOẠN ĐẦU khi chưa mở bí cảnh). Có cooldown chống cày. ---
  kyngo: {
    cooldownMs: 10 * 60 * 1000, // 10 phút/lần kỳ ngộ (tính khi NHẬN thưởng)
    tuViPctBase: 0.08,          // thưởng tu vi quy theo % tu vi cần lên bậc (× hệ số sự kiện)
    stonesBase: 6,              // thưởng linh thạch nền (× hệ số sự kiện × (1+realm))
  },

  // --- ĐỘT PHÁ (/dotpha) ---
  breakthrough: {
    // Đột phá TẦNG nhỏ (trong cùng cảnh giới): luôn thành công nếu đủ tu vi.
    minorStones: 3, // thưởng linh thạch mỗi lần lên tầng

    // ĐẠI ĐỘT PHÁ (vượt cảnh giới = ĐỘ KIẾP): có rủi ro.
    majorStones: 50, // thưởng linh thạch khi vượt cảnh giới thành công
    majorPremium: 1, // 🔮 Tiên Ngọc thưởng mỗi lần ĐỘ KIẾP (vượt cảnh giới) THÀNH CÔNG (mốc thành tựu)
    baseSuccess: 0.9, // tỉ lệ thành công ở đại đột phá đầu tiên (Luyện Khí -> Trúc Cơ)
    successDropPerRealm: 0.07, // mỗi cảnh giới cao hơn thì khó hơn 7%
    minSuccess: 0.45, // sàn tỉ lệ (không bao giờ dưới 45%)
    failLossPct: 0.3, // độ kiếp thất bại -> tâm ma, mất 30% tu vi hiện có
  },

  // --- Môn phái ---
  sect: {
    switchCost: 200, // linh thạch phải trả khi ĐỔI phái (phản đồ phí). Gia nhập lần đầu miễn phí.
    switchLockMs: 12 * 60 * 60 * 1000, // sau khi đổi phái, KHÓA không đổi tiếp trong 12 giờ
    freeReturnMs: 24 * 60 * 60 * 1000, // sau 1 ngày kể từ lúc đổi, được QUAY VỀ phái cũ MIỄN PHÍ
  },

  // --- BÍ CẢNH (PvE /bicanh): thám hiểm theo tầng, đánh yêu thú, rớt đồ ---
  bicanh: {
    cooldownMs: 8 * 60 * 1000, // mỗi lần VÀO bí cảnh cách nhau 8 phút (chống cày vô hạn)
    hpCarryRegen: 0.42,        // hồi 42% máu tối đa giữa các tầng (đi sâu vẫn rủi ro)
    maxFloors: 12,             // trần độ sâu mỗi lượt thám hiểm
    baseStones: 8,             // linh thạch nền mỗi tầng thắng
    perFloorStones: 4,         // + theo độ sâu
    baseTuVi: 14,              // tu vi nền mỗi tầng thắng
    perFloorTuVi: 6,           // + theo độ sâu
    bossMult: 2.5,             // hệ số thưởng khi hạ BOSS (tầng 5, 10...)
  },

  // --- KHU FARM (mở ở Kim Đan, cùng kênh Luyện Trường với Bí Cảnh) ---
  farm: {
    // Linh Điền — vườn TRỒNG TRỌT (GĐ17): người chơi mua 🌰 Linh Chủng (hạt giống)
    //  ở Shop rồi tự GIEO; sau growMs thì thu hoạch ra nguyên liệu (lời hơn vốn hạt).
    linhDien: {
      growMs: 30 * 60 * 1000,     // mỗi hạt chín sau 30' (offline vẫn chín)
      maxPlots: 12,               // gieo tối đa 12 hạt mỗi lượt
      yieldPerSeed: 2,            // mỗi hạt -> 2 Linh Thảo khi thu
      yeuDanChance: 0.30,         // mỗi hạt 30% kèm 1 Yêu Đan
      seedId: 'linh_chung',       // id hạt giống (1 "nguyên liệu" trong túi, bán ở Shop)
    },
    // Săn Yêu — bãi săn nhanh: đánh 1 yêu thú/lượt, cooldown ngắn (đã hạ GĐ16).
    sanYeu: {
      cooldownMs: 30 * 1000,      // 30s (hạ từ 1' — GĐ17)
      foeMult: 0.95,              // yêu hoang hơi yếu hơn người chơi cùng bậc
      baseStones: 12, baseTuVi: 18, matChance: 0.45,
    },
    // Thí Luyện Tháp — leo tháp vô tận: thắng thì lên tầng + thưởng tăng dần.
    thap: {
      cooldownMs: 90 * 1000,      // 1'30 (hạ từ 4')
      maxFloor: 50,
      powerPerFloor: 0.05,       // mỗi tầng yêu mạnh thêm 5%
      baseStones: 10, perFloorStones: 5,
      baseTuVi: 20, perFloorTuVi: 8,
    },
  },

  // --- ĐẤU PHÁP (PvP /dauphap): Luận Võ Đài xếp hạng (mở ở Nguyên Anh) ---
  //  Ghép 1 đối thủ NGANG ĐIỂM rồi đánh "bản sao" chỉ số của họ (không cần
  //  online). Thắng cộng điểm ELO + thưởng nhỏ; thua trừ điểm. Cần gạt cân
  //  bằng combat vẫn ở combat.js/sects.js — PvP chỉ tái dùng engine.
  pvp: {
    minRealm: 4,                // cảnh giới mở Đấu Pháp (đồng bộ features.dauphap.realm = Nguyên Anh)
    cooldownMs: 45 * 1000,      // mỗi trận cách nhau 45 giây (đã hạ từ 3' — farm vốn đã bị nerf Linh Khí Loãng)
    matchPool: 8,               // lấy 8 đối thủ gần điểm nhất rồi chọn ngẫu nhiên (đa dạng)
    realmWindow: 1,             // ưu tiên đối thủ chênh tối đa 1 cảnh giới cho công bằng
    winStones: 20,              // thưởng linh thạch khi THẮNG (thua/hòa không thưởng)
    winTuVi: 25,                // thưởng tu vi khi thắng (giữ nhỏ để không thành kênh cày tu vi)
  },

  // --- THUỘC TÍNH GỐC (cộng điểm khi lên bậc) ---
  attributes: {
    pointsPerTier: 2,   // điểm thuộc tính mỗi lần đột phá (tầng HOẶC vượt cảnh giới)
    respecCost: 150,    // linh thạch để rửa điểm (trả hết về quỹ)
  },

  // --- KỸ NĂNG: mở khóa theo cấp + nâng qua độ kiếp ---
  skills: {
    perStageBuff: 0.01,         // buff tự động mỗi bậc kể từ khi gia nhập phái (×power & dot)
    upgradePointsPerMajor: 1,   // điểm nâng chiêu nhận mỗi lần ĐỘ KIẾP thành công
    maxLevel: 5,                // cấp nâng tối đa mỗi chiêu
    levelPowerStep: 0.06,       // mỗi cấp chiêu: +6% power & dot.mult
    upgradeStoneCost: 0,        // (tùy chọn) linh thạch thêm mỗi cấp nâng = step×level; 0 = chỉ tốn điểm
  },

  // --- LUYỆN ĐAN (/luyendan): chế đan từ nguyên liệu Bí Cảnh ---
  alchemy: {
    realmSuccessBonus: 0.05, // mỗi cảnh giới cao hơn mức yêu cầu đan phương: +5% tỉ lệ luyện thành
    maxSuccess: 0.98,        // trần tỉ lệ luyện đan
    tribulationCap: 0.95,    // trần tỉ lệ ĐỘ KIẾP sau khi dùng đan hộ đạo (không thành chắc 100%)
  },

  // --- NHIỆM VỤ hằng ngày ---
  quests: {
    resetTzOffsetMin: 420, // múi giờ reset (UTC+7 = 420') — đổi ngày theo giờ VN
  },

  // --- TU LUYỆN QUA VOICE: ngồi kênh thoại tích tu vi thụ động ---
  //  Ưu tiên tu luyện cộng đồng: cần đủ người THẬT cùng kênh, có trần ngày
  //  để không áp đảo người tu luyện tích cực. Trần ngày giữ trong bộ nhớ
  //  (reset khi bot restart — chấp nhận cho MVP).
  voice: {
    enabled: true,
    ratePerMin: 3,         // tu vi mỗi phút ngồi voice (nhỉnh hơn bế quan 2/phút)
    minCompany: 2,         // cần >= 2 thành viên THẬT (không tính bot) cùng kênh mới được tính
    dailyCapMinutes: 240,  // tối đa 4 giờ/ngày được tính tu vi (chống cày AFK 24/7)
    tickMs: 60 * 1000,     // chu kỳ cộng tu vi (mỗi phút quét voice 1 lần)
  },

  // --- KÊNH PANEL (điền ID kênh qua .env; rỗng = chưa cấu hình) ---
  channels: {
    soNhap:      process.env.CH_SO_NHAP       || '',  // kênh "sơ nhập giang hồ" (đăng ký)
    nhiemVu:     process.env.CH_NHIEM_VU      || '',  // kênh "nhiệm vụ" (cốt truyện + hằng ngày)
    monPhai:     process.env.CH_MON_PHAI      || '',  // kênh "môn phái của bạn" (chọn phái)
    hoSo:        process.env.CH_HO_SO         || '',  // kênh "hồ sơ nhân vật"
    bangXepHang: process.env.CH_BANG_XEP_HANG || '',  // kênh "bảng xếp hạng" (Phong Vân Bảng)
    vongAmDai:   process.env.CH_VONG_AM_DAI   || '',  // kênh "vọng âm đài" — mọi thông báo game loan ra đây
    tuLuyen:     process.env.CH_TU_LUYEN      || '',  // kênh "tu luyện trường" (tu hành + luyện đan)
    dotPha:      process.env.CH_DOT_PHA       || '',  // kênh "đột phá đường" (đột phá tầng/độ kiếp)
    luyenTruong: process.env.CH_LUYEN_TRUONG  || '',  // kênh "luyện trường" (bí cảnh + khu farm)
    dauDai:      process.env.CH_DAU_DAI       || '',  // kênh "luận võ đài" (Đấu Pháp PvP)
    bossTheGioi: process.env.CH_BOSS_THE_GIOI || process.env.CH_BOSS || '',  // kênh "boss thế giới" (công phạt chung)
    toDoi:       process.env.CH_TO_DOI        || '',  // kênh "phó bản tổ đội" (co-op 2-4 người)
    shop:        process.env.CH_SHOP          || '',  // kênh "phường thị" (shop bán vật phẩm tiêu hao)
    // (GĐ18 BỎ: trangBi -> trong panel Hồ Sơ; dotPha -> trong panel Tu Luyện)
  },
  adminRoleId: process.env.ADMIN_ROLE_ID || '', // role được phép chạy /setup (rỗng = chỉ Manage Guild)

  // --- KHÓA LỆNH THEO KÊNH (chống dùng lệnh sai chỗ) ---
  //  map: tên lệnh -> key kênh (trong channels). Lệnh KHÔNG có ở đây = dùng tự do
  //  (lệnh xem/admin: /hoso /top /trogiup /tinhnang /setup /quantri). CHỈ chặn khi kênh ĐÃ cấu hình
  //  (kênh rỗng -> không chặn, để server chưa set kênh vẫn chơi được).
  commandChannels: {
    batdau:   'soNhap',
    tuluyen:  'tuLuyen',
    bequan:   'tuLuyen',
    dotpha:   'tuLuyen',  // GĐ16: Đột Phá bỏ kênh riêng -> về panel Tu Luyện
    luyendan: 'tuLuyen',
    monphai:  'monPhai',
    kynang:   'monPhai',
    bicanh:      'luyenTruong',
    luyentruong: 'luyenTruong',
    dautap:      'luyenTruong',
    dauphap:     'dauDai',
    boss:        'bossTheGioi',
    toduoi:      'toDoi',
    shop:        'shop',
    // (trangbi: bỏ gate kênh — dùng tự do qua nút Hồ Sơ / lệnh /trangbi)
    cottruyen:'nhiemVu',
    nhiemvu:  'nhiemVu',
  },

  // --- NERF CHUNG: chống cày/spam liên tục (áp ở 1 chokepoint addTuVi/addStones) ---
  //  (1) LINH KHÍ LOÃNG: farm càng nhiều TRONG NGÀY thì hiệu suất tu vi & linh thạch
  //      càng giảm. Ngưỡng "thoải mái" TỰ CO GIÃN theo cảnh giới (tu vi: theo nhu cầu
  //      1 bậc hiện tại; linh thạch: theo bậc toàn cục) nên không lỗi thời ở bậc cao.
  //      Vượt ngưỡng -> nhân hệ số theo `brackets`. Bộ đếm reset theo NGÀY (giờ VN).
  //      Áp cho MỌI nguồn farm (tu luyện/bế quan/voice/bí cảnh/farm/PvP); MIỄN cho
  //      admin, hoàn tiền, thưởng đan, thưởng nhiệm vụ/cốt truyện (qua *Raw).
  dampen: {
    enabled: true,
    tuViStages: 3,                  // mỗi ngày farm "thoải mái" ~3 bậc tu vi trước khi loãng
    stonesBase: 600,                // ngưỡng linh thạch/ngày ở bậc 0 (Phàm Nhân)
    stonesPerStage: 120,            // + mỗi bậc toàn cục
    brackets: [1, 0.6, 0.3, 0.15],  // ×1 trong ngưỡng -> ×0.6 (1-2×) -> ×0.3 (2-3×) -> sàn ×0.15
  },

  // --- BÌNH CẢNH (bottleneck): chặn RIÊNG việc rush lên cảnh giới ---
  //  Ở tầng ĐỈNH mỗi cảnh giới (sắp độ kiếp), tu vi vào bị bóp mạnh -> không thể cày
  //  thẳng một mạch lên cảnh giới mới; phải tích đủ rồi ĐỘ KIẾP để qua ải (đan hộ đạo
  //  + đan tu vi vẫn trợ giúp vì đi đường *Raw, bỏ qua bóp này). Miễn cho người mới.
  bottleneck: {
    enabled: true,
    minRealm: 2,   // chỉ áp từ Trúc Cơ trở lên (Phàm Nhân/Luyện Khí để mượt cho tân thủ)
    mult: 0.35,    // tu vi vào ở tầng đỉnh chỉ còn 35%
  },

  // --- ENGINE COMBAT (cần gạt cân bằng cốt lõi) ---
  //  defK: hằng giảm trừ Phòng `dmg *= defK/(defK+def)`. TRƯỚC ĐÂY là hằng 150 ở
  //   MỌI bậc -> ở bậc cao Phòng (tăng tuyến tính theo bậc) áp đảo defK cố định ->
  //   tank ngày càng trâu một cách mất cân bằng (spread giãn). NAY defK **co giãn
  //   theo bậc** (defKBase + defKPerStage×bậc) sao cho TỈ LỆ giảm trừ GIỮ NGUYÊN ở
  //   mọi cảnh giới (neo tại điểm đã cân R2T5: bậc 14 -> 40+8×14≈152 ≈ 150 cũ).
  //  extraAttack: Tốc nhanh hơn địch ≥ ratio lần -> đánh THÊM 1 đòn cuối vòng
  //   (cơ chế trước đây comment mà CHƯA code -> Phong Linh/Thân Pháp mất giá trị).
  combat: {
    defKBase: 40,
    defKPerStage: 8,
    extraAttackRatio: 1.7,  // Tốc ≥ 1.7× địch -> +1 đòn/vòng (đã cân: Phong Linh ~50%, không gãy)
    extraAttackPower: 0.5,  // GĐ19: đòn thêm 0.7→0.5 (ghìm Phong Linh default OP ở bậc cao)
  },

  // --- SINH MỆNH NGOÀI TRẬN (HP bền): pool máu hồi theo thời gian, thua PvE -> trọng thương ---
  //  maxHp = Sinh Lực combat hiệu dụng (lấy từ combat.build). vit_cur lưu trong DB, hồi
  //  LƯỜI (tính khi đọc, theo mốc vit_ts). Thua PvE mất 1 phần lớn -> tụt về 0 = TRỌNG THƯƠNG
  //  (không vào PvE/boss tới khi hồi đủ). Đánh boss thế giới tốn Sinh Mệnh (sức công phạt).
  //  Hồi: theo thời gian + đan Hồi Sinh + nút Liệu Thương (tốn linh thạch). Tắt nhanh: enabled:false.
  // ⚠️ ĐÃ GỠ theo yêu cầu chủ dự án (GĐ16): HP-ngoài-trận tắt hoàn toàn. Boss
  //  thế giới chuyển sang gate bằng COOLDOWN THUẦN. Giữ module health.js (dạng ngủ)
  //  phòng khi cần lại — bật bằng enabled:true là sống lại đầy đủ.
  health: {
    enabled: false,
    regenPerMin: 0.012,     // hồi 1.2% máu tối đa mỗi phút (đầy sau ~83') — cả khi offline
    lossWoundPct: 0.5,      // THUA 1 trận PvE -> mất 50% máu tối đa
    winWearPct: 0.08,       // THẮNG trận PvE -> hao 8% máu (mệt mỏi, vẫn cho cày nhưng có nhịp)
    bossHitCost: 0.18,      // mỗi đòn công phạt boss thế giới tốn 18% máu tối đa
    minToFightPct: 0.15,    // máu dưới 15% = TRỌNG THƯƠNG, không vào PvE/boss tới khi hồi đủ
    restCost: 80,           // Liệu Thương tức thì (hồi đầy) tốn linh thạch ở mốc bậc 0
    restCostPerStage: 12,   // + mỗi bậc toàn cục
  },

  // --- HỆ TRANG BỊ ĐẦY ĐỦ (gear.js): 6 ô · 5 độ hiếm · rớt từ boss/bí cảnh/tháp · cường hóa ---
  //  Cộng chỉ số PHẲNG vào combat (sau bias phái, KHÔNG bị khuếch đại -> không nới spread).
  //  powerScale: cần gạt TỔNG để tinh chỉnh sức mạnh gear toàn cục (mô phỏng rồi chỉnh).
    // powerScale: CẦN GẠT TỔNG sức mạnh trang bị. Đã hạ xuống 0.22 sau mô phỏng:
    //  trang bị cộng phẳng vào combat, nếu lớn sẽ khiến trận "burst" nhanh -> phái
    //  công cao thắng đậm hơn -> NỚI rộng spread. 0.22 giữ spread gần như không đổi
    //  (full Bảo Khí 2 bên chỉ nới ~+3-5% so với baseline) mà vẫn rõ tác dụng PvE.
  gear: {
    powerScale: 0.22,       // nhân toàn cục lên chỉ số trang bị (tăng = mạnh hơn nhưng dễ phá cân bằng phái)
    // --- Tứ tính phái (affinity): món rớt có thể "hợp" 1 phái; mặc đúng phái -> món mạnh hơn ---
    affinityChance: 0.35,   // tỉ lệ 1 món rớt mang tứ tính (hợp ngẫu nhiên 1 phái). 0 = tắt
    affinityBonus: 0.25,    // mặc ĐÚNG phái: +25% chỉ số CỦA CHÍNH MÓN đó (cộng phẳng -> không phá spread)
    // --- Biến thể (variant): món rớt mang tên riêng + cộng 1 chỉ số chủ đề (đa dạng đồ) ---
    variantChance: 0.45,    // tỉ lệ 1 món rớt mang biến thể (Liệt Hỏa/Hàn Băng/…). 0 = tắt
    variantMult: 0.6,       // độ lớn chỉ số biến thể cộng thêm (× độ lớn tham chiếu). Cộng phẳng, tunable
    enhanceMax: 15,         // cường hóa tối đa +15
    enhanceStep: 0.04,      // mỗi cấp cường hóa +4% chỉ số nền của món (max +60%)
    enhanceStoneBase: 20,   // linh thạch cường hóa ở +0->+1 ở bậc 0
    enhanceStonePerLv: 14,  // + mỗi cấp cường hóa hiện tại
    enhanceStonePerStage: 4, // + mỗi bậc toàn cục của món
    // Tỉ lệ THÀNH khi cường hóa theo cấp (index = cấp đang lên). Trượt = mất nguyên liệu, KHÔNG tụt cấp.
    enhanceRates: [1, 1, 1, 0.95, 0.9, 0.85, 0.78, 0.7, 0.62, 0.55, 0.48, 0.4, 0.33, 0.27, 0.22],
    enhanceRefineBase: 1,   // Tinh Thiết cần để cường hóa (×(1+cấp))
    salvageRefineBase: 2,   // Tinh Thiết nhận khi phân giải (×bậc độ hiếm)
    invMax: 60,             // sức chứa kho trang bị (rớt khi đầy -> tự phân giải lấy Tinh Thiết)
    // Hệ số chỉ số theo ĐỘ HIẾM (nhân chỉ số nền của ô). Trọng số rớt mặc định.
    rarities: {
      pham:  { name: 'Phàm Khí',  emoji: '⚪', color: 0xb2bec3, mult: 1.0,  weight: 56, salvage: 1 },
      linh:  { name: 'Linh Khí',  emoji: '🟢', color: 0x00b894, mult: 1.35, weight: 28, salvage: 2 },
      bao:   { name: 'Bảo Khí',   emoji: '🔵', color: 0x0984e3, mult: 1.8,  weight: 11, salvage: 4 },
      tien:  { name: 'Tiên Khí',  emoji: '🟣', color: 0xa29bfe, mult: 2.4,  weight: 4,  salvage: 8 },
      than:  { name: 'Thần Khí',  emoji: '🟡', color: 0xfdcb6e, mult: 3.2,  weight: 1,  salvage: 16 },
    },
  },

  // --- BOSS THẾ GIỚI (worldboss.js): boss CHUNG toàn server, chia sát thương ---
  //  HP khổng lồ bền trong DB (sống sót restart). Mọi người công phạt góp sát thương;
  //  hạ gục -> chia thưởng theo % đóng góp + rớt trang bị (top hạng nhận hậu hơn).
  //  Spawn tự động theo chu kỳ (quét trong index.js) + admin có thể triệu hồi.
  worldboss: {
    enabled: true,
    minRealm: 3,            // cảnh giới mở Boss Thế Giới (Kim Đan)
    tickMs: 30 * 1000,      // chu kỳ quét spawn (30s/lần — GĐ17)
    respawnMs: 30 * 60 * 1000, // sau khi boss CHẾT, 30' sau có boss mới
    lifetimeMs: 0,          // 0 = boss KHÔNG hết hạn -> CHỈ biến mất khi bị tiêu diệt (GĐ17)
    attackCooldownMs: 30 * 1000, // mỗi người 30s công phạt 1 lần (GĐ18)
    assaultRounds: 12,      // số hiệp TỐI ĐA mỗi đòn công phạt (đánh THEO LƯỢT)
    assaultPoolMult: 10,    // HP "đợt" boss = Công người chơi × hệ số này (đánh hết = sát thương đó trừ HP chung)
    hpBase: 24000,          // HP nền của boss ở bậc 0 (boss CHUNG -> cần nhiều người công phạt)
    hpPerStage: 6000,       // + mỗi bậc toàn cục của boss
    rewardStonePerStage: 24, // quỹ linh thạch thưởng = (base+perStage×bậc) × hệ số boss
    rewardStoneBase: 400,
    rewardTuViPctNeed: 0.5,  // quỹ tu vi thưởng = pctNeed × tuViNeeded(bậc boss) toàn pool
    topShareBonus: 0.3,      // top-1 sát thương nhận thêm 30% phần thưởng
    dropChance: 0.5,         // mỗi người góp sát thương: 50% rớt 1 trang bị (top-3 chắc chắn rớt)
    premiumTopN: 3,          // 🔮 Tiên Ngọc: số người TOP đóng góp được thưởng khi hạ boss
    premiumTopReward: 2,     // 🔮 mỗi người trong top nhận (top-1 nhận gấp đôi) — rất nhỏ giọt
  },

  // --- PHÓ BẢN TỔ ĐỘI (party.js + commands/toduoi.js): 2-4 người co-op 1 boss HP CHUNG ---
  //  Tái dùng mô hình "góp sát thương" của Boss Thế Giới nhưng PHẠM VI 1 tổ đội + 1 vùng
  //  bí cảnh. Mỗi đòn công phạt = đánh theo lượt 1 "đợt" (atk × poolMult) -> trừ HP chung.
  //  Hạ boss -> chia thưởng theo % đóng góp (linh thạch/tu vi/nguyên liệu + rớt trang bị
  //  ƯU TIÊN tứ tính ĐÚNG phái người nhận). State giữ trong RAM (mất khi restart — chấp nhận).
  party: {
    enabled: true,
    minRealm: 3,             // cảnh giới mở Phó Bản Tổ Đội (Kim Đan — như bí cảnh)
    maxMembers: 4,           // sĩ số tối đa 1 tổ đội
    dailyAttempts: 5,        // CHỐNG SPAM: mỗi người tối đa 5 lượt phó bản/ngày (reset giờ VN). Tiêu khi BẮT ĐẦU raid.
    premiumPerKill: 2,       // 🔮 Tiên Ngọc quỹ chia cho top đóng góp khi hạ boss phó bản (top-1 gấp đôi)
    attackCooldownMs: 8000,  // mỗi người 8s/đòn công phạt (giữ nhịp)
    assaultRounds: 10,       // số hiệp tối đa mỗi đòn công phạt (đánh theo lượt)
    assaultPoolMult: 8,      // HP "đợt" = Công người chơi × hệ số (đánh hết = sát thương đó trừ HP boss)
    bossHpBase: 1000,        // HP boss phó bản ở bậc 0, TÍNH MỖI THÀNH VIÊN (≈5-6 đòn/người)
    bossHpPerStage: 180,     // + mỗi bậc toàn cục, mỗi thành viên
    rewardStoneBase: 320,    // quỹ linh thạch nền (× lootMult vùng × số thành viên)
    rewardStonePerStage: 20, // + mỗi bậc toàn cục
    rewardTuViBase: 130,     // quỹ tu vi nền (× lootMult vùng × số thành viên)
    rewardTuViPerStage: 15,  // + mỗi bậc toàn cục
    dropChance: 0.7,         // mỗi người góp sát thương: 70% rớt 1 trang bị
    dropRarityBoost: 1.0,    // dồn trọng số về độ hiếm cao (boss phó bản hậu hơn bí cảnh thường)
    affToOwnSect: 0.6,       // 60% món rớt mang tứ tính ĐÚNG phái người nhận (còn lại ngẫu nhiên)
    lobbyTtlMs: 15 * 60 * 1000, // dọn tổ đội lập mà không vào trận sau 15'
    raidTtlMs: 30 * 60 * 1000,  // dọn trận phó bản bỏ dở sau 30'
  },

  // --- Công thức tu vi cần để lên 1 bậc ---
  //  needed(stage) = round(base * growth^stage). stage = số bậc đã đi (0 ở Phàm Nhân).
  progression: {
    base: 50,
    growth: 1.16,
  },
};
