const poolPromise = require("../db");
const logger = require("../logger");
const { onlineUsers } = require("../socket");
const moment = require("moment-timezone");

async function getOrderUsageIndex(vendor) {
  const pool = await poolPromise;
  const now = moment().tz(process.env.TIMEZONE);
  const nowTime = now.format("YYYY-MM-DD HH:mm:ss");

  const limit = 50;
  let offset = 0;
  let foundOrder = null;

  let orderScaleLength = '300.0';
  let orderIndexHourIn = '100';

    const query = `
    
    SELECT Now() AS cTime,
       Count(IF(type = 'payin'
                AND paymentStatus = 'approved', 1, NULL)) AS
       payin_count_last_hour,
       Count(IF(type = 'payout'
                AND paymentStatus = 'approved', 1, NULL)) AS
       payout_count_last_hour,
       SUM(IF(type = 'payin'
              AND paymentStatus = 'approved', amount, 0)) AS
       payin_amount_last_hour,
       SUM(IF(type = 'payout'
              AND paymentStatus = 'approved', amount, 0)) AS
       payout_amount_last_hour,
       Round(Least(Count(IF(type = 'payin'
                            AND paymentStatus = 'approved', 1, NULL)) / ${orderScaleLength} *
                   10, 10)
       , 2)                                               AS payin_index,
       Round(Least(Count(IF(type = 'payout'
                            AND paymentStatus = 'approved', 1, NULL)) / ${orderScaleLength} * 10, 10),2) AS payout_index 
       FROM orders
WHERE  vendor = ? AND createdAt >= ? - interval ? hour`;

    const params = [
      vendor,
      nowTime,
      orderIndexHourIn
    ];

    const [ordersIndexes] = await pool.query(query, params);
    if(ordersIndexes.length > 0 ) {
      let orderIndex = ordersIndexes[0];
      if(orderIndex.payin_index != '0.0') {
        return parseInt(orderIndex.payin_index);
      } else {
        return 0;
      }
    }
    return 0;
}

module.exports = getOrderUsageIndex;
