# README.md
# InoxDev Backend API

India's First DevOps-for-Startups Tech Ecosystem - Backend API

## 🚀 Features

- **RESTful API** - Clean, well-documented API endpoints
- **Authentication & Authorization** - JWT-based auth with role-based access
- **Contact Management** - Advanced contact form with AI suggestions
- **Project Portfolio** - Showcase projects and case studies
- **Team Management** - Team member profiles and skills
- **Newsletter System** - Subscriber management and email campaigns
- **Analytics** - Track user interactions and website performance
- **Email Service** - Automated emails with customizable templates
- **File Upload** - Secure file handling with validation
- **Rate Limiting** - Protection against abuse and spam
- **Logging** - Comprehensive logging with Winston
- **Database Backup** - Automated backup system
- **Docker Support** - Complete containerization setup

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcryptjs
- **Email**: Nodemailer with Handlebars templates
- **AI Integration**: Google Gemini API
- **Caching**: Redis (optional)
- **File Processing**: Multer + Sharp
- **Validation**: Express Validator
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **Process Manager**: PM2
- **Containerization**: Docker + Docker Compose

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB 6.0+
- Redis 7+ (optional, for caching)
- Gmail account or SMTP service for emails
- Google Gemini API key

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/inoxdev/backend.git
cd inoxdev-backend
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Start MongoDB (if running locally)
mongod

# Seed the database with sample data
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### 5. Admin Access

After seeding, you can access the admin features with:
- **Email**: admin@inoxdev.com
- **Password**: AdminPass123!

## 🐳 Docker Deployment

### Development with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Set production environment variables
export NODE_ENV=production
export JWT_SECRET=your-super-secret-key
export MONGODB_URI=your-production-mongodb-uri

# Build and start
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new user (Admin only)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### Contact Management

- `POST /api/contact` - Submit contact form
- `POST /api/contact/suggestions` - Get AI project suggestions
- `GET /api/contact` - Get all contacts (Admin)
- `PUT /api/contact/:id` - Update contact status
- `GET /api/contact/stats/overview` - Contact statistics

### Projects

- `GET /api/projects` - Get public projects
- `GET /api/projects/featured` - Get featured projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project (Admin)
- `PUT /api/projects/:id` - Update project (Admin)

### Services

- `GET /api/services` - Get all active services
- `GET /api/services/:slug` - Get service by slug
- `POST /api/services` - Create service (Admin)
- `PUT /api/services/:id` - Update service (Admin)

### Team Management

- `GET /api/team` - Get team members
- `GET /api/team/:id` - Get team member details
- `POST /api/team` - Add team member (Admin)
- `PUT /api/team/:id` - Update team member (Admin)

### Newsletter

- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/newsletter/unsubscribe` - Unsubscribe
- `GET /api/newsletter/admin/subscribers` - Get subscribers (Admin)

### Analytics

- `POST /api/analytics/event` - Track analytics event
- `GET /api/analytics/dashboard` - Get analytics dashboard (Admin)
- `GET /api/analytics/events` - Get analytics events (Admin)

## 🔒 Security Features

- **Rate Limiting** - API and contact form protection
- **Input Validation** - Comprehensive validation with express-validator
- **SQL Injection Protection** - MongoDB injection prevention
- **XSS Protection** - Cross-site scripting prevention
- **CORS** - Cross-origin resource sharing configuration
- **Helmet** - Security headers
- **JWT Security** - Secure token implementation
- **Password Hashing** - bcryptjs with salt rounds

## 📊 Monitoring & Logging

### Logging Levels
- **Error**: System errors and exceptions
- **Warn**: Warning messages and security events
- **Info**: General application info
- **HTTP**: HTTP request logs
- **Debug**: Detailed debug information

### Log Files
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs
- `logs/access-YYYY-MM-DD.log` - Daily HTTP logs

### Health Check
```bash
curl http://localhost:5000/api/health
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:ci

# Run tests in watch mode
npm run test:watch
```

## 📦 Production Deployment

### PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start application
npm run deploy

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart inoxdev-backend
```

### Environment Variables

Key production environment variables:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/inoxdev
JWT_SECRET=your-super-secure-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GEMINI_API_KEY=your-gemini-api-key
ADMIN_EMAIL=admin@inoxdev.com
```

## 🔧 Maintenance

### Database Backup

```bash
# Manual backup
npm run backup

# Automated backup (runs via cron)
# Add to crontab: 0 2 * * * cd /path/to/app && npm run backup
```

### Log Rotation

Logs are automatically rotated:
- **Error logs**: 5MB max, 5 files kept
- **Access logs**: 20MB max, 14 days retention
- **Combined logs**: 5MB max, 5 files kept

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Email**: hello@inoxdev.com
- **Website**: https://inoxdev.com
- **Documentation**: https://docs.inoxdev.com

## 🙏 Acknowledgments

- Express.js community for the robust framework
- MongoDB team for the excellent database
- All contributors and supporters of the project

---

**Built with ❤️ by the InoxDev Team**
    