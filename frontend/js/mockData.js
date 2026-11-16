/**
 * Dữ liệu mẫu (Mock Data) cho hệ thống Animal Rescue Map - Khu vực Đà Nẵng.
 * Cung cấp sẵn 4 điểm cứu trợ mẫu cùng hình ảnh minh họa SVG tích hợp sẵn
 * để hoạt động ổn định trong mọi môi trường (kể cả ngoại tuyến).
 */
(function (global) {
    'use strict';

    /**
     * Chuyển chuỗi SVG thành Data URI hợp lệ cho thẻ <img>.
     * @param {string} svg
     * @returns {string}
     */
    function svgToDataUri(svg) {
        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
    }

    /**
     * Hình minh họa SVG cho các ca cứu trợ mẫu và ảnh mặc định theo loại động vật.
     */
    var SAMPLE_IMAGES = {
        dogDragonBridge: svgToDataUri(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
            '<defs>' +
            '<linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#fde68a"/><stop offset="65%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#93c5fd"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="640" height="400" fill="url(#sky1)"/>' +
            '<rect y="275" width="640" height="125" fill="#38bdf8" opacity="0.45"/>' +
            '<path d="M40 275 Q160 190 280 275 Q400 190 520 275 L600 275" fill="none" stroke="#eab308" stroke-width="10" stroke-linecap="round" opacity="0.85"/>' +
            '<rect y="310" width="640" height="90" fill="#e2e8f0"/>' +
            '<ellipse cx="320" cy="340" rx="115" ry="18" fill="#cbd5e1"/>' +
            // Puppy body
            '<ellipse cx="320" cy="270" rx="68" ry="52" fill="#d97706"/>' +
            '<ellipse cx="320" cy="280" rx="42" ry="38" fill="#fef3c7"/>' +
            // Front legs (one with rescue bandage)
            '<rect x="275" y="295" width="22" height="46" rx="11" fill="#b45309"/>' +
            '<rect x="342" y="295" width="22" height="46" rx="11" fill="#b45309"/>' +
            '<rect x="341" y="312" width="24" height="16" rx="4" fill="#ffffff" stroke="#ef4444" stroke-width="2"/>' +
            '<path d="M353 315 v10 M348 320 h10" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>' +
            // Puppy head & ears
            '<ellipse cx="268" cy="182" rx="22" ry="42" transform="rotate(18 268 182)" fill="#92400e"/>' +
            '<ellipse cx="372" cy="182" rx="22" ry="42" transform="rotate(-18 372 182)" fill="#92400e"/>' +
            '<circle cx="320" cy="188" r="56" fill="#f59e0b"/>' +
            '<ellipse cx="320" cy="204" rx="34" ry="26" fill="#fef3c7"/>' +
            '<circle cx="298" cy="176" r="7.5" fill="#1e293b"/>' +
            '<circle cx="342" cy="176" r="7.5" fill="#1e293b"/>' +
            '<circle cx="300" cy="173" r="2.5" fill="#ffffff"/>' +
            '<circle cx="344" cy="173" r="2.5" fill="#ffffff"/>' +
            '<ellipse cx="320" cy="197" rx="11" ry="8" fill="#1e293b"/>' +
            '<path d="M310 212 Q320 220 330 212" fill="none" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>' +
            '<text x="24" y="42" font-family="sans-serif" font-size="18" font-weight="700" fill="#7f1d1d">Khu vực Cầu Rồng • Đà Nẵng</text>' +
            '</svg>'
        ),

        catPark: svgToDataUri(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
            '<defs>' +
            '<linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#dcfce7"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="640" height="400" fill="url(#sky2)"/>' +
            '<circle cx="110" cy="240" r="85" fill="#86efac"/>' +
            '<circle cx="530" cy="230" r="95" fill="#4ade80" opacity="0.65"/>' +
            '<rect y="285" width="640" height="115" fill="#bbf7d0"/>' +
            '<ellipse cx="320" cy="342" rx="105" ry="18" fill="#86efac"/>' +
            // Cat tail & body
            '<path d="M375 315 Q445 305 435 250" fill="none" stroke="#64748b" stroke-width="18" stroke-linecap="round"/>' +
            '<ellipse cx="320" cy="272" rx="62" ry="56" fill="#94a3b8"/>' +
            '<ellipse cx="320" cy="285" rx="36" ry="38" fill="#f1f5f9"/>' +
            // Collar
            '<path d="M276 226 Q320 244 364 226" fill="none" stroke="#f97316" stroke-width="10" stroke-linecap="round"/>' +
            // Cat head & ears
            '<polygon points="268,162 280,104 312,142" fill="#64748b"/>' +
            '<polygon points="372,162 360,104 328,142" fill="#64748b"/>' +
            '<polygon points="276,154 284,118 304,142" fill="#fda4af"/>' +
            '<polygon points="364,154 356,118 336,142" fill="#fda4af"/>' +
            '<circle cx="320" cy="182" r="52" fill="#94a3b8"/>' +
            // Stripes
            '<path d="M312 134 v16 M320 132 v18 M328 134 v16" stroke="#475569" stroke-width="4" stroke-linecap="round"/>' +
            // Eyes & whiskers
            '<ellipse cx="299" cy="176" rx="8" ry="9" fill="#10b981"/>' +
            '<ellipse cx="341" cy="176" rx="8" ry="9" fill="#10b981"/>' +
            '<circle cx="299" cy="176" r="4" fill="#0f172a"/>' +
            '<circle cx="341" cy="176" r="4" fill="#0f172a"/>' +
            '<polygon points="314,191 326,191 320,198" fill="#fb7185"/>' +
            '<path d="M262 188 h26 M260 198 h28 M352 188 h26 M352 198 h28" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>' +
            '<text x="24" y="42" font-family="sans-serif" font-size="18" font-weight="700" fill="#166534">Công viên 29/3 • Thanh Khê</text>' +
            '</svg>'
        ),

        otherRabbitCare: svgToDataUri(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
            '<defs>' +
            '<linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#e0f2fe"/><stop offset="100%" stop-color="#fef2f2"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="640" height="400" fill="url(#bg3)"/>' +
            '<rect y="290" width="640" height="110" fill="#fed7aa" opacity="0.6"/>' +
            // Care cross badge
            '<circle cx="555" cy="70" r="34" fill="#ffffff" stroke="#ef4444" stroke-width="3"/>' +
            '<path d="M555 52 v36 M537 70 h36" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>' +
            '<ellipse cx="320" cy="340" rx="100" ry="16" fill="#fdba74" opacity="0.5"/>' +
            // Rabbit ears
            '<ellipse cx="294" cy="112" rx="18" ry="56" transform="rotate(-10 294 112)" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>' +
            '<ellipse cx="346" cy="112" rx="18" ry="56" transform="rotate(10 346 112)" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>' +
            '<ellipse cx="294" cy="116" rx="9" ry="38" transform="rotate(-10 294 116)" fill="#fecdd3"/>' +
            '<ellipse cx="346" cy="116" rx="9" ry="38" transform="rotate(10 346 116)" fill="#fecdd3"/>' +
            // Rabbit body & head
            '<ellipse cx="320" cy="276" rx="64" ry="54" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>' +
            '<circle cx="320" cy="192" r="48" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>' +
            '<circle cx="301" cy="186" r="6" fill="#1e293b"/>' +
            '<circle cx="339" cy="186" r="6" fill="#1e293b"/>' +
            '<ellipse cx="288" cy="202" rx="9" ry="5" fill="#fecdd3"/>' +
            '<ellipse cx="352" cy="202" rx="9" ry="5" fill="#fecdd3"/>' +
            '<polygon points="315,198 325,198 320,204" fill="#fb7185"/>' +
            '<path d="M310 212 Q320 218 330 212" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>' +
            '<text x="24" y="42" font-family="sans-serif" font-size="18" font-weight="700" fill="#991b1b">Trạm chăm sóc Sơn Trà • Đà Nẵng</text>' +
            '</svg>'
        ),

        dogCompleted: svgToDataUri(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
            '<defs>' +
            '<linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#dcfce7"/><stop offset="100%" stop-color="#bbf7d0"/>' +
            '</linearGradient>' +
            '</defs>' +
            '<rect width="640" height="400" fill="url(#bg4)"/>' +
            '<circle cx="555" cy="70" r="34" fill="#16a34a"/>' +
            '<path d="M539 70 l11 11 l22 -22" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<ellipse cx="320" cy="340" rx="105" ry="18" fill="#86efac"/>' +
            // Happy Poodle
            '<ellipse cx="320" cy="272" rx="64" ry="54" fill="#a16207"/>' +
            '<circle cx="272" cy="186" r="24" fill="#854d0e"/>' +
            '<circle cx="368" cy="186" r="24" fill="#854d0e"/>' +
            '<circle cx="270" cy="212" r="20" fill="#854d0e"/>' +
            '<circle cx="370" cy="212" r="20" fill="#854d0e"/>' +
            '<circle cx="320" cy="184" r="52" fill="#ca8a04"/>' +
            '<circle cx="320" cy="142" r="28" fill="#eab308"/>' +
            '<circle cx="299" cy="180" r="7" fill="#1e293b"/>' +
            '<circle cx="341" cy="180" r="7" fill="#1e293b"/>' +
            '<ellipse cx="320" cy="196" rx="10" ry="7" fill="#1e293b"/>' +
            '<path d="M306 210 Q320 226 334 210" fill="none" stroke="#713f12" stroke-width="3.5" stroke-linecap="round"/>' +
            '<path d="M276 232 Q320 250 364 232" fill="none" stroke="#16a34a" stroke-width="10" stroke-linecap="round"/>' +
            '<circle cx="320" cy="245" r="10" fill="#fef08a"/>' +
            '<text x="24" y="42" font-family="sans-serif" font-size="18" font-weight="700" fill="#14532d">Đã đoàn tụ cùng chủ • Ngũ Hành Sơn</text>' +
            '</svg>'
        ),

        fallbackOther: svgToDataUri(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
            '<rect width="640" height="400" fill="#f1f5f9"/>' +
            '<circle cx="320" cy="175" r="68" fill="#cbd5e1"/>' +
            '<circle cx="275" cy="138" r="18" fill="#94a3b8"/>' +
            '<circle cx="320" cy="120" r="18" fill="#94a3b8"/>' +
            '<circle cx="365" cy="138" r="18" fill="#94a3b8"/>' +
            '<ellipse cx="320" cy="188" rx="34" ry="28" fill="#64748b"/>' +
            '<text x="320" y="300" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#475569">Báo cáo cứu trợ động vật</text>' +
            '</svg>'
        )
    };

    /**
     * Trả về ảnh mặc định phù hợp với loại động vật nếu người dùng không tải ảnh lên.
     * @param {string} animalType
     * @returns {string}
     */
    function getDefaultImageForAnimal(animalType) {
        if (animalType === 'Chó') return SAMPLE_IMAGES.dogDragonBridge;
        if (animalType === 'Mèo') return SAMPLE_IMAGES.catPark;
        return SAMPLE_IMAGES.fallbackOther;
    }

    /**
     * 4 điểm cứu trợ mẫu mặc định tại khu vực Đà Nẵng.
     * Quy ước:
     * - status: 'pending' (Đang chờ cứu trợ) | 'treating' (Đang điều trị) | 'completed' (Hoàn thành)
     * - urgency: 'urgent' (Khẩn cấp - Pin Đỏ) | 'normal' (Thông thường - Pin Cam)
     * - Khi status === 'completed', pin luôn hiển thị màu Xanh (Đã hoàn thành).
     */
    var INITIAL_RESCUE_POINTS = [
        {
            id: 1,
            title: 'Chó con bị thương gần Cầu Rồng',
            animalType: 'Chó',
            urgency: 'urgent',
            status: 'pending',
            lat: 16.0611,
            lng: 108.2236,
            address: 'Công viên bờ Tây Cầu Rồng, Hải Châu, Đà Nẵng',
            description: 'Phát hiện một chú chó ta khoảng 4 tháng tuổi bị thương ở chân sau, đi khập khiễng và trốn dưới gầm ghế đá gần bờ Tây Cầu Rồng. Bé khá nhát nhưng hiền, cần hỗ trợ đưa đi kiểm tra thú y gấp.',
            image: SAMPLE_IMAGES.dogDragonBridge,
            createdAt: '15 phút trước',
            comments: [
                {
                    id: 101,
                    author: 'Minh Anh',
                    time: '10 phút trước',
                    text: 'Mình vừa đi ngang qua thấy bé vẫn ở gần khu vực tượng Cá Chép Hóa Rồng, đã để lại ít nước sạch cho bé.'
                },
                {
                    id: 102,
                    author: 'Đội Cứu Hộ Hải Châu',
                    time: '4 phút trước',
                    text: 'Nhóm tình nguyện viên đã tiếp nhận ca này và đang trên đường mang lồng vận chuyển tới hiện trường.'
                }
            ]
        },
        {
            id: 2,
            title: 'Mèo mướp đi lạc tại Công viên 29/3',
            animalType: 'Mèo',
            urgency: 'normal',
            status: 'pending',
            lat: 16.0649,
            lng: 108.2028,
            address: 'Cổng Nguyễn Tri Phương, Công viên 29/3, Thanh Khê, Đà Nẵng',
            description: 'Bé mèo mướp nặng khoảng 2kg, có vòng cổ cũ bị đứt, đi lạc quanh bãi giữ xe cổng công viên 29/3. Bé khỏe mạnh, dạn người nhưng chưa tìm thấy chủ, cần người hỗ trợ giữ tạm.',
            image: SAMPLE_IMAGES.catPark,
            createdAt: '1 giờ trước',
            comments: [
                {
                    id: 201,
                    author: 'Thanh Tùng',
                    time: '35 phút trước',
                    text: 'Bé rất ngoan và biết ăn hạt. Bạn nào ở khu vực Thanh Khê ghé đón bé giúp mình nhé.'
                }
            ]
        },
        {
            id: 3,
            title: 'Thỏ trắng suy nhược đang được chăm sóc',
            animalType: 'Khác',
            urgency: 'urgent',
            status: 'treating',
            lat: 16.0604,
            lng: 108.2468,
            address: 'Gần bãi biển Mỹ Khê, đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
            description: 'Chú thỏ trắng được người dân phát hiện trong bụi cây ven đường Võ Nguyên Giáp trong tình trạng mất nước và trầy xước nhẹ ở tai. Hiện bé đã được đưa về điểm chăm sóc tại Sơn Trà để theo dõi.',
            image: SAMPLE_IMAGES.otherRabbitCare,
            createdAt: '3 giờ trước',
            comments: [
                {
                    id: 301,
                    author: 'Bác sĩ Thú y Lan',
                    time: '2 giờ trước',
                    text: 'Bé đã được truyền dịch bù nước và sát trùng vết thương, hiện nhịp thở ổn định hơn.'
                },
                {
                    id: 302,
                    author: 'Hoàng Nam',
                    time: '1 giờ trước',
                    text: 'Cảm ơn đội ngũ thú y và các bạn tình nguyện viên rất nhiều!'
                }
            ]
        },
        {
            id: 4,
            title: 'Chó Poodle lạc đã hồi phục và về nhà',
            animalType: 'Chó',
            urgency: 'normal',
            status: 'completed',
            lat: 16.0218,
            lng: 108.2485,
            address: 'Khu vực đường Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
            description: 'Chú chó Poodle nâu bị lạc sau cơn mưa lớn tại ngã tư Lê Văn Hiến - Minh Mạng. Sau 2 ngày được sưởi ấm, điều trị cảm lạnh và đăng tin tìm chủ, bé đã khỏe mạnh và đoàn tụ cùng gia đình.',
            image: SAMPLE_IMAGES.dogCompleted,
            createdAt: '1 ngày trước',
            comments: [
                {
                    id: 401,
                    author: 'Chị Hương (Chủ bé)',
                    time: '12 giờ trước',
                    text: 'Gia đình xin cảm ơn cộng đồng Animal Rescue Map Đà Nẵng đã cứu giúp và chăm sóc bé Bông chu đáo!'
                }
            ]
        }
    ];

    global.ANIMAL_RESCUE_MOCK = {
        DANANG_CENTER: [16.048, 108.225],
        DEFAULT_ZOOM: 13,
        INITIAL_RESCUE_POINTS: INITIAL_RESCUE_POINTS,
        getDefaultImageForAnimal: getDefaultImageForAnimal
    };
})(window);
