// =====================================================================
//  KỲ NGỘ — sự kiện phiêu lưu NGẪU NHIÊN (thuần: dữ liệu + công thức).
//  Mỗi lần /kyngo: bốc 1 sự kiện -> chọn 1 hướng xử lý -> tung KẾT QUẢ
//  (có trọng số: phần lớn là cơ duyên, đôi khi vô sự / tai họa nhẹ).
//  Nguồn TU VI / LINH THẠCH / NGUYÊN LIỆU phụ — đặc biệt hữu ích GIAI ĐOẠN
//  ĐẦU (Phàm Nhân / Luyện Khí) khi chưa mở bí cảnh. Có cooldown (config.kyngo).
//
//  result: { w(trọng số), tuvi?(×hệ số tu vi), stones?(×hệ số đá), mat?{id:qty},
//            lose?(×hệ số, trừ tu vi), text }. Số cụ thể tính ở computeGains().
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

const EVENTS = [
  {
    id: 'an_si', emoji: '🧺', title: 'Lão Hành Khất Bên Đường',
    text: 'Trên đường hành tẩu, đạo hữu gặp một lão hành khất rách rưới ngồi co ro, chìa tay xin chút lương khô.',
    choices: [
      { label: 'Cho lão chút lương khô', reply: 'Đạo hữu mỉm cười, sẻ cho lão nửa phần lương khô của mình.', results: [
        { w: 5, tuvi: 2, text: 'Lão hành khất bỗng đứng dậy, thân ảnh hóa thành một vị tản tiên! "Có lòng lắm." — lão phất tay, một luồng linh khí thuần khiết rót vào người đạo hữu.' },
        { w: 4, stones: 2, text: 'Lão cảm kích dúi vào tay đạo hữu một túi nhỏ — bên trong là mấy viên linh thạch lão nhặt được.' },
        { w: 3, text: 'Lão gật đầu cảm tạ rồi khập khiễng rời đi. Một việc thiện nhỏ, lòng thấy nhẹ nhõm.' },
      ] },
      { label: 'Phớt lờ, đi tiếp', reply: 'Đạo hữu lắc đầu bước qua, đường tu còn dài, hơi đâu bận tâm.', results: [
        { w: 6, text: 'Đạo hữu đi tiếp, chẳng có gì xảy ra.' },
        { w: 2, tuvi: 1, text: 'Đi được vài bước, đạo hữu chợt ngộ ra điều gì đó về chữ "duyên", tâm cảnh thông suốt hơn một chút.' },
      ] },
    ],
  },
  {
    id: 'linh_chi', emoji: '🍄', title: 'Linh Chi Trên Vách Núi',
    text: 'Một cây **linh chi ngàn năm** mọc chênh vênh trên vách đá cheo leo, tỏa linh quang mờ ảo. Hái được nó hẳn lợi ích không nhỏ.',
    choices: [
      { label: 'Liều mình trèo hái', reply: 'Đạo hữu nghiến răng bám vách đá, từng chút một bò tới chỗ linh chi.', results: [
        { w: 5, tuvi: 3, text: 'Hái được linh chi! Nuốt vào, một luồng dược lực mát rượi lan khắp kinh mạch.' },
        { w: 3, mat: { linh_thao: 2 }, text: 'Linh chi đã héo mất linh khí, nhưng quanh đó đạo hữu nhặt được ít linh thảo.' },
        { w: 3, lose: 1, text: 'Sẩy tay! Đạo hữu trượt chân ngã, may bám được mỏm đá nhưng kinh mạch chấn động, tổn chút tu vi.' },
      ] },
      { label: 'Dùng linh khí cuốn lấy', reply: 'Đạo hữu vận linh khí, cố cuốn cây linh chi từ xa.', results: [
        { w: 4, tuvi: 2, text: 'Linh khí cuốn linh chi về tay! Tuy hao chút công lực nhưng vẫn lời to.' },
        { w: 4, text: 'Linh khí chưa đủ tinh thuần, linh chi rơi xuống vực mất hút. Tiếc hùi hụi.' },
      ] },
      { label: 'Quá nguy hiểm, bỏ qua', reply: 'Đạo hữu lắc đầu — tính mạng quan trọng hơn. Đi tiếp.', results: [
        { w: 1, text: 'Đạo hữu rời đi an toàn, không được gì.' },
      ] },
    ],
  },
  {
    id: 'yeu_lang', emoji: '🐺', title: 'Yêu Lang Chặn Đường',
    text: 'Một con **yêu lang mắt đỏ** nhảy ra chặn đường, gầm gừ nhe nanh, rõ ràng coi đạo hữu là bữa tối.',
    choices: [
      { label: 'Vận công nghênh chiến', reply: 'Đạo hữu vận linh khí, lao vào quyết chiến với yêu lang!', results: [
        { w: 5, stones: 2, mat: { yeu_dan: 1 }, text: 'Sau một hồi kịch chiến, đạo hữu hạ gục yêu lang, moi được nội đan và ít chiến lợi phẩm!' },
        { w: 3, tuvi: 2, text: 'Trận chiến gay cấn giúp đạo hữu lĩnh ngộ thêm về chiến đấu, tu vi tăng tiến.' },
        { w: 3, lose: 1, text: 'Yêu lang quá mạnh, đạo hữu bị cào một vết, đành rút lui, tổn chút tu vi.' },
      ] },
      { label: 'Né tránh bỏ chạy', reply: 'Đạo hữu thi triển thân pháp, lách qua yêu lang chạy thoát.', results: [
        { w: 5, text: 'Chạy thoát an toàn, hú vía!' },
        { w: 2, stones: 1, text: 'Vừa chạy đạo hữu vừa vấp phải một túi linh thạch ai đó đánh rơi — phúc bất trùng lai!' },
      ] },
    ],
  },
  {
    id: 'tan_quyen', emoji: '📜', title: 'Tàn Quyển Trong Hốc Cây',
    text: 'Trong hốc một cổ thụ, đạo hữu phát hiện một **tàn quyển công pháp** đã ố vàng, chữ nghĩa mờ nhạt.',
    choices: [
      { label: 'Tĩnh tâm nghiền ngẫm', reply: 'Đạo hữu ngồi xuống, tĩnh tâm tham ngộ những dòng chữ còn sót lại.', results: [
        { w: 5, tuvi: 3, text: 'Tuy chỉ là tàn quyển, nhưng vài câu khẩu quyết khiến đạo hữu bừng tỉnh, tu vi tăng vọt!' },
        { w: 4, tuvi: 1, text: 'Đạo hữu lĩnh hội được chút ít, cũng coi như có thu hoạch.' },
      ] },
      { label: 'Đem bán cho tiệm sách', reply: 'Đạo hữu cuộn tàn quyển lại, định đem xuống trấn bán.', results: [
        { w: 5, stones: 3, text: 'Một lão chủ tiệm mê đồ cổ trả giá hời cho tàn quyển — lời to!' },
        { w: 2, stones: 1, text: 'Tàn quyển chẳng đáng mấy đồng, nhưng cũng có người mua.' },
      ] },
    ],
  },
  {
    id: 'linh_tuyen', emoji: '💧', title: 'Linh Tuyền Dưới Khe',
    text: 'Đạo hữu tìm thấy một dòng **linh tuyền** trong vắt chảy ra từ khe núi, hơi nước phảng phất linh khí.',
    choices: [
      { label: 'Bế quan tu luyện bên suối', reply: 'Đạo hữu ngồi xếp bằng bên suối, hấp thụ linh khí từ làn hơi nước.', results: [
        { w: 6, tuvi: 2, text: 'Linh khí nơi đây dồi dào, một hồi tu luyện bằng mấy ngày khổ công!' },
        { w: 2, tuvi: 4, text: 'Kỳ diệu thay, đạo hữu tìm được trạng thái "thiên nhân hợp nhất", tu vi tăng mạnh!' },
      ] },
      { label: 'Hứng một bầu mang theo', reply: 'Đạo hữu hứng đầy một bầu linh tuyền để dành.', results: [
        { w: 4, mat: { linh_thao: 1 }, text: 'Bên suối còn mọc ít linh thảo, đạo hữu tiện tay hái luôn.' },
        { w: 4, stones: 1, text: 'Đáy suối lấp lánh — đạo hữu mò được một viên linh thạch nhỏ!' },
      ] },
    ],
  },
  {
    id: 'co_mo', emoji: '⚱️', title: 'Cổ Mộ Hoang Phế',
    text: 'Một **cổ mộ** rêu phong hiện ra sau bụi rậm, cửa đá hé mở, bên trong tối om và lạnh lẽo.',
    choices: [
      { label: 'Vào trong dò xét', reply: 'Đạo hữu thắp một ngọn linh hỏa, thận trọng bước vào cổ mộ.', results: [
        { w: 4, stones: 3, mat: { huyet_tinh: 1 }, text: 'Trong quan tài là di vật của một tu sĩ thượng cổ — đạo hữu thu được linh thạch và chút huyết tinh!' },
        { w: 3, tuvi: 2, text: 'Trên vách mộ khắc đạo văn cổ, đạo hữu tham ngộ được đôi điều huyền diệu.' },
        { w: 3, lose: 2, text: 'Oán khí trong mộ bộc phát! Đạo hữu vội thoát ra, kinh mạch nhiễm hàn khí, tổn tu vi.' },
      ] },
      { label: 'Vái lạy rồi rời đi', reply: 'Đạo hữu chắp tay vái cổ mộ ba vái, lặng lẽ rời đi.', results: [
        { w: 5, tuvi: 1, text: 'Lòng thành kính khiến đạo tâm thêm vững. Tu vi tăng nhẹ.' },
        { w: 3, stones: 1, text: 'Vong linh cổ mộ cảm kích, ban cho đạo hữu chút di sản — một viên linh thạch lăn ra trước cửa.' },
      ] },
    ],
  },
  {
    id: 'tui_tien', emoji: '🪙', title: 'Túi Tiền Rơi Giữa Đường',
    text: 'Giữa đường, đạo hữu nhặt được một **túi linh thạch** căng phồng ai đó đánh rơi.',
    choices: [
      { label: 'Trả lại người mất', reply: 'Đạo hữu đứng đợi, quyết tìm bằng được chủ nhân túi tiền.', results: [
        { w: 5, stones: 3, text: 'Chủ nhân là một phú thương tu sĩ, cảm kích đức tính của đạo hữu, hậu tạ gấp đôi!' },
        { w: 3, tuvi: 2, text: 'Tuy không tìm thấy chủ, nhưng tâm chính trực giúp đạo tâm viên mãn hơn.' },
      ] },
      { label: 'Lẳng lặng đút túi', reply: 'Đạo hữu nhanh tay cất túi tiền vào ngực áo, rảo bước.', results: [
        { w: 6, stones: 2, text: 'Túi tiền kha khá, đạo hữu âm thầm mừng rỡ.' },
        { w: 3, lose: 1, text: 'Túi tiền có dán bùa truy tung! Chủ nhân đuổi tới đòi, còn dạy đạo hữu một bài học, tổn chút tu vi.' },
      ] },
    ],
  },
  {
    id: 'hoa_long_qua', emoji: '🔥', title: 'Hỏa Long Quả Chín Đỏ',
    text: 'Trên một thân cây cháy xém, một trái **Hỏa Long Quả** chín đỏ rực, tỏa hơi nóng hầm hập — kỳ trân bổ ích nhưng dương khí cực mạnh.',
    choices: [
      { label: 'Nuốt sống ngay', reply: 'Đạo hữu hái quả, nuốt chửng không chần chừ!', results: [
        { w: 4, tuvi: 4, text: 'Một luồng dương hỏa bùng nổ trong đan điền, đạo hữu vận công áp chế thành công — tu vi tăng vọt!' },
        { w: 4, lose: 2, text: 'Dương khí quá mãnh liệt! Đạo hữu nóng tới mức suýt tẩu hỏa nhập ma, vội ép ra ngoài, tổn tu vi.' },
      ] },
      { label: 'Từ từ luyện hóa', reply: 'Đạo hữu vận công, từ từ luyện hóa dược lực Hỏa Long Quả.', results: [
        { w: 6, tuvi: 2, text: 'Cẩn thận luyện hóa, đạo hữu hấp thu trọn vẹn dược lực mà không gặp rủi ro.' },
        { w: 2, tuvi: 3, mat: { huyet_tinh: 1 }, text: 'Luyện hóa hoàn mỹ! Ngoài tu vi, đạo hữu còn ngưng được chút huyết tinh tinh hoa.' },
      ] },
    ],
  },
];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
function getEvent(id) { return byId.get(id) || null; }

// Bốc 1 sự kiện ngẫu nhiên hợp cảnh giới (mặc định mọi sự kiện mở từ realm 0).
function pickEvent(realm) {
  const pool = EVENTS.filter((e) => (realm ?? 0) >= (e.minRealm || 0));
  return pool[Math.floor(Math.random() * pool.length)] || EVENTS[0];
}

// Tung 1 kết quả theo trọng số trong 1 lựa chọn.
function rollResult(choice) {
  const rs = choice.results || [];
  const total = rs.reduce((s, r) => s + (r.w || 1), 0);
  let roll = Math.random() * total;
  for (const r of rs) { if ((roll -= (r.w || 1)) <= 0) return r; }
  return rs[rs.length - 1];
}

// Quy kết quả -> số cụ thể theo cảnh giới người chơi (tu vi/đá/lose theo % tu vi cần).
function computeGains(player, result) {
  const k = config.kyngo;
  const need = cult.tuViNeeded(player.realm, player.tier);
  return {
    tuvi: result.tuvi ? Math.max(1, Math.round(result.tuvi * k.tuViPctBase * need)) : 0,
    stones: result.stones ? Math.max(1, Math.round(result.stones * k.stonesBase * (1 + (player.realm || 0)))) : 0,
    lose: result.lose ? Math.max(1, Math.round(result.lose * k.tuViPctBase * need)) : 0,
    mat: result.mat || null,
  };
}

module.exports = { EVENTS, getEvent, pickEvent, rollResult, computeGains };
