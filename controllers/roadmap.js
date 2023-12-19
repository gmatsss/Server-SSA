const Roadmap = require("../models/roadmap"); // Adjust the path as needed

exports.createRoadmap = async (req, res) => {
  try {
    // Extract data from request body
    const { title, description, startDate, endDate } = req.body;

    // Validate input data (basic example)
    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create a new roadmap instance
    const newRoadmap = new Roadmap({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      likedBy: [], // Initialize with an empty array
    });

    // Save the roadmap to the database
    await newRoadmap.save();

    // Send success response
    res
      .status(201)
      .json({ message: "Roadmap created successfully", roadmap: newRoadmap });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while creating the roadmap" });
  }
};

exports.likeRoadmap = async (req, res) => {
  const { roadmapId, userId } = req.body; // Assuming you get these from the request

  try {
    const roadmap = await Roadmap.findById(roadmapId);

    if (!roadmap) {
      return res.status(404).json({ message: "Roadmap not found" });
    }

    // Check if the user has already liked the roadmap
    if (roadmap.likedBy.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You have already liked this roadmap" });
    }

    // Add user's ID to likedBy array
    roadmap.likedBy.push(userId);
    await roadmap.save();

    res.status(200).json({ message: "Roadmap liked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred" });
  }
};

// Controller to get all roadmaps
exports.getAllRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find().populate("likedBy", "username"); // Adjust 'username' to the field you want to show from User
    res.status(200).json(roadmaps);
  } catch (error) {
    console.error("Error fetching roadmaps:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the roadmaps" });
  }
};

exports.deleteRoadmap = async (req, res) => {
  try {
    const roadmapId = req.params.id; // Get the ID from the request parameters

    // Find the roadmap by ID and remove it
    const deletedRoadmap = await Roadmap.findByIdAndRemove(roadmapId);

    if (!deletedRoadmap) {
      return res.status(404).json({ message: "Roadmap not found" });
    }

    res.status(200).json({ message: "Roadmap deleted successfully" });
  } catch (error) {
    console.error("Error deleting roadmap:", error);
    res.status(500).json({ message: "Error deleting roadmap" });
  }
};
