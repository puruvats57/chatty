
const jwt = require("jsonwebtoken");

exports.isAuth = (req, res, next) => {

  const { token} = req.body;

  console.log("isauth", token);
  //const token = req.body.token;
  //const token = req.body.t;

    // CHECK IF WE EVEN HAVE A TOKEN
  if (!token) {
    console.log("not found");
    req.status = "loginfirst";
    
  }
  else {
    const uid = jwt.verify(token, "hell");
    if (uid) {
      console.log("uid from auth",uid);
      req.uid = { uid };
      
    }
    else {
      console.log('logi first');
      req.status = "loginfirst";
      
    }
    
}
    next();
};
