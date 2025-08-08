const poolPromise = require("../../db");

async function getDashboardTicketStatics(req, res, next) {
  const vendor = req.user.vendor;
  try {

    const query = `SELECT
                    CASE 
                      WHEN status IS NULL THEN 'pending'
                      WHEN status = 1 THEN 'solved'
                      WHEN status = 0 THEN 'not_solved'
                      ELSE 'unknown'
                    END AS status_description,
                    COUNT(*) as record_count
                  FROM tickets
                  WHERE vendor = '${vendor}'
                  GROUP BY status;`;

    const pool = await poolPromise;

    const [results] = await pool.query(query);
    return res.status(200).json(results);
  } catch (error) {
    console.error("An error occurred while trying to access the database.");
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while trying to access the database.",
    });
  }
}

module.exports = getDashboardTicketStatics;
