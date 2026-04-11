const express = require("express");
const Contact = require("../models/contact");
const sendEmail = require("../utils/sendEmail");

const contactRouter = express.Router();

contactRouter.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, subject, message) are required.",
      });
    }

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 10 characters long.",
      });
    }

    // Save to database
    const contactQuery = new Contact({ name, email, subject, message });
    await contactQuery.save();

    // Send acknowledgement email to the user
    try {
      const emailHtml = `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #10b981; padding: 12px 16px; border-radius: 12px;">
              <span style="color: white; font-weight: 900; font-size: 20px; letter-spacing: -0.5px;">ConnectNeighbour</span>
            </div>
          </div>
          <div style="background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; font-size: 22px; margin-bottom: 8px;">We received your message! 📬</h2>
            <p style="color: #64748b; font-size: 15px; line-height: 1.7; margin-bottom: 20px;">
              Hi <strong style="color: #0f172a;">${name}</strong>,<br/>
              Thank you for reaching out. We've received your query and our team will get back to you within <strong>24–48 hours</strong>.
            </p>
            <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="color: #475569; font-size: 13px; margin: 0 0 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Your Message</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 8px 0 0 0;">${message}</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              While you wait, feel free to explore the app and connect with your neighbors!
            </p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
            © ${new Date().getFullYear()} ConnectNeighbour. Built with ❤️ for neighborhoods.
          </p>
        </div>
      `;

      await sendEmail.run(
        email,
        `We got your message — "${subject}" | ConnectNeighbour`,
        emailHtml
      );
    } catch (emailErr) {
      // Don't fail the whole request if email fails
      console.error("Contact ack email failed:", emailErr);
    }

    return res.status(201).json({
      success: true,
      message:
        "Your query has been received. We'll get back to you at " +
        email +
        " within 24–48 hours.",
    });
  } catch (err) {
    let errorMessage = err.message;
    if (err.name === "ValidationError") {
      errorMessage = Object.values(err.errors)[0].message;
    }
    return res.status(400).json({ success: false, message: errorMessage });
  }
});

module.exports = contactRouter;
