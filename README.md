# 🎓 ExamPortal - Online Examination System

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-blue)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB-green)](https://www.mongodb.com/)

ExamPortal is a full-stack online examination platform designed for efficient test-taking and management. It features a modern, responsive user interface and a comprehensive admin dashboard for complete control over the examination process.

---

## 🔗 Live Demo
Visit the live portal: [https://exam-portal-five-rose.vercel.app/](https://exam-portal-five-rose.vercel.app/)

---

## 🚀 Key Features

### For Students
- **Authentication:** Secure registration and login system for students.
- **Dynamic Exams:** Course-specific test selection and real-time examination interface.
- **Instant Results:** Immediate score calculation and feedback upon completion.
- **Performance Tracking:** Maintains records of highest scores per subject.
- **Profile Management:** Update personal details and manage user settings.

### For Admins
- **User Management:** Comprehensive tools to oversee registered students and accounts.
- **Result Analysis:** View and manage examination results across the entire platform.
- **Question Bank:** Centralized management of examination questions (Create, Read, Update, Delete).
- **Portal Security:** Configurable administrative access and security settings.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (Glassmorphism design), Vanilla JavaScript.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB with Mongoose ODM.
- **Security:** Password hashing and environment-based configuration.

---

## 📦 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ExamPortal.git
cd ExamPortal
```

### 2. Backend Configuration
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in a `.env` file:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```
4. Start the application:
   ```bash
   npm start
   ```

### 3. Frontend Configuration
- Ensure the API endpoint in the frontend configuration matches your backend server address.
- Open `frontend/index.html` in any modern web browser.

---

## 📂 Project Structure

```text
ExamPortal/
├── backend/            # Express.js Server & API
│   ├── config/         # Database and configuration
│   ├── models/         # Database schemas
│   └── server.js       # Main entry point
├── frontend/           # Static Client files
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side logic
│   └── *.html          # UI Pages
└── README.md
```

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

---

## 📄 License
This project is licensed under the ISC License.
