import express from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import dotenv from 'dotenv'; // Import dotenv

dotenv.config();

const router = express.Router();

// Database setup (PostgreSQL)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'wordwave',
    password: process.env.DB_PASSWORD,
    port: 5432,
});


pool.connect()
  .then(client => {
    console.log("Connected to the database in register");
    client.release();  // Releases the connection back to the pool
  })
  .catch(err => {
    console.error('Error connecting to the database:', err.stack);
  });


// Register endpoint
router.post('/', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Check if the user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into the database
        await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
            [name, email, hashedPassword]
        );

        res.status(200).json({ message: 'User registered successfully.' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

export default router;
