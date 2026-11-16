/**
 * Animal Rescue Map - Logic chính (Vanilla JS + Leaflet.js + Bootstrap 5)
 * Quản lý bản đồ Đà Nẵng, bộ lọc trạng thái, định vị GPS,
 * tạo báo cáo mới (Modal + chọn vị trí trên bản đồ) và xem chi tiết (Offcanvas).
 */
(function () {
    'use strict';

    var MOCK = window.ANIMAL_RESCUE_MOCK || {
        DANANG_CENTER: [16.048, 108.225],
        DEFAULT_ZOOM: 13,
        INITIAL_RESCUE_POINTS: [],
        getDefaultImageForAnimal: function () { return ''; }
    };

    var STATUS_META = {
        pending: { label: 'Đang chờ cứu trợ', badgeClass: 'text-bg-danger' },
        treating: { label: 'Đang điều trị', badgeClass: 'text-bg-warning text-dark' },
        completed: { label: 'Hoàn thành', badgeClass: 'text-bg-success' }
    };

    var URGENCY_META = {
        urgent: { label: 'Khẩn cấp', badgeClass: 'text-bg-danger' },
        normal: { label: 'Thông thường', badgeClass: 'text-bg-warning text-dark' }
    };

    var PIN_COLORS = {
        urgent: '#dc3545',
        normal: '#f97316',
        completed: '#16a34a'
    };

    // Trạng thái ứng dụng
    var rescuePoints = cloneInitialPoints(MOCK.INITIAL_RESCUE_POINTS);
    var activeFilter = 'all';
    var activeDetailId = null;
    var isPickingLocation = false;
    var isHidingForPick = false;
    var resumeModalAfterHide = false;
    var uploadedImageDataUrl = '';
    var nextPointId = getNextId(rescuePoints);

    // Các đối tượng Leaflet & Bootstrap
    var map = null;
    var markersLayer = null;
    var userLocationMarker = null;
    var userAccuracyCircle = null;
    var tempPickMarker = null;
    var reportModal = null;
    var rescueOffcanvas = null;

    // Phần tử DOM
    var el = {};

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        cacheDomElements();
        initBootstrapComponents();
        renderNavbarAuth();
        initMap();
        bindEvents();
        updateFilterCounts();
        renderMarkers();
    }

    function cloneInitialPoints(points) {
        return points.map(function (point) {
            return Object.assign({}, point, {
                comments: Array.isArray(point.comments)
                    ? point.comments.map(function (c) { return Object.assign({}, c); })
                    : []
            });
        });
    }

    function getNextId(points) {
        var maxId = 0;
        points.forEach(function (p) {
            if (p.id > maxId) maxId = p.id;
        });
        return maxId + 1;
    }

    function cacheDomElements() {
        el.map = document.getElementById('map');
        el.filterGroup = document.getElementById('statusFilterGroup');
        el.btnMyLocation = document.getElementById('btnMyLocation');
        el.myLocationSpinner = document.getElementById('myLocationSpinner');
        el.myLocationIcon = document.getElementById('myLocationIcon');
        el.myLocationText = document.getElementById('myLocationText');

        // Navbar Auth elements
        el.navGuestArea = document.getElementById('navGuestArea');
        el.navUserArea = document.getElementById('navUserArea');
        el.navUserName = document.getElementById('navUserName');
        el.btnNavAdmin = document.getElementById('btnNavAdmin');
        el.btnNavLogout = document.getElementById('btnNavLogout');

        el.pickingBanner = document.getElementById('pickingBanner');
        el.btnCancelPick = document.getElementById('btnCancelPick');
        el.btnOpenReportModal = document.getElementById('btnOpenReportModal');
        el.mapLegend = document.querySelector('.map-legend');

        // Modal elements
        el.reportModal = document.getElementById('reportModal');
        el.reportForm = document.getElementById('reportForm');
        el.reportDescription = document.getElementById('reportDescription');
        el.reportAddress = document.getElementById('reportAddress');
        el.reportImage = document.getElementById('reportImage');
        el.imageError = document.getElementById('imageError');
        el.imagePreviewWrapper = document.getElementById('imagePreviewWrapper');
        el.imagePreview = document.getElementById('imagePreview');
        el.btnClearImage = document.getElementById('btnClearImage');
        el.btnGetGpsInModal = document.getElementById('btnGetGpsInModal');
        el.modalGpsSpinner = document.getElementById('modalGpsSpinner');
        el.btnPickOnMap = document.getElementById('btnPickOnMap');
        el.reportLat = document.getElementById('reportLat');
        el.reportLng = document.getElementById('reportLng');
        el.locationStatusBox = document.getElementById('locationStatusBox');
        el.locationStatusText = document.getElementById('locationStatusText');
        el.locationError = document.getElementById('locationError');

        // Offcanvas elements
        el.rescueOffcanvas = document.getElementById('rescueOffcanvas');
        el.detailAnimalBadge = document.getElementById('detailAnimalBadge');
        el.detailTitle = document.getElementById('detailTitle');
        el.detailImage = document.getElementById('detailImage');
        el.detailUrgencyBadge = document.getElementById('detailUrgencyBadge');
        el.detailStatusBadge = document.getElementById('detailStatusBadge');
        el.detailStatusSelect = document.getElementById('detailStatusSelect');
        el.detailAddress = document.getElementById('detailAddress');
        el.detailCoords = document.getElementById('detailCoords');
        el.detailTime = document.getElementById('detailTime');
        el.detailDescription = document.getElementById('detailDescription');
        el.btnGoogleMaps = document.getElementById('btnGoogleMaps');
        el.detailCommentCount = document.getElementById('detailCommentCount');
        el.commentList = document.getElementById('commentList');
        el.commentForm = document.getElementById('commentForm');
        el.commentAuthor = document.getElementById('commentAuthor');
        el.commentText = document.getElementById('commentText');

        el.toastContainer = document.getElementById('toastContainer');
    }

    function initBootstrapComponents() {
        reportModal = new bootstrap.Modal(el.reportModal);
        rescueOffcanvas = new bootstrap.Offcanvas(el.rescueOffcanvas);
    }

    function initMap() {
        map = L.map('map', {
            center: MOCK.DANANG_CENTER,
            zoom: MOCK.DEFAULT_ZOOM,
            zoomControl: false
        });

        // Đặt nút zoom ở góc trên bên phải để tránh đè nút nổi góc dưới phải
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Sử dụng Leaflet.markercluster để tự động gom cụm các điểm gần nhau khi thu nhỏ bản đồ
        markersLayer = typeof L.markerClusterGroup === 'function'
            ? L.markerClusterGroup({
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                maxClusterRadius: 55,
                disableClusteringAtZoom: 16
            })
            : L.layerGroup();
        markersLayer.addTo(map);

        map.on('click', function (event) {
            if (!isPickingLocation) return;
            finishPickingLocation(event.latlng.lat, event.latlng.lng, 'Đã chọn vị trí trên bản đồ');
        });

        window.addEventListener('resize', function () {
            if (map) {
                map.invalidateSize();
            }
        });
    }

    function bindEvents() {
        // Bộ lọc trạng thái trên Navbar
        el.filterGroup.addEventListener('click', function (event) {
            var btn = event.target.closest('.filter-btn');
            if (!btn) return;

            var status = btn.getAttribute('data-status');
            if (!status || status === activeFilter) return;

            activeFilter = status;
            syncFilterButtons();
            renderMarkers();
        });

        // Nút "Vị trí của tôi" trên Navbar
        el.btnMyLocation.addEventListener('click', handleLocateUserOnNavbar);

        // Nút "Đăng xuất" trên Navbar
        if (el.btnNavLogout) {
            el.btnNavLogout.addEventListener('click', handleNavLogout);
        }

        // Đồng bộ trạng thái đăng nhập nếu localStorage thay đổi ở tab khác
        window.addEventListener('storage', renderNavbarAuth);

        // Nút nổi "+ Báo cáo cứu trợ"
        el.btnOpenReportModal.addEventListener('click', function () {
            reportModal.show();
        });

        // Lấy GPS trong Modal
        el.btnGetGpsInModal.addEventListener('click', handleGetGpsInModal);

        // Chọn trực tiếp trên bản đồ từ Modal
        el.btnPickOnMap.addEventListener('click', startPickingLocation);

        // Hủy chế độ chọn vị trí trên bản đồ
        el.btnCancelPick.addEventListener('click', cancelPickingLocation);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isPickingLocation) {
                cancelPickingLocation();
            }
        });

        // Khi đóng Modal báo cáo (nếu không phải đang chuyển sang chọn bản đồ)
        el.reportModal.addEventListener('hidden.bs.modal', function () {
            if (isHidingForPick) {
                isHidingForPick = false;
                if (resumeModalAfterHide) {
                    resumeModalAfterHide = false;
                    reportModal.show();
                }
                return;
            }
            if (!isPickingLocation) {
                resetReportForm();
            }
        });

        // Chọn file ảnh & xem trước ảnh
        el.reportImage.addEventListener('change', handleImageChange);
        el.btnClearImage.addEventListener('click', clearImageSelection);

        // Gửi form báo cáo mới
        el.reportForm.addEventListener('submit', handleReportSubmit);

        // Cập nhật trạng thái điểm cứu trợ trong Offcanvas
        el.detailStatusSelect.addEventListener('change', handleStatusUpdate);

        // Gửi bình luận trong Offcanvas
        el.commentForm.addEventListener('submit', handleCommentSubmit);
    }

    /* --------------------------------------------------------------------------
       Hiển thị & Lọc Marker trên Bản đồ
       -------------------------------------------------------------------------- */

    function getPinColor(point) {
        if (point.status === 'completed') return PIN_COLORS.completed;
        return point.urgency === 'urgent' ? PIN_COLORS.urgent : PIN_COLORS.normal;
    }

    function getPinInnerIconSvg(point) {
        if (point.status === 'completed') {
            return '<path d="M14.5 19.5l2.5 2.5 5-5" fill="none" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
        }
        if (point.animalType === 'Chó') {
            return '<circle cx="15" cy="17.5" r="1.4" fill="#1e293b"/><circle cx="21" cy="17.5" r="1.4" fill="#1e293b"/><ellipse cx="18" cy="20.5" rx="2.8" ry="2.2" fill="#1e293b"/>';
        }
        if (point.animalType === 'Mèo') {
            return '<path d="M13.5 16.5l1.6-2.8 2.2 2h1.4l2.2-2 1.6 2.8v3.6a4.5 4.5 0 0 1-9 0z" fill="#1e293b"/>';
        }
        return '<circle cx="18" cy="18.5" r="3.4" fill="#1e293b"/>';
    }

    function createRescuePinIcon(point) {
        var color = getPinColor(point);
        var isUrgentActive = point.status !== 'completed' && point.urgency === 'urgent';
        var pulseClass = isUrgentActive ? ' rescue-pin-urgent' : '';
        var innerSvg = getPinInnerIconSvg(point);

        var html =
            '<div class="rescue-pin' + pulseClass + '">' +
                '<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M18 2C9.16 2 2 9.16 2 18c0 11.4 16 26 16 26s16-14.6 16-26C34 9.16 26.84 2 18 2z" fill="' + color + '" stroke="#ffffff" stroke-width="2.5"/>' +
                    '<circle cx="18" cy="18" r="8.2" fill="#ffffff"/>' +
                    innerSvg +
                '</svg>' +
            '</div>';

        return L.divIcon({
            className: 'rescue-pin-icon',
            html: html,
            iconSize: [36, 46],
            iconAnchor: [18, 46],
            tooltipAnchor: [0, -40]
        });
    }

    function createTooltipNode(point) {
        var wrapper = document.createElement('div');
        wrapper.className = 'small fw-semibold';

        var titleSpan = document.createElement('span');
        titleSpan.textContent = point.animalType + ' • ' + (STATUS_META[point.status] ? STATUS_META[point.status].label : '');

        wrapper.appendChild(titleSpan);
        return wrapper;
    }

    function renderMarkers() {
        markersLayer.clearLayers();

        var filtered = rescuePoints.filter(function (point) {
            return activeFilter === 'all' || point.status === activeFilter;
        });

        var markerInstances = [];

        filtered.forEach(function (point) {
            var marker = L.marker([point.lat, point.lng], {
                icon: createRescuePinIcon(point),
                title: point.title
            });

            marker.bindTooltip(createTooltipNode(point), {
                direction: 'top',
                opacity: 0.96
            });

            marker.on('click', function (event) {
                if (isPickingLocation) {
                    finishPickingLocation(event.latlng.lat, event.latlng.lng, 'Đã chọn vị trí trên bản đồ');
                    return;
                }
                openRescueDetail(point.id);
            });

            markerInstances.push(marker);
        });

        if (typeof markersLayer.addLayers === 'function') {
            markersLayer.addLayers(markerInstances);
        } else {
            markerInstances.forEach(function (marker) {
                markersLayer.addLayer(marker);
            });
        }
    }

    function syncFilterButtons() {
        var buttons = el.filterGroup.querySelectorAll('.filter-btn');
        buttons.forEach(function (btn) {
            var isMatch = btn.getAttribute('data-status') === activeFilter;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-pressed', String(isMatch));
        });
    }

    function updateFilterCounts() {
        var counts = {
            all: rescuePoints.length,
            pending: 0,
            treating: 0,
            completed: 0
        };

        rescuePoints.forEach(function (point) {
            if (counts[point.status] !== undefined) {
                counts[point.status] += 1;
            }
        });

        Object.keys(counts).forEach(function (key) {
            var badge = el.filterGroup.querySelector('[data-count="' + key + '"]');
            if (badge) {
                badge.textContent = String(counts[key]);
            }
        });
    }

    /* --------------------------------------------------------------------------
       HTML5 Geolocation API ("Vị trí của tôi" & lấy GPS trong Modal)
       -------------------------------------------------------------------------- */

    function getGeolocationErrorMessage(error) {
        if (!error) return 'Không thể xác định vị trí GPS.';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Bạn đã từ chối quyền truy cập vị trí. Hãy cấp quyền hoặc chọn điểm trên bản đồ.';
            case error.POSITION_UNAVAILABLE:
                return 'Không có tín hiệu vị trí hiện tại. Vui lòng thử lại hoặc chấm điểm trên bản đồ.';
            case error.TIMEOUT:
                return 'Hết thời gian chờ lấy tọa độ GPS. Vui lòng thử lại.';
            default:
                return 'Không thể lấy tọa độ GPS lúc này.';
        }
    }

    function setNavbarLocateLoading(isLoading) {
        el.btnMyLocation.disabled = isLoading;
        el.myLocationSpinner.classList.toggle('d-none', !isLoading);
        el.myLocationIcon.classList.toggle('d-none', isLoading);
        el.myLocationText.textContent = isLoading ? 'Đang định vị...' : 'Vị trí của tôi';
    }

    function updateUserLocationMarker(lat, lng, accuracy) {
        if (userLocationMarker) {
            userLocationMarker.setLatLng([lat, lng]);
        } else {
            var userIcon = L.divIcon({
                className: 'user-location-icon',
                html: '<div class="user-location-dot" title="Vị trí của bạn"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });
            userLocationMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 900 })
                .bindTooltip('Vị trí của bạn', { direction: 'top', offset: [0, -10] })
                .addTo(map);
        }

        if (userAccuracyCircle) {
            userAccuracyCircle.setLatLng([lat, lng]).setRadius(accuracy || 50);
        } else {
            userAccuracyCircle = L.circle([lat, lng], {
                radius: accuracy || 50,
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.12,
                weight: 1.5
            }).addTo(map);
        }
    }

    function handleLocateUserOnNavbar() {
        if (!navigator.geolocation) {
            showToast('Trình duyệt của bạn không hỗ trợ HTML5 Geolocation API.', 'warning');
            return;
        }

        setNavbarLocateLoading(true);
        navigator.geolocation.getCurrentPosition(
            function (position) {
                setNavbarLocateLoading(false);
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                var accuracy = position.coords.accuracy;

                updateUserLocationMarker(lat, lng, accuracy);
                map.flyTo([lat, lng], 15, { duration: 1.0 });
                showToast('Đã định vị vị trí hiện tại của bạn.', 'success');
            },
            function (error) {
                setNavbarLocateLoading(false);
                showToast(getGeolocationErrorMessage(error), 'warning');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }

    function handleGetGpsInModal() {
        if (!navigator.geolocation) {
            setLocationFeedback('Trình duyệt không hỗ trợ GPS. Hãy dùng nút "Chọn trên bản đồ".', 'warning');
            return;
        }

        el.btnGetGpsInModal.disabled = true;
        el.modalGpsSpinner.classList.remove('d-none');

        navigator.geolocation.getCurrentPosition(
            function (position) {
                el.btnGetGpsInModal.disabled = false;
                el.modalGpsSpinner.classList.add('d-none');

                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                setModalCoordinates(lat, lng, 'Đã lấy tọa độ GPS hiện tại');
                placeTempPickMarker(lat, lng);
                updateUserLocationMarker(lat, lng, position.coords.accuracy);
                map.panTo([lat, lng]);
            },
            function (error) {
                el.btnGetGpsInModal.disabled = false;
                el.modalGpsSpinner.classList.add('d-none');
                setLocationFeedback(getGeolocationErrorMessage(error), 'warning');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }

    /* --------------------------------------------------------------------------
       Chọn vị trí trực tiếp trên bản đồ & Modal Báo cáo
       -------------------------------------------------------------------------- */

    function startPickingLocation() {
        isPickingLocation = true;
        isHidingForPick = true;
        resumeModalAfterHide = false;
        reportModal.hide();

        el.pickingBanner.classList.remove('d-none');
        el.btnOpenReportModal.classList.add('d-none');
        if (el.mapLegend) el.mapLegend.classList.add('d-none');
        el.map.classList.add('picking-mode');
    }

    function stopPickingUi() {
        isPickingLocation = false;
        el.pickingBanner.classList.add('d-none');
        el.btnOpenReportModal.classList.remove('d-none');
        if (el.mapLegend) el.mapLegend.classList.remove('d-none');
        el.map.classList.remove('picking-mode');
    }

    function reopenModalAfterPick() {
        if (isHidingForPick) {
            resumeModalAfterHide = true;
        } else {
            reportModal.show();
        }
    }

    function finishPickingLocation(lat, lng, label) {
        stopPickingUi();
        setModalCoordinates(lat, lng, label);
        placeTempPickMarker(lat, lng);
        reopenModalAfterPick();
    }

    function cancelPickingLocation() {
        stopPickingUi();
        reopenModalAfterPick();
    }

    function placeTempPickMarker(lat, lng) {
        var icon = L.divIcon({
            className: 'temp-pick-icon',
            html:
                '<div class="temp-pick-pin">' +
                    '<svg width="32" height="42" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M18 2C9.16 2 2 9.16 2 18c0 11.4 16 26 16 26s16-14.6 16-26C34 9.16 26.84 2 18 2z" fill="#0d6efd" stroke="#ffffff" stroke-width="2.5"/>' +
                        '<circle cx="18" cy="18" r="6" fill="#ffffff"/>' +
                    '</svg>' +
                '</div>',
            iconSize: [32, 42],
            iconAnchor: [16, 42]
        });

        if (tempPickMarker) {
            tempPickMarker.setLatLng([lat, lng]);
        } else {
            tempPickMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 950 }).addTo(map);
        }
    }

    function removeTempPickMarker() {
        if (tempPickMarker) {
            map.removeLayer(tempPickMarker);
            tempPickMarker = null;
        }
    }

    function setModalCoordinates(lat, lng, label) {
        el.reportLat.value = lat.toFixed(6);
        el.reportLng.value = lng.toFixed(6);
        el.locationError.classList.add('d-none');
        setLocationFeedback(
            label + ': ' + lat.toFixed(5) + ', ' + lng.toFixed(5),
            'valid'
        );
    }

    function setLocationFeedback(message, state) {
        el.locationStatusBox.classList.remove('is-valid', 'is-warning');
        if (state === 'valid') {
            el.locationStatusBox.classList.add('is-valid');
        } else if (state === 'warning') {
            el.locationStatusBox.classList.add('is-warning');
        }
        el.locationStatusText.textContent = message;
    }

    function handleImageChange() {
        var file = el.reportImage.files && el.reportImage.files[0];
        el.imageError.classList.add('d-none');

        if (!file) {
            clearImageSelection();
            return;
        }

        if (!file.type || file.type.indexOf('image/') !== 0) {
            el.imageError.textContent = 'Vui lòng chọn đúng định dạng tệp hình ảnh (JPG, PNG, WEBP...).';
            el.imageError.classList.remove('d-none');
            clearImageSelection();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            el.imageError.textContent = 'Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.';
            el.imageError.classList.remove('d-none');
            clearImageSelection();
            return;
        }

        var reader = new FileReader();
        reader.onload = function (loadEvent) {
            uploadedImageDataUrl = String(loadEvent.target.result || '');
            el.imagePreview.src = uploadedImageDataUrl;
            el.imagePreviewWrapper.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    }

    function clearImageSelection() {
        uploadedImageDataUrl = '';
        el.reportImage.value = '';
        el.imagePreview.src = '';
        el.imagePreviewWrapper.classList.add('d-none');
    }

    function handleReportSubmit(event) {
        event.preventDefault();

        var description = el.reportDescription.value.trim();
        var lat = parseFloat(el.reportLat.value);
        var lng = parseFloat(el.reportLng.value);
        var hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);

        el.reportForm.classList.add('was-validated');
        el.locationError.classList.toggle('d-none', hasCoords);

        if (!description || !hasCoords) {
            if (!description) {
                el.reportDescription.focus();
            }
            return;
        }

        var animalTypeInput = el.reportForm.querySelector('input[name="animalType"]:checked');
        var urgencyInput = el.reportForm.querySelector('input[name="urgency"]:checked');
        var animalType = animalTypeInput ? animalTypeInput.value : 'Khác';
        var urgency = urgencyInput ? urgencyInput.value : 'normal';
        var address = el.reportAddress.value.trim();

        var newPoint = {
            id: nextPointId++,
            title: animalType + ' cần cứu trợ' + (address ? ' • ' + address : ''),
            animalType: animalType,
            urgency: urgency,
            status: 'pending',
            lat: lat,
            lng: lng,
            address: address || 'Đà Nẵng (' + lat.toFixed(5) + ', ' + lng.toFixed(5) + ')',
            description: description,
            image: uploadedImageDataUrl || MOCK.getDefaultImageForAnimal(animalType),
            createdAt: 'Vừa xong',
            comments: []
        };

        rescuePoints.unshift(newPoint);
        updateFilterCounts();

        // Chuyển sang "Tất cả" nếu bộ lọc hiện tại ẩn điểm mới tạo
        if (activeFilter !== 'all' && activeFilter !== 'pending') {
            activeFilter = 'all';
            syncFilterButtons();
        }

        renderMarkers();
        removeTempPickMarker();
        resetReportForm();
        reportModal.hide();

        map.flyTo([newPoint.lat, newPoint.lng], Math.max(map.getZoom(), 15), { duration: 0.9 });
        showToast('Đã gửi báo cáo cứu trợ mới lên bản đồ!', 'success');
    }

    function resetReportForm() {
        el.reportForm.reset();
        el.reportForm.classList.remove('was-validated');
        el.reportLat.value = '';
        el.reportLng.value = '';
        el.locationError.classList.add('d-none');
        el.imageError.classList.add('d-none');
        setLocationFeedback('Chưa có tọa độ. Hãy lấy GPS hoặc chọn trực tiếp trên bản đồ.', 'default');
        clearImageSelection();
        removeTempPickMarker();
    }

    /* --------------------------------------------------------------------------
       Bootstrap Offcanvas: Chi tiết điểm cứu trợ & Bình luận
       -------------------------------------------------------------------------- */

    function findPointById(id) {
        for (var i = 0; i < rescuePoints.length; i++) {
            if (rescuePoints[i].id === id) return rescuePoints[i];
        }
        return null;
    }

    function openRescueDetail(pointId) {
        var point = findPointById(pointId);
        if (!point) return;

        activeDetailId = point.id;

        el.detailAnimalBadge.textContent = point.animalType;
        el.detailTitle.textContent = point.title;

        el.detailImage.src = point.image || MOCK.getDefaultImageForAnimal(point.animalType);
        el.detailImage.alt = 'Ảnh cứu trợ: ' + point.title;

        var urgencyMeta = URGENCY_META[point.urgency] || URGENCY_META.normal;
        el.detailUrgencyBadge.className = 'badge position-absolute top-0 start-0 m-2 px-2 py-1 shadow-sm ' + urgencyMeta.badgeClass;
        el.detailUrgencyBadge.textContent = urgencyMeta.label;

        applyStatusBadge(point.status);
        el.detailStatusSelect.value = point.status;

        el.detailAddress.textContent = point.address;
        el.detailCoords.textContent = point.lat.toFixed(5) + ', ' + point.lng.toFixed(5);
        el.detailTime.textContent = point.createdAt;
        el.detailDescription.textContent = point.description;

        el.btnGoogleMaps.href = 'https://www.google.com/maps/dir/?api=1&destination=' +
            point.lat.toFixed(6) + ',' + point.lng.toFixed(6);

        var loggedUser = readCurrentUser();
        if (loggedUser && loggedUser.name && !el.commentAuthor.value.trim()) {
            el.commentAuthor.value = loggedUser.name;
        }

        renderComments(point.comments);
        rescueOffcanvas.show();
    }

    /* --------------------------------------------------------------------------
       Trạng thái Đăng nhập trên Navbar (đọc từ localStorage)
       -------------------------------------------------------------------------- */

    function readCurrentUser() {
        try {
            var raw = localStorage.getItem('currentUser');
            if (!raw) return null;
            var user = JSON.parse(raw);
            return user && (user.name || user.email) ? user : null;
        } catch (err) {
            return null;
        }
    }

    function renderNavbarAuth() {
        var user = readCurrentUser();

        if (!user) {
            if (el.navGuestArea) el.navGuestArea.classList.remove('d-none');
            if (el.navUserArea) el.navUserArea.classList.add('d-none');
            if (el.btnNavAdmin) el.btnNavAdmin.classList.add('d-none');
            return;
        }

        if (el.navGuestArea) el.navGuestArea.classList.add('d-none');
        if (el.navUserArea) el.navUserArea.classList.remove('d-none');
        if (el.navUserName) el.navUserName.textContent = user.name || user.email;

        var isAdmin = String(user.role || '').toLowerCase() === 'admin';
        if (el.btnNavAdmin) {
            el.btnNavAdmin.classList.toggle('d-none', !isAdmin);
        }
    }

    function handleNavLogout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        renderNavbarAuth();
        if (el.commentAuthor) {
            el.commentAuthor.value = '';
        }
        showToast('Đã đăng xuất tài khoản.', 'success');
    }

    function applyStatusBadge(status) {
        var meta = STATUS_META[status] || STATUS_META.pending;
        el.detailStatusBadge.className = 'badge rounded-pill px-3 py-1 ' + meta.badgeClass;
        el.detailStatusBadge.textContent = meta.label;
    }

    function handleStatusUpdate() {
        var point = findPointById(activeDetailId);
        if (!point) return;

        var newStatus = el.detailStatusSelect.value;
        if (!STATUS_META[newStatus] || point.status === newStatus) return;

        point.status = newStatus;
        applyStatusBadge(newStatus);
        updateFilterCounts();
        renderMarkers();

        showToast('Đã cập nhật trạng thái: ' + STATUS_META[newStatus].label, 'success');
    }

    function renderComments(comments) {
        el.commentList.innerHTML = '';
        el.detailCommentCount.textContent = String(comments.length);

        if (!comments.length) {
            var emptyMsg = document.createElement('p');
            emptyMsg.className = 'text-muted small fst-italic mb-0 py-2 text-center bg-light rounded-3 border';
            emptyMsg.textContent = 'Chưa có bình luận nào. Hãy là người đầu tiên cập nhật thông tin!';
            el.commentList.appendChild(emptyMsg);
            return;
        }

        comments.forEach(function (comment) {
            var item = document.createElement('div');
            item.className = 'comment-item';

            var header = document.createElement('div');
            header.className = 'd-flex align-items-center justify-content-between gap-2 mb-1';

            var author = document.createElement('strong');
            author.className = 'small text-dark';
            author.textContent = comment.author;

            var time = document.createElement('span');
            time.className = 'text-muted';
            time.style.fontSize = '0.72rem';
            time.textContent = comment.time;

            var body = document.createElement('p');
            body.className = 'mb-0 small text-secondary lh-sm';
            body.textContent = comment.text;

            header.appendChild(author);
            header.appendChild(time);
            item.appendChild(header);
            item.appendChild(body);
            el.commentList.appendChild(item);
        });
    }

    function handleCommentSubmit(event) {
        event.preventDefault();
        var point = findPointById(activeDetailId);
        if (!point) return;

        var text = el.commentText.value.trim();
        if (!text) {
            el.commentText.focus();
            return;
        }

        var author = el.commentAuthor.value.trim() || 'Tình nguyện viên';
        point.comments.push({
            id: Date.now(),
            author: author,
            time: 'Vừa xong',
            text: text
        });

        renderComments(point.comments);
        el.commentList.scrollTop = el.commentList.scrollHeight;
        el.commentText.value = '';
        showToast('Đã đăng bình luận mới.', 'success');
    }

    /* --------------------------------------------------------------------------
       Thông báo Toast (Bootstrap 5)
       -------------------------------------------------------------------------- */

    function showToast(message, variant) {
        var bgClass = 'text-bg-dark';
        if (variant === 'success') bgClass = 'text-bg-success';
        if (variant === 'warning') bgClass = 'text-bg-warning';
        if (variant === 'danger') bgClass = 'text-bg-danger';

        var toastEl = document.createElement('div');
        toastEl.className = 'toast align-items-center border-0 shadow ' + bgClass;
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        toastEl.setAttribute('aria-atomic', 'true');

        var flexWrap = document.createElement('div');
        flexWrap.className = 'd-flex';

        var toastBody = document.createElement('div');
        toastBody.className = 'toast-body fw-medium small';
        toastBody.textContent = message;

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = variant === 'warning'
            ? 'btn-close me-2 m-auto'
            : 'btn-close btn-close-white me-2 m-auto';
        closeBtn.setAttribute('data-bs-dismiss', 'toast');
        closeBtn.setAttribute('aria-label', 'Đóng');

        flexWrap.appendChild(toastBody);
        flexWrap.appendChild(closeBtn);
        toastEl.appendChild(flexWrap);
        el.toastContainer.appendChild(toastEl);

        var toastInstance = new bootstrap.Toast(toastEl, { delay: 3200 });
        toastEl.addEventListener('hidden.bs.toast', function () {
            toastEl.remove();
        });
        toastInstance.show();
    }
})();
