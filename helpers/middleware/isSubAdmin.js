const db = require("../../db");

async function isSubAdmin(req, res, next) {
  if (req.user.role === "subadmin") {
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: You are not a subadmin.",
    });
  }
}

module.exports = isSubAdmin;
