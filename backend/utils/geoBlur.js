const crypto = require('crypto');
const { GEO_BLUR_SECRET } = require('../config/constants');

/**
 * Làm lệch tọa độ một khoảng nhỏ (~400m - 900m) một cách nhất quán theo ID điểm cứu trợ
 * nhằm bảo vệ vị trí nhạy cảm khi trả dữ liệu cho người dùng thường / khách.
 */
function blurCoordinates(pinId, lat, lng) {
    const hash = crypto
        .createHmac('sha256', GEO_BLUR_SECRET)
        .update(`pin:${pinId}`)
        .digest();

    // Lấy giá trị từ 0.0035 đến 0.0065 độ (~390m - 720m theo mỗi trục)
    const latFraction = hash.readUInt32BE(0) / 0xffffffff;
    const lngFraction = hash.readUInt32BE(4) / 0xffffffff;

    const latSign = (hash[8] & 1) === 0 ? 1 : -1;
    const lngSign = (hash[9] & 1) === 0 ? 1 : -1;

    const dLat = latSign * (0.0035 + latFraction * 0.003);
    const dLng = lngSign * (0.0035 + lngFraction * 0.003);

    const blurredLat = Math.max(-89.999999, Math.min(89.999999, Number(lat) + dLat));
    const blurredLng = Math.max(-179.999999, Math.min(179.999999, Number(lng) + dLng));

    return {
        lat: Number(blurredLat.toFixed(6)),
        lng: Number(blurredLng.toFixed(6))
    };
}

module.exports = {
    blurCoordinates
};
