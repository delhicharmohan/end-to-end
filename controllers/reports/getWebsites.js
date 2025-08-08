const poolPromise = require("../../db");

async function getWebsites(req, res, next) {
  const vendor = req.user.vendor;

  try {
    const pool = await poolPromise;

    const query = `SELECT DISTINCT website FROM orders WHERE website <> ''` +
      (vendor !== null ? ` AND vendor = '${vendor}'` : '');

    const [results] = await pool.query(query);

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to access the database.",
    });
  }
}

module.exports = getWebsites;