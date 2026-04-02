const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authController = {
    // Register new user
    async register(req, res) {
        try {
            const { name, email, password } = req.body;

            // Validation - check if all fields are provided
            if (!name || !email || !password) {
                return res.status(400).json({ 
                    message: 'Please provide name, email and password' 
                });
            }

            // Check if email already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ 
                    message: 'Email already registered' 
                });
            }

            // Hash password (10 salt rounds)
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user in database
            const userId = await User.create({
                name,
                email,
                password: hashedPassword
            });

            // Get the created user (without password)
            const newUser = await User.findById(userId);

            // Send success response
            res.status(201).json({
                message: 'User registered successfully',
                user: newUser
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ 
                message: 'Error registering user' 
            });
        }
    },

          // Login user
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({ 
                    message: 'Please provide email and password' 
                });
            }

            // Check if user exists
            const user = await User.findByEmail(email);
            if (!user) {
                return res.status(401).json({ 
                    message: 'Invalid email or password' 
                });
            }

            // Compare password with stored hash
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ 
                    message: 'Invalid email or password' 
                });
            }

            // Create JWT token
            const token = jwt.sign(
                { 
                    userId: user.id,  // Payload - data we want to store in token
                    email: user.email 
                },
                process.env.JWT_SECRET,  // Secret key from .env
                { 
                    expiresIn: '24h'  // Token expires in 24 hours
                }
            );

            // Remove password from user object before sending
            const { password: _, ...userWithoutPassword } = user;

            res.status(200).json({
                message: 'Login successful',
                token: token,
                user: userWithoutPassword
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                message: 'Error logging in' 
            });
        }
    }


};

module.exports = authController;