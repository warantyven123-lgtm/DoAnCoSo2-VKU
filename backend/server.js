require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const { UPLOADS_DIR } = require('./config/constants');
const { ensureUploadsDir } = require('./utils/fileHelpers');
const { sequelize } = require('./models');
const { seedDatabase } = require('./seed/seedData');

const authRoutes = require('./routes/authRoutes');
const pinRoutes = require('./routes/pinRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pinController = require('./controllers/pinController');

const PORT = Number(process.env.PORT) || 5000;
const app = express();

// 1. Middlewares toàn cục
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 2. Phục vụ file tĩnh cho thư mục uploads/ tại đường dẫn /uploads
ensureUploadsDir();
app.use('/uploads', express.static(UPLOADS_DIR));

// 3. Health check
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'Animal Rescue Map Da Nang API',
        port: PORT
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// 4. RESTful API Routes
app.use('/api/auth', authRoutes);
app.get('/api/categories', pinController.getCategories);
app.use('/api/pins', pinRoutes);
app.use('/api/admin', adminRoutes);

// 5. Xử lý 404 cho API không tồn tại
app.use((req, res) => {
    res.status(404).json({
        message: `Không tìm thấy tài nguyên: ${req.method} ${req.originalUrl}`
    });
});

// 6. Global Error Handler (Express 5 + Multer + Sequelize)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Chỉ được tải lên tối đa 5 ảnh cho mỗi báo cáo.' });
        }
        return res.status(400).json({ message: `Lỗi tải tệp: ${err.message}` });
    }

    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Dữ liệu JSON gửi lên không hợp lệ.' });
    }

    if (err && err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Dữ liệu đã tồn tại trong hệ thống.' });
    }

    if (err && err.name === 'SequelizeValidationError') {
        const details = Array.isArray(err.errors) ? err.errors.map((e) => e.message).join('; ') : err.message;
        return res.status(400).json({ message: details || 'Dữ liệu không hợp lệ.' });
    }

    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode >= 500 ? 'Lỗi máy chủ nội bộ.' : err.message;
    if (statusCode >= 500) {
        console.error('[Server Error]', err);
    }
    return res.status(statusCode).json({ message });
});

async function initializeDatabase() {
    await sequelize.authenticate();
    await sequelize.sync();
    await seedDatabase();
}

async function startServer() {
    try {
        await initializeDatabase();
        return app.listen(PORT, () => {
            console.log(`Animal Rescue Map Backend đang chạy tại http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Không thể khởi động máy chủ:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    initializeDatabase,
    startServer
};
