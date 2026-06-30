// =====================================================================
//  CỐT TRUYỆN CHÍNH — "Tiên Đồ Lộ Ký"  (engine nhiều cảnh, tự chứa)
//  Chuỗi chương BỀN VỮNG (không reset). Đi hết cảnh của chương → lãnh
//  thưởng → mở chương kế. Mỗi chương gắn với một CẢNH GIỚI; đột phá lên
//  cảnh giới mới sẽ mở khóa tính năng mới (xem features.js).
//
//  MỖI CHƯƠNG = mảng `scenes[]`:
//    • L(who, text)  -> 'line'  : 1 nhịp dẫn truyện. who = 'npc'|'me'|'narrator'.
//    • C(prompt, [[label, reply], ...]) -> 'choice' : 2–3 nút trả lời (đổi flavor, không rẽ nhánh thật).
//    • T(objective, text, extra) -> 'task' : NHIỆM VỤ THẬT. objective.type:
//        'talk'        -> bấm "Trò chuyện".
//        'tuluyen'     -> gõ /tuluyen đủ `goal` lần (nghe ké hook nền).
//        'bequan'      -> xuất quan /bequan đủ `goal` lần.
//        'dotpha'      -> đột phá thành công đủ `goal` lần.
//        'reach_realm' -> đạt cảnh giới >= objective.realm (đồng bộ theo trạng thái).
//        'pay_stones'  -> bấm "Dâng linh thạch", trừ objective.cost 💎.
//        'chat'        -> tám đủ `goal` câu trong server.
//        'pending_sect'-> đã đặt nguyện vọng phái (pending_sect) — qua panel/monphai.
//        'finalize_sect'-> hoàn thành nghi thức nhập môn (nút) -> chính thức vào phái.
//      extra.micro = { tuVi, stones } : thưởng nhỏ khi RỜI cảnh (tùy chọn).
//
//  reward (cuối CHƯƠNG): { tuVi, stones } — thưởng 1 lần.
//  ⚠️ ĐỪNG đổi `id` chương sau khi người chơi đã chạy thật (tiến độ neo theo id).
// =====================================================================

// --- Builder cho gọn ---
const L = (who, text) => ({ type: 'line', who, text });
const C = (prompt, options) => ({ type: 'choice', prompt, options: options.map(([label, reply]) => ({ label, reply })) });
const T = (objective, text, extra = {}) => ({ type: 'task', objective, text, ...extra });

const CHAPTERS = [
  // ============== CHƯƠNG 1 — Phàm Nhân: Cơ Duyên Nhập Đạo ==============
  {
    id: 'ch01_co_duyen',
    minRealm: 0,
    title: 'Cơ Duyên Nhập Đạo',
    npc: { name: 'Thanh Vân Tử', emoji: '🧙' },
    scenes: [
      L('narrator', 'Sườn núi Thanh Vân, mây trắng vờn quanh. Bạn — một phàm nhân tay trắng, vừa trèo gãy cả móng tay để lên tới đây — ngã quỵ trước một đạo quán cũ kỹ.'),
      L('npc', '"Ngộ tính tạm được, cốt cách cũng không tệ…" — một lão đạo nhân râu bạc phơ chống phất trần bước ra, ngắm bạn từ đầu tới chân. "Tiểu hữu trèo cả ngày đường lên đây, là vì điều gì?"'),
      C('Bạn đáp sao với lão đạo nhân?', [
        ['Con muốn tu tiên!', '"Con muốn tu tiên, cầu trường sinh!" — bạn dập đầu, mắt sáng rực.'],
        ['Con muốn mạnh hơn…', '"Con chỉ muốn mạnh hơn, không bị ai chà đạp nữa." — bạn siết chặt nắm tay.'],
        ['…(thở dốc, chưa nói nên lời)', 'Bạn thở dốc, chưa kịp nói gì, nhưng ánh mắt đã nói thay tất cả.'],
      ]),
      L('npc', '"Hô hô, khí phách đấy. Ta là Thanh Vân Tử. Đã tới cửa thì là có duyên." — lão cười lớn. "Tu tiên khởi đầu từ **hấp thụ linh khí** trời đất vào thân. Lại đây, ta truyền cho con khẩu quyết đầu tiên."'),
      T({ type: 'talk', goal: 1 }, 'Quỳ xuống bái sư, lắng nghe Thanh Vân Tử truyền khẩu quyết nhập môn. *(Bấm "Trò chuyện".)*'),
      L('npc', '"Khẩu quyết đã in vào tâm khảm. Giờ con thử **vận công** đi — nhắm mắt, dẫn linh khí theo chu thiên. Gõ `/tuluyen` vài lần cho ta xem."'),
      T({ type: 'tuluyen', goal: 3 }, 'Vận công tu luyện **3 lần** (gõ `/tuluyen`). Cảm nhận linh khí lần đầu chảy vào kinh mạch.', { micro: { tuVi: 20 } }),
      L('npc', '"Tốt! Con đã chạm được sợi linh khí đầu tiên. Đường tu tiên vạn dặm, hôm nay con vừa đặt bước chân thứ nhất." — Thanh Vân Tử gật gù, dúi cho bạn một túi linh thạch nhỏ.'),
    ],
    reward: { tuVi: 40, stones: 10 },
  },

  // ============== CHƯƠNG 2 — Luyện Khí: Hấp Thụ Linh Khí ==============
  {
    id: 'ch02_luyen_khi',
    minRealm: 0,
    title: 'Tịnh Tâm Luyện Khí',
    npc: { name: 'Thanh Vân Tử', emoji: '🧙' },
    scenes: [
      L('npc', '"Vận công lẻ tẻ thì chậm lắm. Muốn tu nhanh, phải biết **bế quan** — đóng cửa động phủ, nhập định, để linh khí tự tích cả khi con ngủ." — Thanh Vân Tử chỉ tay vào một sơn động sau quán.'),
      T({ type: 'bequan', goal: 1 }, 'Vào sơn động **bế quan một lần** rồi xuất quan (gõ `/bequan`, lát sau gõ lại để xuất quan).', { micro: { tuVi: 30 } }),
      L('me', '"Sư phụ, con thấy linh khí trong người đã dày lên nhiều rồi!" — bạn mở mắt, kinh mạch ấm nóng.'),
      L('npc', '"Đó là lúc **đột phá**. Khi tu vi đầy, gõ `/dotpha` để vọt lên tầng cao hơn. Tích đủ rồi thì đừng chần chừ — phải bước qua **Luyện Khí** mới tính là chính thức nhập đạo!"'),
      T({ type: 'reach_realm', realm: 1, goal: 1 }, 'Tu luyện & đột phá cho tới khi đạt cảnh giới **🌬️ Luyện Khí**. *(Đủ tu vi thì gõ `/dotpha`.)*'),
      L('npc', '"Hảo! Từ nay con là người tu hành thực thụ, không còn là phàm nhân nữa." — Thanh Vân Tử vuốt râu, ánh mắt đầy tán thưởng. "Con đường phía trước còn dài, nhưng con có tư chất."'),
    ],
    reward: { tuVi: 80, stones: 20 },
  },

  // ============== CHƯƠNG (mới) — Luyện Khí: Sơ Thí Săn Yêu ==============
  {
    id: 'ch02b_san_yeu',
    minRealm: 1,
    title: 'Sơ Thí Săn Yêu',
    npc: { name: 'Liệp Hộ Sơn Quân', emoji: '🏹' },
    scenes: [
      L('narrator', 'Vừa nhập Luyện Khí, đạo hữu được Thanh Vân Tử dặn: "Tu vi trên giấy chẳng bằng một trận thực chiến." Theo lời chỉ, đạo hữu tìm tới một bãi săn dưới chân núi — nơi một thợ săn yêu thú lừng danh đang mài đao.'),
      L('npc', '"Tiểu tử Luyện Khí à? Muốn cứng cáp thì phải đổ mồ hôi nơi **Bãi Săn Yêu**." — Liệp Hộ Sơn Quân hất hàm về phía khu rừng rậm. "Yêu hoang ở đây không mạnh, nhưng đủ dạy ngươi cách ra đòn. Thắng thì có linh thạch với tu vi, thua cũng chẳng mất gì — cứ mạnh dạn!"'),
      C('Đạo hữu đáp lời Sơn Quân?', [
        ['Vãn bối xin thử sức!', '"Vãn bối xin thử sức ngay!" — đạo hữu siết chặt nắm tay, máu nóng dâng trào.'],
        ['Săn yêu có cần môn phái không ạ?', '"Vãn bối chưa có môn phái, săn được không tiền bối?" — đạo hữu hơi ngần ngại.'],
      ]),
      L('npc', '"Chưa vào phái cũng săn được tuốt — chỉ là đánh bằng sức mình thôi! Tới kênh **Bãi Săn Yêu** (hoặc bấm 🐗 Săn Yêu) mà ra tay. Đi săn vài ba con cho ta xem bản lĩnh!"'),
      T({ type: 'sanyeu', goal: 3 }, 'Tới **Bãi Săn Yêu** hạ **3 yêu hoang** (bấm 🐗 Săn Yêu). *(Bấm "Kiểm tra tiến độ" sau khi săn.)*', { micro: { tuVi: 40, stones: 5 } }),
      L('npc', '"Khá lắm! Tay đao đã bớt run rồi đó." — Sơn Quân cười sảng khoái, ném cho đạo hữu một túi da đựng chiến lợi phẩm. "Cứ chăm săn, vừa luyện thân vừa kiếm linh thạch. Khi nào gặp cơ duyên kỳ lạ thì đừng bỏ lỡ nghe!"'),
    ],
    reward: { tuVi: 120, stones: 25 },
  },

  // ============== CHƯƠNG (mới) — Luyện Khí: Cơ Duyên Tao Ngộ ==============
  {
    id: 'ch02c_ky_ngo',
    minRealm: 1,
    title: 'Cơ Duyên Tao Ngộ',
    npc: { name: 'Du Phương Đạo Nhân', emoji: '🎲' },
    scenes: [
      L('narrator', 'Trên đường săn yêu về, đạo hữu gặp một đạo nhân áo vá lang thang, tay phe phẩy quạt rách, miệng ngâm nga khúc hát không đầu không cuối — Du Phương Đạo Nhân, kẻ chu du thiên hạ săn tìm cơ duyên.'),
      L('npc', '"Tu hành đâu chỉ có ngồi thiền với đánh đấm, tiểu hữu!" — đạo nhân cười hì hì. "Thiên địa rộng lớn, đâu đâu cũng có **kỳ ngộ** — linh chi trên vách núi, tàn quyển trong hốc cây, lão hành khất hóa tiên… Biết nắm bắt thì một bước lên mây!"'),
      C('Đạo hữu hỏi Du Phương Đạo Nhân?', [
        ['Làm sao gặp được kỳ ngộ?', '"Vãn bối làm sao gặp được những cơ duyên ấy?" — đạo hữu tò mò.'],
        ['Cơ duyên có rủi ro không?', '"Những cơ duyên đó… có nguy hiểm không ạ?" — đạo hữu thận trọng.'],
      ]),
      L('npc', '"Cứ chịu khó bôn ba — **bấm 🎲 Kỳ Ngộ ở panel Tu Luyện**, hoặc lúc đi săn yêu cũng hay gặp! Mỗi cơ duyên là một lựa chọn: gan dạ thì lời to, mà cũng có khi xui xẻo. Cứ thử một phen cho biết!"'),
      T({ type: 'kyngo', goal: 1 }, 'Trải qua **1 kỳ ngộ** (nút 🎲 Kỳ Ngộ ở panel Tu Luyện, hoặc gặp khi săn yêu). *(Bấm "Kiểm tra tiến độ" sau đó.)*', { micro: { tuVi: 30 } }),
      L('npc', '"Hà hà, nếm mùi cơ duyên rồi đó! Nhớ nhé — phúc duyên dành cho kẻ chịu bước ra khỏi động phủ." — Du Phương Đạo Nhân vỗ vai đạo hữu, rồi lại nghêu ngao bỏ đi, bóng khuất sau rặng trúc.'),
    ],
    reward: { tuVi: 150, stones: 30 },
  },

  // ============== CHƯƠNG (mới) — Luyện Khí: Tích Lũy Căn Cơ ==============
  {
    id: 'ch02d_tich_luy',
    minRealm: 1,
    title: 'Tích Lũy Căn Cơ',
    npc: { name: 'Thanh Vân Tử', emoji: '🧙' },
    scenes: [
      L('npc', '"Săn yêu, kỳ ngộ đều đã nếm qua. Nhưng muốn vào **Trúc Cơ**, căn cơ phải thật vững." — Thanh Vân Tử quay lại, ánh mắt nghiêm nghị hơn xưa. "Đừng nóng vội. Hãy bế quan tĩnh tu, để linh khí lắng đọng thành nền móng."'),
      T({ type: 'bequan', goal: 1 }, 'Vào **bế quan một lần** rồi xuất quan (gõ `/bequan`, lát sau xuất quan).', { micro: { tuVi: 50 } }),
      L('npc', '"Tốt. Linh khí trong người con đã thuần hơn nhiều." — lão vuốt râu. "Giờ tiếp tục vận công cho tới khi tu vi tràn trề, sẵn sàng cho cú đột phá lớn đầu đời."'),
      T({ type: 'tuluyen', goal: 3 }, 'Vận công **3 lần** (gõ `/tuluyen`) để tích lũy căn cơ.', { micro: { tuVi: 40 } }),
      L('npc', '"Căn cơ đã vững như bàn thạch. Chương sau, con sẽ đối mặt với **Trúc Cơ** — ải lớn đầu tiên trên đường tu. Hãy chuẩn bị tâm thế cho thật tốt!" — Thanh Vân Tử mỉm cười, ánh mắt tràn kỳ vọng.'),
    ],
    reward: { tuVi: 200, stones: 35 },
  },

  // ============== CHƯƠNG 3 — Trúc Cơ: Lập Đạo Căn Cơ ==============
  {
    id: 'ch03_truc_co',
    minRealm: 1,
    title: 'Trúc Cơ Lập Đạo',
    npc: { name: 'Đan Sư Lưu Hỏa', emoji: '💊' },
    scenes: [
      L('narrator', 'Tin bạn nhập Luyện Khí lan ra. Một lão nhân mặt đỏ au, người sực mùi dược thảo, tìm tới — Đan Sư Lưu Hỏa.'),
      L('npc', '"Tu tới Luyện Khí viên mãn mà muốn vào **Trúc Cơ**? Khó đấy! Cần căn cơ vững như bàn thạch." — lão xoa cằm. "Lên được Trúc Cơ, ta sẽ chỉ con nghề **luyện đan** — chế đan dược trợ tu, cứu mạng lúc độ kiếp."'),
      C('Bạn nói gì với Đan Sư?', [
        ['Xin tiền bối chỉ giáo!', '"Xin tiền bối chỉ giáo, vãn bối quyết không phụ lòng!" — bạn chắp tay.'],
        ['Luyện đan có khó không ạ?', '"Luyện đan… có khó lắm không tiền bối?" — bạn tò mò.'],
      ]),
      L('npc', '"Cứ lo tu cho tới Trúc Cơ cái đã, chuyện đan dược tính sau. Đi! Vượt qua cảnh giới này cho ta xem."'),
      T({ type: 'reach_realm', realm: 2, goal: 1 }, 'Tu luyện & độ kiếp cho tới khi đạt cảnh giới **🏛️ Trúc Cơ**.'),
      L('npc', '"Khá lắm! Căn cơ đã thành. Từ giờ con có thể bén duyên với **Luyện Đan** rồi đó." — Đan Sư Lưu Hỏa cười khà khà, ném cho bạn một lò đan cũ.'),
    ],
    reward: { tuVi: 200, stones: 40 },
  },

  // ============== CHƯƠNG (mới) — Bái Nhập Sư Môn (gia nhập môn phái) ==============
  {
    id: 'ch_nhap_mon',
    minRealm: 2,
    title: 'Bái Nhập Sư Môn',
    npc: { name: 'Chiêu Hiền Sứ', emoji: '📜' },
    scenes: [
      L('narrator', 'Vừa lập được căn cơ Trúc Cơ, danh tiếng đạo hữu đã vang tới các đại môn phái. Một ngày nọ, một vị sứ giả áo gấm tìm tới — Chiêu Hiền Sứ, người chuyên đi chiêu mộ hậu bối có tư chất.'),
      L('npc', '"Tu sĩ tán tu đơn độc khó đi xa. Có môn phái chống lưng, đạo hữu mới được truyền thụ **kỹ năng chiến đấu chân truyền**, có chỗ dựa khi hành tẩu giang hồ." — sứ giả mỉm cười, trải ra một cuộn danh sách các phái.'),
      C('Đạo hữu nghĩ sao?', [
        ['Ta muốn một môn phái mạnh về sát thương!', '"Ta muốn học sát chiêu lợi hại!" — đạo hữu hào hứng.'],
        ['Ta cần phái phòng thủ bền bỉ.', '"Ta thích lối đánh chắc chắn, bền bỉ." — đạo hữu trầm ngâm.'],
        ['Cho ta xem hết các phái đã.', '"Cứ cho ta xem hết rồi tính." — đạo hữu thận trọng.'],
      ]),
      L('npc', '"Mỗi phái một sở trường, không phái nào vô địch — quan trọng là hợp với đạo hữu. Hãy tới **panel Môn Phái** (hoặc gõ `/monphai`) xem kỹ rồi đặt **nguyện vọng** bái nhập."'),
      T({ type: 'pending_sect', goal: 1 }, 'Tới **panel Môn Phái** (hoặc `/monphai`) chọn **phái nguyện vọng**. *(Bấm "Kiểm tra tiến độ" sau khi đã chọn.)*'),
      L('npc', '"Đã chọn nguyện vọng rồi à? Chưa xong đâu — đệ tử nhập môn phải qua **nghi thức bái sư**, lập thệ trước tổ sư đường. Chuẩn bị tâm thế rồi tiến hành đi."'),
      T({ type: 'finalize_sect', goal: 1 }, 'Hoàn thành **nghi thức bái nhập sư môn** để chính thức trở thành đệ tử. *(Bấm nút bên dưới.)*'),
      L('npc', '"Hảo! Từ nay đạo hữu đã chính thức là đệ tử chân truyền. Hãy chăm rèn **`/kynang`** và thử sức ở **`/dautap`**. Tiền đồ vô lượng!" — Chiêu Hiền Sứ chắp tay cáo từ.'),
    ],
    reward: { tuVi: 300, stones: 60 },
  },

  // ============== CHƯƠNG 4 — Kim Đan: Ngưng Tụ Kim Đan ==============
  {
    id: 'ch04_kim_dan',
    minRealm: 2,
    title: 'Kim Đan Ngưng Tụ',
    npc: { name: 'Kiếm Tu Mặc Ảnh', emoji: '🗡️' },
    scenes: [
      L('narrator', 'Một bóng người áo đen lướt qua như gió, kiếm khí lạnh buốt. Kiếm Tu Mặc Ảnh dừng trước mặt bạn, đánh giá.'),
      L('npc', '"Trúc Cơ rồi à? Nhưng muốn dấn thân vào **bí cảnh** săn cơ duyên, ngươi phải ngưng tụ được **Kim Đan**. Yêu thú trong đó không nương tay đâu."'),
      T({ type: 'reach_realm', realm: 3, goal: 1 }, 'Tu luyện cho tới khi ngưng tụ thành công, đạt cảnh giới **🟡 Kim Đan**.'),
      L('npc', '"Kim Đan đã thành. Giờ ngươi đủ tư cách bước vào **Bí Cảnh** rồi." — Mặc Ảnh khẽ gật, ánh mắt bớt lạnh. "Vào đó cẩn thận. Cơ duyên và tử lộ chỉ cách nhau một bước."'),
    ],
    reward: { tuVi: 600, stones: 80 },
  },

  // ============== CHƯƠNG 5 — Nguyên Anh: Xuất Khiếu ==============
  {
    id: 'ch05_nguyen_anh',
    minRealm: 3,
    title: 'Nguyên Anh Xuất Khiếu',
    npc: { name: 'Tán Tu Cuồng Đao', emoji: '⚔️' },
    scenes: [
      L('npc', '"Hậu bối Kim Đan mà dám đứng trước mặt ta? Có chí khí!" — một hán tử vạm vỡ vác đại đao cười ha hả. "Muốn lên **đấu pháp** tỉ thí với cao thủ, trước hết hãy kết thành **Nguyên Anh** đi đã!"'),
      C('Bạn đáp lời Cuồng Đao?', [
        ['Vãn bối sẽ cố!', '"Vãn bối nhất định sẽ kết Nguyên Anh!" — bạn nghiến răng.'],
        ['Đấu pháp nguy hiểm không?', '"Đấu pháp… có mất mạng không tiền bối?" — bạn dè dặt.'],
      ]),
      T({ type: 'reach_realm', realm: 4, goal: 1 }, 'Tu luyện & độ kiếp cho tới khi kết thành **👶 Nguyên Anh**.'),
      L('npc', '"HA! Nguyên Anh xuất khiếu rồi! Từ nay sàn **Đấu Pháp** mở cửa đón ngươi. Nhớ tìm ta tỉ thí một trận!" — Cuồng Đao vỗ vai bạn muốn trẹo xương.'),
    ],
    reward: { tuVi: 2000, stones: 160 },
  },

  // ============== CHƯƠNG 6 — Hóa Thần: Nhập Tông Lập Phái ==============
  {
    id: 'ch06_hoa_than',
    minRealm: 4,
    title: 'Hóa Thần Trấn Phái',
    npc: { name: 'Tông Chủ Vân Hạc', emoji: '🏯' },
    scenes: [
      L('narrator', 'Một tiên hạc trắng đáp xuống, trên lưng là vị tông chủ phong thái như tiên — Vân Hạc chân nhân, người đứng đầu các môn phái trong vùng.'),
      L('npc', '"Đệ tử các phái nay đã nghe danh đạo hữu. Nếu đạo hữu kết thành **Hóa Thần**, sẽ đủ tư cách làm **trụ cột chân truyền** của môn phái mình." — Vân Hạc mỉm cười.'),
      T({ type: 'reach_realm', realm: 5, goal: 1 }, 'Tu luyện cho tới khi đạt cảnh giới **✨ Hóa Thần**.'),
      L('npc', '"Tuyệt diệu! Một thân Hóa Thần, đạo hữu nay là bậc cao thủ trấn phái. Cùng nhau, chúng ta sẽ vấn đỉnh đại đạo!" — Vân Hạc chắp tay, tiên phong đạo cốt.'),
      L('narrator', 'Con đường phía trước vẫn còn Luyện Hư, Đại Thừa, Độ Kiếp… và cuối cùng là phi thăng thành Tiên. Nhưng đó là chuyện của những chương sau.'),
    ],
    reward: { tuVi: 6000, stones: 320 },
  },

  // ============== CHƯƠNG 7 — Luyện Hư: Phá Hư Kiến Đạo ==============
  {
    id: 'ch07_luyen_hu',
    minRealm: 5,
    title: 'Luyện Hư Kiến Đạo',
    npc: { name: 'Hư Cảnh Chân Nhân', emoji: '🌀' },
    scenes: [
      L('narrator', 'Trời đất bỗng tĩnh lặng đến kỳ lạ. Trước mặt đạo hữu, không gian gợn sóng như mặt hồ, rồi một lão nhân thân ảnh hư ảo bước ra — Hư Cảnh Chân Nhân, người đã đứng ở đỉnh Luyện Hư hàng nghìn năm.'),
      L('npc', '"Hóa Thần là luyện thần, còn **Luyện Hư** là luyện cái *hư vô* — đem thần hồn hòa vào trời đất, lấy hư không làm đạo." — lão khẽ nói, giọng vọng từ tứ phương. "Tới được đây, ngươi mới chạm tới ngưỡng cửa của đại đạo chân chính."'),
      C('Đạo hữu hỏi điều gì?', [
        ['Hư vô là gì thưa tiền bối?', '"Hư vô… rốt cuộc là gì ạ?" — đạo hữu trầm tư, cảm thấy cả thân tâm như muốn tan vào mây gió.'],
        ['Vãn bối nguyện phá hư!', '"Vãn bối nguyện phá hư kiến đạo!" — đạo hữu chắp tay, đạo tâm kiên định.'],
      ]),
      L('npc', '"Đạo bất khả thuyết. Tự ngươi ngộ lấy. Hãy đem một thân tu vi mà nghiền ngẫm, đột phá lên **Luyện Hư** cho ta xem."'),
      T({ type: 'reach_realm', realm: 6, goal: 1 }, 'Tu luyện & độ kiếp cho tới khi đạt cảnh giới **🌀 Luyện Hư**.'),
      L('npc', '"Hảo! Thần hồn ngươi đã bắt đầu hòa vào hư không. Từ nay mỗi bước chân đều là đạp trên đại đạo." — Hư Cảnh Chân Nhân mỉm cười, thân ảnh dần tan vào không trung.'),
    ],
    reward: { tuVi: 12000, stones: 500 },
  },

  // ============== CHƯƠNG 8 — Đại Thừa: Công Đức Viên Mãn ==============
  {
    id: 'ch08_dai_thua',
    minRealm: 6,
    title: 'Đại Thừa Khí Tượng',
    npc: { name: 'Đại Thừa Thánh Giả', emoji: '☯️' },
    scenes: [
      L('narrator', 'Vạn vật quanh đạo hữu bỗng sinh cơ bừng nở — cỏ cây đâm chồi, chim muông tụ về. Một vị thánh giả khoác áo bào âm dương ung dung bước tới, mỗi bước chân nở một đóa kim liên.'),
      L('npc', '"Tu tới Luyện Hư, ngươi đã gần chạm đỉnh nhân gian. Nhưng **Đại Thừa** đòi hỏi không chỉ tu vi — mà cả **công đức và đạo tâm viên mãn**." — Thánh Giả ôn hòa. "Ngươi đã đi một chặng đường dài, sát khí và chấp niệm có còn vương trong tâm?"'),
      C('Đạo hữu đáp:', [
        ['Tâm ta đã tịnh.', '"Tâm vãn bối đã như nước lặng." — đạo hữu nhắm mắt, hồi tưởng cả hành trình đã qua.'],
        ['Ta vẫn còn chấp niệm…', '"Vãn bối… vẫn còn vài chấp niệm chưa buông." — đạo hữu thành thật, ánh mắt thoáng buồn.'],
      ]),
      L('npc', '"Thành thật là tốt. Đạo không sợ chấp niệm, chỉ sợ tự dối mình. Hãy mang đạo tâm ấy mà đột phá **Đại Thừa**."'),
      T({ type: 'reach_realm', realm: 7, goal: 1 }, 'Tu luyện & độ kiếp cho tới khi đạt cảnh giới **☯️ Đại Thừa**.'),
      L('npc', '"Lành thay! Một thân Đại Thừa, khí tượng bao trùm thiên địa. Chỉ còn một kiếp nạn cuối cùng ngăn ngươi với tiên đạo — **Độ Kiếp Phi Thăng**." — Thánh Giả chắp tay, kim liên rụng đầy đất.'),
    ],
    reward: { tuVi: 24000, stones: 800 },
  },

  // ============== CHƯƠNG 9 — Độ Kiếp: Thiên Kiếp Lâm Đầu ==============
  {
    id: 'ch09_do_kiep',
    minRealm: 7,
    title: 'Độ Kiếp Trùng Thiên',
    npc: { name: 'Lôi Kiếp Chân Quân', emoji: '⚡' },
    scenes: [
      L('narrator', 'Mây đen cuồn cuộn kéo tới, sấm chớp gầm vang xé toạc bầu trời. Giữa biển mây lôi đình, một bóng người khoác giáp sấm sét trầm giọng vọng xuống — Lôi Kiếp Chân Quân, kẻ đã chín lần vượt thiên kiếp.'),
      L('npc', '"Đại Thừa viên mãn rồi à? Vậy thì **Thiên Kiếp** sẽ tới tìm ngươi. Chín đạo lôi kiếp, mỗi đạo đủ sức nghiền nát một tòa núi." — Chân Quân nghiêm giọng. "Vượt qua, ngươi thành tiên. Bại, hồn phi phách tán. Ngươi có dám?"'),
      C('Đạo hữu đối mặt thiên kiếp:', [
        ['Ta đã sẵn sàng!', '"Cả đời tu hành chính là vì khoảnh khắc này — ta đã sẵn sàng!" — đạo hữu ngẩng đầu nhìn thẳng vào biển lôi đình.'],
        ['(siết chặt pháp bảo, hít sâu)', 'Đạo hữu lặng lẽ siết chặt pháp bảo, hít một hơi thật sâu, đạo tâm vững như bàn thạch.'],
      ]),
      L('npc', '"Tốt! Khí phách này mới xứng độ kiếp. Nhớ kỹ — chuẩn bị **đan hộ đạo** cho đủ. Đừng để thiên kiếp đoạt mạng ngươi ở bước cuối!" — Chân Quân lùi vào mây, nhường lại sàn đấu cho ngươi và trời cao.'),
      T({ type: 'reach_realm', realm: 8, goal: 1 }, 'Tu luyện & độ kiếp cho tới khi đạt cảnh giới **⚡ Độ Kiếp**.'),
      L('npc', '"NGƯƠI VƯỢT QUA RỒI!" — tiếng Chân Quân vang rền đầy kinh ngạc lẫn tán thưởng. "Một thân Độ Kiếp, chỉ còn nửa bước nữa là phi thăng. Cố lên, tiên vị đang chờ ngươi!"'),
    ],
    reward: { tuVi: 48000, stones: 1200 },
  },

  // ============== CHƯƠNG 10 — Tiên Nhân: Phi Thăng Đại Đạo ==============
  {
    id: 'ch10_tien_nhan',
    minRealm: 8,
    title: 'Phi Thăng Thành Tiên',
    npc: { name: 'Thiên Đạo', emoji: '🪙' },
    scenes: [
      L('narrator', 'Toàn bộ thiên địa rung chuyển. Một cây cầu cầu vồng bắc từ nhân gian lên chín tầng mây — Tiên Kiều. Hào quang vạn trượng đổ xuống thân đạo hữu, ấm áp mà thiêng liêng.'),
      L('npc', '"Tu sĩ tên kia — một đời từ phàm nhân tay trắng, trải bao gian khổ, nay đã đứng trước **Tiên Môn**." — một thanh âm vô hình vang lên từ khắp trời đất, đó là tiếng của Thiên Đạo. "Bước qua cây cầu này, ngươi sẽ rời bỏ phàm trần, chính thức liệt vào tiên ban."'),
      C('Trước khi phi thăng, đạo hữu nghĩ về điều gì?', [
        ['Nhớ về sư phụ Thanh Vân Tử.', 'Đạo hữu mỉm cười, nhớ về lão đạo nhân năm xưa đã dúi cho mình túi linh thạch đầu tiên trên sườn núi Thanh Vân.'],
        ['Nhớ cả chặng đường đã qua.', 'Cả hành trình hiện về trong khoảnh khắc — từ sợi linh khí đầu tiên, tới thiên kiếp vừa vượt qua. Một đời tu hành, không hề uổng phí.'],
        ['Hướng về tiên đạo phía trước.', 'Đạo hữu không ngoảnh lại, ánh mắt kiên định hướng thẳng lên chín tầng trời — đại đạo vô tận đang vẫy gọi.'],
      ]),
      L('npc', '"Đạo tâm viên mãn, nhân quả vẹn tròn. Hãy bước đi, **Tiên Nhân**." — Thiên Đạo phán, Tiên Kiều bừng sáng chói lòa.'),
      T({ type: 'reach_realm', realm: 9, goal: 1 }, 'Hoàn tất bước cuối cùng, đột phá lên cảnh giới tối cao **🪙 Tiên Nhân**.'),
      L('narrator', 'Đạo hữu bước lên Tiên Kiều, thân thể hóa thành một luồng tiên quang vút lên chín tầng mây. Phàm trần lùi lại phía sau. Từ hôm nay, thiên hạ lưu truyền về một truyền kỳ — kẻ phàm nhân tay trắng năm xưa, nay đã thành **Cửu Thiên Tiên Nhân**.'),
      L('me', '"Đại đạo vô tận… ta đến đây!" — tiếng cười sảng khoái vang vọng khắp chín tầng trời.'),
    ],
    reward: { tuVi: 100000, stones: 2000 },
  },
];

// --- Helpers (thuần) ---
const byId = new Map(CHAPTERS.map((c) => [c.id, c]));

function getChapter(id) {
  return byId.get(id);
}
function firstChapter() {
  return CHAPTERS[0];
}
function chapterIndex(id) {
  return CHAPTERS.findIndex((c) => c.id === id);
}
function chapterNumber(id) {
  const i = chapterIndex(id);
  return i < 0 ? 0 : i + 1;
}
function nextChapter(id) {
  const i = chapterIndex(id);
  return i < 0 ? null : CHAPTERS[i + 1] || null;
}
function sceneCount(ch) {
  return ch ? ch.scenes.length : 0;
}
function sceneAt(ch, idx) {
  return ch && ch.scenes ? ch.scenes[idx] : null;
}

module.exports = {
  CHAPTERS,
  total: CHAPTERS.length,
  getChapter,
  firstChapter,
  chapterIndex,
  chapterNumber,
  nextChapter,
  sceneCount,
  sceneAt,
};
