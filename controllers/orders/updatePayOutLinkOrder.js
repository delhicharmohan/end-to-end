const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

async function updatePayOutLinkOrder(req, res, next) {
  
  const vendor = req.user.vendor;

  // check if required fields (refID, paymentStatus) are present in the request body
  if (!req.params.refID || !req.body.paymentStatus || !req.body.hasOwnProperty('isApprovedByMOU')) {
    logger.error("Missing required fields: refID, paymentStatus");
    logger.debug({ provided_fields: [req.params, req.body] });
    return res.status(400).json({
      message: "Missing required fields.",
    });
  }

  const username = req.user.username;
  const refID = req.params.refID;
  const isApprovedByMOU = req.body.isApprovedByMOU;
  const paymentStatus = req.body.paymentStatus;

  try {

    const pool = await poolPromise;

    // check if refID exists in the orders table
    const [orders] = await pool.query("SELECT * FROM orders WHERE refID = ?", [
      refID,
    ]);

    if (!orders.length) {
      return res.status(404).json({ message: "Pay Out Order not found." });
    }

    if (orders[0].isApprovedByMOU !== null) {
      return res
        .status(400)
        .json({ message: "Manual Pay Out Link Order has already been updated." });
    }

    const data = orders[0];
    const created_by = data.created_by;

    if (created_by) {

      if (created_by !== username) {
        return res.status(403).json({
          message:
            "Unauthorized: You are not authorized to update this order.",
        });
      }

      const now = moment().tz(process.env.TIMEZONE);
      const updatedAt = now.format("YYYY-MM-DD HH:mm:ss");

      const [results] = await pool.query(
        "UPDATE orders SET isApprovedByMOU = ?, paymentStatus = ?, updatedAt = ? WHERE refID = ?",
        [isApprovedByMOU, paymentStatus, updatedAt, refID]
      );

      if (results.affectedRows === 0) {
        logger.info("Manual payout order link not updated.");
        return res.status(404).json({ message: "Manual payout order link not updated." });
      }

      data.isApprovedByMOU = isApprovedByMOU;
      data.updatedAt = updatedAt;

      const changedData = {
        refID: refID,
        isApprovedByMOU: isApprovedByMOU,
        paymentStatus: paymentStatus,
      };

      const io = getIO();
      io.emit(`${vendor}-update-payout-link-order`, changedData);

      logger.info("Manual payout order link updated successfully.");
      return res.status(201).json({ message: "Manual payout order link updated successfully.", order: data });

    } else {
      return res.status(403).json({
        message: "manual order user not found.",
      });
    }

  } catch (error) {
    logger.error("An error occurred while trying to update manual payout order link.");
    logger.debug(error);
    return res.status(500).json({
      message: "An error occurred while trying to update manual payout order link.",
    });
  }

}

module.exports = updatePayOutLinkOrder;
