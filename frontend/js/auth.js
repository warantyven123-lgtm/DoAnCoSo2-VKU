/**
 * Animal Rescue Map - Logic Đăng nhập & Đăng ký (Vanilla JS + REST API + JWT)
 */
(function () {
    'use strict';

    var API_BASE_URL = 'http://localhost:5000/api';

    var STORAGE_KEYS = {
        CURRENT_USER: 'currentUser',
        AUTH_TOKEN: 'authToken'
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
       Quản lý phiên đăng nhập JWT trong localStorage
       -------------------------------------------------------------------------- */

    function readJsonStorage(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function getStoredToken() {
        var token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (token) return token;
        var currentUser = readJsonStorage(STORAGE_KEYS.CURRENT_USER, null);
        return currentUser && currentUser.token ? currentUser.token : '';
    }

    function saveSession(user, token) {
        var userProfile = Object.assign({}, user, { token: token });
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userProfile));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    async function renderActiveSessionBanner() {
        var currentUser = readJsonStorage(STORAGE_KEYS.CURRENT_USER, null);
        var token = getStoredToken();
        if (!currentUser || !token || !currentUser.name) {
            el.sessionBanner.classList.add('d-none');
            return;
        }

        displayBanner(currentUser);

        // Xác thực lại token với Back-end để đảm bảo phiên còn hiệu lực
        try {
            var res = await fetch(API_BASE_URL + '/auth/me', {
                headers: {
                    Authorization: 'Bearer ' + token
                }
            });
            if (!res.ok) {
                clearSession();
                el.sessionBanner.classList.add('d-none');
                return;
            }
            var data = await res.json();
            if (data && data.user) {
                saveSession(data.user, token);
                displayBanner(data.user);
            }
        } catch (err) {
            // Giữ banner tạm thời nếu mất kết nối mạng
        }
    }

    function displayBanner(user) {
        var isAdmin = String(user.role || '').toLowerCase() === 'admin';
        el.sessionUserName.textContent = user.name || user.email;
        el.sessionUserRole.textContent = user.role || 'Người dân';
        el.btnContinueSession.href = isAdmin ? 'admin.html' : 'index.html';
        el.sessionBanner.classList.remove('d-none');
    }

    function handleLogout() {
        clearSession();
        el.sessionBanner.classList.add('d-none');
        showAlert('Đã đăng xuất khỏi phiên làm việc hiện tại.', 'info');
    }

    function setLoginLoading(isLoading) {
        el.btnLoginSubmit.disabled = isLoading;
        el.loginSpinner.classList.toggle('d-none', !isLoading);
    }

    function setRegisterLoading(isLoading) {
        el.btnRegisterSubmit.disabled = isLoading;
        el.registerSpinner.classList.toggle('d-none', !isLoading);
    }

    /* --------------------------------------------------------------------------
       Xử lý Submit Đăng nhập & Đăng ký qua API
       -------------------------------------------------------------------------- */

    async function handleLoginSubmit(event) {
        event.preventDefault();
        hideAlert();

        var email = el.loginEmail.value.trim().toLowerCase();
        var password = el.loginPassword.value;

        el.loginEmail.setCustomValidity(EMAIL_REGEX.test(email) ? '' : 'Email không hợp lệ');
        el.loginForm.classList.add('was-validated');

        if (!el.loginForm.checkValidity() || !EMAIL_REGEX.test(email) || password.length < 6) {
            return;
        }

        setLoginLoading(true);

        try {
            var response = await fetch(API_BASE_URL + '/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            var data = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                setLoginLoading(false);
                showAlert(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.', 'danger');
                return;
            }

            if (!data.token || !data.user) {
                setLoginLoading(false);
                showAlert('Phản hồi từ máy chủ không hợp lệ.', 'danger');
                return;
            }

            saveSession(data.user, data.token);

            var isAdmin = String(data.user.role || '').toLowerCase() === 'admin';
            var redirectUrl = isAdmin ? 'admin.html' : 'index.html';
            var successMessage = isAdmin
                ? 'Đăng nhập quyền Quản trị viên thành công! Đang chuyển hướng sang admin.html...'
                : 'Đăng nhập thành công! Đang chuyển hướng về bản đồ cứu trợ...';

            showAlert(successMessage, 'success');

            setTimeout(function () {
                window.location.href = redirectUrl;
            }, 550);
        } catch (err) {
            setLoginLoading(false);
            showAlert('Không thể kết nối tới máy chủ (http://localhost:5000). Vui lòng kiểm tra lại Back-end.', 'danger');
        }
    }

    async function handleRegisterSubmit(event) {
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

        setRegisterLoading(true);

        try {
            var response = await fetch(API_BASE_URL + '/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: normalizedPhone,
                    password: password,
                    role: role
                })
            });

            var data = await response.json().catch(function () {
                return {};
            });

            setRegisterLoading(false);

            if (!response.ok) {
                showAlert(data.message || 'Đăng ký thất bại. Vui lòng thử lại.', 'danger');
                return;
            }

            // Chuyển mượt sang Tab Đăng nhập và điền sẵn Email vừa đăng ký
            el.registerForm.reset();
            el.registerForm.classList.remove('was-validated');
            el.loginEmail.value = email;
            el.loginPassword.value = '';
            el.loginForm.classList.remove('was-validated');

            suppressAlertClearOnTabSwitch = true;
            bootstrap.Tab.getOrCreateInstance(el.tabLogin).show();

            showAlert(
                (data.message || ('Đăng ký thành công (' + role + ')!')) + ' Vui lòng đăng nhập để tiếp tục.',
                'success'
            );
            el.loginPassword.focus();
        } catch (err) {
            setRegisterLoading(false);
            showAlert('Không thể kết nối tới máy chủ (http://localhost:5000). Vui lòng kiểm tra lại Back-end.', 'danger');
        }
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
