const { validate } = require("node-cron");
const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require("uuid");
const getRandomValidator = require("../../helpers/getRandomValidator");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");

async function testFunction(req, res, next) {
  console.log("test!!");


  const refID = req.params.refID;
  let pool = await poolPromise;

  const io = getIO();


  const [orders] = await pool.query(
    `SELECT * FROM orders 
     WHERE 
     refID = ? `,
    [refID]
  );

  //console.log(orders);

  let order = null;

  if(orders.length > 0) {
    order = orders[0];
  }


  const channel = `instant-withdraw-extension-${refID}`;
  io.emit(channel, order);

  return res.status(200).json({
    message: `Done!!`,
    data: order
  });
}

module.exports = testFunction;
