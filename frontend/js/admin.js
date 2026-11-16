/**
 * Animal Rescue Map - Logic Bảng điều khiển Quản trị (Vanilla JS + REST API + JWT)
 * Kết nối trực tiếp tới http://localhost:5000/api/admin/* với Authorization: Bearer <token>.
 */
(function () {
    'use strict';

    var API_BASE_URL = 'http://localhost:5000/api';
    var BACKEND_ORIGIN = 'http://localhost:5000';

    var DEFAULT_IMAGE_PATHS = {
        'Chó': '/uploads/sample-dog-dragon-bridge.svg',
        'Mèo': '/uploads/sample-cat-park.svg',
        'Khác': '/uploads/sample-other-default.svg'
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

    // Trạng thái làm việc trong trang Admin
    var currentAdmin = null;
    var rescuePoints = [];
    var usersList = [];
    var rescueStatusFilter = 'all';
    var rescueSearchKeyword = '';
    var userSearchKeyword = '';
    var pendingDeleteId = null;

    var confirmDeleteModal = null;
    var el = {};

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        cacheDomElements();
        confirmDeleteModal = new bootstrap.Modal(el.confirmDeleteModal);

        if (!ensureAdminSession()) {
            return;
        }

        renderAdminSessionName();
        bindEvents();
        loadDashboardData();
    }

    function readCurrentUser() {
        try {
            var rawUser = localStorage.getItem('currentUser');
            return rawUser ? JSON.parse(rawUser) : null;
        } catch (err) {
            return null;
        }
    }

    function getAuthToken() {
        var token = localStorage.getItem('authToken');
        if (token) return token;
        var user = readCurrentUser();
        return user && user.token ? user.token : '';
    }

    function clearSessionAndRedirect() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }

    function ensureAdminSession() {
        var token = getAuthToken();
        var user = readCurrentUser();
        if (!token || !user || String(user.role || '').toLowerCase() !== 'admin') {
            clearSessionAndRedirect();
            return false;
        }
        currentAdmin = user;
        return true;
    }

    function resolveImageUrl(rawUrl, animalType) {
        var fallbackPath = DEFAULT_IMAGE_PATHS[animalType] || DEFAULT_IMAGE_PATHS['Khác'];
        var url = String(rawUrl || '').trim();
        if (!url) {
            return BACKEND_ORIGIN + fallbackPath;
        }
        if (/^(https?:)?\/\//i.test(url) || url.indexOf('data:') === 0) {
            return url;
        }
        if (url.charAt(0) === '/') {
            return BACKEND_ORIGIN + url;
        }
        return BACKEND_ORIGIN + '/' + url.replace(/^\/+/, '');
    }

    function normalizePinFromApi(pin) {
        var animalType = pin.animalType || (pin.category && pin.category.name) || 'Khác';
        var rawImage =
            pin.image ||
            (Array.isArray(pin.images) && pin.images[0] && pin.images[0].url) ||
            '';

        return {
            id: Number(pin.id),
            title: pin.title || (animalType + ' cần cứu trợ'),
            animalType: animalType,
            urgency: pin.urgency || 'normal',
            status: pin.status || 'pending',
            lat: Number(pin.lat),
            lng: Number(pin.lng),
            address: pin.address || '',
            description: pin.description || '',
            image: resolveImageUrl(rawImage, animalType),
            isHidden: Boolean(pin.isHidden),
            isSensitiveBlurred: Boolean(pin.isSensitiveBlurred),
            createdAt: pin.createdAt
        };
    }

    async function apiAdminFetch(endpoint, options) {
        var token = getAuthToken();
        if (!token) {
            clearSessionAndRedirect();
            throw new Error('Phiên đăng nhập đã hết hạn.');
        }

        var fetchOptions = Object.assign({}, options || {});
        var headers = Object.assign({}, fetchOptions.headers || {}, {
            Authorization: 'Bearer ' + token
        });

        if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
        fetchOptions.headers = headers;

        var response = await fetch(API_BASE_URL + endpoint, fetchOptions);
        var data = await response.json().catch(function () {
            return {};
        });

        if (response.status === 401 || response.status === 403) {
            clearSessionAndRedirect();
            throw new Error(data.message || 'Không có quyền truy cập trang Quản trị.');
        }

        if (!response.ok) {
            throw new Error(data.message || 'Thao tác thất bại.');
        }

        return data;
    }

    async function loadDashboardData() {
        try {
            await Promise.all([
                fetchStats(),
                fetchAdminPins(),
                fetchUsers()
            ]);
        } catch (err) {
            showToast(
                err.message || 'Không thể tải dữ liệu từ máy chủ Back-end (http://localhost:5000).',
                'danger'
            );
        }
    }

    async function fetchStats() {
        var data = await apiAdminFetch('/admin/stats', { method: 'GET' });
        renderStats(data);
    }

    async function fetchAdminPins() {
        var data = await apiAdminFetch('/admin/pins', { method: 'GET' });
        rescuePoints = Array.isArray(data.pins) ? data.pins.map(normalizePinFromApi) : [];
        renderRescueTable();
    }

    async function fetchUsers() {
        var data = await apiAdminFetch('/admin/users', { method: 'GET' });
        usersList = Array.isArray(data.users) ? data.users : [];
        renderUsersTable();
    }

    function cacheDomElements() {
        el.adminUserName = document.getElementById('adminUserName');
        el.btnAdminLogout = document.getElementById('btnAdminLogout');
        el.btnSidebarLogout = document.getElementById('btnSidebarLogout');

        el.statTotal = document.getElementById('statTotal');
        el.statPending = document.getElementById('statPending');
        el.statTreating = document.getElementById('statTreating');
        el.statCompleted = document.getElementById('statCompleted');

        el.rescueCountLabel = document.getElementById('rescueCountLabel');
        el.rescueFilterStatus = document.getElementById('rescueFilterStatus');
        el.rescueSearchInput = document.getElementById('rescueSearchInput');
        el.rescueTableBody = document.getElementById('rescueTableBody');

        el.userCountLabel = document.getElementById('userCountLabel');
        el.userSearchInput = document.getElementById('userSearchInput');
        el.usersTableBody = document.getElementById('usersTableBody');

        el.confirmDeleteModal = document.getElementById('confirmDeleteModal');
        el.deleteTargetTitle = document.getElementById('deleteTargetTitle');
        el.btnConfirmDelete = document.getElementById('btnConfirmDelete');

        el.toastContainer = document.getElementById('adminToastContainer');
    }

    function renderAdminSessionName() {
        if (currentAdmin && currentAdmin.name) {
            el.adminUserName.textContent = currentAdmin.name;
        }
    }

    function bindEvents() {
        el.btnAdminLogout.addEventListener('click', handleLogout);
        if (el.btnSidebarLogout) {
            el.btnSidebarLogout.addEventListener('click', handleLogout);
        }

        // Điều hướng active trên sidebar
        document.querySelectorAll('.admin-nav-link[data-nav-target]').forEach(function (link) {
            link.addEventListener('click', function () {
                document.querySelectorAll('.admin-nav-link[data-nav-target]').forEach(function (item) {
                    item.classList.remove('active');
                });
                link.classList.add('active');
            });
        });

        // Bộ lọc & tìm kiếm điểm cứu trợ
        el.rescueFilterStatus.addEventListener('change', function () {
            rescueStatusFilter = el.rescueFilterStatus.value;
            renderRescueTable();
        });

        el.rescueSearchInput.addEventListener('input', function () {
            rescueSearchKeyword = el.rescueSearchInput.value.trim().toLowerCase();
            renderRescueTable();
        });

        // Tìm kiếm người dùng
        el.userSearchInput.addEventListener('input', function () {
            userSearchKeyword = el.userSearchInput.value.trim().toLowerCase();
            renderUsersTable();
        });

        // Xác nhận xóa tin rác trong Modal
        el.btnConfirmDelete.addEventListener('click', function () {
            if (pendingDeleteId === null) return;
            var targetId = pendingDeleteId;
            pendingDeleteId = null;
            confirmDeleteModal.hide();
            deleteRescuePoint(targetId);
        });
    }

    /* --------------------------------------------------------------------------
       Đăng xuất (Xóa JWT trong localStorage và chuyển về login.html)
       -------------------------------------------------------------------------- */

    function handleLogout() {
        clearSessionAndRedirect();
    }

    /* --------------------------------------------------------------------------
       Thống kê 4 Card trên cùng (GET /api/admin/stats)
       -------------------------------------------------------------------------- */

    function renderStats(stats) {
        if (stats && typeof stats.total === 'number') {
            el.statTotal.textContent = String(stats.total);
            el.statPending.textContent = String(stats.pending || 0);
            el.statTreating.textContent = String(stats.treating || 0);
            el.statCompleted.textContent = String(stats.completed || 0);
            return;
        }

        var total = rescuePoints.length;
        var pending = 0;
        var treating = 0;
        var completed = 0;

        rescuePoints.forEach(function (point) {
            if (point.status === 'pending') pending += 1;
            else if (point.status === 'treating') treating += 1;
            else if (point.status === 'completed') completed += 1;
        });

        el.statTotal.textContent = String(total);
        el.statPending.textContent = String(pending);
        el.statTreating.textContent = String(treating);
        el.statCompleted.textContent = String(completed);
    }

    /* --------------------------------------------------------------------------
       Bảng Quản lý điểm cứu trợ
       -------------------------------------------------------------------------- */

    function formatCoordinates(point) {
        if (point.isSensitiveBlurred) {
            var maskedLat = point.lat.toFixed(2) + '•••';
            var maskedLng = point.lng.toFixed(2) + '•••';
            return maskedLat + ', ' + maskedLng + ' (Đã làm mờ ~1km)';
        }
        return point.lat.toFixed(5) + ', ' + point.lng.toFixed(5);
    }

    function replaceLocalPin(updatedPin) {
        var normalized = normalizePinFromApi(updatedPin);
        for (var i = 0; i < rescuePoints.length; i++) {
            if (rescuePoints[i].id === normalized.id) {
                rescuePoints[i] = normalized;
                break;
            }
        }
    }

    function renderRescueTable() {
        el.rescueTableBody.innerHTML = '';

        var filtered = rescuePoints.filter(function (point) {
            var matchStatus = rescueStatusFilter === 'all' || point.status === rescueStatusFilter;
            if (!matchStatus) return false;
            if (!rescueSearchKeyword) return true;

            var haystack = (point.title + ' ' + point.address + ' ' + point.animalType).toLowerCase();
            return haystack.indexOf(rescueSearchKeyword) !== -1;
        });

        var hiddenCount = rescuePoints.filter(function (p) { return p.isHidden; }).length;
        el.rescueCountLabel.textContent = filtered.length + ' ca' + (hiddenCount ? ' (' + hiddenCount + ' đang ẩn)' : '');

        if (!filtered.length) {
            var emptyRow = document.createElement('tr');
            var emptyCell = document.createElement('td');
            emptyCell.colSpan = 6;
            emptyCell.className = 'text-center text-muted py-4 small';
            emptyCell.textContent = 'Không có điểm cứu trợ nào khớp với điều kiện lọc.';
            emptyRow.appendChild(emptyCell);
            el.rescueTableBody.appendChild(emptyRow);
            return;
        }

        filtered.forEach(function (point) {
            var tr = document.createElement('tr');
            if (point.isHidden) {
                tr.classList.add('admin-row-hidden');
            }

            // 1. Ảnh nhỏ (từ http://localhost:5000/uploads/...)
            var tdImg = document.createElement('td');
            tdImg.className = 'ps-3 ps-sm-4';
            var img = document.createElement('img');
            img.className = 'admin-thumb';
            img.src = resolveImageUrl(point.image, point.animalType);
            img.alt = 'Ảnh ' + point.title;
            tdImg.appendChild(img);

            // 2. Tiêu đề + địa chỉ + tọa độ
            var tdInfo = document.createElement('td');
            var titleWrap = document.createElement('div');
            titleWrap.className = 'd-flex flex-wrap align-items-center gap-1 mb-1';

            var titleEl = document.createElement('span');
            titleEl.className = 'fw-semibold text-dark';
            titleEl.textContent = point.title;
            titleWrap.appendChild(titleEl);

            var animalBadge = document.createElement('span');
            animalBadge.className = 'badge text-bg-light border text-secondary';
            animalBadge.textContent = point.animalType;
            titleWrap.appendChild(animalBadge);

            if (point.isHidden) {
                var hiddenBadge = document.createElement('span');
                hiddenBadge.className = 'badge text-bg-secondary';
                hiddenBadge.textContent = 'Đang ẩn';
                titleWrap.appendChild(hiddenBadge);
            }

            var addrEl = document.createElement('div');
            addrEl.className = 'small text-secondary mb-1';
            addrEl.textContent = point.address;

            var coordsChip = document.createElement('span');
            coordsChip.className = 'coords-chip' + (point.isSensitiveBlurred ? ' is-blurred' : '');
            coordsChip.textContent = formatCoordinates(point);

            tdInfo.appendChild(titleWrap);
            tdInfo.appendChild(addrEl);
            tdInfo.appendChild(coordsChip);

            // 3. Mức độ khẩn cấp
            var tdUrgency = document.createElement('td');
            var urgencyMeta = URGENCY_META[point.urgency] || URGENCY_META.normal;
            var urgencyBadge = document.createElement('span');
            urgencyBadge.className = 'badge rounded-pill ' + urgencyMeta.badgeClass;
            urgencyBadge.textContent = urgencyMeta.label;
            tdUrgency.appendChild(urgencyBadge);

            // 4. Trạng thái hiện tại
            var tdStatus = document.createElement('td');
            var statusMeta = STATUS_META[point.status] || STATUS_META.pending;
            var statusBadge = document.createElement('span');
            statusBadge.className = 'badge rounded-pill ' + statusMeta.badgeClass;
            statusBadge.textContent = statusMeta.label;
            tdStatus.appendChild(statusBadge);

            // 5. Công tắc Làm mờ tọa độ (PATCH /api/admin/pins/:id/blur)
            var tdBlur = document.createElement('td');
            var switchWrap = document.createElement('div');
            switchWrap.className = 'form-check form-switch m-0 d-inline-flex align-items-center gap-2';

            var switchInput = document.createElement('input');
            switchInput.className = 'form-check-input m-0';
            switchInput.type = 'checkbox';
            switchInput.setAttribute('role', 'switch');
            switchInput.id = 'blurSwitch-' + point.id;
            switchInput.checked = point.isSensitiveBlurred;
            switchInput.setAttribute('aria-label', 'Làm mờ tọa độ cho ' + point.title);

            var switchLabel = document.createElement('label');
            switchLabel.className = 'form-check-label small fw-medium ' +
                (point.isSensitiveBlurred ? 'text-warning-emphasis' : 'text-secondary');
            switchLabel.setAttribute('for', switchInput.id);
            switchLabel.textContent = point.isSensitiveBlurred ? 'Đang làm mờ' : 'Công khai';

            switchInput.addEventListener('change', async function () {
                var targetValue = switchInput.checked;
                switchInput.disabled = true;
                try {
                    var data = await apiAdminFetch('/admin/pins/' + point.id + '/blur', {
                        method: 'PATCH',
                        body: JSON.stringify({ isSensitiveBlurred: targetValue })
                    });
                    if (data.pin) {
                        replaceLocalPin(data.pin);
                    } else {
                        point.isSensitiveBlurred = targetValue;
                    }
                    renderRescueTable();
                    showToast(
                        targetValue
                            ? 'Đã bật làm mờ tọa độ cho "' + point.title + '".'
                            : 'Đã khôi phục tọa độ chính xác cho "' + point.title + '".',
                        targetValue ? 'warning' : 'success'
                    );
                } catch (err) {
                    switchInput.checked = !targetValue;
                    switchInput.disabled = false;
                    showToast(err.message || 'Không thể thay đổi chế độ làm mờ tọa độ.', 'danger');
                }
            });

            switchWrap.appendChild(switchInput);
            switchWrap.appendChild(switchLabel);
            tdBlur.appendChild(switchWrap);

            // 6. Các nút thao tác: Đổi trạng thái, Ẩn/Hiện, Xóa tin rác
            var tdActions = document.createElement('td');
            tdActions.className = 'pe-3 pe-sm-4 text-end';

            var actionGroup = document.createElement('div');
            actionGroup.className = 'd-inline-flex flex-wrap align-items-center justify-content-end gap-1';

            // Đổi trạng thái (PATCH /api/admin/pins/:id/status)
            var statusSelect = document.createElement('select');
            statusSelect.className = 'form-select form-select-sm w-auto';
            statusSelect.setAttribute('aria-label', 'Đổi trạng thái cho ' + point.title);

            [
                { value: 'pending', text: 'Đang chờ cứu trợ' },
                { value: 'treating', text: 'Đang điều trị' },
                { value: 'completed', text: 'Hoàn thành' }
            ].forEach(function (optData) {
                var opt = document.createElement('option');
                opt.value = optData.value;
                opt.textContent = optData.text;
                if (point.status === optData.value) opt.selected = true;
                statusSelect.appendChild(opt);
            });

            statusSelect.addEventListener('change', async function () {
                var previousStatus = point.status;
                var nextStatus = statusSelect.value;
                statusSelect.disabled = true;
                try {
                    var data = await apiAdminFetch('/admin/pins/' + point.id + '/status', {
                        method: 'PATCH',
                        body: JSON.stringify({ status: nextStatus })
                    });
                    if (data.pin) {
                        replaceLocalPin(data.pin);
                    } else {
                        point.status = nextStatus;
                    }
                    await fetchStats();
                    renderRescueTable();
                    showToast(
                        'Đã đổi trạng thái "' + point.title + '" thành: ' + STATUS_META[nextStatus].label,
                        'success'
                    );
                } catch (err) {
                    statusSelect.value = previousStatus;
                    statusSelect.disabled = false;
                    showToast(err.message || 'Không thể cập nhật trạng thái.', 'danger');
                }
            });

            // Nút Ẩn / Hiện tin (PATCH /api/admin/pins/:id/hide)
            var btnHide = document.createElement('button');
            btnHide.type = 'button';
            btnHide.className = 'btn btn-sm ' + (point.isHidden ? 'btn-outline-success' : 'btn-outline-secondary');
            btnHide.textContent = point.isHidden ? 'Hiện' : 'Ẩn';
            btnHide.title = point.isHidden ? 'Hiện lại điểm cứu trợ trên bản đồ' : 'Ẩn tạm điểm cứu trợ nghi ngờ rác';
            btnHide.addEventListener('click', async function () {
                var nextHidden = !point.isHidden;
                btnHide.disabled = true;
                try {
                    var data = await apiAdminFetch('/admin/pins/' + point.id + '/hide', {
                        method: 'PATCH',
                        body: JSON.stringify({ isHidden: nextHidden })
                    });
                    if (data.pin) {
                        replaceLocalPin(data.pin);
                    } else {
                        point.isHidden = nextHidden;
                    }
                    renderRescueTable();
                    showToast(
                        nextHidden
                            ? 'Đã ẩn báo cáo "' + point.title + '" khỏi bản đồ công khai.'
                            : 'Đã hiển thị lại báo cáo "' + point.title + '".',
                        'info'
                    );
                } catch (err) {
                    btnHide.disabled = false;
                    showToast(err.message || 'Không thể cập nhật trạng thái ẩn/hiện.', 'danger');
                }
            });

            // Nút Xóa tin rác (DELETE /api/admin/pins/:id)
            var btnDelete = document.createElement('button');
            btnDelete.type = 'button';
            btnDelete.className = 'btn btn-sm btn-outline-danger';
            btnDelete.textContent = 'Xóa';
            btnDelete.title = 'Xóa tin rác khỏi danh sách';
            btnDelete.addEventListener('click', function () {
                pendingDeleteId = point.id;
                el.deleteTargetTitle.textContent = '"' + point.title + '"';
                confirmDeleteModal.show();
            });

            actionGroup.appendChild(statusSelect);
            actionGroup.appendChild(btnHide);
            actionGroup.appendChild(btnDelete);
            tdActions.appendChild(actionGroup);

            tr.appendChild(tdImg);
            tr.appendChild(tdInfo);
            tr.appendChild(tdUrgency);
            tr.appendChild(tdStatus);
            tr.appendChild(tdBlur);
            tr.appendChild(tdActions);

            el.rescueTableBody.appendChild(tr);
        });
    }

    async function deleteRescuePoint(pointId) {
        try {
            var target = rescuePoints.find(function (p) { return p.id === pointId; });
            await apiAdminFetch('/admin/pins/' + pointId, {
                method: 'DELETE'
            });

            rescuePoints = rescuePoints.filter(function (point) {
                return point.id !== pointId;
            });

            await fetchStats();
            renderRescueTable();

            if (target) {
                showToast('Đã xóa tin rác "' + target.title + '" khỏi hệ thống.', 'danger');
            } else {
                showToast('Đã xóa điểm cứu trợ khỏi hệ thống.', 'danger');
            }
        } catch (err) {
            showToast(err.message || 'Không thể xóa điểm cứu trợ.', 'danger');
        }
    }

    /* --------------------------------------------------------------------------
       Bảng Quản lý người dùng
       -------------------------------------------------------------------------- */

    function replaceLocalUser(updatedUser) {
        for (var i = 0; i < usersList.length; i++) {
            if (usersList[i].id === updatedUser.id) {
                usersList[i] = updatedUser;
                break;
            }
        }
    }

    function renderUsersTable() {
        el.usersTableBody.innerHTML = '';

        var filteredUsers = usersList.filter(function (user) {
            if (!userSearchKeyword) return true;
            var text = (user.name + ' ' + user.email + ' ' + (user.phone || '') + ' ' + user.role).toLowerCase();
            return text.indexOf(userSearchKeyword) !== -1;
        });

        var trustedCount = usersList.filter(function (u) { return u.isTrustedVolunteer; }).length;
        var lockedCount = usersList.filter(function (u) { return u.isLocked; }).length;
        el.userCountLabel.textContent =
            usersList.length + ' tài khoản • ' + trustedCount + ' TNV uy tín • ' + lockedCount + ' đã khóa';

        if (!filteredUsers.length) {
            var emptyRow = document.createElement('tr');
            var emptyCell = document.createElement('td');
            emptyCell.colSpan = 5;
            emptyCell.className = 'text-center text-muted py-4 small';
            emptyCell.textContent = 'Không tìm thấy tài khoản phù hợp.';
            emptyRow.appendChild(emptyCell);
            el.usersTableBody.appendChild(emptyRow);
            return;
        }

        filteredUsers.forEach(function (user) {
            var tr = document.createElement('tr');
            if (user.isLocked) {
                tr.classList.add('admin-row-locked');
            }

            // 1. Tài khoản (Họ tên, Email, SĐT)
            var tdAccount = document.createElement('td');
            tdAccount.className = 'ps-3 ps-sm-4';

            var nameEl = document.createElement('div');
            nameEl.className = 'fw-semibold text-dark';
            nameEl.textContent = user.name;

            var metaEl = document.createElement('div');
            metaEl.className = 'small text-secondary';
            metaEl.textContent = user.email + ' • ' + (user.phone || 'Chưa cập nhật');

            tdAccount.appendChild(nameEl);
            tdAccount.appendChild(metaEl);

            // 2. Vai trò
            var tdRole = document.createElement('td');
            var roleBadge = document.createElement('span');
            roleBadge.className = 'badge rounded-pill text-bg-light border text-dark';
            roleBadge.textContent = user.role;
            tdRole.appendChild(roleBadge);

            // 3. Huy hiệu Tình nguyện viên uy tín
            var tdBadge = document.createElement('td');
            if (user.isTrustedVolunteer) {
                var trustedBadge = document.createElement('span');
                trustedBadge.className = 'badge rounded-pill badge-trusted px-2 py-1';
                trustedBadge.textContent = '★ Tình nguyện viên uy tín';
                tdBadge.appendChild(trustedBadge);
            } else {
                var normalText = document.createElement('span');
                normalText.className = 'small text-muted';
                normalText.textContent = 'Chưa cấp';
                tdBadge.appendChild(normalText);
            }

            // 4. Trạng thái tài khoản
            var tdStatus = document.createElement('td');
            var accountStatus = document.createElement('span');
            accountStatus.className = 'badge rounded-pill ' + (user.isLocked ? 'text-bg-danger' : 'text-bg-success');
            accountStatus.textContent = user.isLocked ? 'Đã khóa' : 'Hoạt động';
            tdStatus.appendChild(accountStatus);

            // 5. Thao tác: Cấp huy hiệu TNV uy tín & Khóa tài khoản
            var tdActions = document.createElement('td');
            tdActions.className = 'pe-3 pe-sm-4 text-end';

            var actionWrap = document.createElement('div');
            actionWrap.className = 'd-inline-flex flex-wrap justify-content-end gap-1';

            var btnBadge = document.createElement('button');
            btnBadge.type = 'button';
            btnBadge.className = 'btn btn-sm ' +
                (user.isTrustedVolunteer ? 'btn-outline-secondary' : 'btn-outline-warning text-dark');
            btnBadge.textContent = user.isTrustedVolunteer
                ? 'Gỡ huy hiệu'
                : 'Cấp huy hiệu TNV uy tín';
            btnBadge.disabled = user.isLocked;
            btnBadge.addEventListener('click', async function () {
                var nextBadge = !user.isTrustedVolunteer;
                btnBadge.disabled = true;
                try {
                    var data = await apiAdminFetch('/admin/users/' + user.id + '/badge', {
                        method: 'PATCH',
                        body: JSON.stringify({ isTrustedVolunteer: nextBadge })
                    });
                    if (data.user) {
                        replaceLocalUser(data.user);
                    } else {
                        user.isTrustedVolunteer = nextBadge;
                    }
                    renderUsersTable();
                    showToast(
                        nextBadge
                            ? 'Đã cấp huy hiệu Tình nguyện viên uy tín cho ' + user.name + '.'
                            : 'Đã gỡ huy hiệu Tình nguyện viên uy tín của ' + user.name + '.',
                        nextBadge ? 'success' : 'info'
                    );
                } catch (err) {
                    btnBadge.disabled = user.isLocked;
                    showToast(err.message || 'Không thể cập nhật huy hiệu.', 'danger');
                }
            });

            var isSelfAdmin = currentAdmin && Number(currentAdmin.id) === Number(user.id);
            var btnLock = document.createElement('button');
            btnLock.type = 'button';
            btnLock.className = 'btn btn-sm ' + (user.isLocked ? 'btn-outline-success' : 'btn-outline-danger');
            btnLock.textContent = user.isLocked ? 'Mở khóa' : 'Khóa tài khoản';
            btnLock.disabled = isSelfAdmin;
            if (isSelfAdmin) {
                btnLock.title = 'Không thể tự khóa tài khoản đang đăng nhập';
            }
            btnLock.addEventListener('click', async function () {
                var nextLocked = !user.isLocked;
                btnLock.disabled = true;
                try {
                    var data = await apiAdminFetch('/admin/users/' + user.id + '/lock', {
                        method: 'PATCH',
                        body: JSON.stringify({ isLocked: nextLocked })
                    });
                    if (data.user) {
                        replaceLocalUser(data.user);
                    } else {
                        user.isLocked = nextLocked;
                    }
                    renderUsersTable();
                    showToast(
                        nextLocked
                            ? 'Đã khóa tài khoản ' + user.name + '.'
                            : 'Đã mở khóa tài khoản ' + user.name + '.',
                        nextLocked ? 'warning' : 'success'
                    );
                } catch (err) {
                    btnLock.disabled = isSelfAdmin;
                    showToast(err.message || 'Không thể thay đổi trạng thái khóa tài khoản.', 'danger');
                }
            });

            actionWrap.appendChild(btnBadge);
            actionWrap.appendChild(btnLock);
            tdActions.appendChild(actionWrap);

            tr.appendChild(tdAccount);
            tr.appendChild(tdRole);
            tr.appendChild(tdBadge);
            tr.appendChild(tdStatus);
            tr.appendChild(tdActions);

            el.usersTableBody.appendChild(tr);
        });
    }

    /* --------------------------------------------------------------------------
       Thông báo Toast (Bootstrap 5)
       -------------------------------------------------------------------------- */

    function showToast(message, variant) {
        var bgClass = 'text-bg-dark';
        if (variant === 'success') bgClass = 'text-bg-success';
        if (variant === 'warning') bgClass = 'text-bg-warning';
        if (variant === 'danger') bgClass = 'text-bg-danger';
        if (variant === 'info') bgClass = 'text-bg-primary';

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

        var toastInstance = new bootstrap.Toast(toastEl, { delay: 3000 });
        toastEl.addEventListener('hidden.bs.toast', function () {
            toastEl.remove();
        });
        toastInstance.show();
    }
})();
