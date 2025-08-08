const poolPromise = require("../../db");
const logger = require("../../logger");
const moment = require("moment-timezone");
const { getIO } = require("../../socket");
const templateList = require('./template');
const senderIdList = require('./senderIdList');
const MessageFormat = require('./messageFormat');

messageFormat = new MessageFormat();



async function approveOrder(req, res, next) {
  try {


    const requiredFields = ['sender_id', 'message', 'timestamp', 'unique_id'];

    const fields = req.body;
    const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
    const message = fields.message;
    const senderId = fields.sender_id;

    var amount = 0.0;
    var accountNo = '';
    var transactionID = '';




    const timestamp = req.body.timestamp;

    const bank3Letter = senderId.substring(3, 6);
    if (bank3Letter.length < 3) {
      // 3 letter failed
      return res
        .status(404)
        .json({ status: false, message: "Invalid Template ID" });
    }


    


    var isMatch =  senderIdList.includes(bank3Letter);
    console.log(isMatch);
    console.log(isMatch);
    console.log(isMatch);
    console.log(isMatch);
    console.log(isMatch);
    console.log(isMatch);
    if(isMatch) {
       amount = messageFormat.extractFirstAmount(message);
       transactionID = messageFormat.extractUTR(message);
    } else {
      return res
      .status(404)
      .json({ status: false, message: "Invalid Message Template" });
    }

    if(amount == 0.0 || transactionID == '') {
      return res
      .status(404)
      .json({ status: false, message: "Invalid Message Template" });
    }



    //const bankTemplate = templateList.find(template => template.bank == bank3Letter);
    //var templatesLength = bankTemplate.searchers.length;
    //var validTemplateIndex = null;


    // bankTemplate.searchers.some((searchElement, index) => {
    //   console.log(searchElement);
    //   var searchResult = {
    //     total: searchElement.search.length,
    //     found: 0,
    //     notFound: 0,
    //     optional: 0,
    //   };
    //   searchElement.search.forEach(item => {
    //     const found = message.includes(item.search);

    //     if (item.required) {
    //       if (found) {
    //         searchResult.found = searchResult.found + 1;
    //       } else {
    //         searchResult.notFound = searchResult.notFound + 1;
    //       }
    //     } else {
    //       if (found) {
    //         searchResult.found = searchResult.found + 1;
    //       } else {
    //         searchResult.optional = searchResult.optional + 1;
    //       }
    //     }
    //   });

    //   if (searchResult.total == (searchResult.found + searchResult.optional)) {
    //     validTemplateIndex = index;
    //     return true;
    //   } else {
    //     return false;
    //   }
    // });


   // var validFilter = bankTemplate.filters[validTemplateIndex];

    // if (validFilter == null) {
    //   logger.error("Invalid SMS Template conflict in search, or filter");
    //   return res
    //     .status(404)
    //     .json({ status: false, message: "Invalid SMS Template conflict in search, or filter" });
    // }

    // validFilter.filter.forEach(element => {
    //   if (element.key == 'accountNo') {
    //     const matchAccount = message.match(element.regex);
    //     if (matchAccount && matchAccount[1]) {
    //       accountNo = matchAccount[1];
    //     }
    //   }

    //   if (element.key == 'amount') {
    //     const amountMatch = message.match(element.regex);
    //     if (amountMatch && amountMatch[1]) {
    //       amount = parseFloat(amountMatch[1]).toFixed(2);
    //     }
    //   }

    //   if (element.key == 'refId') {
    //     const refMatch = message.match(element.regex);
    //     if (refMatch && refMatch[1]) {
    //       transactionID = refMatch[1];
    //     }
    //   }
    // });

    console.log("==================================");
    console.log(amount);
    ///console.log(accountNo);
    console.log(transactionID);
    console.log("==================================");


    const uniqueIdentifier = req.body.unique_id;

    const pool = await poolPromise;

    const [userResult] = await pool.query(
      "SELECT * FROM users WHERE uniqueIdentifier = ?",
      [uniqueIdentifier]
    );

    if (userResult.length === 0) {
      logger.error("Unique Identifier not found");
      return res
        .status(400)
        .json({ status: false, message: "Invalid Unique Identifier" });
    }

    const validatorUsername = userResult[0].username;
    const now = moment().tz(process.env.TIMEZONE);
    const fiveMinutesAgoMoment = now.subtract(5, 'minutes');
    const fiveMinutesAgo = fiveMinutesAgoMoment.format("YYYY-MM-DD HH:mm:ss");

    const query = "SELECT * FROM orders WHERE validatorUsername = ? AND updatedAt >= ? AND paymentMethod = ? AND amount = ? AND type = ? AND paymentStatus = ?";
    //const query = "SELECT * FROM orders WHERE  validatorUsername = ? AND updatedAt >= ? AND amount = ? AND type = ? AND paymentStatus = ?";
    const queryParams = [validatorUsername, fiveMinutesAgo, 'automatic_payment_with_sms', amount, 'payin', 'pending'];
    //const queryParams = [validatorUsername, fiveMinutesAgo, amount, 'payin', 'pending'];
    const [orderResult] = await pool.query(
      query,
      queryParams
    );

    if (orderResult.length === 1) {
      req.validator = userResult[0];

      const refID = orderResult[0].refID;
      const vendor = orderResult[0].vendor;
      // update the order status to approved

      const [results] = await pool.query(
        "UPDATE orders SET automation_type = ?, paymentStatus = ?, transactionID = ?, approvedBy = ?, updatedAt = ? WHERE refID = ?",
        [
          'bank_sms',
          "approved",
          transactionID,
          'auto',
          now.format("YYYY-MM-DD HH:mm:ss"),
          refID,
        ]
      );

      const changedData = {
        refID: refID,
        paymentStatus: 'approved',
        transactionID: transactionID,
      };

      const io = getIO();
      io.emit(`${vendor}-order-update-status-and-trnx`, changedData);

      req.order = orderResult[0];
      req.order.paymentStatus = "approved";
      req.order.transactionID = transactionID;

      logger.info(
        `Order approved automatically with sms app. refID:${req.order.refID}, orderId:${req.order.merchantOrderId}`
      );

      res.body = {
        message: "Order approved automatically with sms app.",
        order: results,
      };
      next();
    } else {
      // console.log(orderResult.length)
      // return res
      // .status(200)
      // .json({ status: false, message: "Unknown Error while approving Order automatically with sms app." });
      if (orderResult.length > 1) {
        return res
          .status(400)
          .json({ status: false, message: "duplicate orders." });
      } else {
        return res
          .status(404)
          .json({ status: false, message: "no order." });
      }
    }
  } catch (error) {

    console.log(error);

    if (error.code == 'ER_DUP_ENTRY') {
      logger.error("Duplicate UTR Number " + transactionID);
      return res
        .status(400)
        .json({ status: false, message: "Duplicate UTR Number" });
    }
    return res
      .status(500)
      .json({ status: false, message: "Unknown Error while approving Order automatically with sms app." });
  }
}

module.exports = approveOrder;
