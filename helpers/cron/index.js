const cron = require('node-cron');
const logger = require("../../logger");
const updateOrders = require("./orders/updateOrders");
const expirePayinsTask = require("./orders/expirePayins");

const NewOrderController = require("../cron/orders/newOrderController");
const newOrderController = new NewOrderController();

// Define the cron job
// cron.schedule('0 4 * * *', async () => {
//     try {
//         logger.info(`pending-failed cron start`);
//         await updateOrders('payin', 'pending', 'failed');
//         logger.info(`pending-failed cron end`);
//     } catch (error) {
//         logger.info(`ERROR ===>>> error`);
//     }
// });

// cron.schedule('*/4 * * * *', async () => {

//     console.log("cron running from main");
//     await newOrderController.processBankResponse();
// });

// Define the task function for move old transaction
const moveOldTransactionsTask = async () => {
    logger.info(`Running cron job to move old transactions start`);
    await newOrderController.moveOldTransactions();
    logger.info(`Running cron job to move old transactions end`);
};

// Schedule the cron job to move old transactions to run every day at 2:00 AM
cron.schedule('30 20 * * *', moveOldTransactionsTask);

// Schedule: expire pending payins every minute and revert balances safely
cron.schedule('* * * * *', async () => {
    try {
        await expirePayinsTask();
    } catch (err) {
        logger.error(`[cron] expirePayinsTask failed: ${err?.message}`);
    }
});
module.exports = cron;
