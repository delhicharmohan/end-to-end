const poolPromise = require("../../db");
const logger = require("../../logger");
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Buffer = require('buffer').Buffer;

class KeyController {




    async generateKey(req, res) {

        const requiredFields = ['vendor', 'app_name'];

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

            const pool = await poolPromise;
            const config = {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            };

            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', config);
            const publicKeyMesage = Buffer.from(process.env.JWT_SECRET);
            const signer = crypto.createSign('RSA-SHA256');
            signer.update(publicKeyMesage);
            const signature = signer.sign(privateKey, 'base64');

            //const verifier = crypto.createVerify('RSA-SHA256');
            //verifier.update(publicKeyMesage);
            //const isVerified = verifier.verify(publicKey, signature, 'base64');
            // if (isVerified) {
            //     console.log('Signature is valid. Public key matches private key.');
            // } else {
            //     console.log('Signature is invalid. Public key does not match private key.');
            // }

            const uuid = uuidv4();
            const [result] = await pool.query(
                "INSERT INTO app_auth (salt, vendor, public_key, private_key, status) VALUES (?, ?, ?, ?, ?)",
                [
                    uuid,
                    req.body.vendor,
                    publicKey,
                    privateKey,
                    1,
                ]
            );

            if (result.affectedRows > 0) {
                const publicKeyEncoded = Buffer.from(publicKey).toString('base64');
                return res.status(200).json({
                    status: true,
                    message: "Public key generated successully",
                    data: {
                        key: publicKeyEncoded,
                        salt: uuid,
                    }
                });
            } else {
                return res.status(404).json({
                    status: false,
                    message: "Licence not found or invalid."
                });

                console.log(result);


            }

            // return res.status(200).json({
            //     status: true,
            //     message: "Licence Validated Successfully",
            // });
        } catch (error) {

        }


    }


    async testFunction(req, res) {
        return res.status(200).json({
            status: true,
            message: "Function worked",
        });
    }


    async keyValidate(publicKey, privateKey) {
        // Parse the private key
        const privateKeyObject = crypto.createPrivateKey(privateKey);
        // Get the corresponding public key
        const publicKeyObject = crypto.createPublicKey(publicKey);
        // Export the keys in PEM format
        const exportedPrivateKey = privateKeyObject.export({ type: 'spki', format: 'pem' });
        const exportedPublicKey = publicKeyObject.export({ type: 'spki', format: 'pem' });

        const valid = (exportedPrivateKey === exportedPublicKey);
        console.log("sdsdddd");
        console.log("sdsdddd");
        console.log("sdsdddd");
        console.log("sdsdddd");
        console.log("sdsdddd");
        console.log("sdsdddd");
        console.log("sdsdddd");
        return valid;
    }



}



module.exports = KeyController;