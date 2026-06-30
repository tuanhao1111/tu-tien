// =====================================================================
//  ENGINE COMBAT THEO LƯỢT (thuần — KHÔNG đụng DB)
//  Dùng chung cho Đấu Tập / PvE (Bí Cảnh) / PvP (Đấu Pháp).
//  - build(): dựng "combatant" từ cảnh giới + môn phái + loadout skill.
//  - resolve(): tự đánh hết trận, trả { winner, log, rounds }.
//
//  Chỉ số gốc theo BẬC TOÀN CỤC (cảnh giới càng cao càng mạnh):
//    Sinh Lực, Công, Phòng, Tốc, Linh Lực.
//  Môn phái thêm bias (đánh đổi) + bị động (mods) + 3 chiêu chủ động.
// =====================================================================
const cult = require('./cultivation');
const sects = require('./sects');
const skillReg = require('./skills');
const attrsLib = require('./attributes');
const config = require('./config');

const R = Math.round;
const rnd = () => Math.random();
const DEF_K_FALLBACK = 150; // dự phòng nếu combatant không có defK (tương thích ngược)

// Hằng giảm trừ Phòng theo BẬC (co giãn để tỉ lệ giảm trừ ổn định ở mọi cảnh giới).
//  dmg *= defK/(defK+def). defK lớn => Phòng cản ít. Xem config.combat.
function defKFor(realm, tier) {
  const c = config.combat || {};
  const s = cult.globalStage(realm, tier);
  return Math.max(1, R((c.defKBase ?? 150) + (c.defKPerStage ?? 0) * s));
}

// --- Chỉ số gốc theo bậc toàn cục ---
function baseStats(realm, tier) {
  const s = cult.globalStage(realm, tier);
  return {
    hp: 150 + s * 26,
    atk: 30 + s * 6,
    def: 15 + s * 3,
    spd: 20 + s * 2,
    mp: 60 + s * 8,
  };
}

// Dựng 1 combatant. equipped = mảng id chiêu chủ động (<=3).
//  opts (TÙY CHỌN): { attrs } — điểm thuộc tính gốc người chơi. Vắng/rỗng =>
//  mọi bonus = 0 => build ra Y HỆT khi chưa có hệ thuộc tính (quái vật, test cũ).
function build(name, realm, tier, sectId, equipped, opts = {}) {
  const { attrs = {}, skillLevels = {}, stagesSinceJoin = 0, gearBonus = {} } = opts;
  const bonus = attrsLib.combatBonus(attrs); // cộng PHẲNG, không bị bias nhân lên
  const gear = gearBonus; // trang bị: cũng cộng PHẲNG (vắng => {} => +0, build y hệt cũ)
  const st = baseStats(realm, tier);
  const sect = sects.getSect(sectId);
  const bias = sect ? sect.bias : {};
  const passive = sect ? sects.passiveOf(sectId) : null;
  const mods = passive && passive.mods ? passive.mods : {};

  let hp = st.hp * (bias.hp || 1) * (mods.hpMult || 1) + bonus.hp + (gear.hp || 0);
  let atk = st.atk * (bias.atk || 1) * (mods.atkMult || 1) + bonus.atk + (gear.atk || 0);
  let def = st.def * (bias.def || 1) * (mods.defMult || 1) + bonus.def + (gear.def || 0);
  let spd = st.spd * (bias.spd || 1) * (mods.spdMult || 1) + bonus.spd + (gear.spd || 0);

  // Loadout: lấy chiêu chủ động hợp lệ (đúng phái không bắt buộc khi test),
  // nếu trống thì dùng loadout mặc định của phái.
  //  - rankFactor: buff TỰ ĐỘNG mỗi bậc kể từ khi gia nhập phái (chỉ người chơi
  //    có stagesSinceJoin>0; quái vật = 0 nên không đổi).
  //  - cấp chiêu (skillLevels): nâng qua độ kiếp -> ×power & dot, giảm hồi chiêu.
  //  Không opts => stagesSinceJoin=0, lv=0 => mult=1 => object chiêu Y HỆT.
  const rankFactor = 1 + (config.skills.perStageBuff || 0) * stagesSinceJoin;
  const step = config.skills.levelPowerStep || 0;
  let ids = Array.isArray(equipped) && equipped.length ? equipped : (sect ? sect.defaultLoadout : []);
  const actives = ids.map((id) => {
    const sk = skillReg.getSkill(id);
    if (!sk || sk.kind !== 'active') return null;
    const lv = skillLevels[id] || 0;
    const mult = (1 + step * lv) * rankFactor;
    const s = { id, ...sk };
    if (s.power) s.power = s.power * mult;
    if (s.dot) s.dot = { ...s.dot, mult: s.dot.mult * mult };
    if (lv > 0 && s.cd) s.cd = Math.max(0, s.cd - Math.floor(lv / 3));
    return s;
  }).filter(Boolean).slice(0, 3);

  return {
    name,
    sectId,
    sectName: sect ? `${sect.emoji} ${sect.name}` : 'Tán Tu',
    defK: defKFor(realm, tier), // hằng giảm trừ Phòng theo bậc của combatant này
    base: { atk: R(atk), def: R(def), spd: R(spd) },
    hp: R(hp), maxHp: R(hp),
    mp: R(st.mp + bonus.mp + (gear.mp || 0)), maxMp: R(st.mp + bonus.mp + (gear.mp || 0)),
    crit: 0.05 + (mods.critChance || 0) + bonus.crit + (gear.crit || 0),
    critDmg: 1.5 + (mods.critDmg || 0) + bonus.critDmg + (gear.critDmg || 0),
    dodge: (mods.dodge || 0) + bonus.dodge + (gear.dodge || 0),
    dmgReduce: mods.dmgReduce || 0,
    reflect: mods.reflectPct || 0,
    lifesteal: mods.lifestealPct || 0,
    regen: mods.regen || 0,
    dotBonus: mods.dotBonus || 0,
    shield: 0,
    statuses: [], // { kind:'dot'|'buff'|'debuff', ... , turns }
    cd: {},
    actives,
    passiveName: passive ? passive.name : null,
  };
}

// Chỉ số hiệu dụng sau buff/debuff.
function eff(c, stat) {
  let v = c.base[stat];
  for (const s of c.statuses) {
    if ((s.kind === 'buff' || s.kind === 'debuff') && s.stat === stat) v *= s.mult;
  }
  return v;
}

// Đầu lượt của 1 combatant: hồi máu/linh lực, đếm DoT, giảm hồi chiêu & thời hạn buff.
function startTurn(c, log) {
  // Hồi linh lực + máu (regen bị động).
  c.mp = Math.min(c.maxMp, c.mp + R(c.maxMp * 0.08));
  if (c.regen > 0 && c.hp > 0) {
    const h = R(c.maxHp * c.regen);
    c.hp = Math.min(c.maxHp, c.hp + h);
    if (h > 0) log.push(`🌿 ${c.name} hồi ${h} máu (hồi phục).`);
  }
  // DoT (thiêu/độc) đặt trên chính mình.
  for (const s of c.statuses) {
    if (s.kind === 'dot') {
      c.hp -= s.dmg;
      log.push(`${s.emoji || '☣️'} ${c.name} chịu ${s.dmg} sát thương ${s.label} (còn ${Math.max(0, c.hp)} máu).`);
    }
  }
  // Giảm thời hạn status + hồi chiêu.
  c.statuses = c.statuses.filter((s) => (s.turns -= 1) > 0);
  for (const k of Object.keys(c.cd)) if (c.cd[k] > 0) c.cd[k] -= 1;
}

// AI chọn hành động: trả skill object hoặc null (đánh thường).
function chooseAction(c, foe) {
  const ready = c.actives.filter((s) => (c.cd[s.id] || 0) <= 0 && c.mp >= (s.mp || 0));
  if (!ready.length) return null;

  // Sắp chết & có chiêu hồi máu -> ưu tiên hồi.
  if (c.hp / c.maxHp < 0.4) {
    const heal = ready.find((s) => s.heal && s.heal > 0);
    if (heal) return heal;
  }
  // Cho điểm: ước lượng sát thương + giá trị phụ trợ. Chọn cao nhất.
  const score = (s) => {
    let v = 0;
    if (s.power) v += s.power * (s.hits || 1) * eff(c, 'atk');
    if (s.dot) v += s.dot.mult * s.dot.turns * eff(c, 'atk') * 0.8;
    if (s.heal) v += s.heal * c.maxHp * (c.hp / c.maxHp < 0.7 ? 1 : 0.2);
    if (s.shield) v += s.shield * c.maxHp * 0.5;
    if (s.buff) v += eff(c, 'atk') * 0.6;
    if (s.debuff) v += eff(c, 'atk') * 0.6;
    return v;
  };
  ready.sort((a, b) => score(b) - score(a));
  return ready[0];
}

// Một đòn đánh đơn. Trả sát thương thực gây ra (sau khiên/giảm/né).
function strike(attacker, target, power, opt, log) {
  // Né tránh.
  if (rnd() < target.dodge) {
    log.push(`💨 ${target.name} né được đòn của ${attacker.name}!`);
    return 0;
  }
  let dmg = eff(attacker, 'atk') * power;
  const def = eff(target, 'def') * (1 - (opt.ignoreDef || 0));
  const dk = target.defK || DEF_K_FALLBACK;
  dmg = dmg * (dk / (dk + def)); // Phòng cho giảm trừ lũy tiến (diminishing), defK theo bậc.
  // Bạo kích.
  let crit = false;
  if (rnd() < attacker.crit + (opt.bonusCrit || 0)) { dmg *= attacker.critDmg; crit = true; }
  dmg *= 0.9 + rnd() * 0.2; // dao động ±10%
  dmg *= 1 - target.dmgReduce; // giảm sát thương bị động (vd Cương Thể)
  dmg = Math.max(1, R(dmg));

  // Khiên hấp thụ trước.
  if (target.shield > 0) {
    const ab = Math.min(target.shield, dmg);
    target.shield -= ab; dmg -= ab;
    if (ab > 0) log.push(`🧱 Khiên của ${target.name} chặn ${ab} sát thương.`);
  }
  target.hp -= dmg;
  log.push(`${crit ? '💢 BẠO KÍCH! ' : ''}${attacker.name} gây ${dmg} sát thương ${target.name} (còn ${Math.max(0, target.hp)} máu).`);

  // Hút máu (bị động + của chiêu).
  const ls = attacker.lifesteal + (opt.lifesteal || 0);
  if (ls > 0 && dmg > 0) {
    const h = R(dmg * ls);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + h);
    if (h > 0) log.push(`🩸 ${attacker.name} hút ${h} máu.`);
  }
  // Phản đòn.
  if (target.reflect > 0 && dmg > 0 && target.hp > 0) {
    const r = R(dmg * target.reflect);
    attacker.hp -= r;
    if (r > 0) log.push(`🛡️ ${target.name} phản ${r} sát thương về ${attacker.name}.`);
  }
  return dmg;
}

// Thực thi hành động (skill hoặc đánh thường).
function doAction(actor, target, skill, log) {
  if (!skill) {
    log.push(`👊 ${actor.name} đánh thường.`);
    strike(actor, target, 1.0, {}, log);
    return;
  }
  actor.mp -= skill.mp || 0;
  actor.cd[skill.id] = skill.cd || 0;
  log.push(`✨ ${actor.name} dùng **${skill.name}** ${skill.emoji || ''}`);

  if (skill.selfHpCost) {
    const c = R(actor.maxHp * skill.selfHpCost);
    actor.hp -= c;
    log.push(`🔥 ${actor.name} hiến tế ${c} máu.`);
  }
  if (skill.power) {
    const hits = skill.hits || 1;
    for (let i = 0; i < hits && target.hp > 0; i++) {
      strike(actor, target, skill.power, { ignoreDef: skill.ignoreDef, bonusCrit: skill.bonusCrit, lifesteal: skill.lifesteal }, log);
    }
  }
  if (skill.dot) {
    // DoT cũng bị Phòng giảm trừ (snapshot lúc đánh) để không lấn át đòn đánh thẳng.
    const raw = eff(actor, 'atk') * skill.dot.mult * (1 + actor.dotBonus);
    const dk = target.defK || DEF_K_FALLBACK;
    const dmg = Math.max(1, R(raw * (dk / (dk + eff(target, 'def')))));
    // Cùng 1 chiêu thì LÀM MỚI (không cộng dồn vô hạn).
    target.statuses = target.statuses.filter((s) => !(s.kind === 'dot' && s.srcId === skill.id));
    target.statuses.push({ kind: 'dot', srcId: skill.id, dmg, turns: skill.dot.turns + 1, label: 'theo thời gian', emoji: skill.emoji });
    log.push(`☣️ ${target.name} dính hiệu ứng ${skill.name} (${dmg}/lượt, ${skill.dot.turns} lượt).`);
  }
  if (skill.heal) {
    const h = R(actor.maxHp * skill.heal);
    actor.hp = Math.min(actor.maxHp, actor.hp + h);
    log.push(`💚 ${actor.name} hồi ${h} máu.`);
  }
  if (skill.shield) {
    const sh = R(actor.maxHp * skill.shield);
    actor.shield += sh;
    log.push(`🧱 ${actor.name} tạo khiên ${sh}.`);
  }
  if (skill.buff) {
    // Cùng 1 chiêu thì LÀM MỚI (không cộng dồn vô hạn) — như DoT.
    actor.statuses = actor.statuses.filter((s) => !(s.kind === 'buff' && s.srcId === skill.id));
    actor.statuses.push({ kind: 'buff', srcId: skill.id, stat: skill.buff.stat, mult: skill.buff.mult, turns: skill.buff.turns + 1 });
    log.push(`⬆️ ${actor.name} tăng ${skill.buff.stat.toUpperCase()} (${Math.round((skill.buff.mult - 1) * 100)}%, ${skill.buff.turns} lượt).`);
  }
  if (skill.debuff) {
    target.statuses = target.statuses.filter((s) => !(s.kind === 'debuff' && s.srcId === skill.id));
    target.statuses.push({ kind: 'debuff', srcId: skill.id, stat: skill.debuff.stat, mult: skill.debuff.mult, turns: skill.debuff.turns + 1 });
    log.push(`⬇️ ${target.name} bị giảm ${skill.debuff.stat.toUpperCase()} (${Math.round((1 - skill.debuff.mult) * 100)}%, ${skill.debuff.turns} lượt).`);
  }
}

// Tự đánh hết trận. Trả { winner:'A'|'B'|'draw', log, rounds }.
function resolve(A, B, opts = {}) {
  const maxRounds = opts.maxRounds || 50;
  const log = [];
  let round = 0;

  const cc = config.combat || {};
  const extraRatio = cc.extraAttackRatio || Infinity; // Tốc ≥ ratio× địch -> +1 đòn cuối vòng
  const extraPower = cc.extraAttackPower != null ? cc.extraAttackPower : 1.0;

  while (round < maxRounds && A.hp > 0 && B.hp > 0) {
    round++;
    // Thứ tự theo Tốc; ai NHANH HƠN HẲN (≥ extraRatio×) được đánh THÊM 1 đòn cuối vòng.
    const sa = eff(A, 'spd'), sb = eff(B, 'spd');
    const aFirst = sa >= sb;
    const order = aFirst ? [[A, B], [B, A]] : [[B, A], [A, B]];

    for (const [actor, target] of order) {
      if (actor.hp <= 0 || target.hp <= 0) continue;
      startTurn(actor, log);
      if (actor.hp <= 0) { log.push(`💀 ${actor.name} gục vì hiệu ứng!`); continue; }
      doAction(actor, target, chooseAction(actor, target), log);
      if (target.hp <= 0) log.push(`💀 ${target.name} gục ngã!`);
    }

    // Đòn thêm: combatant nhanh hơn hẳn vung thêm một đòn (đánh thường) cuối vòng.
    const fast = aFirst ? A : B, slow = aFirst ? B : A;
    const fastSpd = aFirst ? sa : sb, slowSpd = aFirst ? sb : sa;
    if (fast.hp > 0 && slow.hp > 0 && slowSpd > 0 && fastSpd >= slowSpd * extraRatio) {
      log.push(`⚡ ${fast.name} thân pháp như điện, đánh thêm một đòn!`);
      strike(fast, slow, extraPower, {}, log);
      if (slow.hp <= 0) log.push(`💀 ${slow.name} gục ngã!`);
    }
  }

  let winner;
  if (A.hp <= 0 && B.hp <= 0) winner = 'draw';
  else if (B.hp <= 0) winner = 'A';
  else if (A.hp <= 0) winner = 'B';
  else winner = A.hp / A.maxHp >= B.hp / B.maxHp ? 'A' : 'B';
  return { winner, log, rounds: round };
}

// =====================================================================
//  ĐÁNH THEO LƯỢT (interactive) — tách hành động người chơi ra từng lượt.
//  startFight() tạo trạng thái; stepRound() chạy ĐÚNG 1 vòng với chiêu người
//  chơi CHỌN (hoặc '__auto__' để AI tự chọn — dùng cho nút Đánh nhanh).
//  Dùng lại y nguyên startTurn/doAction/chooseAction/strike nên cân bằng GIỐNG
//  HỆT resolve() — chỉ khác: A do người chơi điều khiển thay vì AI.
// =====================================================================
function startFight(A, B, opts = {}) {
  return { A, B, round: 0, log: [], over: false, winner: null, lastLog: [], maxRounds: opts.maxRounds || 50 };
}

// 1 chiêu chủ động đã SẴN SÀNG chưa (đủ linh lực + hết hồi chiêu)?
function skillReady(c, skill) {
  if (!skill) return true; // đánh thường luôn sẵn
  return (c.cd[skill.id] || 0) <= 0 && c.mp >= (skill.mp || 0);
}

// Chiêu người chơi đã chọn cho lượt: id chiêu / null (đánh thường) / '__auto__' (AI).
function resolvePlayerSkill(fight, id) {
  const A = fight.A;
  if (id === '__auto__') return chooseAction(A, fight.B);
  if (!id || id === 'basic') return null;
  const sk = A.actives.find((s) => s.id === id);
  if (sk && skillReady(A, sk)) return sk;
  return null; // chiêu không hợp lệ / chưa hồi -> đánh thường (an toàn)
}

// Chạy 1 VÒNG: A dùng chiêu đã chọn, B do AI; rồi đòn thêm theo Tốc; cập nhật kết quả.
function stepRound(fight, playerSkillId) {
  if (fight.over) return fight;
  const { A, B } = fight;
  const startLen = fight.log.length;
  fight.round++;

  const cc = config.combat || {};
  const extraRatio = cc.extraAttackRatio || Infinity;
  const extraPower = cc.extraAttackPower != null ? cc.extraAttackPower : 1.0;

  const sa = eff(A, 'spd'), sb = eff(B, 'spd');
  const aFirst = sa >= sb;
  const order = aFirst ? [[A, B], [B, A]] : [[B, A], [A, B]];

  for (const [actor, target] of order) {
    if (actor.hp <= 0 || target.hp <= 0) continue;
    startTurn(actor, fight.log);
    if (actor.hp <= 0) { fight.log.push(`💀 ${actor.name} gục vì hiệu ứng!`); continue; }
    const skill = actor === A ? resolvePlayerSkill(fight, playerSkillId) : chooseAction(actor, target);
    doAction(actor, target, skill, fight.log);
    if (target.hp <= 0) fight.log.push(`💀 ${target.name} gục ngã!`);
  }

  const fast = aFirst ? A : B, slow = aFirst ? B : A;
  const fastSpd = aFirst ? sa : sb, slowSpd = aFirst ? sb : sa;
  if (fast.hp > 0 && slow.hp > 0 && slowSpd > 0 && fastSpd >= slowSpd * extraRatio) {
    fight.log.push(`⚡ ${fast.name} thân pháp như điện, đánh thêm một đòn!`);
    strike(fast, slow, extraPower, {}, fight.log);
    if (slow.hp <= 0) fight.log.push(`💀 ${slow.name} gục ngã!`);
  }

  if (A.hp <= 0 || B.hp <= 0 || fight.round >= fight.maxRounds) {
    fight.over = true;
    if (A.hp <= 0 && B.hp <= 0) fight.winner = 'draw';
    else if (B.hp <= 0) fight.winner = 'A';
    else if (A.hp <= 0) fight.winner = 'B';
    else fight.winner = A.hp / A.maxHp >= B.hp / B.maxHp ? 'A' : 'B';
  }
  fight.lastLog = fight.log.slice(startLen);
  return fight;
}

// Đánh nhanh: chạy hết trận, A do AI điều khiển. Trả fight đã xong.
function autoResolve(fight) {
  let guard = 0;
  while (!fight.over && guard++ < 200) stepRound(fight, '__auto__');
  return fight;
}

module.exports = { baseStats, build, resolve, eff, startFight, stepRound, autoResolve, skillReady };
