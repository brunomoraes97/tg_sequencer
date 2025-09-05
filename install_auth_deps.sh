#!/bin/bash

# Install new dependencies for authentication system
echo "Installing new dependencies..."

pip install python-jose[cryptography]==3.3.0
pip install passlib[bcrypt]==1.7.4  
pip install python-multipart==0.0.6
pip install pydantic[email]==2.8.2

echo "Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run the database migration: python backend/migrate_add_auth.py"
echo "2. Restart your backend server"
echo ""
echo "New authentication endpoints will be available at:"
echo "- POST /api/auth/register - Register new user"
echo "- POST /api/auth/login - Login user"  
echo "- GET /api/auth/me - Get current user info"
