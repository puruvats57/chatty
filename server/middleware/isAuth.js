const jwt = require("jsonwebtoken");

exports.isAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    req.status = "loginfirst";
  }

  const token = authHeader.split(' ')[1]; // Extract the token from the "Bearer" format

  try {
    const uid = jwt.verify(token, "hell");
    req.uid = uid; // Attach the decoded user ID to the request object
    next();
  } catch (error) {
    console.log('Token verification failed', error);
    req.status = "loginfirst";
  }
};
