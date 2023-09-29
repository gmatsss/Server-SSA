//controller folder then create a file.js here is the code
exports.getTest = async (req, res) => {
  res.status(200).json({
    message: "test api",
  });
};
