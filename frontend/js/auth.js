/**
 * Animal Rescue Map - Logic Đăng nhập & Đăng ký giả lập (Vanilla JS + localStorage)
 */
(function () {
    'use strict';

    var STORAGE_KEYS = {
        CURRENT_USER: 'currentUser',
        AUTH_TOKEN: 'authToken',
        REGISTERED_USERS: 'mockRegisteredUsers'
    };

    var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var PHONE_REGEX = /^(0|\+84)[0-9]{8,10}$/;

    var el = {};
    var suppressAlertClearOnTabSwitch = false;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        cacheDomElements();
        bindEvents();
        renderActiveSessionBanner();
    }

    function cacheDomElements() {
        el.tabList = document.getElementById('authTabList');
        el.tabLogin = document.getElementById('tab-login');
        el.tabRegister = document.getElementById('tab-register');
        el.authAlert = document.getElementById('authAlert');

        // Session banner
        el.sessionBanner = document.getElementById('sessionBanner');
        el.sessionUserName = document.getElementById('sessionUserName');
        el.sessionUserRole = document.getElementById('sessionUserRole');
        el.btnContinueSession = document.getElementById('btnContinueSession');
        el.btnLogout = document.getElementById('btnLogout');

        // Login form
        el.loginForm = document.getElementById('loginForm');
        el.loginEmail = document.getElementById('loginEmail');
        el.loginPassword = document.getElementById('loginPassword');
        el.btnLoginSubmit = document.getElementById('btnLoginSubmit');
        el.loginSpinner = document.getElementById('loginSpinner');

        // Register form
        el.registerForm = document.getElementById('registerForm');
        el.registerName = document.getElementById('registerName');
        el.registerEmail = document.getElementById('registerEmail');
        el.registerPhone = document.getElementById('registerPhone');
        el.registerPassword = document.getElementById('registerPassword');
        el.registerRole = document.getElementById('registerRole');
        el.btnRegisterSubmit = document.getElementById('btnRegisterSubmit');
        el.registerSpinner = document.getElementById('registerSpinner');
    }

    function bindEvents() {
        // Đồng bộ thanh trượt mượt mà khi chuyển Tab Đăng nhập / Đăng ký
        el.tabLogin.addEventListener('shown.bs.tab', function () {
            el.tabList.classList.remove('is-register');
            if (!suppressAlertClearOnTabSwitch) {
                hideAlert();
            }
            suppressAlertClearOnTabSwitch = false;
        });

        el.tabRegister.addEventListener('shown.bs.tab', function () {
            el.tabList.classList.add('is-register');
            if (!suppressAlertClearOnTabSwitch) {
                hideAlert();
            }
            suppressAlertClearOnTabSwitch = false;
        });

        // Ẩn / hiện mật khẩu
        document.querySelectorAll('[data-toggle-password]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var targetId = btn.getAttribute('data-toggle-password');
                var input = document.getElementById(targetId);
                if (!input) return;

                var isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
            });
        });

        // Xóa thông báo lỗi custom khi người dùng sửa số điện thoại
        el.registerPhone.addEventListener('input', function () {
            el.registerPhone.setCustomValidity('');
        });

        el.loginEmail.addEventListener('input', function () {
            el.loginEmail.setCustomValidity('');
        });

        el.registerEmail.addEventListener('input', function () {
            el.registerEmail.setCustomValidity('');
        });

        el.loginForm.addEventListener('submit', handleLoginSubmit);
        el.registerForm.addEventListener('submit', handleRegisterSubmit);
        el.btnLogout.addEventListener('click', handleLogout);
    }

    /* --------------------------------------------------------------------------
       Quản lý phiên đăng nhập giả lập trong localStorage
       -------------------------------------------------------------------------- */

    function readJsonStorage(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function renderActiveSessionBanner() {
        var currentUser = readJsonStorage(STORAGE_KEYS.CURRENT_USER, null);
        if (!currentUser || !currentUser.token || !currentUser.name) {
            el.sessionBanner.classList.add('d-none');
            return;
        }

        el.sessionUserName.textContent = currentUser.name;
        el.sessionUserRole.textContent = currentUser.role || 'Người dân';
        el.btnContinueSession.href = currentUser.role === 'admin' ? 'admin.html' : 'index.html';
        el.sessionBanner.classList.remove('d-none');
    }

    function handleLogout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        el.sessionBanner.classList.add('d-none');
        showAlert('Đã đăng xuất khỏi phiên làm việc hiện tại.', 'info');
    }

    function findRegisteredUserByEmail(email) {
        var list = readJsonStorage(STORAGE_KEYS.REGISTERED_USERS, []);
        if (!Array.isArray(list)) return null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].email && list[i].email.toLowerCase() === email) {
                return list[i];
            }
        }
        return null;
    }

    function saveRegisteredUser(userRecord) {
        var list = readJsonStorage(STORAGE_KEYS.REGISTERED_USERS, []);
        if (!Array.isArray(list)) list = [];

        var updated = false;
        for (var i = 0; i < list.length; i++) {
            if (list[i].email && list[i].email.toLowerCase() === userRecord.email.toLowerCase()) {
                list[i] = userRecord;
                updated = true;
                break;
            }
        }

        if (!updated) {
            list.push(userRecord);
        }

        localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(list));
    }

    function formatDisplayNameFromEmail(email) {
        var prefix = (email.split('@')[0] || 'Thành viên').replace(/[._-]+/g, ' ').trim();
        if (!prefix) return 'Thành viên cứu hộ';

        return prefix
            .split(/\s+/)
            .map(function (part) {
                return part.charAt(0).toUpperCase() + part.slice(1);
            })
            .join(' ');
    }

    function createMockToken() {
        return 'arm-token-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    /* --------------------------------------------------------------------------
       Xử lý Submit Đăng nhập & Đăng ký
       -------------------------------------------------------------------------- */

    function handleLoginSubmit(event) {
        event.preventDefault();
        hideAlert();

        var email = el.loginEmail.value.trim().toLowerCase();
        var password = el.loginPassword.value;

        el.loginEmail.setCustomValidity(EMAIL_REGEX.test(email) ? '' : 'Email không hợp lệ');
        el.loginForm.classList.add('was-validated');

        if (!el.loginForm.checkValidity() || !EMAIL_REGEX.test(email) || password.length < 6) {
            return;
        }

        var isAdmin = email === 'admin@gmail.com';
        var registered = findRegisteredUserByEmail(email);

        var userProfile = {
            name: isAdmin
                ? 'Quản trị viên'
                : (registered && registered.name ? registered.name : formatDisplayNameFromEmail(email)),
            email: email,
            role: isAdmin
                ? 'admin'
                : (registered && registered.role ? registered.role : 'Người dân'),
            token: createMockToken()
        };

        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userProfile));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, userProfile.token);

        var redirectUrl = isAdmin ? 'admin.html' : 'index.html';
        var successMessage = isAdmin
            ? 'Đăng nhập quyền Quản trị viên thành công! Đang chuyển hướng sang admin.html...'
            : 'Đăng nhập thành công! Đang chuyển hướng về bản đồ cứu trợ...';

        el.btnLoginSubmit.disabled = true;
        el.loginSpinner.classList.remove('d-none');
        showAlert(successMessage, 'success');

        setTimeout(function () {
            window.location.href = redirectUrl;
        }, 650);
    }

    function handleRegisterSubmit(event) {
        event.preventDefault();
        hideAlert();

        var name = el.registerName.value.trim();
        var email = el.registerEmail.value.trim().toLowerCase();
        var normalizedPhone = el.registerPhone.value.replace(/[\s.-]/g, '').trim();
        var password = el.registerPassword.value;
        var role = el.registerRole.value;

        el.registerEmail.setCustomValidity(EMAIL_REGEX.test(email) ? '' : 'Email không hợp lệ');
        el.registerPhone.setCustomValidity(PHONE_REGEX.test(normalizedPhone) ? '' : 'Số điện thoại không hợp lệ');
        el.registerForm.classList.add('was-validated');

        if (!el.registerForm.checkValidity() || name.length < 2 || password.length < 6 || !role) {
            return;
        }

        saveRegisteredUser({
            name: name,
            email: email,
            phone: normalizedPhone,
            role: role
        });

        // Chuyển mượt sang Tab Đăng nhập và điền sẵn Email vừa đăng ký
        el.registerForm.reset();
        el.registerForm.classList.remove('was-validated');
        el.loginEmail.value = email;
        el.loginPassword.value = '';
        el.loginForm.classList.remove('was-validated');

        suppressAlertClearOnTabSwitch = true;
        bootstrap.Tab.getOrCreateInstance(el.tabLogin).show();

        showAlert(
            'Đăng ký thành công (' + role + ')! Vui lòng đăng nhập để tiếp tục.',
            'success'
        );
        el.loginPassword.focus();
    }

    /* --------------------------------------------------------------------------
       Hiển thị thông báo trạng thái
       -------------------------------------------------------------------------- */

    function showAlert(message, variant) {
        el.authAlert.className = 'alert rounded-3 py-2 px-3 small mb-3 alert-' + (variant || 'info');
        el.authAlert.textContent = message;
    }

    function hideAlert() {
        el.authAlert.className = 'alert d-none rounded-3 py-2 px-3 small mb-3';
        el.authAlert.textContent = '';
    }
})();
