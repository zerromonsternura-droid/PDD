# 🚦 PDD Test.kz

Kazakh-language **PDD (Жол жүру ережелері)** learning website with user authentication and an AI assistant powered by Google Gemini.

The project includes:

* 🌐 Frontend (HTML / CSS / JavaScript)
* ⚙️ Backend (**Node.js + Express**)
* 🗄️ Database (**PostgreSQL**)
* 🤖 AI assistant for PDD questions (**Google Gemini API**)
* 🐳 Docker support for easy deployment

---

# 📌 Features

### 👤 Authentication

* User registration
* User login
* Password hashing using **bcrypt**

### 🤖 AI Chat Assistant

Users can ask questions about:

* Road signs
* Driving rules
* Traffic laws
* PDD exam preparation

AI responses are generated using **Google Gemini API**.

### 🗄️ Database

User data is stored in **PostgreSQL**.

Table example:

```sql
users
├── id
├── email
├── password
└── created_at
```

---

# 🛠️ Tech Stack

Backend:

* Node.js
* Express
* PostgreSQL
* bcryptjs

Frontend:

* HTML
* CSS
* JavaScript

Infrastructure:

* Docker
* Docker Compose

AI:

* Google Gemini API

---

# 📂 Project Structure

```
project
│
├── index.html
├── style.css
├── script.js
│
├── server.js
├── db.js
│
├── package.json
├── Dockerfile
├── docker-compose.yml
│
└── README.md
```

---

# ⚙️ Installation

### 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/pdd-test.git
cd pdd-test
```

---

### 2️⃣ Install dependencies

```bash
npm install
```

---

### 3️⃣ Set environment variables

Create a `.env` file:

```
GOOGLE_API_KEY=your_gemini_api_key
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456
DB_NAME=postgres
```

---

### 4️⃣ Run the server

```bash
npm start
```

Open in browser:

```
http://localhost:3000
```

---

# 🐳 Running with Docker

Start the project using Docker:

```bash
docker compose up --build
```

Application will run at:

```
http://localhost:3000
```

PostgreSQL will run at:

```
localhost:5432
```

---

# 🧠 AI Chat Endpoint

```
POST /api/chat
```

Example request:

```json
{
  "message": "Жол белгілерін қалай есте сақтауға болады?"
}
```

Example response:

```json
{
  "reply": "Жол белгілерін есте сақтау үшін..."
}
```

---

# 🔐 Authentication API

### Register

```
POST /api/register
```

Body:

```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

---

### Login

```
POST /api/login
```

Body:

```json
{
  "email": "user@email.com",
  "password": "password123"
}
```

---

# 🗄️ Database

Default database:

```
PostgreSQL
```

Default table:

```
users
```

---

# 🚀 Future Improvements

* PDD exam simulation
* Progress tracking
* User profiles
* Admin panel
* Mobile responsive design

---

# 📜 License

MIT License

---

# 👨‍💻 Author

Developed for learning and practicing **PDD rules in Kazakh language**.
