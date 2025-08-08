const poolPromise = require("../../db");
const logger = require("../../logger");

async function updateCommission(req, res, next) {
  try {
    const username = req.validator.username;
    const amount = req.order.amount;
    const type = req.order.type;

    const pool = await poolPromise;

    // Check if the user exists
    const [userResults] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (userResults.length === 0) {
      logger.error(`Invalid username. Attempted username: '${username}'`);
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = userResults[0];
    const commissionPercentage =
      type === "payin" ? user.payInCommission : user.payOutCommission;
    const commission = (amount * commissionPercentage) / 100;
    const balanceUpdateQuery =
      type === "payin"
        ? "UPDATE users SET balance = balance + ?, payInLimit = payInLimit - ? WHERE username = ?"
        : "UPDATE users SET balance = balance - ?, payOutLimit = payOutLimit - ? WHERE username = ?";

    // Update the commission and balance
    await pool.query(balanceUpdateQuery, [commission, amount, username]);

    logger.info("Commission updated successfully.");
    next();
  } catch (error) {
    logger.error("An error occurred while trying to update commission.", error);
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to update commission.",
    });
  }
}

module.exports = updateCommission;
