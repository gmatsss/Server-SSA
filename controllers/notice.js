// Assuming you have Express and your models set up
const Notice = require("../models/notice"); // Adjust the path as needed

exports.createNotice = async (req, res) => {
  try {
    const { title, content, author } = req.body;

    // Create a new notice
    const newNotice = new Notice({
      title,
      content,
      author, // Ensure the author's ID is passed from the client
    });

    await newNotice.save();

    res.status(201).json({
      message: "Notice created successfully",
      notice: newNotice,
    });
  } catch (error) {
    console.error("Error creating notice:", error);
    res.status(500).json({ message: "Error creating notice" });
  }
};

exports.getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find().populate("author", "name"); // Adjust 'name' to the field you want to show from User
    res.status(200).json(notices);
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ message: "Error fetching notices" });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    const noticeId = req.params.noticeId; // Get the ID from request parameters

    // Find the notice by ID and delete it
    const deletedNotice = await Notice.findByIdAndDelete(noticeId);

    if (!deletedNotice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    console.error("Error deleting notice:", error);
    res.status(500).json({ message: "Error deleting notice" });
  }
};
