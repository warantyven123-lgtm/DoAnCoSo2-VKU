/**
 * Animal Rescue Map - Logic Bảng điều khiển Quản trị (Vanilla JS)
 * Đọc dữ liệu điểm cứu trợ từ mockData.js, quản lý thống kê,
 * đổi trạng thái, ẩn/xóa tin rác, làm mờ tọa độ nhạy cảm và quản lý người dùng.
 */
(function () {
    'use strict';

    var MOCK = window.ANIMAL_RESCUE_MOCK || {
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

    var INITIAL_USERS = [
        {
            id: 1,
            name: 'Nguyễn Minh Anh',
            email: 'minhanh.dn@gmail.com',
            phone: '0905123456',
            role: 'Tình nguyện viên/Trạm cứu hộ',
            isTrustedVolunteer: true,
            isLocked: false
        },
        {
            id: 2,
            name: 'Trần Thanh Tùng',
            email: 'tung.tran@gmail.com',
            phone: '0914223344',
            role: 'Tình nguyện viên/Trạm cứu hộ',
            isTrustedVolunteer: false,
            isLocked: false
        },
        {
            id: 3,
            name: 'Lê Thị Thu Hương',
            email: 'huong.le@gmail.com',
            phone: '0935667788',
            role: 'Người dân',
            isTrustedVolunteer: false,
            isLocked: false
        },
        {
            id: 4,
            name: 'Phạm Hoàng Nam',
            email: 'hoangnam.dn@gmail.com',
            phone: '0987654321',
            role: 'Người dân',
            isTrustedVolunteer: false,
            isLocked: true
        }
    ];

    // Trạng thái làm việc trong trang Admin
    var rescuePoints = cloneRescuePoints(MOCK.INITIAL_RESCUE_POINTS);
    var usersList = buildInitialUsers();
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
        renderAdminSessionName();
        bindEvents();
        renderStats();
        renderRescueTable();
        renderUsersTable();
    }

    function cloneRescuePoints(points) {
        return points.map(function (point) {
            return Object.assign({}, point, {
                isHidden: Boolean(point.isHidden),
                isSensitiveBlurred: Boolean(point.isSensitiveBlurred)
            });
        });
    }

    function buildInitialUsers() {
        var cloned = INITIAL_USERS.map(function (user) {
            return Object.assign({}, user);
        });

        // Gộp thêm tài khoản người dùng từng đăng ký thử ở login.html (nếu có)
        try {
            var rawRegistered = localStorage.getItem('mockRegisteredUsers');
            var registered = rawRegistered ? JSON.parse(rawRegistered) : [];
            if (Array.isArray(registered)) {
                var nextId = cloned.length + 1;
                registered.forEach(function (item) {
                    if (!item || !item.email) return;
                    var exists = cloned.some(function (u) {
                        return u.email.toLowerCase() === item.email.toLowerCase();
                    });
                    if (!exists) {
                        cloned.push({
                            id: nextId++,
                            name: item.name || 'Thành viên mới',
                            email: item.email,
                            phone: item.phone || 'Chưa cập nhật',
                            role: item.role || 'Người dân',
                            isTrustedVolunteer: false,
                            isLocked: false
                        });
                    }
                });
            }
        } catch (err) {
            // Bỏ qua lỗi đọc JSON từ localStorage nếu dữ liệu không hợp lệ
        }

        return cloned;
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
        try {
            var rawUser = localStorage.getItem('currentUser');
            if (!rawUser) return;
            var user = JSON.parse(rawUser);
            if (user && user.name) {
                el.adminUserName.textContent = user.name;
            }
        } catch (err) {
            // Giữ tên mặc định "Quản trị viên"
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
            deleteRescuePoint(pendingDeleteId);
            pendingDeleteId = null;
            confirmDeleteModal.hide();
        });
    }

    /* --------------------------------------------------------------------------
       Đăng xuất (Xóa localStorage và chuyển về login.html)
       -------------------------------------------------------------------------- */

    function handleLogout() {
        localStorage.clear();
        window.location.href = 'login.html';
    }

    /* --------------------------------------------------------------------------
       Thống kê 4 Card trên cùng (đọc từ mockData.js)
       -------------------------------------------------------------------------- */

    function renderStats() {
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

            // 1. Ảnh nhỏ
            var tdImg = document.createElement('td');
            tdImg.className = 'ps-3 ps-sm-4';
            var img = document.createElement('img');
            img.className = 'admin-thumb';
            img.src = point.image || MOCK.getDefaultImageForAnimal(point.animalType);
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

            // 5. Công tắc Làm mờ tọa độ (ca nhạy cảm)
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

            switchInput.addEventListener('change', function () {
                point.isSensitiveBlurred = switchInput.checked;
                renderRescueTable();
                showToast(
                    point.isSensitiveBlurred
                        ? 'Đã bật làm mờ tọa độ cho "' + point.title + '".'
                        : 'Đã khôi phục tọa độ chính xác cho "' + point.title + '".',
                    point.isSensitiveBlurred ? 'warning' : 'success'
                );
            });

            switchWrap.appendChild(switchInput);
            switchWrap.appendChild(switchLabel);
            tdBlur.appendChild(switchWrap);

            // 6. Các nút thao tác: Đổi trạng thái, Ẩn/Hiện, Xóa tin rác
            var tdActions = document.createElement('td');
            tdActions.className = 'pe-3 pe-sm-4 text-end';

            var actionGroup = document.createElement('div');
            actionGroup.className = 'd-inline-flex flex-wrap align-items-center justify-content-end gap-1';

            // Đổi trạng thái
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

            statusSelect.addEventListener('change', function () {
                point.status = statusSelect.value;
                renderStats();
                renderRescueTable();
                showToast(
                    'Đã đổi trạng thái "' + point.title + '" thành: ' + STATUS_META[point.status].label,
                    'success'
                );
            });

            // Nút Ẩn / Hiện tin
            var btnHide = document.createElement('button');
            btnHide.type = 'button';
            btnHide.className = 'btn btn-sm ' + (point.isHidden ? 'btn-outline-success' : 'btn-outline-secondary');
            btnHide.textContent = point.isHidden ? 'Hiện' : 'Ẩn';
            btnHide.title = point.isHidden ? 'Hiện lại điểm cứu trợ trên bản đồ' : 'Ẩn tạm điểm cứu trợ nghi ngờ rác';
            btnHide.addEventListener('click', function () {
                point.isHidden = !point.isHidden;
                renderRescueTable();
                showToast(
                    point.isHidden
                        ? 'Đã ẩn báo cáo "' + point.title + '" khỏi bản đồ công khai.'
                        : 'Đã hiển thị lại báo cáo "' + point.title + '".',
                    'info'
                );
            });

            // Nút Xóa tin rác
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

    function deleteRescuePoint(pointId) {
        var target = null;
        rescuePoints = rescuePoints.filter(function (point) {
            if (point.id === pointId) {
                target = point;
                return false;
            }
            return true;
        });

        renderStats();
        renderRescueTable();

        if (target) {
            showToast('Đã xóa tin rác "' + target.title + '" khỏi hệ thống.', 'danger');
        }
    }

    /* --------------------------------------------------------------------------
       Bảng Quản lý người dùng
       -------------------------------------------------------------------------- */

    function renderUsersTable() {
        el.usersTableBody.innerHTML = '';

        var filteredUsers = usersList.filter(function (user) {
            if (!userSearchKeyword) return true;
            var text = (user.name + ' ' + user.email + ' ' + user.phone + ' ' + user.role).toLowerCase();
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
            metaEl.textContent = user.email + ' • ' + user.phone;

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
            btnBadge.addEventListener('click', function () {
                user.isTrustedVolunteer = !user.isTrustedVolunteer;
                renderUsersTable();
                showToast(
                    user.isTrustedVolunteer
                        ? 'Đã cấp huy hiệu Tình nguyện viên uy tín cho ' + user.name + '.'
                        : 'Đã gỡ huy hiệu Tình nguyện viên uy tín của ' + user.name + '.',
                    user.isTrustedVolunteer ? 'success' : 'info'
                );
            });

            var btnLock = document.createElement('button');
            btnLock.type = 'button';
            btnLock.className = 'btn btn-sm ' + (user.isLocked ? 'btn-outline-success' : 'btn-outline-danger');
            btnLock.textContent = user.isLocked ? 'Mở khóa' : 'Khóa tài khoản';
            btnLock.addEventListener('click', function () {
                user.isLocked = !user.isLocked;
                renderUsersTable();
                showToast(
                    user.isLocked
                        ? 'Đã khóa tài khoản ' + user.name + '.'
                        : 'Đã mở khóa tài khoản ' + user.name + '.',
                    user.isLocked ? 'warning' : 'success'
                );
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
