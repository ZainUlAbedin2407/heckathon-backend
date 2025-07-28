
export const adminDashboard = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome Admin! You have full access.",
    user: req.user,
  });
};
