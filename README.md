# 🎓 ExamPortal - Modern Online Examination System

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/sumitdwivedi681/ExamPortal/graphs/commit-activity)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Framework](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-blue)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB-green)](https://www.mongodb.com/)

ExamPortal is a robust, full-stack online examination platform designed for seamless test-taking and management. It features a premium, responsive glassmorphism UI and a powerful admin dashboard.

---

## 🔗 Live Demo
Experience the platform live: [ExamPortal Live](https://examportal-backend-fakr.onrender.com) (Note: Backend may take a few seconds to wake up on first load).

---

## 🚀 Features

### For Students
- **User Authentication:** Secure registration and login system.
- **Course-Based Exams:** Students can take tests specific to their enrolled courses.
- **Real-time Scoring:** Instant feedback and score calculation after test submission.
- **High Score Tracking:** Only the best score for each subject is persisted.
- **Profile Management:** Users can update their names, passwords, and profile pictures.
- **Responsive Dashboard:** A premium, glassmorphism-style UI that works on all devices.

### For Admins
- **User Management:** View all registered students and delete accounts if necessary.
- **Result Oversight:** Track all examination results across the platform.
- **Question Bank:** Manage (view/edit/delete) the database of examination questions.
- **Security Settings:** Change the admin dashboard password directly from the portal.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 & CSS3:** Custom styles with a focus on modern Glassmorphism.
- **Vanilla JavaScript:** Fast, framework-less interaction and API handling.
- **Lucide Icons:** Premium iconography for a clean look.

### Backend
- **Node.js & Express.js:** Scalable and fast server-side logic.
- **MongoDB & Mongoose:** Efficient NoSQL data modeling and storage.
- **Bcryptjs:** Secure password hashing.
- **Dotenv:** Environment variable management.
- **CORS:** Secure cross-origin resource sharing.

---

## 📦 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v14+)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account or local MongoDB installation.

### 1. Clone the Repository
```bash
git clone https://github.com/sumitdwivedi681/ExamPortal.git
cd ExamPortal
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory and add your credentials:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. The frontend is built with static files. You can open `frontend/index.html` directly in your browser.
2. Ensure the `frontend/config.js` points to your backend URL (local or deployed).

---

## 📂 Project Structure

```text
ExamPortal/
├── backend/            # Express.js Server
│   ├── config/         # DB Connection & Models
│   ├── models/         # Mongoose Schemas (Question, Result, Student)
│   ├── server.js       # Main Entry Point
│   └── .env            # Environment Variables
├── frontend/           # Static Frontend Files
│   ├── admin.html      # Admin Dashboard
│   ├── dashboard.html  # Student Dashboard
│   ├── index.html      # Landing & Login/Signup
│   ├── subject.html    # Subject Selection
│   ├── test.html       # Exam Interface
│   ├── result.html     # Score Report
│   └── css/js/         # Styles and Logic
└── README.md
```

---

## 🔐 Admin Access
By default, the admin password is set to `admin123`. This can be changed in the Admin Dashboard under the "Settings" tab once logged in.

---

## 🤝 Contributing
Contributions are welcome! If you have suggestions for improvements or new features, feel free to fork the repository and submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
This project is licensed under the ISC License.

---

## 📧 Contact
**Sumit Dwivedi** - [sumitdwivedi681@gmail.com](mailto:sumitdwivedi681@gmail.com)  

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/sumit-dwivedi-76965b386/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sumitdwivedi681-ops)

Project Link: [https://github.com/sumitdwivedi681/ExamPortal](https://github.com/sumitdwivedi681/ExamPortal)
