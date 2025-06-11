const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const secretKey = 'your-secret-key';

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decodedToken = jwt.verify(token, secretKey);
    // Try to get name from token, otherwise fetch from DB
    let user = { _id: decodedToken.userId, email: decodedToken.email };
    if (decodedToken.name) {
      user.name = decodedToken.name;
    } else {
      // Fetch from DB if not in token
      const dbUser = await UserModel.findById(decodedToken.userId).lean();
      if (dbUser) user.name = dbUser.name;
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed try Again' });
  }
};