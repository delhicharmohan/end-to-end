// helper/handleResponse.js

// function to handle the response from the helper functions
const handleResponse = (error, result, next) => {
  if (error) {
    console.log(error);
    return next({
      success: error.success || false,
      message: error.message || "An error occurred.",
      status: error.status || 500,
    });
  }
  return next(null, result);
};

module.exports = handleResponse;
