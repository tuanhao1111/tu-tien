// =====================================================================
//  CƠ SỞ DỮ LIỆU (SQLite qua better-sqlite3)
//  Toàn bộ dữ liệu tu sĩ nằm trong 1 file tu-tien.db (riêng game cũ).
// =====================================================================
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const story = require('./story'); // thuần (dữ liệu + helper) — dùng cho cốt truyện bền vững
const cult = require('./cultivation'); // tính bậc toàn cục (sect_join_stage)
const sects = require('./sects');       // loadout mặc định khi finalize phái
const skills = require('./skills');     // kiểm chiêu hợp lệ khi nâng cấp
const quests = require('./quests');     // catalog nhiệm vụ hằng ngày + dayKey
const attributes = require('./attributes'); // kiểm key thuộc tính hợp lệ
const alchemy = require('./alchemy');   // đan phương + đan dược (Luyện Đan)
const equipment = require('./equipment'); // bộ trang bị nhập môn mỗi phái
const sectquest = require('./sectquest'); // chuỗi nhiệm vụ nhập môn
const pvp = require('./pvp');             // Đấu Pháp: ELO + danh hiệu (công thức thuần)
const dampen = require('./dampen');       // NERF CHUNG: Linh Khí Loãng + Bình Cảnh (thuần)
const combat = require('./combat');       // dựng combatant hiệu dụng (maxHp cho Sinh Mệnh + bonus)
const gear = require('./gear');           // HỆ TRANG BỊ ĐẦY ĐỦ (6 ô · độ hiếm · cường hóa)
const health = require('./health');       // SINH MỆNH ngoài trận (HP bền + hồi máu + trọng thương)
const worldboss = require('./worldboss'); // BOSS THẾ GIỚI (catalog + công thức HP/thưởng)
const farm = require('./farm');           // Linh Điền trồng trọt (công thức gieo/thu)
const titles = require('./titles');       // DANH HIỆU (buff chỉ số khi đeo)
const forge = require('./forge');         // RÈN KHÍ LÔ (đan phương rèn trang bị)

// Đường dẫn DB: mặc định tu-tien.db cạnh code. CÓ THỂ đổi qua .env DB_PATH để
//  ĐẶT DB RA NGOÀI thư mục code (vd khi deploy: trỏ tới chỗ KHÔNG bị đè lúc upload
//  -> tránh mất dữ liệu người chơi + panel). Tự tạo thư mục cha nếu chưa có.
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(__dirname, 'tu-tien.db');
try { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); } catch (_) { /* bỏ qua */ }
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // an toàn & nhanh hơn khi ghi đồng thời

// Bảng tu sĩ. Thêm hệ thống mới sau này -> thêm cột hoặc bảng mới.
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    discord_id     TEXT PRIMARY KEY,
    username       TEXT NOT NULL,
    realm          INTEGER NOT NULL DEFAULT 0,   -- chỉ số cảnh giới (0 = Phàm Nhân)
    tier           INTEGER NOT NULL DEFAULT 1,   -- tầng trong cảnh giới (1..9)
    tu_vi          INTEGER NOT NULL DEFAULT 0,   -- tu vi đang tích về bậc kế
    stones         INTEGER NOT NULL DEFAULT 0,   -- linh thạch
    last_cultivate INTEGER NOT NULL DEFAULT 0,   -- mốc /tuluyen gần nhất (cooldown)
    last_insight   INTEGER NOT NULL DEFAULT 0,   -- mốc cộng ngộ tính khi chat gần nhất
    seclusion_ts   INTEGER NOT NULL DEFAULT 0,   -- mốc bắt đầu bế quan (0 = không bế quan)
    created_at     TEXT NOT NULL
  );
`);

// --- Migration: thêm cột mới cho bảng players cũ mà không mất dữ liệu ---
//  (SQLite không có ADD COLUMN IF NOT EXISTS -> tự kiểm tra rồi thêm.)
{
  const cols = db.prepare(`PRAGMA table_info(players)`).all().map((c) => c.name);
  const addCol = (name, ddl) => { if (!cols.includes(name)) db.exec(`ALTER TABLE players ADD COLUMN ${ddl}`); };
  addCol('sect', 'sect TEXT');                    // id môn phái (null = chưa gia nhập)
  addCol('skills_equipped', 'skills_equipped TEXT'); // JSON mảng id chiêu chủ động (<=3)
  addCol('sect_joined_at', 'sect_joined_at TEXT');
  addCol('materials', 'materials TEXT');          // JSON map nguyên liệu { matId: qty } (Bí Cảnh / Luyện Đan)
  addCol('pills', 'pills TEXT');                  // JSON map đan dược { pillId: qty } (Luyện Đan)
  addCol('last_bicanh', 'last_bicanh INTEGER NOT NULL DEFAULT 0'); // mốc VÀO bí cảnh gần nhất (cooldown)
  addCol('bicanh_best', 'bicanh_best TEXT');      // JSON { zoneId: tầng sâu nhất ĐÃ đạt } (cho chức năng Quét)
  // --- Trang bị nhập môn + chuỗi nhiệm vụ phái ---
  addCol('equipment', 'equipment TEXT');          // JSON mảng id trang bị đang sở hữu/mặc (bộ nhập môn)
  addCol('sect_quest_stage', 'sect_quest_stage INTEGER');     // số bước nhập môn đã xong (NULL = thành viên cũ -> mở hết chiêu)
  addCol('sect_quest_progress', 'sect_quest_progress INTEGER NOT NULL DEFAULT 0'); // tiến độ bước hiện tại
  // --- Khu farm ---
  addCol('linhdien_ts', 'linhdien_ts INTEGER NOT NULL DEFAULT 0'); // mốc GIEO Linh Điền (0 = ruộng trống)
  addCol('linhdien_seeds', 'linhdien_seeds INTEGER NOT NULL DEFAULT 0'); // số hạt đang trồng (GĐ17)
  addCol('sanyeu_ts', 'sanyeu_ts INTEGER NOT NULL DEFAULT 0');     // mốc Săn Yêu gần nhất (cooldown)
  addCol('thap_best', 'thap_best INTEGER NOT NULL DEFAULT 0');     // tầng Thí Luyện Tháp cao nhất đã vượt
  addCol('thap_ts', 'thap_ts INTEGER NOT NULL DEFAULT 0');         // mốc leo tháp gần nhất (cooldown)
  // --- Hệ thuộc tính / cấp chiêu / gia nhập phái qua nhiệm vụ / nhiệm vụ ngày ---
  addCol('attributes', 'attributes TEXT');        // JSON điểm đã cộng { key: n }
  addCol('attr_points', 'attr_points INTEGER NOT NULL DEFAULT 0'); // quỹ điểm thuộc tính chưa tiêu
  addCol('skill_levels', 'skill_levels TEXT');    // JSON cấp chiêu { skillId: level }
  addCol('skill_points', 'skill_points INTEGER NOT NULL DEFAULT 0'); // điểm nâng chiêu (từ độ kiếp)
  addCol('pending_sect', 'pending_sect TEXT');    // phái đang chờ hoàn thành nhiệm vụ gia nhập
  addCol('sect_join_stage', 'sect_join_stage INTEGER NOT NULL DEFAULT 0'); // bậc toàn cục lúc chính thức vào phái
  addCol('daily_quests', 'daily_quests TEXT');    // JSON { date, progress:{id:n}, claimed:{id:true} }
  // --- Đấu Pháp (PvP): điểm xếp hạng ELO + thành tích + cooldown ---
  addCol('pvp_rating', `pvp_rating INTEGER NOT NULL DEFAULT ${pvp.START_RATING}`); // điểm đấu (ELO)
  addCol('pvp_wins', 'pvp_wins INTEGER NOT NULL DEFAULT 0');     // số trận thắng
  addCol('pvp_losses', 'pvp_losses INTEGER NOT NULL DEFAULT 0'); // số trận thua
  addCol('pvp_ts', 'pvp_ts INTEGER NOT NULL DEFAULT 0');         // mốc trận gần nhất (cooldown)
  // --- Tu luyện VẬN CÔNG có thời gian (chọn giờ -> nhận tu vi sau) + chế độ Voice ---
  addCol('cultivate_start', 'cultivate_start INTEGER NOT NULL DEFAULT 0');     // mốc bắt đầu phiên vận công (0 = không vận công)
  addCol('cultivate_minutes', 'cultivate_minutes INTEGER NOT NULL DEFAULT 0'); // số phút đã chọn cho phiên (0 với chế độ voice)
  addCol('cultivate_mode', 'cultivate_mode TEXT');                             // 'normal' | 'voice' (NULL/'' = nhàn rỗi)
  // --- Đổi phái: phái cũ + mốc đổi (khóa đổi tiếp + về phái cũ miễn phí) ---
  addCol('prev_sect', 'prev_sect TEXT');                          // phái TRƯỚC lần đổi gần nhất (để về free)
  addCol('sect_switch_ts', 'sect_switch_ts INTEGER NOT NULL DEFAULT 0'); // mốc đổi phái gần nhất
  // --- NERF CHUNG (Linh Khí Loãng): bộ đếm farm RAW trong NGÀY, reset theo ngày VN ---
  addCol('earn_day', 'earn_day TEXT');                                // ngày (dayKey) của bộ đếm farm
  addCol('tuvi_today', 'tuvi_today INTEGER NOT NULL DEFAULT 0');      // tu vi RAW đã farm trong ngày
  addCol('stones_today', 'stones_today INTEGER NOT NULL DEFAULT 0');  // linh thạch RAW đã farm trong ngày
  // --- BỀN HÓA trạng thái trước đây giữ trong RAM (mất khi restart) ---
  addCol('bicanh_run', 'bicanh_run TEXT');                           // JSON lượt thám hiểm bí cảnh đang dở (null = không có)
  addCol('voice_day', 'voice_day TEXT');                             // ngày (dayKey) của bộ đếm phút voice
  addCol('voice_used', 'voice_used REAL NOT NULL DEFAULT 0');        // số phút voice ĐÃ tính tu vi trong ngày (chống cày AFK)
  addCol('auto_trib', 'auto_trib INTEGER NOT NULL DEFAULT 1');      // 1=tự dùng đan Hộ Đạo/Tạo Hóa khi độ kiếp, 0=không (người chơi tùy chỉnh)
  addCol('seclusion_minutes', 'seclusion_minutes INTEGER NOT NULL DEFAULT 0'); // số phút BẾ QUAN đã chọn cho phiên (0 = phiên cũ/không hạn)
  // --- SINH MỆNH ngoài trận (HP bền + hồi máu lười) ---
  addCol('vit_cur', 'vit_cur INTEGER NOT NULL DEFAULT -1');  // máu hiện tại (-1 = chưa khởi tạo -> coi như đầy)
  addCol('vit_ts', 'vit_ts INTEGER NOT NULL DEFAULT 0');     // mốc cập nhật máu gần nhất (để hồi theo thời gian)
  // --- HỆ TRANG BỊ ĐẦY ĐỦ (kho + đang mặc + cường hóa) ---
  addCol('gear_inv', 'gear_inv TEXT');                       // JSON mảng instance { u,s,r,st,e }
  addCol('gear_equipped', 'gear_equipped TEXT');             // JSON map { slot: uid }
  addCol('gear_uid', 'gear_uid INTEGER NOT NULL DEFAULT 0'); // bộ đếm uid tăng dần cho instance
  addCol('refine', 'refine INTEGER NOT NULL DEFAULT 0');     // 🔩 Tinh Thiết (vật phẩm cường hóa, từ phân giải)
  addCol('equip_enh', 'equip_enh TEXT');                     // JSON map { itemId: level } — bậc cường hóa ĐỒ NHẬP MÔN
  // --- Giới tính (cho ẢNH NHÂN VẬT thẻ Hồ Sơ): 'nam' | 'nu' (mặc định nam) ---
  //  CHỌN khi nhập đạo, CỐ ĐỊNH. Chỉ đổi được khi dùng 🎟️ Vé Đổi Giới Tính (mua ở
  //  Phường Thị Cao Cấp bằng Tiên Ngọc). gender_tickets = số vé đang giữ.
  addCol('gender', "gender TEXT NOT NULL DEFAULT 'nam'");
  addCol('gender_tickets', 'gender_tickets INTEGER NOT NULL DEFAULT 0');
  // --- TIỀN CAO CẤP: Tiên Ngọc (rất khó cày, mua vật phẩm cao cấp) ---
  addCol('premium', 'premium INTEGER NOT NULL DEFAULT 0');
  // --- PHÓ BẢN TỔ ĐỘI: bộ đếm lượt/ngày (chống spam, reset theo ngày VN) ---
  addCol('party_day', 'party_day TEXT');
  addCol('party_attempts', 'party_attempts INTEGER NOT NULL DEFAULT 0');
  // --- DANH HIỆU (cosmetic, mua bằng Tiên Ngọc): title = đang đeo, titles = JSON đã sở hữu ---
  addCol('title', 'title TEXT');
  addCol('titles', 'titles TEXT');
  // --- THÔNG BÁO RIÊNG (DM): bậc toàn cục ĐÃ nhắc "đủ tu vi để đột phá" (chống nhắc lặp) ---
  addCol('notified_stage', 'notified_stage INTEGER NOT NULL DEFAULT -1');
  // --- THÀNH TỰU: JSON mảng id thành tựu ĐÃ lãnh thưởng ---
  addCol('achievements', 'achievements TEXT');
  // --- PHÙ RÈN: JSON map { charmId: qty } (mua bằng Tiên Ngọc, dùng ở Lò Rèn) ---
  addCol('forge_charms', 'forge_charms TEXT');
  // --- KỲ NGỘ: mốc nhận thưởng kỳ ngộ gần nhất (cooldown) ---
  addCol('kyngo_ts', 'kyngo_ts INTEGER NOT NULL DEFAULT 0');
}

// --- Migration 1 lần: ĐỔI hệ gear sang CATALOG có tên (gear.js) ---
//  Đồ gear cũ (sinh ngẫu nhiên, KHÔNG có .id catalog) -> XÓA + ĐỀN 🔩 Tinh Thiết
//  theo giá trị phân giải. Idempotent: chạy lại chỉ tác động item cũ còn sót.
{
  try {
    const rows = db.prepare(`SELECT discord_id, gear_inv, gear_equipped, refine FROM players WHERE gear_inv IS NOT NULL AND gear_inv != ''`).all();
    const fix = db.prepare('UPDATE players SET gear_inv = ?, gear_equipped = ?, refine = ? WHERE discord_id = ?');
    for (const row of rows) {
      let inv;
      try { inv = JSON.parse(row.gear_inv); } catch (_) { continue; }
      if (!Array.isArray(inv) || !inv.length) continue;
      const old = inv.filter((it) => !it || !it.id || !gear.isCatalog(it.id));
      if (!old.length) continue; // toàn đồ catalog mới -> bỏ qua
      let refund = 0;
      for (const it of old) { try { refund += gear.salvageYield(it); } catch (_) { refund += 1; } }
      const keep = inv.filter((it) => it && it.id && gear.isCatalog(it.id));
      const keepU = new Set(keep.map((x) => x.u));
      let eq; try { eq = JSON.parse(row.gear_equipped || '{}'); } catch (_) { eq = {}; }
      if (eq && typeof eq === 'object') for (const [slot, u] of Object.entries(eq)) if (!keepU.has(u)) delete eq[slot];
      fix.run(JSON.stringify(keep), JSON.stringify(eq || {}), (row.refine || 0) + refund, row.discord_id);
    }
  } catch (e) { console.error('[migrate gear-catalog]', e && e.message); }
}

// Bảng PANEL cố định ở các kênh (để /setup sửa tại chỗ, không đăng trùng).
db.exec(`
  CREATE TABLE IF NOT EXISTS panels (
    channel_key TEXT PRIMARY KEY,   -- 'soNhap' | 'nhiemVu' | 'monPhai' | 'hoSo'
    channel_id  TEXT NOT NULL,
    message_id  TEXT NOT NULL
  );
`);

// Bảng tiến độ CỐT TRUYỆN. Mỗi tu sĩ 1 dòng: đang ở chương nào, cảnh nào.
db.exec(`
  CREATE TABLE IF NOT EXISTS story_progress (
    discord_id  TEXT PRIMARY KEY,
    chapter_id  TEXT NOT NULL,                  -- id chương trong story.js
    scene       INTEGER NOT NULL DEFAULT 0,     -- chỉ số cảnh đang ở
    progress    INTEGER NOT NULL DEFAULT 0,     -- tiến độ cảnh nhiệm vụ hiện tại
    done        INTEGER NOT NULL DEFAULT 0      -- đã đi hết cốt truyện chưa
  );
`);

// --- BOSS THẾ GIỚI: 1 boss CHUNG toàn server (HP bền, sống sót restart) ---
//  Bảng singleton (id=1). spawn_n tăng mỗi lần spawn -> tách đợt đóng góp.
db.exec(`
  CREATE TABLE IF NOT EXISTS world_boss (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    spawn_n     INTEGER NOT NULL DEFAULT 0,   -- số thứ tự lần spawn (xoay vòng catalog + tách dmg)
    boss_key    TEXT,
    max_hp      INTEGER NOT NULL DEFAULT 0,
    hp          INTEGER NOT NULL DEFAULT 0,
    born_ts     INTEGER NOT NULL DEFAULT 0,
    expire_ts   INTEGER NOT NULL DEFAULT 0,
    died_ts     INTEGER NOT NULL DEFAULT 0,
    dead        INTEGER NOT NULL DEFAULT 1,   -- 1 = không có boss sống
    distributed INTEGER NOT NULL DEFAULT 1    -- đã chia thưởng cho đợt này chưa
  );
`);
// Đóng góp sát thương mỗi người mỗi đợt spawn.
db.exec(`
  CREATE TABLE IF NOT EXISTS world_boss_dmg (
    spawn_n    INTEGER NOT NULL,
    discord_id TEXT NOT NULL,
    username   TEXT NOT NULL,
    damage     INTEGER NOT NULL DEFAULT 0,
    hits       INTEGER NOT NULL DEFAULT 0,
    last_ts    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (spawn_n, discord_id)
  );
`);

// --- Câu lệnh đã biên dịch sẵn (nhanh) ---
const Q = {
  get: db.prepare('SELECT * FROM players WHERE discord_id = ?'),
  create: db.prepare(
    `INSERT INTO players (discord_id, username, created_at) VALUES (?, ?, ?)`,
  ),
  touchName: db.prepare('UPDATE players SET username = ? WHERE discord_id = ?'),
  setTuVi: db.prepare('UPDATE players SET tu_vi = ?, last_cultivate = ? WHERE discord_id = ?'),
  addInsight: db.prepare('UPDATE players SET tu_vi = tu_vi + ?, last_insight = ? WHERE discord_id = ?'),
  setSeclusion: db.prepare('UPDATE players SET seclusion_ts = ? WHERE discord_id = ?'),
  setSeclusionSession: db.prepare('UPDATE players SET seclusion_ts = ?, seclusion_minutes = ? WHERE discord_id = ?'),
  setAutoTrib: db.prepare('UPDATE players SET auto_trib = ? WHERE discord_id = ?'),
  setNotifiedStage: db.prepare('UPDATE players SET notified_stage = ? WHERE discord_id = ?'),
  setGender: db.prepare('UPDATE players SET gender = ? WHERE discord_id = ?'),
  // Vé đổi giới tính (mua bằng Tiên Ngọc).
  addGenderTickets: db.prepare('UPDATE players SET gender_tickets = gender_tickets + ? WHERE discord_id = ?'),
  // Tiền cao cấp (Tiên Ngọc).
  addPremium: db.prepare('UPDATE players SET premium = premium + ? WHERE discord_id = ?'),
  // Phó bản tổ đội: bộ đếm lượt/ngày.
  resetPartyDay: db.prepare('UPDATE players SET party_day = ?, party_attempts = 0 WHERE discord_id = ?'),
  bumpPartyAttempt: db.prepare('UPDATE players SET party_attempts = party_attempts + 1 WHERE discord_id = ?'),
  // Danh hiệu.
  setTitles: db.prepare('UPDATE players SET titles = ? WHERE discord_id = ?'),
  setAchievements: db.prepare('UPDATE players SET achievements = ? WHERE discord_id = ?'),
  setForgeCharms: db.prepare('UPDATE players SET forge_charms = ? WHERE discord_id = ?'),
  setKyngoTs: db.prepare('UPDATE players SET kyngo_ts = ? WHERE discord_id = ?'),
  setActiveTitle: db.prepare('UPDATE players SET title = ? WHERE discord_id = ?'),
  // Phiên vận công có thời gian / chế độ voice.
  setCultivateSession: db.prepare('UPDATE players SET cultivate_start = ?, cultivate_minutes = ?, cultivate_mode = ? WHERE discord_id = ?'),
  addTuVi: db.prepare('UPDATE players SET tu_vi = tu_vi + ? WHERE discord_id = ?'),
  // Cập nhật toàn bộ trạng thái sau đột phá (1 lần ghi, an toàn).
  applyBreakthrough: db.prepare(
    `UPDATE players SET realm = ?, tier = ?, tu_vi = ?, stones = stones + ? WHERE discord_id = ?`,
  ),
  setTuViOnly: db.prepare('UPDATE players SET tu_vi = ? WHERE discord_id = ?'),
  addStones: db.prepare('UPDATE players SET stones = stones + ? WHERE discord_id = ?'),
  // NERF CHUNG: reset/cộng bộ đếm farm trong ngày.
  resetEarn: db.prepare('UPDATE players SET earn_day = ?, tuvi_today = 0, stones_today = 0 WHERE discord_id = ?'),
  bumpTuViToday: db.prepare('UPDATE players SET tuvi_today = tuvi_today + ? WHERE discord_id = ?'),
  bumpStonesToday: db.prepare('UPDATE players SET stones_today = stones_today + ? WHERE discord_id = ?'),
  // Bền hóa lượt bí cảnh + bộ đếm voice (trước đây ở RAM).
  setBicanhRun: db.prepare('UPDATE players SET bicanh_run = ? WHERE discord_id = ?'),
  setVoiceDaily: db.prepare('UPDATE players SET voice_day = ?, voice_used = ? WHERE discord_id = ?'),
  setSect: db.prepare('UPDATE players SET sect = ?, skills_equipped = ?, sect_joined_at = ?, sect_join_stage = ?, sect_quest_stage = ?, sect_quest_progress = 0, pending_sect = NULL WHERE discord_id = ?'),
  setSectSwitch: db.prepare('UPDATE players SET prev_sect = ?, sect_switch_ts = ? WHERE discord_id = ?'),
  setEquipped: db.prepare('UPDATE players SET skills_equipped = ? WHERE discord_id = ?'),
  countSect: db.prepare('SELECT COUNT(*) AS n FROM players WHERE sect = ?'),
  setMaterials: db.prepare('UPDATE players SET materials = ? WHERE discord_id = ?'),
  setPills: db.prepare('UPDATE players SET pills = ? WHERE discord_id = ?'),
  setBicanhTs: db.prepare('UPDATE players SET last_bicanh = ? WHERE discord_id = ?'),
  setBicanhBest: db.prepare('UPDATE players SET bicanh_best = ? WHERE discord_id = ?'),
  // farm
  setLinhDienTs: db.prepare('UPDATE players SET linhdien_ts = ? WHERE discord_id = ?'),
  setLinhDienPlot: db.prepare('UPDATE players SET linhdien_ts = ?, linhdien_seeds = ? WHERE discord_id = ?'),
  setSanYeuTs: db.prepare('UPDATE players SET sanyeu_ts = ? WHERE discord_id = ?'),
  setTowerBest: db.prepare('UPDATE players SET thap_best = ? WHERE discord_id = ?'),
  setTowerTs: db.prepare('UPDATE players SET thap_ts = ? WHERE discord_id = ?'),
  // sinh mệnh (HP bền)
  setVit: db.prepare('UPDATE players SET vit_cur = ?, vit_ts = ? WHERE discord_id = ?'),
  // trang bị đầy đủ
  setGearInv: db.prepare('UPDATE players SET gear_inv = ? WHERE discord_id = ?'),
  setGearEquipped: db.prepare('UPDATE players SET gear_equipped = ? WHERE discord_id = ?'),
  setGearUid: db.prepare('UPDATE players SET gear_uid = ? WHERE discord_id = ?'),
  setRefine: db.prepare('UPDATE players SET refine = ? WHERE discord_id = ?'),
  // boss thế giới
  wbGet: db.prepare('SELECT * FROM world_boss WHERE id = 1'),
  wbUpsert: db.prepare(`INSERT INTO world_boss (id, spawn_n, boss_key, max_hp, hp, born_ts, expire_ts, died_ts, dead, distributed)
    VALUES (1, ?, ?, ?, ?, ?, ?, 0, 0, 0)
    ON CONFLICT(id) DO UPDATE SET spawn_n=excluded.spawn_n, boss_key=excluded.boss_key, max_hp=excluded.max_hp,
      hp=excluded.hp, born_ts=excluded.born_ts, expire_ts=excluded.expire_ts, died_ts=0, dead=0, distributed=0`),
  wbSetHp: db.prepare('UPDATE world_boss SET hp = ? WHERE id = 1'),
  wbKill: db.prepare('UPDATE world_boss SET hp = 0, dead = 1, died_ts = ? WHERE id = 1'),
  wbExpire: db.prepare('UPDATE world_boss SET dead = 1, died_ts = ? WHERE id = 1'),
  wbDistributed: db.prepare('UPDATE world_boss SET distributed = 1 WHERE id = 1'),
  wbDmgGet: db.prepare('SELECT * FROM world_boss_dmg WHERE spawn_n = ? AND discord_id = ?'),
  wbDmgUpsert: db.prepare(`INSERT INTO world_boss_dmg (spawn_n, discord_id, username, damage, hits, last_ts)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(spawn_n, discord_id) DO UPDATE SET damage = damage + excluded.damage, hits = hits + 1,
      username = excluded.username, last_ts = excluded.last_ts`),
  wbDmgList: db.prepare('SELECT * FROM world_boss_dmg WHERE spawn_n = ? ORDER BY damage DESC'),
  // thuộc tính
  setAttributes: db.prepare('UPDATE players SET attributes = ?, attr_points = ? WHERE discord_id = ?'),
  addAttrPoints: db.prepare('UPDATE players SET attr_points = attr_points + ? WHERE discord_id = ?'),
  // cấp chiêu
  setSkillLevels: db.prepare('UPDATE players SET skill_levels = ? WHERE discord_id = ?'),
  addSkillPoints: db.prepare('UPDATE players SET skill_points = skill_points + ? WHERE discord_id = ?'),
  setSkillUpgrade: db.prepare('UPDATE players SET skill_levels = ?, skill_points = ? WHERE discord_id = ?'),
  // gia nhập phái qua nhiệm vụ
  setPendingSect: db.prepare('UPDATE players SET pending_sect = ? WHERE discord_id = ?'),
  finalizeSect: db.prepare('UPDATE players SET sect = ?, skills_equipped = ?, sect_joined_at = ?, sect_join_stage = ?, sect_quest_stage = 0, sect_quest_progress = 0, pending_sect = NULL WHERE discord_id = ?'),
  // trang bị + chuỗi nhiệm vụ phái
  setEquipment: db.prepare('UPDATE players SET equipment = ? WHERE discord_id = ?'),
  setEquipEnh: db.prepare('UPDATE players SET equip_enh = ? WHERE discord_id = ?'),
  setSectQuestProgress: db.prepare('UPDATE players SET sect_quest_progress = ? WHERE discord_id = ?'),
  setSectQuestAdvance: db.prepare('UPDATE players SET sect_quest_stage = ?, sect_quest_progress = 0 WHERE discord_id = ?'),
  // nhiệm vụ ngày
  setDaily: db.prepare('UPDATE players SET daily_quests = ? WHERE discord_id = ?'),
  // panels
  getPanel: db.prepare('SELECT * FROM panels WHERE channel_key = ?'),
  allPanels: db.prepare('SELECT * FROM panels'),
  delPanel: db.prepare('DELETE FROM panels WHERE channel_key = ?'),
  upsertPanel: db.prepare(`INSERT INTO panels (channel_key, channel_id, message_id) VALUES (?, ?, ?)
    ON CONFLICT(channel_key) DO UPDATE SET channel_id = excluded.channel_id, message_id = excluded.message_id`),
  topByStage: db.prepare(
    // Sắp xếp theo cảnh giới -> tầng -> tu vi (cao xuống thấp).
    `SELECT * FROM players ORDER BY realm DESC, tier DESC, tu_vi DESC LIMIT ?`,
  ),
  topByStones: db.prepare('SELECT * FROM players ORDER BY stones DESC LIMIT ?'),
  // --- Đấu Pháp (PvP) ---
  setPvp: db.prepare('UPDATE players SET pvp_rating = ?, pvp_wins = ?, pvp_losses = ? WHERE discord_id = ?'),
  setPvpTs: db.prepare('UPDATE players SET pvp_ts = ? WHERE discord_id = ?'),
  setPvpOpp: db.prepare('UPDATE players SET pvp_rating = ?, pvp_wins = ?, pvp_losses = ? WHERE discord_id = ?'),
  findPvpOpps: db.prepare(
    // Tu sĩ KHÁC mình, đã có phái, đủ cảnh giới mở Đấu Pháp — gần điểm nhất trước.
    `SELECT * FROM players
     WHERE discord_id != ? AND sect IS NOT NULL AND realm >= ?
     ORDER BY ABS(pvp_rating - ?) ASC LIMIT ?`,
  ),
  topByPvp: db.prepare(
    'SELECT * FROM players WHERE (pvp_wins + pvp_losses) > 0 ORDER BY pvp_rating DESC, pvp_wins DESC LIMIT ?',
  ),
  // --- Quản trị (admin) ---
  adminSetStage: db.prepare('UPDATE players SET realm = ?, tier = ?, tu_vi = 0 WHERE discord_id = ?'),
  adminSetPvpRating: db.prepare('UPDATE players SET pvp_rating = ? WHERE discord_id = ?'),
  adminResetCd: db.prepare(
    'UPDATE players SET last_cultivate = 0, last_insight = 0, last_bicanh = 0, sanyeu_ts = 0, thap_ts = 0, pvp_ts = 0 WHERE discord_id = ?',
  ),
  adminDelPlayer: db.prepare('DELETE FROM players WHERE discord_id = ?'),
  adminDelStory: db.prepare('DELETE FROM story_progress WHERE discord_id = ?'),
  rankOf: db.prepare(
    `SELECT COUNT(*) AS n FROM players
     WHERE realm > ? OR (realm = ? AND tier > ?) OR (realm = ? AND tier = ? AND tu_vi > ?)`,
  ),

  // --- Cốt truyện ---
  getStory: db.prepare('SELECT * FROM story_progress WHERE discord_id = ?'),
  createStory: db.prepare('INSERT INTO story_progress (discord_id, chapter_id) VALUES (?, ?)'),
  storySetProgress: db.prepare('UPDATE story_progress SET progress = ? WHERE discord_id = ?'),
  storyAdvance: db.prepare('UPDATE story_progress SET scene = ?, progress = 0 WHERE discord_id = ?'),
  storyGoChapter: db.prepare('UPDATE story_progress SET chapter_id = ?, scene = 0, progress = 0 WHERE discord_id = ?'),
  storyFinish: db.prepare('UPDATE story_progress SET done = 1 WHERE discord_id = ?'),
};

// --- API người chơi ---
function getPlayer(id) {
  return Q.get.get(id);
}

function createPlayer(id, username, gender) {
  const now = new Date().toISOString();
  Q.create.run(id, username, now);
  // Giới tính CHỌN khi nhập đạo (cố định). Mặc định 'nam' nếu không truyền.
  Q.setGender.run(gender === 'nu' ? 'nu' : 'nam', id);
  // Linh thạch khởi điểm (nếu cấu hình > 0).
  if (config.startingStones > 0) {
    db.prepare('UPDATE players SET stones = ? WHERE discord_id = ?').run(config.startingStones, id);
  }
  return getPlayer(id);
}

function touchUsername(id, username) {
  Q.touchName.run(username, id);
}

// Ghi tu vi sau /tuluyen (kèm mốc cooldown).
function setCultivate(id, tuVi, ts) {
  Q.setTuVi.run(tuVi, ts, id);
}

// Cộng ngộ tính khi chat.
function addInsight(id, amount, ts) {
  Q.addInsight.run(amount, ts, id);
}

// Bế quan: đặt / xóa mốc bắt đầu.
function setSeclusion(id, ts) {
  Q.setSeclusion.run(ts, id);
}
// Bế quan có chọn mốc: lưu mốc bắt đầu + số phút đã chọn (trần thu hoạch).
function setSeclusionSession(id, ts, minutes) {
  Q.setSeclusionSession.run(ts, minutes || 0, id);
}
// Bật/tắt tự dùng đan độ kiếp (Hộ Đạo/Tạo Hóa). val: 1 hoặc 0.
function setAutoTrib(id, val) {
  Q.setAutoTrib.run(val ? 1 : 0, id);
}
// Ghi bậc toàn cục đã DM nhắc "đủ tu vi đột phá" (chống nhắc lặp mỗi lần thu hoạch).
function setNotifiedStage(id, stage) {
  Q.setNotifiedStage.run(stage, id);
}
// Ghi mốc nhận thưởng Kỳ Ngộ gần nhất (cooldown).
function setKyngoTs(id, ts) {
  Q.setKyngoTs.run(ts, id);
}
// Đặt giới tính cho ảnh nhân vật ('nam' | 'nu'). Trả giới tính đã chuẩn hóa.
function setGender(id, g) {
  const v = g === 'nu' ? 'nu' : 'nam';
  Q.setGender.run(v, id);
  return v;
}

// Tu luyện vận công: bắt đầu 1 phiên (mode 'normal' kèm phút, hoặc 'voice').
function setCultivateSession(id, startTs, minutes, mode) {
  Q.setCultivateSession.run(startTs, minutes || 0, mode || null, id);
}
// Kết thúc phiên vận công (về nhàn rỗi).
function clearCultivateSession(id) {
  Q.setCultivateSession.run(0, 0, null, id);
}

// Cộng thẳng tu vi (dùng khi xuất quan).
// --- NERF CHUNG: đảm bảo bộ đếm farm trong ngày khớp NGÀY hiện tại (reset nếu sang ngày mới) ---
//  Trả { tuvi, stones } = lượng RAW đã farm trong ngày (0 nếu vừa reset). p = player row.
function rollEarnDay(p, now) {
  const today = quests.dayKey(now);
  if (p.earn_day !== today) {
    Q.resetEarn.run(today, p.discord_id);
    return { tuvi: 0, stones: 0 };
  }
  return { tuvi: p.tuvi_today || 0, stones: p.stones_today || 0 };
}

// Cộng tu vi TỪ FARM (có nerf Linh Khí Loãng + Bình Cảnh). Trả meta { raw, gained, damp, bottleneck }.
//  Số <=0 (trừ tu vi) đi thẳng không nerf. Dùng addTuViRaw cho thưởng milestone/đan/admin.
function addTuVi(id, amount) {
  if (amount <= 0) { Q.addTuVi.run(amount, id); return { raw: amount, gained: amount, damp: 1, bottleneck: 1 }; }
  const p = Q.get.get(id);
  if (!p) { Q.addTuVi.run(amount, id); return { raw: amount, gained: amount, damp: 1, bottleneck: 1 }; }
  const earned = rollEarnDay(p, Date.now());
  const res = dampen.applyTuVi(p.realm, p.tier, amount, earned.tuvi);
  Q.addTuVi.run(res.gained, id);
  Q.bumpTuViToday.run(amount, id); // tích lũy RAW (đo "nỗ lực farm" để xác định mức loãng)
  return res;
}

// Cộng tu vi KHÔNG nerf (thưởng cốt truyện/nhiệm vụ/đan/admin — milestone, không phải spam).
function addTuViRaw(id, amount) {
  Q.addTuVi.run(amount, id);
}

// Áp kết quả đột phá: cập nhật cảnh giới/tầng/tu vi + thưởng linh thạch.
function applyBreakthrough(id, realm, tier, tuVi, stoneReward) {
  Q.applyBreakthrough.run(realm, tier, tuVi, stoneReward, id);
}

// Set lại tu vi (dùng khi độ kiếp thất bại -> mất tu vi).
function setTuVi(id, tuVi) {
  Q.setTuViOnly.run(tuVi, id);
}

function topByStage(limit = 10) {
  return Q.topByStage.all(limit);
}

function topByStones(limit = 10) {
  return Q.topByStones.all(limit);
}

// Hạng của 1 người theo cảnh giới (1 = cao nhất).
function rankOf(p) {
  const r = Q.rankOf.get(p.realm, p.realm, p.tier, p.realm, p.tier, p.tu_vi);
  return r.n + 1;
}

// Cộng linh thạch TỪ FARM (có nerf Linh Khí Loãng). Trả meta { raw, gained, damp }.
//  Số <=0 (chi tiêu/trừ) đi thẳng không nerf. Dùng addStonesRaw cho thưởng milestone/admin.
function addStones(id, amount) {
  if (amount <= 0) { Q.addStones.run(amount, id); return { raw: amount, gained: amount, damp: 1 }; }
  const p = Q.get.get(id);
  if (!p) { Q.addStones.run(amount, id); return { raw: amount, gained: amount, damp: 1 }; }
  const earned = rollEarnDay(p, Date.now());
  const res = dampen.applyStones(p.realm, p.tier, amount, earned.stones);
  Q.addStones.run(res.gained, id);
  Q.bumpStonesToday.run(amount, id);
  return res;
}

// Cộng linh thạch KHÔNG nerf (thưởng cốt truyện/nhiệm vụ/admin/hoàn tiền).
function addStonesRaw(id, amount) {
  Q.addStones.run(amount, id);
}

// --- BÍ CẢNH: bền hóa lượt thám hiểm đang dở (sống sót qua restart) ---
function setBicanhRun(id, run) {
  Q.setBicanhRun.run(run ? JSON.stringify(run) : null, id);
}
function getBicanhRun(player) {
  if (!player || !player.bicanh_run) return null;
  try { return JSON.parse(player.bicanh_run); } catch (_) { return null; }
}
function clearBicanhRun(id) {
  Q.setBicanhRun.run(null, id);
}

// --- VOICE: bộ đếm phút/ngày bền (chống lách trần khi bot restart) ---
//  Tính thêm `minutes` phút voice cho hôm `dayKey`, tôn trọng trần `cap`.
//  Trả số phút THỰC được tính (0 nếu đã chạm trần). Reset khi sang ngày mới.
function bumpVoiceMinutes(id, dayKey, minutes, cap) {
  const p = Q.get.get(id);
  if (!p) return 0;
  const used = p.voice_day === dayKey ? (p.voice_used || 0) : 0;
  const limit = cap == null ? Infinity : cap;
  const credit = Math.min(minutes, Math.max(0, limit - used));
  if (credit <= 0) {
    if (p.voice_day !== dayKey) Q.setVoiceDaily.run(dayKey, 0, id); // sang ngày mới: reset mốc
    return 0;
  }
  Q.setVoiceDaily.run(dayKey, used + credit, id);
  return credit;
}

// Trạng thái Linh Khí Loãng để hiển thị (UI): còn lại bao nhiêu trong ngưỡng, hệ số kế tiếp.
function earnState(player, now) {
  const earned = (player && player.earn_day === quests.dayKey(now ?? Date.now()))
    ? { tuvi: player.tuvi_today || 0, stones: player.stones_today || 0 }
    : { tuvi: 0, stones: 0 };
  const tuViThr = dampen.tuViThreshold(player.realm, player.tier);
  const stonesThr = dampen.stonesThreshold(player.realm, player.tier);
  return {
    tuviToday: earned.tuvi,
    stonesToday: earned.stones,
    tuViThreshold: tuViThr,
    stonesThreshold: stonesThr,
    tuViMult: dampen.bracketMult(earned.tuvi, tuViThr, config.dampen.brackets),
    stonesMult: dampen.bracketMult(earned.stones, stonesThr, config.dampen.brackets),
    bottleneck: dampen.bottleneckMult(player.realm, player.tier) < 1,
  };
}

// =====================================================================
//  ĐẤU PHÁP (PvP) — điểm ELO + ghép cặp + ghi kết quả
// =====================================================================
// Trạng thái đấu pháp của 1 người (mặc định an toàn nếu cột chưa có giá trị).
function getPvp(player) {
  return {
    rating: player && player.pvp_rating != null ? player.pvp_rating : pvp.START_RATING,
    wins: (player && player.pvp_wins) || 0,
    losses: (player && player.pvp_losses) || 0,
    ts: (player && player.pvp_ts) || 0,
  };
}
// Ứng viên đối thủ gần điểm nhất (đã có phái, đủ cảnh giới). Command tự lọc/chọn.
function findPvpOpponents(meId, rating, minRealm, limit) {
  return Q.findPvpOpps.all(meId, minRealm, rating, limit || config.pvp.matchPool);
}
// Ghi kết quả 1 trận (atomic). meScore: 1 thắng / 0.5 hòa / 0 thua. oppId=null => NPC
//  (chỉ cập nhật điểm của mình, đối thủ NPC coi như cùng điểm). Cooldown đã được
//  đặt LÚC VÀO trận (setPvpTs) nên hàm này KHÔNG động vào pvp_ts.
//  Trả { me:{old,new,delta,wins,losses}, opp:{old,new,delta}|null }.
function recordPvpMatch(meId, oppId, meScore) {
  const me = getPlayer(meId);
  if (!me) return null;
  const meR = me.pvp_rating != null ? me.pvp_rating : pvp.START_RATING;
  const opp = oppId ? getPlayer(oppId) : null;
  // Đối thủ NPC (đài chủ) coi như điểm CỐ ĐỊNH = mốc khởi điểm: thắng NPC khi
  //  đã lên cao thì gần như không cộng điểm (chống cày điểm trên đài chủ vô hạn),
  //  leo hạng thật vẫn phải thắng người chơi thật.
  const oppR = opp ? (opp.pvp_rating != null ? opp.pvp_rating : pvp.START_RATING) : pvp.START_RATING;
  const meDelta = pvp.eloDelta(meR, oppR, meScore);
  const meNew = Math.max(0, meR + meDelta);
  const meWins = (me.pvp_wins || 0) + (meScore === 1 ? 1 : 0);
  const meLosses = (me.pvp_losses || 0) + (meScore === 0 ? 1 : 0);

  let oppOut = null;
  const tx = db.transaction(() => {
    Q.setPvp.run(meNew, meWins, meLosses, meId);
    if (opp) {
      const oppScore = 1 - meScore;
      const oppDelta = pvp.eloDelta(oppR, meR, oppScore);
      const oppNew = Math.max(0, oppR + oppDelta);
      const oppWins = (opp.pvp_wins || 0) + (oppScore === 1 ? 1 : 0);
      const oppLosses = (opp.pvp_losses || 0) + (oppScore === 0 ? 1 : 0);
      Q.setPvpOpp.run(oppNew, oppWins, oppLosses, oppId);
      oppOut = { old: oppR, new: oppNew, delta: oppDelta };
    }
  });
  tx();
  return {
    me: { old: meR, new: meNew, delta: meDelta, wins: meWins, losses: meLosses },
    opp: oppOut,
  };
}
function topByPvp(limit = 10) {
  return Q.topByPvp.all(limit);
}
// Đặt mốc cooldown PvP (gọi lúc BẮT ĐẦU trận đánh tay -> bỏ trận giữa chừng vẫn tốn cooldown).
function setPvpTs(id, ts) {
  Q.setPvpTs.run(ts, id);
}

// =====================================================================
//  QUẢN TRỊ (admin) — sửa trực tiếp dữ liệu tu sĩ. Gọi từ /quantri.
// =====================================================================
// Set cảnh giới/tầng (reset tu vi về 0 để tránh dư thừa quá ngưỡng bậc mới).
function adminSetStage(id, realm, tier) { Q.adminSetStage.run(realm, tier, id); }
// Set điểm đấu PvP (tuyệt đối).
function adminSetPvpRating(id, rating) { Q.adminSetPvpRating.run(Math.max(0, Math.round(rating)), id); }
// Reset mọi cooldown hành động (không đụng bế quan / tích Linh Điền đang chạy).
function adminResetCooldowns(id) { Q.adminResetCd.run(id); }
// Xóa hẳn tu sĩ khỏi DB (cả tiến độ cốt truyện). Không thể hoàn tác.
function adminDeletePlayer(id) {
  const tx = db.transaction(() => {
    Q.adminDelStory.run(id);
    Q.adminDelPlayer.run(id);
  });
  tx();
}

// --- Môn phái ---
// Lấy mảng id chiêu đang trang bị (parse JSON an toàn).
function getEquipped(player) {
  if (!player || !player.skills_equipped) return [];
  try { const a = JSON.parse(player.skills_equipped); return Array.isArray(a) ? a : []; }
  catch (_) { return []; }
}
// Đổi phái (tức thì): set phái + loadout mặc định + mốc bậc gia nhập + xóa nguyện vọng.
//  joinStage = globalStage lúc đổi (để tính buff chiêu theo bậc kể từ khi vào phái mới).
//  Người đổi phái đã dày dạn -> mở HẾT chiêu cơ bản (sect_quest_stage = TOTAL) và
//  được tặng luôn cả bộ trang bị nhập môn của phái mới.
function setSect(id, sectId, loadout, joinStage = 0) {
  const p = getPlayer(id);
  const prevSect = p ? p.sect : null; // phái đang ở -> thành "phái cũ" sau khi đổi
  const now = Date.now();
  const fullGear = equipment.setFor(sectId).map((it) => it.id);
  const tx = db.transaction(() => {
    Q.setSect.run(sectId, JSON.stringify(loadout || []), new Date().toISOString(), joinStage, sectquest.TOTAL, id);
    Q.setEquipment.run(JSON.stringify(fullGear), id);
    Q.setSectSwitch.run(prevSect || null, now, id); // ghi phái cũ + mốc đổi (khóa + về free)
  });
  tx();
}
// Đổi loadout chiêu chủ động.
function setEquipped(id, loadout) {
  Q.setEquipped.run(JSON.stringify(loadout || []), id);
}
// Đếm số đệ tử của 1 phái.
function countSect(sectId) {
  return Q.countSect.get(sectId).n;
}

// --- Bí Cảnh: nguyên liệu (túi đồ) + cooldown vào bí cảnh ---
// Lấy túi nguyên liệu dạng object { matId: qty } (parse JSON an toàn).
function getMaterials(player) {
  if (!player || !player.materials) return {};
  try { const o = JSON.parse(player.materials); return o && typeof o === 'object' ? o : {}; }
  catch (_) { return {}; }
}
// Cộng/trừ nguyên liệu theo delta { matId: qty }. Đọc-sửa-ghi (better-sqlite3 đồng bộ).
//  qty âm để tiêu hao; xóa hẳn key khi về <= 0.
function addMaterials(id, delta) {
  if (!delta) return;
  const p = getPlayer(id);
  if (!p) return;
  const bag = getMaterials(p);
  for (const [k, v] of Object.entries(delta)) {
    bag[k] = (bag[k] || 0) + v;
    if (bag[k] <= 0) delete bag[k];
  }
  Q.setMaterials.run(JSON.stringify(bag), id);
}
// Ghi mốc vào bí cảnh (cooldown).
function setBicanhTs(id, ts) {
  Q.setBicanhTs.run(ts, id);
}
// Tầng sâu nhất đã đạt mỗi vùng { zoneId: floor } (cho chức năng Quét).
function getBicanhBest(player) {
  if (!player || !player.bicanh_best) return {};
  try { const o = JSON.parse(player.bicanh_best); return o && typeof o === 'object' ? o : {}; }
  catch (_) { return {}; }
}
// Cập nhật kỷ lục tầng vùng nếu floor sâu hơn. Trả true nếu phá kỷ lục.
function updateBicanhBest(id, zoneId, floor) {
  const p = getPlayer(id);
  if (!p) return false;
  const best = getBicanhBest(p);
  if ((best[zoneId] || 0) >= floor) return false;
  best[zoneId] = floor;
  Q.setBicanhBest.run(JSON.stringify(best), id);
  return true;
}

// --- Khu farm: chỉ lưu mốc thời gian + kỷ lục (logic ở farm.js, thưởng ở lệnh) ---
function setLinhDienTs(id, ts) { Q.setLinhDienTs.run(ts, id); }
// GIEO Linh Điền: tiêu hạt 🌰 Linh Chủng trong túi, đặt mốc gieo + số hạt (atomic).
//  wantSeeds = số hạt muốn gieo. Trả { ok, seeds } hoặc { err:'occupied'|'noseeds' }.
function plantLinhDien(id, wantSeeds, now = Date.now()) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  if (p.linhdien_ts && (p.linhdien_seeds || 0) > 0) return { err: 'occupied' }; // ruộng đang có cây
  const cfg = config.farm.linhDien;
  const seedId = cfg.seedId || 'linh_chung';
  const have = getMaterials(p)[seedId] || 0;
  const seeds = Math.min(Math.max(0, wantSeeds | 0), have, cfg.maxPlots || 12);
  if (seeds <= 0) return { err: 'noseeds', have };
  const tx = db.transaction(() => {
    addMaterials(id, { [seedId]: -seeds }); // tiêu hạt
    Q.setLinhDienPlot.run(now, seeds, id);
  });
  tx();
  return { ok: true, seeds };
}
// THU HOẠCH Linh Điền: nếu đã chín thì cộng nguyên liệu + dọn ruộng. Trả { ok, mats, seeds } | { err }.
function harvestLinhDien(id, now = Date.now()) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const st = farm.linhDienState(p.linhdien_ts, p.linhdien_seeds, now);
  if (!st.planted) return { err: 'empty' };
  if (!st.ready) return { err: 'growing', leftMs: st.leftMs };
  const mats = farm.linhDienYield(st.seeds);
  const tx = db.transaction(() => {
    addMaterials(id, mats);
    Q.setLinhDienPlot.run(0, 0, id); // dọn ruộng
  });
  tx();
  return { ok: true, mats, seeds: st.seeds };
}
function setSanYeuTs(id, ts) { Q.setSanYeuTs.run(ts, id); }
function setTowerTs(id, ts) { Q.setTowerTs.run(ts, id); }
function setTowerBest(id, floor) { Q.setTowerBest.run(floor, id); }

// =====================================================================
//  LUYỆN ĐAN: túi đan dược + chế đan (tiêu nguyên liệu) + dùng đan
// =====================================================================
// Túi đan dược dạng { pillId: qty } (parse JSON an toàn).
function getPills(player) {
  if (!player || !player.pills) return {};
  try { const o = JSON.parse(player.pills); return o && typeof o === 'object' ? o : {}; }
  catch (_) { return {}; }
}
// Cộng/trừ đan theo delta { pillId: qty } (đọc-sửa-ghi). Xóa key khi về <= 0.
function addPills(id, delta) {
  if (!delta) return;
  const p = getPlayer(id);
  if (!p) return;
  const bag = getPills(p);
  for (const [k, v] of Object.entries(delta)) {
    bag[k] = (bag[k] || 0) + v;
    if (bag[k] <= 0) delete bag[k];
  }
  Q.setPills.run(JSON.stringify(bag), id);
}

// Đủ nguyên liệu cho 1 đan phương chưa? Trả true/false.
function hasMaterialsFor(bag, cost) {
  for (const [m, q] of Object.entries(cost || {})) if ((bag[m] || 0) < q) return false;
  return true;
}

// Luyện 1 mẻ đan. Atomic: kiểm cảnh giới + nguyên liệu + linh thạch -> tiêu hao ->
//  tung tỉ lệ thành công. THÀNH CÔNG: +đan vào túi. THẤT BẠI: vẫn mất nguyên liệu
//  & linh thạch (luyện đan có rủi ro). Trả { ok, success, pillId, yield, rate } | { err }.
function craftPill(id, pillId) {
  const recipe = alchemy.recipeInfo(pillId);
  const pill = alchemy.pillInfo(pillId);
  if (!recipe || !pill) return { err: 'invalid' };
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  if (p.realm < recipe.minRealm) return { err: 'locked', needRealm: recipe.minRealm };
  const bag = getMaterials(p);
  if (!hasMaterialsFor(bag, recipe.cost)) return { err: 'nomats' };
  if (p.stones < (recipe.stoneCost || 0)) return { err: 'nostones', cost: recipe.stoneCost || 0 };

  const rate = alchemy.craftSuccessRate(pillId, p.realm);
  const success = Math.random() < rate;
  const pillsBag = getPills(p);

  const tx = db.transaction(() => {
    // Tiêu nguyên liệu + linh thạch (dù thành hay bại).
    const matBag = getMaterials(p);
    for (const [m, q] of Object.entries(recipe.cost)) {
      matBag[m] = (matBag[m] || 0) - q;
      if (matBag[m] <= 0) delete matBag[m];
    }
    Q.setMaterials.run(JSON.stringify(matBag), id);
    if (recipe.stoneCost > 0) Q.addStones.run(-recipe.stoneCost, id);
    if (success) {
      pillsBag[pillId] = (pillsBag[pillId] || 0) + (recipe.yield || 1);
      Q.setPills.run(JSON.stringify(pillsBag), id);
    }
  });
  tx();
  return { ok: true, success, pillId, yield: recipe.yield || 1, rate };
}

// Dùng 1 đan loại 'tuvi' (uống tức thì +tu vi theo % tu vi cần). Trả { ok, amount } | { err }.
function useTuViPill(id, pillId) {
  const pill = alchemy.pillInfo(pillId);
  if (!pill || pill.kind !== 'tuvi') return { err: 'invalid' };
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  if (cult.isMaxed(p.realm, p.tier)) return { err: 'maxed' };
  const bag = getPills(p);
  if ((bag[pillId] || 0) <= 0) return { err: 'none' };
  const amount = Math.max(1, Math.round(cult.tuViNeeded(p.realm, p.tier) * pill.pctNeed));
  const tx = db.transaction(() => {
    bag[pillId] -= 1;
    if (bag[pillId] <= 0) delete bag[pillId];
    Q.setPills.run(JSON.stringify(bag), id);
    Q.addTuVi.run(amount, id);
  });
  tx();
  return { ok: true, amount };
}

// Tiêu 1 đan ĐỘ KIẾP mạnh nhất trong túi (gọi ở /dotpha lúc đại đột phá).
//  Trả { pillId, rateBonus } đã tiêu, hoặc null nếu không có đan nào.
function consumeBestTribulationPill(id) {
  const p = getPlayer(id);
  if (!p) return null;
  const bag = getPills(p);
  const best = alchemy.bestTribulationPill(bag);
  if (!best) return null;
  bag[best.id] -= 1;
  if (bag[best.id] <= 0) delete bag[best.id];
  Q.setPills.run(JSON.stringify(bag), id);
  return best;
}

// =====================================================================
//  THUỘC TÍNH GỐC
// =====================================================================
function getAttributes(player) {
  const base = attributes.emptyAttrs();
  if (!player || !player.attributes) return base;
  try {
    const o = JSON.parse(player.attributes);
    if (o && typeof o === 'object') for (const k of Object.keys(base)) base[k] = o[k] || 0;
  } catch (_) {}
  return base;
}
function addAttrPoints(id, n) { Q.addAttrPoints.run(n, id); }
// Cộng n điểm vào 1 thuộc tính (trừ quỹ). Trả { ok } hoặc { err }.
function allocateAttr(id, key, n = 1) {
  if (!attributes.isAttr(key) || n <= 0) return { err: 'invalid' };
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  if ((p.attr_points || 0) < n) return { err: 'nopoints' };
  const a = getAttributes(p);
  a[key] = (a[key] || 0) + n;
  Q.setAttributes.run(JSON.stringify(a), p.attr_points - n, id);
  return { ok: true };
}
// Rửa điểm: trả hết về quỹ, tốn linh thạch. Trả { ok, refunded } hoặc { err }.
function respecAttrs(id) {
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  const a = getAttributes(p);
  const spent = Object.values(a).reduce((s, v) => s + (v || 0), 0);
  if (spent <= 0) return { err: 'empty' };
  const cost = config.attributes.respecCost || 0;
  if (p.stones < cost) return { err: 'nostones', cost };
  const tx = db.transaction(() => {
    if (cost > 0) Q.addStones.run(-cost, id);
    Q.setAttributes.run(JSON.stringify(attributes.emptyAttrs()), (p.attr_points || 0) + spent, id);
  });
  tx();
  return { ok: true, refunded: spent };
}

// =====================================================================
//  CẤP CHIÊU (nâng qua độ kiếp)
// =====================================================================
function getSkillLevels(player) {
  if (!player || !player.skill_levels) return {};
  try { const o = JSON.parse(player.skill_levels); return o && typeof o === 'object' ? o : {}; }
  catch (_) { return {}; }
}
function getSkillLevel(player, skillId) { return getSkillLevels(player)[skillId] || 0; }
function addSkillPoints(id, n) { Q.addSkillPoints.run(n, id); }
// Nâng 1 cấp chiêu. Validate: thuộc phái mình, đã mở khóa, chưa max, đủ điểm (+linh thạch nếu cấu hình).
function upgradeSkill(id, skillId) {
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  const sk = skills.getSkill(skillId);
  if (!sk || sk.kind !== 'active') return { err: 'invalid' };
  if (!p.sect || sk.sect !== p.sect) return { err: 'notyours' };
  if (p.realm < skills.unlockRealmOf(sk)) return { err: 'locked' };
  const lvls = getSkillLevels(p);
  const cur = lvls[skillId] || 0;
  const max = config.skills.maxLevel || 0;
  if (cur >= max) return { err: 'maxed' };
  if ((p.skill_points || 0) < 1) return { err: 'nopoints' };
  const stoneCost = (config.skills.upgradeStoneCost || 0) * (cur + 1);
  if (stoneCost > 0 && p.stones < stoneCost) return { err: 'nostones', cost: stoneCost };
  lvls[skillId] = cur + 1;
  const tx = db.transaction(() => {
    if (stoneCost > 0) Q.addStones.run(-stoneCost, id);
    Q.setSkillUpgrade.run(JSON.stringify(lvls), (p.skill_points || 0) - 1, id);
  });
  tx();
  return { ok: true, level: cur + 1 };
}

// =====================================================================
//  GIA NHẬP PHÁI QUA NHIỆM VỤ
// =====================================================================
function setPendingSect(id, sectId) { Q.setPendingSect.run(sectId, id); }
// Chính thức vào phái (idempotent): đã có sect thì bỏ qua; chưa có pending thì lỗi.
function finalizeSect(id) {
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  if (p.sect) return { ok: true, already: true };
  const sectId = p.pending_sect;
  const sect = sectId && sects.getSect(sectId);
  if (!sect) return { err: 'nopending' };
  const stage = cult.globalStage(p.realm, p.tier);
  // Vào phái: chỉ trang bị CHIÊU CƠ BẢN ĐẦU TIÊN; 2 chiêu còn lại mở dần qua
  //  chuỗi nhiệm vụ nhập môn (sect_quest_stage bắt đầu = 0).
  const startLoadout = sect.defaultLoadout && sect.defaultLoadout.length ? [sect.defaultLoadout[0]] : [];
  Q.finalizeSect.run(sectId, JSON.stringify(startLoadout), new Date().toISOString(), stage, id);
  return { ok: true, sect };
}

// =====================================================================
//  TRANG BỊ + CHUỖI NHIỆM VỤ NHẬP MÔN
// =====================================================================
// Mảng id trang bị đang sở hữu/mặc (parse JSON an toàn).
function getEquipment(player) {
  if (!player || !player.equipment) return [];
  try { const a = JSON.parse(player.equipment); return Array.isArray(a) ? a : []; }
  catch (_) { return []; }
}
// Trao 1 món trang bị (không trùng lặp).
function grantEquipItem(id, itemId) {
  const p = getPlayer(id);
  if (!p) return;
  const cur = getEquipment(p);
  if (cur.includes(itemId)) return;
  cur.push(itemId);
  Q.setEquipment.run(JSON.stringify(cur), id);
}
// Map bậc cường hóa đồ nhập môn { itemId: level } (parse JSON an toàn).
function getEquipEnh(player) {
  if (!player || !player.equip_enh) return {};
  try { const o = JSON.parse(player.equip_enh); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; }
}
// Cường hóa 1 món ĐỒ NHẬP MÔN (cùng cơ chế gear 6 ô: linh thạch + 🔩 Tinh Thiết, tỉ
//  lệ, max +15; trượt KHÔNG tụt cấp). { ok, success, level, cost } | { err }.
function enhanceSectItem(id, itemId) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  if (!getEquipment(p).includes(itemId)) return { err: 'notowned' };
  const enhMap = getEquipEnh(p);
  const level = enhMap[itemId] || 0;
  const pseudo = { e: level, st: cult.globalStage(p.realm, p.tier) }; // st để cost scale theo bậc
  if (!gear.canEnhance(pseudo)) return { err: 'maxed' };
  const cost = gear.enhanceCost(pseudo);
  if (p.stones < cost.stones) return { err: 'nostones', cost };
  if ((p.refine || 0) < cost.refine) return { err: 'norefine', cost };
  const success = Math.random() < gear.enhanceRate(pseudo);
  if (success) enhMap[itemId] = level + 1;
  const tx = db.transaction(() => {
    Q.addStones.run(-cost.stones, id);
    Q.setRefine.run((p.refine || 0) - cost.refine, id);
    Q.setEquipEnh.run(JSON.stringify(enhMap), id);
  });
  tx();
  return { ok: true, success, level: enhMap[itemId] || level, cost };
}
// =====================================================================
//  COMBATANT HIỆU DỤNG + GỘP BONUS TRANG BỊ (nguồn dùng chung)
//  Gộp trang bị NHẬP MÔN (equipment.js) + TRANG BỊ ĐẦY ĐỦ đang mặc (gear.js)
//  -> 1 object bonus phẳng cho combat.build (thay 6 chỗ gọi rời rạc trước đây).
// =====================================================================
function stagesSinceJoinOf(p) {
  return Math.max(0, cult.globalStage(p.realm, p.tier) - (p.sect_join_stage || 0));
}
// Bonus trang bị gộp (nhập môn + gear mặc + DANH HIỆU đang đeo). Cộng PHẲNG
//  -> không phá cân bằng phái. Danh hiệu chỉ thêm chút buff (xem titles.js).
function combatGearBonus(player) {
  const a = equipment.gearBonus(getEquipment(player), getEquipEnh(player)); // bộ nhập môn (+cường hóa)
  const b = gear.sumBonus(getEquippedItems(player), player.sect); // gear đầy đủ (+tứ tính nếu hợp phái)
  const t = titles.combatBonus(player.title); // buff danh hiệu đang đeo ({} nếu không có)
  const out = {};
  for (const k of ['hp', 'atk', 'def', 'spd', 'mp', 'crit', 'dodge', 'critDmg']) out[k] = (a[k] || 0) + (b[k] || 0) + (t[k] || 0);
  return out;
}
// Dựng combatant hiệu dụng của 1 người (đầy đủ thuộc tính/cấp chiêu/trang bị gộp).
function buildCombatant(player, name) {
  return combat.build(name || player.username, player.realm, player.tier, player.sect, getEquipped(player), {
    attrs: getAttributes(player),
    skillLevels: getSkillLevels(player),
    stagesSinceJoin: stagesSinceJoinOf(player),
    gearBonus: combatGearBonus(player),
  });
}

// =====================================================================
//  SINH MỆNH NGOÀI TRẬN (HP bền + hồi máu lười + trọng thương)
// =====================================================================
// maxHp Sinh Mệnh = Sinh Lực combat hiệu dụng.
function vitMax(player) { return buildCombatant(player).maxHp; }
// Trạng thái sinh mệnh hiện tại (đã hồi theo thời gian; KHÔNG ghi DB).
function getVit(player, now = Date.now()) {
  const max = vitMax(player);
  return health.state(player.vit_cur, max, player.vit_ts, now);
}
// Trừ máu (thua/thắng PvE, công phạt boss). Ghi máu đã hồi tới `now` rồi trừ. Trả state mới.
function spendVit(id, amount, now = Date.now()) {
  const p = getPlayer(id); if (!p) return null;
  const st = getVit(p, now);
  const next = Math.max(0, st.cur - Math.max(0, Math.round(amount)));
  Q.setVit.run(next, now, id);
  return getVit(getPlayer(id), now);
}
// Hồi máu (đan/thời gian thủ công). amount='full' để hồi đầy. Trả state mới.
function healVit(id, amount, now = Date.now()) {
  const p = getPlayer(id); if (!p) return null;
  const st = getVit(p, now);
  const next = amount === 'full' ? st.max : Math.min(st.max, st.cur + Math.max(0, Math.round(amount)));
  Q.setVit.run(next, now, id);
  return getVit(getPlayer(id), now);
}
// THUA PvE -> trọng thương; THẮNG -> hao nhẹ. Trả state mới.
function vitFromLoss(id, now = Date.now()) {
  const p = getPlayer(id); if (!p) return null;
  return spendVit(id, health.lossWound(vitMax(p)), now);
}
function vitFromWin(id, now = Date.now()) {
  const p = getPlayer(id); if (!p) return null;
  return spendVit(id, health.winWear(vitMax(p)), now);
}
// Liệu Thương: tốn linh thạch hồi đầy tức thì. { ok | err, cost }.
function restHeal(id, now = Date.now()) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const st = getVit(p, now);
  if (st.full) return { err: 'full' };
  const cost = health.restCost(p.realm, p.tier);
  if (p.stones < cost) return { err: 'nostones', cost };
  const tx = db.transaction(() => { Q.addStones.run(-cost, id); Q.setVit.run(st.max, now, id); });
  tx();
  return { ok: true, cost, state: getVit(getPlayer(id), now) };
}

// =====================================================================
//  HỆ TRANG BỊ ĐẦY ĐỦ (kho + mặc + cường hóa + phân giải)
// =====================================================================
function getGearInv(player) {
  if (!player || !player.gear_inv) return [];
  try { const a = JSON.parse(player.gear_inv); return Array.isArray(a) ? a : []; } catch (_) { return []; }
}
function getGearEquipped(player) {
  if (!player || !player.gear_equipped) return {};
  try { const o = JSON.parse(player.gear_equipped); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; }
}
// Danh sách instance ĐANG MẶC (resolve uid từ kho).
function getEquippedItems(player) {
  const map = getGearEquipped(player);
  const inv = getGearInv(player);
  const byU = new Map(inv.map((it) => [it.u, it]));
  const out = [];
  for (const slot of gear.SLOT_KEYS) { const u = map[slot]; if (u && byU.has(u)) out.push(byU.get(u)); }
  return out;
}
function getRefine(player) { return player ? (player.refine || 0) : 0; }
function addRefine(id, n) {
  const p = getPlayer(id); if (!p) return;
  Q.setRefine.run(Math.max(0, (p.refine || 0) + n), id);
}
// Nhập 1 món vào kho (gán uid). Kho đầy -> tự phân giải lấy Tinh Thiết. Trả { item } | { salvaged, refine }.
function addGearItem(id, item) {
  const p = getPlayer(id); if (!p) return null;
  const inv = getGearInv(p);
  const cap = (config.gear && config.gear.invMax) || 60;
  if (inv.length >= cap) {
    const r = gear.salvageYield(item);
    addRefine(id, r);
    return { salvaged: true, refine: r, item };
  }
  const uid = (p.gear_uid || 0) + 1;
  const it = { ...item, u: 'g' + uid };
  inv.push(it);
  const tx = db.transaction(() => { Q.setGearInv.run(JSON.stringify(inv), id); Q.setGearUid.run(uid, id); });
  tx();
  return { item: it };
}
// =====================================================================
//  TIỀN CAO CẤP (Tiên Ngọc) · VÉ ĐỔI GIỚI TÍNH · LƯỢT PHÓ BẢN · DANH HIỆU
// =====================================================================

// Cộng/Trừ Tiên Ngọc (luôn raw — KHÔNG dính nerf Linh Khí Loãng vì là tiền cao cấp).
function addPremium(id, n) {
  if (!n) return;
  Q.addPremium.run(n, id);
}
function getPremium(id) {
  const p = getPlayer(id); return p ? (p.premium || 0) : 0;
}
// Tiêu Tiên Ngọc. Trả { ok } | { err:'nopremium', need }.
function spendPremium(id, cost) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  if ((p.premium || 0) < cost) return { err: 'nopremium', need: cost };
  Q.addPremium.run(-cost, id);
  return { ok: true };
}

// Vé đổi giới tính.
function addGenderTickets(id, n) { Q.addGenderTickets.run(n, id); }
// Dùng 1 vé đổi giới tính: đổi nam<->nữ, trừ 1 vé. Trả { ok, gender } | { err:'noticket' }.
function useGenderTicket(id) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  if ((p.gender_tickets || 0) < 1) return { err: 'noticket' };
  const g = p.gender === 'nu' ? 'nam' : 'nu';
  const tx = db.transaction(() => { Q.setGender.run(g, id); Q.addGenderTickets.run(-1, id); });
  tx();
  return { ok: true, gender: g };
}

// --- Phó bản tổ đội: lượt/ngày (chống spam) ---
//  Đảm bảo bộ đếm khớp NGÀY hiện tại (reset nếu sang ngày mới). Trả số lượt ĐÃ dùng hôm nay.
function partyAttemptsUsed(player, now) {
  const today = quests.dayKey(now ?? Date.now());
  if (!player) return 0;
  if (player.party_day !== today) { Q.resetPartyDay.run(today, player.discord_id); return 0; }
  return player.party_attempts || 0;
}
// Còn lượt phó bản không? (so với config.party.dailyAttempts)
function partyAttemptsLeft(id, now) {
  const p = getPlayer(id); if (!p) return 0;
  const cap = (config.party && config.party.dailyAttempts) || Infinity;
  return Math.max(0, cap - partyAttemptsUsed(p, now));
}
// Tiêu 1 lượt phó bản (gọi khi BẮT ĐẦU raid). Trả { ok } | { err:'exhausted' }.
function consumePartyAttempt(id, now) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const cap = (config.party && config.party.dailyAttempts) || Infinity;
  const used = partyAttemptsUsed(p, now); // tự reset nếu sang ngày
  if (used >= cap) return { err: 'exhausted', used, cap };
  Q.bumpPartyAttempt.run(id);
  return { ok: true, used: used + 1, cap };
}

// --- Danh hiệu (cosmetic) ---
function getTitles(player) {
  if (!player || !player.titles) return [];
  try { const a = JSON.parse(player.titles); return Array.isArray(a) ? a : []; } catch (_) { return []; }
}
// Cấp 1 danh hiệu (nếu chưa có). Trả true nếu mới cấp.
function grantTitle(id, titleId) {
  const p = getPlayer(id); if (!p) return false;
  const owned = getTitles(p);
  if (owned.includes(titleId)) return false;
  owned.push(titleId);
  Q.setTitles.run(JSON.stringify(owned), id);
  return true;
}
// Đeo danh hiệu (null = bỏ đeo). Chỉ đeo được nếu đã sở hữu.
function setActiveTitle(id, titleId) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  if (titleId && !getTitles(p).includes(titleId)) return { err: 'notowned' };
  Q.setActiveTitle.run(titleId || null, id);
  return { ok: true };
}

// --- Thành tựu: danh sách id ĐÃ lãnh thưởng (JSON mảng) ---
function getAchievements(player) {
  if (!player || !player.achievements) return [];
  try { const a = JSON.parse(player.achievements); return Array.isArray(a) ? a : []; } catch (_) { return []; }
}
// Đánh dấu ĐÃ lãnh 1 thành tựu (idempotent). Trả true nếu mới đánh dấu.
function markAchievement(id, achId) {
  const p = getPlayer(id); if (!p) return false;
  const done = getAchievements(p);
  if (done.includes(achId)) return false;
  done.push(achId);
  Q.setAchievements.run(JSON.stringify(done), id);
  return true;
}

// Trang bị 1 món theo uid (món cũ cùng ô vẫn ở trong kho).
function equipGear(id, uid) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const it = getGearInv(p).find((x) => x.u === uid);
  if (!it) return { err: 'notfound' };
  const map = getGearEquipped(p);
  map[it.s] = uid;
  Q.setGearEquipped.run(JSON.stringify(map), id);
  return { ok: true, item: it };
}
function unequipGear(id, slot) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const map = getGearEquipped(p);
  if (!map[slot]) return { err: 'empty' };
  delete map[slot];
  Q.setGearEquipped.run(JSON.stringify(map), id);
  return { ok: true };
}
// Cường hóa 1 món (tốn linh thạch + Tinh Thiết). Trượt KHÔNG tụt cấp. { ok, success, level } | { err }.
function enhanceGear(id, uid) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const inv = getGearInv(p);
  const idx = inv.findIndex((x) => x.u === uid);
  if (idx < 0) return { err: 'notfound' };
  const it = inv[idx];
  if (!gear.canEnhance(it)) return { err: 'maxed' };
  const cost = gear.enhanceCost(it);
  if (p.stones < cost.stones) return { err: 'nostones', cost };
  if ((p.refine || 0) < cost.refine) return { err: 'norefine', cost };
  const success = Math.random() < gear.enhanceRate(it);
  if (success) inv[idx] = { ...it, e: (it.e || 0) + 1 };
  const tx = db.transaction(() => {
    Q.addStones.run(-cost.stones, id);
    Q.setRefine.run((p.refine || 0) - cost.refine, id);
    Q.setGearInv.run(JSON.stringify(inv), id);
  });
  tx();
  return { ok: true, success, level: inv[idx].e || 0, cost };
}
// Phân giải 1 món -> Tinh Thiết (gỡ khỏi kho + bỏ mặc nếu đang mặc). { ok, refine } | { err }.
function salvageGear(id, uid) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const inv = getGearInv(p);
  const it = inv.find((x) => x.u === uid);
  if (!it) return { err: 'notfound' };
  const yield_ = gear.salvageYield(it);
  const nextInv = inv.filter((x) => x.u !== uid);
  const map = getGearEquipped(p);
  let changedMap = false;
  for (const [slot, u] of Object.entries(map)) if (u === uid) { delete map[slot]; changedMap = true; }
  const tx = db.transaction(() => {
    Q.setGearInv.run(JSON.stringify(nextInv), id);
    Q.setRefine.run((p.refine || 0) + yield_, id);
    if (changedMap) Q.setGearEquipped.run(JSON.stringify(map), id);
  });
  tx();
  return { ok: true, refine: yield_ };
}

// =====================================================================
//  BOSS THẾ GIỚI (HP chung bền + đóng góp + chia thưởng)
// =====================================================================
function getWorldBoss() { return Q.wbGet.get() || null; }
// Spawn boss mới (xoay vòng catalog theo spawn_n). Trả { boss, row }.
function spawnWorldBoss(now = Date.now()) {
  const prev = getWorldBoss();
  const spawnN = (prev ? prev.spawn_n : 0) + 1;
  const boss = worldboss.bossForSpawn(spawnN - 1);
  const max = worldboss.maxHp(boss);
  const life = (config.worldboss && config.worldboss.lifetimeMs) || 0;
  Q.wbUpsert.run(spawnN, boss.key, max, max, now, now + life);
  return { boss, row: getWorldBoss() };
}
// Công phạt: trừ `dmg` vào HP chung + ghi đóng góp (atomic). Trả { hp, killed, row }.
function dealBossDamage(id, username, dmg, now = Date.now()) {
  const row = getWorldBoss();
  if (!worldboss.isActive(row, now)) return { err: 'inactive' };
  dmg = Math.max(0, Math.round(dmg));
  const newHp = Math.max(0, row.hp - dmg);
  const killed = newHp <= 0;
  const tx = db.transaction(() => {
    Q.wbDmgUpsert.run(row.spawn_n, id, username, dmg, now);
    if (killed) Q.wbKill.run(now); else Q.wbSetHp.run(newHp);
  });
  tx();
  return { hp: newHp, killed, row };
}
function bossContributions(spawnN) { return Q.wbDmgList.all(spawnN); }
function bossDamageOf(spawnN, id) { return Q.wbDmgGet.get(spawnN, id) || null; }
function expireWorldBoss(now = Date.now()) { Q.wbExpire.run(now); }
// Chia thưởng cho mọi người góp sát thương (1 lần/đợt). Trả mảng tóm tắt cho loan báo.
function distributeBossRewards(boss, spawnN) {
  const cur = getWorldBoss();
  if (!cur || cur.distributed) return null; // đã chia / không có
  const list = bossContributions(spawnN);
  const total = list.reduce((s, r) => s + r.damage, 0);
  const pool = worldboss.rewardPool(boss);
  const dropChance = (config.worldboss && config.worldboss.dropChance) || 0;
  const premiumTopN = (config.worldboss && config.worldboss.premiumTopN) || 0;
  const premiumTopReward = (config.worldboss && config.worldboss.premiumTopReward) || 0;
  const out = [];
  const tx = db.transaction(() => {
    list.forEach((r, i) => {
      const isTop = i === 0;
      const share = worldboss.shareFor(r.damage, total, pool, isTop);
      if (share.stones > 0) Q.addStones.run(share.stones, r.discord_id);
      if (share.tuVi > 0) Q.addTuVi.run(share.tuVi, r.discord_id);
      // 🔮 Tiên Ngọc: chỉ TOP-N đóng góp nhận (top-1 gấp đôi) — tiền cao cấp, nhỏ giọt.
      let premium = 0;
      if (premiumTopReward > 0 && i < premiumTopN) {
        premium = isTop ? premiumTopReward * 2 : premiumTopReward;
        Q.addPremium.run(premium, r.discord_id);
      }
      // Rớt trang bị: top-3 chắc chắn; còn lại theo dropChance. Boss -> rarityBoost cao.
      const guaranteed = i < 3;
      let drop = null;
      if (guaranteed || Math.random() < dropChance) {
        const item = gear.rollDrop(boss.realm, boss.tier, { rarityBoost: isTop ? 1.2 : 0.6 });
        const res = addGearItemInTx(r.discord_id, item);
        drop = res;
      }
      out.push({ id: r.discord_id, username: r.username, damage: r.damage, share: share.share, stones: share.stones, tuVi: share.tuVi, drop, premium });
    });
    Q.wbDistributed.run();
  });
  tx();
  return { contributors: out, total, pool };
}
// addGearItem dùng TRONG transaction (không tự mở transaction lồng nhau).
function addGearItemInTx(id, item) {
  const p = getPlayer(id); if (!p) return null;
  const inv = getGearInv(p);
  const cap = (config.gear && config.gear.invMax) || 60;
  if (inv.length >= cap) {
    const r = gear.salvageYield(item);
    Q.setRefine.run((p.refine || 0) + r, id);
    return { salvaged: true, refine: r, item };
  }
  const uid = (p.gear_uid || 0) + 1;
  const it = { ...item, u: 'g' + uid };
  inv.push(it);
  Q.setGearInv.run(JSON.stringify(inv), id);
  Q.setGearUid.run(uid, id);
  return { item: it };
}

// --- PHÙ RÈN (forge_charms): map { charmId: qty }. ---
function getForgeCharms(player) {
  if (!player || !player.forge_charms) return {};
  try { const o = JSON.parse(player.forge_charms); return o && typeof o === 'object' ? o : {}; } catch (_) { return {}; }
}
//  Cộng/trừ phù theo delta { id: qty }. qty âm = tiêu hao; xóa key khi <=0.
function addForgeCharms(id, delta) {
  if (!delta) return;
  const p = getPlayer(id); if (!p) return;
  const bag = getForgeCharms(p);
  for (const [k, v] of Object.entries(delta)) { bag[k] = (bag[k] || 0) + v; if (bag[k] <= 0) delete bag[k]; }
  Q.setForgeCharms.run(JSON.stringify(bag), id);
}
// Kiểm tra đủ nguyên liệu rèn (mats/refine/stones). Trả null nếu đủ, hoặc mã lỗi.
function _checkForgeCost(p, rc) {
  const bag = getMaterials(p);
  for (const [m, q] of Object.entries(rc.mats || {})) if ((bag[m] || 0) < q) return 'mats';
  if ((p.refine || 0) < rc.refine) return 'refine';
  if ((p.stones || 0) < rc.stones) return 'stones';
  return null;
}
// charms = { thien_menh?:bool, ho_khi?:bool } — chỉ DÙNG nếu người chơi đang có phù đó.
function _resolveCharms(p, want) {
  const have = getForgeCharms(p);
  return {
    tm: !!(want && want.thien_menh) && (have.thien_menh || 0) > 0,
    hk: !!(want && want.ho_khi) && (have.ho_khi || 0) > 0,
  };
}

// === ① CHẾ TẠO: tạo món mới theo ô + độ hiếm. THÀNH CÔNG đốt hết + nhận món;
//  THẤT BẠI chỉ mất nguyên liệu+linh thạch, GIỮ Tinh Thiết. (📜 Thiên Mệnh +tỉ lệ.) ===
function forgeCraft(id, slot, rarity, want = {}) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const rc = forge.craftRecipe(rarity); if (!rc) return { err: 'norecipe' };
  if (!gear.SLOT_BY[slot]) return { err: 'noslot' };
  if ((p.realm || 0) < rc.minRealm) return { err: 'realm', need: rc.minRealm };
  const costErr = _checkForgeCost(p, rc); if (costErr) return { err: costErr };
  const c = _resolveCharms(p, want);
  const rate = Math.min(0.99, rc.rate + (c.tm ? forge.THIEN_MENH_BONUS : 0));
  const success = Math.random() < rate;
  const result = { ok: true, success, item: null, salvaged: false, usedTm: false };
  const tx = db.transaction(() => {
    addStonesRaw(id, -rc.stones);
    const neg = {}; for (const [m, q] of Object.entries(rc.mats)) neg[m] = -q;
    addMaterials(id, neg);
    if (c.tm) { addForgeCharms(id, { thien_menh: -1 }); result.usedTm = true; } // Thiên Mệnh: tốn mỗi lần dùng
    if (success) {
      addRefine(id, -rc.refine);
      const item = gear.rollDrop(p.realm, p.tier, { slot, rarity, aff: p.sect || undefined });
      const r = addGearItemInTx(id, item);
      if (r && r.salvaged) { result.salvaged = true; result.refine = r.refine; result.item = r.item; }
      else result.item = r ? r.item : item;
    }
  });
  tx();
  return result;
}

// === ② CƯỜNG HÓA: +1 chỉ số 1 món (uid). Cap theo độ hiếm. Bại ở +4 trở lên có
//  ENH_DROP_CHANCE tụt 1 cấp (🧧 Hộ Khí chặn — chỉ tốn khi thực sự cứu). ===
function forgeEnhance(id, uid, want = {}) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const inv = getGearInv(p);
  const idx = inv.findIndex((x) => x.u === uid);
  if (idx < 0) return { err: 'notfound' };
  const it = inv[idx];
  if (!forge.canEnhance(it)) return { err: 'maxed' };
  const cost = forge.enhanceCost(it);
  if ((p.stones || 0) < cost.stones) return { err: 'stones', cost };
  if ((p.refine || 0) < cost.refine) return { err: 'refine', cost };
  const c = _resolveCharms(p, want);
  const e0 = it.e || 0;
  const rate = Math.min(0.99, forge.enhanceBaseRate(it) + (c.tm ? forge.THIEN_MENH_BONUS : 0));
  const success = Math.random() < rate;
  const result = { ok: true, success, from: e0, to: e0, dropped: false, savedByCharm: false, usedTm: false, cap: forge.enhCap(it.r) };
  const tx = db.transaction(() => {
    Q.addStones.run(-cost.stones, id);
    Q.setRefine.run((p.refine || 0) - cost.refine, id);
    if (c.tm) { addForgeCharms(id, { thien_menh: -1 }); result.usedTm = true; }
    let e = e0;
    if (success) { e = e0 + 1; }
    else if (e0 >= forge.ENH_DROP_FROM && Math.random() < forge.ENH_DROP_CHANCE) {
      if (c.hk) { addForgeCharms(id, { ho_khi: -1 }); result.savedByCharm = true; } // Hộ Khí cứu: tốn 1
      else { e = Math.max(0, e0 - 1); result.dropped = true; }
    }
    result.to = e;
    inv[idx] = { ...it, e };
    Q.setGearInv.run(JSON.stringify(inv), id);
  });
  tx();
  return result;
}

// === ③ NÂNG BẬC: nâng độ hiếm 1 món lên 1 cấp (giữ cấp cường hóa). Bại có
//  UP_DROP_CHANCE tụt 1 bậc (🧧 Hộ Khí chặn; không tụt dưới Phàm). ===
function forgeUpgrade(id, uid, want = {}) {
  const p = getPlayer(id); if (!p) return { err: 'noplayer' };
  const inv = getGearInv(p);
  const idx = inv.findIndex((x) => x.u === uid);
  if (idx < 0) return { err: 'notfound' };
  const it = inv[idx];
  const to = forge.nextRarity(it.r);
  if (!to) return { err: 'maxrarity' };
  const rc = forge.upgradeRecipe(to); if (!rc) return { err: 'norecipe' };
  if ((p.realm || 0) < rc.minRealm) return { err: 'realm', need: rc.minRealm };
  const costErr = _checkForgeCost(p, rc); if (costErr) return { err: costErr };
  const c = _resolveCharms(p, want);
  const fromR = it.r;
  const rate = Math.min(0.99, rc.rate + (c.tm ? forge.THIEN_MENH_BONUS : 0));
  const success = Math.random() < rate;
  const result = { ok: true, success, fromR, toR: fromR, dropped: false, savedByCharm: false, usedTm: false };
  const tx = db.transaction(() => {
    addStonesRaw(id, -rc.stones);
    const neg = {}; for (const [m, q] of Object.entries(rc.mats)) neg[m] = -q;
    addMaterials(id, neg);
    Q.setRefine.run((p.refine || 0) - rc.refine, id);
    if (c.tm) { addForgeCharms(id, { thien_menh: -1 }); result.usedTm = true; }
    let newR = fromR; let newId = it.id; let newE = it.e || 0;
    if (success) {
      newR = to; newId = forge.reRarityId(it.id, to) || it.id;
    } else {
      const down = forge.prevRarity(fromR);
      if (down && Math.random() < forge.UP_DROP_CHANCE) {
        if (c.hk) { addForgeCharms(id, { ho_khi: -1 }); result.savedByCharm = true; }
        else { newR = down; newId = forge.reRarityId(it.id, down) || it.id; newE = Math.min(newE, forge.enhCap(down)); result.dropped = true; }
      }
    }
    result.toR = newR;
    inv[idx] = { ...it, r: newR, id: newId, e: newE, st: gear.rarityRank(newR) * 4 };
    Q.setGearInv.run(JSON.stringify(inv), id);
  });
  tx();
  return result;
}

// Bậc nhiệm vụ nhập môn (số bước đã xong). null = thành viên cũ (mở hết chiêu).
function getSectQuestStage(player) {
  return player ? player.sect_quest_stage : null;
}
// Trạng thái chuỗi nhiệm vụ nhập môn để hiển thị: { stage, progress, total, done, legacy }.
function getSectQuest(player) {
  const stage = player ? player.sect_quest_stage : null;
  const legacy = stage == null;
  return {
    stage: legacy ? sectquest.TOTAL : stage,
    progress: player ? (player.sect_quest_progress || 0) : 0,
    total: sectquest.TOTAL,
    done: legacy || stage >= sectquest.TOTAL,
    legacy,
  };
}
// Cộng tiến độ bước nhập môn HIỆN TẠI nếu khớp type. An toàn gọi ở hook nền.
function addSectQuestProgress(id, type, amount = 1) {
  const p = getPlayer(id);
  if (!p || !p.sect) return;
  const stage = p.sect_quest_stage;
  if (stage == null || stage >= sectquest.TOTAL) return; // cũ / đã xong hết
  const step = sectquest.stepAt(stage);
  if (!step || step.objective.type !== type) return;
  const goal = step.objective.goal || 1;
  const cur = p.sect_quest_progress || 0;
  if (cur >= goal) return;
  Q.setSectQuestProgress.run(Math.min(goal, cur + amount), id);
}
// Lãnh thưởng + sang bước kế (khi bước hiện tại đủ tiến độ).
//  Trả { ok, step, item, stones, tuVi, newStage, allDone } | { err }.
function claimSectQuestStep(id) {
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  if (!p.sect) return { err: 'nosect' };
  const stage = p.sect_quest_stage;
  if (stage == null || stage >= sectquest.TOTAL) return { err: 'done' };
  const step = sectquest.stepAt(stage);
  if (!step) return { err: 'done' };
  const goal = step.objective.goal || 1;
  if ((p.sect_quest_progress || 0) < goal) return { err: 'incomplete' };

  const r = step.reward || {};
  const set = equipment.setFor(p.sect);
  const item = (r.equipIndex != null && set[r.equipIndex]) ? set[r.equipIndex] : null;
  const cur = getEquipment(p);
  if (item && !cur.includes(item.id)) cur.push(item.id);

  const tx = db.transaction(() => {
    Q.setSectQuestAdvance.run(stage + 1, id);
    if (item) Q.setEquipment.run(JSON.stringify(cur), id);
    if (r.stones) Q.addStones.run(r.stones, id);
    if (r.tuVi) Q.addTuVi.run(r.tuVi, id);
  });
  tx();
  return { ok: true, step, item, stones: r.stones || 0, tuVi: r.tuVi || 0, newStage: stage + 1, allDone: stage + 1 >= sectquest.TOTAL };
}

// =====================================================================
//  NHIỆM VỤ HẰNG NGÀY
// =====================================================================
//  Lấy trạng thái nhiệm vụ ngày HÔM NAY (reset nếu khác ngày). nowMs để test.
function getDaily(player, nowMs) {
  const today = quests.dayKey(nowMs);
  let d = { date: today, progress: {}, claimed: {} };
  if (player && player.daily_quests) {
    try {
      const o = JSON.parse(player.daily_quests);
      if (o && o.date === today) d = { date: today, progress: o.progress || {}, claimed: o.claimed || {} };
    } catch (_) {}
  }
  return d;
}
// Cộng tiến độ MỌI nhiệm vụ ngày khớp type (chưa đạt goal). An toàn gọi ở hook nền.
function addDailyProgress(id, type, amount = 1) {
  const p = getPlayer(id);
  if (!p) return;
  const d = getDaily(p);
  let changed = false;
  for (const q of quests.dailies()) {
    if (q.type !== type) continue;
    const cur = d.progress[q.id] || 0;
    if (cur >= q.goal) continue;
    d.progress[q.id] = Math.min(q.goal, cur + amount);
    changed = true;
  }
  if (changed || !p.daily_quests) Q.setDaily.run(JSON.stringify(d), id);
}
// Lãnh thưởng 1 nhiệm vụ ngày. Trả { ok, reward } hoặc { err }.
function claimDaily(id, questId) {
  const q = quests.getQuest(questId);
  if (!q) return { err: 'invalid' };
  const p = getPlayer(id);
  if (!p) return { err: 'noplayer' };
  const d = getDaily(p);
  if ((d.progress[questId] || 0) < q.goal) return { err: 'incomplete' };
  if (d.claimed[questId]) return { err: 'claimed' };
  d.claimed[questId] = true;
  const r = q.reward || {};
  const tx = db.transaction(() => {
    Q.setDaily.run(JSON.stringify(d), id);
    if (r.tuVi) Q.addTuVi.run(r.tuVi, id);
    if (r.stones) Q.addStones.run(r.stones, id);
  });
  tx();
  return { ok: true, reward: r };
}

// =====================================================================
//  PANELS (kênh cố định)
// =====================================================================
function getPanel(key) { return Q.getPanel.get(key); }
function setPanel(key, channelId, messageId) { Q.upsertPanel.run(key, channelId, messageId); }
function allPanels() { return Q.allPanels.all(); }
function deletePanel(key) { Q.delPanel.run(key); }

// =====================================================================
//  CỐT TRUYỆN
// =====================================================================

// Lấy (tạo nếu chưa có) dòng tiến độ cốt truyện của người chơi.
function getStory(id) {
  let row = Q.getStory.get(id);
  if (!row) {
    Q.createStory.run(id, story.firstChapter().id);
    row = Q.getStory.get(id);
  }
  return row;
}

// Set cứng tiến độ cảnh hiện tại (vd hoàn thành mục tiêu 'talk').
function storySetProgress(id, value) {
  getStory(id);
  Q.storySetProgress.run(value, id);
}

// Cảnh hiện tại nếu là TASK (dùng cho nút "Trò chuyện"/"Dâng linh thạch").
function storyTaskScene(id) {
  const row = getStory(id);
  if (row.done) return null;
  const ch = story.getChapter(row.chapter_id);
  const scene = ch ? story.sceneAt(ch, row.scene) : null;
  if (scene && scene.type === 'task') return { row, ch, scene };
  return null;
}

// Hook NỀN: cộng tiến độ nếu cảnh hiện tại là task ĐÚNG type (tuluyen/bequan/dotpha/chat).
//  Gọi an toàn ở bất cứ đâu — không phải task đúng loại thì lặng lẽ bỏ qua.
function addStoryProgress(id, type, amount = 1) {
  const row = Q.getStory.get(id); // KHÔNG auto-create ở hook nền
  if (!row || row.done) return;
  const ch = story.getChapter(row.chapter_id);
  if (!ch) return;
  const scene = story.sceneAt(ch, row.scene);
  if (!scene || scene.type !== 'task' || scene.objective.type !== type) return;
  const goal = scene.objective.goal || 1;
  if (row.progress >= goal) return;
  Q.storySetProgress.run(Math.min(goal, row.progress + amount), id);
}

// Sang cảnh kế. Cộng micro-thưởng của cảnh VỪA RỜI (nếu có). Trả { ok, micro }.
function storyNextScene(id) {
  const row = getStory(id);
  if (row.done) return { ok: false };
  const ch = story.getChapter(row.chapter_id);
  const leaving = ch ? story.sceneAt(ch, row.scene) : null;
  Q.storyAdvance.run(row.scene + 1, id);
  const micro = leaving && leaving.micro ? leaving.micro : null;
  if (micro) {
    if (micro.tuVi) addTuViRaw(id, micro.tuVi);     // thưởng cốt truyện = milestone, không nerf
    if (micro.stones) addStonesRaw(id, micro.stones);
  }
  return { ok: true, micro };
}

// Dâng linh thạch (cảnh task type 'pay_stones'). Trả { short } nếu thiếu.
function storyPayStones(id) {
  const t = storyTaskScene(id);
  if (!t || t.scene.objective.type !== 'pay_stones') return { ok: false };
  const cost = t.scene.objective.cost || 0;
  const p = getPlayer(id);
  if (!p || p.stones < cost) return { short: true, cost };
  if (cost > 0) addStones(id, -cost);
  storySetProgress(id, t.scene.objective.goal || 1);
  return { ok: true };
}

// Lãnh thưởng chương (chỉ khi đã đi hết cảnh). Trả { reward, finishedCh, nextCh, fromRealm }.
function claimStory(id) {
  const row = getStory(id);
  if (row.done) return null;
  const ch = story.getChapter(row.chapter_id);
  if (!ch) return null;
  if (row.scene < story.sceneCount(ch)) return null; // chưa đi hết cảnh

  const reward = ch.reward || {};
  if (reward.tuVi) addTuViRaw(id, reward.tuVi);     // thưởng chương = milestone, không nerf
  if (reward.stones) addStonesRaw(id, reward.stones);

  const next = story.nextChapter(ch.id);
  if (next) Q.storyGoChapter.run(next.id, id);
  else Q.storyFinish.run(id);

  return { reward, finishedCh: ch, nextCh: next };
}

// --- AN TOÀN DỮ LIỆU ---
function checkpoint() {
  try { db.pragma('wal_checkpoint(PASSIVE)'); } catch (_) {}
}
function shutdown() {
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (_) {}
  try { db.close(); } catch (_) {}
}

module.exports = {
  db,
  getPlayer,
  createPlayer,
  touchUsername,
  setCultivate,
  addInsight,
  setSeclusion,
  setSeclusionSession,
  setAutoTrib,
  setNotifiedStage,
  setKyngoTs,
  setGender,
  setCultivateSession,
  clearCultivateSession,
  addTuVi,
  addTuViRaw,
  applyBreakthrough,
  setTuVi,
  topByStage,
  topByStones,
  rankOf,
  addStones,
  addStonesRaw,
  earnState,
  // tiền cao cấp (Tiên Ngọc) · vé giới tính · lượt phó bản · danh hiệu
  addPremium,
  getPremium,
  spendPremium,
  addGenderTickets,
  useGenderTicket,
  partyAttemptsUsed,
  partyAttemptsLeft,
  consumePartyAttempt,
  getTitles,
  grantTitle,
  getAchievements,
  markAchievement,
  getForgeCharms,
  addForgeCharms,
  forgeCraft,
  forgeEnhance,
  forgeUpgrade,
  setActiveTitle,
  setBicanhRun,
  getBicanhRun,
  clearBicanhRun,
  bumpVoiceMinutes,
  // đấu pháp (PvP)
  getPvp,
  findPvpOpponents,
  recordPvpMatch,
  setPvpTs,
  topByPvp,
  // quản trị (admin)
  adminSetStage,
  adminSetPvpRating,
  adminResetCooldowns,
  adminDeletePlayer,
  // combatant hiệu dụng + bonus trang bị gộp
  buildCombatant,
  combatGearBonus,
  stagesSinceJoinOf,
  // sinh mệnh ngoài trận (HP bền)
  vitMax,
  getVit,
  spendVit,
  healVit,
  vitFromLoss,
  vitFromWin,
  restHeal,
  // trang bị đầy đủ
  getGearInv,
  getGearEquipped,
  getEquippedItems,
  getRefine,
  addRefine,
  addGearItem,
  equipGear,
  unequipGear,
  enhanceGear,
  salvageGear,
  // boss thế giới
  getWorldBoss,
  spawnWorldBoss,
  dealBossDamage,
  bossContributions,
  bossDamageOf,
  expireWorldBoss,
  distributeBossRewards,
  // môn phái
  getEquipped,
  setSect,
  setEquipped,
  countSect,
  // bí cảnh
  getMaterials,
  addMaterials,
  setBicanhTs,
  getBicanhBest,
  updateBicanhBest,
  // farm
  setLinhDienTs,
  plantLinhDien,
  harvestLinhDien,
  setSanYeuTs,
  setTowerTs,
  setTowerBest,
  // luyện đan
  getPills,
  addPills,
  craftPill,
  useTuViPill,
  consumeBestTribulationPill,
  // thuộc tính gốc
  getAttributes,
  addAttrPoints,
  allocateAttr,
  respecAttrs,
  // cấp chiêu
  getSkillLevels,
  getSkillLevel,
  addSkillPoints,
  upgradeSkill,
  // gia nhập phái qua nhiệm vụ
  setPendingSect,
  finalizeSect,
  // trang bị + chuỗi nhiệm vụ phái
  getEquipment,
  grantEquipItem,
  getEquipEnh,
  enhanceSectItem,
  getSectQuestStage,
  getSectQuest,
  addSectQuestProgress,
  claimSectQuestStep,
  // nhiệm vụ hằng ngày
  getDaily,
  addDailyProgress,
  claimDaily,
  // panels
  getPanel,
  setPanel,
  allPanels,
  deletePanel,
  // cốt truyện
  getStory,
  storySetProgress,
  storyTaskScene,
  addStoryProgress,
  storyNextScene,
  storyPayStones,
  claimStory,
  checkpoint,
  shutdown,
};
