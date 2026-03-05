import pkg from 'pg';
const { Pool } = pkg;

// Қоршаған ортадан параметрлер
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASS = process.env.DB_PASS || '123456';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
const DB_MAIN = process.env.DB_MAIN || 'postgres'; // бастапқы дерекқоры
const DB_USERS = process.env.DB_USERS || 'pdd_users';

// PostgreSQL байланысын құру
const pool = new Pool({
  user: DB_USER,
  password: DB_PASS,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_MAIN,
});

// Деректер базасын құру (егер болмаса)
async function initializeDatabase() {
  let dbInitialized = false;
  
  try {
    console.log('PostgreSQL-ге байланысу талантушу...');
    
    // ${DB_USERS} деректер базасының болуын тексеру
    const checkDbQuery = `
      SELECT datname FROM pg_catalog.pg_database WHERE datname = '${DB_USERS}';
    `;
    const dbResult = await pool.query(checkDbQuery);
    
    if (dbResult.rows.length === 0) {
      console.log(`${DB_USERS} деректер базасы құрылуда...`);
      await pool.query(`CREATE DATABASE ${DB_USERS};`);
      console.log(`✓ ${DB_USERS} деректер базасы құрылды`);
    } else {
      console.log(`✓ ${DB_USERS} деректер базасы табылды`);
    }

    // ${DB_USERS} деректер базасына қосылу
    const userPool = new Pool({
      user: DB_USER,
      password: DB_PASS,
      host: DB_HOST,
      port: DB_PORT,
      database: DB_USERS,
    });

    // users кестесін құру (егер болмаса)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await userPool.query(createTableQuery);
    console.log('✓ users кестесі құрылды');
    
    // users_stats кестесін құру (статистика үшін)
    const createStatsTableQuery = `
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        test_name VARCHAR(255),
        score INTEGER,
        total_questions INTEGER,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await userPool.query(createStatsTableQuery);
    console.log('✓ user_stats кестесі құрылды');

    await userPool.end();
    dbInitialized = true;
    console.log('✓ Деректер базасы толығымен орындалды');
    return true;
  } catch (error) {
    console.error('Деректер базасын құру кезінде қате:', error.message);
    console.log('[ЕСКЕРТУ] PostgreSQL орындалып тұрғанын және пароль дұрыс екендігін тексеріңіз');
    // Қате болса да серверді іске қосуға рұқсат береміз
    return false;
  }
}

// Пайдаланушыға жеке деректер базасы байланысы үшін
function getUserPool() {
  return new Pool({
    user: DB_USER,
    password: DB_PASS,
    host: DB_HOST,
    port: DB_PORT,
    database: DB_USERS,
  });
}

export { pool, initializeDatabase, getUserPool };
