import express from 'express';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
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

// Secret key for JWT (store this securely in an environment variable)
const JWT_SECRET = process.env.JWT_SECRET;
if(!JWT_SECRET)
{
    console.log("no secret key found");
}

pool.connect()
  .then(client => {
    console.log("Connected to the database in login");
    client.release();  // Releases the connection back to the pool
  })
  .catch(err => {
    console.error('Error connecting to the database:', err.stack);
  });

// Login endpoint
router.post('/', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Both email and password are required.' });
    }

    try {
        // Check if the user exists
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not found.' });
        }

        const user = userResult.rows[0];

        // Compare the provided password with the stored hash
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Incorrect password.' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email,name : user.name },  // Payload
            JWT_SECRET,                             // Secret key
            { expiresIn: '1h' }                    // Expiration time (1 hour)
        );

        // Send the token as a response
        res.status(200).json({
            message: 'Login successful.',
            token,  // Send the token to the client
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

export default router;
