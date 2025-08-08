const whitelist = [
  "localhost",
  "best-live-404609.uc.r.appspot.com",
  "api.wizpayy.com",
  "wizpayy.com",
  "34.27.183.239",
  "corep.wizpayy.com",
  "zinggale.com",
  "p2p-instance.de.r.appspot.com",
  "20240328t022808-dot-best-live-404609.uc.r.appspot.com",
  "::ffff:192.168.100.149"
];

const whitelistMiddleware = (req, res, next) => {
  const clientIp = req.ip; // Get the client's IP address
  const clientHostname = req.hostname; // Get the client's hostname

  // Check if the client's IP address or hostname is in the whitelist
  if (!whitelist.includes(clientIp) && !whitelist.includes(clientHostname)) {
    return res.status(403).json({
      success: false,
      message: "Client's IP address or hostname is not in the whitelist.",
    });
  }

  next(); // If the client is whitelisted, continue to the next middleware or route handler
};

module.exports = whitelistMiddleware;
